/**
 * API Route para gestionar pedidos sincronizados
 * 
 * Endpoints:
 * - GET: Listar pedidos sincronizados entre WeareCloud y JumpSeller
 * - POST: Sincronizar pedidos manualmente
 */

import { NextRequest, NextResponse } from 'next/server'
import { syncOrders } from '@/lib/operaciones/services'

export const dynamic = 'force-dynamic'

/**
 * GET - Listar pedidos sincronizados
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const forceSync = searchParams.get('sync') === 'true'

    // Si se solicita sincronización, hacerla primero
    if (forceSync) {
      const syncedOrders = await syncOrders()
      return NextResponse.json({
        success: true,
        data: syncedOrders,
        count: syncedOrders.length
      })
    }

    // Por ahora, siempre sincronizamos al obtener la lista
    // En el futuro, podríamos cachear en Strapi
    const syncedOrders = await syncOrders()

    return NextResponse.json({
      success: true,
      data: syncedOrders,
      count: syncedOrders.length
    })
  } catch (error: any) {
    console.error('Error al obtener pedidos sincronizados:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener pedidos',
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * POST - Sincronizar pedidos manualmente
 */
export async function POST(request: NextRequest) {
  try {
    const syncedOrders = await syncOrders()

    return NextResponse.json({
      success: true,
      message: 'Pedidos sincronizados exitosamente',
      data: syncedOrders,
      count: syncedOrders.length
    })
  } catch (error: any) {
    console.error('Error al sincronizar pedidos:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al sincronizar pedidos',
      },
      { status: error.status || 500 }
    )
  }
}


