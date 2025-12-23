import { Container } from 'react-bootstrap'
import { headers } from 'next/headers'
import type { Metadata } from 'next'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import ProductRequestsListing from './components/ProductRequestsListing'

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Solicitudes de Productos',
}

export default async function Page() {
  let solicitudes: any[] = []
  let error: string | null = null

  try {
    // Usar API Route como proxy (igual que productos)
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    // Por ahora usar productos como solicitudes hasta que tengamos el endpoint específico
    const response = await fetch(`${baseUrl}/api/tienda/productos`, {
      cache: 'no-store', // Forzar fetch dinámico
    })
    
    const data = await response.json()
    
    if (data.success && data.data) {
      // Filtrar solo productos pendientes o con estado de solicitud
      solicitudes = Array.isArray(data.data) ? data.data : [data.data]
      console.log('[Solicitudes Productos Page] Solicitudes obtenidas:', solicitudes.length)
    } else {
      error = data.error || 'Error al obtener solicitudes de productos'
      console.error('[Solicitudes Productos Page] Error en respuesta:', data)
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
    console.error('[Solicitudes Productos Page] Error al obtener solicitudes:', err)
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Solicitudes de Productos" subtitle="Ecommerce" />
      <ProductRequestsListing solicitudes={solicitudes} error={error} />
    </Container>
  )
}

