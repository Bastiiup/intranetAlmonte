import { NextRequest, NextResponse } from 'next/server'
import { getStrapiUrl, STRAPI_API_TOKEN } from '@/lib/strapi/config'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID de licencia es requerido' },
        { status: 400 }
      )
    }

    // Validar y preparar datos para actualizar
    const updateData: any = {}

    if (typeof body.activa === 'boolean') {
      updateData.activa = body.activa
    }

    if (body.fecha_vencimiento !== undefined) {
      updateData.fecha_vencimiento = body.fecha_vencimiento || null
    }

    if (body.numeral !== undefined) {
      updateData.numeral = body.numeral !== null ? parseInt(String(body.numeral), 10) : null
    }

    console.log(`[API /api/mira/licencias/${id}] Actualizando licencia con datos:`, updateData)

    const url = `${getStrapiUrl(`/api/licencias-estudiantes/${id}`)}`

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (STRAPI_API_TOKEN) {
      headers['Authorization'] = `Bearer ${STRAPI_API_TOKEN}`
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ data: updateData }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[API /api/mira/licencias/${id}] Error en respuesta:`, errorText)
      throw new Error(`Error ${response.status}: ${errorText}`)
    }

    const result = await response.json()

    console.log(`[API /api/mira/licencias/${id}] Licencia actualizada exitosamente`)

    return NextResponse.json({
      success: true,
      data: result.data,
    })
  } catch (error: any) {
    console.error(`[API /api/mira/licencias/${params.id}] Error:`, error)
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al actualizar licencia',
      },
      { status: 500 }
    )
  }
}
