"""
Тесты улучшений авторизации:
1. httpOnly cookie вместо Bearer-токена в теле ответа
2. Rate limiting на /login
3. Валидация пароля и email на бэкенде
"""
import os
import sys
import unittest

os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-unit-tests-only-xyz123"

_BACKEND_DIR = os.path.join(os.path.dirname(__file__), "..")
sys.path.insert(0, os.path.abspath(_BACKEND_DIR))
_TESTS_DIR = os.path.dirname(__file__)
sys.path.insert(0, os.path.abspath(_TESTS_DIR))

from fastapi.testclient import TestClient
from conftest import reset_db, get_test_auth_headers


# ── 1. httpOnly Cookie ────────────────────────────────────────────────────────

class TestCookieAuth(unittest.TestCase):
    """POST /login устанавливает httpOnly cookie; GET /me принимает cookie."""

    def setUp(self):
        reset_db()
        from main import app
        self.client = TestClient(app, raise_server_exceptions=True)

    def tearDown(self):
        pass

    def test_login_sets_auth_cookie(self):
        """POST /login → устанавливает cookie 'auth_token'."""
        r = self.client.post("/api/v1/auth/login", json={
            "username": "testowner", "password": "Changeme1",
        })
        self.assertEqual(r.status_code, 200, r.text)
        self.assertIn("auth_token", r.cookies, "Cookie 'auth_token' не установлена")

    def test_login_returns_user_profile_not_token(self):
        """POST /login → тело ответа содержит профиль, а не access_token."""
        r = self.client.post("/api/v1/auth/login", json={
            "username": "testowner", "password": "Changeme1",
        })
        data = r.json()
        self.assertNotIn("access_token", data, "access_token не должен быть в теле ответа")
        for field in ("id", "username", "email", "name", "timezone"):
            self.assertIn(field, data)

    def test_get_me_with_cookie(self):
        """GET /me с cookie → 200 OK."""
        login_r = self.client.post("/api/v1/auth/login", json={
            "username": "testowner", "password": "Changeme1",
        })
        self.assertEqual(login_r.status_code, 200)

        # Явно передаём cookie из ответа логина
        token = login_r.cookies.get("auth_token")
        self.assertIsNotNone(token, "Cookie 'auth_token' не получена после логина")

        r = self.client.get("/api/v1/auth/me", cookies={"auth_token": token})
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json()["username"], "testowner")

    def test_get_me_without_cookie_or_token_returns_401(self):
        """GET /me без cookie и без Bearer → 401."""
        # Новый клиент без cookies
        from main import app
        fresh_client = TestClient(app, cookies={})
        r = fresh_client.get("/api/v1/auth/me")
        self.assertIn(r.status_code, (401, 403))

    def test_get_me_with_bearer_token_still_works(self):
        """GET /me с Bearer токеном (fallback) → 200 OK."""
        headers = get_test_auth_headers()
        r = self.client.get("/api/v1/auth/me", headers=headers)
        self.assertEqual(r.status_code, 200, r.text)

    def test_logout_clears_cookie(self):
        """POST /logout → cookie удаляется."""
        self.client.post("/api/v1/auth/login", json={
            "username": "testowner", "password": "Changeme1",
        })
        r = self.client.post("/api/v1/auth/logout")
        self.assertEqual(r.status_code, 204)
        # После logout cookie должна быть удалена (пустое значение или отсутствует)
        cookie_val = r.cookies.get("auth_token", "")
        self.assertEqual(cookie_val, "", f"Cookie должна быть очищена, получено: '{cookie_val}'")


# ── 2. Rate Limiting ──────────────────────────────────────────────────────────

class TestRateLimiting(unittest.TestCase):
    """POST /login ограничен 10 попытками в минуту с одного IP."""

    def setUp(self):
        reset_db()
        from main import app
        self.client = TestClient(app, raise_server_exceptions=False)

    def test_login_rate_limit_triggers_429(self):
        """11-й запрос /login с одного IP → 429 Too Many Requests."""
        for i in range(10):
            self.client.post("/api/v1/auth/login", json={
                "username": f"nonexistent_{i}", "password": "wrong",
            })
        r = self.client.post("/api/v1/auth/login", json={
            "username": "nonexistent_11", "password": "wrong",
        })
        self.assertEqual(r.status_code, 429, f"Ожидался 429, получен {r.status_code}: {r.text}")

    def test_other_endpoints_not_rate_limited(self):
        """GET /api/v1/event-types не ограничен rate limit."""
        for _ in range(15):
            r = self.client.get("/api/v1/event-types")
            self.assertEqual(r.status_code, 200)


# ── 3. Валидация пароля и email ───────────────────────────────────────────────

class TestPasswordValidation(unittest.TestCase):
    """Бэкенд валидирует пароль: минимум 8 символов, строчная + заглавная + цифра."""

    def setUp(self):
        reset_db()
        from main import app
        self.client = TestClient(app)

    def _register(self, password: str, username: str = "newuser") -> int:
        r = self.client.post("/api/v1/auth/register", json={
            "username": username,
            "email": f"{username}@example.com",
            "password": password,
            "name": "Test User",
        })
        return r.status_code

    def test_valid_password_accepted(self):
        self.assertEqual(self._register("Secure1pass"), 201)

    def test_password_too_short_rejected(self):
        self.assertEqual(self._register("Ab1x"), 422)

    def test_password_no_uppercase_rejected(self):
        self.assertEqual(self._register("secure1pass"), 422)

    def test_password_no_lowercase_rejected(self):
        self.assertEqual(self._register("SECURE1PASS"), 422)

    def test_password_no_digit_rejected(self):
        self.assertEqual(self._register("SecurePass"), 422)

    def test_password_exactly_8_chars_valid(self):
        self.assertEqual(self._register("Secure1p", username="user8"), 201)

    def test_password_7_chars_rejected(self):
        self.assertEqual(self._register("Secur1p"), 422)


class TestEmailValidation(unittest.TestCase):
    """Бэкенд валидирует email через pydantic EmailStr."""

    def setUp(self):
        reset_db()
        from main import app
        self.client = TestClient(app)

    def _register(self, email: str) -> int:
        r = self.client.post("/api/v1/auth/register", json={
            "username": "emailtest",
            "email": email,
            "password": "Secure1pass",
            "name": "Test User",
        })
        return r.status_code

    def test_valid_email_accepted(self):
        self.assertEqual(self._register("valid@example.com"), 201)

    def test_email_without_at_rejected(self):
        self.assertEqual(self._register("notanemail"), 422)

    def test_email_without_domain_rejected(self):
        self.assertEqual(self._register("user@"), 422)

    def test_email_without_tld_rejected(self):
        self.assertEqual(self._register("user@domain"), 422)

    def test_empty_email_rejected(self):
        self.assertEqual(self._register(""), 422)


class TestUsernameValidation(unittest.TestCase):
    """Бэкенд валидирует username: минимум 3 символа, только [a-zA-Z0-9_-]."""

    def setUp(self):
        reset_db()
        from main import app
        self.client = TestClient(app)

    def _register(self, username: str) -> int:
        r = self.client.post("/api/v1/auth/register", json={
            "username": username,
            "email": f"test_{username.replace(' ', '_')}@example.com",
            "password": "Secure1pass",
            "name": "Test User",
        })
        return r.status_code

    def test_valid_username_accepted(self):
        self.assertEqual(self._register("valid_user"), 201)

    def test_username_too_short_rejected(self):
        self.assertEqual(self._register("ab"), 422)

    def test_username_with_spaces_rejected(self):
        self.assertEqual(self._register("user name"), 422)

    def test_username_with_special_chars_rejected(self):
        self.assertEqual(self._register("user@name"), 422)

    def test_username_with_dash_accepted(self):
        self.assertEqual(self._register("user-name"), 201)

    def test_username_exactly_3_chars_accepted(self):
        self.assertEqual(self._register("abc"), 201)


if __name__ == "__main__":
    unittest.main(verbosity=2)
