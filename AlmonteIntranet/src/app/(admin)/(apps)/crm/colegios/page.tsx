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
  let totalRows: number = 0

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
      totalRows = data.meta?.pagination?.total || colegios.length
      console.log('[Colegios Page] Colegios obtenidos:', colegios.length, 'Total:', totalRows)
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
      <PageBreadcrumb 
        title="Colegios" 
        subtitle="CRM" 
        infoText="Los Colegios son instituciones educativas con las que trabajas. Aquí puedes gestionar información completa de cada colegio: datos de contacto, ubicación, representantes comerciales, y ver todos los contactos asociados. Los colegios pueden estar relacionados con oportunidades de venta y leads."
      />
      <ColegiosListing colegios={colegios} error={error} initialTotalRows={totalRows} />
    </Container>
  )
}

