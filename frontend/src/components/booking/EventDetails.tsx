import { Avatar, Badge, Divider, Group, Stack, Text } from '@mantine/core'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import type { EventType, Owner, TimeSlot } from '../../types'
import { useThemeColors } from '../../utils/useThemeColors'

interface EventDetailsProps {
  eventType: EventType
  owner: Owner | null
  selectedDate: string | null
  selectedSlot: TimeSlot | null
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function EventDetails({
  eventType,
  owner,
  selectedDate,
  selectedSlot,
}: EventDetailsProps) {
  const prefersReducedMotion = useReducedMotion()
  const c = useThemeColors()
  const timeLabel = selectedSlot
    ? `${formatTime(selectedSlot.startTime)} – ${formatTime(selectedSlot.endTime)}`
    : null

  const chipAnim = prefersReducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.01 } }
    : { initial: { opacity: 0, y: 4 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -4 }, transition: { duration: 0.2 } }

  return (
    <Stack
      gap="lg"
      style={{
        background: c.glassBackground,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: c.glassBorder,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        borderRadius: 12,
        padding: 20,
      }}
    >
      {/* Owner */}
      {owner && (
        <Group gap="sm">
          <Avatar size={40} radius="xl" color={c.mantineColor}>
            {owner.name.charAt(0).toUpperCase()}
          </Avatar>
          <Stack gap={0}>
            <Text fw={600} size="sm" style={{ color: c.textPrimary }}>
              {owner.name}
            </Text>
            <Text size="xs" style={{ color: c.textTertiary }}>
              Host
            </Text>
          </Stack>
        </Group>
      )}

      <Divider />

      {/* Event type info */}
      <Stack gap="xs">
        <Group gap="xs" align="center">
          <Text fw={700} size="lg" style={{ color: c.textPrimary, letterSpacing: '-0.3px' }}>
            {eventType.name}
          </Text>
          <Badge size="sm" variant="filled" color={c.mantineColor}>
            {eventType.durationMinutes} мин
          </Badge>
        </Group>
        <Text size="sm" style={{ color: c.textSecondary, lineHeight: 1.6 }}>
          {eventType.description}
        </Text>
      </Stack>

      <Divider />

      {/* Selected date */}
      <Stack gap="xs">
        <Text size="xs" fw={600} style={{ color: c.textTertiary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Выбранная дата
        </Text>
        <AnimatePresence mode="wait">
          {selectedDate ? (
            <motion.div
              key={selectedDate}
              {...chipAnim}
            >
              <Text
                size="sm"
                fw={500}
                style={{
                  color: c.textPrimary,
                  background: c.chipBg,
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: c.chipBorder,
                }}
              >
                {formatDate(selectedDate)}
              </Text>
            </motion.div>
          ) : (
            <motion.div
              key="empty-date"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Text
                size="sm"
                style={{
                  color: c.textDisabled,
                  background: c.bgSecondary,
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontStyle: 'italic',
                }}
              >
                Не выбрана
              </Text>
            </motion.div>
          )}
        </AnimatePresence>
      </Stack>

      {/* Selected time */}
      <Stack gap="xs">
        <Text size="xs" fw={600} style={{ color: c.textTertiary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Выбранное время
        </Text>
        <AnimatePresence mode="wait">
          {timeLabel ? (
            <motion.div
              key={timeLabel}
              {...chipAnim}
            >
              <Text
                size="sm"
                fw={500}
                style={{
                  color: c.textPrimary,
                  background: c.chipBg,
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: c.chipBorder,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {timeLabel}
              </Text>
            </motion.div>
          ) : (
            <motion.div
              key="empty-time"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Text
                size="sm"
                style={{
                  color: c.textDisabled,
                  background: c.bgSecondary,
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontStyle: 'italic',
                }}
              >
                Не выбрано
              </Text>
            </motion.div>
          )}
        </AnimatePresence>
      </Stack>
    </Stack>
  )
}
