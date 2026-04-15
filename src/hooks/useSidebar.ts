import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'oracle-pim:sidebar-open'
const MOBILE_TABLET_QUERY = '(max-width: 1024px)'

function getInitialState(): boolean {
  if (typeof window !== 'undefined' && window.matchMedia(MOBILE_TABLET_QUERY).matches) {
    return false
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored !== null ? stored === 'true' : true
  } catch {
    return true
  }
}

export function useSidebar() {
  const [isOpen, setIsOpen] = useState<boolean>(getInitialState)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia(MOBILE_TABLET_QUERY)

    function handleViewportChange(e: MediaQueryListEvent) {
      if (!e.matches) return
      setIsOpen(false)
      localStorage.setItem(STORAGE_KEY, 'false')
    }

    function handleForceClose() {
      setIsOpen(false)
      localStorage.setItem(STORAGE_KEY, 'false')
    }

    media.addEventListener('change', handleViewportChange)
    window.addEventListener('oracle-pim:sidebar-close', handleForceClose)
    return () => {
      media.removeEventListener('change', handleViewportChange)
      window.removeEventListener('oracle-pim:sidebar-close', handleForceClose)
    }
  }, [])

  const open = useCallback(() => {
    setIsOpen(true)
    localStorage.setItem(STORAGE_KEY, 'true')
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    localStorage.setItem(STORAGE_KEY, 'false')
  }, [])

  const toggle = useCallback(() => {
    setIsOpen(prev => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }, [])

  return { isOpen, open, close, toggle }
}
