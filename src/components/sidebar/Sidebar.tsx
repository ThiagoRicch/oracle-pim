import { SidebarHeader } from './SidebarHeader'
import { SidebarNav } from './SidebarNav'
import { SidebarFooter } from './SidebarFooter'
import type { Theme } from '../../hooks/useTheme'

const SIDEBAR_OPEN_WIDTH = '300px'
const SIDEBAR_CLOSED_WIDTH = '60px'

interface SidebarProps {
  isOpen: boolean
  theme: Theme
  onToggle: () => void
  onToggleTheme: () => void
  onLogout: () => void
}

export function Sidebar({ isOpen, theme, onToggle, onToggleTheme, onLogout }: SidebarProps) {
  return (
    <aside
      aria-label="Barra lateral"
      style={{ width: isOpen ? SIDEBAR_OPEN_WIDTH : SIDEBAR_CLOSED_WIDTH }}
      className={[
        'relative z-20 flex h-full shrink-0 flex-col',
        'overflow-hidden border-r border-[--color-border] bg-[--color-sidebar-bg]',
        'transition-[width] duration-200 ease-in-out',
      ].join(' ')}
    >
      <SidebarHeader isCollapsed={!isOpen} onToggle={onToggle} />

      <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden py-2">
        <SidebarNav isCollapsed={!isOpen} />
      </div>

      <SidebarFooter
        isCollapsed={!isOpen}
        theme={theme}
        onToggleTheme={onToggleTheme}
        onLogout={onLogout}
      />
    </aside>
  )
}
