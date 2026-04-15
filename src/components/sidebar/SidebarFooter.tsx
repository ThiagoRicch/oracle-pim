import { IconLogout, IconSun, IconMoon } from '../icons'
import type { Theme } from '../../hooks/useTheme'

interface SidebarFooterProps {
  isCollapsed: boolean
  theme: Theme
  onToggleTheme: () => void
  onLogout: () => void
}

export function SidebarFooter({ isCollapsed, theme, onToggleTheme, onLogout }: SidebarFooterProps) {
  const isDark = theme === 'dark'

  const btnBase = [
    'group relative flex w-full items-center rounded-xl',
    'text-base font-medium transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent]',
    isCollapsed ? 'justify-center px-0 py-3.5' : 'gap-4 px-4 py-3.5',
  ].join(' ')

  return (
    <div className="shrink-0 border-t border-[--color-border] px-2 py-3 flex flex-col gap-1">
      {/* Theme toggle */}
      <button
        onClick={onToggleTheme}
        title={isCollapsed ? (isDark ? 'Tema claro' : 'Tema escuro') : undefined}
        className={`${btnBase} text-[--color-text-secondary] hover:bg-[--color-sidebar-hover] hover:text-[--color-text-primary]`}
      >
        <span
          className={[
            'shrink-0 transition-transform duration-200 ease-out',
            'group-hover:-translate-y-0.5 group-hover:scale-110',
            'group-active:translate-y-0 group-active:scale-95',
          ].join(' ')}
        >
          {isDark ? <IconSun /> : <IconMoon />}
        </span>

        <span className={['overflow-hidden whitespace-nowrap transition-all duration-200', isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'].join(' ')}>
          {isDark ? 'Tema claro' : 'Tema escuro'}
        </span>

        {isCollapsed && (
          <span className="pointer-events-none absolute left-full z-50 ml-3 rounded-md px-2.5 py-1.5 bg-[--color-tooltip-bg] text-[--color-text-primary] text-sm shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap">
            {isDark ? 'Tema claro' : 'Tema escuro'}
          </span>
        )}
      </button>

      {/* Logout */}
      <button
        onClick={onLogout}
        title={isCollapsed ? 'Sair' : undefined}
        className={`${btnBase} text-[--color-text-secondary] hover:bg-red-500/10 hover:text-red-400`}
      >
        <span
          className={[
            'shrink-0 transition-transform duration-200 ease-out',
            'group-hover:-translate-y-0.5 group-hover:scale-110',
            'group-active:translate-y-0 group-active:scale-95',
          ].join(' ')}
        >
          <IconLogout />
        </span>

        <span className={['overflow-hidden whitespace-nowrap transition-all duration-200', isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'].join(' ')}>
          Sair
        </span>

        {isCollapsed && (
          <span className="pointer-events-none absolute left-full z-50 ml-3 rounded-md px-2.5 py-1.5 bg-[--color-tooltip-bg] text-[--color-text-primary] text-sm shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap">
            Sair
          </span>
        )}
      </button>
    </div>
  )
}
