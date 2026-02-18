import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

/**
 * PUT /api/mira/profesores/[id]/aprobar
 * Actualiza la persona indicada poniendo status_nombres = 'Aprobado'.
 * [id] puede ser documentId (string) o id numérico.
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    if (!id?.trim()) {
      return NextResponse.json(
        { success: false, error: 'ID de persona requerido' },
        { status: 400 }
      )
    }

    const isNumeric = /^\d+$/.test(id.trim())
    const path = isNumeric
      ? `/api/personas/${id}`
      : `/api/personas/${encodeURIComponent(id)}`

    const response = await strapiClient.put<any>(path, {
      data: {
        status_nombres: 'Aprobado',
      },
    })

    const data = response?.data ?? response
    const attrs = data?.attributes ?? data

    return NextResponse.json({
      success: true,
      data: {
        id: data?.id ?? id,
        documentId: data?.documentId ?? (isNumeric ? undefined : id),
        status_nombres: attrs?.status_nombres ?? 'Aprobado',
      },
    })
  } catch (error: any) {
    console.error('[API /mira/profesores/[id]/aprobar] Error:', error?.message)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Error al aprobar la cuenta del profesor',
      },
      { status: error?.status || 500 }
    )
  }
}
