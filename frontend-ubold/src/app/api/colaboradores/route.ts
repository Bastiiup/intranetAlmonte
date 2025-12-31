import { NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

interface ColaboradorAttributes {
  email_login: string
  rol_principal?: string
  rol_operativo?: string
  activo: boolean
  persona?: any
  empresa?: any
  usuario?: any
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const activo = searchParams.get('activo')
    const rol = searchParams.get('rol')
    const page = searchParams.get('page') || '1'
    const pageSize = searchParams.get('pageSize') || '50'

    // Usar fields específicos para persona para evitar errores con campos que no existen (tags, etc)
    let url = `/api/colaboradores?populate[persona][fields]=rut,nombres,primer_apellido,segundo_apellido,nombre_completo&populate[usuario]=*&pagination[page]=${page}&pagination[pageSize]=${pageSize}&sort=createdAt:desc`
    
    if (email) {
      url += `&filters[email_login][$contains]=${encodeURIComponent(email)}`
    }
    
    if (activo !== null && activo !== undefined && activo !== '') {
      const isActivo = activo === 'true'
      url += `&filters[activo][$eq]=${isActivo}`
    }
    
    if (rol) {
      url += `&filters[rol][$eq]=${encodeURIComponent(rol)}`
    }

    const response = await strapiClient.get<StrapiResponse<StrapiEntity<ColaboradorAttributes>>>(
      url
    )

    return NextResponse.json({
      success: true,
      data: response.data,
      meta: response.meta,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /colaboradores] Error al obtener colaboradores:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener colaboradores',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * POST /api/colaboradores
 * Crea un nuevo colaborador
 * Si se proporcionan datos de persona, busca o crea la persona primero
 */
export async function POST(request: Request) {
  try {
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
    if (body.password && body.password.trim().length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: 'La contraseña debe tener al menos 6 caracteres',
        },
        { status: 400 }
      )
    }

    let personaId: string | null = null

    // Manejar creación/relación de persona
    if (body.persona) {
      const personaData = body.persona

      // Si ya existe un personaId, usar ese
      if (personaData.personaId) {
        personaId = personaData.personaId
        console.log('[API /colaboradores POST] ✅ Usando persona existente:', personaId)
      } else if (personaData.rut) {
        // Buscar persona por RUT - si no existe, crearla PRIMERO antes del colaborador
        let personaExiste = false
        
        try {
          const personaSearchResponse = await strapiClient.get<any>(
            `/api/personas?filters[rut][$eq]=${encodeURIComponent(personaData.rut.trim())}&pagination[pageSize]=1`
          )

          if (personaSearchResponse.data && Array.isArray(personaSearchResponse.data) && personaSearchResponse.data.length > 0) {
            // Persona existe, usar su ID
            personaId = personaSearchResponse.data[0].id || personaSearchResponse.data[0].documentId
            personaExiste = true
            console.log('[API /colaboradores POST] ✅ Persona encontrada por RUT:', personaId)

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
              console.log('[API /colaboradores POST] ✅ Persona actualizada')
            }
          }
        } catch (searchError: any) {
          // Si la búsqueda falla con 404, asumir que no existe y crear
          if (searchError.status === 404) {
            console.log('[API /colaboradores POST] ⚠️ Persona no encontrada (404), se creará nueva')
            personaExiste = false
          } else {
            // Otro error en la búsqueda, lanzar error
            console.error('[API /colaboradores POST] ❌ Error al buscar persona:', searchError)
            throw new Error(`Error al buscar persona: ${searchError.message || 'Error desconocido'}`)
          }
        }

        // Si la persona no existe, crearla PRIMERO antes del colaborador
        if (!personaExiste) {
          console.log('[API /colaboradores POST] 📚 Creando nueva persona primero (antes del colaborador)...')
          
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

          try {
            const personaResponse = await strapiClient.post<any>(
              '/api/personas',
              personaCreateData
            )

            personaId = personaResponse.data?.id || personaResponse.data?.documentId || personaResponse.id || personaResponse.documentId
            
            if (!personaId) {
              throw new Error('No se pudo obtener el ID de la persona creada. Respuesta: ' + JSON.stringify(personaResponse))
            }
            
            console.log('[API /colaboradores POST] ✅ Persona creada exitosamente:', personaId)
          } catch (createError: any) {
            console.error('[API /colaboradores POST] ❌ Error al crear persona:', createError)
            throw new Error(`Error al crear persona: ${createError.message || 'Error desconocido'}. La persona debe crearse antes del colaborador.`)
          }
        }
      }
    }

    // Preparar datos para Strapi
    // Asegurar que auth_provider tenga un valor válido (siempre debe enviarse)
    const authProvider = body.auth_provider && body.auth_provider.trim() && ['google', 'strapi', 'otro'].includes(body.auth_provider.trim())
      ? body.auth_provider.trim()
      : 'google'

    // Validar que si hay persona, tenga ID (debe haberse creado/buscado exitosamente)
    if (body.persona && body.persona.rut && !personaId) {
      throw new Error('No se pudo obtener el ID de la persona. La persona debe crearse/buscarse antes del colaborador.')
    }

    const colaboradorData: any = {
      data: {
        email_login: body.email_login.trim(),
        auth_provider: authProvider, // Siempre enviar auth_provider con valor válido
        activo: body.activo !== undefined ? body.activo : true,
        ...(body.password && { password: body.password }),
        ...(body.rol_principal && body.rol_principal.trim() && { rol_principal: body.rol_principal.trim() }),
        ...(body.rol_operativo && body.rol_operativo.trim() && { rol_operativo: body.rol_operativo.trim() }),
        ...(personaId && { persona: personaId }),
        ...(body.usuario && { usuario: body.usuario }),
      },
    }

    console.log('[API /colaboradores POST] 📤 Datos del colaborador a crear:', {
      email_login: colaboradorData.data.email_login,
      auth_provider: colaboradorData.data.auth_provider,
      tienePersona: !!colaboradorData.data.persona,
      personaId: colaboradorData.data.persona || 'NO HAY',
      tieneRolPrincipal: !!colaboradorData.data.rol_principal,
      rolPrincipal: colaboradorData.data.rol_principal || 'NO HAY',
    })

    const response = await strapiClient.post<StrapiResponse<StrapiEntity<ColaboradorAttributes>>>(
      '/api/colaboradores',
      colaboradorData
    )

    return NextResponse.json({
      success: true,
      data: response.data,
      message: 'Colaborador creado exitosamente',
    }, { status: 201 })
  } catch (error: any) {
    console.error('[API /colaboradores POST] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al crear colaborador',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

