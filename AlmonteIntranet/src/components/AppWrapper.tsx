'use client'
import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
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
      <NotificationProvider>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { zIndex: 99999 },
          }}
          containerStyle={{ zIndex: 99999 }}
        />
      </NotificationProvider>
    </LayoutProvider>
  )
}

export default AppWrapper
