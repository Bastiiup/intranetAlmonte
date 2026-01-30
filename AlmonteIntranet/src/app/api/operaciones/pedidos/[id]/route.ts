/**
 * API Route para gestionar un pedido específico
 * 
 * Endpoints:
 * - GET: Obtener detalles de un pedido sincronizado
 * - PUT: Actualizar pedido en JumpSeller
 */

import { NextRequest, NextResponse } from 'next/server'
import { syncOrder, updateJumpSellerOrder } from '@/lib/operaciones/services'

export const dynamic = 'force-dynamic'

/**
 * GET - Obtener detalles de un pedido sincronizado
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const { id } = resolvedParams
    const searchParams = request.nextUrl.searchParams
    const source = searchParams.get('source') // 'wearecloud' | 'jumpseller'

    // Determinar si es ID de WeareCloud o JumpSeller
    const isJumpSellerId = !isNaN(Number(id))
    
    const syncResult = await syncOrder({
      jumpseller_order_id: isJumpSellerId ? Number(id) : undefined,
      wearecloud_order_id: !isJumpSellerId ? id : undefined,
    })

    if (!syncResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: syncResult.error || 'No se pudo obtener el pedido',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: syncResult.order
    })
  } catch (error: any) {
    console.error('Error al obtener pedido:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener pedido',
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * PUT - Actualizar pedido en JumpSeller
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const { id } = resolvedParams
    const body = await request.json()

    // Validar que el ID sea numérico (JumpSeller usa IDs numéricos)
    const orderId = Number(id)
    if (isNaN(orderId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID de pedido inválido. JumpSeller requiere IDs numéricos.',
        },
        { status: 400 }
      )
    }

    // Validar campos permitidos
    const allowedFields = ['status', 'customer_note', 'internal_note', 'shipping_method', 'shipping_method_title']
    const updates: any = {}
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se proporcionaron campos válidos para actualizar',
        },
        { status: 400 }
      )
    }

    // Actualizar pedido en JumpSeller
    const result = await updateJumpSellerOrder(orderId, updates)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'No se pudo actualizar el pedido',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Pedido actualizado exitosamente en JumpSeller. El cliente recibirá un correo automático.',
      data: result.order,
      changes: result.changes
    })
  } catch (error: any) {
    console.error('Error al actualizar pedido:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al actualizar pedido',
      },
      { status: error.status || 500 }
    )
  }
}


