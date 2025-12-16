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
    
    // Convertir clienteId a número para asegurar que sea un integer
    const clienteIdNum = parseInt(clienteId, 10)
    if (isNaN(clienteIdNum)) {
      return NextResponse.json({ error: 'cliente_id debe ser un número válido' }, { status: 400 })
    }
    
    let query = `/api/intranet-chats?filters[cliente_id][$eq]=${clienteIdNum}&sort=fecha:asc&pagination[pageSize]=1000`
    
    if (ultimaFecha) {
      query += `&filters[fecha][$gt]=${ultimaFecha}`
    }
    
    console.log('[API /chat/mensajes] Obteniendo mensajes:', {
      clienteId: clienteIdNum,
      ultimaFecha,
      query,
    })
    
    const response = await strapiClient.get<StrapiResponse<StrapiEntity<ChatMensajeAttributes>>>(query)
    
    // Log para debugging
    const mensajesData = Array.isArray(response.data) ? response.data : [response.data]
    console.log('[API /chat/mensajes] Mensajes recibidos:', {
      count: mensajesData.length,
      sample: mensajesData[0],
    })
    
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
    
    // Convertir cliente_id a número para asegurar que sea un integer
    const clienteIdNum = parseInt(String(cliente_id), 10)
    if (isNaN(clienteIdNum)) {
      return NextResponse.json(
        { error: 'cliente_id debe ser un número válido' },
        { status: 400 }
      )
    }
    
    const remitenteIdNum = parseInt(String(remitente_id), 10) || 1
    
    console.log('[API /chat/mensajes] Enviando mensaje:', {
      texto: texto.substring(0, 50) + '...',
      cliente_id: clienteIdNum,
      remitente_id: remitenteIdNum,
    })
    
    const response = await strapiClient.post<StrapiResponse<StrapiEntity<ChatMensajeAttributes>>>(
      '/api/intranet-chats',
      {
        data: {
          texto,
          remitente_id: remitenteIdNum,
          cliente_id: clienteIdNum,
          fecha: new Date().toISOString(),
          leido: false,
        },
      }
    )
    
    console.log('[API /chat/mensajes] Mensaje enviado exitosamente:', {
      id: Array.isArray(response.data) ? response.data[0]?.id : response.data?.id,
    })
    
    return NextResponse.json(response, { status: 201 })
  } catch (error: any) {
    console.error('Error al enviar mensaje:', error)
    return NextResponse.json(
      { error: error.message || 'Error al enviar mensaje' },
      { status: error.status || 500 }
    )
  }
}

