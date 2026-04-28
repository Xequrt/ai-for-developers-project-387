/**
 * Компонент защищенного маршрута — перенаправляет на страницу входа 
 * если пользователь не авторизован.
 */
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Loader } from '@mantine/core'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  // Показываем загрузчик пока проверяем токен
  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Loader size="xl" />
      </div>
    )
  }

  // Если не авторизован — перенаправляем на вход
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Если авторизован — показываем содержимое
  return <>{children}</>
}
