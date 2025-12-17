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
 * GET - Obtener mensajes entre dos colaboradores (bidireccional)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const colaboradorId = searchParams.get('colaborador_id') // ID del colaborador con quien chateas
    const remitenteId = searchParams.get('remitente_id') // ID del colaborador autenticado (quien solicita)
    const ultimaFecha = searchParams.get('ultima_fecha')
    
    if (!colaboradorId || !remitenteId) {
      return NextResponse.json({ error: 'colaborador_id y remitente_id son requeridos' }, { status: 400 })
    }
    
    const colaboradorIdNum = parseInt(colaboradorId, 10)
    const remitenteIdNum = parseInt(remitenteId, 10)
    
    if (isNaN(colaboradorIdNum) || isNaN(remitenteIdNum)) {
      return NextResponse.json({ error: 'colaborador_id y remitente_id deben ser números válidos' }, { status: 400 })
    }
    
    // Obtener mensajes bidireccionales:
    // Caso 1: Mensajes donde yo (remitenteIdNum) envié al otro (colaboradorIdNum)
    //   remitente_id = remitenteIdNum AND cliente_id = colaboradorIdNum
    // Caso 2: Mensajes donde el otro (colaboradorIdNum) me envió a mí (remitenteIdNum)
    //   remitente_id = colaboradorIdNum AND cliente_id = remitenteIdNum
    
    const query1Url = `/api/intranet-chats?filters[remitente_id][$eq]=${remitenteIdNum}&filters[cliente_id][$eq]=${colaboradorIdNum}&sort=fecha:asc&pagination[pageSize]=1000`
    const query2Url = `/api/intranet-chats?filters[remitente_id][$eq]=${colaboradorIdNum}&filters[cliente_id][$eq]=${remitenteIdNum}&sort=fecha:asc&pagination[pageSize]=1000`
    
    // Agregar filtro de fecha si existe
    let query1 = query1Url
    let query2 = query2Url
    if (ultimaFecha) {
      try {
        const fechaLimite = new Date(ultimaFecha)
        fechaLimite.setSeconds(fechaLimite.getSeconds() - 2)
        const fechaISO = fechaLimite.toISOString()
        query1 += `&filters[fecha][$gt]=${fechaISO}`
        query2 += `&filters[fecha][$gt]=${fechaISO}`
      } catch (e) {
        // Ignorar error de fecha
      }
    }
    
    // Ejecutar ambas queries en paralelo
    const [response1, response2] = await Promise.all([
      strapiClient.get<StrapiResponse<StrapiEntity<ChatMensajeAttributes>>>(query1).catch((err) => {
        console.error('[API /chat/mensajes] Error en query1:', err)
        return { data: [] } as StrapiResponse<StrapiEntity<ChatMensajeAttributes>>
      }),
      strapiClient.get<StrapiResponse<StrapiEntity<ChatMensajeAttributes>>>(query2).catch((err) => {
        console.error('[API /chat/mensajes] Error en query2:', err)
        return { data: [] } as StrapiResponse<StrapiEntity<ChatMensajeAttributes>>
      }),
    ])
    
    // Extraer datos de ambas respuestas
    let data1: any[] = []
    if (response1?.data) {
      const raw1 = Array.isArray(response1.data) ? response1.data : [response1.data]
      data1 = raw1.map((item: any) => {
        // Si tiene attributes, extraerlos, sino usar directamente
        const attrs = item.attributes || item
        return {
          ...attrs,
          id: item.id || attrs.id,
        }
      })
    }
    
    let data2: any[] = []
    if (response2?.data) {
      const raw2 = Array.isArray(response2.data) ? response2.data : [response2.data]
      data2 = raw2.map((item: any) => {
        // Si tiene attributes, extraerlos, sino usar directamente
        const attrs = item.attributes || item
        return {
          ...attrs,
          id: item.id || attrs.id,
        }
      })
    }
    
    console.log('[API /chat/mensajes] Resultados:', {
      remitenteId: remitenteIdNum,
      colaboradorId: colaboradorIdNum,
      query1Count: data1.length,
      query2Count: data2.length,
      query1Sample: data1[0] ? { id: data1[0].id, remitente_id: data1[0].remitente_id, cliente_id: data1[0].cliente_id } : null,
      query2Sample: data2[0] ? { id: data2[0].id, remitente_id: data2[0].remitente_id, cliente_id: data2[0].cliente_id } : null,
    })
    
    // Combinar y ordenar por fecha
    const allMessages = [...data1, ...data2].sort((a: any, b: any) => {
      const fechaA = new Date(a.fecha || a.createdAt || 0).getTime()
      const fechaB = new Date(b.fecha || b.createdAt || 0).getTime()
      return fechaA - fechaB
    })
    
    return NextResponse.json({ data: allMessages, meta: {} }, { status: 200 })
  } catch (error: any) {
    console.error('[API /chat/mensajes] Error:', error)
    if (error.status === 404) {
      return NextResponse.json({ data: [], meta: {} }, { status: 200 })
    }
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
    const { texto, colaborador_id, remitente_id } = body
    
    if (!texto || !colaborador_id || !remitente_id) {
      return NextResponse.json(
        { error: 'texto, colaborador_id y remitente_id son requeridos' },
        { status: 400 }
      )
    }
    
    const colaboradorIdNum = parseInt(String(colaborador_id), 10)
    const remitenteIdNum = parseInt(String(remitente_id), 10)
    
    if (isNaN(colaboradorIdNum) || isNaN(remitenteIdNum)) {
      return NextResponse.json(
        { error: 'colaborador_id y remitente_id deben ser números válidos' },
        { status: 400 }
      )
    }
    
    const response = await strapiClient.post<StrapiResponse<StrapiEntity<ChatMensajeAttributes>>>(
      '/api/intranet-chats',
      {
        data: {
          texto,
          remitente_id: remitenteIdNum,
          cliente_id: colaboradorIdNum,
          fecha: new Date().toISOString(),
          leido: false,
        },
      }
    )
    
    return NextResponse.json(response, { status: 201 })
  } catch (error: any) {
    console.error('[API /chat/mensajes POST] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al enviar mensaje' },
      { status: error.status || 500 }
    )
  }
}
