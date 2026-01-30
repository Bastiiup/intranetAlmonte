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
    
    // Obtener colegio
    const colegioResponse = await fetch(`${baseUrl}/api/crm/colegios?filters[documentId][$eq]=${colegioId}`, {
      cache: 'no-store',
    })
    
    const colegioData = await colegioResponse.json()
    
    if (colegioData.success && colegioData.data && colegioData.data.length > 0) {
      const colegioInfo = colegioData.data[0]
      const colegioAttrs = colegioInfo.attributes || colegioInfo
      
      colegio = {
        id: colegioInfo.id || colegioInfo.documentId,
        documentId: colegioInfo.documentId || String(colegioInfo.id),
        nombre: colegioAttrs.colegio_nombre || '',
        rbd: colegioAttrs.rbd || null,
        comuna: colegioAttrs.comuna?.data?.attributes?.comuna_nombre || colegioAttrs.provincia || '',
        region: colegioAttrs.region || '',
        total_matriculados: colegioInfo.total_matriculados || 0,
      }
      
      // Obtener TODOS los cursos del colegio
      const cursosResponse = await fetch(`${baseUrl}/api/crm/colegios/${colegioId}/cursos`, {
        cache: 'no-store',
      })
      
      const cursosData = await cursosResponse.json()
      
      if (cursosData.success && cursosData.data) {
        cursos = cursosData.data.map((curso: any) => {
          // Los datos vienen directamente en el objeto (no en attributes)
          const versiones = curso.versiones_materiales || []
          const ultimaVersion = versiones.length > 0 ? versiones[versiones.length - 1] : null
          const materiales = ultimaVersion?.materiales || []
          
          return {
            id: curso.id || curso.documentId,
            documentId: curso.documentId || String(curso.id),
            nombre: curso.nombre_curso || '',
            nivel: curso.nivel || '',
            grado: curso.grado || 0,
            año: curso.anio || curso.año || new Date().getFullYear(),
            matricula: curso.matricula || 0,
            cantidadVersiones: versiones.length,
            cantidadProductos: materiales.length,
            pdf_id: ultimaVersion?.pdf_id || null,
            pdf_url: ultimaVersion?.pdf_url || null,
            updatedAt: curso.updatedAt || null,
          }
        })
      }
    } else {
      error = 'No se encontró el colegio'
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
