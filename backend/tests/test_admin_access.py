import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import app
from fastapi import HTTPException


class AdminAccessTests(unittest.TestCase):
    def test_designated_email_can_access_admin(self):
        user = {"id": "admin-user", "email": "BiTrashReyi97@gmail.com"}

        with patch.object(app, "_require_authenticated_user", return_value=user):
            self.assertEqual(app._require_admin("Bearer token"), user)

    def test_other_email_is_denied_admin_access(self):
        user = {"id": "other-user", "email": "someone@example.com"}

        with (
            patch.object(app, "_require_authenticated_user", return_value=user),
            self.assertRaises(HTTPException) as error,
        ):
            app._require_admin("Bearer token")

        self.assertEqual(error.exception.status_code, 403)

    def test_missing_email_is_denied_admin_access(self):
        user = {"id": "user-without-email"}

        with (
            patch.object(app, "_require_authenticated_user", return_value=user),
            self.assertRaises(HTTPException) as error,
        ):
            app._require_admin("Bearer token")

        self.assertEqual(error.exception.status_code, 403)


if __name__ == "__main__":
    unittest.main()
