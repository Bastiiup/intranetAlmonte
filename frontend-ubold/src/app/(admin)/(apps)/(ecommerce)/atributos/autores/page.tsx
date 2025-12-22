import { Container } from 'react-bootstrap'
import { headers, cookies } from 'next/headers'
import type { Metadata } from 'next'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import AutoresListing from './components/AutoresListing'

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Todos los Autores',
}

export default async function Page() {
  let autores: any[] = []
  let error: string | null = null

  try {
    // Usar API Route como proxy (igual que productos)
    const headersList = await headers()
    const cookieStore = await cookies()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    // Construir el header Cookie con todas las cookies del request original
    const cookieHeader = cookieStore.getAll()
      .map(cookie => `${cookie.name}=${cookie.value}`)
      .join('; ')
    
    const response = await fetch(`${baseUrl}/api/tienda/autores`, {
      cache: 'no-store', // Forzar fetch dinámico
      headers: {
        'Cookie': cookieHeader, // Pasar cookies del request original
      },
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

