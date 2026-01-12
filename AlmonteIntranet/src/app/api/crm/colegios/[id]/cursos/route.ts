/**
 * API Route para gestionar cursos de un colegio
 * GET, POST /api/crm/colegios/[id]/cursos
 */

import { NextRequest } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'
import { createSuccessResponse, createErrorResponse, handleApiError } from '@/lib/api/utils'
import { logger } from '@/lib/logging/logger'
import type { CursoData, CreateCursoRequest } from '@/lib/crm/types'
import { getCursosWithPopulate } from '@/lib/strapi/populate-helpers'
import { prepareManyToOneRelation, cleanUndefinedNullFields } from '@/lib/strapi/relations'

export const dynamic = 'force-dynamic'


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
    logger.api('/crm/colegios/[id]/cursos', 'GET - Buscando cursos para colegio', { colegioId })

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
          logger.debug('[API /crm/colegios/[id]/cursos GET] ID numérico del colegio', { colegioIdNum })
        }
      } catch (error: any) {
        logger.apiError('/crm/colegios/[id]/cursos', 'GET - Error obteniendo ID del colegio', error)
        return createErrorResponse('Colegio no encontrado', 404)
      }
    }

    // Usar helper con fallbacks automáticos
    const response = await getCursosWithPopulate<CursoData>(
      { colegio: { id: { $eq: Number(colegioIdNum) } } }
    )
    const cursos = Array.isArray(response.data) ? response.data : []

    logger.success('[API /crm/colegios/[id]/cursos GET] Cursos obtenidos exitosamente', { 
      colegioId, 
      total: cursos.length 
    })
    return createSuccessResponse(cursos, {
      total: cursos.length,
    })
  } catch (error: any) {
    logger.apiError('/crm/colegios/[id]/cursos', 'GET - Error al obtener cursos', error)
    return handleApiError(error, 'Error al obtener cursos')
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

    logger.api('/crm/colegios/[id]/cursos', 'POST - Creando curso para colegio', { colegioId })

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
        return createErrorResponse('Colegio no encontrado', 404)
      }
    }

    // Validaciones
    if (!body.nivel || !body.grado) {
      return createErrorResponse('El nivel y grado son obligatorios', 400)
    }

    // ✅ Campo correcto en Strapi: nombre_curso (generado automáticamente o proporcionado)
    const nombreCurso = body.nombre_curso?.trim() || body.curso_nombre?.trim()
    if (!nombreCurso) {
      return createErrorResponse('El nombre del curso es obligatorio', 400)
    }

    const cursoData: any = {
      data: {
        nombre_curso: nombreCurso, // ✅ Campo correcto en Strapi
        colegio: { connect: [typeof colegioIdNum === 'number' ? colegioIdNum : parseInt(String(colegioIdNum))] },
        nivel: body.nivel,
        grado: body.grado,
        ...(body.paralelo && { paralelo: body.paralelo }),
        ...(body.activo !== undefined && { activo: body.activo !== false }),
      },
    }

    // Agregar relación lista_utiles usando helper
    const listaUtilesRelation = prepareManyToOneRelation(body.lista_utiles, 'lista_utiles')
    if (listaUtilesRelation) {
      Object.assign(cursoData.data, listaUtilesRelation)
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
    
    // Limpiar campos undefined o null usando helper
    cursoData.data = cleanUndefinedNullFields(cursoData.data) as typeof cursoData.data

    const response = await strapiClient.post<StrapiResponse<StrapiEntity<CursoData>>>(
      '/api/cursos',
      cursoData
    )

    logger.success('[API /crm/colegios/[id]/cursos POST] Curso creado exitosamente', { colegioId })

    return createSuccessResponse(
      response.data,
      { message: 'Curso creado exitosamente' }
    )
  } catch (error: any) {
    logger.apiError('/crm/colegios/[id]/cursos', 'POST - Error al crear curso', error)
    return handleApiError(error, 'Error al crear curso')
  }
}
