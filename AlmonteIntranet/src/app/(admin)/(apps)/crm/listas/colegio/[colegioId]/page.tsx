import { Container } from 'react-bootstrap'
import { headers } from 'next/headers'
import type { Metadata } from 'next'

import CursosColegioListing from './components/CursosColegioListing'
import PageBreadcrumb from '@/components/PageBreadcrumb'

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Cursos del Colegio - Listas de Útiles',
}

interface PageProps {
  params: Promise<{
    colegioId: string
  }>
}

export default async function Page({ params }: PageProps) {
  const { colegioId } = await params
  
  let colegio: any = null
  let cursos: any[] = []
  let error: string | null = null

  try {
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    // Obtener datos del colegio y sus cursos
    const response = await fetch(`${baseUrl}/api/crm/listas/por-colegio?colegioId=${colegioId}`, {
      cache: 'no-store',
    })
    
    const data = await response.json()
    
    if (data.success && data.data && data.data.length > 0) {
      colegio = data.data[0]
      cursos = colegio.cursos || []
    } else {
      error = data.error || 'No se encontraron cursos para este colegio'
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
  }

  return (
    <Container fluid>
      <PageBreadcrumb 
        title={colegio ? `${colegio.nombre} (RBD: ${colegio.rbd})` : 'Cursos del Colegio'} 
        subtitle="Listas de Útiles" 
      />
      <CursosColegioListing 
        colegio={colegio} 
        cursos={cursos} 
        error={error} 
      />
    </Container>
  )
}
