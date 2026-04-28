import { MantineProvider } from '@mantine/core'
import '@mantine/core/styles.css'
import { AnimatePresence } from 'motion/react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { AdminPage } from './pages/AdminPage'
import { Navbar } from './components/layout/Navbar'
import { BookPage } from './pages/BookPage'
import { BookingPage } from './pages/BookingPage'
import { ConfirmPage } from './pages/ConfirmPage'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { businessAppleTheme } from './theme'
import { DesignSystemProvider } from './utils/designSystem'
import { useThemeColors } from './utils/useThemeColors'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/auth/ProtectedRoute'

export function App() {
  return (
    <DesignSystemProvider>
      <MantineProvider theme={businessAppleTheme} defaultColorScheme="light">
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </MantineProvider>
    </DesignSystemProvider>
  )
}

function AppShell() {
  const location = useLocation()
  const c = useThemeColors()

  return (
    <div style={{ minHeight: '100vh', background: c.bgPage }}>
      <Navbar />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Публичные маршруты */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/book" element={<BookPage />} />
          <Route path="/book/:eventTypeId" element={<BookingPage />} />
          <Route path="/confirm" element={<ConfirmPage />} />
          
          {/* Маршруты аутентификации */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Защищенные маршруты (требуют авторизации) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AnimatePresence>
    </div>
  )
}
