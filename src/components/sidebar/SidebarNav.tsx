import { MenuItem } from './MenuItem'
import { IconHome, IconServer, IconMap, IconDashboard, IconInfo, IconServerOff } from '../icons'
import type { NavItem } from '../../types/navigation'

const NAV_ITEMS: NavItem[] = [
  {
    id: 'home',
    label: 'Início',
    path: '/',
    icon: <IconHome className="h-6 w-6" />,
  },
  {
    id: 'create-server',
    label: 'Criar Servidor',
    path: '/criar-servidor',
    icon: <IconServer className="h-6 w-6" />,
  },
  {
    id: 'map',
    label: 'Mapa',
    path: '/mapa',
    icon: <IconMap className="h-6 w-6" />,
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: <IconDashboard className="h-6 w-6" />,
  },
  {
    id: 'disabled-servers',
    label: 'Servidores Desativados',
    path: '/servidores-desativados',
    icon: <IconServerOff className="h-6 w-6" />,
  },
  {
    id: 'about',
    label: 'Sobre',
    path: '/sobre',
    icon: <IconInfo className="h-6 w-6" />,
  },
]

interface SidebarNavProps {
  isCollapsed: boolean
}

export function SidebarNav({ isCollapsed }: SidebarNavProps) {
  return (
    <nav aria-label="Navegação principal" translate="no" className="notranslate flex flex-col gap-2 px-3">
      {NAV_ITEMS.map(item => (
        <MenuItem key={item.id} item={item} isCollapsed={isCollapsed} />
      ))}
    </nav>
  )
}
