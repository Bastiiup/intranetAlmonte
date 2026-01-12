/**
 * API Route para gestionar cursos de un colegio
 * GET, POST /api/crm/colegios/[id]/cursos
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

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
    // ⚠️ No usar sort hasta verificar qué campos son ordenables en Strapi
    // Intentar con populate de lista_utiles, si falla intentar sin él
    // NOTA: El populate anidado de lista_utiles.materiales puede causar error 500 en Strapi
    // si el content type no está configurado correctamente
    let response: any
    try {
      const paramsObj = new URLSearchParams({
        'filters[colegio][id][$eq]': String(colegioIdNum),
        'populate[materiales]': 'true',
        'populate[lista_utiles]': 'true',
        'populate[lista_utiles][populate][materiales]': 'true',
      })
      response = await strapiClient.get<StrapiResponse<StrapiEntity<CursoAttributes>[]>>(
        `/api/cursos?${paramsObj.toString()}`
      )
    } catch (error: any) {
      // Si falla con populate anidado de lista_utiles.materiales (error 500 común),
      // intentar solo con lista_utiles sin populate anidado
      if (error.status === 500 || error.status === 400) {
        debugLog('[API /crm/colegios/[id]/cursos GET] ⚠️ Error 500/400 con populate anidado lista_utiles.materiales, intentando sin populate anidado')
        try {
          const paramsObj = new URLSearchParams({
            'filters[colegio][id][$eq]': String(colegioIdNum),
            'populate[materiales]': 'true',
            'populate[lista_utiles]': 'true',
          })
          response = await strapiClient.get<StrapiResponse<StrapiEntity<CursoAttributes>[]>>(
            `/api/cursos?${paramsObj.toString()}`
          )
        } catch (secondError: any) {
          // Si también falla, intentar sin lista_utiles completamente
          debugLog('[API /crm/colegios/[id]/cursos GET] ⚠️ Error también sin populate anidado, intentando sin lista_utiles')
          const paramsObj = new URLSearchParams({
            'filters[colegio][id][$eq]': String(colegioIdNum),
            'populate[materiales]': 'true',
          })
          response = await strapiClient.get<StrapiResponse<StrapiEntity<CursoAttributes>[]>>(
            `/api/cursos?${paramsObj.toString()}`
          )
        }
      } else {
        // Si es otro tipo de error, propagarlo
        throw error
      }
    }

    const cursos = Array.isArray(response.data) ? response.data : []

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

    // Obtener el ID numérico del colegio
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
        }
      } catch (error: any) {
        return NextResponse.json(
          { success: false, error: 'Colegio no encontrado' },
          { status: 404 }
        )
      }
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

    // El año es opcional hasta que Strapi tenga el campo configurado
    // Si no se proporciona, usar año actual como fallback
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

    const cursoData: any = {
      data: {
        nombre_curso: nombreCurso, // ✅ Campo correcto en Strapi
        colegio: { connect: [typeof colegioIdNum === 'number' ? colegioIdNum : parseInt(String(colegioIdNum))] },
        nivel: body.nivel,
        grado: body.grado,
        // Solo incluir año si Strapi lo tiene configurado (por ahora es opcional)
        // Si Strapi devuelve error "Invalid key año", el campo aún no está configurado
        ...(body.año !== undefined || body.ano !== undefined ? { año: año } : {}),
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

    try {
      const response = await strapiClient.post<StrapiResponse<StrapiEntity<CursoAttributes>>>(
        '/api/cursos',
        cursoData
      )

      debugLog('[API /crm/colegios/[id]/cursos POST] Curso creado exitosamente')

      return NextResponse.json({
        success: true,
        data: response.data,
        message: 'Curso creado exitosamente',
      }, { status: 200 })
    } catch (error: any) {
      // Si el error es "Invalid key año", intentar sin el campo año
      if (error.message?.includes('Invalid key año') || error.message?.includes('Invalid key ano')) {
        debugLog('[API /crm/colegios/[id]/cursos POST] ⚠️ Error con campo año, intentando sin él')
        delete cursoData.data.año
        delete cursoData.data.ano
        
        try {
          const response = await strapiClient.post<StrapiResponse<StrapiEntity<CursoAttributes>>>(
            '/api/cursos',
            cursoData
          )
          
          debugLog('[API /crm/colegios/[id]/cursos POST] Curso creado exitosamente (sin campo año)')
          
          return NextResponse.json({
            success: true,
            data: response.data,
            message: 'Curso creado exitosamente (nota: el campo año aún no está configurado en Strapi)',
          }, { status: 200 })
        } catch (secondError: any) {
          // Si también falla sin año, devolver el error original
          throw error
        }
      }
      
      // Si no es error de año, propagar el error
      throw error
    }
  } catch (error: any) {
    console.error('[API /crm/colegios/[id]/cursos POST] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al crear curso',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}
