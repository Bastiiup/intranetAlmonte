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

      // Usar la MISMA fuente que el modal (por-colegio) → misma tabla, mismos PDFs y mismas URLs de validación
      const porColegioResponse = await fetch(`${baseUrl}/api/crm/listas/por-colegio?colegioId=${colegioId}`, {
        cache: 'no-store',
      })
      const porColegioData = await porColegioResponse.json()

      if (porColegioData.success && porColegioData.data?.length > 0 && porColegioData.data[0].cursos?.length > 0) {
        const cursosDelColegio = porColegioData.data[0].cursos as any[]
        cursos = cursosDelColegio.map((c: any) => ({
          id: c.id,
          documentId: c.documentId,
          nombre: c.nombre,
          nivel: c.nivel,
          grado: c.grado,
          año: c.año,
          matricula: c.matriculados ?? 0,
          matriculados: c.matriculados ?? 0,
          cantidadVersiones: c.cantidadVersiones ?? 0,
          cantidadProductos: c.cantidadProductos ?? 0,
          pdf_id: c.pdf_id ?? null,
          pdf_url: c.pdf_url ?? null,
          updatedAt: c.updatedAt ?? null,
          estado_revision: c.estado_revision ?? null,
          fecha_revision: c.fecha_revision ?? null,
          fecha_publicacion: c.fecha_publicacion ?? null,
        }))
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
