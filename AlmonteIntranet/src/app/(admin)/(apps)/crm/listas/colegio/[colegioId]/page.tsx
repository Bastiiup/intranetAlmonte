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
        // Mapear cursos
        const cursosMap = new Map<string, any>()
        
        cursosData.data.forEach((curso: any) => {
          // Los datos pueden venir en attributes o directamente
          const attrs = curso.attributes || curso
          const versiones = attrs.versiones_materiales || curso.versiones_materiales || []
          const ultimaVersion = versiones.length > 0 ? versiones[versiones.length - 1] : null
          const materiales = ultimaVersion?.materiales || []
          
          // Normalizar nombre: quitar año del nombre si existe (ej: "1° Básico 2022" -> "1° Básico")
          let nombreNormalizado = (attrs.nombre_curso || curso.nombre_curso || '').trim()
          nombreNormalizado = nombreNormalizado.replace(/\s+\d{4}$/, '') // Quitar año al final
          // Normalizar símbolos de grado: º y ° son el mismo grado
          nombreNormalizado = nombreNormalizado.replace(/º/g, '°') // Cambiar º por °
          nombreNormalizado = nombreNormalizado.replace(/\s+/g, ' ') // Normalizar espacios múltiples
          
          // Leer estado_revision desde attributes, directamente, o desde metadata de la última versión
          let estadoRevision = attrs.estado_revision || curso.estado_revision || null
          
          // Si no está en el campo directo, buscar en metadata de la última versión
          if (!estadoRevision && ultimaVersion?.metadata?.estado_revision) {
            estadoRevision = ultimaVersion.metadata.estado_revision
          }
          
          const cursoMapeado = {
            id: curso.id || curso.documentId,
            documentId: curso.documentId || String(curso.id),
            nombre: nombreNormalizado,
            nivel: attrs.nivel || curso.nivel || '',
            grado: attrs.grado || curso.grado || 0,
            año: attrs.anio || attrs.año || curso.anio || curso.año || new Date().getFullYear(),
            matricula: attrs.matricula || curso.matricula || 0,
            cantidadVersiones: versiones.length,
            cantidadProductos: materiales.length,
            pdf_id: ultimaVersion?.pdf_id || null,
            pdf_url: ultimaVersion?.pdf_url || null,
            updatedAt: curso.updatedAt || attrs.updatedAt || null,
            estado_revision: estadoRevision, // ✅ Leer desde attributes o directamente
            fecha_revision: attrs.fecha_revision || curso.fecha_revision || null,
            fecha_publicacion: attrs.fecha_publicacion || curso.fecha_publicacion || null,
            ids: [curso.id || curso.documentId], // Guardar IDs originales
          }
          
          // Crear clave única: SOLO nombre + nivel + grado (sin año para evitar duplicados)
          const clave = `${nombreNormalizado}-${cursoMapeado.nivel}-${cursoMapeado.grado}`.toLowerCase().trim()
          
          if (cursosMap.has(clave)) {
            // Si ya existe, mantener solo el curso del año 2026
            const cursoExistente = cursosMap.get(clave)!
            
            // Priorizar año 2026
            if (cursoMapeado.año === 2026 && cursoExistente.año !== 2026) {
              // Reemplazar con el del 2026
              cursoMapeado.año = 2026 // Forzar a 2026
              cursosMap.set(clave, cursoMapeado)
            } else if (cursoExistente.año === 2026 && cursoMapeado.año !== 2026) {
              // Mantener el existente (ya es 2026)
              // No hacer nada
            } else {
              // Ambos son 2026 o ninguno es 2026, combinar datos
              
              // Usar la matrícula más alta
              if (cursoMapeado.matricula > cursoExistente.matricula) {
                cursoExistente.matricula = cursoMapeado.matricula
              }
              
              // Mantener el que tenga más versiones
              if (cursoMapeado.cantidadVersiones > cursoExistente.cantidadVersiones) {
                cursoExistente.cantidadVersiones = cursoMapeado.cantidadVersiones
                cursoExistente.cantidadProductos = cursoMapeado.cantidadProductos
                cursoExistente.pdf_id = cursoMapeado.pdf_id
                cursoExistente.pdf_url = cursoMapeado.pdf_url
              }
              
              // Priorizar estado_revision: publicado > revisado > borrador > null
              const prioridades: Record<string, number> = {
                'publicado': 3,
                'revisado': 2,
                'borrador': 1,
              }
              const prioridadActual = prioridades[cursoExistente.estado_revision || ''] || 0
              const prioridadNuevo = prioridades[cursoMapeado.estado_revision || ''] || 0
              if (prioridadNuevo > prioridadActual) {
                cursoExistente.estado_revision = cursoMapeado.estado_revision
              }
              
              // Mantener la fecha más reciente
              if (cursoMapeado.updatedAt && (!cursoExistente.updatedAt || cursoMapeado.updatedAt > cursoExistente.updatedAt)) {
                cursoExistente.updatedAt = cursoMapeado.updatedAt
                cursoExistente.id = cursoMapeado.id
                cursoExistente.documentId = cursoMapeado.documentId
              }
              
              // Forzar año a 2026
              cursoExistente.año = 2026
            }
            
            // Agregar ID a la lista
            cursoExistente.ids.push(curso.id || curso.documentId)
          } else {
            // Si no existe, agregarlo (forzar año a 2026)
            cursoMapeado.año = 2026
            cursosMap.set(clave, cursoMapeado)
          }
        })
        
        // Convertir el mapa a array
        cursos = Array.from(cursosMap.values())
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
