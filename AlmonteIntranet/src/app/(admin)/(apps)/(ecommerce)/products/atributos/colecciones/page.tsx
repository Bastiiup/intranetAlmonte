import { Container } from 'react-bootstrap'
import { headers } from 'next/headers'
import type { Metadata } from 'next'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import ColeccionesTabs from './components/ColeccionesTabs'

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Colecciones - Intranet Almonte',
}

export default async function Page() {
  let colecciones: any[] = []
  let error: string | null = null

  try {
    // Usar API Route como proxy (igual que productos)
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    const response = await fetch(`${baseUrl}/api/tienda/colecciones`, {
      cache: 'no-store', // Forzar fetch dinámico
    })
    
    const data = await response.json()
    
    if (data.success && data.data) {
      colecciones = Array.isArray(data.data) ? data.data : [data.data]
      console.log('[Colecciones Page] Colecciones obtenidas:', colecciones.length)
    } else {
      error = data.error || 'Error al obtener colecciones'
      console.error('[Colecciones Page] Error en respuesta:', data)
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
    console.error('[Colecciones Page] Error al obtener colecciones:', err)
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Colecciones" subtitle="Ecommerce" />
      <ColeccionesTabs colecciones={colecciones} error={error} />
    </Container>
  )
}

