import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { HomePage } from '../pages/HomePage'
import { CreateServerPage } from '../pages/CreateServerPage'
import { MapPage } from '../pages/MapPage'
import { DashboardPage } from '../pages/DashboardPage'
import { AboutPage } from '../pages/AboutPage'
import { LoginPage } from '../pages/LoginPage'
import { DisabledServersPage } from '../pages/DisabledServersPage'
import { ClimatePage } from '../pages/ClimatePage'
import { isAuthenticated } from '../utils/auth'

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <HomePage /> },
      { path: 'criar-servidor', element: <CreateServerPage /> },
      { path: 'mapa', element: <MapPage /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'clima', element: <ClimatePage /> },
      { path: 'servidores-desativados', element: <DisabledServersPage /> },
      { path: 'sobre', element: <AboutPage /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
