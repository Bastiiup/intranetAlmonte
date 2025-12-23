/**
 * API Route para gestionar un colaborador específico
 * GET, PUT, DELETE /api/colaboradores/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

interface ColaboradorAttributes {
  email_login: string
  rol?: string
  rol_principal?: string
  rol_operativo?: string
  activo: boolean
  persona?: any
  empresa?: any
  usuario?: any
}

/**
 * GET /api/colaboradores/[id]
 * Obtiene un colaborador específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const response = await strapiClient.get<StrapiResponse<StrapiEntity<ColaboradorAttributes>>>(
      `/api/colaboradores/${id}?populate[persona]=*&populate[empresa]=*&populate[usuario]=*`
    )

    return NextResponse.json({
      success: true,
      data: response.data,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /colaboradores/[id] GET] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener colaborador',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * PUT /api/colaboradores/[id]
 * Actualiza un colaborador
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Preparar datos para Strapi
    const colaboradorData: any = {
      data: {
        email_login: body.email_login,
        rol: body.rol || null,
        rol_principal: body.rol_principal || null,
        rol_operativo: body.rol_operativo || null,
        activo: body.activo !== undefined ? body.activo : true,
        ...(body.persona && { persona: body.persona }),
        ...(body.empresa && { empresa: body.empresa }),
        ...(body.usuario && { usuario: body.usuario }),
      },
    }

    const response = await strapiClient.put<StrapiResponse<StrapiEntity<ColaboradorAttributes>>>(
      `/api/colaboradores/${id}`,
      colaboradorData
    )

    return NextResponse.json({
      success: true,
      data: response.data,
      message: 'Colaborador actualizado exitosamente',
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /colaboradores/[id] PUT] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al actualizar colaborador',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * DELETE /api/colaboradores/[id]
 * Elimina un colaborador (soft delete marcando como inactivo)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Soft delete: marcar como inactivo en lugar de eliminar
    const colaboradorData: any = {
      data: {
        activo: false,
      },
    }

    const response = await strapiClient.put<StrapiResponse<StrapiEntity<ColaboradorAttributes>>>(
      `/api/colaboradores/${id}`,
      colaboradorData
    )

    return NextResponse.json({
      success: true,
      data: response.data,
      message: 'Colaborador desactivado exitosamente',
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /colaboradores/[id] DELETE] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al eliminar colaborador',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

