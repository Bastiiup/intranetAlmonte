import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const response = await strapiClient.get<any>('/api/autores?populate=*&pagination[pageSize]=1000')
    
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
    
    console.log('[API GET autores] ✅ Items obtenidos:', items.length)
    
    return NextResponse.json({
      success: true,
      data: items
    })
  } catch (error: any) {
    console.error('[API GET autores] ❌ Error:', error.message)
    
    // En lugar de devolver error 500, devolver array vacío
    return NextResponse.json({
      success: true,
      data: [],
      warning: `No se pudieron cargar los autores: ${error.message}`
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[API Autores POST] 📝 Creando autor:', body)

    // Validar nombre completo obligatorio
    if (!body.data?.nombre_completo_autor) {
      return NextResponse.json({
        success: false,
        error: 'El nombre completo del autor es obligatorio'
      }, { status: 400 })
    }

    // Crear en Strapi
    console.log('[API Autores POST] 📚 Creando autor en Strapi...')
    
    const autorData: any = {
      data: {
        nombre_completo_autor: body.data.nombre_completo_autor.trim(),
        nombres: body.data.nombres || null,
        primer_apellido: body.data.primer_apellido || null,
        segundo_apellido: body.data.segundo_apellido || null,
        tipo_autor: body.data.tipo_autor || 'Persona',
        website: body.data.website || null,
        pais: body.data.pais || null,
      },
    }

    // Agregar foto si existe
    if (body.data.foto) {
      autorData.data.foto = body.data.foto
    }

    const response = await strapiClient.post('/api/autores', autorData)
    
    console.log('[API Autores POST] ✅ Autor creado en Strapi:', response.id || response.documentId)
    
    return NextResponse.json({
      success: true,
      data: response
    })
  } catch (error: any) {
    console.error('[API Autores POST] ❌ Error:', error.message)
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al crear el autor'
    }, { status: 500 })
  }
}
