"""
Тесты правила занятости:
- Два бронирования на одно время → 409
- Разные типы событий на одно время → 409
- Отмена бронирования освобождает слот
- Пересечение интервалов (не только точное совпадение)
"""
import unittest
from fastapi.testclient import TestClient
from conftest import reset_db, future_iso, future_date, get_test_auth_headers


class TestOccupancyRule(unittest.TestCase):
    def setUp(self):
        reset_db()
        from main import app
        self.client = TestClient(app)
        self.auth_headers = get_test_auth_headers()

    def _book(self, event_type_id: str, days: int = 3, hour: int = 10, minute: int = 0) -> dict:
        r = self.client.post("/api/v1/bookings", json={
            "eventTypeId": event_type_id,
            "startTime": future_iso(days=days, hour=hour, minute=minute),
            "guestName": "Гость",
            "guestEmail": "guest@example.com",
        })
        return r

    def test_same_time_same_event_type_returns_409(self):
        r1 = self._book("evt-001", hour=10)
        self.assertEqual(r1.status_code, 201)

        r2 = self._book("evt-001", hour=10)
        self.assertEqual(r2.status_code, 409)
        self.assertEqual(r2.json()["error"]["code"], "SLOT_OCCUPIED")

    def test_same_time_different_event_types_returns_409(self):
        """Правило занятости: разные типы событий не могут занять одно время."""
        r1 = self._book("evt-001", hour=10)
        self.assertEqual(r1.status_code, 201)

        # evt-002 (30 мин) начинается в то же время что evt-001 (15 мин)
        r2 = self._book("evt-002", hour=10)
        self.assertEqual(r2.status_code, 409)
        self.assertEqual(r2.json()["error"]["code"], "SLOT_OCCUPIED")

    def test_overlapping_intervals_returns_409(self):
        """Бронирование на 10:00–10:30 (evt-002) блокирует 10:15–10:30 (evt-001)."""
        r1 = self._book("evt-002", hour=10, minute=0)  # 10:00–10:30
        self.assertEqual(r1.status_code, 201)

        r2 = self._book("evt-001", hour=10, minute=15)  # 10:15–10:30 — пересечение
        self.assertEqual(r2.status_code, 409)

    def test_adjacent_slots_do_not_conflict(self):
        """Слоты вплотную (10:00–10:15 и 10:15–10:30) не конфликтуют."""
        r1 = self._book("evt-001", hour=10, minute=0)   # 10:00–10:15
        self.assertEqual(r1.status_code, 201)

        r2 = self._book("evt-001", hour=10, minute=15)  # 10:15–10:30
        self.assertEqual(r2.status_code, 201)

    def test_cancel_booking_frees_slot(self):
        """После отмены бронирования слот снова доступен."""
        r1 = self._book("evt-001", hour=10)
        self.assertEqual(r1.status_code, 201)
        booking_id = r1.json()["id"]

        # Отменяем
        r_cancel = self.client.delete(f"/api/v1/owner/bookings/{booking_id}", headers=self.auth_headers)
        self.assertEqual(r_cancel.status_code, 204)

        # Теперь можно забронировать то же время
        r2 = self._book("evt-001", hour=10)
        self.assertEqual(r2.status_code, 201)

    def test_cancelled_booking_not_in_upcoming(self):
        r1 = self._book("evt-001", hour=10)
        booking_id = r1.json()["id"]
        self.client.delete(f"/api/v1/owner/bookings/{booking_id}", headers=self.auth_headers)

        r = self.client.get("/api/v1/owner/bookings/upcoming", headers=self.auth_headers)
        ids = [b["id"] for b in r.json()["items"]]
        self.assertNotIn(booking_id, ids)

    def test_conflict_response_contains_conflicting_id(self):
        r1 = self._book("evt-001", hour=10)
        first_id = r1.json()["id"]

        r2 = self._book("evt-001", hour=10)
        details = r2.json()["error"].get("details", {})
        self.assertEqual(details.get("conflictingBookingId"), first_id)

    def test_multiple_bookings_different_times_all_succeed(self):
        """Несколько бронирований в разное время — все проходят."""
        hours = [9, 10, 11, 14, 15]
        for h in hours:
            r = self._book("evt-001", hour=h)
            self.assertEqual(r.status_code, 201, f"Не удалось забронировать {h}:00")

    def test_booked_slot_shows_booking_id_in_slots(self):
        r1 = self._book("evt-001", days=3, hour=10)
        booking_id = r1.json()["id"]

        date_str = future_date(days=3)
        r = self.client.get(f"/api/v1/available-slots?eventTypeId=evt-001&date={date_str}")
        booked = [s for s in r.json() if not s["available"]]
        self.assertTrue(any(s["bookingId"] == booking_id for s in booked))


if __name__ == "__main__":
    unittest.main(verbosity=2)
