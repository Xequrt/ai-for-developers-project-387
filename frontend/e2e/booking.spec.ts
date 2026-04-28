import { test, expect } from '@playwright/test'

/**
 * E2E тесты основного сценария бронирования.
 * Требуют запущенных бэкенда (порт 8000) и фронтенда (порт 5173).
 */

test.describe('Сценарий гостя — полное бронирование', () => {
  test('лендинг отображается и кнопка "Записаться" ведёт на /book', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('БЫСТРАЯ ЗАПИСЬ НА ВСТРЕЧУ')).toBeVisible()
    await page.getByRole('button', { name: 'Записаться' }).click()
    await expect(page).toHaveURL('/book')
  })

  test('страница /book показывает типы событий', async ({ page }) => {
    await page.goto('/book')
    await page.waitForLoadState('networkidle')
    // Ждём загрузки карточек
    await expect(page.getByText('Выберите тип события')).toBeVisible({ timeout: 10000 })
    const cards = page.locator('[class*="mantine-Card"]')
    await expect(cards.first()).toBeVisible()
  })

  test('полный путь бронирования', async ({ page }) => {
    await page.goto('/book')

    // Выбираем первый тип события
    await page.waitForSelector('[class*="mantine-SimpleGrid"] [class*="mantine-Card"]')
    await page.locator('[class*="mantine-SimpleGrid"] [class*="mantine-Card"]').first().click()

    // Ждём загрузки календаря
    await expect(page.getByText('Календарь')).toBeVisible()

    // Ждём появления доступных дней (aria-label содержит "свободных слотов")
    const availableDay = page.locator('button[aria-label*="свободных слотов"]').first()
    await availableDay.waitFor({ state: 'visible', timeout: 15000 })
    await availableDay.click()

    // Ждём появления слотов
    await page.waitForTimeout(500)

    // Выбираем первый доступный слот (не задизейбленный)
    const slot = page.locator('button:not([disabled])').filter({ hasText: /^\d{2}:\d{2}/ }).first()
    await slot.waitFor({ state: 'visible' })
    await slot.click()

    // Нажимаем "Продолжить"
    await page.getByRole('button', { name: 'Продолжить' }).click()

    // Проверяем что попали на страницу подтверждения
    await expect(page.getByText('Подтверждение бронирования')).toBeVisible()

    // Заполняем форму
    await page.getByLabel('Имя').fill('Тест Тестов')
    await page.getByLabel('Email').fill('test@example.com')

    // Бронируем
    await page.getByRole('button', { name: 'Забронировать' }).click()

    // Проверяем успех
    await expect(page.getByText('Бронирование подтверждено')).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Сценарий владельца — админка', () => {
  test.beforeEach(async ({ page }) => {
    // Логинимся перед каждым тестом владельца
    await page.goto('/login')
    await page.getByLabel('Имя пользователя или email').fill('owner')
    await page.getByLabel('Пароль').fill('Changeme1')
    await page.getByRole('button', { name: 'Войти' }).click()
    await page.waitForURL('/admin')
  })

  test('страница /admin показывает профиль владельца', async ({ page }) => {
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Типы событий')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Предстоящие встречи')).toBeVisible()
  })

  test('владелец может создать новый тип события', async ({ page }) => {
    await page.getByRole('button', { name: '+ Новый тип' }).click()
    await page.getByRole('textbox', { name: 'ID' }).fill('evt-test-e2e')
    await page.getByRole('textbox', { name: 'Название' }).fill('Тестовая встреча')
    await page.getByRole('button', { name: 'Создать' }).click()
    await expect(page.getByText('Тестовая встреча')).toBeVisible({ timeout: 3000 })
  })
})

test.describe('Правило занятости слота', () => {
  test('повторное бронирование того же слота показывает ошибку', async ({ page, request }) => {
    // Получаем типы событий
    const typesRes = await request.get('http://localhost:8000/api/v1/event-types')
    const types = await typesRes.json()
    const eventType = types[0]

    // Получаем доступные слоты на ближайший рабочий день
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
      tomorrow.setDate(tomorrow.getDate() + 1)
    }
    const dateStr = tomorrow.toISOString().slice(0, 10)

    const slotsRes = await request.get(
      `http://localhost:8000/api/v1/available-slots?eventTypeId=${eventType.id}&date=${dateStr}`
    )
    const slots = await slotsRes.json()
    const slot = slots.find((s: { available: boolean }) => s.available)

    if (!slot) {
      test.skip()
      return
    }

    // Первое бронирование — должно пройти
    const r1 = await request.post('http://localhost:8000/api/v1/bookings', {
      data: {
        eventTypeId: eventType.id,
        startTime: slot.startTime,
        guestName: 'Первый Гость',
        guestEmail: 'first@example.com',
      },
    })
    expect(r1.status()).toBe(201)

    // Второе бронирование на то же время — должно вернуть 409
    const r2 = await request.post('http://localhost:8000/api/v1/bookings', {
      data: {
        eventTypeId: eventType.id,
        startTime: slot.startTime,
        guestName: 'Второй Гость',
        guestEmail: 'second@example.com',
      },
    })
    expect(r2.status()).toBe(409)
    const body = await r2.json()
    expect(body.error.code).toBe('SLOT_OCCUPIED')
  })
})
