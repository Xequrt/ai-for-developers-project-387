/**
 * Страница входа — авторизация пользователя.
 */
import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import {
  Container,
  Paper,
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Alert,
  Stack,
  Anchor,
} from '@mantine/core'

import { useAuth } from '../contexts/AuthContext'
import { useThemeColors } from '../utils/useThemeColors'

interface LocationState {
  from?: { pathname: string }
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const c = useThemeColors()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Получаем страницу для редиректа после входа
  const state = location.state as LocationState
  const from = state?.from?.pathname || '/admin'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await login({ username, password })
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Container size="xs" py="xl">
      <Paper
        p="xl"
        shadow="sm"
        radius="md"
        style={{
          background: c.bgCard,
          border: `1px solid ${c.borderSubtle}`,
        }}
      >
        <form onSubmit={handleSubmit}>
          <Stack gap="lg">
            <Title order={2} ta="center" c={c.textPrimary}>
              Вход в систему
            </Title>

            {error && (
              <Alert title="Ошибка" color="red" variant="light">
                {error}
              </Alert>
            )}

            <TextInput
              label="Имя пользователя или email"
              placeholder="owner"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isLoading}
            />

            <PasswordInput
              label="Пароль"
              placeholder="Введите пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />

            <Button
              type="submit"
              fullWidth
              size="md"
              loading={isLoading}
              disabled={!username || !password}
              style={{
                background: c.accent,
              }}
            >
              Войти
            </Button>

            <Text ta="center" size="sm" c={c.textSecondary}>
              Нет аккаунта?{' '}
              <Anchor component={Link} to="/register" c={c.accent}>
                Зарегистрироваться
              </Anchor>
            </Text>
          </Stack>
        </form>
      </Paper>
    </Container>
  )
}
