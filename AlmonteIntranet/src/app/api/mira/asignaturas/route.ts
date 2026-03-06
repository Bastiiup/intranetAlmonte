import { NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/mira/asignaturas
 * Lista asignaturas desde Strapi para selectores (nombre, id).
 */
export async function GET() {
  try {
    const params = new URLSearchParams({
      'pagination[pageSize]': '500',
      'sort[0]': 'nombre:asc',
      'fields[0]': 'id',
      'fields[1]': 'nombre',
      'publicationState': 'live',
    })
    const response = await strapiClient.get<any>(`/api/asignaturas?${params.toString()}`)
    const raw = Array.isArray(response.data) ? response.data : response.data ? [response.data] : []
    const data = raw.map((a: any) => ({
      id: a.id,
      documentId: a.documentId ?? String(a.id),
      nombre: a.attributes?.nombre ?? a.nombre ?? 'Sin nombre',
    }))
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('[API /mira/asignaturas GET] Error:', error?.message)
    return NextResponse.json(
      { success: false, error: error?.message || 'Error al obtener asignaturas' },
      { status: error?.status || 500 }
    )
  }
}
