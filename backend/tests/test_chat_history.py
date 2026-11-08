import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from cognivex_ai import chat_history


class ChatHistoryTests(unittest.TestCase):
    def setUp(self):
        self.environment = patch.dict(os.environ, {
            "SUPABASE_URL": "https://example.supabase.co",
            "SUPABASE_ANON_KEY": "test-publishable-key",
            "SUPABASE_PUBLISHABLE_KEY": "sb_publishable_test",
            "SUPABASE_SERVICE_ROLE_KEY": "server-only-service-key",
            "SUPABASE_CHAT_TABLE": "Chat_History",
        })
        self.environment.start()
        self.temp_dir = tempfile.TemporaryDirectory()
        self.local_file = Path(self.temp_dir.name) / "chat_history.json"
        self.local_file_patcher = patch.object(chat_history, "_LOCAL_FILE", self.local_file)
        self.local_file_patcher.start()

    def tearDown(self):
        self.local_file_patcher.stop()
        self.temp_dir.cleanup()
        self.environment.stop()

    def test_authenticated_exchange_uses_bearer_token_and_user_id(self):
        with patch.object(chat_history, "_supabase_request") as request:
            chat_history.save_exchange(
                session_id="user-123",
                user_prompt="Question",
                assistant_response="Answer",
                sources=[],
                web_context="",
                provider="gemini",
                access_token="signed-user-jwt",
                chat_id="chat-456",
                title="Question",
            )

        post_call = next(call for call in request.call_args_list if call.args[0] == "POST")
        args, kwargs = post_call
        self.assertEqual(args[:2], ("POST", "Chat_History"))
        self.assertEqual(kwargs["access_token"], "signed-user-jwt")
        self.assertEqual([row["user_id"] for row in args[2]], ["user-123", "user-123"])
        self.assertTrue(all(row["session_id"] == "user-123" for row in args[2]))
        self.assertTrue(all(row["chat_id"] == "chat-456" for row in args[2]))
        self.assertFalse(self.local_file.exists())
        self.assertEqual(request.call_count, 2)

    def test_authenticated_history_read_and_delete_forward_token(self):
        rows = [{"role": "user", "content": "Question", "sources": "[]"}]
        with patch.object(chat_history, "_supabase_request", return_value=rows) as request:
            result = chat_history.get_history(
                "user-123",
                access_token="signed-user-jwt",
                chat_id="chat-456",
            )
            chat_history.clear_history(
                "user-123",
                access_token="signed-user-jwt",
                chat_id="chat-456",
            )

        self.assertEqual(result[0]["sources"], [])
        self.assertEqual(request.call_args_list[0].kwargs["access_token"], "signed-user-jwt")
        self.assertEqual(request.call_args_list[1].kwargs["access_token"], "signed-user-jwt")
        self.assertIn("session_id=eq.user-123", request.call_args_list[0].args[1])
        self.assertIn("chat_id=eq.chat-456", request.call_args_list[0].args[1])

    def test_authenticated_rest_uses_publishable_key_and_user_jwt(self):
        response = MagicMock()
        response.__enter__.return_value = response
        response.read.return_value = b"[]"
        with patch.object(chat_history, "urlopen", return_value=response) as urlopen:
            chat_history._supabase_request(
                "GET",
                "Chat_History?select=id",
                access_token="signed-user-jwt",
            )

        request = urlopen.call_args.args[0]
        self.assertEqual(request.get_header("Apikey"), "sb_publishable_test")
        self.assertEqual(request.get_header("Authorization"), "Bearer signed-user-jwt")

    def test_guest_history_is_local_even_when_supabase_is_configured(self):
        with patch.object(chat_history, "_supabase_request") as request:
            chat_history.save_exchange(
                session_id="guest-123",
                user_prompt="Question",
                assistant_response="Answer",
                sources=[],
                web_context="",
                provider="local",
            )
            result = chat_history.get_history("guest-123")
            chat_history.clear_history("guest-123")

        request.assert_not_called()
        self.assertEqual(len(result), 2)
        self.assertTrue(self.local_file.exists())
        self.assertEqual(json.loads(self.local_file.read_text(encoding="utf-8")), [])

    def test_guest_chats_are_separate_and_keep_independent_history(self):
        sessions_file = Path(self.temp_dir.name) / "chat_sessions.json"
        with patch.object(chat_history, "_LOCAL_SESSIONS_FILE", sessions_file):
            first = chat_history.create_chat("guest-123")
            second = chat_history.create_chat("guest-123")
            chat_history.save_exchange(
                session_id="guest-123",
                user_prompt="First question",
                assistant_response="First answer",
                sources=[],
                web_context="",
                provider="local",
                chat_id=first["id"],
                title="First question",
            )

            listed = chat_history.get_chat_sessions("guest-123")
            first_history = chat_history.get_history("guest-123", chat_id=first["id"])
            second_history = chat_history.get_history("guest-123", chat_id=second["id"])

        self.assertEqual({chat["id"] for chat in listed}, {first["id"], second["id"]})
        self.assertEqual(len(first_history), 2)
        self.assertEqual(second_history, [])
        self.assertEqual(listed[0]["title"], "First question")

    def test_guest_legacy_history_is_migrated_into_one_saved_chat(self):
        sessions_file = Path(self.temp_dir.name) / "chat_sessions.json"
        self.local_file.write_text(json.dumps([
            {
                "session_id": "guest-legacy",
                "role": "user",
                "content": "My old question",
                "created_at": "2026-01-01T00:00:00+00:00",
            },
            {
                "session_id": "guest-legacy",
                "role": "assistant",
                "content": "My old answer",
                "created_at": "2026-01-01T00:00:01+00:00",
            },
        ]), encoding="utf-8")

        with patch.object(chat_history, "_LOCAL_SESSIONS_FILE", sessions_file):
            chats = chat_history.get_chat_sessions("guest-legacy")
            migrated = chat_history.get_history("guest-legacy", chat_id=chats[0]["id"])

        self.assertEqual(len(chats), 1)
        self.assertEqual(chats[0]["title"], "My old question")
        self.assertEqual(len(migrated), 2)
        self.assertEqual({row["chat_id"] for row in migrated}, {chats[0]["id"]})

    def test_authenticated_chat_creation_and_listing_forward_user_token(self):
        with patch.object(
            chat_history,
            "_supabase_request",
            side_effect=[
                [{"id": "chat-456", "title": "New chat"}],
                [{"id": "chat-456", "title": "New chat"}],
            ],
        ) as request:
            created = chat_history.create_chat("user-123", "signed-user-jwt")
            listed = chat_history.get_chat_sessions("user-123", "signed-user-jwt")

        self.assertEqual(created["id"], "chat-456")
        self.assertEqual(listed[0]["id"], "chat-456")
        self.assertEqual(request.call_args_list[0].kwargs["access_token"], "signed-user-jwt")
        self.assertEqual(request.call_args_list[1].kwargs["access_token"], "signed-user-jwt")

    def test_authenticated_chat_deletion_removes_messages_and_session_with_user_token(self):
        with patch.object(chat_history, "_supabase_request") as request:
            chat_history.delete_chat("user-123", "chat-456", "signed-user-jwt")

        self.assertEqual(
            [call.args[:2] for call in request.call_args_list],
            [
                ("DELETE", "Chat_History?session_id=eq.user-123&chat_id=eq.chat-456"),
                ("DELETE", "Chat_Sessions?id=eq.chat-456&session_id=eq.user-123"),
            ],
        )
        self.assertTrue(all(
            call.kwargs["access_token"] == "signed-user-jwt"
            for call in request.call_args_list
        ))

    def test_authenticated_delete_all_removes_only_the_users_history(self):
        with patch.object(chat_history, "_supabase_request") as request:
            chat_history.delete_all_chats("user-123", "signed-user-jwt")

        self.assertEqual(
            [call.args[:2] for call in request.call_args_list],
            [
                ("DELETE", "Chat_History?session_id=eq.user-123"),
                ("DELETE", "Chat_Sessions?session_id=eq.user-123"),
            ],
        )
        self.assertTrue(all(
            call.kwargs["access_token"] == "signed-user-jwt"
            for call in request.call_args_list
        ))

    def test_guest_delete_all_preserves_other_sessions(self):
        history = [
            {"session_id": "guest-123", "chat_id": "chat-a", "content": "Delete me"},
            {"session_id": "guest-other", "chat_id": "chat-b", "content": "Keep me"},
        ]
        sessions = [
            {"session_id": "guest-123", "id": "chat-a"},
            {"session_id": "guest-other", "id": "chat-b"},
        ]
        self.local_file.write_text(json.dumps(history), encoding="utf-8")
        sessions_file = Path(self.temp_dir.name) / "chat_sessions.json"
        sessions_file.write_text(json.dumps(sessions), encoding="utf-8")

        with patch.object(chat_history, "_LOCAL_SESSIONS_FILE", sessions_file):
            chat_history.delete_all_chats("guest-123")

        self.assertEqual(
            json.loads(self.local_file.read_text(encoding="utf-8")),
            [history[1]],
        )
        self.assertEqual(
            json.loads(sessions_file.read_text(encoding="utf-8")),
            [sessions[1]],
        )

    def test_authenticated_write_failure_does_not_fall_back_to_local(self):
        with patch.object(
            chat_history,
            "_supabase_request",
            side_effect=RuntimeError("Supabase REST 403: denied"),
        ):
            with self.assertRaisesRegex(RuntimeError, "403"):
                chat_history.save_exchange(
                    session_id="user-123",
                    user_prompt="Question",
                    assistant_response="Answer",
                    sources=[],
                    web_context="",
                    provider="gemini",
                    access_token="signed-user-jwt",
                )

        self.assertFalse(self.local_file.exists())


if __name__ == "__main__":
    unittest.main()
