import type { ReactNode } from 'react'

export interface NavItem {
  id: string
  label: string
  path: string
  icon: ReactNode
}
