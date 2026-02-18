import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/mira/profesores
 * Lista personas que tienen un usuario_login asociado (profesores).
 * Strapi v5 no permite field-level selection en populate de users-permissions,
 * por eso usamos populate[usuario_login]=* sin campos específicos.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') || '1'
    const pageSize = searchParams.get('pageSize') || '25'
    const search = searchParams.get('search') || ''

    const params = new URLSearchParams({
      'populate[usuario_login]': '*',
      'filters[usuario_login][id][$notNull]': 'true',
      'pagination[page]': page,
      'pagination[pageSize]': pageSize,
      'sort[0]': 'nombre_completo:asc',
    })

    if (search) {
      params.set('filters[$or][0][nombre_completo][$containsi]', search)
      params.set('filters[$or][1][rut][$containsi]', search)
      params.set('filters[$or][2][nombres][$containsi]', search)
      params.set('filters[$or][3][primer_apellido][$containsi]', search)
    }

    const response = await strapiClient.get<any>(`/api/personas?${params.toString()}`)

    const personas = Array.isArray(response.data) ? response.data : response.data ? [response.data] : []
    const meta = response.meta || { pagination: { page: 1, pageSize: 25, pageCount: 1, total: personas.length } }

    const profesores = personas.map((p: any) => {
      const attrs = p.attributes || p
      const usuario = attrs.usuario_login?.data?.attributes || attrs.usuario_login?.data || attrs.usuario_login || null
      return {
        id: p.id,
        documentId: p.documentId,
        nombres: attrs.nombres || '',
        primer_apellido: attrs.primer_apellido || '',
        segundo_apellido: attrs.segundo_apellido || '',
        nombre_completo: attrs.nombre_completo || `${attrs.nombres || ''} ${attrs.primer_apellido || ''}`.trim(),
        rut: attrs.rut || '',
        activo: attrs.activo !== false,
        email: usuario?.email || '',
        username: usuario?.username || '',
        confirmed: usuario?.confirmed ?? false,
        blocked: usuario?.blocked ?? false,
        usuarioId: usuario?.id || attrs.usuario_login?.id || null,
      }
    })

    return NextResponse.json({
      success: true,
      data: profesores,
      meta,
    })
  } catch (error: any) {
    console.error('[API /mira/profesores GET] Error:', error.message)
    return NextResponse.json(
      { success: false, error: error.message || 'Error al obtener profesores' },
      { status: error.status || 500 }
    )
  }
}
