import { Group, Text, Anchor, ActionIcon, SegmentedControl, Button } from '@mantine/core'
import { Link, useNavigate } from 'react-router-dom'
import { useMantineColorScheme } from '@mantine/core'
import { useDesignSystem } from '../../utils/designSystem'
import { useThemeColors } from '../../utils/useThemeColors'
import { useAuth } from '../../contexts/AuthContext'

function CalendarLogo() {
  const { isClassic } = useThemeColors()
  const today = new Date().getDate()
  const fill = isClassic ? '#FF6B35' : '#007AFF'
  const fillDark = isClassic ? '#E85A20' : '#0066D6'
  const fillDeep = isClassic ? '#C44A10' : '#0052AD'

  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="2" y="6" width="32" height="28" rx="6" fill={fill} />
      <rect x="2" y="6" width="32" height="10" rx="6" fill={fillDark} />
      <rect x="2" y="12" width="32" height="4" fill={fillDark} />
      <rect x="10" y="2" width="4" height="8" rx="2" fill={fillDeep} />
      <rect x="22" y="2" width="4" height="8" rx="2" fill={fillDeep} />
      <text x="18" y="30" textAnchor="middle" fontSize="14" fontWeight="700" fill="#FFFFFF"
        fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif">
        {today}
      </text>
    </svg>
  )
}

export function Navbar() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme()
  const { designSystem, setDesignSystem } = useDesignSystem()
  const c = useThemeColors()
  const isDark = colorScheme === 'dark'
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: isDark ? 'rgba(18,18,18,0.9)' : 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${c.borderSubtle}`,
        padding: '0 24px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Group justify="space-between" style={{ width: '100%', maxWidth: 1200, margin: '0 auto' }}>
        {/* Logo */}
        <Link to="/" style={{ textDecoration: 'none' }}>
          <Group gap="xs" align="center">
            <CalendarLogo />
            <Text fw={700} size="lg" style={{
              color: c.textPrimary,
              letterSpacing: '-0.5px',
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
            }}>
              Calendar
            </Text>
          </Group>
        </Link>

        {/* Right side */}
        <Group gap="md">
          <Anchor component={Link} to="/book" style={{ color: c.accent, fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>
            Записаться
          </Anchor>
          
          {user ? (
            <>
              <Anchor component={Link} to="/admin" style={{ color: c.textPrimary, fontWeight: 500, fontSize: 15, textDecoration: 'none' }}>
                Админка
              </Anchor>
              <Button 
                variant="subtle" 
                size="compact-sm"
                onClick={handleLogout}
                style={{ color: c.textSecondary }}
              >
                Выйти ({user.username})
              </Button>
            </>
          ) : (
            <Anchor component={Link} to="/login" style={{ color: c.textPrimary, fontWeight: 500, fontSize: 15, textDecoration: 'none' }}>
              Войти
            </Anchor>
          )}

          {/* Design system switcher */}
          <SegmentedControl
            size="xs"
            value={designSystem}
            onChange={(v) => setDesignSystem(v as 'classic' | 'liquid')}
            data={[
              { label: '🍊 Classic', value: 'classic' },
              { label: '💎 Liquid', value: 'liquid' },
            ]}
            styles={{
              root: {
                background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                border: 'none',
              },
              indicator: {
                background: c.accent,
              },
              label: {
                color: c.textPrimary,
                fontSize: 12,
                fontWeight: 500,
              },
            }}
          />

          {/* Light/dark toggle */}
          <ActionIcon
            variant="subtle"
            color="gray"
            size="md"
            radius="md"
            onClick={() => toggleColorScheme()}
            aria-label={isDark ? 'Светлая тема' : 'Тёмная тема'}
            title={isDark ? 'Светлая тема' : 'Тёмная тема'}
          >
            {isDark ? '☀️' : '🌙'}
          </ActionIcon>
        </Group>
      </Group>
    </header>
  )
}
