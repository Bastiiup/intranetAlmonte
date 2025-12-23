import { Container } from 'react-bootstrap'
import { headers } from 'next/headers'
import type { Metadata } from 'next'

import SelloRequestsListing from './components/SelloRequestsListing'
import PageBreadcrumb from '@/components/PageBreadcrumb'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Solicitudes de Sellos - Intranet Almonte',
}

export default async function Page() {
  let sellos: any[] = []
  let error: string | null = null

  try {
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    const response = await fetch(`${baseUrl}/api/tienda/sello`, {
      cache: 'no-store',
    })
    
    const data = await response.json()
    
    if (data.success && data.data) {
      sellos = Array.isArray(data.data) ? data.data : [data.data]
      console.log('[Sello Requests Page] Sellos obtenidos:', sellos.length)
    } else {
      error = data.error || 'Error al obtener sellos'
      console.error('[Sello Requests Page] Error en respuesta:', data)
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
    console.error('[Sello Requests Page] Error al obtener sellos:', err)
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Solicitudes de Sellos" subtitle="Ecommerce" />
      <SelloRequestsListing sellos={sellos} error={error} />
    </Container>
  )
}
