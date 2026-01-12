/**
 * API Route para asegurar que un usuario existe en Stream Chat
 * Crea o actualiza el usuario en Stream antes de crear un canal
 * 
 * En lugar de buscar en Strapi directamente, usa los datos de la lista de colaboradores
 * que ya fueron cargados para evitar llamadas redundantes
 */

import { NextRequest, NextResponse } from 'next/server'
import { getStreamClient } from '@/lib/stream/client'
import strapiClient from '@/lib/strapi/client'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

/**
 * Obtiene el colaborador autenticado desde las cookies con verificación de sesión única
 */
async function getAuthColaborador() {
  const { getColaboradorFromCookies } = await import('@/lib/auth/cookies')
  return await getColaboradorFromCookies(true) // Verificar sesión única
}

export async function POST(request: NextRequest) {
  try {
    // Verificar que el usuario está autenticado
    const currentColaborador = await getAuthColaborador()
    if (!currentColaborador) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Obtener el RUT del colaborador del body
    const body = await request.json()
    const { rut } = body

    if (!rut) {
      return NextResponse.json(
        { error: 'rut es requerido' },
        { status: 400 }
      )
    }

    const rutString = String(rut).trim()

    // Obtener información del colaborador desde Strapi usando filtro por RUT
    try {
      const response = await strapiClient.get<any>(
        `/api/colaboradores?filters[persona][rut][$eq]=${rutString}&populate[persona][fields]=rut,nombres,primer_apellido,segundo_apellido,nombre_completo&populate[persona][populate][imagen][populate]=*`
      )

      // Los datos vienen en formato array cuando se usa filtro
      let colaboradorItem: any = null
      if (Array.isArray(response.data) && response.data.length > 0) {
        colaboradorItem = response.data[0]
      }

      if (!colaboradorItem) {
        throw new Error('Colaborador no encontrado')
      }

      // Extraer datos del colaborador (puede venir con o sin attributes)
      const colaboradorData = colaboradorItem.attributes || colaboradorItem
      const persona = colaboradorData.persona

      // Obtener nombre
      const nombre = persona?.nombre_completo ||
                    `${persona?.nombres || ''} ${persona?.primer_apellido || ''}`.trim() ||
                    colaboradorData.email_login ||
                    'Usuario'

      // Obtener avatar - manejar diferentes estructuras de imagen
      let avatar: string | undefined = undefined
      if (persona?.imagen) {
        // Caso 1: URL directa
        if (persona.imagen.url) {
          avatar = `${process.env.NEXT_PUBLIC_STRAPI_URL || ''}${persona.imagen.url}`
        }
        // Caso 2: Estructura con data.attributes.url
        else if (persona.imagen.data?.attributes?.url) {
          avatar = `${process.env.NEXT_PUBLIC_STRAPI_URL || ''}${persona.imagen.data.attributes.url}`
        }
        // Caso 3: Array de imágenes
        else if (Array.isArray(persona.imagen.data) && persona.imagen.data.length > 0) {
          const imagenData = persona.imagen.data[0]
          avatar = `${process.env.NEXT_PUBLIC_STRAPI_URL || ''}${imagenData.attributes?.url || imagenData.url || ''}`
        }
      }

      // Obtener cliente de Stream
      const streamClient = getStreamClient()

      // Crear o actualizar el usuario en Stream usando RUT como ID
      await streamClient.upsertUser({
        id: rutString,
        name: nombre,
        image: avatar,
      })

      return NextResponse.json({
        success: true,
        userId: rutString,
      })
    } catch (strapiError: any) {
      console.error('[API /chat/stream-ensure-user] Error al obtener colaborador de Strapi:', strapiError)
      
      // Si no podemos obtener los datos completos, crear usuario básico
      const streamClient = getStreamClient()
      await streamClient.upsertUser({
        id: rutString,
        name: `Usuario ${rutString}`,
      })

      return NextResponse.json({
        success: true,
        userId: rutString,
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

