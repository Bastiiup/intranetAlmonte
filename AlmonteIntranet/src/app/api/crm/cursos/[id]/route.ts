/**
 * API Route para gestionar un curso específico
 * GET, PUT, DELETE /api/crm/cursos/[id]
 */

import { NextRequest } from 'next/server'
import { createSuccessResponse, createErrorResponse, handleApiError } from '@/lib/api/utils'
import { logger } from '@/lib/logging/logger'
import { CursoService } from '@/lib/services/cursoService'
import { UpdateCursoSchema, validateWithZod } from '@/lib/crm/validations'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

/**
 * GET /api/crm/cursos/[id]
 * Obtiene un curso específico con sus materiales
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    logger.api('/crm/cursos/[id]', 'GET - Buscando curso', { id })

    const curso = await CursoService.findById(id)
    
    if (!curso) {
      return createErrorResponse('Curso no encontrado', 404)
    }

    logger.success('[API /crm/cursos/[id] GET] Curso obtenido exitosamente', { id })
    return createSuccessResponse(curso)
  } catch (error: any) {
    logger.apiError('/crm/cursos/[id]', 'GET - Error al obtener curso', error)
    return handleApiError(error, 'Error al obtener curso')
  }
}

/**
 * PUT /api/crm/cursos/[id]
 * Actualiza un curso
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    logger.api('/crm/cursos/[id]', 'PUT - Actualizando curso', { id })

    // Validar con Zod
    const validation = validateWithZod(UpdateCursoSchema, body)
    if (!validation.success) {
      return createErrorResponse('Datos inválidos', 400, { errors: validation.errors.errors })
    }

    // Actualizar usando servicio
    const curso = await CursoService.update(id, validation.data)

    logger.success('[API /crm/cursos/[id] PUT] Curso actualizado exitosamente', { id })
    return createSuccessResponse(
      curso,
      { message: 'Curso actualizado exitosamente' }
    )
  } catch (error: any) {
    // Si es error de Zod, ya fue manejado arriba
    if (error instanceof z.ZodError) {
      return createErrorResponse('Datos inválidos', 400, { errors: error.errors })
    }
    
    logger.apiError('/crm/cursos/[id]', 'PUT - Error al actualizar curso', error)
    return handleApiError(error, 'Error al actualizar curso')
  }
}

/**
 * DELETE /api/crm/cursos/[id]
 * Elimina un curso
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    logger.api('/crm/cursos/[id]', 'DELETE - Eliminando curso', { id })

    await CursoService.delete(id)

    logger.success('[API /crm/cursos/[id] DELETE] Curso eliminado exitosamente', { id })
    return createSuccessResponse(
      null,
      { message: 'Curso eliminado exitosamente' }
    )
  } catch (error: any) {
    logger.apiError('/crm/cursos/[id]', 'DELETE - Error al eliminar curso', error)
    return handleApiError(error, 'Error al eliminar curso')
  }
}
