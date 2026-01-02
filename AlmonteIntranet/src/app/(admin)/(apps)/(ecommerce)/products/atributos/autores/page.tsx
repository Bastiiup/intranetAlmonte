import { Container } from 'react-bootstrap'
import { headers } from 'next/headers'
import type { Metadata } from 'next'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import AutoresListing from './components/AutoresListing'

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Todos los Autores - Intranet Almonte',
}

export default async function Page() {
  let autores: any[] = []
  let error: string | null = null

  try {
    // Usar API Route como proxy (igual que productos)
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    const response = await fetch(`${baseUrl}/api/tienda/autores`, {
      cache: 'no-store', // Forzar fetch dinámico
    })
    
    const data = await response.json()
    
    if (data.success && data.data) {
      autores = Array.isArray(data.data) ? data.data : [data.data]
      console.log('[Autores Page] Autores obtenidos:', autores.length)
    } else {
      error = data.error || 'Error al obtener autores'
      console.error('[Autores Page] Error en respuesta:', data)
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
    console.error('[Autores Page] Error al obtener autores:', err)
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Todos los Autores" subtitle="Ecommerce" />
      <AutoresListing autores={autores} error={error} />
    </Container>
  )
}

