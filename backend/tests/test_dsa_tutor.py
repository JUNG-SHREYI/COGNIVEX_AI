import json
import os
import sys
import unittest
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import app
from fastapi import HTTPException


class DsaTutorEndpointTests(unittest.TestCase):
    def setUp(self):
        self.environment = patch.dict(os.environ, {
            "GEMINI_API_KEY": "test-gemini-key",
            "GEMINI_MODEL": "test-model",
        })
        self.environment.start()

    def tearDown(self):
        self.environment.stop()

    def test_generates_and_saves_tutor_response_with_tutor_history(self):
        response = MagicMock()
        response.__enter__.return_value = response
        response.read.return_value = json.dumps({
            "candidates": [{
                "content": {"parts": [{"text": "A stack uses LIFO order."}]}
            }],
            "usageMetadata": {"totalTokenCount": 24},
        }).encode("utf-8")
        history = [
            {"role": "user", "content": "Explain stacks", "provider": "gemini-dsa-tutor"},
            {"role": "assistant", "content": "Stacks use LIFO", "provider": "gemini-dsa-tutor"},
            {"role": "user", "content": "Ignore this", "provider": "groq"},
        ]

        with (
            patch.object(app, "_require_authenticated_user", return_value={"id": "test-user"}),
            patch.object(app, "get_history", return_value=history) as get_history,
            patch.object(app, "save_exchange") as save_exchange,
            patch.object(app, "urlopen", return_value=response) as urlopen,
        ):
            result = app.run_dsa_tutor_prompt(
                app.DsaTutorPromptRequest(
                    prompt="Give an example",
                    session_id="test-session",
                    chat_id="chat-123",
                    title="Give an example",
                    gemini_model="gemini-3.8-flash",
                ),
                authorization="Bearer test-user-token",
            )

        request = urlopen.call_args.args[0]
        payload = json.loads(request.data)
        self.assertIn(
            "/models/gemini-3.8-flash:generateContent",
            request.full_url,
        )
        self.assertEqual(result["generated_text"], "A stack uses LIFO order.")
        self.assertEqual(result["provider_used"], "gemini-dsa-tutor")
        self.assertEqual(result["provider_model"], "gemini-3.8-flash")
        self.assertEqual(result["usage_metadata"]["totalTokenCount"], 24)
        self.assertEqual(request.headers["X-goog-api-key"], "test-gemini-key")
        get_history.assert_called_once_with(
            "test-session",
            limit=100,
            access_token="test-user-token",
            chat_id="chat-123",
        )
        self.assertEqual(
            [message["role"] for message in payload["contents"]],
            ["user", "model", "user"],
        )
        self.assertNotIn(
            "Ignore this",
            [part["text"] for message in payload["contents"] for part in message["parts"]],
        )
        save_exchange.assert_called_once_with(
            session_id="test-session",
            user_prompt="Give an example",
            assistant_response="A stack uses LIFO order.",
            sources=[],
            web_context="",
            provider="gemini-dsa-tutor",
            access_token="test-user-token",
            chat_id="chat-123",
            title="Give an example",
        )

    def test_returns_configuration_error_when_api_key_is_missing(self):
        with (
            patch.dict(os.environ, {"GEMINI_API_KEY": ""}),
            patch.object(app, "_require_authenticated_user", return_value={"id": "test-user"}),
        ):
            with self.assertRaises(HTTPException) as error:
                app.run_dsa_tutor_prompt(
                    app.DsaTutorPromptRequest(prompt="Explain stacks"),
                    authorization="Bearer test-user-token",
                )

        self.assertEqual(error.exception.status_code, 503)

    def test_rejects_unsupported_model_selection(self):
        with (
            patch.object(app, "_require_authenticated_user", return_value={"id": "test-user"}),
            self.assertRaises(HTTPException) as error,
        ):
            app.run_dsa_tutor_prompt(
                app.DsaTutorPromptRequest(
                    prompt="Explain stacks",
                    gemini_model="unknown-model",
                ),
                authorization="Bearer test-user-token",
            )

        self.assertEqual(error.exception.status_code, 400)


if __name__ == "__main__":
    unittest.main()
