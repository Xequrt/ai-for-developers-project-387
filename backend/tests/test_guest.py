"""
Тесты сценариев гостя:
- Просмотр типов событий
- Выбор слотов (рабочий день, выходной, прошлое, ближайшие 14 дней)
- Создание бронирования
"""
import unittest
from datetime import date, datetime, timedelta
from fastapi.testclient import TestClient
from conftest import reset_db, future_iso, future_date


def next_weekend() -> str:
    """Возвращает ближайшую субботу."""
    today = date.today()
    days_ahead = (5 - today.weekday()) % 7
    if days_ahead == 0:
        days_ahead = 7
    return (today + timedelta(days=days_ahead)).isoformat()


def past_date() -> str:
    return (date.today() - timedelta(days=1)).isoformat()


class TestGuestEventTypes(unittest.TestCase):
    def setUp(self):
        reset_db()
        from main import app
        self.client = TestClient(app)

    def test_list_event_types_returns_all(self):
        r = self.client.get("/api/v1/event-types")
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertGreaterEqual(len(data), 2)

    def test_event_type_has_required_fields(self):
        r = self.client.get("/api/v1/event-types")
        for et in r.json():
            self.assertIn("id", et)
            self.assertIn("name", et)
            self.assertIn("description", et)
            self.assertIn("durationMinutes", et)

    def test_event_type_duration_is_positive(self):
        r = self.client.get("/api/v1/event-types")
        for et in r.json():
            self.assertGreater(et["durationMinutes"], 0)


class TestGuestAvailableSlots(unittest.TestCase):
    def setUp(self):
        reset_db()
        from main import app
        self.client = TestClient(app)

    def test_slots_on_working_day_are_available(self):
        date_str = future_date(days=3)
        r = self.client.get(f"/api/v1/available-slots?eventTypeId=evt-001&date={date_str}")
        self.assertEqual(r.status_code, 200)
        slots = r.json()
        self.assertGreater(len(slots), 0)
        self.assertTrue(all(s["available"] for s in slots))

    def test_slots_on_weekend_are_empty(self):
        weekend = next_weekend()
        r = self.client.get(f"/api/v1/available-slots?eventTypeId=evt-001&date={weekend}")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json(), [])

    def test_slots_on_past_date_are_empty(self):
        r = self.client.get(f"/api/v1/available-slots?eventTypeId=evt-001&date={past_date()}")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json(), [])

    def test_slots_step_matches_duration_15(self):
        date_str = future_date(days=3)
        r = self.client.get(f"/api/v1/available-slots?eventTypeId=evt-001&date={date_str}")
        slots = r.json()
        if len(slots) >= 2:
            t0 = datetime.fromisoformat(slots[0]["startTime"])
            t1 = datetime.fromisoformat(slots[1]["startTime"])
            self.assertEqual((t1 - t0).seconds, 15 * 60)

    def test_slots_step_matches_duration_30(self):
        date_str = future_date(days=3)
        r = self.client.get(f"/api/v1/available-slots?eventTypeId=evt-002&date={date_str}")
        slots = r.json()
        if len(slots) >= 2:
            t0 = datetime.fromisoformat(slots[0]["startTime"])
            t1 = datetime.fromisoformat(slots[1]["startTime"])
            self.assertEqual((t1 - t0).seconds, 30 * 60)

    def test_slots_within_working_hours(self):
        date_str = future_date(days=3)
        r = self.client.get(f"/api/v1/available-slots?eventTypeId=evt-001&date={date_str}")
        for slot in r.json():
            start = datetime.fromisoformat(slot["startTime"])
            end = datetime.fromisoformat(slot["endTime"])
            self.assertGreaterEqual(start.hour, 9)
            self.assertLessEqual(end.hour, 18)

    def test_slots_for_unknown_event_type_returns_404(self):
        r = self.client.get(f"/api/v1/available-slots?eventTypeId=unknown&date={future_date()}")
        self.assertEqual(r.status_code, 404)
        self.assertEqual(r.json()["error"]["code"], "EVENT_TYPE_NOT_FOUND")

    def test_summary_has_entry_for_each_day_of_month(self):
        from datetime import date
        today = date.today()
        month = f"{today.year}-{today.month:02d}"
        import calendar
        _, days = calendar.monthrange(today.year, today.month)
        r = self.client.get(f"/api/v1/available-slots/summary?eventTypeId=evt-001&month={month}")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.json()), days)

    def test_summary_weekends_have_zero_slots(self):
        from datetime import date
        today = date.today()
        month = f"{today.year}-{today.month:02d}"
        r = self.client.get(f"/api/v1/available-slots/summary?eventTypeId=evt-001&month={month}")
        for entry in r.json():
            d = date.fromisoformat(entry["date"])
            if d.weekday() >= 5:
                self.assertEqual(entry["availableCount"], 0,
                    f"{entry['date']} — выходной, должно быть 0 слотов")

    def test_slots_available_within_14_days(self):
        """Гость может найти слоты в ближайшие 14 дней."""
        found = False
        for days in range(1, 15):
            date_str = future_date(days=days)
            r = self.client.get(f"/api/v1/available-slots?eventTypeId=evt-001&date={date_str}")
            if r.json():
                found = True
                break
        self.assertTrue(found, "Нет доступных слотов в ближайшие 14 дней")


class TestGuestCreateBooking(unittest.TestCase):
    def setUp(self):
        reset_db()
        from main import app
        self.client = TestClient(app)

    def test_create_booking_success(self):
        r = self.client.post("/api/v1/bookings", json={
            "eventTypeId": "evt-001",
            "startTime": future_iso(days=3, hour=10),
            "guestName": "Анна Смирнова",
            "guestEmail": "anna@example.com",
        })
        self.assertEqual(r.status_code, 201)
        data = r.json()
        self.assertEqual(data["status"], "confirmed")
        self.assertEqual(data["guestName"], "Анна Смирнова")
        self.assertEqual(data["eventTypeId"], "evt-001")
        self.assertIn("id", data)
        self.assertIn("endTime", data)

    def test_booking_end_time_matches_duration(self):
        start = future_iso(days=3, hour=11)
        r = self.client.post("/api/v1/bookings", json={
            "eventTypeId": "evt-001",
            "startTime": start,
            "guestName": "Тест",
            "guestEmail": "test@example.com",
        })
        data = r.json()
        s = datetime.fromisoformat(data["startTime"])
        e = datetime.fromisoformat(data["endTime"])
        self.assertEqual((e - s).seconds, 15 * 60)

    def test_booking_past_time_returns_400(self):
        r = self.client.post("/api/v1/bookings", json={
            "eventTypeId": "evt-001",
            "startTime": "2020-01-01T10:00:00Z",
            "guestName": "Тест",
            "guestEmail": "test@example.com",
        })
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()["error"]["code"], "VALIDATION_ERROR")

    def test_booking_unknown_event_type_returns_404(self):
        r = self.client.post("/api/v1/bookings", json={
            "eventTypeId": "nonexistent",
            "startTime": future_iso(days=3, hour=10),
            "guestName": "Тест",
            "guestEmail": "test@example.com",
        })
        self.assertEqual(r.status_code, 404)
        self.assertEqual(r.json()["error"]["code"], "EVENT_TYPE_NOT_FOUND")

    def test_booked_slot_appears_as_unavailable(self):
        start = future_iso(days=3, hour=10)
        self.client.post("/api/v1/bookings", json={
            "eventTypeId": "evt-001",
            "startTime": start,
            "guestName": "Гость",
            "guestEmail": "guest@example.com",
        })
        date_str = future_date(days=3)
        r = self.client.get(f"/api/v1/available-slots?eventTypeId=evt-001&date={date_str}")
        booked = [s for s in r.json() if s["startTime"].startswith(start[:16])]
        self.assertTrue(len(booked) > 0)
        self.assertFalse(booked[0]["available"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
