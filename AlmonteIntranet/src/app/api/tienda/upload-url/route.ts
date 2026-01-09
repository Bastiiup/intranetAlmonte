/**
 * API Route para subir imágenes desde URL a Strapi
 */

import { NextRequest, NextResponse } from 'next/server'
import { STRAPI_API_URL, STRAPI_API_TOKEN } from '@/lib/strapi/config'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const imageUrl = body.url
    
    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json(
        { success: false, error: 'No se proporcionó una URL válida' },
        { status: 400 }
      )
    }

    // Validar que sea una URL válida
    try {
      new URL(imageUrl.trim())
    } catch {
      return NextResponse.json(
        { success: false, error: 'URL inválida' },
        { status: 400 }
      )
    }

    // Descargar la imagen desde la URL (desde el servidor para evitar CORS)
    console.log('[API /tienda/upload-url] Descargando imagen desde URL:', imageUrl)
    const imageResponse = await fetch(imageUrl.trim(), {
      headers: {
        'Accept': 'image/*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!imageResponse.ok) {
      throw new Error(`Error al descargar la imagen: ${imageResponse.status} ${imageResponse.statusText}`)
    }

    // Obtener el tipo de contenido
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'
    if (!contentType.startsWith('image/')) {
      throw new Error('La URL no apunta a una imagen válida')
    }

    // Convertir la respuesta a blob
    const blob = await imageResponse.blob()
    const fileName = imageUrl.split('/').pop()?.split('?')[0] || 'image.jpg'
    
    // Crear FormData para Strapi
    const strapiFormData = new FormData()
    const file = new File([blob], fileName, { type: contentType })
    strapiFormData.append('files', file)
    
    // Subir a Strapi
    const uploadResponse = await fetch(`${STRAPI_API_URL}/api/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
      },
      body: strapiFormData,
    })
    
    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `Error al subir: ${uploadResponse.status}`)
    }
    
    const data = await uploadResponse.json()
    
    // Strapi devuelve un array de archivos subidos
    const uploadedFile = Array.isArray(data) ? data[0] : data
    
    return NextResponse.json({
      success: true,
      data: uploadedFile,
      id: uploadedFile.id,
      url: uploadedFile.url ? `${STRAPI_API_URL}${uploadedFile.url}` : null,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /tienda/upload-url] Error al subir imagen desde URL:', {
      message: error.message,
      stack: error.stack,
    })
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Error al subir imagen desde URL',
      },
      { status: 500 }
    )
  }
}

