import { Container } from 'react-bootstrap'
import { headers } from 'next/headers'
import type { Metadata } from 'next'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import ObrasListing from './components/ObrasListing'

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Todas las Obras',
}

export default async function Page() {
  let obras: any[] = []
  let error: string | null = null

  try {
    // Usar API Route como proxy (igual que productos)
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    const response = await fetch(`${baseUrl}/api/tienda/obras`, {
      cache: 'no-store', // Forzar fetch dinámico
    })
    
    const data = await response.json()
    
    if (data.success && data.data) {
      obras = Array.isArray(data.data) ? data.data : [data.data]
      console.log('[Obras Page] Obras obtenidas:', obras.length)
    } else {
      error = data.error || 'Error al obtener obras'
      console.error('[Obras Page] Error en respuesta:', data)
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
    console.error('[Obras Page] Error al obtener obras:', err)
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Todas las Obras" subtitle="Ecommerce" />
      <ObrasListing obras={obras} error={error} />
    </Container>
  )
}



