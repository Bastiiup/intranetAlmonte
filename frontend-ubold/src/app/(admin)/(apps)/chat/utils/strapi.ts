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

// TODO: Funciones de mensajes eliminadas - se implementará con Stream Chat
// Las siguientes funciones fueron eliminadas:
// - obtenerMensajes()
// - enviarMensaje()
// - marcarMensajesComoLeidos()
// Se implementarán usando Stream Chat SDK

