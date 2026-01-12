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

    // Intentar con populate de lista_utiles, si falla intentar sin él
    // NOTA: El populate anidado de lista_utiles.materiales puede causar error 500 en Strapi
    // si el content type no está configurado correctamente
    let response: StrapiResponse<StrapiEntity<CursoData>>
    try {
      const paramsObj = new URLSearchParams({
        'populate[materiales]': 'true',
        'populate[colegio]': 'true',
        'populate[lista_utiles]': 'true',
        'populate[lista_utiles][populate][materiales]': 'true',
      })
      response = await strapiClient.get<StrapiResponse<StrapiEntity<CursoData>>>(
        `/api/cursos/${id}?${paramsObj.toString()}`
      )
    } catch (error: any) {
      // Si falla con populate anidado de lista_utiles.materiales (error 500 común),
      // intentar solo con lista_utiles sin populate anidado
      if (error.status === 500 || error.status === 400) {
        logger.warn('[API /crm/cursos/[id] GET] Error 500/400 con populate anidado lista_utiles.materiales, intentando sin populate anidado', { id })
        try {
          const paramsObj = new URLSearchParams({
            'populate[materiales]': 'true',
            'populate[colegio]': 'true',
            'populate[lista_utiles]': 'true',
          })
          response = await strapiClient.get<StrapiResponse<StrapiEntity<CursoData>>>(
            `/api/cursos/${id}?${paramsObj.toString()}`
          )
        } catch (secondError: any) {
          // Si también falla, intentar sin lista_utiles completamente
          logger.warn('[API /crm/cursos/[id] GET] Error también sin populate anidado, intentando sin lista_utiles', { id })
          const paramsObj = new URLSearchParams({
            'populate[materiales]': 'true',
            'populate[colegio]': 'true',
          })
          response = await strapiClient.get<StrapiResponse<StrapiEntity<CursoData>>>(
            `/api/cursos/${id}?${paramsObj.toString()}`
          )
        }
      } else {
        // Si es otro tipo de error, propagarlo
        throw error
      }
    }

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

    // Actualizar relación lista_utiles
    if (body.lista_utiles !== undefined) {
      if (body.lista_utiles === null || body.lista_utiles === '') {
        // Desconectar lista_utiles
        cursoData.data.lista_utiles = { disconnect: true }
      } else {
        const listaUtilesId = typeof body.lista_utiles === 'number' 
          ? body.lista_utiles 
          : parseInt(String(body.lista_utiles))
        if (!isNaN(listaUtilesId)) {
          cursoData.data.lista_utiles = { connect: [listaUtilesId] }
        }
      }
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
    
    // Limpiar campos undefined o null
    Object.keys(cursoData.data).forEach(key => {
      if (cursoData.data[key as keyof typeof cursoData.data] === undefined || 
          cursoData.data[key as keyof typeof cursoData.data] === null) {
        delete cursoData.data[key as keyof typeof cursoData.data]
      }
    })

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
