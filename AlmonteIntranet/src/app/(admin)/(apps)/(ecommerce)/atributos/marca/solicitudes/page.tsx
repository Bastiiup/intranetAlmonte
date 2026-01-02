import { Container } from 'react-bootstrap'
import { headers } from 'next/headers'
import type { Metadata } from 'next'

import MarcaRequestsListing from './components/MarcaRequestsListing'
import PageBreadcrumb from '@/components/PageBreadcrumb'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Solicitudes de Marcas - Intranet Almonte',
}

export default async function Page() {
  let marcas: any[] = []
  let error: string | null = null

  try {
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    const response = await fetch(`${baseUrl}/api/tienda/marca`, {
      cache: 'no-store',
    })
    
    const data = await response.json()
    
    if (data.success && data.data) {
      marcas = Array.isArray(data.data) ? data.data : [data.data]
      console.log('[Marca Requests Page] Marcas obtenidas:', marcas.length)
    } else {
      error = data.error || 'Error al obtener marcas'
      console.error('[Marca Requests Page] Error en respuesta:', data)
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
    console.error('[Marca Requests Page] Error al obtener marcas:', err)
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Solicitudes de Marcas" subtitle="Ecommerce" />
      <MarcaRequestsListing marcas={marcas} error={error} />
    </Container>
  )
}
