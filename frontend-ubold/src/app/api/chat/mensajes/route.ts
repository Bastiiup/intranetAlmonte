/**
 * API Route para obtener y enviar mensajes de chat
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

interface ChatMensajeAttributes {
  texto: string
  remitente_id: number
  cliente_id: number
  fecha: string
  leido: boolean
}

/**
 * GET - Obtener mensajes de un cliente
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const clienteId = searchParams.get('cliente_id')
    const ultimaFecha = searchParams.get('ultima_fecha')
    
    if (!clienteId) {
      return NextResponse.json({ error: 'cliente_id es requerido' }, { status: 400 })
    }
    
    let query = `/api/intranet-chats?filters[cliente_id][$eq]=${clienteId}&sort=fecha:asc&pagination[pageSize]=1000`
    
    if (ultimaFecha) {
      query += `&filters[fecha][$gt]=${ultimaFecha}`
    }
    
    const response = await strapiClient.get<StrapiResponse<StrapiEntity<ChatMensajeAttributes>>>(query)
    
    return NextResponse.json(response, { status: 200 })
  } catch (error: any) {
    // Si es 404, el content type no existe aún - retornar array vacío en lugar de error
    if (error.status === 404) {
      return NextResponse.json(
        { data: [], meta: {} },
        { status: 200 }
      )
    }
    console.error('Error al obtener mensajes:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener mensajes' },
      { status: error.status || 500 }
    )
  }
}

/**
 * POST - Enviar un nuevo mensaje
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { texto, cliente_id, remitente_id = 1 } = body
    
    if (!texto || !cliente_id) {
      return NextResponse.json(
        { error: 'texto y cliente_id son requeridos' },
        { status: 400 }
      )
    }
    
    const response = await strapiClient.post<StrapiResponse<StrapiEntity<ChatMensajeAttributes>>>(
      '/api/intranet-chats',
      {
        data: {
          texto,
          remitente_id: remitente_id || 1,
          cliente_id,
          fecha: new Date().toISOString(),
          leido: false,
        },
      }
    )
    
    return NextResponse.json(response, { status: 201 })
  } catch (error: any) {
    console.error('Error al enviar mensaje:', error)
    return NextResponse.json(
      { error: error.message || 'Error al enviar mensaje' },
      { status: error.status || 500 }
    )
  }
}

