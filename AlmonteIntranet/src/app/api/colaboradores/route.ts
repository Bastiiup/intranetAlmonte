import { NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'
import { PersonaService } from '@/lib/services/personaService'
import { extractStrapiData, getStrapiId, normalizeColaborador, normalizePersona } from '@/lib/strapi/helpers'

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
    // populate[usuario]=* pide persona_perfil que no existe en users-permissions; usar campos explícitos
    let url = `/api/colaboradores?populate[persona][fields]=rut,nombres,primer_apellido,segundo_apellido,nombre_completo&populate[usuario][fields]=id,documentId,username,email,confirmed,blocked&pagination[page]=${page}&pagination[pageSize]=${pageSize}&sort=createdAt:desc`
    
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

    // Manejar creación/relación de persona usando PersonaService
    let personaId: string | number | null = null

    if (body.persona) {
      const personaData = body.persona

      // Si ya existe un personaId, usar ese
      if (personaData.personaId) {
        personaId = personaData.personaId
        console.log('[API /colaboradores POST] ✅ Usando persona existente:', personaId)
      } else if (personaData.rut) {
        // Usar PersonaService para crear o actualizar persona
        try {
          personaId = await PersonaService.createOrUpdate({
            rut: personaData.rut,
            nombres: personaData.nombres,
            primer_apellido: personaData.primer_apellido,
            segundo_apellido: personaData.segundo_apellido,
            genero: personaData.genero,
            cumpleagno: personaData.cumpleagno,
          })
          console.log('[API /colaboradores POST] ✅ Persona procesada exitosamente:', personaId)
        } catch (error: any) {
          console.error('[API /colaboradores POST] ❌ Error al procesar persona:', error)
          throw new Error(`Error al procesar persona: ${error.message || 'Error desconocido'}`)
        }
      }
    }

    // Validar que si hay persona, tenga ID (debe haberse creado/buscado exitosamente)
    if (body.persona && body.persona.rut && !personaId) {
      throw new Error('No se pudo obtener el ID de la persona. La persona debe crearse/buscarse antes del colaborador.')
    }

    const colaboradorData: any = {
      data: {
        email_login: body.email_login.trim(),
        activo: false, // Siempre false - requiere activación por super_admin desde solicitudes
        ...(body.password && { password: body.password }),
        ...(body.rol && body.rol.trim() && { rol: body.rol.trim() }),
        // CRÍTICO: Vincular persona usando el ID (Strapi acepta id numérico o documentId)
        // Si personaId es documentId (string), Strapi lo manejará correctamente
        // Si personaId es id numérico, también funcionará
        ...(personaId && { persona: personaId }),
        ...(body.usuario && { usuario: body.usuario }),
        // NO enviar auth_provider - dejarlo vacío en Strapi
      },
    }

    console.log('[API /colaboradores POST] 📤 Datos del colaborador a crear:', {
      email_login: colaboradorData.data.email_login,
      tienePersona: !!colaboradorData.data.persona,
      personaId: colaboradorData.data.persona || 'NO HAY',
      personaIdTipo: colaboradorData.data.persona ? typeof colaboradorData.data.persona : 'N/A',
      tieneRol: !!colaboradorData.data.rol,
      rol: colaboradorData.data.rol || 'NO HAY',
    })

    const response = await strapiClient.post<StrapiResponse<StrapiEntity<ColaboradorAttributes>>>(
      '/api/colaboradores',
      colaboradorData
    )

    // Verificar que la relación se haya establecido correctamente usando helpers
    const colaboradorCreado = extractStrapiData(response)
    const colaboradorAttrs = normalizeColaborador(colaboradorCreado)
    
    console.log('[API /colaboradores POST] ✅ Colaborador creado:', {
      id: getStrapiId(colaboradorCreado),
      email: colaboradorAttrs?.email_login,
      tienePersona: !!colaboradorAttrs?.persona,
      personaId: colaboradorAttrs?.persona ? getStrapiId(normalizePersona(colaboradorAttrs.persona)) : 'NO HAY',
    })
    
    // Si no se vinculó la persona, intentar actualizar el colaborador
    if (personaId && !colaboradorAttrs?.persona) {
      console.warn('[API /colaboradores POST] ⚠️ La persona no se vinculó automáticamente, intentando actualizar...')
      try {
        const colaboradorIdParaActualizar = getStrapiId(colaboradorCreado)
        if (colaboradorIdParaActualizar) {
          await strapiClient.put(`/api/colaboradores/${colaboradorIdParaActualizar}`, {
            data: {
              persona: personaId,
            },
          })
          console.log('[API /colaboradores POST] ✅ Persona vinculada manualmente después de crear colaborador')
        }
      } catch (updateError: any) {
        console.error('[API /colaboradores POST] ❌ Error al vincular persona después de crear colaborador:', updateError.message)
        // No fallar la creación, solo loggear el error
      }
    }

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

