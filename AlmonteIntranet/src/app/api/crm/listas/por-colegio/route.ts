/**
 * API Route para obtener colegios agrupados con sus listas
 * GET /api/crm/listas/por-colegio
 * 
 * Devuelve colegios con información agregada de sus cursos y listas
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

const DEBUG = true
const debugLog = (...args: any[]) => {
  if (DEBUG) {
    console.log(...args)
  }
}

/**
 * GET /api/crm/listas/por-colegio
 * Obtiene todos los colegios que tienen cursos con listas, agrupados
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const año = searchParams.get('año') || searchParams.get('ano')
    const colegioId = searchParams.get('colegioId')

    debugLog('[API /crm/listas/por-colegio GET] Obteniendo colegios con listas...', { colegioId, año })

    // Construir filtros para cursos
    const filters: string[] = []
    
    filters.push('pagination[pageSize]=500')
    filters.push('pagination[page]=1')
    filters.push('sort[0]=updatedAt:desc')
    
    if (año) {
      filters.push(`filters[anio][$eq]=${año}`)
    }
    
    // Filtrar por colegio específico si se proporciona
    if (colegioId) {
      filters.push(`filters[colegio][documentId][$eq]=${colegioId}`)
    }
    
    // Populate necesario
    filters.push('populate[colegio][populate][comuna]=true')
    filters.push('populate[colegio][populate][direcciones]=true')
    // No especificar fields[] para obtener todos los campos del colegio
    // Esto evita el error "Invalid key" si algún campo no existe
    filters.push('publicationState=preview')

    const queryString = filters.join('&')
    const finalQuery = `?${queryString}&_t=${Date.now()}`

    debugLog('[API /crm/listas/por-colegio GET] Query:', finalQuery)

    // Obtener todos los cursos
    const response = await strapiClient.get<any>(`/api/cursos${finalQuery}`)

    if (!response || !response.data) {
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
      }, { status: 200 })
    }

    const cursos = Array.isArray(response.data) ? response.data : [response.data]
    
    debugLog('[API /crm/listas/por-colegio GET] Total de cursos obtenidos:', cursos.length)

    // Filtrar solo cursos con versiones_materiales
    const cursosConListas = cursos.filter((curso: any) => {
      const attrs = curso.attributes || curso
      const versiones = attrs.versiones_materiales || []
      return Array.isArray(versiones) && versiones.length > 0
    })

    debugLog('[API /crm/listas/por-colegio GET] Cursos con listas:', cursosConListas.length)

    // Agrupar por colegio
    const colegiosMap = new Map<string, any>()

    cursosConListas.forEach((curso: any) => {
      const attrs = curso.attributes || curso
      const colegioData = attrs.colegio?.data || attrs.colegio
      
      if (!colegioData) return

      const colegioId = colegioData.id || colegioData.documentId
      const colegioAttrs = colegioData.attributes || colegioData
      
      // Obtener datos del colegio
      const comunaData = colegioAttrs?.comuna?.data || colegioAttrs?.comuna
      const comunaAttrs = comunaData?.attributes || comunaData
      
      if (!colegiosMap.has(colegioId)) {
        // Debug: ver qué datos tiene el colegio
        debugLog('[API /crm/listas/por-colegio] Datos del colegio:', {
          id: colegioId,
          nombre: colegioAttrs?.colegio_nombre,
          comuna: comunaAttrs?.comuna_nombre,
          matriculados: colegioAttrs?.total_matriculados || colegioAttrs?.matriculados,
          telefono: colegioAttrs?.telefono,
          email: colegioAttrs?.email,
        })
        
        // Obtener dirección
        const direccionData = colegioAttrs?.direcciones?.data?.[0] || colegioAttrs?.direcciones?.[0]
        const direccionAttrs = direccionData?.attributes || direccionData
        const direccionCompleta = direccionAttrs?.direccion_completa || direccionAttrs?.direccion || ''
        
        colegiosMap.set(colegioId, {
          id: colegioId,
          documentId: colegioData.documentId || String(colegioId),
          nombre: colegioAttrs?.colegio_nombre || '',
          rbd: colegioAttrs?.rbd || null,
          // Usar provincia como fallback si no hay comuna
          comuna: comunaAttrs?.comuna_nombre || colegioAttrs?.provincia || colegioAttrs?.comuna || '',
          region: colegioAttrs?.region || comunaAttrs?.region_nombre || '',
          direccion: direccionCompleta,
          telefono: colegioAttrs?.telefono || colegioAttrs?.telefono_principal || '',
          email: colegioAttrs?.email || colegioAttrs?.email_principal || '',
          // Buscar matriculados en diferentes posibles campos
          total_matriculados: colegioAttrs?.total_matriculados || 
                              colegioAttrs?.matriculados || 
                              colegioAttrs?.cantidad_matriculados || 
                              null, // Cambiado a null para diferenciarlo de 0
          cursos: [],
          updatedAt: curso.updatedAt || curso.attributes?.updatedAt || new Date().toISOString(),
        })
      }

      // Agregar curso al colegio
      const colegio = colegiosMap.get(colegioId)
      const versiones = attrs.versiones_materiales || []
      const ultimaVersion = versiones.length > 0 ? versiones[versiones.length - 1] : null
      const materiales = ultimaVersion?.materiales || []
      
      colegio.cursos.push({
        id: curso.id || curso.documentId,
        documentId: curso.documentId || String(curso.id),
        nombre: attrs.nombre_curso || '',
        nivel: attrs.nivel || '',
        grado: attrs.grado || 0,
        año: attrs.anio || attrs.año || new Date().getFullYear(),
        cantidadVersiones: versiones.length,
        cantidadProductos: materiales.length,
        versiones: versiones.length, // Mantener por compatibilidad
        materiales: materiales.length, // Mantener por compatibilidad
        matriculados: attrs.matricula || 0, // Campo correcto según Strapi: "matricula"
        pdf_id: ultimaVersion?.pdf_id || null,
        pdf_url: ultimaVersion?.pdf_url || null,
        updatedAt: curso.updatedAt || curso.attributes?.updatedAt || null,
      })

      // Actualizar fecha de última actualización del colegio
      const cursoDate = new Date(curso.updatedAt || curso.attributes?.updatedAt || 0)
      const colegioDate = new Date(colegio.updatedAt)
      if (cursoDate > colegioDate) {
        colegio.updatedAt = curso.updatedAt || curso.attributes?.updatedAt
      }
    })

    // Convertir a array y calcular totales
    const colegios = Array.from(colegiosMap.values()).map(colegio => {
      const totalPDFs = colegio.cursos.filter((c: any) => c.pdf_id).length
      const totalVersiones = colegio.cursos.reduce((sum: number, c: any) => sum + c.versiones, 0)
      // Calcular total de matriculados sumando todos los cursos (campo "matricula" en Strapi)
      const totalMatriculados = colegio.cursos.reduce((sum: number, c: any) => sum + (c.matriculados || 0), 0)
      
      return {
        ...colegio,
        total_matriculados: totalMatriculados, // Suma de matriculados de todos los cursos
        cantidadCursos: colegio.cursos.length,
        cantidadPDFs: totalPDFs,
        cantidadListas: totalVersiones,
      }
    })

    debugLog('[API /crm/listas/por-colegio GET] Colegios agrupados:', colegios.length)

    return NextResponse.json({
      success: true,
      data: colegios,
      count: colegios.length,
    }, { status: 200 })
  } catch (error: any) {
    debugLog('[API /crm/listas/por-colegio GET] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener colegios',
      },
      { status: 500 }
    )
  }
}
