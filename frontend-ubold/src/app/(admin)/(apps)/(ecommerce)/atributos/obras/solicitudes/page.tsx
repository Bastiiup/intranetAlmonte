import { Container } from 'react-bootstrap'
import { headers } from 'next/headers'
import type { Metadata } from 'next'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import ObraRequestsListing from './components/ObraRequestsListing'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Solicitudes de Obras',
}

export default async function Page() {
  let solicitudes: any[] = []
  let error: string | null = null

  try {
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`

    const response = await fetch(`${baseUrl}/api/tienda/obras`, {
      cache: 'no-store',
    })

    const data = await response.json()

    if (data.success && data.data) {
      solicitudes = Array.isArray(data.data) ? data.data : [data.data]
      console.log('[Solicitudes Obras Page] Solicitudes obtenidas:', solicitudes.length)
    } else {
      error = data.error || 'Error al obtener solicitudes de obras'
      console.error('[Solicitudes Obras Page] Error en respuesta:', data)
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
    console.error('[Solicitudes Obras Page] Error al obtener solicitudes:', err)
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Solicitudes de Obras" subtitle="Ecommerce" />
      <ObraRequestsListing solicitudes={solicitudes} error={error} />
    </Container>
  )
}
