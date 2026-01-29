/**
 * API Route para obtener colegios con conteo de listas por año
 * GET /api/crm/listas/por-colegio
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

// Caché simple en memoria (se resetea al reiniciar el servidor)
let cache: {
  data: any[] | null
  timestamp: number
  colegiosCount: number
} | null = null

const CACHE_TTL = 10 * 60 * 1000 // 10 minutos de caché (aumentado para mejor rendimiento)

const DEBUG = process.env.NODE_ENV === 'development' || process.env.DEBUG_CRM === 'true'
const debugLog = (...args: any[]) => {
  if (DEBUG) {
    console.log(...args)
  }
}

/**
 * Normaliza el campo matrícula de un curso
 * En Strapi v5, cuando se usa fields selector, matrícula puede estar en:
 * - nivel raíz: curso.matricula
 * - attributes: curso.attributes.matricula
 * - _matricula: curso._matricula (campo procesado)
 * 
 * Esta función busca en todas las ubicaciones y retorna un número o null
 */
function normalizeMatricula(curso: any): number | null {
  // Buscar matrícula en múltiples ubicaciones (prioridad: _matricula > attributes > raíz)
  const matricula = 
    curso._matricula ?? 
    curso.attributes?.matricula ?? 
    curso.matricula ?? 
    null;
  
  // Convertir a número o null
  if (matricula === null || matricula === undefined) return null;
  const num = Number(matricula);
  return isNaN(num) ? null : num;
}

/**
 * GET /api/crm/listas/por-colegio
 * Obtiene todos los colegios con conteo de listas por año
 */
export async function GET(request: NextRequest) {
  const requestStartTime = Date.now()
  try {
    console.log('[API /crm/listas/por-colegio GET] 🚀 Inicio de request')
    
    // Verificar si hay caché válido
    const now = Date.now()
    const useCache = request.nextUrl.searchParams.get('cache') !== 'false'
    
    if (cache && useCache && (now - cache.timestamp) < CACHE_TTL) {
      const cacheAge = Math.round((now - cache.timestamp) / 1000)
      console.log(`[API /crm/listas/por-colegio GET] ✅ Usando caché (${cacheAge}s de antigüedad)`)
      debugLog(`[API /crm/listas/por-colegio GET] ✅ Usando caché (${cacheAge}s de antigüedad)`)
      return NextResponse.json({
        success: true,
        data: cache.data,
        total: cache.data.length,
        cached: true,
        diagnostic: {
          totalCursos: cache.data.reduce((sum: number, c: any) => sum + (c.cursos?.length || 0), 0),
          cursosConVersiones: 0,
          cursosConPDFs: 0,
        },
      }, { status: 200 })
    }
    
    console.log('[API /crm/listas/por-colegio GET] 📡 No hay caché válido, obteniendo datos de Strapi...')
    console.log('[API /crm/listas/por-colegio GET] 📡 No hay caché válido, obteniendo datos de Strapi...')
    debugLog('[API /crm/listas/por-colegio GET] Obteniendo colegios con conteo de listas...')

    // Obtener todos los cursos con versiones de materiales
    // SOLUCIÓN según análisis de Strapi:
    // 1. NO hacer populate de comuna (el colegio RBD 10479 no tiene comuna y esto causa que se omitan cursos)
    // 2. Usar fields explícito en lugar de populate completo
    // 3. Recorrer TODAS las páginas (los cursos del RBD 10479 están al final, ~página 500+)
    
    let allCursos: any[] = []
    let currentPage = 1
    const maxPages = 1000 // Límite de seguridad
    let totalProcessed = 0
    let response: any
    let usingOptimizedEndpoint = false // Variable compartida para todas las páginas
    
    try {
      // ✅ SOLUCIÓN: Intentar usar endpoint optimizado, con fallback automático al estándar
      // El endpoint /api/cursos/optimized puede no estar disponible aún, así que tenemos fallback
      
      let firstPageResponse: any
      
      // Intentar endpoint optimizado primero
      const optimizedQuery = new URLSearchParams({
        'publicationState': 'preview',
        'pagination[page]': '1',
        'pagination[pageSize]': '1000',
        'sort[0]': 'id:asc'
      })
      
      try {
        console.log('[API /crm/listas/por-colegio GET] 📡 Intentando endpoint optimizado: /api/cursos/optimized')
        firstPageResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>[]>>(
          `/api/cursos/optimized?${optimizedQuery.toString()}`
        )
        usingOptimizedEndpoint = true
        console.log('[API /crm/listas/por-colegio GET] ✅ Primera página obtenida exitosamente del endpoint optimizado')
      } catch (queryError: any) {
        // Si el endpoint optimizado no existe (404) o hay error de permisos (403), usar endpoint estándar
        if (queryError.status === 404 || queryError.status === 403) {
          console.warn('[API /crm/listas/por-colegio GET] ⚠️ Endpoint optimizado no disponible (status:', queryError.status, '), usando endpoint estándar')
          console.warn('[API /crm/listas/por-colegio GET] ℹ️  Nota: El endpoint /api/cursos/optimized aún no está desplegado en Strapi')
          
          // Construir query estándar con fields y populate
          const standardFilters: string[] = []
          standardFilters.push('populate[colegio][fields][0]=rbd')
          standardFilters.push('populate[colegio][fields][1]=colegio_nombre')
          standardFilters.push('populate[colegio][fields][2]=region')
          standardFilters.push('populate[colegio][fields][3]=provincia')
          standardFilters.push('populate[colegio][fields][4]=dependencia')
          standardFilters.push('fields[0]=nombre_curso')
          standardFilters.push('fields[1]=grado')
          standardFilters.push('fields[2]=nivel')
          standardFilters.push('publicationState=preview')
          standardFilters.push('pagination[page]=1')
          standardFilters.push('pagination[pageSize]=1000')
          standardFilters.push('sort[0]=id:asc')
          
          const standardQuery = `?${standardFilters.join('&')}`
          
          try {
            firstPageResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>[]>>(
              `/api/cursos${standardQuery}`
            )
            console.log('[API /crm/listas/por-colegio GET] ✅ Primera página obtenida exitosamente del endpoint estándar')
          } catch (standardError: any) {
            console.error('[API /crm/listas/por-colegio GET] ❌ Error en consulta estándar a Strapi:', {
              status: standardError.status,
              statusText: standardError.statusText,
              message: standardError.message,
            })
            throw standardError
          }
        } else {
          // Si es otro error, lanzarlo
          console.error('[API /crm/listas/por-colegio GET] ❌ Error en consulta a Strapi:', {
            status: queryError.status,
            statusText: queryError.statusText,
            message: queryError.message,
            url: `/api/cursos/optimized?${optimizedQuery.toString().substring(0, 200)}...`,
          })
          throw queryError
        }
      }
      
      const firstPageCursos = Array.isArray(firstPageResponse.data) ? firstPageResponse.data : (firstPageResponse.data ? [firstPageResponse.data] : [])
      allCursos.push(...firstPageCursos)
      totalProcessed += firstPageCursos.length
      
      const totalPages = firstPageResponse.meta?.pagination?.pageCount || 1
      console.log(`[API /crm/listas/por-colegio GET] 📊 Total de páginas: ${totalPages} (${firstPageResponse.meta?.pagination?.total || 0} cursos en total)`)
      debugLog(`[API /crm/listas/por-colegio GET] 📊 Total de páginas: ${totalPages} (${firstPageResponse.meta?.pagination?.total || 0} cursos en total)`)
      debugLog(`[API /crm/listas/por-colegio GET] ✅ Página 1/${totalPages}: ${firstPageCursos.length} cursos`)
      
      // OPTIMIZACIÓN: Procesar páginas en paralelo en batches para acelerar
      // Procesar 5 páginas a la vez para balancear velocidad y carga del servidor
      if (totalPages > 1) {
        const batchSize = 5 // Procesar 5 páginas en paralelo
        const batches: number[][] = []
        
        // Crear batches de páginas
        for (let i = 2; i <= totalPages && i <= maxPages; i += batchSize) {
          const batch = []
          for (let j = i; j < i + batchSize && j <= totalPages && j <= maxPages; j++) {
            batch.push(j)
          }
          batches.push(batch)
        }
        
        console.log(`[API /crm/listas/por-colegio GET] 📦 Procesando ${batches.length} batches de ${batchSize} páginas cada uno`)
        
        // Procesar batches secuencialmente, pero páginas dentro de cada batch en paralelo
        for (const batch of batches) {
          const batchStartTime = Date.now()
          
          const pagePromises = batch.map(async (page) => {
            try {
              let pageResponse: any
              
              if (usingOptimizedEndpoint) {
                // Intentar usar endpoint optimizado
                const pageQuery = new URLSearchParams({
                  'publicationState': 'preview',
                  'pagination[page]': page.toString(),
                  'pagination[pageSize]': '1000',
                  'sort[0]': 'id:asc'
                })
                
                try {
                  pageResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>[]>>(
                    `/api/cursos/optimized?${pageQuery.toString()}`
                  )
                } catch (optimizedError: any) {
                  // Si falla con 404/403, cambiar a estándar
                  if (optimizedError.status === 404 || optimizedError.status === 403) {
                    usingOptimizedEndpoint = false
                    // Continuar con endpoint estándar abajo
                  } else {
                    throw optimizedError
                  }
                }
              }
              
              // Si no estamos usando optimizado (o falló), usar estándar
              if (!usingOptimizedEndpoint) {
                const pageFilters: string[] = []
                pageFilters.push('populate[colegio][fields][0]=rbd')
                pageFilters.push('populate[colegio][fields][1]=colegio_nombre')
                pageFilters.push('populate[colegio][fields][2]=region')
                pageFilters.push('populate[colegio][fields][3]=provincia')
                pageFilters.push('populate[colegio][fields][4]=dependencia')
                pageFilters.push('fields[0]=nombre_curso')
                pageFilters.push('fields[1]=grado')
                pageFilters.push('fields[2]=nivel')
                pageFilters.push('publicationState=preview')
                pageFilters.push(`pagination[page]=${page}`)
                pageFilters.push('pagination[pageSize]=1000')
                pageFilters.push('sort[0]=id:asc')
                
                const pageQuery = `?${pageFilters.join('&')}`
                
                pageResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>[]>>(
                  `/api/cursos${pageQuery}`
                )
              }
              
              const cursosPage = Array.isArray(pageResponse.data) ? pageResponse.data : (pageResponse.data ? [pageResponse.data] : [])
              return { page, cursos: cursosPage, success: true }
            } catch (error: any) {
              console.error(`[API /crm/listas/por-colegio GET] ❌ Error en página ${page}:`, error.message)
              return { page, cursos: [], success: false }
            }
          })
          
          const batchResults = await Promise.all(pagePromises)
          
          // Agregar cursos obtenidos
          for (const result of batchResults) {
            if (result.success) {
              allCursos.push(...result.cursos)
              totalProcessed += result.cursos.length
            }
          }
          
          const batchTime = Date.now() - batchStartTime
          const lastPageInBatch = batch[batch.length - 1]
          console.log(`[API /crm/listas/por-colegio GET] ✅ Batch completado: páginas ${batch[0]}-${lastPageInBatch}/${totalPages} (${batchResults.reduce((sum, r) => sum + r.cursos.length, 0)} cursos en ${batchTime}ms)`)
        }
      }
      
      console.log(`[API /crm/listas/por-colegio GET] 📊 Total de cursos obtenidos: ${allCursos.length}`)
      debugLog(`[API /crm/listas/por-colegio GET] 📊 Total de cursos obtenidos: ${allCursos.length}`)
      
      // Usar todos los cursos obtenidos
      response = { data: allCursos, meta: { pagination: { total: allCursos.length } } }
    } catch (strapiError: any) {
      const errorDetails = {
        message: strapiError.message,
        status: strapiError.status,
        statusText: strapiError.statusText,
        data: strapiError.data,
        details: strapiError.details,
        responseText: strapiError.responseText,
        url: strapiError.response?.url || 'N/A',
      }
      
      console.error('[API /crm/listas/por-colegio GET] ❌ Error al obtener cursos de Strapi:', errorDetails)
      debugLog('[API /crm/listas/por-colegio GET] ❌ Error al obtener cursos de Strapi:', errorDetails)
      
      // Si es un 404, puede ser que la URL de Strapi no sea correcta
      if (strapiError.status === 404) {
        console.error('[API /crm/listas/por-colegio GET] ⚠️ 404 Not Found - Verificar URL de Strapi')
        debugLog('[API /crm/listas/por-colegio GET] ⚠️ 404 Not Found - Verificar URL de Strapi')
      }
      
      return NextResponse.json(
        {
          success: false,
          error: `Error al obtener cursos de Strapi: ${strapiError.message || 'Error desconocido'}`,
          details: errorDetails,
        },
        { status: strapiError.status || 500 }
      )
    }

    if (!response || !response.data) {
      debugLog('[API /crm/listas/por-colegio GET] ⚠️ Respuesta vacía de Strapi')
      return NextResponse.json({
        success: true,
        data: [],
        total: 0,
        diagnostic: {
          totalCursos: 0,
          cursosConVersiones: 0,
          cursosConPDFs: 0,
        },
      }, { status: 200 })
    }

    const cursos = Array.isArray(response.data) ? response.data : (response.data ? [response.data] : [])

    debugLog('[API /crm/listas/por-colegio GET] Total cursos encontrados:', cursos.length)
    
    // Verificar directamente en Strapi si hay cursos del RBD 10479
    try {
      const directCheck = await strapiClient.get<StrapiResponse<StrapiEntity<any>[]>>(
        `/api/cursos?filters[colegio][rbd][$eq]=10479&populate[colegio]=true&publicationState=preview&pagination[pageSize]=100`
      )
      const cursosDirectos = Array.isArray(directCheck.data) ? directCheck.data : (directCheck.data ? [directCheck.data] : [])
      debugLog('[API /crm/listas/por-colegio GET] 🔍 Consulta directa RBD 10479:', {
        cantidad: cursosDirectos.length,
        primeros3: cursosDirectos.slice(0, 3).map((c: any) => {
          const attrs = c?.attributes || c
          return {
            cursoId: c.id || c.documentId,
            nombre: attrs.nombre_curso || c.nombre_curso,
          }
        }),
      })
    } catch (directError: any) {
      debugLog('[API /crm/listas/por-colegio GET] ❌ Error en consulta directa RBD 10479:', directError.message)
    }
    
    // Buscar específicamente cursos del colegio RBD 10479 en la respuesta de Strapi
    const cursosRBD10479 = cursos.filter((c: any) => {
      const attrs = c?.attributes || c
      const colegio = attrs.colegio?.data || attrs.colegio || c.colegio?.data || c.colegio
      const colegioAttrs = colegio?.attributes || colegio
      const rbd = colegioAttrs?.rbd || colegio?.rbd
      return rbd === '10479' || rbd === 10479
    })
    
    if (cursosRBD10479.length > 0) {
      debugLog('[API /crm/listas/por-colegio GET] 🔍 Cursos del colegio RBD 10479 encontrados en respuesta de Strapi:', cursosRBD10479.length)
      cursosRBD10479.slice(0, 5).forEach((c: any, idx: number) => {
        const attrs = c?.attributes || c
        const colegio = attrs.colegio?.data || attrs.colegio || c.colegio?.data || c.colegio
        const colegioAttrs = colegio?.attributes || colegio
        debugLog(`[API /crm/listas/por-colegio GET]   Curso ${idx + 1}:`, {
          cursoId: c.id || c.documentId,
          nombre: attrs.nombre_curso || c.nombre_curso,
          tieneVersiones: 'versiones_materiales' in attrs || 'versiones_materiales' in c,
          tieneColegio: !!colegio,
          colegioRBD: colegioAttrs?.rbd || colegio?.rbd,
          colegioNombre: colegioAttrs?.colegio_nombre || colegio?.colegio_nombre,
        })
      })
    } else {
      debugLog('[API /crm/listas/por-colegio GET] ⚠️ NO se encontraron cursos del colegio RBD 10479 en la respuesta de Strapi')
      debugLog('[API /crm/listas/por-colegio GET] Verificando primeros 5 cursos para ver estructura:', cursos.slice(0, 5).map((c: any) => {
        const attrs = c?.attributes || c
        const colegio = attrs.colegio?.data || attrs.colegio || c.colegio?.data || c.colegio
        const colegioAttrs = colegio?.attributes || colegio
        return {
          cursoId: c.id || c.documentId,
          nombre: attrs.nombre_curso || c.nombre_curso,
          tieneColegio: !!colegio,
          colegioRBD: colegioAttrs?.rbd || colegio?.rbd,
        }
      }))
    }
    
    // Verificar si el primer curso tiene el campo versiones_materiales
    if (cursos.length > 0) {
      const primerCurso = cursos[0]
      const attrs = (primerCurso as any)?.attributes || primerCurso
      // Extraer solo los datos necesarios para evitar referencias circulares
      const versiones = attrs.versiones_materiales || primerCurso.versiones_materiales
      const versionesInfo = Array.isArray(versiones) ? {
        cantidad: versiones.length,
        primeraVersion: versiones[0] ? {
          id: versiones[0].id,
          pdf_id: versiones[0].pdf_id,
          pdf_url: versiones[0].pdf_url ? versiones[0].pdf_url.substring(0, 50) + '...' : null,
          tieneMateriales: Array.isArray(versiones[0].materiales) && versiones[0].materiales.length > 0,
        } : null,
      } : { cantidad: 0, primeraVersion: null }
      
      console.log('[API /crm/listas/por-colegio GET] 🔍 Estructura del primer curso:', {
        cursoId: primerCurso.id || primerCurso.documentId,
        tieneAttributes: !!primerCurso.attributes,
        keys: Object.keys(attrs).slice(0, 30),
        tieneVersionesMaterialesEnAttrs: 'versiones_materiales' in attrs,
        tieneVersionesMaterialesEnCurso: 'versiones_materiales' in primerCurso,
        tipoVersionesMateriales: typeof attrs.versiones_materiales || typeof primerCurso.versiones_materiales,
        esArray: Array.isArray(versiones),
        versionesInfo,
      })
    }
    
    // Log detallado de los primeros cursos para diagnóstico
    if (cursos.length > 0) {
      // Analizar los primeros 10 cursos para ver su estructura
      const cursosAnalizados = cursos.slice(0, 10)
      cursosAnalizados.forEach((curso: any, index: number) => {
        const attrs = (curso as any)?.attributes || curso
        const versiones = attrs.versiones_materiales || curso.versiones_materiales || []
        const tienePDFs = Array.isArray(versiones) && versiones.some((v: any) => v.pdf_id || v.pdf_url)
        
        // Extraer solo los datos necesarios para evitar referencias circulares
        const versionesInfo = Array.isArray(versiones) && versiones.length > 0 ? {
          cantidad: versiones.length,
          primeraVersion: versiones[0] ? {
            id: versiones[0].id,
            pdf_id: versiones[0].pdf_id,
            pdf_url: versiones[0].pdf_url ? versiones[0].pdf_url.substring(0, 50) + '...' : null,
            tieneMateriales: Array.isArray(versiones[0].materiales) && versiones[0].materiales.length > 0,
          } : null,
        } : { cantidad: 0, primeraVersion: null }
        
        // Verificar si tiene matrícula
        const tieneMatricula = 'matricula' in attrs || 'matricula' in curso
        const matriculaValue = attrs.matricula !== undefined ? attrs.matricula : curso.matricula
        
        // Log detallado de la estructura
        console.log(`[API /crm/listas/por-colegio GET] 🔍 Curso ${index + 1}:`, {
          id: curso.id || curso.documentId,
          documentId: curso.documentId,
          nombre: attrs.nombre_curso || attrs.curso_nombre || curso.nombre_curso,
          tieneAttributes: !!curso.attributes,
          tieneVersionesEnAttrs: 'versiones_materiales' in attrs,
          tieneVersionesEnCurso: 'versiones_materiales' in curso,
          tipoVersionesAttrs: typeof attrs.versiones_materiales,
          tipoVersionesCurso: typeof curso.versiones_materiales,
          esArray: Array.isArray(versiones),
          cantidadVersiones: Array.isArray(versiones) ? versiones.length : 0,
          tienePDFs,
          versionesInfo,
          colegioNombre: attrs.colegio?.data?.attributes?.colegio_nombre || attrs.colegio?.attributes?.colegio_nombre || curso.colegio?.data?.attributes?.colegio_nombre || 'Sin colegio',
          tieneMatricula,
          matriculaValue,
          matriculaType: typeof matriculaValue,
          attrsKeys: attrs ? Object.keys(attrs).slice(0, 15) : [],
        })
      })
      
      // Contar cuántos tienen versiones
      const conVersiones = cursos.filter((c: any) => {
        const attrs = (c as any)?.attributes || c
        const versiones = attrs.versiones_materiales || []
        return Array.isArray(versiones) && versiones.length > 0
      }).length
      
      console.log(`[API /crm/listas/por-colegio GET] 📊 Resumen: ${conVersiones} de ${cursos.length} cursos tienen versiones_materiales`)
    } else if (cursos.length === 0) {
      debugLog('[API /crm/listas/por-colegio GET] ⚠️ No se encontraron cursos. Esto puede significar:')
      debugLog('  1. No hay cursos en Strapi')
      debugLog('  2. Los cursos no tienen versiones_materiales')
      debugLog('  3. Las versiones_materiales no tienen PDFs')
    }

    // Agrupar cursos por colegio
    const colegiosMap = new Map<string | number, {
      colegio: any
      cursos: any[]
      listasPorAño: {
        2024: number
        2025: number
        2026: number
        2027: number
        [key: number]: number
      }
    }>()

    // Verificar si se quiere mostrar TODOS los cursos (incluidos sin PDFs)
    const mostrarTodos = request.nextUrl.searchParams.get('mostrarTodos') === 'true'
    console.log(`[API /crm/listas/por-colegio GET] 📋 Modo de filtrado: ${mostrarTodos ? '🔓 MOSTRAR TODOS (incluidos sin PDFs)' : '🔒 SOLO CON PDFs'}`)
    
    // OPTIMIZACIÓN AGRESIVA: Pre-filtrar cursos antes de procesarlos completamente
    // Esto reduce significativamente el tiempo de procesamiento
    const inicioFiltrado = Date.now()
    console.log(`[API /crm/listas/por-colegio GET] 🔍 Pre-filtrando cursos con versiones_materiales de ${cursos.length} cursos totales...`)
    
    // Pre-filtrar cursos que definitivamente tienen versiones_materiales con PDFs
    // Si mostrarTodos=true, NO filtrar (mostrar todos los cursos)
    const cursosConVersiones = mostrarTodos ? cursos : cursos.filter((curso: any) => {
      const attrs = (curso as any)?.attributes || curso
      const tienePropiedadEnAttrs = 'versiones_materiales' in attrs
      const tienePropiedadEnCurso = 'versiones_materiales' in curso
      
      if (!tienePropiedadEnAttrs && !tienePropiedadEnCurso) {
        return false
      }
      
      const versionesRaw = tienePropiedadEnAttrs ? attrs.versiones_materiales : (tienePropiedadEnCurso ? curso.versiones_materiales : null)
      
      // Filtrar null, undefined, arrays vacíos, objetos vacíos
      if (versionesRaw === null || versionesRaw === undefined) return false
      if (Array.isArray(versionesRaw) && versionesRaw.length === 0) return false
      if (typeof versionesRaw === 'object' && !Array.isArray(versionesRaw) && Object.keys(versionesRaw).length === 0) return false
      
      // Verificar rápidamente si tiene al menos un PDF (sin procesar completamente)
      if (Array.isArray(versionesRaw)) {
        const tienePDF = versionesRaw.some((v: any) => v.pdf_id || v.pdf_url)
        if (!tienePDF) return false
      }
      
      return true
    })
    
    const preFiltradoTime = Date.now() - inicioFiltrado
    console.log(`[API /crm/listas/por-colegio GET] ✅ Pre-filtrado completado en ${preFiltradoTime}ms: ${cursosConVersiones.length} de ${cursos.length} cursos tienen versiones_materiales con PDFs`)
    
    // DEBUG: Si no hay cursos después del filtrado, mostrar por qué
    if (cursosConVersiones.length === 0 && cursos.length > 0) {
      console.log('[API /crm/listas/por-colegio GET] ⚠️ NINGÚN curso pasó el pre-filtrado. Analizando primeros 5 cursos:')
      cursos.slice(0, 5).forEach((curso: any, idx: number) => {
        const attrs = (curso as any)?.attributes || curso
        const tienePropiedadEnAttrs = 'versiones_materiales' in attrs
        const tienePropiedadEnCurso = 'versiones_materiales' in curso
        const versionesRaw = tienePropiedadEnAttrs ? attrs.versiones_materiales : (tienePropiedadEnCurso ? curso.versiones_materiales : null)
        
        console.log(`  Curso ${idx + 1}:`, {
          id: curso.id,
          nombre: attrs.nombre_curso || curso.nombre_curso,
          tienePropiedadEnAttrs,
          tienePropiedadEnCurso,
          versionesRawType: typeof versionesRaw,
          versionesRawIsArray: Array.isArray(versionesRaw),
          versionesRawLength: Array.isArray(versionesRaw) ? versionesRaw.length : 'N/A',
          versionesRaw: versionesRaw ? JSON.stringify(versionesRaw).substring(0, 200) : 'null/undefined',
        })
      })
    }
    
    // Log de cursos que pasaron el pre-filtrado
    console.log(`[API /crm/listas/por-colegio GET] 📝 Cursos que pasaron pre-filtrado (${cursosConVersiones.length}):`)
    cursosConVersiones.slice(0, 10).forEach((c: any, idx: number) => {
      const attrs = (c as any)?.attributes || c
      const colegio = attrs.colegio?.data || attrs.colegio || c.colegio?.data || c.colegio
      console.log(`  ${idx + 1}. ID: ${c.id}, Nombre: ${attrs.nombre_curso || c.nombre_curso}, Colegio: ${colegio ? 'SÍ' : 'NO'}, ColegioID: ${colegio?.id || colegio?.documentId || 'N/A'}`)
    })
    
    // Procesar solo los cursos pre-filtrados
    for (const curso of cursosConVersiones) {
      const attrs = (curso as any)?.attributes || curso
      
      // Ya sabemos que tiene la propiedad, solo necesitamos obtenerla
      const tienePropiedadEnAttrs = 'versiones_materiales' in attrs
      const tienePropiedadEnCurso = 'versiones_materiales' in curso
      
      // Buscar versiones_materiales en ambos lugares
      const versionesRawAttrs = tienePropiedadEnAttrs ? attrs.versiones_materiales : undefined
      const versionesRawCurso = tienePropiedadEnCurso ? curso.versiones_materiales : undefined
      
      // Usar el que existe, priorizando attrs
      let versionesRaw = versionesRawAttrs !== undefined ? versionesRawAttrs : versionesRawCurso
      
      // Manejar diferentes formatos de versiones_materiales
      let versiones: any[] = []
      
      if (Array.isArray(versionesRaw)) {
        versiones = versionesRaw
      } else if (typeof versionesRaw === 'object') {
        const keys = Object.keys(versionesRaw)
        const numericKeys = keys.filter(k => !isNaN(Number(k)))
        if (numericKeys.length > 0) {
          versiones = numericKeys
            .sort((a, b) => Number(a) - Number(b))
            .map(k => versionesRaw[k])
            .filter(Boolean)
        } else {
          versiones = [versionesRaw]
        }
      } else if (typeof versionesRaw === 'string') {
        try {
          const parsed = JSON.parse(versionesRaw)
          versiones = Array.isArray(parsed) ? parsed : [parsed]
        } catch {
          versiones = [versionesRaw]
        }
      } else {
        versiones = [versionesRaw]
      }
      
      // OPTIMIZACIÓN: Verificar que tenga al menos un PDF antes de procesar el curso completo
      // Si mostrarTodos=true, NO filtrar por PDFs
      const tienePDFs = versiones.some((v: any) => v.pdf_id || v.pdf_url)
      if (!mostrarTodos && !tienePDFs) {
        continue // Saltar cursos sin PDFs (solo si no estamos en modo mostrarTodos)
      }
      
      // Log para cursos que pasan el filtro (tienen la propiedad) - solo en debug
      debugLog('[API /crm/listas/por-colegio GET] ✅ Curso con versiones_materiales incluido:', {
        cursoId: curso.id || curso.documentId,
        nombre: attrs.nombre_curso || curso.nombre_curso,
        versionesLength: versiones.length,
      })

      let colegioData = attrs.colegio?.data || attrs.colegio || curso.colegio?.data || curso.colegio
      let colegioAttrs = (colegioData as any)?.attributes || colegioData
      
      // Obtener ID del colegio - usar el ID numérico del colegio, no el RBD
      // El RBD puede no ser único o puede no existir
      let colegioId = colegioData?.id || colegioData?.documentId
      let colegioRBD = colegioAttrs?.rbd || colegioData?.rbd
      
      // Log detallado para TODOS los cursos que llegan aquí
      console.log(`[API /crm/listas/por-colegio GET] 🔍 Procesando curso:`, {
        cursoId: curso.id || curso.documentId,
        nombre: attrs.nombre_curso || curso.nombre_curso,
        tieneColegioData: !!colegioData,
        colegioId: colegioId || 'NO TIENE',
        colegioRBD: colegioRBD || 'NO TIENE',
        colegioNombre: colegioAttrs?.colegio_nombre || colegioData?.colegio_nombre || 'NO TIENE',
      })
      
      // Si el curso no tiene relación con el colegio, intentar crearla
      if (!colegioId) {
        console.log(`[API /crm/listas/por-colegio GET] ⚠️ Curso SIN colegio detectado:`, {
          cursoId: curso.id || curso.documentId,
          nombre: attrs.nombre_curso || curso.nombre_curso,
        })
        debugLog('[API /crm/listas/por-colegio GET] ⚠️ Curso sin relación con colegio detectado:', {
          cursoId: curso.id || curso.documentId,
          nombre: attrs.nombre_curso || curso.nombre_curso,
          tieneColegioEnAttrs: !!attrs.colegio,
          tieneColegioEnCurso: !!curso.colegio,
        })
        
        // Intentar buscar el colegio buscando cursos similares que sí tengan relación
        // Si encontramos un curso similar con relación, usamos ese colegio
        let colegioEncontrado = null
        const nombreCurso = attrs.nombre_curso || curso.nombre_curso || ''
        const nivelCurso = attrs.nivel || curso.nivel || ''
        const gradoCurso = attrs.grado || curso.grado || ''
        
        try {
          debugLog('[API /crm/listas/por-colegio GET] 🔍 Buscando colegio para curso sin relación:', {
            cursoId: curso.id || curso.documentId,
            nombre: nombreCurso,
            nivel: nivelCurso,
            grado: gradoCurso,
          })
          
          // Buscar cursos similares que sí tengan relación con colegio
          // Usar el nombre, nivel y grado para encontrar cursos similares
          const cursosSimilaresResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>[]>>(
            `/api/cursos?filters[nombre_curso][$containsi]=${encodeURIComponent(nombreCurso)}&populate[colegio]=true&publicationState=preview&pagination[pageSize]=10`
          )
          const cursosSimilares = Array.isArray(cursosSimilaresResponse.data) 
            ? cursosSimilaresResponse.data 
            : (cursosSimilaresResponse.data ? [cursosSimilaresResponse.data] : [])
          
          // Buscar un curso similar que tenga relación con colegio y coincida en nombre, nivel y grado
          const cursoSimilar = cursosSimilares.find((c: any) => {
            const cAttrs = c.attributes || c
            const cNombre = cAttrs.nombre_curso || c.nombre_curso || ''
            const cNivel = cAttrs.nivel || c.nivel || ''
            const cGrado = String(cAttrs.grado || c.grado || '')
            const cColegio = cAttrs.colegio?.data || cAttrs.colegio || c.colegio?.data || c.colegio
            
            return cColegio && 
                   cNombre.toLowerCase().includes(nombreCurso.toLowerCase().substring(0, 10)) &&
                   cNivel === nivelCurso &&
                   String(cGrado) === String(gradoCurso)
          })
          
          if (cursoSimilar) {
            const cAttrs = cursoSimilar.attributes || cursoSimilar
            const colegioRelacionado = cAttrs.colegio?.data || cAttrs.colegio || cursoSimilar.colegio?.data || cursoSimilar.colegio
            const colegioIdNum = colegioRelacionado?.id || colegioRelacionado?.documentId
            
            if (colegioIdNum) {
              debugLog('[API /crm/listas/por-colegio GET] ✅ Colegio encontrado por curso similar, creando relación:', {
                cursoId: curso.id || curso.documentId,
                colegioId: colegioIdNum,
                colegioNombre: (colegioRelacionado.attributes || colegioRelacionado)?.colegio_nombre,
              })
              
              // Actualizar el curso para agregar la relación con el colegio
              try {
                const updateResult = await strapiClient.put(`/api/cursos/${curso.id || curso.documentId}`, {
                  data: {
                    colegio: { connect: [colegioIdNum] },
                  },
                })
                
                debugLog('[API /crm/listas/por-colegio GET] ✅ Relación creada exitosamente')
                
                // Actualizar los datos del curso para continuar el procesamiento
                const colegioAttrsActualizado = colegioRelacionado.attributes || colegioRelacionado
                colegioData = colegioRelacionado
                colegioAttrs = colegioAttrsActualizado
                colegioId = colegioIdNum
                colegioRBD = colegioAttrsActualizado?.rbd || colegioRelacionado?.rbd
              } catch (updateError: any) {
                debugLog('[API /crm/listas/por-colegio GET] ❌ Error al crear relación:', {
                  error: updateError.message,
                  cursoId: curso.id || curso.documentId,
                  colegioId: colegioIdNum,
                })
              }
            }
          } else {
            debugLog('[API /crm/listas/por-colegio GET] ⚠️ No se encontró curso similar con relación')
          }
        } catch (searchError: any) {
          debugLog('[API /crm/listas/por-colegio GET] ❌ Error al buscar colegio por curso similar:', {
            error: searchError.message,
          })
        }
        
        // ⚠️ DESACTIVADO: No mapear automáticamente cursos sin colegio a RBD específicos
        // Esto causa que se junten todas las listas en un solo colegio
        // En su lugar, usar "Sin Colegio Asignado" o no mostrar
        if (!colegioId) {
          console.log('[API /crm/listas/por-colegio GET] ⚠️ Curso sin colegio detectado:', {
            cursoId: curso.id || curso.documentId,
            nombre: attrs.nombre_curso || curso.nombre_curso,
          })
          
          // OPCIÓN: Agrupar en "Sin Colegio Asignado"
          colegioId = 'sin-colegio'
          colegioRBD = 'N/A'
          colegioData = {
            id: 'sin-colegio',
            documentId: 'sin-colegio',
          }
          colegioAttrs = {
            colegio_nombre: 'Sin Colegio Asignado',
            rbd: 'N/A',
            region: 'N/A',
            provincia: 'N/A',
            comuna: 'N/A',
            dependencia: 'N/A',
          }
        }
      }
      
      // Log para cursos del colegio RBD 10479
      if (colegioRBD === '10479' || colegioRBD === 10479) {
        debugLog('[API /crm/listas/por-colegio GET] 🔍 Curso del colegio RBD 10479:', {
          cursoId: curso.id || curso.documentId,
          nombre: attrs.nombre_curso || curso.nombre_curso,
          colegioId,
          colegioRBD,
          colegioNombre: colegioAttrs?.colegio_nombre || colegioData?.colegio_nombre,
          tienePropiedad: tienePropiedadEnAttrs || tienePropiedadEnCurso,
          versionesLength: versiones.length,
          tieneColegioData: !!colegioData,
          tieneColegioAttrs: !!colegioAttrs,
        })
      }
      
      // Log para ver qué colegios tienen los cursos que se están procesando
      // (solo los primeros 5 para no saturar los logs)
      const cursoIndex = cursos.findIndex((c: any) => (c.id || c.documentId) === (curso.id || curso.documentId))
      if (cursoIndex < 5) {
        debugLog('[API /crm/listas/por-colegio GET] 📊 Curso procesado:', {
          index: cursoIndex,
          cursoId: curso.id || curso.documentId,
          nombre: attrs.nombre_curso || curso.nombre_curso,
          colegioId,
          colegioRBD,
          colegioNombre: colegioAttrs?.colegio_nombre || colegioData?.colegio_nombre || 'Sin nombre',
          tieneColegio: !!colegioData,
          tieneColegioAttrs: !!colegioAttrs,
        })
      }

      // Obtener año del curso
      const año = attrs.año || attrs.ano || new Date().getFullYear()
      
      // Obtener fecha de actualización del PDF más reciente
      let fechaPDFMasReciente: string | null = null
      if (versiones && Array.isArray(versiones) && versiones.length > 0) {
        const versionesConPDF = versiones.filter((v: any) => v.pdf_id || v.pdf_url)
        if (versionesConPDF.length > 0) {
          // Ordenar por fecha de subida o actualización (más reciente primero)
          const versionesOrdenadas = [...versionesConPDF].sort((a: any, b: any) => {
            const fechaA = a.fecha_subida || a.updatedAt || a.createdAt || ''
            const fechaB = b.fecha_subida || b.updatedAt || b.createdAt || ''
            if (!fechaA && !fechaB) return 0
            if (!fechaA) return 1
            if (!fechaB) return -1
            return new Date(fechaB).getTime() - new Date(fechaA).getTime()
          })
          fechaPDFMasReciente = versionesOrdenadas[0].fecha_subida || 
                                versionesOrdenadas[0].updatedAt || 
                                versionesOrdenadas[0].createdAt || null
        }
      }

      if (!colegiosMap.has(colegioId)) {
        // Obtener representante - puede estar en diferentes lugares
        const representante = colegioAttrs?.representante || 
                             colegioData?.representante || 
                             colegioAttrs?.representante_comercial ||
                             colegioData?.representante_comercial || ''

        colegiosMap.set(colegioId, {
          colegio: {
            id: colegioData?.id || colegioData?.documentId,
            documentId: colegioData?.documentId || colegioData?.id,
            nombre: colegioAttrs?.colegio_nombre || colegioAttrs?.nombre || colegioData?.colegio_nombre || colegioData?.nombre || 'Sin nombre',
            rbd: colegioAttrs?.rbd || colegioData?.rbd || '',
            direccion: (() => {
              // Intentar obtener dirección de diferentes fuentes
              // 1. Campo direccion directo
              if (colegioAttrs?.direccion) return colegioAttrs.direccion
              if (colegioData?.direccion) return colegioData.direccion
              
              // 2. Construir desde array de direcciones
              const direcciones = colegioAttrs?.direcciones || colegioData?.direcciones
              if (direcciones && Array.isArray(direcciones) && direcciones.length > 0) {
                const primeraDireccion = direcciones[0]
                const attrsDir = (primeraDireccion as any)?.attributes || primeraDireccion
                
                // Construir dirección completa desde campos
                const partes: string[] = []
                if (attrsDir?.nombre_calle) partes.push(attrsDir.nombre_calle)
                if (attrsDir?.numero_calle) partes.push(attrsDir.numero_calle)
                if (attrsDir?.complemento_direccion) partes.push(attrsDir.complemento_direccion)
                
                if (partes.length > 0) {
                  return partes.join(' ')
                }
                
                // Si tiene campo direccion en el objeto
                if (attrsDir?.direccion) return attrsDir.direccion
              }
              
              return ''
            })(),
            region: colegioAttrs?.region || colegioData?.region || '',
            comuna: colegioAttrs?.comuna?.comuna_nombre || 
                   (typeof colegioAttrs?.comuna === 'string' ? colegioAttrs.comuna : '') ||
                   colegioData?.comuna?.comuna_nombre || 
                   (typeof colegioData?.comuna === 'string' ? colegioData.comuna : '') || '',
            representante: representante,
            ultimaActualizacion: '',
          },
          cursos: [],
          listasPorAño: {} as { [key: number]: number }
        })
      }

      const colegioInfo = colegiosMap.get(colegioId)!
      
      // SOLUCIÓN 2: Normalizar matrícula usando función helper
      // Esta función busca en todas las ubicaciones posibles y retorna número o null
      const matricula = normalizeMatricula(curso)
      
      // Debug: Log para colegios específicos y cursos sin matrícula
      if (colegioRBD === '10479' || colegioRBD === 10479 || colegioRBD === '12605' || colegioRBD === 12605 || !matricula) {
        console.log('[API /crm/listas/por-colegio GET] 🔍 Matrícula del curso:', {
          cursoId: curso.id || curso.documentId,
          nombre: attrs.nombre_curso || curso.nombre_curso,
          tieneAttrs: !!attrs,
          attrsKeys: attrs ? Object.keys(attrs).filter(k => k.includes('matricula') || k.includes('Matricula')) : [],
          attrsMatricula: attrs.matricula,
          attrsMatriculaType: typeof attrs.matricula,
          cursoMatricula: curso.matricula,
          cursoMatriculaType: typeof curso.matricula,
          attributesMatricula: curso.attributes?.matricula,
          attributesMatriculaType: typeof curso.attributes?.matricula,
          matriculaFinal: matricula,
          tipoMatricula: typeof matricula,
          rawCurso: {
            id: curso.id,
            documentId: curso.documentId,
            hasAttributes: !!curso.attributes,
            keys: curso.attributes ? Object.keys(curso.attributes).slice(0, 10) : [],
          }
        })
      }
      
      // Normalizar estructura del curso antes de guardarlo
      // Asegurar que attributes.matricula siempre esté presente sin romper relaciones anidadas
      try {
        const cursoNormalizado: any = {
          id: curso.id,
          documentId: curso.documentId,
        }
        
        // Copiar attributes de forma segura
        if (curso.attributes) {
          cursoNormalizado.attributes = {
            ...curso.attributes,
            // ✅ Matrícula SIEMPRE normalizada en attributes.matricula
            matricula: matricula !== null && matricula !== undefined ? Number(matricula) : null,
          }
        } else {
          // Si no hay attributes, crearlos con los datos básicos
          cursoNormalizado.attributes = {
            nombre_curso: attrs.nombre_curso ?? curso.nombre_curso,
            grado: attrs.grado ?? curso.grado,
            nivel: attrs.nivel ?? curso.nivel,
            anio: attrs.anio ?? attrs.año ?? curso.anio ?? curso.año ?? año,
            versiones_materiales: attrs.versiones_materiales ?? curso.versiones_materiales,
            matricula: matricula !== null && matricula !== undefined ? Number(matricula) : null,
          }
        }
        
        // Copiar otros campos del curso original si existen
        if (curso.colegio) cursoNormalizado.colegio = curso.colegio
        if (curso.createdAt) cursoNormalizado.createdAt = curso.createdAt
        if (curso.updatedAt) cursoNormalizado.updatedAt = curso.updatedAt
        
        // Campos auxiliares para procesamiento
        cursoNormalizado._año = año
        cursoNormalizado._grado = attrs.grado || 1
        cursoNormalizado._nivel = attrs.nivel || 'Basica'
        cursoNormalizado._fechaPDF = fechaPDFMasReciente
        cursoNormalizado._matricula = matricula // Mantener también en _matricula para compatibilidad
        
        // Guardar el curso normalizado
        colegioInfo.cursos.push(cursoNormalizado)
      } catch (normalizeError: any) {
        console.error('[API /crm/listas/por-colegio GET] ❌ Error al normalizar curso:', {
          error: normalizeError.message,
          cursoId: curso.id || curso.documentId,
          cursoKeys: Object.keys(curso).slice(0, 10),
        })
        // En caso de error, guardar el curso original con campos auxiliares
        colegioInfo.cursos.push({
          ...curso,
          _año: año,
          _grado: attrs.grado || 1,
          _nivel: attrs.nivel || 'Basica',
          _fechaPDF: fechaPDFMasReciente,
          _matricula: matricula,
        })
      }
      
      // Actualizar fecha de última actualización del colegio (la más reciente de los PDFs)
      if (fechaPDFMasReciente) {
        const fechaPDF = new Date(fechaPDFMasReciente).getTime()
        const fechaActual = colegioInfo.colegio.ultimaActualizacion 
          ? new Date(colegioInfo.colegio.ultimaActualizacion).getTime()
          : 0
        
        if (fechaPDF > fechaActual) {
          colegioInfo.colegio.ultimaActualizacion = fechaPDFMasReciente
        }
      }

      // Contar listas por año (cada curso cuenta como una lista)
      // Incluir cualquier año razonable (desde 2020 en adelante)
      if (año >= 2020 && año <= 2030) {
        if (!colegioInfo.listasPorAño[año]) {
          colegioInfo.listasPorAño[año] = 0
        }
        colegioInfo.listasPorAño[año]++
      } else {
        // Si el año no está en el rango, usar el año actual como fallback
        const añoActual = new Date().getFullYear()
        if (!colegioInfo.listasPorAño[añoActual]) {
          colegioInfo.listasPorAño[añoActual] = 0
        }
        colegioInfo.listasPorAño[añoActual]++
      }
    }

    // Log de estadísticas de procesamiento
    const tiempoProcesamiento = Date.now() - inicioFiltrado
    console.log(`[API /crm/listas/por-colegio GET] ✅ Procesamiento completado: ${colegiosMap.size} colegios encontrados (${tiempoProcesamiento}ms)`)
    
    // Convertir a array y calcular matrícula total
    debugLog('[API /crm/listas/por-colegio GET] 🔄 Convirtiendo colegiosMap a array...')
    debugLog('[API /crm/listas/por-colegio GET] 📊 Tamaño de colegiosMap:', colegiosMap.size)
    
    const colegiosConListas = Array.from(colegiosMap.values()).map((info) => {
      // SOLUCIÓN 2: Calcular matrícula total usando función de normalización
      const matriculaTotal = info.cursos.reduce((sum, curso) => {
        const matricula = normalizeMatricula(curso) ?? 0
        
        // Debug para colegios específicos
        if (info.colegio.rbd === '10479' || info.colegio.rbd === 10479 || info.colegio.rbd === '12605' || info.colegio.rbd === 12605) {
          console.log('[API /crm/listas/por-colegio GET] 🔍 Calculando matrícula total:', {
            colegioRBD: info.colegio.rbd,
            cursoId: curso.id || curso.documentId,
            _matricula: curso._matricula,
            cursoMatricula: curso.matricula,
            attributesMatricula: curso.attributes?.matricula,
            matriculaNormalizada: matricula,
            sumaAcumulada: sum + matricula,
          })
        }
        
        return sum + matricula
      }, 0)
      
      // Debug para colegios específicos
      if (info.colegio.rbd === '10479' || info.colegio.rbd === 10479 || info.colegio.rbd === '12605' || info.colegio.rbd === 12605) {
        console.log('[API /crm/listas/por-colegio GET] ✅ Matrícula total calculada:', {
          colegioRBD: info.colegio.rbd,
          colegioNombre: info.colegio.nombre,
          totalCursos: info.cursos.length,
          matriculaTotal,
        })
      }
      
      const colegioResultado = {
        ...info.colegio,
        listas2024: info.listasPorAño[2024] || 0,
        listas2025: info.listasPorAño[2025] || 0,
        listas2026: info.listasPorAño[2026] || 0,
        listas2027: info.listasPorAño[2027] || 0,
        totalListas: Object.values(info.listasPorAño).reduce((sum, count) => sum + count, 0),
        matriculaTotal,
        cursos: info.cursos,
      }
      
      // Log para debugging del colegio con RBD 10479
      if (colegioResultado.rbd === '10479' || colegioResultado.rbd === 10479) {
        debugLog('[API /crm/listas/por-colegio GET] 🎯 Colegio RBD 10479 encontrado:', {
          id: colegioResultado.id,
          documentId: colegioResultado.documentId,
          nombre: colegioResultado.nombre,
          rbd: colegioResultado.rbd,
          totalListas: colegioResultado.totalListas,
          cantidadCursos: colegioResultado.cursos.length,
          listasPorAño: info.listasPorAño,
        })
      }
      
      return colegioResultado
    })

    debugLog('[API /crm/listas/por-colegio GET] 📊 Colegios con listas procesados:', colegiosConListas.length)
    debugLog('[API /crm/listas/por-colegio GET] 📋 Primeros 5 colegios:', colegiosConListas.slice(0, 5).map((c: any) => ({
      id: c.id,
      nombre: c.nombre,
      rbd: c.rbd,
      totalListas: c.totalListas,
      cantidadCursos: c.cursos?.length || 0,
      matriculaTotal: c.matriculaTotal,
    })))
    
    // Buscar específicamente el colegio con RBD 10479 en los resultados
    const colegio10479 = colegiosConListas.find((c: any) => c.rbd === '10479' || c.rbd === 10479)
    if (colegio10479) {
      debugLog('[API /crm/listas/por-colegio GET] ✅ Colegio RBD 10479 ENCONTRADO en resultados:', {
        id: colegio10479.id,
        documentId: colegio10479.documentId,
        nombre: colegio10479.nombre,
        rbd: colegio10479.rbd,
        totalListas: colegio10479.totalListas,
        cantidadCursos: colegio10479.cursos?.length || 0,
      })
    } else {
      debugLog('[API /crm/listas/por-colegio GET] ❌ Colegio RBD 10479 NO encontrado en resultados')
      debugLog('[API /crm/listas/por-colegio GET] RBDs encontrados:', colegiosConListas.map((c: any) => ({
        rbd: c.rbd,
        nombre: c.nombre,
        cantidadCursos: c.cursos?.length || 0,
      })).slice(0, 10))
    }
    
    if (colegiosConListas.length === 0) {
      debugLog('[API /crm/listas/por-colegio GET] ⚠️ No hay colegios con listas. Posibles causas:')
      debugLog('  - No hay cursos con versiones_materiales que tengan PDFs')
      debugLog('  - Los cursos no están relacionados con colegios')
      debugLog('  - Los PDFs no están en el formato esperado (pdf_id o pdf_url)')
    }

    // Calcular estadísticas de diagnóstico
    const totalCursosConVersiones = cursos.filter((c: any) => {
      const attrs = (c as any)?.attributes || c
      const versiones = attrs.versiones_materiales || []
      return Array.isArray(versiones) && versiones.length > 0
    }).length
    
    const totalCursosConPDFs = cursos.filter((c: any) => {
      const attrs = (c as any)?.attributes || c
      const versiones = attrs.versiones_materiales || []
      return versiones.some((v: any) => v.pdf_id || v.pdf_url)
    }).length

    // Guardar en caché solo si no se pidió bypass
    const shouldCache = request.nextUrl.searchParams.get('cache') !== 'false'
    
    if (shouldCache) {
      cache = {
        data: colegiosConListas,
        timestamp: Date.now(),
        colegiosCount: colegiosConListas.length,
      }
      debugLog(`[API /crm/listas/por-colegio GET] 💾 Resultados guardados en caché (${colegiosConListas.length} colegios)`)
    } else {
      // Limpiar caché si se pidió bypass
      cache = null
      console.log('[API /crm/listas/por-colegio GET] 🗑️ Caché limpiado por solicitud')
    }
    
    const totalTime = Date.now() - requestStartTime
    console.log(`[API /crm/listas/por-colegio GET] ✅ Request completado en ${totalTime}ms`)
    console.log(`[API /crm/listas/por-colegio GET] 📊 Enviando ${colegiosConListas.length} colegios`)
    
    const responseData = {
      success: true,
      data: colegiosConListas,
      total: colegiosConListas.length,
      cached: false,
      diagnostic: {
        totalCursos: cursos.length,
        cursosConVersiones: totalCursosConVersiones,
        cursosConPDFs: totalCursosConPDFs,
      },
    }
    
    debugLog('[API /crm/listas/por-colegio GET] 📤 Enviando respuesta:', {
      success: responseData.success,
      total: responseData.total,
      dataLength: responseData.data.length,
      primeros3Nombres: responseData.data.slice(0, 3).map((c: any) => c.nombre),
      tiempoTotal: `${totalTime}ms`,
    })
    
    // Validar que los datos se pueden serializar antes de enviar
    try {
      const testSerialization = JSON.stringify(responseData.data.slice(0, 1))
      console.log('[API /crm/listas/por-colegio GET] ✅ Datos serializables correctamente')
    } catch (serializeError: any) {
      console.error('[API /crm/listas/por-colegio GET] ❌ Error al serializar datos:', {
        message: serializeError.message,
        name: serializeError.name,
      })
      // Limpiar datos problemáticos antes de enviar
      const cleanedData = colegiosConListas.map((colegio: any) => {
        const cleaned = {
          id: colegio.id,
          documentId: colegio.documentId,
          nombre: colegio.nombre,
          rbd: colegio.rbd,
          region: colegio.region,
          provincia: colegio.provincia,
          comuna: colegio.comuna,
          direccion: colegio.direccion,
          telefonos: colegio.telefonos,
          emails: colegio.emails,
          totalListas: colegio.totalListas,
          matriculaTotal: colegio.matriculaTotal,
          listasPorAño: colegio.listasPorAño,
          ultimaActualizacion: colegio.ultimaActualizacion,
          cursos: colegio.cursos?.map((curso: any) => ({
            id: curso.id,
            documentId: curso.documentId,
            attributes: {
              nombre_curso: curso.attributes?.nombre_curso,
              grado: curso.attributes?.grado,
              nivel: curso.attributes?.nivel,
              anio: curso.attributes?.anio,
              matricula: curso.attributes?.matricula ?? curso._matricula,
              versiones_materiales: curso.attributes?.versiones_materiales,
            },
            _año: curso._año,
            _grado: curso._grado,
            _nivel: curso._nivel,
            _matricula: curso._matricula,
          })) || [],
        }
        return cleaned
      })
      
      return NextResponse.json({
        success: true,
        data: cleanedData,
        total: cleanedData.length,
        cached: false,
        diagnostic: responseData.diagnostic,
      }, { status: 200 })
    }
    
    return NextResponse.json(responseData, { status: 200 })
  } catch (error: any) {
    const errorMessage = error.message || 'Error al obtener colegios con listas'
    const errorStack = error.stack || 'No stack trace'
    
    console.error('[API /crm/listas/por-colegio GET] ❌ Error completo:', {
      message: errorMessage,
      name: error.name,
      stack: errorStack,
      error: error,
    })
    
    debugLog('[API /crm/listas/por-colegio GET] ❌ Error:', {
      message: errorMessage,
      name: error.name,
      stack: errorStack.substring(0, 500),
    })
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? {
          name: error.name,
          stack: errorStack.substring(0, 1000),
        } : undefined,
      },
      { status: 500 }
    )
  }
}
