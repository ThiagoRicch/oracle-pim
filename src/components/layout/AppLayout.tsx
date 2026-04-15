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
  const [logoutMounted, setLogoutMounted] = useState(false)
  const [logoutVisible, setLogoutVisible] = useState(false)

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

  useEffect(() => {
    if (showLogoutConfirm) {
      setLogoutMounted(true)
      setLogoutVisible(false)
      const t = setTimeout(() => setLogoutVisible(true), 24)
      return () => clearTimeout(t)
    } else {
      setLogoutVisible(false)
      const t = setTimeout(() => setLogoutMounted(false), 420)
      return () => clearTimeout(t)
    }
  }, [showLogoutConfirm])

  useEffect(() => {
    if (!showLogoutConfirm) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowLogoutConfirm(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [showLogoutConfirm])

  function handleLogout() {
    setShowLogoutConfirm(true)
  }

  function confirmLogout() {
    clearAuthentication()
    navigate('/login')
  }

  function handleCloseLogout() {
    setShowLogoutConfirm(false)
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

      {logoutMounted && (
        <div
          className={[
            'fixed inset-0 z-50 flex items-center justify-center p-4',
            'transition-opacity duration-420 ease-[cubic-bezier(0.22,1,0.36,1)]',
            logoutVisible ? 'opacity-100' : 'opacity-0 pointer-events-none',
          ].join(' ')}
          role="dialog"
          aria-modal="true"
          aria-label="Confirmar logout"
        >
          <div
            className={[
              'absolute inset-0 bg-black/65 backdrop-blur-sm',
              'transition-opacity duration-420 ease-[cubic-bezier(0.22,1,0.36,1)]',
              logoutVisible ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
            onClick={handleCloseLogout}
            aria-hidden="true"
          />

          <div
            className={[
              'relative w-full max-w-md rounded-3xl border border-[--color-border] p-6 shadow-2xl',
              'transition-all duration-420 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform will-change-opacity',
              logoutVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95',
            ].join(' ')}
            style={{ backgroundColor: 'var(--color-sidebar-bg)' }}
          >
            <div className="mb-4 flex items-start justify-between border-b border-[--color-border] pb-3">
              <div>
                <h3 className="text-2xl font-bold text-[--color-text-primary]">Deseja sair da sessão?</h3>
                <p className="mt-1 text-xs text-[--color-text-secondary]">Você precisará fazer login novamente para acessar o sistema.</p>
              </div>
              <button
                type="button"
                onClick={handleCloseLogout}
                className="rounded-lg p-1 text-[--color-text-secondary] transition-colors hover:bg-[--color-sidebar-hover] hover:text-[--color-text-primary]"
                aria-label="Fechar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={handleCloseLogout}
                className="flex-1 rounded-full border border-[--color-text-secondary]/30 bg-[--color-text-secondary]/5 px-4 py-2.5 text-sm font-semibold text-[--color-text-secondary] transition-all duration-200 hover:bg-[--color-text-secondary]/10"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="flex-1 rounded-full border border-red-600/70 bg-red-600/12 px-4 py-2.5 text-sm font-semibold text-red-600 transition-all duration-200 hover:bg-red-600/20"
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
