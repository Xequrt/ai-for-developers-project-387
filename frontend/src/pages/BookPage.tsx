import { useEffect, useState } from 'react'
import { Avatar, Badge, Button, Card, Group, Loader, SimpleGrid, Stack, Text } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { motion, useReducedMotion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { getEventTypes, getOwnerProfile } from '../api/client'
import type { EventType, Owner } from '../types'
import { useThemeColors } from '../utils/useThemeColors'
import { getHoverProps } from '../utils/animationProps'

const pageVariants = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
}
const pageTransition = { duration: 0.3, ease: 'easeInOut' as const }

export function BookPage() {
  const navigate = useNavigate()
  const [eventTypes, setEventTypes] = useState<EventType[]>([])
  const [owner, setOwner] = useState<Owner | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const isMobile = useMediaQuery('(max-width: 767px)')
  const prefersReducedMotion = useReducedMotion()
  const cardHover = getHoverProps('event-card')
  const c = useThemeColors()

  const glassCard = {
    background: c.glassBackground,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: c.glassBorder,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  }

  const fetchData = () => {
    setLoading(true)
    setError(false)
    Promise.all([
      getEventTypes(),
      getOwnerProfile().catch(() => null),
    ])
      .then(([types, ownerData]) => { setEventTypes(types); setOwner(ownerData); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }

  useEffect(() => { fetchData() }, [])

  if (loading) {
    return (
      <div style={{ minHeight: 'calc(100vh - 56px)', background: c.bgPage, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader color={c.mantineColor} size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: 'calc(100vh - 56px)', background: c.bgPage, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack align="center" gap="md">
          <Text style={{ color: '#FF3B30' }}>Не удалось загрузить типы событий</Text>
          <Button color={c.mantineColor} onClick={fetchData}>Повторить</Button>
        </Stack>
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
      style={{ minHeight: 'calc(100vh - 56px)', background: c.bgPage, padding: isMobile ? '24px 16px' : '40px 24px' }}
    >
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <Stack gap="xl">
          {owner && (
            <Card padding="lg" radius="md" style={glassCard}>
              <Group gap="md">
                <Avatar size={56} radius="xl" color={c.mantineColor} style={{ fontWeight: 700, fontSize: 22 }}>
                  {owner.name.charAt(0).toUpperCase()}
                </Avatar>
                <Stack gap={2}>
                  <Text fw={700} size="lg" style={{ color: c.textPrimary }}>{owner.name}</Text>
                  <Text size="sm" style={{ color: c.textSecondary }}>Host</Text>
                </Stack>
              </Group>
            </Card>
          )}

          <Stack gap="xs">
            <Text fw={700} style={{ fontSize: isMobile ? 22 : 28, color: c.textPrimary, letterSpacing: '-0.5px' }}>
              Выберите тип события
            </Text>
            <Text size="sm" style={{ color: c.textSecondary }}>
              Нажмите на карточку, чтобы открыть календарь и выбрать удобный слот.
            </Text>
          </Stack>

          <SimpleGrid cols={isMobile ? 1 : 2} spacing="md">
            {eventTypes.map((et) => (
              <motion.div
                key={et.id}
                whileHover={prefersReducedMotion ? {} : cardHover}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/book/${et.id}`)}
              >
                <Card padding="lg" radius="md" style={{ ...glassCard, height: '100%' }}>
                  <Stack gap="sm">
                    <Group justify="space-between" align="flex-start">
                      <Text fw={600} size="md" style={{ color: c.textPrimary, flex: 1, paddingRight: 8 }}>
                        {et.name}
                      </Text>
                      <Badge size="sm" variant="filled" color={c.mantineColor} style={{ flexShrink: 0 }}>
                        {et.durationMinutes} мин
                      </Badge>
                    </Group>
                    <Text size="sm" style={{ color: c.textSecondary, lineHeight: 1.5 }}>
                      {et.description}
                    </Text>
                  </Stack>
                </Card>
              </motion.div>
            ))}
          </SimpleGrid>
        </Stack>
      </div>
    </motion.div>
  )
}
