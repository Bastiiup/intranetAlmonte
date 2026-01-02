import { Container } from 'react-bootstrap'
import { headers } from 'next/headers'
import type { Metadata } from 'next'

import EtiquetaRequestsListing from './components/EtiquetaRequestsListing'
import PageBreadcrumb from '@/components/PageBreadcrumb'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Solicitudes de Etiquetas - Intranet Almonte',
}

export default async function Page() {
  let etiquetas: any[] = []
  let error: string | null = null

  try {
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    const response = await fetch(`${baseUrl}/api/tienda/etiquetas`, {
      cache: 'no-store',
    })
    
    const data = await response.json()
    
    if (data.success && data.data) {
      etiquetas = Array.isArray(data.data) ? data.data : [data.data]
      console.log('[Etiqueta Requests Page] Etiquetas obtenidas:', etiquetas.length)
    } else {
      error = data.error || 'Error al obtener etiquetas'
      console.error('[Etiqueta Requests Page] Error en respuesta:', data)
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
    console.error('[Etiqueta Requests Page] Error al obtener etiquetas:', err)
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Solicitudes de Etiquetas" subtitle="Ecommerce" />
      <EtiquetaRequestsListing etiquetas={etiquetas} error={error} />
    </Container>
  )
}

