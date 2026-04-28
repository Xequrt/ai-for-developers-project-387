import { useMantineColorScheme } from '@mantine/core'
import { useDesignSystem } from './designSystem'

/**
 * Returns semantic color tokens based on current design system and color scheme.
 *
 * classic — original orange/warm design
 * liquid  — Apple Blue / Liquid Glass design
 */
export function useThemeColors() {
  const { colorScheme } = useMantineColorScheme()
  const { designSystem } = useDesignSystem()
  const isDark = colorScheme === 'dark'
  const isClassic = designSystem === 'classic'

  // ─── Accent ───────────────────────────────────────────────────────────────
  const accent = isClassic ? '#FF6B35' : (isDark ? '#0A84FF' : '#007AFF')
  const accentHover = isClassic ? '#E85A20' : (isDark ? '#0A84FF' : '#0066D6')

  // ─── Backgrounds ──────────────────────────────────────────────────────────
  // Classic dark: warm dark brown tones instead of cold black
  const bgPage = isDark
    ? (isClassic ? '#1E1610' : '#121212')
    : '#F5F5F7'

  const bgCardSolid = isDark
    ? (isClassic ? '#2A1E12' : '#1C1C1E')
    : '#FFFFFF'

  const bgSecondary = isDark
    ? (isClassic ? '#332518' : '#2C2C2E')
    : '#F2F2F7'

  // ─── Text ─────────────────────────────────────────────────────────────────
  const textPrimary = isDark ? '#F5F5F7' : '#1C1C1E'
  const textSecondary = isDark ? 'rgba(235,235,245,0.6)' : '#6C6C70'
  const textTertiary = isDark ? 'rgba(235,235,245,0.4)' : '#8E8E93'
  const textDisabled = isDark ? 'rgba(235,235,245,0.3)' : '#C7C7CC'

  // ─── Borders ──────────────────────────────────────────────────────────────
  const borderSubtle = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'

  // ─── Glass / Card surfaces ────────────────────────────────────────────────
  // Classic: solid white/dark cards, no blur
  // Liquid: translucent glass with backdrop-filter
  const glassBackground = isClassic
    ? (isDark ? '#2A1E12' : '#FFFFFF')
    : (isDark
      ? 'linear-gradient(135deg, rgba(44,44,46,0.8) 0%, rgba(28,28,30,0.6) 100%)'
      : 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.6) 100%)')

  const glassBorder = isClassic
    ? `1px solid ${borderSubtle}`
    : (isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.18)')

  const glassBackdropFilter = isClassic ? 'none' : 'blur(20px)'

  // ─── Landing gradient ─────────────────────────────────────────────────────
  const landingGradient = isClassic
    ? (isDark
      ? 'linear-gradient(135deg, #2A1A0A 0%, #1E1208 100%)'
      : 'linear-gradient(135deg, #E8F0FF 0%, #FFE8E0 100%)')
    : (isDark
      ? 'linear-gradient(135deg, #0D1B2A 0%, #0A1628 50%, #0D0D1F 100%)'
      : 'linear-gradient(135deg, #E8F0FF 0%, #EEF4FF 50%, #F0EEFF 100%)')

  // ─── Calendar ─────────────────────────────────────────────────────────────
  const calendarAvailable = isClassic
    ? (isDark ? '#2A1508' : '#FFF3EE')
    : (isDark ? '#0A2540' : '#E5F4FF')

  const calendarOccupied = isDark ? '#2C2C2E' : '#F2F2F7'

  const calendarSelected = isClassic ? '#FF6B35' : '#007AFF'
  const calendarSelectedShadow = isClassic
    ? 'rgba(255,107,53,0.3)'
    : 'rgba(0,122,255,0.3)'

  const calendarTodayBorder = isClassic ? '#FF6B35' : '#007AFF'

  // ─── Slot panel ───────────────────────────────────────────────────────────
  const slotSelectedBorder = isClassic ? '#FF6B35' : '#007AFF'
  const slotSelectedBg = isClassic ? 'rgba(255,107,53,0.08)' : 'rgba(0,122,255,0.08)'
  const slotAvailableCountColor = isClassic ? '#FF6B35' : '#007AFF'

  // ─── Event details chips ──────────────────────────────────────────────────
  const chipBg = isClassic ? 'rgba(255,107,53,0.08)' : 'rgba(0,122,255,0.08)'
  const chipBorder = isClassic ? '1px solid rgba(255,107,53,0.2)' : '1px solid rgba(0,122,255,0.2)'

  // ─── Edit form bg ─────────────────────────────────────────────────────────
  const editFormBg = isClassic
    ? (isDark ? '#2A1E12' : '#FFF9F5')
    : (isDark ? '#0A1628' : '#F0F7FF')

  const editFormBorder = isClassic
    ? 'rgba(255,107,53,0.25)'
    : 'rgba(0,122,255,0.25)'

  // ─── Mantine color name ───────────────────────────────────────────────────
  const mantineColor = isClassic ? 'orange' : 'blue'

  return {
    isDark,
    isClassic,
    designSystem,

    accent,
    accentHover,
    mantineColor,

    bgPage,
    bgCard: isDark
      ? (isClassic ? 'rgba(42,30,18,0.9)' : 'rgba(28,28,30,0.85)')
      : 'rgba(255,255,255,0.85)',
    bgCardSolid,
    bgSecondary,

    textPrimary,
    textSecondary,
    textTertiary,
    textDisabled,

    borderSubtle,

    glassBackground,
    glassBorder,
    glassBackdropFilter,

    landingGradient,

    calendarAvailable,
    calendarOccupied,
    calendarSelected,
    calendarSelectedShadow,
    calendarTodayBorder,

    slotSelectedBorder,
    slotSelectedBg,
    slotAvailableCountColor,

    chipBg,
    chipBorder,

    editFormBg,
    editFormBorder,
  }
}
