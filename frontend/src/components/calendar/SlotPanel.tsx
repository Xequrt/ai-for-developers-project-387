import { Button, Group, Loader, ScrollArea, Stack, Text } from '@mantine/core'
import { motion, useReducedMotion } from 'motion/react'
import type { TimeSlot } from '../../types'
import { getSlotAria, getHoverProps } from '../../utils/animationProps'
import { useThemeColors } from '../../utils/useThemeColors'

interface SlotPanelProps {
  slots: TimeSlot[]
  selectedSlot: TimeSlot | null
  loading: boolean
  selectedDate: string | null
  onSlotSelect: (slot: TimeSlot) => void
  onBack: () => void
  onContinue: () => void
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function SlotPanel({
  slots,
  selectedSlot,
  loading,
  selectedDate,
  onSlotSelect,
  onBack,
  onContinue,
}: SlotPanelProps) {
  const prefersReducedMotion = useReducedMotion()
  const slotHover = getHoverProps('timeslot')
  const c = useThemeColors()

  return (
    <Stack gap="md" style={{ height: '100%' }}>
      <Text fw={700} size="lg" style={{ color: c.textPrimary, letterSpacing: '-0.3px' }}>
        Статус слотов
      </Text>

      {!selectedDate && (
        <Text size="sm" style={{ color: c.textTertiary }}>
          Выберите дату в календаре, чтобы увидеть доступные слоты.
        </Text>
      )}

      {selectedDate && loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
          <Loader color={c.mantineColor} size="sm" />
        </div>
      )}

      {selectedDate && !loading && slots.length === 0 && (
        <Text size="sm" style={{ color: c.textTertiary }}>
          На выбранную дату нет доступных слотов.
        </Text>
      )}

      {selectedDate && !loading && slots.length > 0 && (
        <ScrollArea style={{ flex: 1, overflow: 'hidden' }} offsetScrollbars>
          <Stack gap={6} style={{ padding: '2px 4px' }}>
            {slots.map((slot) => {
              const isSelected = selectedSlot?.startTime === slot.startTime
              const label = `${formatTime(slot.startTime)} – ${formatTime(slot.endTime)}`
              const slotBg = isSelected
                ? c.calendarSelected
                : slot.available
                ? c.calendarAvailable
                : c.calendarOccupied
              const slotBorder = isSelected ? `2px solid ${c.slotSelectedBorder}` : '2px solid transparent'
              const { ariaLabel, ariaPressed } = getSlotAria({
                available: slot.available,
                selected: isSelected,
                startTime: slot.startTime,
                endTime: slot.endTime,
              })

              return (
                <motion.button
                  key={slot.startTime}
                  whileHover={
                    slot.available && !prefersReducedMotion
                      ? slotHover
                      : {}
                  }
                  onClick={() => slot.available && onSlotSelect(slot)}
                  disabled={!slot.available}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    minHeight: 44,
                    minWidth: 80,
                    padding: '0 12px',
                    borderRadius: 8,
                    border: slotBorder,
                    background: slotBg,
                    cursor: slot.available ? 'pointer' : 'default',
                    width: '100%',
                    boxShadow: slot.available && !isSelected
                      ? '0 1px 3px rgba(0,0,0,0.06)'
                      : 'none',
                    transition: 'background 0.15s, border-color 0.15s',
                  }}
                  aria-label={ariaLabel}
                  aria-pressed={ariaPressed}
                >
                  <Text
                    size="sm"
                    fw={500}
                    style={{
                      color: slot.available ? c.textPrimary : c.textDisabled,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {label}
                  </Text>
                  <Text size="xs" fw={600} style={{
                      color: slot.available
                        ? isSelected ? c.accent : '#34C759'
                        : c.textDisabled,
                    }}>
                    {slot.available ? 'Свободно' : 'Занято'}
                  </Text>
                </motion.button>
              )
            })}
          </Stack>
        </ScrollArea>
      )}

      {/* Action buttons */}
      <Group gap="sm" mt="auto">
        <Button
          variant="default"
          onClick={onBack}
          style={{ flex: 1 }}
          radius="md"
        >
          Назад
        </Button>
        <Button color={c.mantineColor} onClick={onContinue} disabled={!selectedSlot} style={{ flex: 1 }} radius="md">
          Продолжить
        </Button>
      </Group>
    </Stack>
  )
}
