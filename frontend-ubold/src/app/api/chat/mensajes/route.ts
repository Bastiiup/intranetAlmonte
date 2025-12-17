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
    
    // Obtener mensajes bidireccionales haciendo dos queries separadas
    // Caso 1: Mensajes donde yo (remitenteIdNum) envié al otro (colaboradorIdNum)
    //   remitente_id = remitenteIdNum AND cliente_id = colaboradorIdNum
    // Caso 2: Mensajes donde el otro (colaboradorIdNum) me envió a mí (remitenteIdNum)
    //   remitente_id = colaboradorIdNum AND cliente_id = remitenteIdNum
    
    // Construir ambas queries
    let query1 = `/api/intranet-chats?filters[remitente_id][$eq]=${remitenteIdNum}&filters[cliente_id][$eq]=${colaboradorIdNum}&sort=fecha:asc&pagination[pageSize]=1000`
    let query2 = `/api/intranet-chats?filters[remitente_id][$eq]=${colaboradorIdNum}&filters[cliente_id][$eq]=${remitenteIdNum}&sort=fecha:asc&pagination[pageSize]=1000`
    
    // Agregar filtro de fecha solo a query1 (mensajes que yo envié) para polling
    // Query2 (mensajes recibidos) NO usa filtro de fecha para asegurar que se obtengan todos
    if (ultimaFecha) {
      try {
        const fechaLimite = new Date(ultimaFecha)
        fechaLimite.setSeconds(fechaLimite.getSeconds() - 2)
        const fechaISO = encodeURIComponent(fechaLimite.toISOString())
        query1 += `&filters[fecha][$gt]=${fechaISO}`
        // NO agregar filtro de fecha a query2 para obtener todos los mensajes recibidos
      } catch (e) {
        // Ignorar error de fecha
      }
    }
    
    console.log('[API /chat/mensajes] Query URLs:', {
      query1: query1,
      query2: query2,
      remitenteId: remitenteIdNum,
      colaboradorId: colaboradorIdNum,
    })
    
    // Ejecutar ambas queries en paralelo
    const [response1, response2] = await Promise.all([
      strapiClient.get<StrapiResponse<StrapiEntity<ChatMensajeAttributes>>>(query1).catch((err) => {
        console.error('[API /chat/mensajes] Error en query1:', {
          message: err.message,
          status: err.status,
          url: query1,
        })
        return { data: [] } as StrapiResponse<StrapiEntity<ChatMensajeAttributes>>
      }),
      strapiClient.get<StrapiResponse<StrapiEntity<ChatMensajeAttributes>>>(query2).catch((err) => {
        console.error('[API /chat/mensajes] Error en query2:', {
          message: err.message,
          status: err.status,
          url: query2,
        })
        return { data: [] } as StrapiResponse<StrapiEntity<ChatMensajeAttributes>>
      }),
    ])
    
    console.log('[API /chat/mensajes] Respuestas raw de Strapi:', {
      response1HasData: !!response1?.data,
      response1Length: Array.isArray(response1?.data) ? response1.data.length : (response1?.data ? 1 : 0),
      response1Sample: response1?.data ? (Array.isArray(response1.data) ? response1.data[0] : response1.data) : null,
      response2HasData: !!response2?.data,
      response2Length: Array.isArray(response2?.data) ? response2.data.length : (response2?.data ? 1 : 0),
      response2Sample: response2?.data ? (Array.isArray(response2.data) ? response2.data[0] : response2.data) : null,
    })
    
    // Extraer datos de ambas respuestas
    let data1: any[] = []
    if (response1?.data) {
      const raw1 = Array.isArray(response1.data) ? response1.data : [response1.data]
      data1 = raw1.map((item: any) => {
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
        const attrs = item.attributes || item
        return {
          ...attrs,
          id: item.id || attrs.id,
        }
      })
    }
    
    console.log('[API /chat/mensajes] Datos extraídos:', {
      data1Count: data1.length,
      data1Sample: data1[0] ? { id: data1[0].id, remitente_id: data1[0].remitente_id, cliente_id: data1[0].cliente_id } : null,
      data2Count: data2.length,
      data2Sample: data2[0] ? { id: data2[0].id, remitente_id: data2[0].remitente_id, cliente_id: data2[0].cliente_id } : null,
    })
    
    // Combinar y ordenar por fecha
    const allMessages = [...data1, ...data2].sort((a: any, b: any) => {
      const fechaA = new Date(a.fecha || a.createdAt || 0).getTime()
      const fechaB = new Date(b.fecha || b.createdAt || 0).getTime()
      return fechaA - fechaB
    })
    
    console.log('[API /chat/mensajes] Resultados finales:', {
      remitenteId: remitenteIdNum,
      colaboradorId: colaboradorIdNum,
      totalCount: allMessages.length,
      query1Count: data1.length,
      query2Count: data2.length,
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
    
    console.log('[API /chat/mensajes POST] Enviando mensaje:', {
      texto: texto.substring(0, 50),
      remitente_id: remitenteIdNum,
      cliente_id: colaboradorIdNum,
    })
    
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
    
    const savedMessage = Array.isArray(response.data) ? response.data[0] : response.data
    const savedMessageData = (savedMessage as any)?.attributes || savedMessage
    console.log('[API /chat/mensajes POST] Mensaje guardado:', {
      id: (savedMessage as any)?.id || savedMessageData?.id,
      remitente_id: savedMessageData?.remitente_id,
      cliente_id: savedMessageData?.cliente_id,
    })
    
    return NextResponse.json(response, { status: 201 })
  } catch (error: any) {
    console.error('[API /chat/mensajes POST] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al enviar mensaje' },
      { status: error.status || 500 }
    )
  }
}
