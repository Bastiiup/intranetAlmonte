import { NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

interface ColaboradorAttributes {
  email_login: string
  rol_principal?: string
  rol_operativo?: string
  activo: boolean
  persona?: any
  empresa?: any
  usuario?: any
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const activo = searchParams.get('activo')
    const rol = searchParams.get('rol')
    const page = searchParams.get('page') || '1'
    const pageSize = searchParams.get('pageSize') || '50'

    let url = `/api/colaboradores?populate[persona]=*&populate[empresa]=*&populate[usuario]=*&pagination[page]=${page}&pagination[pageSize]=${pageSize}&sort=createdAt:desc`
    
    if (email) {
      url += `&filters[email_login][$contains]=${encodeURIComponent(email)}`
    }
    
    if (activo !== null && activo !== undefined) {
      url += `&filters[activo][$eq]=${activo === 'true'}`
    }
    
    if (rol) {
      url += `&filters[rol][$eq]=${encodeURIComponent(rol)}`
    }

    const response = await strapiClient.get<StrapiResponse<StrapiEntity<ColaboradorAttributes>>>(
      url
    )

    return NextResponse.json({
      success: true,
      data: response.data,
      meta: response.meta,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /colaboradores] Error al obtener colaboradores:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener colaboradores',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * POST /api/colaboradores
 * Crea un nuevo colaborador
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validaciones básicas
    if (!body.email_login) {
      return NextResponse.json(
        {
          success: false,
          error: 'El email_login es obligatorio',
        },
        { status: 400 }
      )
    }

    // Preparar datos para Strapi
    const colaboradorData: any = {
      data: {
        email_login: body.email_login.trim(),
        rol: body.rol || null,
        rol_principal: body.rol_principal || null,
        rol_operativo: body.rol_operativo || null,
        activo: body.activo !== undefined ? body.activo : true,
        ...(body.persona && { persona: body.persona }),
        ...(body.empresa && { empresa: body.empresa }),
        ...(body.usuario && { usuario: body.usuario }),
      },
    }

    const response = await strapiClient.post<StrapiResponse<StrapiEntity<ColaboradorAttributes>>>(
      '/api/colaboradores',
      colaboradorData
    )

    return NextResponse.json({
      success: true,
      data: response.data,
      message: 'Colaborador creado exitosamente',
    }, { status: 201 })
  } catch (error: any) {
    console.error('[API /colaboradores POST] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al crear colaborador',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

