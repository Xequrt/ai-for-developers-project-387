import { ActionIcon, Group, Stack, Text } from '@mantine/core'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import type { DayAvailability } from '../../types'
import { getCellAria, getHoverProps } from '../../utils/animationProps'
import { useThemeColors } from '../../utils/useThemeColors'

interface CalendarGridProps {
  currentMonth: string // YYYY-MM
  selectedDate: string | null
  availability: DayAvailability[]
  onMonthChange: (month: string) => void
  onDateSelect: (date: string) => void
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const MONTH_NAMES = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
]

function parseYearMonth(ym: string): { year: number; month: number } {
  const [y, m] = ym.split('-').map(Number)
  return { year: y, month: m }
}

function addMonths(ym: string, delta: number): string {
  const { year, month } = parseYearMonth(ym)
  const d = new Date(year, month - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function buildCalendarDays(year: number, month: number): (string | null)[] {
  const firstDay = new Date(year, month - 1, 1)
  let startOffset = firstDay.getDay() - 1
  if (startOffset < 0) startOffset = 6

  const daysInMonth = new Date(year, month, 0).getDate()
  const cells: (string | null)[] = []

  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export function CalendarGrid({
  currentMonth,
  selectedDate,
  availability,
  onMonthChange,
  onDateSelect,
}: CalendarGridProps) {
  const { year, month } = parseYearMonth(currentMonth)
  const cells = buildCalendarDays(year, month)
  const today = new Date().toISOString().slice(0, 10)
  const prefersReducedMotion = useReducedMotion()
  const c = useThemeColors()

  const availMap = new Map<string, number>(
    availability.map((a) => [a.date, a.availableCount]),
  )

  const windowEnd = new Date()
  windowEnd.setDate(windowEnd.getDate() + 14)
  const windowEndStr = windowEnd.toISOString().slice(0, 10)

  const todayMonth = today.slice(0, 7)
  const windowEndMonth = windowEndStr.slice(0, 7)
  const canGoPrev = currentMonth > todayMonth
  const canGoNext = currentMonth < windowEndMonth

  const monthLabel = `${MONTH_NAMES[month - 1]} ${year} г.`
  const cellHover = getHoverProps('calendar-cell')

  return (
    <Stack gap="md">
      {/* Header */}
      <Group justify="space-between" align="center">
        <Text fw={700} size="lg" style={{ color: c.textPrimary, letterSpacing: '-0.3px' }}>
          Календарь
        </Text>
        <Group gap="xs">
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            radius="md"
            disabled={!canGoPrev}
            onClick={() => canGoPrev && onMonthChange(addMonths(currentMonth, -1))}
            aria-label="Предыдущий месяц"
            style={{ minWidth: 44, minHeight: 44 }}
          >
            ←
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            radius="md"
            disabled={!canGoNext}
            onClick={() => canGoNext && onMonthChange(addMonths(currentMonth, 1))}
            aria-label="Следующий месяц"
            style={{ minWidth: 44, minHeight: 44 }}
          >
            →
          </ActionIcon>
        </Group>
      </Group>

      {/* Month label + grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentMonth}
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 50 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -50 }}
          transition={prefersReducedMotion ? { duration: 0.01 } : { duration: 0.3, ease: 'easeInOut' }}
        >
          <Text
            size="sm"
            fw={500}
            style={{ color: c.textSecondary, textTransform: 'capitalize' }}
          >
            {monthLabel}
          </Text>

          {/* Weekday headers */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 4,
              marginTop: 12,
              marginBottom: 4,
            }}
          >
            {WEEKDAYS.map((wd) => (
              <Text
                key={wd}
                size="xs"
                fw={600}
                ta="center"
                style={{ color: '#8E8E93', padding: '4px 0', fontSize: 12 }}
              >
                {wd}
              </Text>
            ))}
          </div>

          {/* Day cells */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 4,
            }}
          >
            {cells.map((date, idx) => {
              if (!date) {
                return <div key={`empty-${idx}`} style={{ height: 56 }} />
              }

              const count = availMap.get(date) ?? 0
              const isSelected = date === selectedDate
              const isToday = date === today
              const isPast = date < today
              const isOutOfWindow = date > windowEndStr
              const isWeekend = (() => {
                const dow = new Date(date).getDay()
                return dow === 0 || dow === 6
              })()
              const isDisabled = isPast || isOutOfWindow || isWeekend || count === 0

              const { ariaLabel, ariaPressed, ariaDisabled } = getCellAria({
                date,
                count,
                selected: isSelected,
                disabled: isDisabled,
              })

              return (
                <motion.button
                  key={date}
                  whileHover={
                    !isDisabled && !prefersReducedMotion
                      ? cellHover
                      : {}
                  }
                  onClick={() => !isDisabled && onDateSelect(date)}
                  disabled={isDisabled}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 56,
                    minWidth: 44,
                    minHeight: 44,
                    borderRadius: 8,
                    border: isToday && !isSelected
                      ? `2px solid ${c.calendarTodayBorder}`
                      : '2px solid transparent',
                    background: isSelected
                      ? c.calendarSelected
                      : isDisabled
                      ? 'transparent'
                      : c.bgCardSolid,
                    cursor: isDisabled ? 'default' : 'pointer',
                    padding: 0,
                    gap: 2,
                    boxShadow: isSelected
                      ? `0 2px 8px ${c.calendarSelectedShadow}`
                      : !isDisabled
                      ? '0 1px 3px rgba(0,0,0,0.06)'
                      : 'none',
                    opacity: isDisabled && !isToday ? 0.4 : 1,
                    transition: 'background 0.15s',
                  }}
                  aria-label={ariaLabel}
                  aria-pressed={ariaPressed}
                  aria-disabled={ariaDisabled}
                >
                  <Text
                    size="sm"
                    fw={isSelected || isToday ? 700 : 400}
                    style={{
                      color: isSelected ? '#FFFFFF' : isDisabled ? c.textDisabled : c.textPrimary,
                      lineHeight: 1,
                    }}
                  >
                    {Number(date.slice(8))}
                  </Text>
                  {count > 0 && (
                    <Text
                      size="xs"
                      style={{
                        color: isSelected ? 'rgba(255,255,255,0.85)' : c.slotAvailableCountColor,
                        fontSize: 9,
                        lineHeight: 1,
                        fontWeight: 600,
                      }}
                    >
                      {count} св.
                    </Text>
                  )}
                </motion.button>
              )
            })}
          </div>
        </motion.div>
      </AnimatePresence>
    </Stack>
  )
}
