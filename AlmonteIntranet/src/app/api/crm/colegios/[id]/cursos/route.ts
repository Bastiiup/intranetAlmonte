/**
 * API Route para gestionar cursos de un colegio
 * GET, POST /api/crm/colegios/[id]/cursos
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'
import { normalizarCursoStrapi, obtenerUltimaVersion } from '@/lib/utils/strapi'

export const dynamic = 'force-dynamic'

// Helper para logs condicionales
const DEBUG = process.env.NODE_ENV === 'development' || process.env.DEBUG_CRM === 'true'
const debugLog = (...args: any[]) => {
  if (DEBUG) {
    console.log(...args)
  }
}

interface CursoAttributes {
  nombre_curso?: string // ✅ Campo correcto en Strapi
  curso_nombre?: string // Mantener por compatibilidad
  titulo?: string // Campo existente en Strapi
  nivel?: string
  grado?: string
  paralelo?: string
  año?: number // Año del curso
  activo?: boolean
  colegio?: any
  lista_utiles?: any // Relación manyToOne
  materiales?: Array<{
    material_nombre?: string
    tipo?: string
    cantidad?: number
    obligatorio?: boolean
    descripcion?: string
  }>
}

/**
 * GET /api/crm/colegios/[id]/cursos
 * Obtiene los cursos de un colegio específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: colegioId } = await params
    debugLog('[API /crm/colegios/[id]/cursos GET] Buscando cursos para colegio:', colegioId)

    // Obtener el ID numérico del colegio si es documentId
    const isDocumentId = typeof colegioId === 'string' && !/^\d+$/.test(colegioId)
    let colegioIdNum: number | string = colegioId

    if (isDocumentId) {
      try {
        const colegioResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
          `/api/colegios/${colegioId}?fields=id`
        )
        const colegioData = Array.isArray(colegioResponse.data) ? colegioResponse.data[0] : colegioResponse.data
        if (colegioData && typeof colegioData === 'object' && 'id' in colegioData) {
          colegioIdNum = colegioData.id as number
          debugLog('[API /crm/colegios/[id]/cursos GET] ID numérico del colegio:', colegioIdNum)
        }
      } catch (error: any) {
        console.error('[API /crm/colegios/[id]/cursos GET] Error obteniendo ID del colegio:', error)
        return NextResponse.json(
          { success: false, error: 'Colegio no encontrado' },
          { status: 404 }
        )
      }
    }

    // Buscar cursos del colegio
    // Estrategia simplificada: NO intentar populate anidado desde el principio
    // porque causa error 500 en Strapi
    // IMPORTANTE: Como cursos tiene draftAndPublish: true, necesitamos publicationState=preview
    // para incluir cursos en estado "Draft"
    let response: any
    try {
      // Paso 1: Obtener cursos con populate básico (sin populate anidado)
      // IMPORTANTE: NO usar fields[] específicos para que Strapi devuelva TODOS los campos, incluyendo estado_revision
      const paramsObj = new URLSearchParams({
        'filters[colegio][id][$eq]': String(colegioIdNum),
        'populate[materiales]': 'true',
        'populate[lista_utiles]': 'true', // Solo el ID de lista_utiles, sin materiales anidados
        'populate[colegio]': 'true', // Incluir colegio para obtener el nombre
        // NO especificar fields[] para obtener TODOS los campos, incluyendo estado_revision, fecha_revision, fecha_publicacion
        'publicationState': 'preview', // Incluir drafts y publicados
      })
      response = await strapiClient.get<StrapiResponse<StrapiEntity<CursoAttributes>[]>>(
        `/api/cursos?${paramsObj.toString()}`
      )
      debugLog('[API /crm/colegios/[id]/cursos GET] ✅ Cursos obtenidos con populate básico y publicationState=preview')
    } catch (error: any) {
      // Si falla, intentar sin lista_utiles
      if (error.status === 500 || error.status === 400 || error.status === 404) {
        debugLog('[API /crm/colegios/[id]/cursos GET] ⚠️ Error con populate básico, intentando sin lista_utiles')
        try {
          // NO usar fields[] específicos para obtener TODOS los campos
          const paramsObj = new URLSearchParams({
            'filters[colegio][id][$eq]': String(colegioIdNum),
            'populate[materiales]': 'true',
            'populate[colegio]': 'true',
            'publicationState': 'preview',
          })
          response = await strapiClient.get<StrapiResponse<StrapiEntity<CursoAttributes>[]>>(
            `/api/cursos?${paramsObj.toString()}`
          )
          debugLog('[API /crm/colegios/[id]/cursos GET] ✅ Cursos obtenidos sin lista_utiles')
        } catch (secondError: any) {
          // Si también falla, intentar solo campos básicos (sin populate)
          debugLog('[API /crm/colegios/[id]/cursos GET] ⚠️ Error también sin lista_utiles, intentando solo campos básicos')
          const paramsObj = new URLSearchParams({
            'filters[colegio][id][$eq]': String(colegioIdNum),
            'publicationState': 'preview',
          })
          response = await strapiClient.get<StrapiResponse<StrapiEntity<CursoAttributes>[]>>(
            `/api/cursos?${paramsObj.toString()}`
          )
          debugLog('[API /crm/colegios/[id]/cursos GET] ✅ Cursos obtenidos solo con campos básicos')
        }
      } else {
        // Si es otro tipo de error, propagarlo
        throw error
      }
    }

    const cursosRaw = Array.isArray(response.data) ? response.data : []

    // Normalizar cursos y extraer estado_revision desde metadata si no está en el campo directo
    const cursos = cursosRaw.map((curso: any) => {
      const cursoNormalizado = normalizarCursoStrapi(curso) || curso
      
      // Si no tiene estado_revision en el campo directo, buscar en metadata de la última versión
      if (!cursoNormalizado.estado_revision) {
        const versiones = cursoNormalizado.versiones_materiales || []
        const ultimaVersion = obtenerUltimaVersion(versiones)
        
        if (ultimaVersion?.metadata?.estado_revision) {
          cursoNormalizado.estado_revision = ultimaVersion.metadata.estado_revision
          debugLog(`[API /crm/colegios/[id]/cursos GET] ✅ Estado encontrado en metadata: ${ultimaVersion.metadata.estado_revision}`)
        }
      }
      
      return cursoNormalizado
    })

    // El año se manejará en el frontend mediante localStorage
    // No necesitamos extraerlo aquí ya que el frontend lo leerá de localStorage

    return NextResponse.json({
      success: true,
      data: cursos,
      meta: {
        total: cursos.length,
      },
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/colegios/[id]/cursos GET] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener cursos',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * POST /api/crm/colegios/[id]/cursos
 * Crea un nuevo curso para el colegio
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: colegioId } = await params
    const body = await request.json()

    debugLog('[API /crm/colegios/[id]/cursos POST] Creando curso para colegio:', colegioId)

    // Obtener el ID numérico del colegio (Strapi requiere ID numérico para relaciones manyToOne)
    const isDocumentId = typeof colegioId === 'string' && !/^\d+$/.test(colegioId)
    let colegioIdNum: number | null = null

    if (isDocumentId) {
      try {
        debugLog('[API /crm/colegios/[id]/cursos POST] Obteniendo ID numérico del colegio con documentId:', colegioId)
        const colegioResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
          `/api/colegios/${colegioId}?fields=id,documentId&publicationState=preview`
        )
        const colegioData = Array.isArray(colegioResponse.data) ? colegioResponse.data[0] : colegioResponse.data
        const colegioAttrs = colegioData?.attributes || colegioData
        
        if (colegioData && colegioAttrs) {
          colegioIdNum = colegioData.id || colegioAttrs.id || null
          debugLog('[API /crm/colegios/[id]/cursos POST] ID numérico obtenido:', colegioIdNum)
          
          if (!colegioIdNum) {
            throw new Error('No se pudo obtener el ID numérico del colegio')
          }
        } else {
          throw new Error('Colegio no encontrado en la respuesta')
        }
      } catch (error: any) {
        debugLog('[API /crm/colegios/[id]/cursos POST] ❌ Error obteniendo ID del colegio:', error)
        return NextResponse.json(
          { success: false, error: `Colegio no encontrado: ${error.message}` },
          { status: 404 }
        )
      }
    } else {
      // Si es un número, usarlo directamente
      colegioIdNum = typeof colegioId === 'number' ? colegioId : parseInt(String(colegioId))
      if (isNaN(colegioIdNum)) {
        return NextResponse.json(
          { success: false, error: 'ID de colegio inválido' },
          { status: 400 }
        )
      }
      debugLog('[API /crm/colegios/[id]/cursos POST] Usando ID numérico directamente:', colegioIdNum)
    }

    if (!colegioIdNum) {
      return NextResponse.json(
        { success: false, error: 'No se pudo determinar el ID del colegio' },
        { status: 400 }
      )
    }

    // Validaciones
    if (!body.nivel || !body.grado) {
      return NextResponse.json(
        {
          success: false,
          error: 'El nivel y grado son obligatorios',
        },
        { status: 400 }
      )
    }

    // Validar que el año esté presente (ahora que Strapi tiene el campo configurado)
    if (body.año === undefined && body.ano === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'El año es obligatorio',
        },
        { status: 400 }
      )
    }
    const año = body.año || body.ano || new Date().getFullYear()

    // ✅ Campo correcto en Strapi: nombre_curso (generado automáticamente o proporcionado)
    const nombreCurso = body.nombre_curso?.trim() || body.curso_nombre?.trim()
    if (!nombreCurso) {
      return NextResponse.json(
        {
          success: false,
          error: 'El nombre del curso es obligatorio',
        },
        { status: 400 }
      )
    }

    // Asegurar que colegioIdNum sea un número
    const colegioIdFinal = typeof colegioIdNum === 'number' ? colegioIdNum : parseInt(String(colegioIdNum))
    
    if (isNaN(colegioIdFinal)) {
      return NextResponse.json(
        { success: false, error: 'ID de colegio inválido para crear el curso' },
        { status: 400 }
      )
    }

    debugLog('[API /crm/colegios/[id]/cursos POST] Creando curso con datos:', {
      nombre_curso: nombreCurso,
      colegioId: colegioIdFinal,
      nivel: body.nivel,
      grado: body.grado,
      año: año,
      paralelo: body.paralelo,
    })

    const cursoData: any = {
      data: {
        nombre_curso: nombreCurso, // ✅ Campo correcto en Strapi
        colegio: { connect: [colegioIdFinal] }, // ✅ Usar ID numérico para relación manyToOne
        nivel: body.nivel,
        grado: String(body.grado), // ✅ grado debe ser string según schema de Strapi
        anio: año, // Campo ya configurado en Strapi (sin tilde para que Strapi lo acepte)
        ...(body.paralelo && { paralelo: body.paralelo }),
        ...(body.activo !== undefined && { activo: body.activo !== false }),
      },
    }

    // Agregar relación lista_utiles si está presente
    if (body.lista_utiles) {
      const listaUtilesId = typeof body.lista_utiles === 'number' 
        ? body.lista_utiles 
        : parseInt(String(body.lista_utiles))
      if (!isNaN(listaUtilesId)) {
        cursoData.data.lista_utiles = { connect: [listaUtilesId] }
      }
    }

    // Materiales adicionales (solo si no hay lista_utiles o si se proporcionan explícitamente)
    if (body.materiales && Array.isArray(body.materiales) && body.materiales.length > 0) {
      cursoData.data.materiales = body.materiales.map((material: any) => ({
        material_nombre: material.material_nombre || '',
        tipo: material.tipo || 'util',
        cantidad: material.cantidad ? parseInt(String(material.cantidad)) : 1,
        obligatorio: material.obligatorio !== undefined ? material.obligatorio : true,
        ...(material.descripcion && { descripcion: material.descripcion }),
      }))
    } else if (!body.lista_utiles) {
      // Si no hay lista_utiles ni materiales, enviar array vacío para mantener compatibilidad
      cursoData.data.materiales = []
    }
    
    // Limpiar campos undefined o null
    Object.keys(cursoData.data).forEach(key => {
      if (cursoData.data[key] === undefined || cursoData.data[key] === null) {
        delete cursoData.data[key]
      }
    })

    debugLog('[API /crm/colegios/[id]/cursos POST] Enviando datos a Strapi:', {
      url: '/api/cursos',
      payload: JSON.stringify(cursoData, null, 2),
    })

    const response = await strapiClient.post<StrapiResponse<StrapiEntity<CursoAttributes>>>(
      '/api/cursos',
      cursoData
    )

    debugLog('[API /crm/colegios/[id]/cursos POST] Respuesta de Strapi:', {
      tieneData: !!response.data,
      dataType: typeof response.data,
      esArray: Array.isArray(response.data),
      dataKeys: response.data ? Object.keys(response.data) : [],
    })

    // Extraer el curso creado de la respuesta
    const cursoCreado = Array.isArray(response.data) ? response.data[0] : response.data
    const cursoAttrs = cursoCreado?.attributes || cursoCreado
    
    debugLog('[API /crm/colegios/[id]/cursos POST] Curso creado:', {
      id: cursoCreado?.id,
      documentId: cursoCreado?.documentId,
      nombre: cursoAttrs?.nombre_curso,
    })

    return NextResponse.json({
      success: true,
      data: cursoCreado || response.data,
      message: 'Curso creado exitosamente',
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/colegios/[id]/cursos POST] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
      stack: error.stack,
    })
    
    // Intentar extraer más información del error
    let errorMessage = error.message || 'Error al crear curso'
    let errorDetails = error.details || {}
    
    // Si el error tiene más información, incluirla
    if (error.response) {
      try {
        const errorData = typeof error.response === 'string' ? JSON.parse(error.response) : error.response
        errorMessage = errorData.error?.message || errorData.message || errorMessage
        errorDetails = errorData.error?.details || errorData.details || errorDetails
      } catch {
        // Si no se puede parsear, usar el mensaje original
      }
    }
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: errorDetails,
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}
