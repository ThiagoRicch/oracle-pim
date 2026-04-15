import { NavLink, useMatch, useResolvedPath } from 'react-router-dom'
import type { NavItem } from '../../types/navigation'

interface MenuItemProps {
  item: NavItem
  isCollapsed: boolean
}

export function MenuItem({ item, isCollapsed }: MenuItemProps) {
  const resolvedPath = useResolvedPath(item.path)
  const isActive = useMatch({ path: resolvedPath.pathname, end: item.path === '/' }) !== null
  const activeColor = 'var(--color-accent)'

  return (
    <NavLink
      to={item.path}
      title={isCollapsed ? item.label : undefined}
      style={isActive ? { color: activeColor } : undefined}
      className={() =>
        [
          'group relative flex items-center rounded-xl transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent]',
          isCollapsed
            ? 'justify-center px-0 py-3.5'
            : 'gap-4 px-4 py-3.5',
          'text-base',
          isActive
            ? 'bg-[--color-sidebar-active] font-black'
            : 'text-[--color-text-secondary] font-medium hover:bg-[--color-sidebar-hover] hover:text-[--color-accent]',
        ].join(' ')
      }
    >
      <span
        translate="no"
        style={isActive ? { color: activeColor } : undefined}
        className={[
          'shrink-0 transition-all duration-200 ease-out',
          'group-hover:-translate-y-0.5 group-hover:scale-110',
          'group-active:translate-y-0 group-active:scale-95',
          isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(249,115,22,0.2)]' : 'text-inherit',
        ].join(' ')}
      >
        {item.icon}
      </span>

      <span
        translate="no"
        style={isActive ? { color: activeColor } : undefined}
        className={[
          'overflow-hidden whitespace-nowrap transition-all duration-200',
          isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100',
          isActive ? 'font-black tracking-[0.01em]' : 'text-inherit',
        ].join(' ')}
      >
        {item.label}
      </span>

      {isCollapsed && (
        <span translate="no" className="pointer-events-none absolute left-full z-50 ml-3 rounded-md px-2.5 py-1.5 bg-[--color-tooltip-bg] text-[--color-accent] text-sm shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap">
          {item.label}
        </span>
      )}
    </NavLink>
  )
}
