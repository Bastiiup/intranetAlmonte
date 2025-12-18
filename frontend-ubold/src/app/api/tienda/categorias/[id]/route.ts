import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

// Función helper para encontrar el endpoint correcto
async function findCategoriaEndpoint(): Promise<string> {
  const endpoints = ['/api/categorias-producto', '/api/categoria-productos', '/api/categorias']
  
  for (const endpoint of endpoints) {
    try {
      await strapiClient.get<any>(`${endpoint}?pagination[pageSize]=1`)
      return endpoint
    } catch {
      continue
    }
  }
  
  // Si ninguno funciona, usar el primero por defecto
  return endpoints[0]
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    console.log('[API Categorias DELETE] 🗑️ Eliminando categoría:', id)

    // Encontrar el endpoint correcto
    const categoriaEndpoint = await findCategoriaEndpoint()
    const endpoint = `${categoriaEndpoint}/${id}`
    
    console.log('[API Categorias DELETE] Usando endpoint:', endpoint)

    // Eliminar en Strapi
    const response = await strapiClient.delete<any>(endpoint)

    console.log('[API Categorias DELETE] ✅ Categoría eliminada exitosamente')

    return NextResponse.json({
      success: true,
      message: 'Categoría eliminada exitosamente',
      data: response
    })

  } catch (error: any) {
    console.error('[API Categorias DELETE] ❌ ERROR al eliminar categoría:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al eliminar la categoría',
      details: error.details
    }, { status: error.status || 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    console.log('[API Categorias PUT] ✏️ Actualizando categoría:', id, body)

    // Encontrar el endpoint correcto
    const categoriaEndpoint = await findCategoriaEndpoint()
    const endpoint = `${categoriaEndpoint}/${id}`
    
    console.log('[API Categorias PUT] Usando endpoint:', endpoint)

    // Preparar datos para Strapi
    const categoriaData: any = {
      data: {}
    }

    if (body.data.nombre) categoriaData.data.nombre = body.data.nombre
    if (body.data.name) categoriaData.data.nombre = body.data.name
    if (body.data.slug) categoriaData.data.slug = body.data.slug
    if (body.data.descripcion !== undefined) categoriaData.data.descripcion = body.data.descripcion
    if (body.data.description !== undefined) categoriaData.data.descripcion = body.data.description
    if (body.data.activo !== undefined) categoriaData.data.activo = body.data.activo
    if (body.data.isActive !== undefined) categoriaData.data.activo = body.data.isActive
    if (body.data.imagen) categoriaData.data.imagen = body.data.imagen

    // Actualizar en Strapi
    const response = await strapiClient.put<any>(endpoint, categoriaData)

    console.log('[API Categorias PUT] ✅ Categoría actualizada exitosamente')

    return NextResponse.json({
      success: true,
      data: response.data || response,
      message: 'Categoría actualizada exitosamente'
    })

  } catch (error: any) {
    console.error('[API Categorias PUT] ❌ ERROR al actualizar categoría:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al actualizar la categoría',
      details: error.details
    }, { status: error.status || 500 })
  }
}

