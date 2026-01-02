'use client'
import { useEffect } from 'react'
import { LayoutProvider } from '@/context/useLayoutContext'
import { NotificationProvider } from '@/context/useNotificationContext'
import { ChildrenType } from '@/types'
import { syncLocalStorageToCookies } from '@/lib/auth'

const AppWrapper = ({ children }: ChildrenType) => {
  // Sincronizar localStorage a cookies al cargar (migración transparente)
  useEffect(() => {
    syncLocalStorageToCookies()
  }, [])

  return (
    <LayoutProvider>
      <NotificationProvider>{children}</NotificationProvider>
    </LayoutProvider>
  )
}

export default AppWrapper
