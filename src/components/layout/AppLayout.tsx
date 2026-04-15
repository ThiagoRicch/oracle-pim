import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar } from '../sidebar/Sidebar'
import { MainContent } from './MainContent'
import { useSidebar } from '../../hooks/useSidebar'
import { useTheme } from '../../hooks/useTheme'
import { clearAuthentication, getAuthExpiryMs, isAuthenticated } from '../../utils/auth'

export function AppLayout() {
  const { isOpen, toggle } = useSidebar()
  const { theme, toggle: toggleTheme } = useTheme()
  const navigate = useNavigate()

  useEffect(() => {
    function validateSession() {
      if (!isAuthenticated()) {
        navigate('/login', { replace: true })
      }
    }

    validateSession()
    const interval = window.setInterval(validateSession, 30000)

    const expiry = getAuthExpiryMs()
    const timeout =
      expiry && expiry > Date.now()
        ? window.setTimeout(validateSession, expiry - Date.now() + 200)
        : undefined

    return () => {
      window.clearInterval(interval)
      if (timeout) window.clearTimeout(timeout)
    }
  }, [navigate])

  function handleLogout() {
    clearAuthentication()
    navigate('/login')
  }

  return (
    <div className="flex h-svh w-screen overflow-hidden bg-[--color-main-bg]">
      <Sidebar
        isOpen={isOpen}
        theme={theme}
        onToggle={toggle}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
      />
      <MainContent>
        <Outlet />
      </MainContent>
    </div>
  )
}
