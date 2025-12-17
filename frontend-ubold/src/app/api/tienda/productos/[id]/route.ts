/**
 * API Route para obtener un producto específico desde Strapi por ID
 */

import { NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const endpointUsed = `/api/libros/${id}`
    
    // Obtener producto con populate para traer todas las relaciones
    const response = await strapiClient.get<any>(
      `${endpointUsed}?populate=*`
    )
    
    console.log('[API /tienda/productos/[id]] Producto obtenido:', {
      id,
      endpoint: endpointUsed,
      hasData: !!response.data,
    })
    
    return NextResponse.json({
      success: true,
      data: response.data || null,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /tienda/productos/[id]] Error al obtener producto:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Error al obtener producto',
        data: null,
      },
      { status: error.status || 500 }
    )
  }
}

