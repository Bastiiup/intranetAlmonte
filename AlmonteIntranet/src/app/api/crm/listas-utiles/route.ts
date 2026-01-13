import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

const DEBUG = process.env.NODE_ENV === 'development' || process.env.DEBUG_CRM === 'true'
const debugLog = (...args: any[]) => {
  if (DEBUG) {
    console.log(...args)
  }
}

interface ListaUtilesAttributes {
  nombre: string
  nivel: 'Basica' | 'Media'
  grado: number
  año?: number // Año de la lista de útiles
  descripcion?: string
  activo?: boolean
  materiales?: any[]
}

/**
 * GET /api/crm/listas-utiles
 * Lista todas las listas de útiles con sus materiales
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const nivel = searchParams.get('nivel')
    const grado = searchParams.get('grado')
    const año = searchParams.get('año') || searchParams.get('ano')
    const activo = searchParams.get('activo')

    // Construir query
    const filters: string[] = []
    if (nivel) {
      filters.push(`filters[nivel][$eq]=${encodeURIComponent(nivel)}`)
    }
    if (grado) {
      filters.push(`filters[grado][$eq]=${grado}`)
    }
    if (año) {
      filters.push(`filters[año][$eq]=${año}`)
    }
    if (activo !== null) {
      filters.push(`filters[activo][$eq]=${activo === 'true'}`)
    }

    // Populate materiales, PDF, colegio y curso
    filters.push('populate[materiales]=true')
    filters.push('populate[pdf]=true')
    filters.push('populate[colegio]=true')
    filters.push('populate[curso]=true')

    const queryString = filters.length > 0 ? `?${filters.join('&')}` : '?populate[materiales]=true&populate[pdf]=true&populate[colegio]=true&populate[curso]=true'

    debugLog('[API /crm/listas-utiles GET] Query:', queryString)

    const response = await strapiClient.get<StrapiResponse<StrapiEntity<ListaUtilesAttributes>[]>>(
      `/api/listas-utiles${queryString}`
    )

    const data = Array.isArray(response.data) ? response.data : [response.data]

    debugLog('[API /crm/listas-utiles GET] ✅ Exitoso, cantidad:', data.length)

    return NextResponse.json({
      success: true,
      data,
      count: data.length,
    }, { status: 200 })
  } catch (error: any) {
    debugLog('[API /crm/listas-utiles GET] ❌ Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener listas de útiles',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/crm/listas-utiles
 * Crea una nueva lista de útiles
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    debugLog('[API /crm/listas-utiles POST] Request recibido:', body)

    // Validaciones
    if (!body.nombre || !body.nivel || body.grado === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Los campos nombre, nivel y grado son obligatorios',
        },
        { status: 400 }
      )
    }

    // Validar nivel
    if (body.nivel !== 'Basica' && body.nivel !== 'Media') {
      return NextResponse.json(
        {
          success: false,
          error: 'El nivel debe ser "Basica" o "Media"',
        },
        { status: 400 }
      )
    }

    // Validar grado
    const gradoNum = parseInt(body.grado)
    if (isNaN(gradoNum) || gradoNum < 1 || gradoNum > 8) {
      return NextResponse.json(
        {
          success: false,
          error: 'El grado debe ser un número entre 1 y 8',
        },
        { status: 400 }
      )
    }

    // Construir payload para Strapi
    const payload: any = {
      data: {
        nombre: body.nombre.trim(),
        nivel: body.nivel,
        grado: gradoNum,
        año: body.año || body.ano || new Date().getFullYear(), // Año de la lista
        descripcion: body.descripcion || null,
        activo: body.activo !== false,
      },
    }

    // Agregar PDF si existe
    if (body.pdf) {
      payload.data.pdf = body.pdf
    }

    // Agregar relación con colegio si existe
    if (body.colegio) {
      payload.data.colegio = body.colegio
    }

    // Agregar relación con curso si existe
    if (body.curso) {
      payload.data.curso = body.curso
    }

    // Agregar materiales si existen
    if (Array.isArray(body.materiales) && body.materiales.length > 0) {
      payload.data.materiales = body.materiales.map((m: any) => ({
        material_nombre: m.material_nombre?.trim() || '',
        tipo: m.tipo || 'util',
        cantidad: parseInt(m.cantidad) || 1,
        obligatorio: m.obligatorio !== false,
        descripcion: m.descripcion || null,
      }))
    }

    debugLog('[API /crm/listas-utiles POST] Payload para Strapi:', JSON.stringify(payload, null, 2))

    const response = await strapiClient.post<StrapiResponse<StrapiEntity<ListaUtilesAttributes>>>(
      '/api/listas-utiles',
      payload
    )

    debugLog('[API /crm/listas-utiles POST] ✅ Lista creada exitosamente')

    return NextResponse.json({
      success: true,
      data: response.data,
    }, { status: 200 })
  } catch (error: any) {
    debugLog('[API /crm/listas-utiles POST] ❌ Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al crear lista de útiles',
      },
      { status: 500 }
    )
  }
}
