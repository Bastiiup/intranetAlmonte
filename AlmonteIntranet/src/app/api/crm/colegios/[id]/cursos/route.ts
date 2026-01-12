/**
 * API Route para gestionar cursos de un colegio
 * GET, POST /api/crm/colegios/[id]/cursos
 */

import { NextRequest } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'
import { createSuccessResponse, createErrorResponse, handleApiError } from '@/lib/api/utils'
import { logger } from '@/lib/logging/logger'
import type { CursoData } from '@/lib/crm/types'
import { getCursosWithPopulate } from '@/lib/strapi/populate-helpers'
import { CursoService } from '@/lib/services/cursoService'
import { CreateCursoSchema, validateWithZod } from '@/lib/crm/validations'
import { z } from 'zod'

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

    // Preparar datos para validación (incluir colegio y nombre_curso si viene como curso_nombre)
    // Asegurar que activo tenga un valor por defecto si no viene
    const dataToValidate = {
      ...body,
      nombre_curso: body.nombre_curso?.trim() || body.curso_nombre?.trim() || body.nombre_curso,
      colegio: colegioIdNum,
      activo: body.activo !== undefined ? body.activo : true, // Default true si no viene
    }

    // Validar con Zod
    const validation = validateWithZod(CreateCursoSchema, dataToValidate)
    if (!validation.success) {
      return createErrorResponse('Datos inválidos', 400, { errors: validation.errors.errors })
    }

    // Crear usando servicio
    const curso = await CursoService.create(validation.data)

    logger.success('[API /crm/colegios/[id]/cursos POST] Curso creado exitosamente', { colegioId })
    return createSuccessResponse(
      curso,
      { message: 'Curso creado exitosamente' }
    )
  } catch (error: any) {
    // Si es error de Zod, ya fue manejado arriba
    if (error instanceof z.ZodError) {
      return createErrorResponse('Datos inválidos', 400, { errors: error.errors })
    }
    
    logger.apiError('/crm/colegios/[id]/cursos', 'POST - Error al crear curso', error)
    return handleApiError(error, 'Error al crear curso')
  }
}
