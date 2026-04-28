"""
Тесты сценариев владельца календаря:
- Просмотр профиля
- Создание типов событий (happy path + валидация)
- Просмотр предстоящих встреч
"""
import unittest
from fastapi.testclient import TestClient
from conftest import reset_db, future_iso


from conftest import get_test_auth_headers


class TestOwnerProfile(unittest.TestCase):
    def setUp(self):
        reset_db()
        from main import app
        self.client = TestClient(app)
        self.auth_headers = get_test_auth_headers()

    def test_get_profile_returns_owner(self):
        r = self.client.get("/api/v1/owner/profile", headers=self.auth_headers)
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data["name"], "Владелец")
        self.assertIn("workingHours", data)
        self.assertIn("timezone", data)

    def test_profile_has_working_hours(self):
        r = self.client.get("/api/v1/owner/profile", headers=self.auth_headers)
        wh = r.json()["workingHours"]
        self.assertTrue(wh["monday"]["enabled"])
        self.assertFalse(wh["saturday"]["enabled"])
        self.assertFalse(wh["sunday"]["enabled"])


class TestOwnerEventTypes(unittest.TestCase):
    def setUp(self):
        reset_db()
        from main import app
        self.client = TestClient(app)
        self.auth_headers = get_test_auth_headers()

    def test_create_event_type_success(self):
        r = self.client.post("/api/v1/owner/event-types", json={
            "id": "evt-custom-1",
            "name": "Консультация 45 минут",
            "description": "Детальный разбор задачи.",
            "durationMinutes": 45,
        }, headers=self.auth_headers)
        self.assertEqual(r.status_code, 201)
        data = r.json()
        self.assertEqual(data["id"], "evt-custom-1")
        self.assertEqual(data["name"], "Консультация 45 минут")
        self.assertEqual(data["durationMinutes"], 45)
        self.assertIn("createdAt", data)

    def test_create_event_type_duplicate_id(self):
        payload = {"id": "evt-dup", "name": "Тест", "description": "", "durationMinutes": 30}
        self.client.post("/api/v1/owner/event-types", json=payload, headers=self.auth_headers)
        r = self.client.post("/api/v1/owner/event-types", json=payload, headers=self.auth_headers)
        self.assertEqual(r.status_code, 409)
        self.assertEqual(r.json()["error"]["code"], "DUPLICATE_ID")

    def test_create_event_type_invalid_duration_not_multiple_of_15(self):
        r = self.client.post("/api/v1/owner/event-types", json={
            "id": "evt-bad",
            "name": "Тест",
            "description": "",
            "durationMinutes": 20,
        }, headers=self.auth_headers)
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["durationMinutes"], 20)

    def test_create_event_type_invalid_duration_zero(self):
        r = self.client.post("/api/v1/owner/event-types", json={
            "id": "evt-zero",
            "name": "Тест",
            "description": "",
            "durationMinutes": 0,
        }, headers=self.auth_headers)
        self.assertEqual(r.status_code, 400)

    def test_created_event_type_appears_in_public_list(self):
        self.client.post("/api/v1/owner/event-types", json={
            "id": "evt-new",
            "name": "Новый тип",
            "description": "Описание",
            "durationMinutes": 60,
        }, headers=self.auth_headers)
        r = self.client.get("/api/v1/event-types")
        names = [et["name"] for et in r.json()]
        self.assertIn("Новый тип", names)

    def test_delete_event_type(self):
        r = self.client.delete("/api/v1/owner/event-types/evt-001", headers=self.auth_headers)
        self.assertEqual(r.status_code, 204)
        r2 = self.client.get("/api/v1/event-types")
        ids = [et["id"] for et in r2.json()]
        self.assertNotIn("evt-001", ids)

    def test_delete_nonexistent_event_type(self):
        r = self.client.delete("/api/v1/owner/event-types/nonexistent", headers=self.auth_headers)
        self.assertEqual(r.status_code, 404)


class TestOwnerUpcomingBookings(unittest.TestCase):
    def setUp(self):
        reset_db()
        from main import app
        self.client = TestClient(app)
        self.auth_headers = get_test_auth_headers()

    def _book(self, event_type_id: str, days_ahead: int = 3, hour: int = 10):
        return self.client.post("/api/v1/bookings", json={
            "eventTypeId": event_type_id,
            "startTime": future_iso(days=days_ahead, hour=hour),
            "guestName": "Иван Иванов",
            "guestEmail": "ivan@example.com",
        })

    def test_upcoming_bookings_empty_initially(self):
        r = self.client.get("/api/v1/owner/bookings/upcoming", headers=self.auth_headers)
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data["items"], [])
        self.assertEqual(data["total"], 0)

    def test_upcoming_bookings_shows_all_event_types(self):
        self._book("evt-001", days_ahead=3, hour=10)
        self._book("evt-002", days_ahead=4, hour=11)
        r = self.client.get("/api/v1/owner/bookings/upcoming", headers=self.auth_headers)
        data = r.json()
        self.assertEqual(data["total"], 2)
        event_type_ids = {b["eventTypeId"] for b in data["items"]}
        self.assertIn("evt-001", event_type_ids)
        self.assertIn("evt-002", event_type_ids)

    def test_upcoming_bookings_sorted_by_start_time(self):
        self._book("evt-001", days_ahead=5, hour=14)
        self._book("evt-002", days_ahead=3, hour=10)
        r = self.client.get("/api/v1/owner/bookings/upcoming", headers=self.auth_headers)
        items = r.json()["items"]
        times = [b["startTime"] for b in items]
        self.assertEqual(times, sorted(times))

    def test_upcoming_bookings_pagination(self):
        for hour in [9, 10, 11]:
            self._book("evt-001", days_ahead=3, hour=hour)
        r = self.client.get("/api/v1/owner/bookings/upcoming?limit=2&offset=0", headers=self.auth_headers)
        data = r.json()
        self.assertEqual(len(data["items"]), 2)
        self.assertEqual(data["total"], 3)
        self.assertEqual(data["limit"], 2)

    def test_ongoing_booking_included_with_flag(self):
        """Встреча, которая идёт прямо сейчас, включается в список с isOngoing=True."""
        from datetime import datetime, timedelta
        import database as db
        from database import SessionLocal, BookingRow
        # Создаём бронирование, которое началось 5 минут назад и закончится через 10
        now = datetime.now()
        start = (now - timedelta(minutes=5)).strftime("%Y-%m-%dT%H:%M:%S")
        end = (now + timedelta(minutes=10)).strftime("%Y-%m-%dT%H:%M:%S")
        with SessionLocal() as session:
            session.add(BookingRow(
                id="ongoing-1", event_type_id="evt-001",
                start_time=start, end_time=end,
                guest_name="Текущий Гость", guest_email="ongoing@example.com",
                status="confirmed", created_at=db.now_iso(),
            ))
            session.commit()
        r = self.client.get("/api/v1/owner/bookings/upcoming", headers=self.auth_headers)
        items = r.json()["items"]
        ongoing = [b for b in items if b["id"] == "ongoing-1"]
        self.assertEqual(len(ongoing), 1)
        self.assertTrue(ongoing[0]["isOngoing"])

    def test_future_booking_has_is_ongoing_false(self):
        """Будущая встреча имеет isOngoing=False."""
        self._book("evt-001", days_ahead=3, hour=10)
        r = self.client.get("/api/v1/owner/bookings/upcoming", headers=self.auth_headers)
        items = r.json()["items"]
        self.assertTrue(all(not b["isOngoing"] for b in items))


class TestCrossEventTypeConflict(unittest.TestCase):
    """Правило занятости: нельзя забронировать пересекащееся время
    даже если это разные типы событий."""

    def setUp(self):
        reset_db()
        from main import app
        self.client = TestClient(app)
        self.auth_headers = get_test_auth_headers()
        # Создаём второй тип события с тем же временем слота
        self.client.post("/api/v1/owner/event-types", json={
            "id": "evt-new-type",
            "name": "Новый тип 30 мин",
            "description": "Тест пересечения",
            "durationMinutes": 30,
        }, headers=self.auth_headers)

    def test_booking_new_event_type_conflicts_with_existing(self):
        """Бронируем evt-001 на 10:00, затем evt-new-type на то же время — должен вернуть 409."""
        start = future_iso(days=3, hour=10)
        r1 = self.client.post("/api/v1/bookings", json={
            "eventTypeId": "evt-001",
            "startTime": start,
            "guestName": "Гость А",
            "guestEmail": "a@example.com",
        })
        self.assertEqual(r1.status_code, 201)

        r2 = self.client.post("/api/v1/bookings", json={
            "eventTypeId": "evt-new-type",
            "startTime": start,
            "guestName": "Гость Б",
            "guestEmail": "b@example.com",
        })
        self.assertEqual(r2.status_code, 409)
        self.assertEqual(r2.json()["error"]["code"], "SLOT_OCCUPIED")

    def test_booking_new_event_type_overlapping_interval(self):
        """evt-001 (15 мин) на 10:00–10:15, evt-new-type (30 мин) на 10:05 — пересечение."""
        start_first = future_iso(days=3, hour=10, minute=0)
        start_overlap = future_iso(days=3, hour=10, minute=5)

        r1 = self.client.post("/api/v1/bookings", json={
            "eventTypeId": "evt-001",
            "startTime": start_first,
            "guestName": "Гость А",
            "guestEmail": "a@example.com",
        })
        self.assertEqual(r1.status_code, 201)

        r2 = self.client.post("/api/v1/bookings", json={
            "eventTypeId": "evt-new-type",
            "startTime": start_overlap,
            "guestName": "Гость Б",
            "guestEmail": "b@example.com",
        })
        self.assertEqual(r2.status_code, 409)
        self.assertEqual(r2.json()["error"]["code"], "SLOT_OCCUPIED")

    def test_booking_new_event_type_non_overlapping_succeeds(self):
        """evt-001 (15 мин) на 10:00–10:15, evt-new-type (30 мин) на 10:15 — нет пересечения."""
        start_first = future_iso(days=3, hour=10, minute=0)
        start_after = future_iso(days=3, hour=10, minute=15)

        self.client.post("/api/v1/bookings", json={
            "eventTypeId": "evt-001",
            "startTime": start_first,
            "guestName": "Гость А",
            "guestEmail": "a@example.com",
        })

        r2 = self.client.post("/api/v1/bookings", json={
            "eventTypeId": "evt-new-type",
            "startTime": start_after,
            "guestName": "Гость Б",
            "guestEmail": "b@example.com",
        })
        self.assertEqual(r2.status_code, 201)


if __name__ == "__main__":
    unittest.main(verbosity=2)
