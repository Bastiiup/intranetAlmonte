/**
 * API Route para asegurar que un usuario existe en Stream Chat
 * Crea o actualiza el usuario en Stream antes de crear un canal
 */

import { NextRequest, NextResponse } from 'next/server'
import { getStreamClient } from '@/lib/stream/client'
import strapiClient from '@/lib/strapi/client'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

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
    console.error('[API /chat/stream-ensure-user] Error al obtener colaborador de cookies:', error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar que el usuario está autenticado
    const currentColaborador = await getAuthColaborador()
    if (!currentColaborador || !currentColaborador.id) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Obtener el ID del colaborador del body
    const body = await request.json()
    const { colaboradorId } = body

    if (!colaboradorId) {
      return NextResponse.json(
        { error: 'colaboradorId es requerido' },
        { status: 400 }
      )
    }

    // Obtener información del colaborador desde Strapi
    try {
      const response = await strapiClient.get<any>(
        `/api/colaboradores/${colaboradorId}?populate[persona][fields]=rut,nombres,primer_apellido,segundo_apellido,nombre_completo&populate[persona][populate][imagen][populate]=*`
      )

      const colaboradorData = response.data?.attributes || response.data || {}
      const persona = colaboradorData.persona || colaboradorData.attributes?.persona

      // Obtener nombre
      const nombre = persona?.nombre_completo ||
                    `${persona?.nombres || ''} ${persona?.primer_apellido || ''}`.trim() ||
                    colaboradorData.email_login ||
                    'Usuario'

      // Obtener avatar
      let avatar: string | undefined = undefined
      if (persona?.imagen?.url) {
        avatar = `${process.env.NEXT_PUBLIC_STRAPI_URL || ''}${persona.imagen.url}`
      } else if (persona?.imagen?.data?.attributes?.url) {
        avatar = `${process.env.NEXT_PUBLIC_STRAPI_URL || ''}${persona.imagen.data.attributes.url}`
      }

      // Obtener cliente de Stream
      const streamClient = getStreamClient()

      // Crear o actualizar el usuario en Stream
      await streamClient.upsertUser({
        id: String(colaboradorId),
        name: nombre,
        image: avatar,
      })

      return NextResponse.json({
        success: true,
        userId: String(colaboradorId),
      })
    } catch (strapiError: any) {
      console.error('[API /chat/stream-ensure-user] Error al obtener colaborador de Strapi:', strapiError)
      
      // Si no podemos obtener los datos completos, crear usuario básico
      const streamClient = getStreamClient()
      await streamClient.upsertUser({
        id: String(colaboradorId),
        name: `Usuario ${colaboradorId}`,
      })

      return NextResponse.json({
        success: true,
        userId: String(colaboradorId),
        warning: 'Usuario creado con datos básicos',
      })
    }
  } catch (error: any) {
    console.error('[API /chat/stream-ensure-user] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al asegurar usuario en Stream' },
      { status: 500 }
    )
  }
}

