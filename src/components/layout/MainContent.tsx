import type { ReactNode } from 'react'

interface MainContentProps {
  children: ReactNode
}

export function MainContent({ children }: MainContentProps) {
  return (
    <main className="relative flex min-h-0 flex-1 flex-col overflow-y-auto bg-[--color-main-bg]">
      {children}
    </main>
  )
}
