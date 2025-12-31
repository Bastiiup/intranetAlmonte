import { Container } from 'react-bootstrap'
import { headers } from 'next/headers'
import type { Metadata } from 'next'

import ColegiosListing from './components/ColegiosListing'
import PageBreadcrumb from '@/components/PageBreadcrumb'

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Colegios - CRM',
}

export default async function Page() {
  let colegios: any[] = []
  let error: string | null = null

  try {
    // Usar API Route como proxy
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    const response = await fetch(`${baseUrl}/api/crm/colegios`, {
      cache: 'no-store', // Forzar fetch dinámico
    })
    
    const data = await response.json()
    
    if (data.success && data.data) {
      colegios = Array.isArray(data.data) ? data.data : [data.data]
      console.log('[Colegios Page] Colegios obtenidos:', colegios.length)
    } else {
      error = data.error || 'Error al obtener colegios'
      console.error('[Colegios Page] Error en respuesta:', data)
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
    console.error('[Colegios Page] Error al obtener colegios:', err)
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Colegios" subtitle="CRM" />
      <ColegiosListing colegios={colegios} error={error} />
    </Container>
  )
}

