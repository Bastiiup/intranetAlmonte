import { Container } from 'react-bootstrap'
import { headers } from 'next/headers'
import type { Metadata } from 'next'

import ColaboradoresListing from '@/app/(admin)/(apps)/colaboradores/components/ColaboradoresListing'
import PageBreadcrumb from '@/components/PageBreadcrumb'

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Colaboradores',
}

export default async function Page() {
  let colaboradores: any[] = []
  let error: string | null = null

  try {
    // Usar API Route como proxy
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    const response = await fetch(`${baseUrl}/api/colaboradores?pageSize=1000`, {
      cache: 'no-store', // Forzar fetch dinámico
    })
    
    const data = await response.json()
    
    if (data.success && data.data) {
      colaboradores = Array.isArray(data.data) ? data.data : [data.data]
      console.log('[Colaboradores Page] Colaboradores obtenidos:', colaboradores.length)
    } else {
      error = data.error || 'Error al obtener colaboradores'
      console.error('[Colaboradores Page] Error en respuesta:', data)
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
    console.error('[Colaboradores Page] Error al obtener colaboradores:', err)
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Colaboradores" subtitle="Administración" />
      <ColaboradoresListing colaboradores={colaboradores} error={error} />
    </Container>
  )
}

