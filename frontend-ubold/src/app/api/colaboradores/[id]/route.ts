/**
 * API Route para gestionar un colaborador específico
 * GET, PUT, DELETE /api/colaboradores/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

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
    console.log('[API /colaboradores/[id] GET] Buscando colaborador con ID:', id)

    let colaborador: any = null

    // Intentar primero con el endpoint directo (funciona con documentId o id)
    try {
      const response = await strapiClient.get<StrapiResponse<StrapiEntity<ColaboradorAttributes>>>(
        `/api/colaboradores/${id}?populate[persona][fields]=rut,nombres,primer_apellido,segundo_apellido,nombre_completo&populate[usuario]=*`
      )
      
      if (response.data) {
        colaborador = response.data
        console.log('[API /colaboradores/[id] GET] Colaborador encontrado directamente')
      }
    } catch (directError: any) {
      console.log('[API /colaboradores/[id] GET] Endpoint directo falló, intentando búsqueda por filtro...')
      
      // Si falla, intentar buscar por filtro (útil cuando el ID es numérico pero necesitamos documentId)
      try {
        const filterResponse = await strapiClient.get<StrapiResponse<StrapiEntity<ColaboradorAttributes>>>(
          `/api/colaboradores?filters[id][$eq]=${id}&populate[persona][fields]=rut,nombres,primer_apellido,segundo_apellido,nombre_completo&populate[usuario]=*`
        )
        
        if (filterResponse.data) {
          if (Array.isArray(filterResponse.data) && filterResponse.data.length > 0) {
            colaborador = filterResponse.data[0]
            console.log('[API /colaboradores/[id] GET] Colaborador encontrado por filtro (array)')
          } else if (!Array.isArray(filterResponse.data)) {
            colaborador = filterResponse.data
            console.log('[API /colaboradores/[id] GET] Colaborador encontrado por filtro (objeto)')
          }
        }
      } catch (filterError: any) {
        console.error('[API /colaboradores/[id] GET] Error en búsqueda por filtro:', filterError.message)
      }
    }

    if (!colaborador) {
      return NextResponse.json(
        {
          success: false,
          error: 'Colaborador no encontrado',
          details: { id },
          status: 404,
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: colaborador,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /colaboradores/[id] GET] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener colaborador',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
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

    // Validaciones básicas
    if (!body.email_login || !body.email_login.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'El email_login es obligatorio',
        },
        { status: 400 }
      )
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email_login.trim())) {
      return NextResponse.json(
        {
          success: false,
          error: 'El email_login no tiene un formato válido',
        },
        { status: 400 }
      )
    }

    // Validar contraseña si se proporciona
    if (body.password && body.password.trim().length > 0 && body.password.trim().length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: 'La contraseña debe tener al menos 6 caracteres',
        },
        { status: 400 }
      )
    }

    let personaId: string | null = null

    // Manejar actualización/relación de persona
    if (body.persona) {
      const personaData = body.persona

      // Si ya existe un personaId, usar ese
      if (personaData.personaId) {
        personaId = personaData.personaId
        console.log('[API /colaboradores/[id] PUT] ✅ Usando persona existente:', personaId)

        // Actualizar datos de persona si se proporcionaron
        if (personaData.rut || personaData.nombres || personaData.primer_apellido || personaData.genero || personaData.cumpleagno) {
          const updateData: any = {
            data: {},
          }
          
          if (personaData.rut?.trim()) updateData.data.rut = personaData.rut.trim()
          if (personaData.nombres?.trim()) updateData.data.nombres = personaData.nombres.trim()
          if (personaData.primer_apellido?.trim()) updateData.data.primer_apellido = personaData.primer_apellido.trim()
          if (personaData.segundo_apellido?.trim()) updateData.data.segundo_apellido = personaData.segundo_apellido.trim()
          if (personaData.genero) updateData.data.genero = personaData.genero
          if (personaData.cumpleagno) updateData.data.cumpleagno = personaData.cumpleagno

          // Construir nombre_completo si hay nombres
          if (personaData.nombres || personaData.primer_apellido) {
            const nombres = personaData.nombres?.trim() || ''
            const primerApellido = personaData.primer_apellido?.trim() || ''
            const segundoApellido = personaData.segundo_apellido?.trim() || ''
            updateData.data.nombre_completo = `${nombres} ${primerApellido} ${segundoApellido}`.trim()
          }

          try {
            await strapiClient.put(`/api/personas/${personaId}`, updateData)
            console.log('[API /colaboradores/[id] PUT] ✅ Persona actualizada')
          } catch (personaUpdateError: any) {
            console.error('[API /colaboradores/[id] PUT] Error al actualizar persona:', personaUpdateError)
            // Continuar aunque falle la actualización de persona
          }
        }
      } else if (personaData.rut) {
        // Buscar persona por RUT
        try {
          const personaSearchResponse = await strapiClient.get<any>(
            `/api/personas?filters[rut][$eq]=${encodeURIComponent(personaData.rut.trim())}&pagination[pageSize]=1`
          )

          if (personaSearchResponse.data && personaSearchResponse.data.length > 0) {
            // Persona existe, usar su ID
            personaId = personaSearchResponse.data[0].id || personaSearchResponse.data[0].documentId
            console.log('[API /colaboradores/[id] PUT] ✅ Persona encontrada por RUT:', personaId)

            // Actualizar datos de persona si se proporcionaron
            if (personaData.nombres || personaData.primer_apellido || personaData.genero || personaData.cumpleagno) {
              const updateData: any = {
                data: {},
              }
              
              if (personaData.nombres?.trim()) updateData.data.nombres = personaData.nombres.trim()
              if (personaData.primer_apellido?.trim()) updateData.data.primer_apellido = personaData.primer_apellido.trim()
              if (personaData.segundo_apellido?.trim()) updateData.data.segundo_apellido = personaData.segundo_apellido.trim()
              if (personaData.genero) updateData.data.genero = personaData.genero
              if (personaData.cumpleagno) updateData.data.cumpleagno = personaData.cumpleagno

              // Construir nombre_completo si hay nombres
              if (personaData.nombres || personaData.primer_apellido) {
                const nombres = personaData.nombres?.trim() || ''
                const primerApellido = personaData.primer_apellido?.trim() || ''
                const segundoApellido = personaData.segundo_apellido?.trim() || ''
                updateData.data.nombre_completo = `${nombres} ${primerApellido} ${segundoApellido}`.trim()
              }

              await strapiClient.put(`/api/personas/${personaId}`, updateData)
              console.log('[API /colaboradores/[id] PUT] ✅ Persona actualizada')
            }
          } else {
            // Persona no existe, crearla
            console.log('[API /colaboradores/[id] PUT] 📚 Creando nueva persona...')
            
            const nombres = personaData.nombres?.trim() || ''
            const primerApellido = personaData.primer_apellido?.trim() || ''
            const segundoApellido = personaData.segundo_apellido?.trim() || ''
            const nombreCompleto = `${nombres} ${primerApellido} ${segundoApellido}`.trim()

            const personaCreateData: any = {
              data: {
                rut: personaData.rut.trim(),
                nombres: nombres || null,
                primer_apellido: primerApellido || null,
                segundo_apellido: segundoApellido || null,
                nombre_completo: nombreCompleto || null,
                genero: personaData.genero || null,
                cumpleagno: personaData.cumpleagno || null,
                origen: 'manual',
                activo: true,
              },
            }

            const personaResponse = await strapiClient.post<any>(
              '/api/personas',
              personaCreateData
            )

            personaId = personaResponse.data?.id || personaResponse.data?.documentId || personaResponse.id || personaResponse.documentId
            console.log('[API /colaboradores/[id] PUT] ✅ Persona creada:', personaId)
          }
        } catch (personaError: any) {
          console.error('[API /colaboradores/[id] PUT] Error al manejar persona:', personaError)
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
        // Solo enviar password si se proporcionó (no vacío)
        ...(body.password && body.password.trim().length > 0 && { password: body.password }),
        // Solo enviar roles si tienen valor (evitar enviar strings vacías o null)
        ...(body.rol_principal && body.rol_principal.trim() && { rol_principal: body.rol_principal.trim() }),
        ...(body.rol_operativo && body.rol_operativo.trim() && { rol_operativo: body.rol_operativo.trim() }),
        ...(personaId && { persona: personaId }),
        ...(body.usuario && { usuario: body.usuario }),
      },
    }

    const response = await strapiClient.put<StrapiResponse<StrapiEntity<ColaboradorAttributes>>>(
      `/api/colaboradores/${id}`,
      colaboradorData
    )

    return NextResponse.json({
      success: true,
      data: response.data,
      message: 'Colaborador actualizado exitosamente',
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /colaboradores/[id] PUT] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al actualizar colaborador',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
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
    console.log('[API /colaboradores/[id] DELETE] Eliminando colaborador:', id)

    // Eliminar permanentemente usando delete
    // Strapi puede devolver 200 con JSON o 204 sin contenido
    try {
      const response = await strapiClient.delete(
        `/api/colaboradores/${id}`
      )

      // Si la respuesta es exitosa (aunque esté vacía), retornar éxito
      return NextResponse.json({
        success: true,
        message: 'Colaborador eliminado permanentemente',
      }, { status: 200 })
    } catch (deleteError: any) {
      // Si el error es por respuesta vacía pero el status fue 200/204, considerar éxito
      if (deleteError.status === 200 || deleteError.status === 204) {
        return NextResponse.json({
          success: true,
          message: 'Colaborador eliminado permanentemente',
        }, { status: 200 })
      }
      throw deleteError
    }
  } catch (error: any) {
    console.error('[API /colaboradores/[id] DELETE] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al eliminar colaborador',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

