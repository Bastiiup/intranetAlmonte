/**
 * API Route para actualizar el perfil del colaborador autenticado
 * PUT /api/colaboradores/me/profile
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import { getStreamClient } from '@/lib/stream/client'
import { cookies } from 'next/headers'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

interface ColaboradorAttributes {
  email_login: string
  rol?: string
  activo: boolean
  persona?: any
  usuario?: any
}

/**
 * Obtiene el colaborador autenticado desde las cookies
 */
async function getAuthColaborador() {
  try {
    const cookieStore = await cookies()
    const colaboradorStr = cookieStore.get('auth_colaborador')?.value

    if (!colaboradorStr) {
      return null
    }

    return JSON.parse(colaboradorStr)
  } catch (error) {
    console.error('[API /colaboradores/me/profile] Error al obtener colaborador de cookies:', error)
    return null
  }
}

/**
 * PUT /api/colaboradores/me/profile
 * Actualiza el perfil del colaborador autenticado
 */
export async function PUT(request: NextRequest) {
  try {
    // Verificar autenticación
    const colaborador = await getAuthColaborador()
    if (!colaborador) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      )
    }

    const colaboradorId = colaborador.id
    const body = await request.json()

    console.log('[API /colaboradores/me/profile] Actualizando perfil:', { colaboradorId, body })

    // Obtener persona actual para tener su ID
    let personaId: string | null = null
    if (colaborador.persona?.id) {
      personaId = String(colaborador.persona.id)
    } else if (colaborador.persona?.documentId) {
      personaId = colaborador.persona.documentId
    }

    // Si no hay personaId, intentar obtenerlo desde Strapi
    if (!personaId) {
      try {
        const colaboradorResponse = await strapiClient.get<any>(
          `/api/colaboradores/${colaboradorId}?populate[persona]=*`
        )
        const colaboradorData = colaboradorResponse.data?.attributes || colaboradorResponse.data
        if (colaboradorData?.persona?.data?.id) {
          personaId = String(colaboradorData.persona.data.id)
        } else if (colaboradorData?.persona?.data?.documentId) {
          personaId = colaboradorData.persona.data.documentId
        } else if (colaboradorData?.persona?.id) {
          personaId = String(colaboradorData.persona.id)
        }
      } catch (error) {
        console.error('[API /colaboradores/me/profile] Error al obtener persona:', error)
      }
    }

    // Preparar datos de actualización de persona
    const personaUpdateData: any = {
      data: {},
    }

    // Actualizar campos básicos de persona
    if (body.nombres !== undefined) personaUpdateData.data.nombres = body.nombres?.trim() || null
    if (body.primer_apellido !== undefined) personaUpdateData.data.primer_apellido = body.primer_apellido?.trim() || null
    if (body.segundo_apellido !== undefined) personaUpdateData.data.segundo_apellido = body.segundo_apellido?.trim() || null
    if (body.genero !== undefined) personaUpdateData.data.genero = body.genero || null
    if (body.cumpleagno !== undefined) personaUpdateData.data.cumpleagno = body.cumpleagno || null
    if (body.bio !== undefined) personaUpdateData.data.bio = body.bio?.trim() || null
    if (body.job_title !== undefined) personaUpdateData.data.job_title = body.job_title?.trim() || null

    // Construir nombre_completo si hay nombres
    if (body.nombres || body.primer_apellido || body.segundo_apellido) {
      const nombres = body.nombres?.trim() || ''
      const primerApellido = body.primer_apellido?.trim() || ''
      const segundoApellido = body.segundo_apellido?.trim() || ''
      personaUpdateData.data.nombre_completo = `${nombres} ${primerApellido} ${segundoApellido}`.trim() || null
    }

    // Actualizar imagen si se proporcionó un ID
    if (body.imagen_id) {
      personaUpdateData.data.imagen = body.imagen_id
    }

    // Actualizar dirección (si existe el campo en Strapi)
    // Intentar actualizar solo si el objeto tiene al menos un campo
    if (body.direccion && typeof body.direccion === 'object') {
      const direccionData: any = {}
      if (body.direccion.line1 !== undefined) direccionData.line1 = body.direccion.line1
      if (body.direccion.line2 !== undefined) direccionData.line2 = body.direccion.line2
      if (body.direccion.city !== undefined) direccionData.city = body.direccion.city
      if (body.direccion.state !== undefined) direccionData.state = body.direccion.state
      if (body.direccion.zipcode !== undefined) direccionData.zipcode = body.direccion.zipcode
      if (body.direccion.country !== undefined) direccionData.country = body.direccion.country
      
      if (Object.keys(direccionData).length > 0) {
        personaUpdateData.data.direccion = direccionData
      }
    }

    // Actualizar redes sociales (guardar en JSON o componente según estructura)
    if (body.redes_sociales && typeof body.redes_sociales === 'object') {
      const redesData: any = {}
      if (body.redes_sociales.facebook !== undefined) redesData.facebook = body.redes_sociales.facebook
      if (body.redes_sociales.twitter !== undefined) redesData.twitter = body.redes_sociales.twitter
      if (body.redes_sociales.instagram !== undefined) redesData.instagram = body.redes_sociales.instagram
      if (body.redes_sociales.linkedin !== undefined) redesData.linkedin = body.redes_sociales.linkedin
      if (body.redes_sociales.github !== undefined) redesData.github = body.redes_sociales.github
      if (body.redes_sociales.skype !== undefined) redesData.skype = body.redes_sociales.skype
      
      if (Object.keys(redesData).length > 0) {
        personaUpdateData.data.redes_sociales = redesData
      }
    }

    // Actualizar skills (guardar como JSON o array)
    if (body.skills !== undefined) {
      if (Array.isArray(body.skills)) {
        personaUpdateData.data.skills = body.skills
      } else if (typeof body.skills === 'string') {
        // Si viene como string separado por comas, convertirlo a array
        personaUpdateData.data.skills = body.skills.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0)
      }
    }

    // Actualizar teléfono si se proporcionó
    if (body.telefono !== undefined) {
      // Si persona tiene componente telefonos, actualizar el primero o crear uno nuevo
      // Por ahora, guardamos en un campo JSON temporal o actualizamos el componente
      personaUpdateData.data.telefono_principal = body.telefono?.trim() || null
    }

    // Actualizar email si se proporcionó (solo si es diferente del email_login)
    if (body.email !== undefined && body.email !== colaborador.email_login) {
      personaUpdateData.data.email_principal = body.email?.trim() || null
    }

    // Actualizar persona en Strapi
    if (personaId && Object.keys(personaUpdateData.data).length > 0) {
      try {
        await strapiClient.put(`/api/personas/${personaId}`, personaUpdateData)
        console.log('[API /colaboradores/me/profile] ✅ Persona actualizada')
      } catch (personaError: any) {
        console.error('[API /colaboradores/me/profile] Error al actualizar persona:', personaError)
        // Continuar aunque falle la actualización de persona
      }
    }

    // Actualizar colaborador (email_login, password)
    const colaboradorUpdateData: any = {
      data: {},
    }

    if (body.email_login !== undefined && body.email_login !== colaborador.email_login) {
      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(body.email_login.trim())) {
        return NextResponse.json(
          { success: false, error: 'El email no tiene un formato válido' },
          { status: 400 }
        )
      }
      colaboradorUpdateData.data.email_login = body.email_login.trim()
    }

    if (body.password !== undefined && body.password.trim().length > 0) {
      if (body.password.trim().length < 6) {
        return NextResponse.json(
          { success: false, error: 'La contraseña debe tener al menos 6 caracteres' },
          { status: 400 }
        )
      }
      colaboradorUpdateData.data.password = body.password.trim()
    }

    // Actualizar colaborador si hay cambios
    if (Object.keys(colaboradorUpdateData.data).length > 0) {
      await strapiClient.put(`/api/colaboradores/${colaboradorId}`, colaboradorUpdateData)
      console.log('[API /colaboradores/me/profile] ✅ Colaborador actualizado')
    }

    // Actualizar usuario en Stream Chat si cambió nombre o imagen
    if (personaId && (body.nombres !== undefined || body.primer_apellido !== undefined || body.imagen_id !== undefined)) {
      try {
        // Obtener datos actualizados de persona
        const personaResponse = await strapiClient.get<any>(
          `/api/personas/${personaId}?populate[imagen][populate]=*`
        )
        const personaData = personaResponse.data?.attributes || personaResponse.data

        const nombre = personaData?.nombre_completo ||
                      `${personaData?.nombres || ''} ${personaData?.primer_apellido || ''}`.trim() ||
                      colaborador.email_login ||
                      'Usuario'

        // Obtener avatar
        let avatar: string | undefined = undefined
        if (personaData?.imagen) {
          if (personaData.imagen.url) {
            avatar = `${process.env.NEXT_PUBLIC_STRAPI_URL || ''}${personaData.imagen.url}`
          } else if (personaData.imagen.data?.attributes?.url) {
            avatar = `${process.env.NEXT_PUBLIC_STRAPI_URL || ''}${personaData.imagen.data.attributes.url}`
          }
        }

        // Obtener RUT para identificar usuario en Stream
        const rut = personaData?.rut || colaborador.persona?.rut
        if (rut) {
          const streamClient = getStreamClient()
          await streamClient.upsertUser({
            id: String(rut),
            name: nombre,
            image: avatar,
          })
          console.log('[API /colaboradores/me/profile] ✅ Usuario actualizado en Stream Chat')
        }
      } catch (streamError: any) {
        console.error('[API /colaboradores/me/profile] Error al actualizar Stream Chat:', streamError)
        // No fallar si Stream Chat falla
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /colaboradores/me/profile] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al actualizar perfil',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * GET /api/colaboradores/me/profile
 * Obtiene el perfil completo del colaborador autenticado
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const colaborador = await getAuthColaborador()
    if (!colaborador) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      )
    }

    const colaboradorId = colaborador.id

    // Obtener datos completos del colaborador
    const response = await strapiClient.get<StrapiResponse<StrapiEntity<ColaboradorAttributes>>>(
      `/api/colaboradores/${colaboradorId}?populate[persona][populate][imagen][populate]=*&populate[persona][populate][telefonos]=*&populate[persona][populate][emails]=*`
    )

    const colaboradorRaw = response.data
    const colaboradorRawAny = colaboradorRaw as any
    const colaboradorAttrs = colaboradorRawAny.attributes || colaboradorRawAny
    const persona = colaboradorAttrs.persona?.data || colaboradorAttrs.persona

    // Extraer datos del perfil
    const profileData = {
      colaborador: {
        id: colaboradorRawAny.id,
        email_login: colaboradorAttrs.email_login || colaboradorRawAny.email_login,
        rol: colaboradorAttrs.rol || colaboradorRawAny.rol,
        activo: colaboradorAttrs.activo !== undefined ? colaboradorAttrs.activo : colaboradorRawAny.activo,
      },
      persona: persona ? {
        id: persona.id || persona.documentId,
        rut: persona.attributes?.rut || persona.rut,
        nombres: persona.attributes?.nombres || persona.nombres,
        primer_apellido: persona.attributes?.primer_apellido || persona.primer_apellido,
        segundo_apellido: persona.attributes?.segundo_apellido || persona.segundo_apellido,
        nombre_completo: persona.attributes?.nombre_completo || persona.nombre_completo,
        genero: persona.attributes?.genero || persona.genero,
        cumpleagno: persona.attributes?.cumpleagno || persona.cumpleagno,
        bio: persona.attributes?.bio || persona.bio,
        job_title: persona.attributes?.job_title || persona.job_title,
        imagen: persona.attributes?.imagen || persona.imagen,
        telefonos: persona.attributes?.telefonos || persona.telefonos,
        emails: persona.attributes?.emails || persona.emails,
        direccion: persona.attributes?.direccion || persona.direccion,
        redes_sociales: persona.attributes?.redes_sociales || persona.redes_sociales,
        skills: persona.attributes?.skills || persona.skills,
      } : null,
    }

    return NextResponse.json({
      success: true,
      data: profileData,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /colaboradores/me/profile GET] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener perfil',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

