'use client'

import MainLayout from '@/layouts/MainLayout'
import { ChildrenType } from '@/types'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAuthToken, getAuthColaborador } from '@/lib/auth'
import Loader from '@/components/Loader'

const Layout = ({ children }: ChildrenType) => {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    // Verificar autenticación en el cliente
    const checkAuth = () => {
      const token = getAuthToken()
      const colaborador = getAuthColaborador()

      if (!token || !colaborador) {
        // No está autenticado, redirigir a login
        const currentPath = window.location.pathname
        router.push(`/auth-1/sign-in?redirect=${encodeURIComponent(currentPath)}`)
        return
      }

      // Está autenticado, permitir acceso
      setIsAuthenticated(true)
    }

    checkAuth()
  }, [router])

  // Mostrar loader mientras se verifica la autenticación
  if (isAuthenticated === null) {
    return <Loader height="100vh" />
  }

  // Si no está autenticado, no renderizar nada (ya se redirigió)
  if (!isAuthenticated) {
    return null
  }

  // Si está autenticado, renderizar el layout normal
  return <MainLayout>{children}</MainLayout>
}

export default Layout
