import { Container } from 'react-bootstrap'
import { headers } from 'next/headers'
import type { Metadata } from 'next'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import CuponesListing from './components/CuponesListing'

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Todos los Cupones',
}

export default async function Page() {
  let cupones: any[] = []
  let error: string | null = null

  try {
    // Usar API Route como proxy
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    const response = await fetch(`${baseUrl}/api/tienda/cupones`, {
      cache: 'no-store', // Forzar fetch dinámico
    })
    
    const data = await response.json()
    
    if (data.success && data.data) {
      cupones = Array.isArray(data.data) ? data.data : [data.data]
      console.log('[Cupones Page] Cupones obtenidos:', cupones.length)
    } else {
      error = data.error || 'Error al obtener cupones'
      console.error('[Cupones Page] Error en respuesta:', data)
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
    console.error('[Cupones Page] Error al obtener cupones:', err)
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Todos los Cupones" subtitle="Ecommerce" />
      <CuponesListing cupones={cupones} error={error} />
    </Container>
  )
}
