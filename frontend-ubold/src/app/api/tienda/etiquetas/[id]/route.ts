import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('[API Etiquetas DELETE] 🗑️ Eliminando etiqueta:', id)

    const etiquetaEndpoint = '/api/etiquetas'
    const endpoint = `${etiquetaEndpoint}/${id}`
    
    console.log('[API Etiquetas DELETE] Usando endpoint:', endpoint)

    // Eliminar en Strapi
    const response = await strapiClient.delete<any>(endpoint)

    console.log('[API Etiquetas DELETE] ✅ Etiqueta eliminada exitosamente')

    return NextResponse.json({
      success: true,
      message: 'Etiqueta eliminada exitosamente',
      data: response
    })

  } catch (error: any) {
    console.error('[API Etiquetas DELETE] ❌ ERROR al eliminar etiqueta:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al eliminar la etiqueta',
      details: error.details
    }, { status: error.status || 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    console.log('[API Etiquetas PUT] ✏️ Actualizando etiqueta:', id, body)

    const etiquetaEndpoint = '/api/etiquetas'
    const endpoint = `${etiquetaEndpoint}/${id}`
    
    console.log('[API Etiquetas PUT] Usando endpoint:', endpoint)

    // Preparar datos para Strapi
    const etiquetaData: any = {
      data: {}
    }

    if (body.data.name) etiquetaData.data.name = body.data.name
    if (body.data.nombre) etiquetaData.data.name = body.data.nombre
    if (body.data.descripcion !== undefined) etiquetaData.data.descripcion = body.data.descripcion
    if (body.data.description !== undefined) etiquetaData.data.descripcion = body.data.description

    // Actualizar en Strapi
    const response = await strapiClient.put<any>(endpoint, etiquetaData)

    console.log('[API Etiquetas PUT] ✅ Etiqueta actualizada exitosamente')

    return NextResponse.json({
      success: true,
      data: response.data || response,
      message: 'Etiqueta actualizada exitosamente'
    })

  } catch (error: any) {
    console.error('[API Etiquetas PUT] ❌ ERROR al actualizar etiqueta:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al actualizar la etiqueta',
      details: error.details
    }, { status: error.status || 500 })
  }
}

