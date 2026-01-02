import { NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

interface ColegioAttributes {
  colegio_nombre?: string
  rbd?: number
}

/**
 * GET /api/crm/colegios/list
 * Obtiene una lista simple de colegios para selectores
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''

    // Construir parámetros de query
    const params = new URLSearchParams({
      'pagination[page]': '1',
      'pagination[pageSize]': '100', // Límite razonable para selector
      'sort[0]': 'colegio_nombre:asc',
    })

    // Búsqueda por nombre si existe
    if (search) {
      params.append('filters[colegio_nombre][$containsi]', search)
    }

    const url = `/api/colegios?${params.toString()}`
    const response = await strapiClient.get<StrapiResponse<StrapiEntity<ColegioAttributes>>>(url)

    // Transformar a formato simple para selector
    const data = Array.isArray(response.data) ? response.data : [response.data]
    const colegios = data.map((colegio: any) => {
      const attrs = colegio.attributes || colegio
      const id = colegio.documentId || colegio.id
      return {
        id: typeof id === 'number' ? id : parseInt(id) || 0,
        documentId: colegio.documentId || String(colegio.id || ''),
        nombre: attrs.colegio_nombre || 'Sin nombre',
        rbd: attrs.rbd || null,
      }
    })

    return NextResponse.json({
      success: true,
      data: colegios,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/colegios/list GET] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener lista de colegios',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

