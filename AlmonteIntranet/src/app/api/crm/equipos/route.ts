/**
 * API Route para gestionar equipos de trabajo
 * GET /api/crm/equipos - Listar equipos
 * POST /api/crm/equipos - Crear equipo
 */

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

interface EquipoAttributes {
  nombre?: string
  descripcion?: string
  activo?: boolean
  createdAt?: string
  updatedAt?: string
  miembros?: any // Relation many-to-many con Personas
  colegio?: any // Relation many-to-one con Colegio
  lider?: any // Relation many-to-one con Persona
}

/**
 * GET /api/crm/equipos
 * Obtiene el listado de equipos
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') || '1'
    const pageSize = searchParams.get('pageSize') || '50'
    const search = searchParams.get('search') || ''
    const activo = searchParams.get('activo')

    const params = new URLSearchParams({
      'pagination[page]': page,
      'pagination[pageSize]': pageSize,
      'sort[0]': 'updatedAt:desc',
    })

    // Populate relaciones
    params.append('populate[miembros][populate][emails]', 'true')
    params.append('populate[miembros][populate][telefonos]', 'true')
    params.append('populate[miembros][populate][imagen]', 'true')
    params.append('populate[colegio]', 'true')
    params.append('populate[lider][populate][emails]', 'true')
    params.append('populate[lider][populate][imagen]', 'true')

    // Filtros
    if (activo !== null && activo !== undefined) {
      params.append('filters[activo][$eq]', activo === 'true' ? 'true' : 'false')
    }

    // Búsqueda
    if (search) {
      params.append('filters[nombre][$containsi]', search)
    }

    const url = `/api/equipos?${params.toString()}`
    const response = await strapiClient.get<StrapiResponse<StrapiEntity<EquipoAttributes>>>(url)

    return NextResponse.json({
      success: true,
      data: response.data,
      meta: response.meta,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/equipos GET] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener equipos',
        details: error instanceof Error ? error.message : 'Unknown error',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * POST /api/crm/equipos
 * Crea un nuevo equipo
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validaciones básicas
    if (!body.nombre || !body.nombre.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'El nombre del equipo es obligatorio',
        },
        { status: 400 }
      )
    }

    // Preparar datos para Strapi
    const equipoData: any = {
      data: {
        nombre: body.nombre.trim(),
        ...(body.descripcion && { descripcion: body.descripcion.trim() }),
        activo: body.activo !== undefined ? body.activo : true,
      },
    }

    // Agregar relaciones si existen
    if (body.miembros && Array.isArray(body.miembros) && body.miembros.length > 0) {
      // Convertir a IDs numéricos
      const miembrosIds = body.miembros
        .map((id: string | number) => {
          const numId = typeof id === 'string' ? parseInt(id) : id
          return !isNaN(numId) && numId > 0 ? numId : null
        })
        .filter((id: number | null): id is number => id !== null)

      if (miembrosIds.length > 0) {
        equipoData.data.miembros = { connect: miembrosIds }
      }
    }

    if (body.colegio) {
      const colegioId = typeof body.colegio === 'string' ? parseInt(body.colegio) : body.colegio
      if (!isNaN(colegioId) && colegioId > 0) {
        equipoData.data.colegio = colegioId
      }
    }

    if (body.lider) {
      const liderId = typeof body.lider === 'string' ? parseInt(body.lider) : body.lider
      if (!isNaN(liderId) && liderId > 0) {
        equipoData.data.lider = liderId
      }
    }

    const response = await strapiClient.post<StrapiResponse<StrapiEntity<EquipoAttributes>>>(
      '/api/equipos',
      equipoData
    )

    // Revalidar cache
    revalidatePath('/crm/contacts')
    revalidatePath('/crm/contacts/[id]', 'page')
    revalidateTag('equipos')

    return NextResponse.json({
      success: true,
      data: response.data,
      message: 'Equipo creado exitosamente',
    }, { status: 201 })
  } catch (error: any) {
    console.error('[API /crm/equipos POST] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: 'Error al crear equipo',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}
