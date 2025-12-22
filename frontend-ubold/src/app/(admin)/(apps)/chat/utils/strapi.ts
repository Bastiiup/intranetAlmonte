/**
 * Utilidades para interactuar con Strapi desde el chat
 */

import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

// Tipo para WO-Cliente desde Strapi
export interface WOCliente {
  id: number
  attributes: {
    nombre: string
    correo_electronico: string
    ultima_actividad?: string
    fecha_registro?: string
    pedidos?: number
    gasto_total?: number
    createdAt?: string
    updatedAt?: string
  }
}

// Tipo para mensaje de chat desde Strapi
export interface ChatMensaje {
  id: number
  attributes: {
    texto: string
    remitente_id: number
    cliente_id: number
    fecha: string
    leido: boolean
    createdAt?: string
    updatedAt?: string
  }
}

/**
 * Obtener todos los clientes desde WO-Clientes
 */
export async function obtenerClientes(): Promise<WOCliente[]> {
  try {
    const response = await strapiClient.get<StrapiResponse<StrapiEntity<WOCliente['attributes']>>>(
      '/api/wo-clientes?pagination[pageSize]=1000&sort=nombre:asc'
    )
    
    const data = Array.isArray(response.data) ? response.data : [response.data]
    return data.map((item) => ({
      id: item.id,
      attributes: item.attributes,
    }))
  } catch (error) {
    console.error('Error al obtener clientes desde Strapi:', error)
    return []
  }
}

/**
 * Obtener mensajes de chat para un cliente específico
 */
export async function obtenerMensajes(clienteId: number, ultimaFecha?: string): Promise<ChatMensaje[]> {
  try {
    let query = `/api/intranet-chats?filters[cliente_id][$eq]=${clienteId}&sort=fecha:asc&pagination[pageSize]=1000`
    
    // Si hay una última fecha, obtener solo mensajes más recientes
    if (ultimaFecha) {
      query += `&filters[fecha][$gt]=${ultimaFecha}`
    }
    
    const response = await strapiClient.get<StrapiResponse<StrapiEntity<ChatMensaje['attributes']>>>(query)
    
    const data = Array.isArray(response.data) ? response.data : [response.data]
    return data.map((item) => ({
      id: item.id,
      attributes: item.attributes,
    }))
  } catch (error) {
    console.error('Error al obtener mensajes desde Strapi:', error)
    return []
  }
}

/**
 * Enviar un mensaje a Strapi
 */
export async function enviarMensaje(
  texto: string,
  clienteId: number,
  remitenteId: number = 1 // Por defecto, el usuario actual (puedes obtenerlo de sesión)
): Promise<ChatMensaje | null> {
  try {
    const response = await strapiClient.post<StrapiResponse<StrapiEntity<ChatMensaje['attributes']>>>(
      '/api/intranet-chats',
      {
        data: {
          texto,
          remitente_id: remitenteId,
          cliente_id: clienteId,
          fecha: new Date().toISOString(),
          leido: false,
        },
      }
    )
    
    const data = Array.isArray(response.data) ? response.data[0] : response.data
    return {
      id: data.id,
      attributes: data.attributes,
    }
  } catch (error) {
    console.error('Error al enviar mensaje a Strapi:', error)
    return null
  }
}

/**
 * Marcar mensajes como leídos
 */
export async function marcarMensajesComoLeidos(clienteId: number): Promise<boolean> {
  try {
    // Obtener todos los mensajes no leídos del cliente
    const mensajes = await obtenerMensajes(clienteId)
    const noLeidos = mensajes.filter((m) => !m.attributes.leido && m.attributes.remitente_id !== 1)
    
    // Marcar cada uno como leído
    for (const mensaje of noLeidos) {
      await strapiClient.put(`/api/intranet-chats/${mensaje.id}`, {
        data: {
          leido: true,
        },
      })
    }
    
    return true
  } catch (error) {
    console.error('Error al marcar mensajes como leídos:', error)
    return false
  }
}

