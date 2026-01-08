/**
 * API Route para gestionar una trayectoria específica
 * PUT, DELETE /api/persona-trayectorias/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

/**
 * PUT /api/persona-trayectorias/[id]
 * Actualiza una trayectoria
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (!body.data) {
      return NextResponse.json(
        {
          success: false,
          error: 'Datos de trayectoria requeridos',
        },
        { status: 400 }
      )
    }

    const response = await strapiClient.put<StrapiResponse<StrapiEntity<any>>>(
      `/api/persona-trayectorias/${id}`,
      body
    )

    return NextResponse.json({
      success: true,
      data: response.data,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /persona-trayectorias/[id] PUT] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al actualizar trayectoria',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * DELETE /api/persona-trayectorias/[id]
 * Elimina una trayectoria
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await strapiClient.delete(`/api/persona-trayectorias/${id}`)

    return NextResponse.json({
      success: true,
      message: 'Trayectoria eliminada exitosamente',
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /persona-trayectorias/[id] DELETE] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al eliminar trayectoria',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}
