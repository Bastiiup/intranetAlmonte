import { Container } from 'react-bootstrap'
import { headers } from 'next/headers'
import type { Metadata } from 'next'

import SolicitudesColaboradoresListing from './components/SolicitudesColaboradoresListing'
import PageBreadcrumb from '@/components/PageBreadcrumb'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Solicitudes de Colaboradores - Intranet Almonte',
}

export default async function Page() {
  let colaboradores: any[] = []
  let error: string | null = null

  try {
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    // Obtener solo colaboradores inactivos (activo = false)
    const response = await fetch(`${baseUrl}/api/colaboradores?activo=false`, {
      cache: 'no-store',
    })
    
    const data = await response.json()
    
    if (data.success && data.data) {
      colaboradores = Array.isArray(data.data) ? data.data : [data.data]
      console.log('[Solicitudes Colaboradores Page] Colaboradores inactivos obtenidos:', colaboradores.length)
    } else {
      error = data.error || 'Error al obtener colaboradores'
      console.error('[Solicitudes Colaboradores Page] Error en respuesta:', data)
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
    console.error('[Solicitudes Colaboradores Page] Error al obtener colaboradores:', err)
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Solicitudes de Colaboradores" subtitle="Colaboradores" />
      <SolicitudesColaboradoresListing colaboradores={colaboradores} error={error} />
    </Container>
  )
}


