import { useEffect, useState } from 'react'
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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

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
    setShowLogoutConfirm(true)
  }

  function confirmLogout() {
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

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Confirmar logout">
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={() => setShowLogoutConfirm(false)} aria-hidden="true" />

          <div className="relative w-full max-w-sm rounded-2xl border border-[--color-border] bg-[--color-sidebar-bg] p-5 shadow-2xl">
            <h3 className="text-base font-semibold text-[--color-text-primary]">Deseja sair da sessão?</h3>
            <p className="mt-2 text-sm text-[--color-text-secondary]">Você precisará fazer login novamente para acessar o sistema.</p>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 rounded-xl border border-[--color-border] bg-[--color-main-bg] py-2 text-sm font-medium text-[--color-text-secondary] transition-colors hover:text-[--color-text-primary]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="flex-1 rounded-xl bg-[--color-accent] py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
