import { useEffect, useState } from 'react'
import { Card, Loader, Stack, Text } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { motion } from 'motion/react'
import { useNavigate, useParams } from 'react-router-dom'
import { getAvailableSlots, getAvailableSlotsSummary, getEventTypes, getOwnerProfile } from '../api/client'
import { CalendarGrid } from '../components/calendar/CalendarGrid'
import { SlotPanel } from '../components/calendar/SlotPanel'
import { EventDetails } from '../components/booking/EventDetails'
import type { DayAvailability, EventType, Owner, TimeSlot } from '../types'
import { useThemeColors } from '../utils/useThemeColors'

const pageVariants = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
}
const pageTransition = { duration: 0.3, ease: 'easeInOut' as const }

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function BookingPage() {
  const { eventTypeId } = useParams<{ eventTypeId: string }>()
  const navigate = useNavigate()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1024px)')
  const c = useThemeColors()

  const [eventType, setEventType] = useState<EventType | null>(null)
  const [owner, setOwner] = useState<Owner | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth)
  const [availability, setAvailability] = useState<DayAvailability[]>([])
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)

  useEffect(() => {
    if (!eventTypeId) return
    Promise.all([getEventTypes(), getOwnerProfile().catch(() => null)]).then(([types, ownerData]) => {
      setEventType(types.find((t) => t.id === eventTypeId) ?? null)
      setOwner(ownerData)
      setLoading(false)
    })
  }, [eventTypeId])

  useEffect(() => {
    if (!eventTypeId || !eventType) return
    setAvailabilityLoading(true)
    getAvailableSlotsSummary(eventTypeId, currentMonth, eventType.durationMinutes).then((data) => {
      setAvailability(data)
      setAvailabilityLoading(false)
    })
  }, [eventTypeId, currentMonth, eventType])

  useEffect(() => {
    if (!eventTypeId || !selectedDate || !eventType) return
    setSlotsLoading(true)
    setSelectedSlot(null)
    getAvailableSlots(eventTypeId, selectedDate, eventType.durationMinutes).then((data) => {
      setSlots(data)
      setSlotsLoading(false)
    })
  }, [eventTypeId, selectedDate, eventType])

  const handleDateSelect = (date: string) => { setSelectedDate(date); setSelectedSlot(null) }
  const handleMonthChange = (month: string) => { setCurrentMonth(month); setSelectedDate(null); setSelectedSlot(null); setSlots([]) }

  const glassCard = {
    background: c.glassBackground,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: c.glassBorder,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  }

  if (loading) {
    return (
      <div style={{ minHeight: 'calc(100vh - 56px)', background: c.bgPage, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader color="blue" size="lg" />
      </div>
    )
  }

  if (!eventType) {
    return (
      <div style={{ minHeight: 'calc(100vh - 56px)', background: c.bgPage, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: c.textTertiary }}>Тип события не найден.</Text>
      </div>
    )
  }

  const slotPanelEl = (
    <div style={{
      ...glassCard,
      borderRadius: 12,
      height: isMobile ? 'auto' : 560,
      minHeight: isMobile ? 300 : undefined,
      display: 'flex',
      flexDirection: 'column',
      padding: 16,
    }}>
      <SlotPanel
        slots={slots}
        selectedSlot={selectedSlot}
        loading={slotsLoading}
        selectedDate={selectedDate}
        onSlotSelect={setSelectedSlot}
        onBack={() => navigate('/book')}
        onContinue={() => {
          if (selectedSlot && eventType) navigate('/confirm', { state: { eventType, slot: selectedSlot } })
        }}
      />
    </div>
  )

  const calendarEl = (
    <Card padding="lg" radius="md" style={{ ...glassCard, opacity: availabilityLoading ? 0.7 : 1, transition: 'opacity 0.2s' }}>
      <CalendarGrid
        currentMonth={currentMonth}
        selectedDate={selectedDate}
        availability={availability}
        onMonthChange={handleMonthChange}
        onDateSelect={handleDateSelect}
      />
    </Card>
  )

  const eventDetailsEl = (
    <EventDetails eventType={eventType} owner={owner} selectedDate={selectedDate} selectedSlot={selectedSlot} />
  )

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      style={{ minHeight: 'calc(100vh - 56px)', background: c.bgPage, padding: isMobile ? '16px' : '32px 24px' }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Stack gap="lg">
          <Text fw={700} style={{ fontSize: isMobile ? 20 : 24, color: c.textPrimary, letterSpacing: '-0.5px' }}>
            {eventType.name}
          </Text>

          {isMobile && (
            <Stack gap="md">{calendarEl}{slotPanelEl}</Stack>
          )}

          {isTablet && !isMobile && (
            <Stack gap="md">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {calendarEl}{slotPanelEl}
              </div>
              {eventDetailsEl}
            </Stack>
          )}

          {!isMobile && !isTablet && (
            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 280px', gap: 20, alignItems: 'start' }}>
              {eventDetailsEl}{calendarEl}{slotPanelEl}
            </div>
          )}
        </Stack>
      </div>
    </motion.div>
  )
}
