'use client'
import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { LayoutProvider } from '@/context/useLayoutContext'
import { NotificationProvider } from '@/context/useNotificationContext'
import { ChildrenType } from '@/types'
import { syncLocalStorageToCookies } from '@/lib/auth'

/** Toaster global renderizado en document.body para que se vea en toda la app y encima de modales */
function GlobalToaster() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted || typeof document === 'undefined') return null
  return createPortal(
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: { zIndex: 99999 },
      }}
      containerStyle={{ zIndex: 99999 }}
    />,
    document.body
  )
}

const AppWrapper = ({ children }: ChildrenType) => {
  useEffect(() => {
    syncLocalStorageToCookies()
  }, [])

  return (
    <LayoutProvider>
      <NotificationProvider>
        {children}
        <GlobalToaster />
      </NotificationProvider>
    </LayoutProvider>
  )
}

export default AppWrapper
