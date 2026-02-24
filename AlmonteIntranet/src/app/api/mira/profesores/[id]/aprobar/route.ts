import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

/**
 * PUT /api/mira/profesores/[id]/aprobar
 * Llama al endpoint custom de Strapi que aprueba la persona y envía correo de bienvenida.
 * [id] puede ser documentId (string) o id numérico de la Persona.
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

    const path = `/api/registro-profesor/aprobar/${encodeURIComponent(id.trim())}`

    const response = await strapiClient.post<any>(path, undefined)

    const data = response?.data ?? response
    const attrs = data?.attributes ?? data

    return NextResponse.json({
      success: true,
      data: {
        id: data?.id ?? id,
        documentId: data?.documentId ?? (typeof id === 'string' && !/^\d+$/.test(id) ? id : undefined),
        status_nombres: attrs?.status_nombres ?? 'Aprobado',
      },
      message: (response as any)?.message ?? 'Profesor aprobado y correo de bienvenida enviado.',
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
