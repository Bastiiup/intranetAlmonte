import { Container } from 'react-bootstrap'
import { headers } from 'next/headers'
import type { Metadata } from 'next'

import LicenciasListing from '@/app/(admin)/(apps)/mira/licencias/components/LicenciasListing'
import PageBreadcrumb from '@/components/PageBreadcrumb'

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Licencias de Libros MIRA',
}

export default async function Page() {
  let licencias: any[] = []
  let error: string | null = null

  try {
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 50000) // 50 segundos
    
    const response = await fetch(`${baseUrl}/api/mira/licencias`, {
      cache: 'no-store',
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId)
    
    const data = await response.json()
    
    if (data.success && data.data) {
      licencias = Array.isArray(data.data) ? data.data : [data.data]
    } else {
      error = data.error || 'Error al obtener licencias'
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Licencias de Libros MIRA" subtitle="MIRA" />
      <LicenciasListing licencias={licencias} error={error} />
    </Container>
  )
}
