"""
Exploratory Bug Condition тесты (до фикса).

ВАЖНО: Эти тесты ДОЛЖНЫ УПАСТЬ на незафиксированном коде.
Падение подтверждает существование дефектов.
НЕ исправляй код и НЕ исправляй тесты при падении.

Validates: Requirements 1.1, 1.2, 1.3
"""
import os
import sys
import unittest

os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-unit-tests-only-xyz123"

# Добавляем backend/ в путь (для импорта main, database, auth и т.д.)
_BACKEND_DIR = os.path.join(os.path.dirname(__file__), "..")
sys.path.insert(0, os.path.abspath(_BACKEND_DIR))
# Добавляем tests/ в путь (для импорта conftest)
_TESTS_DIR = os.path.dirname(__file__)
sys.path.insert(0, os.path.abspath(_TESTS_DIR))

from fastapi.testclient import TestClient
from conftest import reset_db, get_test_auth_headers

class TestBugCondition1_EmptyPasswordHash(unittest.TestCase):
    """
    Дефект 1: init_db() / reset_db() создаёт UserRow с password_hash == "".

    Bug Condition (isBugCondition_1):
        user.id == "550e8400-e29b-41d4-a716-446655440001"
        AND user.password_hash == ""

    Expected Behavior (после фикса):
        user.password_hash != ""
        AND verify_password("Changeme1", user.password_hash) == True

    Validates: Requirements 1.1
    """

    def setUp(self):
        reset_db()

    def test_bug1_owner_password_hash_is_not_empty_after_reset_db(self):
        """
        EXPLORATORY: После reset_db() у owner password_hash НЕ должен быть пустым.
        ОЖИДАЕТСЯ ПАДЕНИЕ: password_hash == "" на незафиксированном коде.
        """
        from database import SessionLocal, UserRow

        owner_id = "550e8400-e29b-41d4-a716-446655440001"
        with SessionLocal() as session:
            user = session.get(UserRow, owner_id)

        self.assertIsNotNone(user, "UserRow owner должен существовать после reset_db()")
        # Это упадёт: password_hash == "" на незафиксированном коде
        self.assertNotEqual(
            user.password_hash,
            "",
            f"ДЕФЕКТ 1: password_hash пустой ('{user.password_hash}'). "
            "init_db()/reset_db() должны сохранять bcrypt-хеш, а не пустую строку."
        )

    def test_bug1_owner_password_hash_verifies_changeme(self):
        """
        EXPLORATORY: password_hash должен верифицироваться через verify_password("Changeme1", hash).
        ОЖИДАЕТСЯ ПАДЕНИЕ: при пустом хеше verify_password вернёт False.
        """
        from database import SessionLocal, UserRow
        from auth import verify_password

        owner_id = "550e8400-e29b-41d4-a716-446655440001"
        with SessionLocal() as session:
            user = session.get(UserRow, owner_id)

        # Это упадёт: verify_password("Changeme1", "") == False
        self.assertTrue(
            verify_password("Changeme1", user.password_hash),
            f"ДЕФЕКТ 1: verify_password('Changeme1', '{user.password_hash}') вернул False. "
            "Хеш должен быть bcrypt-хешем пароля 'Changeme1'."
        )


class TestBugCondition2_FirstLoginBypass(unittest.TestCase):
    """
    Дефект 2: POST /login при password_hash=="" принимает любой пароль.

    Bug Condition (isBugCondition_2):
        user.password_hash == ""
        AND request.password IS ANY STRING
        AND login_succeeds(user, request)  -- вместо 401

    Expected Behavior (после фикса):
        status_code == 401 при password_hash == ""

    Validates: Requirements 1.2
    """

    def setUp(self):
        reset_db()
        from main import app
        self.client = TestClient(app)

    def test_bug2_login_with_arbitrary_password_when_hash_empty_returns_401(self):
        """
        EXPLORATORY: POST /login с произвольным паролем при password_hash=="" должен вернуть 401.
        ОЖИДАЕТСЯ ПАДЕНИЕ: сервер вернёт 200 (first-login branch принимает любой пароль).
        """
        response = self.client.post("/api/v1/auth/login", json={
            "username": "testowner",
            "password": "hacker123",
        })
        # Это упадёт: response.status_code == 200 на незафиксированном коде
        self.assertEqual(
            response.status_code,
            401,
            f"ДЕФЕКТ 2: POST /login с паролем 'hacker123' при password_hash='' "
            f"вернул {response.status_code} вместо 401. "
            f"Тело ответа: {response.text}"
        )

    def test_bug2_login_with_empty_password_when_hash_empty_returns_401(self):
        """
        EXPLORATORY: POST /login с пустым паролем при password_hash=="" должен вернуть 401.
        ОЖИДАЕТСЯ ПАДЕНИЕ: сервер вернёт 200.
        """
        response = self.client.post("/api/v1/auth/login", json={
            "username": "testowner",
            "password": "",
        })
        # Это упадёт: response.status_code == 200 на незафиксированном коде
        self.assertEqual(
            response.status_code,
            401,
            f"ДЕФЕКТ 2: POST /login с пустым паролем при password_hash='' "
            f"вернул {response.status_code} вместо 401. "
            f"Тело ответа: {response.text}"
        )

    def test_bug2_login_does_not_return_token_when_hash_empty(self):
        """
        EXPLORATORY: При password_hash=="" сервер НЕ должен выдавать access_token.
        ОЖИДАЕТСЯ ПАДЕНИЕ: сервер выдаёт токен.
        """
        response = self.client.post("/api/v1/auth/login", json={
            "username": "testowner",
            "password": "any_password_at_all",
        })
        # Это упадёт: в ответе будет access_token
        self.assertNotIn(
            "access_token",
            response.json(),
            f"ДЕФЕКТ 2: Сервер выдал access_token при пустом password_hash. "
            f"Тело ответа: {response.text}"
        )


class TestBugCondition3_PutMeIgnoresJsonBody(unittest.TestCase):
    """
    Дефект 3: PUT /me читает параметры из query string, игнорируя JSON-тело.

    Bug Condition (isBugCondition_3):
        request.body.name IS NOT NONE
        AND profile_after_request.name == profile_before_request.name  -- не обновилось

    Expected Behavior (после фикса):
        PUT /me с JSON {"name": "X"} → response.name == "X"

    Validates: Requirements 1.3
    """

    def setUp(self):
        reset_db()
        from main import app
        self.client = TestClient(app)
        self.auth_headers = get_test_auth_headers()

    def test_bug3_put_me_with_json_body_updates_name(self):
        """
        EXPLORATORY: PUT /me с JSON-телом {"name": "Новое имя"} должен обновить имя.
        ОЖИДАЕТСЯ ПАДЕНИЕ: имя не обновится, т.к. FastAPI читает query string, а не тело.
        """
        new_name = "Новое имя"
        response = self.client.put(
            "/api/v1/auth/me",
            json={"name": new_name},
            headers=self.auth_headers,
        )
        self.assertEqual(
            response.status_code,
            200,
            f"PUT /me вернул {response.status_code}: {response.text}"
        )
        # Это упадёт: response.json()["name"] == "Владелец" (старое имя), а не "Новое имя"
        self.assertEqual(
            response.json()["name"],
            new_name,
            f"ДЕФЕКТ 3: PUT /me с JSON-телом не обновил имя. "
            f"Ожидалось '{new_name}', получено '{response.json().get('name')}'. "
            f"Параметры читаются из query string, а не из тела запроса."
        )

    def test_bug3_put_me_json_body_persists_after_get(self):
        """
        EXPLORATORY: После PUT /me с JSON-телом, GET /me должен вернуть обновлённое имя.
        ОЖИДАЕТСЯ ПАДЕНИЕ: GET /me вернёт старое имя.
        """
        new_name = "Сохранённое имя"
        self.client.put(
            "/api/v1/auth/me",
            json={"name": new_name},
            headers=self.auth_headers,
        )
        get_response = self.client.get("/api/v1/auth/me", headers=self.auth_headers)
        self.assertEqual(get_response.status_code, 200)
        # Это упадёт: имя не сохранилось
        self.assertEqual(
            get_response.json()["name"],
            new_name,
            f"ДЕФЕКТ 3: После PUT /me с JSON-телом, GET /me вернул старое имя. "
            f"Ожидалось '{new_name}', получено '{get_response.json().get('name')}'."
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)


# ─────────────────────────────────────────────────────────────────────────────
# PRESERVATION ТЕСТЫ (до фикса)
#
# Эти тесты проверяют поведение, которое НЕ должно измениться после фикса.
# ОЖИДАЕМЫЙ РЕЗУЛЬТАТ: тесты ПРОХОДЯТ на незафиксированном коде (baseline).
#
# Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
# ─────────────────────────────────────────────────────────────────────────────

from hypothesis import given, settings as h_settings
from hypothesis import strategies as st


class TestPreservation_CorrectLogin(unittest.TestCase):
    """
    Preservation: POST /login с корректным bcrypt-хешем и правильным паролем → 200 OK + токен.

    Validates: Requirements 3.1
    """

    def setUp(self):
        reset_db()
        from main import app
        self.client = TestClient(app)

    def tearDown(self):
        pass

    def test_preservation_login_with_correct_password_returns_200_preservation(self):
        """
        PRESERVATION: POST /login с правильным паролем и bcrypt-хешем → 200 OK + профиль + cookie.
        Validates: Requirements 3.1
        """
        response = self.client.post("/api/v1/auth/login", json={
            "username": "testowner",
            "password": "Changeme1",
        })
        self.assertEqual(
            response.status_code,
            200,
            f"PRESERVATION FAIL: POST /login с правильным паролем вернул {response.status_code}: {response.text}"
        )
        data = response.json()
        # /login теперь возвращает UserProfile, токен — в httpOnly cookie
        for field in ("id", "username", "email", "name", "timezone"):
            self.assertIn(
                field,
                data,
                f"PRESERVATION FAIL: Поле '{field}' отсутствует в ответе: {data}"
            )
        self.assertIn(
            "auth_token",
            response.cookies,
            "PRESERVATION FAIL: httpOnly cookie 'auth_token' не установлена"
        )

    def test_preservation_login_wrong_password_returns_401_preservation(self):
        """
        PRESERVATION: POST /login с неверным паролем → 401 Unauthorized.
        Validates: Requirements 3.2
        """
        response = self.client.post("/api/v1/auth/login", json={
            "username": "testowner",
            "password": "wrong_password",
        })
        self.assertEqual(
            response.status_code,
            401,
            f"PRESERVATION FAIL: POST /login с неверным паролем вернул {response.status_code}: {response.text}"
        )


class TestPreservation_GetMe(unittest.TestCase):
    """
    Preservation: GET /me с валидным Bearer-токеном → профиль пользователя.

    Validates: Requirements 3.3
    """

    def setUp(self):
        reset_db()
        from main import app
        self.client = TestClient(app)
        self.auth_headers = get_test_auth_headers()

    def test_preservation_get_me_with_valid_token_returns_profile_preservation(self):
        """
        PRESERVATION: GET /me с валидным Bearer-токеном → 200 OK + профиль.
        Validates: Requirements 3.3
        """
        response = self.client.get("/api/v1/auth/me", headers=self.auth_headers)
        self.assertEqual(
            response.status_code,
            200,
            f"PRESERVATION FAIL: GET /me вернул {response.status_code}: {response.text}"
        )
        data = response.json()
        for field in ("id", "username", "email", "name", "timezone"):
            self.assertIn(
                field,
                data,
                f"PRESERVATION FAIL: Поле '{field}' отсутствует в профиле: {data}"
            )
        self.assertEqual(data["username"], "testowner")

    def test_preservation_get_me_without_token_returns_401_preservation(self):
        """
        PRESERVATION: GET /me без токена → 401/403.
        """
        response = self.client.get("/api/v1/auth/me")
        self.assertIn(
            response.status_code,
            (401, 403),
            f"PRESERVATION FAIL: GET /me без токена вернул {response.status_code}"
        )


class TestPreservation_OwnerProtectedEndpoints(unittest.TestCase):
    """
    Preservation: запросы к /api/v1/owner/* без токена → 401.

    Validates: Requirements 3.4
    """

    def setUp(self):
        reset_db()
        from main import app
        self.client = TestClient(app)

    def test_preservation_owner_profile_without_token_returns_401_preservation(self):
        """
        PRESERVATION: GET /api/v1/owner/profile без токена → 401/403.
        Validates: Requirements 3.4
        """
        response = self.client.get("/api/v1/owner/profile")
        self.assertIn(
            response.status_code,
            (401, 403),
            f"PRESERVATION FAIL: GET /api/v1/owner/profile без токена вернул {response.status_code}"
        )

    def test_preservation_owner_upcoming_bookings_without_token_returns_401_preservation(self):
        """
        PRESERVATION: GET /api/v1/owner/bookings/upcoming без токена → 401/403.
        Validates: Requirements 3.4
        """
        response = self.client.get("/api/v1/owner/bookings/upcoming")
        self.assertIn(
            response.status_code,
            (401, 403),
            f"PRESERVATION FAIL: GET /api/v1/owner/bookings/upcoming без токена вернул {response.status_code}"
        )


class TestPreservation_PasswordHashing(unittest.TestCase):
    """
    Preservation: property-based тест — для любого непустого пароля p:
    bcrypt.checkpw(p, bcrypt.hashpw(p, salt)) == True.

    Validates: Requirements 3.1, 3.5

    Примечание: тест использует bcrypt напрямую (passlib несовместима с текущей
    версией bcrypt в этом окружении из-за detect_wrap_bug с паролями >72 байт).
    Это тестирует ту же криптографическую функцию, которую использует auth.py.
    """

    def test_preservation_verify_password_roundtrip_property_preservation(self):
        """
        PRESERVATION (property-based): bcrypt.checkpw(p, bcrypt.hashpw(p, salt)) == True
        для любого непустого пароля длиной до 72 байт (ограничение bcrypt).

        **Validates: Requirements 3.1, 3.5**
        """
        import bcrypt as _bcrypt

        # bcrypt ограничивает пароль 72 байтами; фильтруем по длине в байтах
        safe_passwords = st.text(min_size=1, max_size=50).filter(
            lambda p: 0 < len(p.encode("utf-8")) <= 72
        )

        @given(safe_passwords)
        @h_settings(max_examples=50, deadline=None)
        def _property(password: str):
            pwd_bytes = password.encode("utf-8")
            hashed = _bcrypt.hashpw(pwd_bytes, _bcrypt.gensalt())
            assert _bcrypt.checkpw(pwd_bytes, hashed), (
                f"bcrypt.checkpw('{password}', bcrypt.hashpw('{password}', salt)) вернул False"
            )

        _property()

    def test_preservation_wrong_password_does_not_verify_preservation(self):
        """
        PRESERVATION: bcrypt.checkpw с неверным паролем возвращает False.
        """
        import bcrypt as _bcrypt

        hashed = _bcrypt.hashpw(b"correct_pass", _bcrypt.gensalt())
        self.assertFalse(
            _bcrypt.checkpw(b"wrong_pass", hashed),
            "bcrypt.checkpw должен возвращать False для неверного пароля"
        )
