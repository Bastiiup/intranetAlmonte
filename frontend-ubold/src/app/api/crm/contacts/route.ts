import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

interface PersonaAttributes {
  nombre_completo?: string
  nombres?: string
  primer_apellido?: string
  segundo_apellido?: string
  rut?: string
  nivel_confianza?: 'baja' | 'media' | 'alta'
  origen?: 'mineduc' | 'csv' | 'manual' | 'crm' | 'web' | 'otro'
  activo?: boolean
  createdAt?: string
  updatedAt?: string
  emails?: Array<{ email?: string; principal?: boolean }>
  telefonos?: Array<{ telefono_norm?: string; telefono_raw?: string; principal?: boolean }>
  imagen?: string | {
    url?: string
    media?: {
      data?: {
        attributes?: {
          url?: string
        }
      }
    }
  }
  tags?: Array<{ name?: string }>
  trayectorias?: Array<{
    cargo?: string
    is_current?: boolean
    colegio?: {
      colegio_nombre?: string
      dependencia?: string
      zona?: string
      telefonos?: Array<{ telefono_norm?: string; telefono_raw?: string; numero?: string }>
      emails?: Array<{ email?: string }>
      website?: string
      comuna?: {
        comuna_nombre?: string
        region_nombre?: string
        zona?: string
      }
      cartera_asignaciones?: Array<{
        is_current?: boolean
        rol?: string
        estado?: string
        prioridad?: 'alta' | 'media' | 'baja'
        ejecutivo?: {
          nombre_completo?: string
        }
      }>
    }
  }>
}

/**
 * GET /api/crm/contacts
 * Obtiene el listado de contactos (personas) desde Strapi con búsqueda y filtros
 * 
 * Query params:
 * - page: Número de página (default: 1)
 * - pageSize: Tamaño de página (default: 50)
 * - search: Búsqueda por nombre_completo, email o rut
 * - origin: Filtro por origen (mineduc, csv, manual, crm, web, otro)
 * - confidence: Filtro por nivel_confianza (baja, media, alta)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') || '1'
    const pageSize = searchParams.get('pageSize') || '50'
    const search = searchParams.get('search') || ''
    const origin = searchParams.get('origin') || ''
    const confidence = searchParams.get('confidence') || ''

    // Construir parámetros de query
    const params = new URLSearchParams({
      'pagination[page]': page,
      'pagination[pageSize]': pageSize,
      'sort[0]': 'updatedAt:desc',
    })

    // Populate para relaciones (Strapi v4 syntax)
    params.append('populate[emails]', 'true')
    params.append('populate[telefonos]', 'true')
    params.append('populate[imagen]', 'true') // Para campos Media, solo usar 'true'
    params.append('populate[tags]', 'true')
    params.append('populate[trayectorias][populate][colegio][populate][comuna]', 'true')
    params.append('populate[trayectorias][populate][colegio][populate][telefonos]', 'true')
    params.append('populate[trayectorias][populate][colegio][populate][emails]', 'true')
    params.append('populate[trayectorias][populate][colegio][populate][cartera_asignaciones][populate][ejecutivo]', 'true')

    // Filtros
    params.append('filters[activo][$eq]', 'true')

    // Búsqueda
    if (search) {
      // Intentar primero como RUT (formato exacto)
      if (search.match(/^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/)) {
        params.append('filters[rut][$eq]', search)
      } else {
        // Si no es RUT, buscar por nombre completo o email
        params.append('filters[$or][0][nombre_completo][$containsi]', search)
        params.append('filters[$or][1][emails][email][$containsi]', search)
        params.append('filters[$or][2][rut][$containsi]', search)
      }
    }

    // Filtro por origen
    if (origin) {
      params.append('filters[origen][$eq]', origin)
    }

    // Filtro por nivel de confianza
    if (confidence) {
      params.append('filters[nivel_confianza][$eq]', confidence)
    }

    const url = `/api/personas?${params.toString()}`
    const response = await strapiClient.get<StrapiResponse<StrapiEntity<PersonaAttributes>>>(url)

    return NextResponse.json({
      success: true,
      data: response.data,
      meta: response.meta,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/contacts] Error al obtener contactos:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener contactos',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * POST /api/crm/contacts
 * Crea un nuevo contacto (persona)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validaciones básicas
    if (!body.nombres || !body.nombres.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'El nombre es obligatorio',
        },
        { status: 400 }
      )
    }

    // Preparar datos para Strapi
    const personaData: any = {
      data: {
        nombres: body.nombres.trim(),
        ...(body.primer_apellido && { primer_apellido: body.primer_apellido.trim() }),
        ...(body.segundo_apellido && { segundo_apellido: body.segundo_apellido.trim() }),
        ...(body.rut && { rut: body.rut.trim() }),
        ...(body.genero && { genero: body.genero }),
        ...(body.cumpleagno && { cumpleagno: body.cumpleagno }),
        activo: body.activo !== undefined ? body.activo : true,
        nivel_confianza: body.nivel_confianza || 'media',
        origen: body.origen || 'manual',
      },
    }

    // Agregar emails si existen
    if (body.emails && Array.isArray(body.emails) && body.emails.length > 0) {
      personaData.data.emails = body.emails.map((email: string, index: number) => ({
        email: email.trim(),
        principal: index === 0, // El primero es principal
      }))
    }

    // Agregar telefonos si existen
    if (body.telefonos && Array.isArray(body.telefonos) && body.telefonos.length > 0) {
      personaData.data.telefonos = body.telefonos.map((telefono: string, index: number) => ({
        telefono_raw: telefono.trim(),
        principal: index === 0, // El primero es principal
      }))
    }

    const response = await strapiClient.post<StrapiResponse<StrapiEntity<PersonaAttributes>>>(
      '/api/personas',
      personaData
    )

    // Revalidar para sincronización bidireccional
    revalidatePath('/crm/personas')
    revalidatePath('/crm/personas/[id]', 'page')
    revalidatePath('/crm/contacts')
    revalidateTag('personas')
    revalidateTag('contacts')

    return NextResponse.json({
      success: true,
      data: response.data,
      message: 'Contacto creado exitosamente',
    }, { status: 201 })
  } catch (error: any) {
    console.error('[API /crm/contacts POST] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al crear contacto',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

