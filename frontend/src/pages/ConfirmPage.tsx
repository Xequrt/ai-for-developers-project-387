import { useState } from 'react'
import { Button, Card, Divider, Group, Loader, Stack, Text, TextInput, Textarea } from '@mantine/core'
import { motion } from 'motion/react'
import { useLocation, useNavigate } from 'react-router-dom'
import { createBooking } from '../api/client'
import type { EventType, TimeSlot } from '../types'
import { useThemeColors } from '../utils/useThemeColors'
import { validateForm } from '../utils/animationProps'

interface LocationState { eventType: EventType; slot: TimeSlot }

const pageVariants = { initial: { opacity: 0, x: 50 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -50 } }
const pageTransition = { duration: 0.3, ease: 'easeInOut' as const }

function formatSlot(slot: TimeSlot): string {
  const fmt = (iso: string) => new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  const date = new Date(slot.startTime).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })
  return `${date}, ${fmt(slot.startTime)} – ${fmt(slot.endTime)}`
}

export function ConfirmPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LocationState | null
  const c = useThemeColors()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [nameError, setNameError] = useState<string | undefined>()
  const [emailError, setEmailError] = useState<string | undefined>()

  const glassCard = {
    background: c.glassBackground,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: c.glassBorder,
  }

  if (!state?.eventType || !state?.slot) {
    return (
      <div style={{ minHeight: 'calc(100vh - 56px)', background: c.bgPage, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack align="center" gap="md">
          <Text style={{ color: c.textTertiary }}>Слот не выбран.</Text>
          <Button color={c.mantineColor} onClick={() => navigate('/book')}>Выбрать событие</Button>
        </Stack>
      </div>
    )
  }

  const { eventType, slot } = state

  if (success) {
    return (
      <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}
        style={{ minHeight: 'calc(100vh - 56px)', background: c.bgPage, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}
      >
        <Card padding="xl" radius="lg" style={{ maxWidth: 480, width: '100%', textAlign: 'center', ...glassCard, boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }}>
          <Stack gap="lg" align="center">
            <Text style={{ fontSize: 48 }}>✅</Text>
            <Text fw={700} style={{ fontSize: 22, color: c.textPrimary }}>Бронирование подтверждено</Text>
            <Text size="sm" style={{ color: c.textSecondary }}>{formatSlot(slot)}</Text>
            <Text size="sm" style={{ color: c.textSecondary }}>{eventType.name} · {eventType.durationMinutes} мин</Text>
            <Button color={c.mantineColor} onClick={() => navigate('/')}>На главную</Button>
          </Stack>
        </Card>
      </motion.div>
    )
  }

  const handleSubmit = async () => {
    const validation = validateForm({ name, email })
    setNameError(validation.nameError)
    setEmailError(validation.emailError)
    if (validation.nameError || validation.emailError) return
    setServerError(null)
    setLoading(true)
    try {
      await createBooking({ eventTypeId: eventType.id, startTime: slot.startTime, guestName: name.trim(), guestEmail: email.trim(), notes: notes.trim() || undefined })
      setSuccess(true)
    } catch (e: unknown) {
      setServerError(e instanceof Error ? e.message : 'Ошибка при бронировании')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}
      style={{ minHeight: 'calc(100vh - 56px)', background: c.bgPage, padding: '40px 24px' }}
    >
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <Stack gap="lg">
          <Text fw={700} style={{ fontSize: 24, color: c.textPrimary, letterSpacing: '-0.5px' }}>
            Подтверждение бронирования
          </Text>

          <Card padding="lg" radius="md" style={{ ...glassCard, boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }}>
            <Stack gap="xs">
              <Text fw={600} size="sm" style={{ color: c.textPrimary }}>{eventType.name}</Text>
              <Text size="sm" style={{ color: c.textSecondary }}>{formatSlot(slot)}</Text>
              <Text size="xs" style={{ color: c.accent }}>{eventType.durationMinutes} мин</Text>
            </Stack>
          </Card>

          <Divider />

          <Card padding="lg" radius="md" style={{ ...glassCard, boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }}>
            <Stack gap="md">
              <TextInput
                label="Имя" placeholder="Иван Иванов" value={name}
                onChange={(e) => { setName(e.currentTarget.value); setNameError(undefined) }}
                required radius="md" error={nameError}
                aria-invalid={!!nameError} aria-describedby={nameError ? 'name-error' : undefined} aria-required="true"
              />
              {nameError && <Text id="name-error" size="sm" style={{ color: '#FF3B30', marginTop: -8 }}>{nameError}</Text>}
              <TextInput
                label="Email" placeholder="ivan@example.com" value={email}
                onChange={(e) => { setEmail(e.currentTarget.value); setEmailError(undefined) }}
                required radius="md" error={emailError}
                aria-invalid={!!emailError} aria-describedby={emailError ? 'email-error' : undefined} aria-required="true"
              />
              {emailError && <Text id="email-error" size="sm" style={{ color: '#FF3B30', marginTop: -8 }}>{emailError}</Text>}
              <Textarea label="Заметки (необязательно)" placeholder="Тема встречи, вопросы..." value={notes}
                onChange={(e) => setNotes(e.currentTarget.value)} radius="md" rows={3} />
              {serverError && <Text size="sm" style={{ color: '#FF3B30' }}>{serverError}</Text>}
            </Stack>
          </Card>

          <Group gap="sm">
            <Button variant="default" radius="md" style={{ flex: 1 }} onClick={() => navigate(-1)} disabled={loading}>Назад</Button>
            <Button color={c.mantineColor} radius="md" style={{ flex: 1 }} onClick={handleSubmit} disabled={loading}>
              {loading ? <Loader size="xs" color="white" /> : 'Забронировать'}
            </Button>
          </Group>
        </Stack>
      </div>
    </motion.div>
  )
}
