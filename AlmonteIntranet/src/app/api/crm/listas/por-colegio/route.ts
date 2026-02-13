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
    
    // Populate solo para relaciones. versiones_materiales es campo JSON en Strapi, NO relación → no usar populate (evita "Invalid key versiones_materiales")
    filters.push('populate[colegio][populate][comuna]=true')
    filters.push('populate[colegio][populate][direcciones]=true')
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
      
      // Verificar si versiones_materiales es un array válido con elementos
      let tieneVersiones = false
      
      if (Array.isArray(versiones)) {
        // Filtrar solo versiones activas (activo !== false)
        const versionesActivas = versiones.filter((v: any) => v.activo !== false)
        
        // Verificar que el array tenga elementos activos y que no esté vacío
        // IMPORTANTE: Una versión es válida si tiene al menos un elemento activo en el array
        // No importa si tiene materiales o no, solo que exista la versión activa
        tieneVersiones = versionesActivas.length > 0
        
        // Debug: Verificar estructura de versiones para RBD 24508
        const colegioData = attrs.colegio?.data || attrs.colegio
        const colegioAttrs = colegioData?.attributes || colegioData
        const rbd = colegioAttrs?.rbd
        if (rbd === 24508 || rbd === '24508' || Number(rbd) === 24508) {
          debugLog(`[API /crm/listas/por-colegio GET] 🔍 Curso RBD 24508:`, {
            cursoId: curso.id || curso.documentId,
            nombre: attrs.nombre_curso,
            colegio: colegioAttrs?.colegio_nombre,
            rbd: rbd,
            tieneVersiones: tieneVersiones,
            cantidadVersiones: versionesActivas.length,
            cantidadVersionesTotal: versiones.length,
            primeraVersion: versiones[0] ? {
              id: versiones[0].id,
              nombre: versiones[0].nombre_archivo,
              tienePDF: !!(versiones[0].pdf_url && versiones[0].pdf_id),
              tieneMateriales: !!(versiones[0].materiales && versiones[0].materiales.length > 0),
              cantidadMateriales: versiones[0].materiales?.length || 0,
            } : null,
          })
        }
      } else if (versiones && typeof versiones === 'object') {
        // Si es un objeto, intentar convertirlo a array
        const versionesArray = Object.values(versiones)
        tieneVersiones = versionesArray.length > 0
        debugLog(`[API /crm/listas/por-colegio GET] ⚠️ versiones_materiales es objeto, convirtiendo a array:`, {
          cursoId: curso.id || curso.documentId,
          cantidad: versionesArray.length,
        })
      }
      
      // Debug: Log cursos sin versiones para diagnosticar
      if (!tieneVersiones) {
        const colegioData = attrs.colegio?.data || attrs.colegio
        const colegioAttrs = colegioData?.attributes || colegioData
        const rbd = colegioAttrs?.rbd
        if (rbd === 24508 || rbd === '24508' || Number(rbd) === 24508) {
          debugLog(`[API /crm/listas/por-colegio GET] ⚠️ Curso sin versiones para RBD 24508:`, {
            cursoId: curso.id || curso.documentId,
            nombre: attrs.nombre_curso,
            colegio: colegioAttrs?.colegio_nombre,
            rbd: rbd,
            versiones: versiones,
            tipoVersiones: typeof versiones,
            esArray: Array.isArray(versiones),
            esObjeto: typeof versiones === 'object' && versiones !== null,
            keys: typeof versiones === 'object' && versiones !== null ? Object.keys(versiones) : [],
          })
        }
      }
      
      return tieneVersiones
    })

    debugLog('[API /crm/listas/por-colegio GET] Cursos con listas:', cursosConListas.length)

    // Agrupar por colegio
    const colegiosMap = new Map<string, any>()

    // Debug: Verificar si hay cursos del colegio RBD 24508
    const cursosRBD24508 = cursos.filter((curso: any) => {
      const attrs = curso.attributes || curso
      const colegioData = attrs.colegio?.data || attrs.colegio
      const colegioAttrs = colegioData?.attributes || colegioData
      const rbd = colegioAttrs?.rbd
      return rbd === 24508 || rbd === '24508'
    })
    
    if (cursosRBD24508.length > 0) {
      debugLog(`[API /crm/listas/por-colegio GET] 🔍 Encontrados ${cursosRBD24508.length} cursos para RBD 24508`)
      cursosRBD24508.forEach((curso: any) => {
        const attrs = curso.attributes || curso
        const versiones = attrs.versiones_materiales || []
        debugLog(`[API /crm/listas/por-colegio GET] Curso RBD 24508:`, {
          id: curso.id || curso.documentId,
          nombre: attrs.nombre_curso,
          tieneVersiones: Array.isArray(versiones) && versiones.length > 0,
          cantidadVersiones: Array.isArray(versiones) ? versiones.length : 'NO ES ARRAY',
          tipoVersiones: typeof versiones,
        })
      })
    }

    // Agrupar solo cursos con listas
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
      // Filtrar solo versiones activas (activo !== false)
      const versionesActivas = versiones.filter((v: any) => v.activo !== false)
      // Ordenar por fecha y obtener la última versión activa
      const versionesOrdenadas = [...versionesActivas].sort((a: any, b: any) => {
        const fechaA = new Date(a.fecha_actualizacion || a.fecha_subida || 0).getTime()
        const fechaB = new Date(b.fecha_actualizacion || b.fecha_subida || 0).getTime()
        return fechaB - fechaA
      })
      const ultimaVersion = versionesOrdenadas.length > 0 ? versionesOrdenadas[0] : null
      const materiales = ultimaVersion?.materiales || []
      const estadoRevision = attrs.estado_revision ?? ultimaVersion?.metadata?.estado_revision ?? null
      
      colegio.cursos.push({
        id: curso.id || curso.documentId,
        documentId: curso.documentId || String(curso.id),
        nombre: attrs.nombre_curso || '',
        nivel: attrs.nivel || '',
        grado: attrs.grado || 0,
        año: attrs.anio || attrs.año || new Date().getFullYear(),
        cantidadVersiones: versionesActivas.length, // Solo contar versiones activas
        cantidadProductos: materiales.length,
        versiones: versionesActivas.length, // Mantener por compatibilidad
        materiales: materiales.length, // Mantener por compatibilidad
        matriculados: attrs.matricula || 0, // Campo correcto según Strapi: "matricula"
        pdf_id: ultimaVersion?.pdf_id || null,
        pdf_url: ultimaVersion?.pdf_url || null,
        updatedAt: curso.updatedAt || curso.attributes?.updatedAt || null,
        estado_revision: estadoRevision,
        fecha_revision: attrs.fecha_revision ?? curso.fecha_revision ?? null,
        fecha_publicacion: attrs.fecha_publicacion ?? curso.fecha_publicacion ?? null,
      })

      // Actualizar fecha de última actualización del colegio
      const cursoDate = new Date(curso.updatedAt || curso.attributes?.updatedAt || 0)
      const colegioDate = new Date(colegio.updatedAt)
      if (cursoDate > colegioDate) {
        colegio.updatedAt = curso.updatedAt || curso.attributes?.updatedAt
      }
    })

    // Convertir a array y calcular totales
    const colegios = await Promise.all(
      Array.from(colegiosMap.values()).map(async (colegio) => {
        const totalPDFs = colegio.cursos.filter((c: any) => c.pdf_id).length
        const totalVersiones = colegio.cursos.reduce((sum: number, c: any) => sum + c.versiones, 0)
        
        // Calcular matrícula consultando TODOS los cursos del colegio (no solo los limitados)
        let totalMatriculados = 0
        
        if (colegio.rbd) {
          try {
            const cursosResponse = await strapiClient.get<any>(
              `/api/cursos?filters[colegio][rbd][$eq]=${colegio.rbd}&fields[0]=matricula&pagination[pageSize]=1000`
            )
            
            const todosCursos = Array.isArray(cursosResponse.data) ? cursosResponse.data : [cursosResponse.data]
            
            totalMatriculados = todosCursos.reduce((sum: number, curso: any) => {
              const attrs = curso.attributes || curso
              const matricula = attrs.matricula || 0
              return sum + Number(matricula)
            }, 0)
            
            debugLog(`[API /crm/listas/por-colegio GET] Colegio ${colegio.nombre} (RBD: ${colegio.rbd}): ${totalMatriculados} estudiantes (de ${todosCursos.length} cursos)`)
          } catch (error) {
            debugLog(`[API /crm/listas/por-colegio GET] Error calculando matrícula para ${colegio.nombre}:`, error)
          }
        }
        
        return {
          ...colegio,
          total_matriculados: totalMatriculados, // Suma de TODOS los cursos del colegio
          cantidadCursos: colegio.cursos.length,
          cantidadPDFs: totalPDFs,
          cantidadListas: totalVersiones,
        }
      })
    )

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
