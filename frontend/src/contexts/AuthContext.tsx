/**
 * Контекст аутентификации — управление состоянием пользователя.
 * Токен хранится в httpOnly cookie (устанавливается сервером),
 * фронтенд работает только с данными пользователя.
 */
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { User, LoginRequest, RegisterRequest } from '../types'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (data: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const API_BASE = '/api/v1/auth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // При загрузке проверяем сессию через /me (cookie отправляется автоматически)
  useEffect(() => {
    fetchUser().finally(() => setIsLoading(false))
  }, [])

  async function fetchUser(): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/me`, {
        credentials: 'include', // отправляем httpOnly cookie
      })
      if (response.ok) {
        setUser(await response.json())
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    }
  }

  async function login(data: LoginRequest): Promise<void> {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // получаем cookie от сервера
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Ошибка входа' }))
      throw new Error(error.detail || 'Ошибка входа')
    }

    const userData: User = await response.json()
    setUser(userData)
  }

  async function register(data: RegisterRequest): Promise<void> {
    const response = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Ошибка регистрации' }))
      throw new Error(error.detail || 'Ошибка регистрации')
    }

    // После регистрации сразу входим
    await login({ username: data.username, password: data.password })
  }

  async function logout(): Promise<void> {
    await fetch(`${API_BASE}/logout`, {
      method: 'POST',
      credentials: 'include',
    })
    setUser(null)
  }

  async function refreshUser(): Promise<void> {
    await fetchUser()
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
