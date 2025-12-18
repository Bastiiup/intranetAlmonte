import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const response = await strapiClient.get<any>('/api/etiquetas?populate=*&pagination[pageSize]=1000')
    
    let items: any[] = []
    if (Array.isArray(response)) {
      items = response
    } else if (response.data && Array.isArray(response.data)) {
      items = response.data
    } else if (response.data) {
      items = [response.data]
    } else {
      items = [response]
    }
    
    console.log('[API GET etiquetas] ✅ Items obtenidos:', items.length)
    
    return NextResponse.json({
      success: true,
      data: items
    })
  } catch (error: any) {
    console.error('[API GET etiquetas] ❌ Error:', error.message)
    
    // En lugar de devolver error 500, devolver array vacío
    return NextResponse.json({
      success: true,
      data: [],
      warning: `No se pudieron cargar las etiquetas: ${error.message}`
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[API Etiquetas POST] 📝 Creando etiqueta:', body)

    // Validar nombre obligatorio (el schema usa 'name')
    if (!body.data?.name && !body.data?.nombre) {
      return NextResponse.json({
        success: false,
        error: 'El nombre de la etiqueta es obligatorio'
      }, { status: 400 })
    }

    const etiquetaEndpoint = '/api/etiquetas'
    console.log('[API Etiquetas POST] Usando endpoint:', etiquetaEndpoint)

    // Preparar datos para Strapi (usar nombres del schema real: name, descripcion)
    const etiquetaData: any = {
      data: {
        name: body.data.name || body.data.nombre, // El schema usa 'name'
        descripcion: body.data.descripcion || body.data.description || null,
      }
    }

    // Crear en Strapi
    const response = await strapiClient.post<any>(etiquetaEndpoint, etiquetaData)

    console.log('[API Etiquetas POST] ✅ Etiqueta creada exitosamente:', {
      id: response.data?.id || response.id,
      nombre: response.data?.name || response.data?.nombre
    })

    return NextResponse.json({
      success: true,
      data: response.data || response,
      message: 'Etiqueta creada exitosamente'
    })

  } catch (error: any) {
    console.error('[API Etiquetas POST] ❌ ERROR al crear etiqueta:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al crear la etiqueta',
      details: error.details
    }, { status: error.status || 500 })
  }
}

