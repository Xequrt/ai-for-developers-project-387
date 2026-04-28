/**
 * Страница регистрации — создание нового аккаунта.
 */
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
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

export function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const c = useThemeColors()

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают')
      return
    }

    if (formData.password.length < 8) {
      setError('Пароль должен быть не менее 8 символов')
      return
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      setError('Пароль должен содержать строчную букву, заглавную букву и цифру')
      return
    }

    setIsLoading(true)

    try {
      await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        name: formData.name,
      })
      navigate('/admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка регистрации')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
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
              Создание аккаунта
            </Title>

            {error && (
              <Alert title="Ошибка" color="red" variant="light">
                {error}
              </Alert>
            )}

            <TextInput
              label="Имя пользователя"
              placeholder="johnsmith"
              value={formData.username}
              onChange={(e) => handleChange('username', e.target.value)}
              required
              disabled={isLoading}
              description="Используется в URL вашего календаря"
            />

            <TextInput
              label="Отображаемое имя"
              placeholder="Иван Смит"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
              disabled={isLoading}
            />

            <TextInput
              label="Email"
              placeholder="user@example.com"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              required
              disabled={isLoading}
            />

            <PasswordInput
              label="Пароль"
              placeholder="Минимум 8 символов"
              description="Минимум 8 символов, строчная и заглавная буква, цифра"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              required
              disabled={isLoading}
            />

            <PasswordInput
              label="Подтвердите пароль"
              placeholder="Повторите пароль"
              value={formData.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              required
              disabled={isLoading}
            />

            <Button
              type="submit"
              fullWidth
              size="md"
              loading={isLoading}
              disabled={
                !formData.username ||
                !formData.email ||
                !formData.password ||
                !formData.confirmPassword ||
                !formData.name
              }
              style={{
                background: c.accent,
              }}
            >
              Зарегистрироваться
            </Button>

            <Text ta="center" size="sm" c={c.textSecondary}>
              Уже есть аккаунт?{' '}
              <Anchor component={Link} to="/login" c={c.accent}>
                Войти
              </Anchor>
            </Text>
          </Stack>
        </form>
      </Paper>
    </Container>
  )
}
