import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'
import { STRAPI_API_URL, STRAPI_API_TOKEN } from '@/lib/strapi/config'

export const dynamic = 'force-dynamic'

interface ColaboradorAttributes {
  email_login: string
  rol?: string
  activo: boolean
  persona?: any
  usuario?: any
}

/**
 * GET /api/colaboradores/me/profile
 * Obtiene el perfil completo del colaborador autenticado (con imagen y portada)
 */
export async function GET(request: Request) {
  try {
    // Obtener el token del header Authorization
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No se proporcionó un token de autenticación' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    // Obtener el usuario autenticado desde Strapi
    const userResponse = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!userResponse.ok) {
      return NextResponse.json(
        { error: 'Token inválido o expirado' },
        { status: 401 }
      )
    }

    const user = await userResponse.json()

    // Buscar el colaborador vinculado a este usuario con populate completo de persona, imagen y portada
    const colaboradorUrl = `/api/colaboradores?filters[usuario][id][$eq]=${user.id}&populate[persona][populate][imagen][populate]=*&populate[persona][populate][portada][populate]=*&populate[usuario]=*`
    
    const response = await strapiClient.get<StrapiResponse<StrapiEntity<ColaboradorAttributes>>>(
      colaboradorUrl
    )

    if (!response.data || (Array.isArray(response.data) && response.data.length === 0)) {
      return NextResponse.json(
        { error: 'No se encontró un colaborador vinculado a este usuario' },
        { status: 404 }
      )
    }

    const colaboradorRaw = Array.isArray(response.data) ? response.data[0] : response.data
    const colaboradorRawAny = colaboradorRaw as any
    
    // Extraer campos del colaborador
    const colaboradorAttrs = colaboradorRawAny.attributes || colaboradorRawAny
    const personaRaw = colaboradorAttrs.persona?.data || colaboradorRawAny.persona?.data || colaboradorAttrs.persona || colaboradorRawAny.persona || null
    
    // Normalizar estructura de persona
    let personaNormalizada = personaRaw
    
    if (personaRaw) {
      const personaAttrs = personaRaw.attributes || personaRaw
      
      // Normalizar imagen
      let imagenNormalizada: any = null
      const imagenRaw = personaAttrs.imagen
      
      if (imagenRaw?.imagen) {
        const imagenData = imagenRaw.imagen
        if (Array.isArray(imagenData) && imagenData.length > 0) {
          const primeraImagen = imagenData[0]
          imagenNormalizada = {
            url: primeraImagen.url || primeraImagen.attributes?.url || null,
            alternativeText: primeraImagen.alternativeText || null,
            width: primeraImagen.width || null,
            height: primeraImagen.height || null,
          }
        }
      } else if (imagenRaw?.url) {
        imagenNormalizada = {
          url: imagenRaw.url,
          alternativeText: imagenRaw.alternativeText || null,
          width: imagenRaw.width || null,
          height: imagenRaw.height || null,
        }
      } else if (Array.isArray(imagenRaw) && imagenRaw.length > 0) {
        const primeraImagen = imagenRaw[0]
        imagenNormalizada = {
          url: primeraImagen.url || primeraImagen.attributes?.url || null,
          alternativeText: primeraImagen.alternativeText || null,
          width: primeraImagen.width || null,
          height: primeraImagen.height || null,
        }
      } else if (imagenRaw?.data) {
        const dataArray = Array.isArray(imagenRaw.data) ? imagenRaw.data : [imagenRaw.data]
        if (dataArray.length > 0) {
          const primeraImagen = dataArray[0]
          imagenNormalizada = {
            url: primeraImagen.url || primeraImagen.attributes?.url || null,
            alternativeText: primeraImagen.alternativeText || null,
            width: primeraImagen.width || null,
            height: primeraImagen.height || null,
          }
        }
      }
      
      // Normalizar portada (similar a imagen)
      let portadaNormalizada: any = null
      const portadaRaw = personaAttrs.portada
      
      if (portadaRaw?.imagen) {
        const portadaData = portadaRaw.imagen
        if (Array.isArray(portadaData) && portadaData.length > 0) {
          const primeraPortada = portadaData[0]
          portadaNormalizada = {
            url: primeraPortada.url || primeraPortada.attributes?.url || null,
            alternativeText: primeraPortada.alternativeText || null,
            width: primeraPortada.width || null,
            height: primeraPortada.height || null,
          }
        }
      } else if (portadaRaw?.url) {
        portadaNormalizada = {
          url: portadaRaw.url,
          alternativeText: portadaRaw.alternativeText || null,
          width: portadaRaw.width || null,
          height: portadaRaw.height || null,
        }
      } else if (Array.isArray(portadaRaw) && portadaRaw.length > 0) {
        const primeraPortada = portadaRaw[0]
        portadaNormalizada = {
          url: primeraPortada.url || primeraPortada.attributes?.url || null,
          alternativeText: primeraPortada.alternativeText || null,
          width: primeraPortada.width || null,
          height: primeraPortada.height || null,
        }
      } else if (portadaRaw?.data) {
        const dataArray = Array.isArray(portadaRaw.data) ? portadaRaw.data : [portadaRaw.data]
        if (dataArray.length > 0) {
          const primeraPortada = dataArray[0]
          portadaNormalizada = {
            url: primeraPortada.url || primeraPortada.attributes?.url || null,
            alternativeText: primeraPortada.alternativeText || null,
            width: primeraPortada.width || null,
            height: primeraPortada.height || null,
          }
        }
      }
      
      // Construir persona normalizada
      personaNormalizada = {
        ...personaAttrs,
        ...(imagenNormalizada && { imagen: imagenNormalizada }),
        ...(portadaNormalizada && { portada: portadaNormalizada }),
      }
    }
    
    const colaborador = {
      id: colaboradorRawAny.id,
      documentId: colaboradorRawAny.documentId || colaboradorRawAny.id,
      email_login: colaboradorAttrs.email_login || colaboradorRawAny.email_login,
      rol: colaboradorAttrs.rol || colaboradorRawAny.rol || 'soporte',
      activo: colaboradorAttrs.activo !== undefined ? colaboradorAttrs.activo : colaboradorRawAny.activo,
      persona: personaNormalizada,
      usuario: colaboradorAttrs.usuario?.data || colaboradorRawAny.usuario?.data || colaboradorAttrs.usuario || colaboradorRawAny.usuario || null,
    }

    return NextResponse.json(colaborador, { status: 200 })
  } catch (error: any) {
    console.error('[API /colaboradores/me/profile GET] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        error: error.message || 'Error al obtener perfil del colaborador',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * PUT /api/colaboradores/me/profile
 * Actualiza el perfil del colaborador autenticado (incluye imagen_id y portada_id)
 */
export async function PUT(request: NextRequest) {
  try {
    // Obtener el token del header Authorization
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No se proporcionó un token de autenticación' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    // Obtener el usuario autenticado desde Strapi
    const userResponse = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!userResponse.ok) {
      return NextResponse.json(
        { error: 'Token inválido o expirado' },
        { status: 401 }
      )
    }

    const user = await userResponse.json()

    // Buscar el colaborador vinculado a este usuario
    const colaboradorUrl = `/api/colaboradores?filters[usuario][id][$eq]=${user.id}&populate[persona]=*`
    const response = await strapiClient.get<StrapiResponse<StrapiEntity<ColaboradorAttributes>>>(
      colaboradorUrl
    )

    if (!response.data || (Array.isArray(response.data) && response.data.length === 0)) {
      return NextResponse.json(
        { error: 'No se encontró un colaborador vinculado a este usuario' },
        { status: 404 }
      )
    }

    const colaboradorRaw = Array.isArray(response.data) ? response.data[0] : response.data
    const colaboradorRawAny = colaboradorRaw as any
    const colaboradorAttrs = colaboradorRawAny.attributes || colaboradorRawAny
    const personaRaw = colaboradorAttrs.persona?.data || colaboradorRawAny.persona?.data || colaboradorAttrs.persona || colaboradorRawAny.persona

    if (!personaRaw) {
      return NextResponse.json(
        { error: 'El colaborador no tiene una persona asociada' },
        { status: 404 }
      )
    }

    const personaId = personaRaw.id || personaRaw.documentId
    const personaAttrs = personaRaw.attributes || personaRaw

    // Obtener body de la petición
    const body = await request.json()

    // Preparar datos para actualizar persona
    const personaUpdateData: any = {
      data: {},
    }

    // Actualizar campos básicos si se proporcionan
    if (body.nombres !== undefined) personaUpdateData.data.nombres = body.nombres
    if (body.primer_apellido !== undefined) personaUpdateData.data.primer_apellido = body.primer_apellido
    if (body.segundo_apellido !== undefined) personaUpdateData.data.segundo_apellido = body.segundo_apellido
    if (body.rut !== undefined) personaUpdateData.data.rut = body.rut
    if (body.nombre_completo !== undefined) personaUpdateData.data.nombre_completo = body.nombre_completo

    // Manejar imagen_id
    let imagenIdParaActualizar: number | null = null
    if (body.imagen_id) {
      imagenIdParaActualizar = body.imagen_id
    }

    // Manejar portada_id
    let portadaIdParaActualizar: number | null = null
    if (body.portada_id) {
      portadaIdParaActualizar = body.portada_id
    }

    // IMPORTANTE: Permitir actualizar portada/imagen aunque no haya otros campos
    if (Object.keys(personaUpdateData.data).length > 0 || imagenIdParaActualizar || portadaIdParaActualizar) {
      // Si hay imagen_id, actualizar componente imagen
      if (imagenIdParaActualizar) {
        const tipo = 'perfil'
        const formato = 'imagen'
        const estado = 'vigente'
        const vigente_hasta = null
        const status = true

        // Intentar múltiples estructuras para el componente
        const estructurasImagen = [
          { imagen: [imagenIdParaActualizar], tipo, formato, estado, vigente_hasta, status },
          { imagen: [imagenIdParaActualizar] },
          [imagenIdParaActualizar],
          { imagen: { id: imagenIdParaActualizar } },
        ]

        for (const estructura of estructurasImagen) {
          try {
            personaUpdateData.data.imagen = estructura
            await strapiClient.put(`/api/personas/${personaId}`, personaUpdateData)
            break
          } catch (err: any) {
            // Continuar con siguiente estructura si falla
            continue
          }
        }
      }

      // Si hay portada_id, actualizar componente portada
      if (portadaIdParaActualizar) {
        const tipo = 'portada'
        const formato = 'imagen'
        const estado = 'vigente'
        const vigente_hasta = null
        const status = true

        // Intentar múltiples estructuras para el componente
        const estructurasPortada = [
          { imagen: [portadaIdParaActualizar], tipo, formato, estado, vigente_hasta, status },
          { imagen: [portadaIdParaActualizar] },
          [portadaIdParaActualizar],
          { imagen: { id: portadaIdParaActualizar } },
        ]

        for (const estructura of estructurasPortada) {
          try {
            personaUpdateData.data.portada = estructura
            await strapiClient.put(`/api/personas/${personaId}`, personaUpdateData)
            break
          } catch (err: any) {
            // Continuar con siguiente estructura si falla
            continue
          }
        }
      }

      // Si hay otros campos además de imagen/portada, actualizar también
      if (Object.keys(personaUpdateData.data).length > 0 && !imagenIdParaActualizar && !portadaIdParaActualizar) {
        await strapiClient.put(`/api/personas/${personaId}`, personaUpdateData)
      } else if (Object.keys(personaUpdateData.data).length > 0 && (imagenIdParaActualizar || portadaIdParaActualizar)) {
        // Si hay otros campos Y imagen/portada, hacer una actualización final con todo
        await strapiClient.put(`/api/personas/${personaId}`, personaUpdateData)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /colaboradores/me/profile PUT] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        error: error.message || 'Error al actualizar perfil',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}
