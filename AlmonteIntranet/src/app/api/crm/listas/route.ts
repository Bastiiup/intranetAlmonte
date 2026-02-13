/**
 * API Route para obtener cursos que tienen PDFs (listas de útiles)
 * GET /api/crm/listas
 * 
 * Las "listas" son cursos que tienen versiones de materiales (PDFs) subidos
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

const DEBUG = true // Forzar DEBUG para ver logs
const debugLog = (...args: any[]) => {
  if (DEBUG) {
    console.log(...args)
  }
}

/**
 * GET /api/crm/listas
 * Obtiene todos los cursos que tienen al menos una versión de materiales (PDF) subida
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const colegioId = searchParams.get('colegioId')
    const nivel = searchParams.get('nivel')
    const grado = searchParams.get('grado')
    const año = searchParams.get('año') || searchParams.get('ano')
    // Ignorar parámetro 't' que se usa para evitar caché
    const _ = searchParams.get('t')

    debugLog('[API /crm/listas GET] Obteniendo cursos con PDFs...')

    // Construir filtros
    const filters: string[] = []
    
    // Filtrar solo cursos que tienen versiones_materiales (PDFs)
    // En Strapi, necesitamos obtener todos los cursos y filtrar en el código
    // porque no hay un filtro directo para "tiene versiones_materiales"
    
    if (colegioId) {
      filters.push(`filters[colegio][id][$eq]=${colegioId}`)
    }
    if (nivel) {
      filters.push(`filters[nivel][$eq]=${encodeURIComponent(nivel)}`)
    }
    if (grado) {
      filters.push(`filters[grado][$eq]=${grado}`)
    }
    if (año) {
      filters.push(`filters[anio][$eq]=${año}`)
    }

    // ⚡ IMPORTANTE: Agregar paginación para obtener cursos recientes
    filters.push('pagination[pageSize]=500') // Límite razonable para evitar timeout
    filters.push('pagination[page]=1')
    
    // ⚡ ORDENAR: Por fecha de actualización descendente para obtener los más recientes primero
    filters.push('sort[0]=updatedAt:desc')
    
    // ⚡ SIMPLIFICADO: No usar fields[] para obtener TODOS los campos del curso
    // Esto evita problemas donde Strapi no devuelve cursos que no tienen todos los fields especificados
    filters.push('populate[colegio][populate][comuna]=true')
    filters.push('populate[colegio][populate][direcciones]=true')
    filters.push('populate[colegio][populate][telefonos]=true')
    filters.push('publicationState=preview')

    const queryString = filters.length > 0 ? `?${filters.join('&')}` : '?populate[colegio]=true&fields[0]=versiones_materiales&publicationState=preview'

    debugLog('[API /crm/listas GET] Query:', queryString)

    // Agregar timestamp para evitar caché en Strapi
    const cacheBuster = queryString.includes('?') ? `&_t=${Date.now()}` : `?_t=${Date.now()}`
    const finalQuery = `${queryString}${cacheBuster}`

    let response: any
    try {
      response = await strapiClient.get<StrapiResponse<StrapiEntity<any>[]>>(
        `/api/cursos${finalQuery}`
      )
    } catch (strapiError: any) {
      debugLog('[API /crm/listas GET] ❌ Error al obtener cursos de Strapi:', {
        error: strapiError.message,
        status: strapiError.status,
        response: strapiError.response?.data || strapiError.data,
      })
      return NextResponse.json(
        {
          success: false,
          error: `Error al obtener cursos de Strapi: ${strapiError.message || 'Error desconocido'}`,
          details: strapiError.response?.data || strapiError.data,
        },
        { status: strapiError.status || 500 }
      )
    }

    if (!response || !response.data) {
      debugLog('[API /crm/listas GET] ⚠️ Respuesta vacía de Strapi')
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
      }, { status: 200 })
    }

    const cursos = Array.isArray(response.data) ? response.data : [response.data]
    
    console.log('[API /crm/listas GET] ===============================================')
    console.log('[API /crm/listas GET] Total de cursos obtenidos de Strapi:', cursos.length)
    console.log('[API /crm/listas GET] IDs de cursos:', cursos.map((c: any) => c.id || c.documentId).join(', '))
    console.log('[API /crm/listas GET] ===============================================')
    
    // LOG MUY DETALLADO: Inspeccionar los primeros 3 cursos
    cursos.slice(0, 3).forEach((curso: any, index: number) => {
      const attrs = curso.attributes || curso
      const versiones = attrs.versiones_materiales
      debugLog(`[API /crm/listas GET] 🔍 Curso ${index + 1}:`, {
        id: curso.id || curso.documentId,
        nombre: attrs.nombre_curso,
        año: attrs.año || attrs.anio,
        tieneVersionesMateriales: !!versiones,
        esArray: Array.isArray(versiones),
        cantidadVersiones: Array.isArray(versiones) ? versiones.length : 0,
        primeraVersion: Array.isArray(versiones) && versiones.length > 0 ? {
          id: versiones[0].id,
          nombre: versiones[0].nombre_archivo,
          tieneMateriales: !!versiones[0].materiales,
          cantidadMateriales: versiones[0].materiales?.length || 0,
          primerMaterial: versiones[0].materiales?.[0] || null,
        } : null,
      })
    })

    // Filtrar solo los cursos que tienen al menos una versión de materiales
    // También verificar que el curso tenga un ID válido (los eliminados pueden no tenerlo)
    const cursosConPDFs = cursos.filter((curso: any) => {
      // Verificar que el curso tenga un ID válido
      if (!curso.id && !curso.documentId) {
        debugLog('[API /crm/listas GET] ❌ Curso sin ID válido filtrado:', curso)
        return false
      }
      
      const attrs = curso.attributes || curso
      const versiones = attrs.versiones_materiales || []
      
      const tieneMateriales = Array.isArray(versiones) && versiones.length > 0
      
      // Loggear TODOS los cursos (con y sin materiales)
      if (tieneMateriales) {
        debugLog('[API /crm/listas GET] ✅ Curso CON materiales:', {
          id: curso.id || curso.documentId,
          nombre: attrs.nombre_curso,
          cantidadVersiones: versiones.length,
          versionInfo: versiones[0] ? {
            tieneMateriales: !!versiones[0].materiales,
            cantidadMateriales: versiones[0].materiales?.length || 0,
            tienePDF: !!versiones[0].pdf_id,
          } : null,
        })
      } else {
        debugLog('[API /crm/listas GET] ⚠️ Curso SIN materiales (filtrado):', {
          id: curso.id || curso.documentId,
          nombre: attrs.nombre_curso,
          tieneVersiones: !!versiones,
          esArray: Array.isArray(versiones),
          cantidadVersiones: versiones?.length || 0,
        })
      }
      
      return tieneMateriales
    })

    debugLog('[API /crm/listas GET] ✅ Cursos con PDFs encontrados:', cursosConPDFs.length)
    debugLog('[API /crm/listas GET] IDs de cursos con PDFs:', cursosConPDFs.map((c: any) => c.id || c.documentId))
    
    // Log detallado de los primeros 3 cursos con sus materiales
    cursosConPDFs.slice(0, 3).forEach((curso: any, index: number) => {
      const attrs = curso.attributes || curso
      const versiones = attrs.versiones_materiales || []
      const ultimaVersion = versiones.length > 0 
        ? versiones.sort((a: any, b: any) => {
            const fechaA = new Date(a.fecha_actualizacion || a.fecha_subida || 0).getTime()
            const fechaB = new Date(b.fecha_actualizacion || b.fecha_subida || 0).getTime()
            return fechaB - fechaA
          })[0]
        : null
      
      debugLog(`[API /crm/listas GET] 📦 Curso ${index + 1} con materiales:`, {
        id: curso.id || curso.documentId,
        nombre: attrs.nombre_curso,
        totalVersiones: versiones.length,
        ultimaVersion: ultimaVersion ? {
          nombre: ultimaVersion.nombre_archivo,
          pdf_id: ultimaVersion.pdf_id,
          cantidadMateriales: ultimaVersion.materiales?.length || 0,
          primeros3Materiales: (ultimaVersion.materiales || []).slice(0, 3).map((m: any) => m.nombre),
        } : null,
      })
    })

    // Transformar a formato de "lista" para el frontend
    const listas = cursosConPDFs.map((curso: any, index: number) => {
      const attrs = curso.attributes || curso
      const versiones = attrs.versiones_materiales || []
      
      // LOG DETALLADO: Ver la estructura de versiones_materiales
      if (index < 3) {
        console.log(`[API /crm/listas GET] 🔍 Curso ${index + 1} - Estructura completa de versiones_materiales:`, {
          id: curso.id || curso.documentId,
          nombre: attrs.nombre_curso,
          tieneVersiones: !!versiones,
          esArray: Array.isArray(versiones),
          cantidadVersiones: versiones.length,
          versionesCompletas: JSON.stringify(versiones, null, 2).substring(0, 1000), // Primeros 1000 caracteres
        })
      }
      
      const ultimaVersion = versiones.length > 0 
        ? versiones.sort((a: any, b: any) => {
            const fechaA = new Date(a.fecha_actualizacion || a.fecha_subida || 0).getTime()
            const fechaB = new Date(b.fecha_actualizacion || b.fecha_subida || 0).getTime()
            return fechaB - fechaA
          })[0]
        : null

      const colegioData = attrs.colegio?.data || attrs.colegio
      const colegioAttrs = colegioData?.attributes || colegioData
      
      // Obtener datos del colegio (dirección, comuna, región, teléfono)
      const comunaData = colegioAttrs?.comuna?.data || colegioAttrs?.comuna
      const comunaAttrs = comunaData?.attributes || comunaData
      const direcciones = colegioAttrs?.direcciones || []
      const direccionPrincipal = direcciones.find((d: any) => 
        d.tipo_direccion === 'Principal' || d.tipo_direccion === 'Colegio'
      ) || direcciones[0]
      
      // Construir dirección completa
      let direccionStr = ''
      if (direccionPrincipal) {
        const nombreCalle = direccionPrincipal.nombre_calle || ''
        const numeroCalle = direccionPrincipal.numero_calle || ''
        const complemento = direccionPrincipal.complemento_direccion || ''
        const partes = [nombreCalle, numeroCalle, complemento].filter(Boolean)
        direccionStr = partes.join(' ').trim()
      }
      
      const comunaNombre = comunaAttrs?.comuna_nombre || ''
      const regionNombre = colegioAttrs?.region || comunaAttrs?.region_nombre || ''
      
      // Obtener teléfono principal
      const telefonos = colegioAttrs?.telefonos || []
      const telefonoPrincipal = telefonos.find((t: any) => t.principal === true) || telefonos[0]
      const telefonoStr = telefonoPrincipal?.telefono_raw || telefonoPrincipal?.telefono_norm || ''
      
      // Obtener fechas
      const createdAt = curso.createdAt || attrs.createdAt || null
      const updatedAt = curso.updatedAt || attrs.updatedAt || null

      // Simplificar: usar solo el nombre del curso sin paralelo
      const nombreCompleto = (attrs.nombre_curso || attrs.curso_nombre || 'Sin nombre').trim()

      return {
        id: curso.id || curso.documentId,
        documentId: curso.documentId || String(curso.id || ''),
        nombre: nombreCompleto,
        nivel: attrs.nivel || 'Basica',
        grado: parseInt(attrs.grado) || 1,
        año: attrs.año || attrs.ano || new Date().getFullYear(),
        descripcion: `Curso: ${nombreCompleto}`,
        activo: attrs.activo !== false,
        pdf_id: ultimaVersion?.pdf_id || null,
        pdf_url: ultimaVersion?.pdf_url || null,
        pdf_nombre: ultimaVersion?.nombre_archivo || ultimaVersion?.metadata?.nombre || null,
        colegio: colegioData ? {
          id: colegioData.id || colegioData.documentId,
          nombre: colegioAttrs?.colegio_nombre || '',
          rbd: colegioAttrs?.rbd || null,
          direccion: direccionStr,
          comuna: comunaNombre,
          region: regionNombre,
          telefono: telefonoStr,
        } : null,
        createdAt: createdAt,
        updatedAt: updatedAt,
        curso: {
          id: curso.id || curso.documentId,
          nombre: nombreCompleto,
        },
        materiales: ultimaVersion?.materiales || [],
        versiones: versiones.length,
      }
    })

    return NextResponse.json({
      success: true,
      data: listas,
      count: listas.length,
    }, { status: 200 })
  } catch (error: any) {
    debugLog('[API /crm/listas GET] ❌ Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener listas',
      },
      { status: 500 }
    )
  }
}
