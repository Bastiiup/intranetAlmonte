import { Container } from 'react-bootstrap'
import { headers } from 'next/headers'
import type { Metadata } from 'next'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import SellosTabs from './components/SellosTabs'

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Sellos',
}

export default async function Page() {
  let sellos: any[] = []
  let error: string | null = null

  try {
    // Usar API Route como proxy (igual que productos)
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    const response = await fetch(`${baseUrl}/api/tienda/sello`, {
      cache: 'no-store', // Forzar fetch dinámico
    })
    
    const data = await response.json()
    
    if (data.success && data.data) {
      sellos = Array.isArray(data.data) ? data.data : [data.data]
      console.log('[Sellos Page] Sellos obtenidos:', sellos.length)
    } else {
      error = data.error || 'Error al obtener sellos'
      console.error('[Sellos Page] Error en respuesta:', data)
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
    console.error('[Sellos Page] Error al obtener sellos:', err)
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Sellos" subtitle="Ecommerce" />
      <SellosTabs sellos={sellos} error={error} />
    </Container>
  )
}
