/**
 * API Route para obtener y enviar mensajes de chat
 * 
 * Esta ruta utiliza servicios modulares para mantener la lógica de negocio separada
 */

import { NextRequest, NextResponse } from 'next/server'
import { getChatMessages, sendChatMessage } from '@/lib/api/chat/services'
import { validateGetMessagesParams, validateSendMessageParams } from '@/lib/api/chat/validators'
import { requireAuth } from '@/lib/auth/middleware'

export const dynamic = 'force-dynamic'

/**
 * GET - Obtener mensajes entre dos colaboradores (bidireccional)
 */
export async function GET(request: NextRequest) {
  // Verificar autenticación
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const searchParams = request.nextUrl.searchParams
    const colaboradorId = searchParams.get('colaborador_id')
    const remitenteId = searchParams.get('remitente_id')
    const ultimaFecha = searchParams.get('ultima_fecha')
    
    // Validar parámetros
    const validation = validateGetMessagesParams(colaboradorId, remitenteId)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    
    const colaboradorIdNum = parseInt(colaboradorId!, 10)
    const remitenteIdNum = parseInt(remitenteId!, 10)
    
    // Obtener mensajes usando el servicio modular
    const allMessages = await getChatMessages(remitenteIdNum, colaboradorIdNum, ultimaFecha)
    
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
  // Verificar autenticación
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { texto, colaborador_id, remitente_id } = body
    
    // Validar parámetros
    const validation = validateSendMessageParams(texto, colaborador_id, remitente_id)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    
    const colaboradorIdNum = parseInt(String(colaborador_id), 10)
    const remitenteIdNum = parseInt(String(remitente_id), 10)
    
    // Enviar mensaje usando el servicio modular
    const response = await sendChatMessage(texto, remitenteIdNum, colaboradorIdNum)
    
    return NextResponse.json(response, { status: 201 })
  } catch (error: any) {
    console.error('[API /chat/mensajes POST] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al enviar mensaje' },
      { status: error.status || 500 }
    )
  }
}
