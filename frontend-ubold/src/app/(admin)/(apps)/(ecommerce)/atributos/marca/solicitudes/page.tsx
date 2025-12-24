import { Container } from 'react-bootstrap'
import { headers } from 'next/headers'
import type { Metadata } from 'next'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import MarcaRequestsListing from './components/MarcaRequestsListing'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Solicitudes de Marcas',
}

export default async function Page() {
  let solicitudes: any[] = []
  let error: string | null = null

  try {
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`

    const response = await fetch(`${baseUrl}/api/tienda/marca`, {
      cache: 'no-store',
    })

    const data = await response.json()

    if (data.success && data.data) {
      solicitudes = Array.isArray(data.data) ? data.data : [data.data]
      console.log('[Solicitudes Marcas Page] Solicitudes obtenidas:', solicitudes.length)
    } else {
      error = data.error || 'Error al obtener solicitudes de marcas'
      console.error('[Solicitudes Marcas Page] Error en respuesta:', data)
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
    console.error('[Solicitudes Marcas Page] Error al obtener solicitudes:', err)
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Solicitudes de Marcas" subtitle="Ecommerce" />
      <MarcaRequestsListing solicitudes={solicitudes} error={error} />
    </Container>
  )
}
