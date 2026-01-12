/**
 * API Route para gestionar un colaborador específico
 * GET, PUT, DELETE /api/colaboradores/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity, ColaboradorData } from '@/lib/strapi/types'
import { extractStrapiData, normalizePersona, getStrapiId, normalizeImage, normalizePortada } from '@/lib/strapi/helpers'
import { getPersonaByIdOrRut, createPersona, updatePersona } from '@/lib/services/personaService'
import { handleApiError, StrapiError, ValidationError } from '@/lib/errors'
import { logger } from '@/lib/logging'

export const dynamic = 'force-dynamic'

interface ColaboradorAttributes {
  email_login: string
  rol?: string
  rol_principal?: string
  rol_operativo?: string
  activo: boolean
  persona?: any
  empresa?: any
  usuario?: any
}

/**
 * GET /api/colaboradores/[id]
 * Obtiene un colaborador específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    logger.api('/colaboradores/[id]', 'Buscando colaborador', { id })

    let colaborador: any = null

    // Intentar primero con el endpoint directo (funciona con documentId o id)
    try {
      const response = await strapiClient.get<StrapiResponse<StrapiEntity<ColaboradorAttributes>>>(
        `/api/colaboradores/${id}?populate[persona][fields]=rut,nombres,primer_apellido,segundo_apellido,nombre_completo,bio,job_title,telefono_principal&populate[persona][populate][imagen][populate]=*&populate[persona][populate][portada][populate]=*&populate[persona][populate][telefonos]=*&populate[usuario]=*`
      )
      
      colaborador = extractStrapiData(response)
      if (colaborador) {
        logger.success('Colaborador encontrado directamente', { id })
      }
    } catch (directError: any) {
      logger.debug('Endpoint directo falló, intentando búsqueda por filtro', { id, error: directError.message })
      
      // Si falla, intentar buscar por filtro (útil cuando el ID es numérico pero necesitamos documentId)
      try {
        const filterResponse = await strapiClient.get<StrapiResponse<StrapiEntity<ColaboradorAttributes>>>(
          `/api/colaboradores?filters[id][$eq]=${id}&populate[persona][fields]=rut,nombres,primer_apellido,segundo_apellido,nombre_completo,bio,job_title,telefono_principal&populate[persona][populate][imagen][populate]=*&populate[persona][populate][portada][populate]=*&populate[persona][populate][telefonos]=*&populate[usuario]=*`
        )
        
        const data = extractStrapiData(filterResponse)
        if (Array.isArray(data) && data.length > 0) {
          colaborador = data[0]
          logger.success('Colaborador encontrado por filtro (array)', { id })
        } else if (data && !Array.isArray(data)) {
          colaborador = data
          logger.success('Colaborador encontrado por filtro (objeto)', { id })
        }
      } catch (filterError: any) {
        logger.warn('Error en búsqueda por filtro', { id, error: filterError.message })
      }
    }

    if (!colaborador) {
      throw new StrapiError('Colaborador no encontrado', 404, { id })
    }

    // Normalizar estructura de colaborador y persona
    const colaboradorAttrs = normalizePersona(colaborador) || colaborador
    let persona = normalizePersona(colaboradorAttrs.persona)

    // Normalizar imagen y portada usando helpers
    if (persona) {
      persona.imagen = normalizeImage(persona.imagen)
      persona.portada = normalizePortada(persona.portada)
      
      // Actualizar colaborador con persona normalizada
      if (colaborador.attributes) {
        colaborador.attributes.persona = persona
      } else {
        colaborador.persona = persona
      }
    }

    logger.success('Colaborador normalizado con portada', { id: getStrapiId(colaborador) })

    return NextResponse.json({
      success: true,
      data: colaborador,
    }, { status: 200 })
  } catch (error: unknown) {
    logger.apiError('/colaboradores/[id]', 'Error al obtener colaborador', error)
    return handleApiError(error)
  }
}

/**
 * PUT /api/colaboradores/[id]
 * Actualiza un colaborador
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    logger.api('/colaboradores/[id]', 'Actualizando colaborador', { id })

    // Validaciones básicas
    if (!body.email_login || !body.email_login.trim()) {
      throw new ValidationError('El email_login es obligatorio', 'email_login')
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email_login.trim())) {
      throw new ValidationError('El email_login no tiene un formato válido', 'email_login', body.email_login)
    }

    // Validar contraseña si se proporciona
    if (body.password && body.password.trim().length > 0 && body.password.trim().length < 6) {
      throw new ValidationError('La contraseña debe tener al menos 6 caracteres', 'password')
    }

    let personaId: string | number | null = null

    // Manejar actualización/relación de persona usando PersonaService
    if (body.persona) {
      const personaData = body.persona

      // Si ya existe un personaId, usar ese
      if (personaData.personaId) {
        personaId = personaData.personaId
        logger.debug('Usando persona existente', { personaId })

        // Actualizar datos de persona si se proporcionaron
        if (personaData.rut || personaData.nombres || personaData.primer_apellido || personaData.genero || personaData.cumpleagno) {
          try {
            await updatePersona(personaId, personaData.rut, personaData)
            logger.success('Persona actualizada', { personaId })
          } catch (personaUpdateError: any) {
            logger.warn('Error al actualizar persona (no crítico)', { personaId, error: personaUpdateError.message })
            // Continuar aunque falle la actualización de persona
          }
        }
      } else if (personaData.rut) {
        // Buscar o crear persona por RUT usando PersonaService
        try {
          let existingPersona = await getPersonaByIdOrRut(null, personaData.rut)

          if (existingPersona) {
            personaId = getStrapiId(existingPersona)
            logger.success('Persona encontrada por RUT', { personaId, rut: personaData.rut })

            // Actualizar datos de persona si se proporcionaron
            if (personaData.nombres || personaData.primer_apellido || personaData.genero || personaData.cumpleagno) {
              await updatePersona(personaId, personaData.rut, personaData)
              logger.success('Persona actualizada', { personaId })
            }
          } else {
            // Persona no existe, crearla
            logger.debug('Creando nueva persona', { rut: personaData.rut })
            const newPersona = await createPersona(personaData)
            personaId = getStrapiId(newPersona)
            logger.success('Persona creada', { personaId, rut: personaData.rut })
          }
        } catch (personaError: any) {
          logger.warn('Error al manejar persona (no crítico)', { rut: personaData.rut, error: personaError.message })
          // Continuar sin persona si hay error (no crítico)
        }
      }
    }

    // Preparar datos para Strapi
    // Solo enviar campos que existen en el modelo de Strapi
    const colaboradorData: any = {
      data: {
        email_login: body.email_login.trim(),
        activo: body.activo !== undefined ? body.activo : true,
        plataforma: body.plataforma || 'general', // Plataforma del colaborador (default: general)
        // Solo enviar password si se proporcionó (no vacío)
        ...(body.password && body.password.trim().length > 0 && { password: body.password }),
        // Solo enviar rol si tiene valor (evitar enviar strings vacías o null)
        ...(body.rol && body.rol.trim() && { rol: body.rol.trim() }),
        ...(personaId && { persona: personaId }),
        ...(body.usuario && { usuario: body.usuario }),
      },
    }

    const response = await strapiClient.put<StrapiResponse<StrapiEntity<ColaboradorAttributes>>>(
      `/api/colaboradores/${id}`,
      colaboradorData
    )

    logger.success('Colaborador actualizado exitosamente', { id })

    return NextResponse.json({
      success: true,
      data: response.data,
      message: 'Colaborador actualizado exitosamente',
    }, { status: 200 })
  } catch (error: unknown) {
    logger.apiError('/colaboradores/[id]', 'Error al actualizar colaborador', error)
    return handleApiError(error)
  }
}

/**
 * DELETE /api/colaboradores/[id]
 * Elimina un colaborador permanentemente
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    logger.api('/colaboradores/[id]', 'Eliminando colaborador', { id })

    // Eliminar permanentemente usando delete
    // Strapi puede devolver 200 con JSON o 204 sin contenido
    try {
      await strapiClient.delete(`/api/colaboradores/${id}`)
      logger.success('Colaborador eliminado permanentemente', { id })
      
      return NextResponse.json({
        success: true,
        message: 'Colaborador eliminado permanentemente',
      }, { status: 200 })
    } catch (deleteError: any) {
      // Si el error es por respuesta vacía pero el status fue 200/204, considerar éxito
      if (deleteError.status === 200 || deleteError.status === 204) {
        logger.success('Colaborador eliminado (respuesta vacía)', { id })
        return NextResponse.json({
          success: true,
          message: 'Colaborador eliminado permanentemente',
        }, { status: 200 })
      }
      throw deleteError
    }
  } catch (error: unknown) {
    logger.apiError('/colaboradores/[id]', 'Error al eliminar colaborador', error)
    return handleApiError(error)
  }
}

