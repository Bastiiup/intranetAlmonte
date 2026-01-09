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

    if (!colaborador) {
      return NextResponse.json(
        { error: 'No se encontró información del colaborador. Debes iniciar sesión.' },
        { status: 401 }
      )
    }

    // Obtener RUT del body si viene, sino del colaborador autenticado
    let rut: string | null = null
    try {
      const body = await request.json()
      rut = body.rut || null
    } catch {
      // Si no hay body, usar el RUT del colaborador autenticado
    }

    // Intentar obtener RUT de diferentes estructuras posibles
    if (!rut) {
      // Estructura 1: colaborador.persona.rut
      rut = colaborador.persona?.rut || null
      
      // Estructura 2: colaborador.attributes.persona.rut
      if (!rut) {
        rut = colaborador.attributes?.persona?.rut || null
      }
      
      // Estructura 3: colaborador.persona.attributes.rut
      if (!rut) {
        rut = colaborador.persona?.attributes?.rut || null
      }
      
      // Estructura 4: colaborador.persona.data.attributes.rut (si viene de Strapi)
      if (!rut && colaborador.persona?.data) {
        rut = colaborador.persona.data.attributes?.rut || colaborador.persona.data.rut || null
      }
      
      console.log('[API /chat/stream-token] 🔍 RUT obtenido del colaborador:', rut || 'NO ENCONTRADO')
    }

    // Si aún no tenemos RUT, intentar obtenerlo desde Strapi
    if (!rut && colaborador.id) {
      try {
        console.log('[API /chat/stream-token] 🔍 RUT no encontrado en cookies, obteniendo desde Strapi...')
        const colaboradorId = colaborador.documentId || colaborador.id
        const colaboradorResponse = await strapiClient.get<any>(
          `/api/colaboradores/${colaboradorId}?populate[persona][fields][0]=rut`
        )
        
        const colaboradorData = colaboradorResponse.data?.attributes || colaboradorResponse.data
        const personaData = colaboradorData?.persona?.data?.attributes || colaboradorData?.persona?.attributes || colaboradorData?.persona
        
        if (personaData?.rut) {
          rut = personaData.rut
          console.log('[API /chat/stream-token] ✅ RUT obtenido desde Strapi:', rut)
        }
      } catch (strapiError: any) {
        console.warn('[API /chat/stream-token] ⚠️ Error al obtener RUT desde Strapi:', strapiError.message)
      }
    }

    if (!rut) {
      console.error('[API /chat/stream-token] ❌ No se pudo obtener RUT. Estructura del colaborador:', {
        keys: Object.keys(colaborador),
        personaKeys: colaborador.persona ? Object.keys(colaborador.persona) : 'no persona',
        attributesKeys: colaborador.attributes ? Object.keys(colaborador.attributes) : 'no attributes',
      })
      return NextResponse.json(
        { 
          error: 'No se pudo obtener el RUT de la persona. Tu perfil debe tener un RUT configurado.',
          hint: 'Verifica en Strapi que el colaborador tenga una persona asociada con RUT.',
        },
        { status: 400 }
      )
    }

    const rutString = String(rut).trim()

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

    // Generar token de autenticación para este usuario usando RUT como ID
    const token = streamClient.createToken(rutString)

    // Crear o actualizar el usuario en Stream usando RUT como ID
    await streamClient.upsertUser({
      id: rutString,
      name: nombre,
      image: avatar,
    })

    // Obtener API Key pública para el cliente
    // Usar los mismos nombres que el cliente de Stream usa
    // Priorizar STREAM_API_KEY / STREAM_CHAT_API_KEY (nombres oficiales)
    const apiKey = process.env.STREAM_API_KEY || 
                   process.env.STREAM_CHAT_API_KEY || 
                   process.env.NEXT_PUBLIC_STREAM_API_KEY || 
                   process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY

    if (!apiKey) {
      console.error('[API /chat/stream-token] ⚠️ API Key no encontrada en variables de entorno')
      console.error('[API /chat/stream-token] 🔍 Variables disponibles:', {
        hasSTREAM_API_KEY: !!process.env.STREAM_API_KEY,
        hasSTREAM_CHAT_API_KEY: !!process.env.STREAM_CHAT_API_KEY,
        hasNEXT_PUBLIC_STREAM_API_KEY: !!process.env.NEXT_PUBLIC_STREAM_API_KEY,
        hasNEXT_PUBLIC_STREAM_CHAT_API_KEY: !!process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY,
        allStreamVars: Object.keys(process.env).filter(key => key.includes('STREAM')),
      })
    } else {
      console.log('[API /chat/stream-token] ✅ API Key obtenida correctamente')
    }

    return NextResponse.json({
      token,
      userId: rutString,
      apiKey, // Incluir API key para que el cliente pueda usarla
    })
  } catch (error: any) {
    console.error('[API /chat/stream-token] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al generar token de Stream' },
      { status: 500 }
    )
  }
}

