import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from cognivex_ai import llm_provider


class GroqProviderTests(unittest.TestCase):
    def setUp(self):
        self.original_env = os.environ.copy()
        os.environ.clear()
        os.environ.update({
            "LLM_PROVIDER": "groq",
            "GROQ_API_KEY": "test-groq-key",
            "GROQ_MODEL": "llama-3.3-70b-versatile",
            "LLM_MODEL": "llama-3.3-70b-versatile",
            "LLM_BASE_URL": "https://api.groq.com/openai/v1",
        })

    def tearDown(self):
        os.environ.clear()
        os.environ.update(self.original_env)

    def test_generate_with_provider_detailed_supports_groq(self):
        with patch.object(llm_provider, "_post_json", return_value={
            "choices": [{"message": {"content": "Hello from Groq"}}]
        }) as mock_post:
            result = llm_provider.generate_with_provider_detailed("Say hello", max_tokens=10)

        self.assertEqual(result["provider"], "groq")
        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["content"], "Hello from Groq")
        self.assertIn("groq.com", mock_post.call_args[0][0])


class GeminiProviderTests(unittest.TestCase):
    def setUp(self):
        self.original_env = os.environ.copy()
        os.environ.clear()
        os.environ.update({
            "LLM_PROVIDER": "gemini",
            "GEMINI_API_KEY": "test-gemini-key",
            "GEMINI_MODEL": "gemini-test-model",
        })

    def tearDown(self):
        os.environ.clear()
        os.environ.update(self.original_env)

    def test_generate_with_provider_detailed_uses_google_gemini_api(self):
        with patch.object(llm_provider, "_post_json", return_value={
            "candidates": [{
                "content": {"parts": [{"text": "Hello from Gemini"}]}
            }],
            "usageMetadata": {"totalTokenCount": 12},
        }) as mock_post:
            result = llm_provider.generate_with_provider_detailed(
                "Say hello",
                max_tokens=10,
                conversation=[{"role": "assistant", "content": "Hi there"}],
            )

        self.assertEqual(result["provider"], "gemini")
        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["content"], "Hello from Gemini")
        self.assertIn("generativelanguage.googleapis.com", mock_post.call_args.args[0])
        self.assertEqual(mock_post.call_args.args[2]["x-goog-api-key"], "test-gemini-key")
        self.assertEqual(mock_post.call_args.args[1]["contents"][0]["role"], "model")
        self.assertEqual(result["usage_metadata"]["totalTokenCount"], 12)

    def test_google_oauth_uses_users_vertex_project_and_bearer_token(self):
        os.environ["GEMINI_API_KEY"] = "server-key-must-not-be-used"
        with patch.object(llm_provider, "_post_json", return_value={
            "candidates": [{
                "content": {"parts": [{"text": "User project response"}]}
            }],
            "usageMetadata": {"totalTokenCount": 8},
        }) as mock_post:
            result = llm_provider.generate_with_provider_detailed(
                "Say hello",
                gemini_model="gemini-3.8-flash",
                google_access_token="user-oauth-token",
                google_project_id="user-cloud-project",
            )

        self.assertEqual(result["content"], "User project response")
        self.assertIn(
            "/projects/user-cloud-project/locations/global/publishers/google/models/gemini-3.8-flash:generateContent",
            mock_post.call_args.args[0],
        )
        self.assertEqual(
            mock_post.call_args.args[2]["Authorization"],
            "Bearer user-oauth-token",
        )
        self.assertNotIn("x-goog-api-key", mock_post.call_args.args[2])

    def test_selected_gemini_model_overrides_configured_provider_and_model(self):
        os.environ.update({
            "LLM_PROVIDER": "groq",
            "GROQ_API_KEY": "test-groq-key",
        })
        with patch.object(llm_provider, "_post_json", return_value={
            "candidates": [{
                "content": {"parts": [{"text": "Selected model response"}]}
            }]
        }) as mock_post:
            result = llm_provider.generate_with_provider_detailed(
                "Say hello",
                gemini_model="gemini-3.8-flash",
            )

        self.assertEqual(result["provider"], "gemini")
        self.assertEqual(result["model"], "gemini-3.8-flash")
        self.assertIn(
            "/models/gemini-3.8-flash:generateContent",
            mock_post.call_args.args[0],
        )

    def test_rejects_unsupported_gemini_model(self):
        with patch.object(llm_provider, "_post_json") as mock_post:
            result = llm_provider.generate_with_provider_detailed(
                "Say hello",
                gemini_model="not-a-model",
            )

        self.assertEqual(result["status"], "invalid_model")
        mock_post.assert_not_called()

    def test_auto_mode_prefers_gemini_and_never_uses_openai(self):
        os.environ.update({
            "LLM_PROVIDER": "auto",
            "OPENAI_API_KEY": "must-not-be-used",
            "LLM_API_KEY": "must-not-be-used",
            "GROQ_API_KEY": "must-not-be-used",
        })
        with patch.object(llm_provider, "_post_json", return_value={
            "candidates": [{
                "content": {"parts": [{"text": "Gemini selected"}]}
            }]
        }) as mock_post:
            result = llm_provider.generate_with_provider_detailed("Say hello")

        self.assertEqual(result["provider"], "gemini")
        self.assertIn("generativelanguage.googleapis.com", mock_post.call_args.args[0])
        self.assertNotIn("openai.com", mock_post.call_args.args[0])

    def test_explicit_openai_provider_is_disabled_without_api_request(self):
        os.environ["LLM_PROVIDER"] = "openai"
        with patch.object(llm_provider, "_post_json") as mock_post:
            result = llm_provider.generate_with_provider_detailed("Say hello")

        self.assertEqual(result["status"], "disabled")
        mock_post.assert_not_called()

    def test_auto_mode_does_not_use_openai_credentials(self):
        os.environ.clear()
        os.environ.update({
            "LLM_PROVIDER": "auto",
            "OPENAI_API_KEY": "must-not-be-used",
            "LLM_API_KEY": "must-not-be-used",
        })
        with (
            patch.object(llm_provider, "_ollama_is_available", return_value=False),
            patch.object(llm_provider, "_post_json") as mock_post,
        ):
            result = llm_provider.generate_with_provider_detailed("Say hello")

        self.assertEqual(result["status"], "no_external_provider")
        mock_post.assert_not_called()


if __name__ == "__main__":
    unittest.main()
