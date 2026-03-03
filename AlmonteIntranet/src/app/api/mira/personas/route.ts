import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/mira/personas
 * Lista personas de tipo Profesor para usarlas en selects de MIRA.
 * Soporta parámetros opcionales:
 * - page, pageSize
 * - search (nombre, RUT)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') || '1'
    const pageSize = searchParams.get('pageSize') || '100'
    const search = searchParams.get('search') || ''

    const params = new URLSearchParams({
      'pagination[page]': page,
      'pagination[pageSize]': pageSize,
      'sort[0]': 'nombre_completo:asc',
      'filters[tipo_entidad][$eq]': 'Profesor',
    })

    if (search) {
      params.set('filters[$or][0][nombre_completo][$containsi]', search)
      params.set('filters[$or][1][rut][$containsi]', search)
      params.set('filters[$or][2][nombres][$containsi]', search)
      params.set('filters[$or][3][primer_apellido][$containsi]', search)
    }

    const response = await strapiClient.get<any>(`/api/personas?${params.toString()}`)

    const personas = Array.isArray(response.data) ? response.data : response.data ? [response.data] : []
    const meta = response.meta || {
      pagination: { page: Number(page), pageSize: Number(pageSize), pageCount: 1, total: personas.length },
    }

    const profesores = personas.map((p: any) => {
      const attrs = p.attributes || p
      const nombreCompleto =
        attrs.nombre_completo ||
        `${attrs.nombres || ''} ${attrs.primer_apellido || ''} ${attrs.segundo_apellido || ''}`.trim()

      return {
        id: p.id,
        documentId: p.documentId,
        nombre_completo: nombreCompleto,
        rut: attrs.rut || '',
        tipo_entidad: attrs.tipo_entidad || null,
        status_nombres: attrs.status_nombres ?? null,
      }
    })

    return NextResponse.json({
      success: true,
      data: profesores,
      meta,
    })
  } catch (error: any) {
    console.error('[API /mira/personas GET] Error:', error.message)
    return NextResponse.json(
      { success: false, error: error.message || 'Error al obtener personas' },
      { status: error.status || 500 }
    )
  }
}

