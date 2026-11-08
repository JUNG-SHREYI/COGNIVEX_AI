import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import app
from fastapi import HTTPException


class DsaTutorEndpointTests(unittest.TestCase):
    def test_generates_and_saves_tutor_response_with_tutor_history(self):
        history = [
            {"role": "user", "content": "Explain stacks", "provider": "gemini-dsa-tutor"},
            {"role": "assistant", "content": "Stacks use LIFO", "provider": "gemini-dsa-tutor"},
            {"role": "user", "content": "Ignore this", "provider": "groq"},
        ]

        with (
            patch.object(app, "_require_authenticated_user", return_value={"id": "test-user"}),
            patch.object(app, "_require_google_access_token", return_value="google-user-token"),
            patch.object(app, "_require_google_project_id", return_value="user-cloud-project"),
            patch.object(app, "get_history", return_value=history) as get_history,
            patch.object(app, "save_exchange") as save_exchange,
            patch.object(app, "generate_with_provider_detailed", return_value={
                "content": "A stack uses LIFO order.",
                "model": "gemini-3.8-flash",
                "usage_metadata": {"totalTokenCount": 24},
            }) as generate,
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

        self.assertEqual(result["generated_text"], "A stack uses LIFO order.")
        self.assertEqual(result["provider_used"], "gemini-dsa-tutor")
        self.assertEqual(result["provider_model"], "gemini-3.8-flash")
        self.assertEqual(result["usage_metadata"]["totalTokenCount"], 24)
        self.assertEqual(generate.call_args.kwargs["google_access_token"], "google-user-token")
        self.assertEqual(generate.call_args.kwargs["google_project_id"], "user-cloud-project")
        get_history.assert_called_once_with(
            "test-session",
            limit=100,
            access_token="test-user-token",
            chat_id="chat-123",
        )
        self.assertEqual(
            [message["role"] for message in generate.call_args.kwargs["conversation"]],
            ["user", "assistant"],
        )
        self.assertNotIn("Ignore this", str(generate.call_args.kwargs["conversation"]))
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

    def test_requires_google_authorization(self):
        with (
            patch.object(app, "_require_authenticated_user", return_value={"id": "test-user"}),
        ):
            with self.assertRaises(HTTPException) as error:
                app.run_dsa_tutor_prompt(
                    app.DsaTutorPromptRequest(prompt="Explain stacks"),
                    x_google_access_token="",
                    x_google_project_id="",
                    authorization="Bearer test-user-token",
                )

        self.assertEqual(error.exception.status_code, 400)
        self.assertIn("Connect your Google account", error.exception.detail)

    def test_rejects_unsupported_model_selection(self):
        with (
            patch.object(app, "_require_authenticated_user", return_value={"id": "test-user"}),
            patch.object(app, "_require_google_access_token", return_value="google-user-token"),
            patch.object(app, "_require_google_project_id", return_value="user-cloud-project"),
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
