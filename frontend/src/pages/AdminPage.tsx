import { useEffect, useState } from 'react'
import { Avatar, Badge, Button, Card, Group, Loader, Stack, Text, TextInput, Textarea, NumberInput, ActionIcon } from '@mantine/core'
import { motion, AnimatePresence } from 'motion/react'
import { getOwnerProfile, getUpcomingBookings, getEventTypes, createEventType, updateEventType, deleteEventType } from '../api/client'
import type { Booking, EventType, Owner } from '../types'
import { useThemeColors } from '../utils/useThemeColors'

const pageVariants = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
}
const pageTransition = { duration: 0.3, ease: 'easeInOut' as const }

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('ru-RU', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120]

// ─── Duration picker — изолированное состояние ────────────────────────────────
interface DurationPickerProps {
  value: number
  onChange: (v: number) => void
}

function DurationPicker({ value, onChange }: DurationPickerProps) {
  const c = useThemeColors()
  const [customValue, setCustomValue] = useState<number | string>(
    DURATION_OPTIONS.includes(value) ? '' : value,
  )

  const handleQuickPick = (d: number) => {
    onChange(d)
    setCustomValue('')
  }

  const handleCustomChange = (v: number | string) => {
    setCustomValue(v)
    const num = typeof v === 'number' ? v : parseInt(String(v), 10)
    if (!isNaN(num) && num > 0) onChange(num)
  }

  return (
    <Stack gap={4}>
      <Text size="sm" fw={500} style={{ color: c.textPrimary }}>Длительность (мин)</Text>
      <Group gap="xs" wrap="wrap">
        {DURATION_OPTIONS.map((d) => (
          <Button
            key={d}
            size="xs"
            radius="md"
            variant={value === d && customValue === '' ? 'filled' : 'light'}
            color={c.mantineColor}
            onClick={() => handleQuickPick(d)}
          >
            {d}
          </Button>
        ))}
        <NumberInput
          placeholder="другое"
          step={15}
          value={customValue}
          onChange={handleCustomChange}
          radius="md"
          size="xs"
          style={{ width: 80 }}
          aria-label="Произвольная длительность"
        />
      </Group>
    </Stack>
  )
}

// ─── Форма создания ────────────────────────────────────────────────────────────
interface CreateFormProps {
  onCreated: (et: EventType) => void
  onCancel: () => void
}

function CreateForm({ onCreated, onCancel }: CreateFormProps) {
  const c = useThemeColors()
  const [id, setId] = useState('')
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [duration, setDuration] = useState(30)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setError(null)
    if (!id.trim()) { setError('Укажите id'); return }
    if (!name.trim()) { setError('Укажите название'); return }
    if (!duration || duration <= 0) { setError('Длительность должна быть больше 0'); return }
    setLoading(true)
    try {
      const created = await createEventType({ id: id.trim(), name: name.trim(), description: desc.trim(), durationMinutes: duration })
      onCreated(created)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка создания')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card padding="lg" radius="md" style={{ background: c.bgCardSolid, border: `1px solid rgba(0,122,255,0.2)` }}>
      <Stack gap="sm">
        <Text fw={600} style={{ color: c.textPrimary }}>Создать тип события</Text>
        <Group grow>
          <TextInput label="ID" placeholder="evt-consultation" value={id} onChange={(e) => setId(e.currentTarget.value)} radius="md" />
          <TextInput label="Название" placeholder="Консультация 30 минут" value={name} onChange={(e) => setName(e.currentTarget.value)} radius="md" />
        </Group>
        <Textarea label="Описание" placeholder="Краткое описание встречи" value={desc} onChange={(e) => setDesc(e.currentTarget.value)} radius="md" rows={2} />
        <DurationPicker value={duration} onChange={setDuration} />
        {error && <Text size="sm" style={{ color: '#FF3B30' }}>{error}</Text>}
        <Group justify="flex-end" gap="xs">
          <Button size="sm" radius="md" variant="subtle" color="gray" onClick={onCancel}>Отмена</Button>
          <Button size="sm" radius="md" color={c.mantineColor} loading={loading} onClick={handleSubmit}>Создать</Button>
        </Group>
      </Stack>
    </Card>
  )
}

// ─── Форма редактирования (inline) ────────────────────────────────────────────
interface EditFormProps {
  et: EventType
  onUpdated: (et: EventType) => void
  onCancel: () => void
}

function EditForm({ et, onUpdated, onCancel }: EditFormProps) {
  const c = useThemeColors()
  const [name, setName] = useState(et.name)
  const [desc, setDesc] = useState(et.description)
  const [duration, setDuration] = useState(et.durationMinutes)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setError(null)
    if (!name.trim()) { setError('Укажите название'); return }
    if (!duration || duration <= 0) { setError('Длительность должна быть больше 0'); return }
    setLoading(true)
    try {
      const updated = await updateEventType(et.id, { name: name.trim(), description: desc.trim(), durationMinutes: duration })
      onUpdated(updated)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card padding="md" radius="md" style={{ background: c.editFormBg, border: '1px solid rgba(0,122,255,0.25)' }}>
      <Stack gap="sm">
        <Group justify="space-between">
          <Text fw={600} size="sm" style={{ color: c.textPrimary }}>Редактировать</Text>
          <Text size="xs" style={{ color: c.textDisabled, fontFamily: 'monospace' }}>id: {et.id}</Text>
        </Group>
        <Group grow>
          <TextInput label="Название" value={name} onChange={(e) => setName(e.currentTarget.value)} radius="md" size="sm" />
        </Group>
        <Textarea label="Описание" value={desc} onChange={(e) => setDesc(e.currentTarget.value)} radius="md" rows={2} size="sm" />
        <DurationPicker value={duration} onChange={setDuration} />
        {error && <Text size="sm" style={{ color: '#FF3B30' }}>{error}</Text>}
        <Group justify="flex-end" gap="xs">
          <Button size="xs" radius="md" variant="subtle" color="gray" onClick={onCancel}>Отмена</Button>
          <Button size="xs" radius="md" color={c.mantineColor} loading={loading} onClick={handleSubmit}>Сохранить</Button>
        </Group>
      </Stack>
    </Card>
  )
}

// ─── Главная страница ─────────────────────────────────────────────────────────
export function AdminPage() {
  const [owner, setOwner] = useState<Owner | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [eventTypes, setEventTypes] = useState<EventType[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const c = useThemeColors()

  useEffect(() => {
    Promise.all([getOwnerProfile(), getUpcomingBookings(), getEventTypes()]).then(
      ([ownerData, bookingsData, typesData]) => {
        setOwner(ownerData)
        setBookings(bookingsData.items)
        setEventTypes(typesData)
        setLoading(false)
      },
    )
  }, [])

  const getEventTypeName = (id: string) => eventTypes.find((et) => et.id === id)

  const handleCreated = (et: EventType) => {
    setEventTypes((prev) => [...prev, et])
    setFormOpen(false)
  }

  const handleUpdated = (et: EventType) => {
    setEventTypes((prev) => prev.map((x) => (x.id === et.id ? et : x)))
    setEditingId(null)
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await deleteEventType(id)
      setEventTypes((prev) => prev.filter((x) => x.id !== id))
    } catch {
      // ignore — в реальном приложении показать уведомление
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: 'calc(100vh - 56px)', background: c.bgPage, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader color={c.mantineColor} size="lg" />
      </div>
    )
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      style={{ minHeight: 'calc(100vh - 56px)', background: c.bgPage, padding: '40px 24px' }}
    >
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <Stack gap="xl">

          {/* Owner header */}
          {owner && (
            <Card padding="lg" radius="md" style={{ background: c.bgCardSolid, border: `1px solid ${c.borderSubtle}` }}>
              <Group gap="md">
                <Avatar size={56} radius="xl" color={c.mantineColor}>{owner.name.charAt(0).toUpperCase()}</Avatar>
                <Stack gap={2}>
                  <Text fw={700} size="lg" style={{ color: c.textPrimary }}>{owner.name}</Text>
                  <Text size="sm" style={{ color: c.textSecondary }}>{owner.email}</Text>
                </Stack>
                <Badge size="lg" variant="light" color={c.mantineColor} style={{ marginLeft: 'auto' }}>
                  {bookings.length} предстоящих
                </Badge>
              </Group>
            </Card>
          )}

          {/* Event types section */}
          <Stack gap="sm">
            <Group justify="space-between" align="center">
              <Text fw={700} style={{ fontSize: 24, color: c.textPrimary, letterSpacing: '-0.5px' }}>
                Типы событий
              </Text>
              <Button
                size="sm"
                radius="md"
                color={c.mantineColor}
                variant={formOpen ? 'light' : 'filled'}
                onClick={() => { setFormOpen((v) => !v); setEditingId(null) }}
              >
                {formOpen ? 'Отмена' : '+ Новый тип'}
              </Button>
            </Group>

            <AnimatePresence>
              {formOpen && (
                <motion.div key="create-form" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                  <CreateForm onCreated={handleCreated} onCancel={() => setFormOpen(false)} />
                </motion.div>
              )}
            </AnimatePresence>

            <Stack gap="xs">
              <AnimatePresence initial={false}>
                {eventTypes.map((et) => (
                  <motion.div
                    key={et.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.18 }}
                  >
                    {editingId === et.id ? (
                      <EditForm et={et} onUpdated={handleUpdated} onCancel={() => setEditingId(null)} />
                    ) : (
                      <Card padding="md" radius="md" style={{ background: c.bgCardSolid, border: `1px solid ${c.borderSubtle}` }}>
                        <Group justify="space-between" align="center">
                          <Stack gap={2}>
                            <Text fw={600} size="sm" style={{ color: c.textPrimary }}>{et.name}</Text>
                            {et.description && (
                              <Text size="xs" style={{ color: c.textTertiary }}>{et.description}</Text>
                            )}
                            <Text size="xs" style={{ color: c.textDisabled, fontFamily: 'monospace' }}>id: {et.id}</Text>
                          </Stack>
                          <Group gap="xs" align="center">
                            <Badge size="md" variant="light" color={c.mantineColor}>{et.durationMinutes} мин</Badge>
                            <ActionIcon
                              size="sm"
                              variant="subtle"
                              color="gray"
                              radius="md"
                              aria-label="Редактировать"
                              onClick={() => { setEditingId(et.id); setFormOpen(false) }}
                            >
                              ✏️
                            </ActionIcon>
                            <ActionIcon
                              size="sm"
                              variant="subtle"
                              color="red"
                              radius="md"
                              aria-label="Удалить"
                              loading={deletingId === et.id}
                              onClick={() => handleDelete(et.id)}
                            >
                              🗑
                            </ActionIcon>
                          </Group>
                        </Group>
                      </Card>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </Stack>
          </Stack>

          {/* Upcoming bookings */}
          <Text fw={700} style={{ fontSize: 24, color: c.textPrimary, letterSpacing: '-0.5px' }}>
            Предстоящие встречи
          </Text>

          {bookings.length === 0 && (
            <Card padding="xl" radius="md" style={{ background: c.bgCardSolid, textAlign: 'center' }}>
              <Stack align="center" gap="sm">
                <Text style={{ fontSize: 40 }}>📭</Text>
                <Text fw={600} style={{ color: c.textPrimary }}>Нет предстоящих встреч</Text>
                <Text size="sm" style={{ color: c.textTertiary }}>Бронирования появятся здесь после того, как гости запишутся.</Text>
              </Stack>
            </Card>
          )}

          <Stack gap="sm">
            {bookings.map((booking) => {
              const et = getEventTypeName(booking.eventTypeId)
              return (
                <motion.div key={booking.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  <Card padding="lg" radius="md" style={{ background: c.bgCardSolid, border: `1px solid ${c.borderSubtle}` }}>
                    <Group justify="space-between" align="flex-start">
                      <Stack gap={4}>
                        <Group gap="xs" align="center">
                          <Avatar size={32} radius="xl" color={c.mantineColor}>{booking.guestName.charAt(0).toUpperCase()}</Avatar>
                          <Text fw={600} size="sm" style={{ color: c.textPrimary }}>{booking.guestName}</Text>
                        </Group>
                        <Text size="xs" style={{ color: c.textTertiary, paddingLeft: 40 }}>{booking.guestEmail}</Text>
                        {booking.notes && (
                          <Text size="xs" style={{ color: c.textSecondary, paddingLeft: 40, fontStyle: 'italic', maxWidth: 360 }}>«{booking.notes}»</Text>
                        )}
                      </Stack>
                      <Stack gap={6} align="flex-end">
                        <Text fw={600} size="sm" style={{ color: c.textPrimary, fontVariantNumeric: 'tabular-nums' }}>{formatDateTime(booking.startTime)}</Text>
                        <Text size="xs" style={{ color: c.textTertiary, fontVariantNumeric: 'tabular-nums' }}>{formatTime(booking.startTime)} – {formatTime(booking.endTime)}</Text>
                        {booking.isOngoing && (
                          <Badge
                            size="sm"
                            variant="filled"
                            color="green"
                            style={{
                              animation: 'pulse 1.5s ease-in-out infinite',
                            }}
                          >
                            ● Идёт сейчас
                          </Badge>
                        )}
                        {et && <Badge size="sm" variant="filled" color={c.mantineColor}>{et.name} · {et.durationMinutes} мин</Badge>}
                      </Stack>
                    </Group>
                  </Card>
                </motion.div>
              )
            })}
          </Stack>

        </Stack>
      </div>
    </motion.div>
  )
}
