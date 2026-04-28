import { Badge, Button, Card, Group, Stack, Text, ThemeIcon } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { useThemeColors } from '../utils/useThemeColors'

const pageVariants = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
}
const pageTransition = { duration: 0.3, ease: 'easeInOut' as const }

const features = [
  { icon: '🤝', title: 'Встречи', desc: 'Выберите удобный формат и запишитесь на встречу.' },
  { icon: '⚡', title: 'Мгновенное бронирование', desc: 'Найдите свободный слот и подтвердите запись за несколько секунд.' },
  { icon: '📋', title: 'Без регистрации', desc: 'Просто выберите время и оставьте контакт — никаких аккаунтов.' },
]

function HeroCalendarIcon() {
  const today = new Date().getDate()
  const month = new Date().toLocaleString('ru-RU', { month: 'short' }).replace('.', '')
  const { isClassic } = useThemeColors()
  const fill = isClassic ? '#FF6B35' : '#007AFF'
  const fillDark = isClassic ? '#E85A20' : '#0066D6'
  const fillDeep = isClassic ? '#C44A10' : '#0052AD'

  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="6" y="18" width="108" height="96" rx="18" fill={fill} />
      <rect x="6" y="18" width="108" height="34" rx="18" fill={fillDark} />
      <rect x="6" y="38" width="108" height="14" fill={fillDark} />
      <rect x="32" y="6" width="14" height="26" rx="7" fill={fillDeep} />
      <rect x="74" y="6" width="14" height="26" rx="7" fill={fillDeep} />
      <text x="60" y="44" textAnchor="middle" fontSize="13" fontWeight="600" fill="rgba(255,255,255,0.75)"
        fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif">
        {month.toUpperCase()}
      </text>
      <text x="60" y="98" textAnchor="middle" fontSize="52" fontWeight="700" fill="#FFFFFF"
        fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif">
        {today}
      </text>
    </svg>
  )
}

export function LandingPage() {
  const navigate = useNavigate()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const c = useThemeColors()

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      style={{
        minHeight: 'calc(100vh - 56px)',
        background: c.landingGradient,
        display: 'flex',
        alignItems: 'center',
        padding: isMobile ? '32px 16px' : '48px 24px',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: isMobile ? 32 : 48,
          alignItems: 'center',
        }}>
          {/* Left — Hero */}
          <Stack gap="xl">
            <Badge size="sm" variant="filled" color={c.mantineColor} style={{ alignSelf: 'flex-start', letterSpacing: '0.08em', fontWeight: 700, fontSize: 11 }}>
              БЫСТРАЯ ЗАПИСЬ НА ВСТРЕЧУ
            </Badge>
            <Stack gap="md">
              <Group gap="lg" align="center">
                <HeroCalendarIcon />
                <Text style={{
                  fontSize: isMobile ? 44 : 64,
                  fontWeight: 700,
                  lineHeight: 1.05,
                  letterSpacing: '-2px',
                  color: c.textPrimary,
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                }}>
                  Calendar
                </Text>
              </Group>
              <Text size="xl" style={{ color: c.textSecondary, lineHeight: 1.5, maxWidth: 420 }}>
                Запишитесь на встречу в удобное время. Выберите формат, найдите свободный слот и подтвердите бронирование за несколько секунд.
              </Text>
            </Stack>
            <Button size="lg" color={c.mantineColor} onClick={() => navigate('/book')} style={{ alignSelf: 'flex-start', fontWeight: 600 }} rightSection={<span>→</span>}>
              Записаться
            </Button>
          </Stack>

          {/* Right — Features card */}
          <Card padding="xl" radius="lg" style={{
            background: c.glassBackground,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: c.glassBorder,
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          }}>
            <Stack gap="lg">
              <Text fw={700} size="xl" style={{ color: c.textPrimary, letterSpacing: '-0.3px' }}>
                Как это работает
              </Text>
              {features.map((f) => (
                <Group key={f.title} gap="md" align="flex-start">
                  <ThemeIcon size={40} radius="md" variant="light" color={c.mantineColor} style={{ flexShrink: 0 }}>
                    <span style={{ fontSize: 18 }}>{f.icon}</span>
                  </ThemeIcon>
                  <Stack gap={2}>
                    <Text fw={600} size="sm" style={{ color: c.textPrimary }}>{f.title}</Text>
                    <Text size="sm" style={{ color: c.textSecondary }}>{f.desc}</Text>
                  </Stack>
                </Group>
              ))}
            </Stack>
          </Card>
        </div>
      </div>
    </motion.div>
  )
}
