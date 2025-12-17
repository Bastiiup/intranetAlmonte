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
    
    // Convertir IDs a números
    const colaboradorIdNum = parseInt(colaboradorId, 10)
    const remitenteIdNum = parseInt(remitenteId, 10)
    
    if (isNaN(colaboradorIdNum) || isNaN(remitenteIdNum)) {
      return NextResponse.json({ error: 'colaborador_id y remitente_id deben ser números válidos' }, { status: 400 })
    }
    
    // Obtener mensajes bidireccionales haciendo dos queries y combinando resultados
    // Caso 1: Mensajes donde yo envié al otro (remitente_id = yo, cliente_id = él)
    // Caso 2: Mensajes donde él envió a mí (remitente_id = él, cliente_id = yo)
    
    const queries: Promise<StrapiResponse<StrapiEntity<ChatMensajeAttributes>>>[] = []
    
    // Query 1: Mensajes que yo envié al otro colaborador
    let query1 = `/api/intranet-chats?filters[remitente_id][$eq]=${remitenteIdNum}&filters[cliente_id][$eq]=${colaboradorIdNum}&sort=fecha:asc&pagination[pageSize]=1000`
    // Usar filtro de fecha solo si se proporciona, y restar 2 segundos para evitar perder mensajes por diferencias de tiempo
    if (ultimaFecha) {
      try {
        const fechaLimite = new Date(ultimaFecha)
        fechaLimite.setSeconds(fechaLimite.getSeconds() - 2) // Restar 2 segundos como margen
        query1 += `&filters[fecha][$gt]=${fechaLimite.toISOString()}`
      } catch (e) {
        // Si hay error al parsear la fecha, no usar filtro
        console.warn('[API /chat/mensajes] Error al parsear ultimaFecha, ignorando filtro:', e)
      }
    }
    queries.push(strapiClient.get<StrapiResponse<StrapiEntity<ChatMensajeAttributes>>>(query1))
    
    // Query 2: Mensajes que el otro colaborador me envió a mí
    let query2 = `/api/intranet-chats?filters[remitente_id][$eq]=${colaboradorIdNum}&filters[cliente_id][$eq]=${remitenteIdNum}&sort=fecha:asc&pagination[pageSize]=1000`
    // Usar filtro de fecha solo si se proporciona, y restar 2 segundos para evitar perder mensajes por diferencias de tiempo
    if (ultimaFecha) {
      try {
        const fechaLimite = new Date(ultimaFecha)
        fechaLimite.setSeconds(fechaLimite.getSeconds() - 2) // Restar 2 segundos como margen
        query2 += `&filters[fecha][$gt]=${fechaLimite.toISOString()}`
      } catch (e) {
        // Si hay error al parsear la fecha, no usar filtro
        console.warn('[API /chat/mensajes] Error al parsear ultimaFecha, ignorando filtro:', e)
      }
    }
    queries.push(strapiClient.get<StrapiResponse<StrapiEntity<ChatMensajeAttributes>>>(query2))
    
    console.log('[API /chat/mensajes] Obteniendo mensajes bidireccionales:', {
      colaboradorId: colaboradorIdNum,
      remitenteId: remitenteIdNum,
      ultimaFecha,
      query1,
      query2,
    })
    
    // Ejecutar ambas queries en paralelo con manejo de errores individual
    let response1: any = { data: [] }
    let response2: any = { data: [] }
    
    try {
      response1 = await strapiClient.get<StrapiResponse<StrapiEntity<ChatMensajeAttributes>>>(query1)
    } catch (err: any) {
      console.error('[API /chat/mensajes] Error en Query 1:', err)
      // Si es 404, no hay mensajes - continuar con array vacío
      if (err.status !== 404) {
        throw err
      }
    }
    
    try {
      response2 = await strapiClient.get<StrapiResponse<StrapiEntity<ChatMensajeAttributes>>>(query2)
    } catch (err: any) {
      console.error('[API /chat/mensajes] Error en Query 2:', err)
      // Si es 404, no hay mensajes - continuar con array vacío
      if (err.status !== 404) {
        throw err
      }
    }
    
    // Combinar los resultados de ambas queries
    // Strapi siempre devuelve data como array, incluso si está vacío
    let data1: any[] = []
    if (response1?.data) {
      if (Array.isArray(response1.data)) {
        data1 = response1.data
      } else if (response1.data) {
        data1 = [response1.data]
      }
    }
    
    let data2: any[] = []
    if (response2?.data) {
      if (Array.isArray(response2.data)) {
        data2 = response2.data
      } else if (response2.data) {
        data2 = [response2.data]
      }
    }
    
    // Log detallado antes de combinar
    console.log('[API /chat/mensajes] Datos recibidos:', {
      response1Complete: JSON.stringify(response1).substring(0, 200),
      response2Complete: JSON.stringify(response2).substring(0, 200),
      response1HasData: !!response1?.data,
      response1DataType: Array.isArray(response1?.data) ? 'array' : typeof response1?.data,
      response1DataLength: Array.isArray(response1?.data) ? response1.data.length : (response1?.data ? 1 : 0),
      response2HasData: !!response2?.data,
      response2DataType: Array.isArray(response2?.data) ? 'array' : typeof response2?.data,
      response2DataLength: Array.isArray(response2?.data) ? response2.data.length : (response2?.data ? 1 : 0),
      data1Length: data1.length,
      data2Length: data2.length,
      sample1: data1[0],
      sample2: data2[0],
    })
    
    // Combinar y ordenar por fecha
    const allMessages = [...data1, ...data2].sort((a: any, b: any) => {
      const fechaA = new Date(a.fecha || a.createdAt || 0).getTime()
      const fechaB = new Date(b.fecha || b.createdAt || 0).getTime()
      return fechaA - fechaB
    })
    
    // Crear respuesta combinada
    const response = {
      data: allMessages,
      meta: response1.meta || response2.meta || {},
    }
    
    console.log('[API /chat/mensajes] Mensajes recibidos (combinados):', {
      count: allMessages.length,
      fromQuery1: data1.length,
      fromQuery2: data2.length,
      sample: allMessages[0],
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
    // Si es 502 o 504, es un problema de conexión con Strapi
    if (error.status === 502 || error.status === 504) {
      console.error('[API /chat/mensajes] Error de conexión con Strapi:', {
        status: error.status,
        message: error.message,
        url: process.env.NEXT_PUBLIC_STRAPI_URL,
      })
      return NextResponse.json(
        { error: 'Error de conexión con Strapi. Verifica que el servidor esté disponible.' },
        { status: 502 }
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
    const { texto, colaborador_id, remitente_id } = body
    
    if (!texto || !colaborador_id || !remitente_id) {
      return NextResponse.json(
        { error: 'texto, colaborador_id y remitente_id son requeridos' },
        { status: 400 }
      )
    }
    
    // Convertir IDs a números
    const colaboradorIdNum = parseInt(String(colaborador_id), 10)
    const remitenteIdNum = parseInt(String(remitente_id), 10)
    
    if (isNaN(colaboradorIdNum) || isNaN(remitenteIdNum)) {
      return NextResponse.json(
        { error: 'colaborador_id y remitente_id deben ser números válidos' },
        { status: 400 }
      )
    }
    
    console.log('[API /chat/mensajes] Enviando mensaje:', {
      texto: texto.substring(0, 50) + '...',
      colaborador_id: colaboradorIdNum, // ID del colaborador con quien chateas
      remitente_id: remitenteIdNum, // ID del colaborador autenticado (quien envía)
    })
    
    const response = await strapiClient.post<StrapiResponse<StrapiEntity<ChatMensajeAttributes>>>(
      '/api/intranet-chats',
      {
        data: {
          texto,
          remitente_id: remitenteIdNum,
          cliente_id: colaboradorIdNum, // Usamos cliente_id en Strapi pero representa colaborador_id
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
    // Si es 502 o 504, es un problema de conexión con Strapi
    if (error.status === 502 || error.status === 504) {
      console.error('[API /chat/mensajes POST] Error de conexión con Strapi:', {
        status: error.status,
        message: error.message,
        url: process.env.NEXT_PUBLIC_STRAPI_URL,
      })
      return NextResponse.json(
        { error: 'Error de conexión con Strapi. Verifica que el servidor esté disponible.' },
        { status: 502 }
      )
    }
    console.error('Error al enviar mensaje:', error)
    return NextResponse.json(
      { error: error.message || 'Error al enviar mensaje' },
      { status: error.status || 500 }
    )
  }
}

