/**
 * Servicios para el módulo de chat
 * Contiene la lógica de negocio reutilizable para mensajes de chat
 */

import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export interface ChatMensajeAttributes {
  texto: string
  remitente_id: number
  cliente_id: number
  fecha: string
  leido: boolean
}

export interface ChatMensaje extends ChatMensajeAttributes {
  id: number | string
}

/**
 * Construye las queries para obtener mensajes bidireccionales
 */
export function buildChatQueries(
  remitenteId: number,
  colaboradorId: number,
  ultimaFecha?: string | null
): { query1: string; query2: string } {
  let query1 = `/api/intranet-chats?filters[remitente_id][$eq]=${remitenteId}&filters[cliente_id][$eq]=${colaboradorId}&sort=fecha:asc&pagination[pageSize]=1000`
  let query2 = `/api/intranet-chats?filters[remitente_id][$eq]=${colaboradorId}&filters[cliente_id][$eq]=${remitenteId}&sort=fecha:asc&pagination[pageSize]=1000`

  // Agregar filtro de fecha solo a query1 (mensajes que yo envié) para polling
  // Query2 (mensajes recibidos) NO usa filtro de fecha para asegurar que se obtengan todos
  if (ultimaFecha) {
    try {
      const fechaLimite = new Date(ultimaFecha)
      fechaLimite.setSeconds(fechaLimite.getSeconds() - 2)
      const fechaISO = encodeURIComponent(fechaLimite.toISOString())
      query1 += `&filters[fecha][$gt]=${fechaISO}`
    } catch (e) {
      // Ignorar error de fecha
    }
  }

  return { query1, query2 }
}

/**
 * Ejecuta una query con retry en caso de error 502
 */
export async function ejecutarQueryConRetry<T>(
  query: string,
  nombre: string,
  maxRetries = 2
): Promise<T> {
  for (let intento = 0; intento <= maxRetries; intento++) {
    try {
      const response = await strapiClient.get<T>(query)
      if (intento > 0) {
        console.log(`[Chat Service] ${nombre} exitoso en intento ${intento + 1}`)
      }
      return response
    } catch (err: any) {
      if (err.status === 502 && intento < maxRetries) {
        console.warn(`[Chat Service] ${nombre} falló con 502, reintentando... (intento ${intento + 1}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, 1000 * (intento + 1))) // Esperar 1s, 2s, etc.
        continue
      }
      console.error(`[Chat Service] Error en ${nombre}:`, {
        message: err.message,
        status: err.status,
        url: query,
        intento: intento + 1,
      })
      return { data: [] } as T
    }
  }
  return { data: [] } as T
}

/**
 * Extrae y normaliza los datos de una respuesta de Strapi
 */
export function extractChatMessages(
  response: StrapiResponse<StrapiEntity<ChatMensajeAttributes>>
): ChatMensaje[] {
  if (!response?.data) {
    return []
  }

  const raw = Array.isArray(response.data) ? response.data : [response.data]
  
  return raw.map((item: any) => {
    const attrs = item.attributes || item
    return {
      ...attrs,
      id: item.id || attrs.id,
    }
  })
}

/**
 * Combina y ordena mensajes por fecha
 */
export function combineAndSortMessages(messages1: ChatMensaje[], messages2: ChatMensaje[]): ChatMensaje[] {
  const allMessages = [...messages1, ...messages2]
  
  return allMessages.sort((a, b) => {
    const fechaA = new Date(a.fecha || 0).getTime()
    const fechaB = new Date(b.fecha || 0).getTime()
    return fechaA - fechaB
  })
}

/**
 * Obtiene mensajes entre dos colaboradores
 */
export async function getChatMessages(
  remitenteId: number,
  colaboradorId: number,
  ultimaFecha?: string | null
): Promise<ChatMensaje[]> {
  const { query1, query2 } = buildChatQueries(remitenteId, colaboradorId, ultimaFecha)

  console.log('[Chat Service] Query URLs:', {
    query1,
    query2,
    remitenteId,
    colaboradorId,
  })

  const [response1, response2] = await Promise.all([
    ejecutarQueryConRetry<StrapiResponse<StrapiEntity<ChatMensajeAttributes>>>(query1, 'query1'),
    ejecutarQueryConRetry<StrapiResponse<StrapiEntity<ChatMensajeAttributes>>>(query2, 'query2'),
  ])

  console.log('[Chat Service] Respuestas raw de Strapi:', {
    response1HasData: !!response1?.data,
    response1Length: Array.isArray(response1?.data) ? response1.data.length : (response1?.data ? 1 : 0),
    response2HasData: !!response2?.data,
    response2Length: Array.isArray(response2?.data) ? response2.data.length : (response2?.data ? 1 : 0),
  })

  const data1 = extractChatMessages(response1)
  const data2 = extractChatMessages(response2)

  console.log('[Chat Service] Datos extraídos:', {
    data1Count: data1.length,
    data2Count: data2.length,
  })

  const allMessages = combineAndSortMessages(data1, data2)

  console.log('[Chat Service] Resultados finales:', {
    remitenteId,
    colaboradorId,
    totalCount: allMessages.length,
    query1Count: data1.length,
    query2Count: data2.length,
  })

  return allMessages
}

/**
 * Envía un nuevo mensaje de chat
 */
export async function sendChatMessage(
  texto: string,
  remitenteId: number,
  colaboradorId: number
): Promise<StrapiResponse<StrapiEntity<ChatMensajeAttributes>>> {
  console.log('[Chat Service] Enviando mensaje:', {
    texto: texto.substring(0, 50),
    remitente_id: remitenteId,
    cliente_id: colaboradorId,
  })

  const response = await strapiClient.post<StrapiResponse<StrapiEntity<ChatMensajeAttributes>>>(
    '/api/intranet-chats',
    {
      data: {
        texto,
        remitente_id: remitenteId,
        cliente_id: colaboradorId,
        fecha: new Date().toISOString(),
        leido: false,
      },
    }
  )

  const savedMessage = Array.isArray(response.data) ? response.data[0] : response.data
  const savedMessageData = (savedMessage as any)?.attributes || savedMessage
  
  console.log('[Chat Service] Mensaje guardado:', {
    id: (savedMessage as any)?.id || savedMessageData?.id,
    remitente_id: savedMessageData?.remitente_id,
    cliente_id: savedMessageData?.cliente_id,
  })

  return response
}
