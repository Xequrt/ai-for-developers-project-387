import { createTheme, CSSVariablesResolver, MantineColorsTuple } from '@mantine/core'

const blue: MantineColorsTuple = [
  '#e5f4ff',
  '#cce8ff',
  '#99d1ff',
  '#66baff',
  '#33a3ff',
  '#1a96ff',
  '#007AFF', // 6 — primary light
  '#0A84FF', // 7 — primary dark
  '#0066d6',
  '#0052ad',
]

const orange: MantineColorsTuple = [
  '#fff3ee',
  '#ffe4d6',
  '#ffc5a8',
  '#ffa476',
  '#ff874b',
  '#ff7530',
  '#FF6B35', // 6
  '#e55a25',
  '#cc4d1a',
  '#b3400e',
]

export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: {},
  dark: {},
})

export const businessAppleTheme = createTheme({
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
  primaryColor: 'blue',
  colors: { blue, orange },
  defaultRadius: 'md',
  radius: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
  },
  shadows: {
    xs: '0 1px 3px rgba(0,0,0,0.06)',
    sm: '0 2px 8px rgba(0,0,0,0.08)',
    md: '0 4px 16px rgba(0,0,0,0.10)',
    lg: '0 8px 32px rgba(0,0,0,0.12)',
    xl: '0 16px 48px rgba(0,0,0,0.16)',
  },
  components: {
    Button: { defaultProps: { radius: 'md' } },
    Card: { defaultProps: { radius: 'md', shadow: 'sm' } },
    Badge: { defaultProps: { radius: 'sm' } },
  },
})
