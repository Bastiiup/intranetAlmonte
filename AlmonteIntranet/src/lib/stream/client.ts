/**
 * Cliente de Stream Chat para el servidor
 * 
 * Este cliente se usa en el servidor para generar tokens de autenticación
 * usando el API Secret (que nunca debe exponerse al cliente)
 */

import { StreamChat } from 'stream-chat'

let streamClient: StreamChat | null = null

/**
 * Obtiene o crea la instancia del cliente de Stream Chat
 */
export function getStreamClient(): StreamChat {
  if (streamClient) {
    return streamClient
  }

  // Usar los nombres que Stream Dashboard proporciona
  const apiKey = process.env.STREAM_API_KEY || process.env.STREAM_CHAT_API_KEY
  const apiSecret = process.env.STREAM_SECRET_KEY || process.env.STREAM_CHAT_API_SECRET

  if (!apiKey || !apiSecret) {
    throw new Error(
      'STREAM_API_KEY (o STREAM_CHAT_API_KEY) y STREAM_SECRET_KEY (o STREAM_CHAT_API_SECRET) deben estar configuradas en las variables de entorno'
    )
  }

  streamClient = new StreamChat(apiKey, apiSecret)

  return streamClient
}

