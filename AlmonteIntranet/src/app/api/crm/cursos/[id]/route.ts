/**
 * API Route para gestionar un curso específico
 * GET, PUT, DELETE /api/crm/cursos/[id]
 */

import { NextRequest } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'
import { createSuccessResponse, createErrorResponse, handleApiError } from '@/lib/api/utils'
import { logger } from '@/lib/logging/logger'
import type { CursoData, UpdateCursoRequest } from '@/lib/crm/types'
import { getCursoWithPopulate } from '@/lib/strapi/populate-helpers'
import { prepareManyToOneRelation, cleanUndefinedNullFields } from '@/lib/strapi/relations'

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

    // Usar helper con fallbacks automáticos
    const response = await getCursoWithPopulate<CursoData>(id)
    const curso = Array.isArray(response.data) ? response.data[0] : response.data
    
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
    const body = await request.json() as UpdateCursoRequest

    logger.api('/crm/cursos/[id]', 'PUT - Actualizando curso', { id })

    // Validaciones
    if (body.nombre_curso !== undefined && !body.nombre_curso?.trim()) {
      return createErrorResponse('El nombre del curso no puede estar vacío', 400)
    }

    // Preparar datos para Strapi
    const cursoData: { data: Partial<CursoData> & { lista_utiles?: any; materiales?: any[] } } = {
      data: {},
    }

    // Actualizar campos solo si están presentes
    if (body.nombre_curso !== undefined) {
      cursoData.data.nombre_curso = body.nombre_curso.trim()
    }
    if (body.nivel !== undefined) {
      cursoData.data.nivel = body.nivel
    }
    if (body.grado !== undefined) {
      cursoData.data.grado = body.grado
    }
    if (body.paralelo !== undefined) {
      cursoData.data.paralelo = body.paralelo || null
    }
    if (body.activo !== undefined) {
      cursoData.data.activo = body.activo
    }

    // Actualizar relación lista_utiles usando helper
    const listaUtilesRelation = prepareManyToOneRelation(body.lista_utiles, 'lista_utiles')
    if (listaUtilesRelation) {
      Object.assign(cursoData.data, listaUtilesRelation)
    }

    // Actualizar materiales adicionales si se proporcionan
    if (body.materiales !== undefined) {
      if (Array.isArray(body.materiales) && body.materiales.length > 0) {
        cursoData.data.materiales = body.materiales.map((material) => ({
          material_nombre: material.material_nombre || '',
          tipo: material.tipo || 'util',
          cantidad: material.cantidad ? parseInt(String(material.cantidad)) : 1,
          obligatorio: material.obligatorio !== undefined ? material.obligatorio : true,
          ...(material.descripcion && { descripcion: material.descripcion }),
        }))
      } else {
        // Array vacío si no hay materiales
        cursoData.data.materiales = []
      }
    }
    
    // Limpiar campos undefined o null usando helper
    cursoData.data = cleanUndefinedNullFields(cursoData.data) as typeof cursoData.data

    const response = await strapiClient.put<StrapiResponse<StrapiEntity<CursoData>>>(
      `/api/cursos/${id}`,
      cursoData
    )

    logger.success('[API /crm/cursos/[id] PUT] Curso actualizado exitosamente', { id })

    return createSuccessResponse(
      response.data,
      { message: 'Curso actualizado exitosamente' }
    )
  } catch (error: any) {
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

    await strapiClient.delete(`/api/cursos/${id}`)

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
