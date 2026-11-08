import json
import os
import sys
import unittest
from unittest.mock import MagicMock, patch
from urllib.error import HTTPError

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import app
from fastapi import HTTPException


class PublicChatAuthTests(unittest.TestCase):
    def test_cognivex_prompt_rejects_missing_authentication(self):
        with self.assertRaises(HTTPException) as error:
            app.run_cognivex_prompt(
                app.CognivexPromptRequest(prompt="hello"),
                authorization=None,
            )

        self.assertEqual(error.exception.status_code, 401)

    def test_dsa_prompt_rejects_missing_authentication(self):
        with self.assertRaises(HTTPException) as error:
            app.run_dsa_tutor_prompt(
                app.DsaTutorPromptRequest(prompt="hello"),
                authorization=None,
            )

        self.assertEqual(error.exception.status_code, 401)

    def test_cognivex_prompt_requires_google_authorization(self):
        with (
            patch.object(app, "_require_authenticated_user", return_value={"id": "test-user"}),
            self.assertRaises(HTTPException) as error,
        ):
            app.run_cognivex_prompt(
                app.CognivexPromptRequest(prompt="hello"),
                x_google_access_token="",
                x_google_project_id="",
                authorization="******",
            )

        self.assertEqual(error.exception.status_code, 400)
        self.assertIn("Connect your Google account", error.exception.detail)

    def test_google_authorization_requires_matching_verified_email(self):
        response = MagicMock()
        response.__enter__.return_value = response
        response.read.return_value = json.dumps({
            "email": "different@example.com",
            "email_verified": True,
        }).encode("utf-8")

        with (
            patch.object(app, "urlopen", return_value=response),
            self.assertRaises(HTTPException) as error,
        ):
            app._require_google_access_token(
                "test-google-token",
                {"email": "user@example.com"},
            )

        self.assertEqual(error.exception.status_code, 403)

    def test_google_authorization_accepts_matching_verified_email(self):
        response = MagicMock()
        response.__enter__.return_value = response
        response.read.return_value = json.dumps({
            "email": "User@example.com",
            "email_verified": True,
        }).encode("utf-8")

        with patch.object(app, "urlopen", return_value=response):
            token = app._require_google_access_token(
                "test-google-token",
                {"email": "user@example.com"},
            )

        self.assertEqual(token, "test-google-token")

    def test_google_project_id_must_be_valid(self):
        with self.assertRaises(HTTPException) as error:
            app._require_google_project_id("not a project id")
        self.assertEqual(error.exception.status_code, 400)

    def test_authentication_verifies_token_with_supabase(self):
        response = MagicMock()
        response.__enter__.return_value = response
        response.read.return_value = json.dumps({
            "id": "authenticated-user",
            "email": "user@example.com",
        }).encode("utf-8")

        with (
            patch.dict(os.environ, {
                "SUPABASE_URL": "https://project.supabase.co",
                "SUPABASE_PUBLISHABLE_KEY": "test-publishable-key",
            }),
            patch.object(app, "urlopen", return_value=response) as urlopen,
        ):
            user = app._require_authenticated_user("Bearer test-user-token")

        request = urlopen.call_args.args[0]
        self.assertEqual(user["id"], "authenticated-user")
        self.assertEqual(request.full_url, "https://project.supabase.co/auth/v1/user")
        self.assertEqual(request.headers["Authorization"], "Bearer test-user-token")

    def test_invalid_supabase_token_is_rejected(self):
        with (
            patch.dict(os.environ, {
                "SUPABASE_URL": "https://project.supabase.co",
                "SUPABASE_PUBLISHABLE_KEY": "test-publishable-key",
            }),
            patch.object(
                app,
                "urlopen",
                side_effect=HTTPError("https://project.supabase.co/auth/v1/user", 401, "Unauthorized", {}, None),
            ),
            self.assertRaises(HTTPException) as error,
        ):
            app._require_authenticated_user("Bearer invalid-token")

        self.assertEqual(error.exception.status_code, 401)

    def test_supabase_auth_outage_is_reported_as_unavailable(self):
        with (
            patch.dict(os.environ, {
                "SUPABASE_URL": "https://project.supabase.co",
                "SUPABASE_PUBLISHABLE_KEY": "test-publishable-key",
            }),
            patch.object(
                app,
                "urlopen",
                side_effect=HTTPError("https://project.supabase.co/auth/v1/user", 503, "Unavailable", {}, None),
            ),
            self.assertRaises(HTTPException) as error,
        ):
            app._require_authenticated_user("Bearer test-user-token")

        self.assertEqual(error.exception.status_code, 503)


if __name__ == "__main__":
    unittest.main()
