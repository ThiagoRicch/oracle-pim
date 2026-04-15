import { Link } from 'react-router-dom'
import { IconChevronLeft, IconChevronRight } from '../icons'
import oracleLogo from '../../assets/oracle.png'

interface SidebarHeaderProps {
  isCollapsed: boolean
  onToggle: () => void
}

export function SidebarHeader({ isCollapsed, onToggle }: SidebarHeaderProps) {
  if (isCollapsed) {
    return (
      <div className="flex h-[72px] shrink-0 items-center justify-center px-2">
        <button
          onClick={onToggle}
          aria-label="Abrir barra lateral"
          className={[
            'flex h-9 w-9 items-center justify-center rounded-xl cursor-e-resize',
            'text-[--color-text-secondary] hover:bg-[--color-sidebar-hover] hover:text-[--color-text-primary]',
            'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent]',
          ].join(' ')}
        >
          <IconChevronRight />
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-[100px] shrink-0 items-center justify-between px-4">
      <Link
        to="/"
        className="flex items-center overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent] rounded-md"
        aria-label="Oracle — Página inicial"
      >
        <img
          src={oracleLogo}
          alt="Oracle"
          className="object-contain"
          style={{ height: '80px', width: 'auto', maxWidth: '240px' }}
        />
      </Link>

      <button
        onClick={onToggle}
        aria-label="Fechar barra lateral"
        className={[
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl cursor-w-resize',
          'text-[--color-text-secondary] hover:bg-[--color-sidebar-hover] hover:text-[--color-text-primary]',
          'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent]',
        ].join(' ')}
      >
        <IconChevronLeft />
      </button>
    </div>
  )
}
