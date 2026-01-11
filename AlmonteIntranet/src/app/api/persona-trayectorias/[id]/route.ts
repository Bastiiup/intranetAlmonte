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

    // ⚠️ IMPORTANTE: Filtrar campos no permitidos (igual que en POST)
    const camposPermitidos = new Set([
      'persona', 'colegio', 'cargo', 'anio', 'curso', 'asignatura', 
      'is_current', 'activo', 'fecha_inicio', 'fecha_fin', 'notas',
      'curso_asignatura', 'org_display_name', 'role_key', 'department',
      'colegio_region', 'correo', 'fecha_registro', 'ultimo_acceso'
    ])
    const camposProhibidos = new Set([
      'region', 'comuna', 'dependencia', 'zona', 'colegio_nombre', 'rbd',
      'telefonos', 'emails', 'direcciones', 'website', 'estado'
    ])
    
    const payloadLimpio: any = { data: {} }
    for (const key of Object.keys(body.data)) {
      if (camposProhibidos.has(key)) {
        console.warn(`[API /persona-trayectorias/[id] PUT] ⚠️ Omitiendo campo prohibido: ${key}`)
        continue
      }
      if (camposPermitidos.has(key)) {
        payloadLimpio.data[key] = body.data[key]
      }
    }

    console.log('[API /persona-trayectorias/[id] PUT] 📤 Payload limpio:', JSON.stringify(payloadLimpio, null, 2))

    // ⚠️ IMPORTANTE: El content type en Strapi es "persona-trayectorias"
    const response = await strapiClient.put<StrapiResponse<StrapiEntity<any>>>(
      `/api/persona-trayectorias/${id}`,
      payloadLimpio
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

    // ⚠️ IMPORTANTE: El content type en Strapi es "persona-trayectorias"
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
