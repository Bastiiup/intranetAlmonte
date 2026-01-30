import { Container } from 'react-bootstrap'
import { headers } from 'next/headers'
import type { Metadata } from 'next'

import ListasListing from '@/app/(admin)/(apps)/crm/listas/components/ListasListing'
import PageBreadcrumb from '@/components/PageBreadcrumb'

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Listas de Útiles',
}

export default async function Page() {
  let listas: any[] = []
  let error: string | null = null

  try {
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    const response = await fetch(`${baseUrl}/api/crm/listas/por-colegio`, {
      cache: 'no-store',
    })
    
    const data = await response.json()
    
    if (data.success && data.data) {
      listas = Array.isArray(data.data) ? data.data : [data.data]
    } else {
      error = data.error || 'Error al obtener colegios'
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Listas de Útiles" subtitle="CRM" />
      <ListasListing listas={listas} error={error} />
    </Container>
  )
}
