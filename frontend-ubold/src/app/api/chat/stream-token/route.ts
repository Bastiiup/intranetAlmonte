/**
 * API Route para generar tokens de autenticación de Stream Chat
 * 
 * Este endpoint genera un token JWT específico para un usuario que permite
 * conectarse a Stream Chat. El token se genera usando el API Secret del servidor.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getStreamClient } from '@/lib/stream/client'
import { cookies } from 'next/headers'
import strapiClient from '@/lib/strapi/client'

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
    console.error('[API /chat/stream-token] Error al obtener colaborador de cookies:', error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    // Obtener colaborador autenticado
    const colaborador = await getAuthColaborador()

    if (!colaborador || !colaborador.id) {
      return NextResponse.json(
        { error: 'No se encontró información del colaborador. Debes iniciar sesión.' },
        { status: 401 }
      )
    }

    const colaboradorId = String(colaborador.id)

    // Obtener información completa del colaborador desde Strapi para el perfil
    let nombre = colaborador.persona?.nombre_completo ||
                `${colaborador.persona?.nombres || ''} ${colaborador.persona?.primer_apellido || ''}`.trim() ||
                colaborador.email_login ||
                'Usuario'

    let avatar: string | undefined = undefined
    
    // Si tenemos la imagen en las cookies, usarla
    if (colaborador.persona?.imagen?.url) {
      avatar = `${process.env.NEXT_PUBLIC_STRAPI_URL || ''}${colaborador.persona.imagen.url}`
    }
    // Nota: Si no hay imagen, avatar será undefined, lo cual está bien

    // Obtener cliente de Stream
    const streamClient = getStreamClient()

    // Generar token de autenticación para este usuario
    const token = streamClient.createToken(colaboradorId)

    // Crear o actualizar el usuario en Stream
    await streamClient.upsertUser({
      id: colaboradorId,
      name: nombre,
      image: avatar,
    })

    return NextResponse.json({
      token,
      userId: colaboradorId,
    })
  } catch (error: any) {
    console.error('[API /chat/stream-token] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al generar token de Stream' },
      { status: 500 }
    )
  }
}

