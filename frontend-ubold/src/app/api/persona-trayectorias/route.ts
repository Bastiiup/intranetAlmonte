/**
 * API Route para gestionar trayectorias de personas
 * POST /api/persona-trayectorias
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

/**
 * POST /api/persona-trayectorias
 * Crea una nueva trayectoria
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validaciones
    if (!body.data) {
      return NextResponse.json(
        {
          success: false,
          error: 'Datos de trayectoria requeridos',
        },
        { status: 400 }
      )
    }

    if (!body.data.persona || !body.data.colegio) {
      return NextResponse.json(
        {
          success: false,
          error: 'Persona y colegio son obligatorios',
        },
        { status: 400 }
      )
    }

    // ⚠️ IMPORTANTE: En Strapi, el content type se llama "Profesores", no "persona-trayectorias"
    // El endpoint real es /api/profesores
    const response = await strapiClient.post<StrapiResponse<StrapiEntity<any>>>(
      '/api/profesores',
      body
    )

    return NextResponse.json({
      success: true,
      data: response.data,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /persona-trayectorias POST] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al crear trayectoria',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}
