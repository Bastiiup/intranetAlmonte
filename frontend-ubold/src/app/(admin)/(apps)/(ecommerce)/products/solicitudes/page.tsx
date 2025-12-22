import { Container } from 'react-bootstrap'
import { headers } from 'next/headers'
import type { Metadata } from 'next'

import ProductRequestsListing from '@/app/(admin)/(apps)/(ecommerce)/products/solicitudes/components/ProductRequestsListing'
import PageBreadcrumb from '@/components/PageBreadcrumb'

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Solicitudes de Productos - Intranet Almonte',
}

export default async function Page() {
  let productos: any[] = []
  let error: string | null = null

  try {
    // Usar API Route como proxy (igual que el listing normal)
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    const response = await fetch(`${baseUrl}/api/tienda/productos`, {
      cache: 'no-store', // Forzar fetch dinámico
    })
    
    const data = await response.json()
    
    if (data.success && data.data) {
      productos = Array.isArray(data.data) ? data.data : [data.data]
      console.log('[Product Requests Page] Productos obtenidos:', productos.length)
    } else {
      error = data.error || 'Error al obtener productos'
      console.error('[Product Requests Page] Error en respuesta:', data)
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
    console.error('[Product Requests Page] Error al obtener productos:', err)
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Solicitudes de Productos" subtitle="Ecommerce" />
      <ProductRequestsListing productos={productos} error={error} />
    </Container>
  )
}

