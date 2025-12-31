import { NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

interface PersonaAttributes {
  rut?: string
  nombres?: string
  primer_apellido?: string
  segundo_apellido?: string
  nombre_completo?: string
  genero?: string
  cumpleagno?: string
}

/**
 * GET /api/personas
 * Busca personas con filtros opcionales
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const rut = searchParams.get('filters[rut][$eq]')
    const page = searchParams.get('page') || '1'
    const pageSize = searchParams.get('pagination[pageSize]') || searchParams.get('pageSize') || '10'

    // Construir URL con filtros
    let url = `/api/personas?pagination[page]=${page}&pagination[pageSize]=${pageSize}&sort=createdAt:desc`
    
    // Agregar filtro de RUT si existe
    if (rut) {
      url += `&filters[rut][$eq]=${encodeURIComponent(rut)}`
    }

    const response = await strapiClient.get<StrapiResponse<StrapiEntity<PersonaAttributes>>>(
      url
    )

    return NextResponse.json({
      success: true,
      data: response.data,
      meta: response.meta,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /personas] Error al obtener personas:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener personas',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * POST /api/personas
 * Crea una nueva persona
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Preparar datos para Strapi
    const personaData: any = {
      data: {
        rut: body.rut?.trim() || null,
        nombres: body.nombres?.trim() || null,
        primer_apellido: body.primer_apellido?.trim() || null,
        segundo_apellido: body.segundo_apellido?.trim() || null,
        nombre_completo: body.nombre_completo?.trim() || null,
        genero: body.genero || null,
        cumpleagno: body.cumpleagno || null,
        origen: 'manual',
        activo: body.activo !== undefined ? body.activo : true,
      },
    }

    const response = await strapiClient.post<StrapiResponse<StrapiEntity<PersonaAttributes>>>(
      '/api/personas',
      personaData
    )

    return NextResponse.json({
      success: true,
      data: response.data,
      message: 'Persona creada exitosamente',
    }, { status: 201 })
  } catch (error: any) {
    console.error('[API /personas POST] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al crear persona',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

