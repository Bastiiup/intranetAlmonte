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
      'pagination[pageSize]': search ? '100' : '500', // Más resultados si no hay búsqueda
      'sort[0]': 'colegio_nombre:asc',
    })

    // Búsqueda por nombre si existe
    if (search && search.trim()) {
      params.append('filters[colegio_nombre][$containsi]', search.trim())
    }

    const url = `/api/colegios?${params.toString()}`
    const response = await strapiClient.get<StrapiResponse<StrapiEntity<ColegioAttributes>>>(url)

    // Transformar a formato simple para selector
    const data = Array.isArray(response.data) ? response.data : [response.data]
    const colegios = data
      .map((colegio: any) => {
        const attrs = colegio.attributes || colegio
        // ⚠️ IMPORTANTE: Priorizar id numérico sobre documentId para connect en Strapi
        const idNum = colegio.id && typeof colegio.id === 'number' ? colegio.id : null
        const documentId = colegio.documentId || String(colegio.id || '')
        
        // Si no tenemos id numérico, intentar obtenerlo
        let idFinal: number | null = idNum
        if (!idFinal && documentId) {
          // Intentar parsear documentId si es numérico
          const parsed = parseInt(documentId)
          if (!isNaN(parsed) && parsed > 0) {
            idFinal = parsed
          }
        }
        
        return {
          id: idFinal || 0, // ⚠️ Si es 0, será filtrado después
          documentId: documentId,
          nombre: attrs.colegio_nombre || 'Sin nombre',
          rbd: attrs.rbd || null,
        }
      })
      .filter((c: any) => c.id > 0) // ⚠️ Filtrar colegios sin ID numérico válido

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

