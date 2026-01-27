/**
 * API Route para subir archivos a Strapi Media Library
 * POST /api/upload
 */

import { NextRequest, NextResponse } from 'next/server'
import { getStrapiUrl, STRAPI_API_TOKEN } from '@/lib/strapi/config'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/upload
 * Sube uno o más archivos a Strapi Media Library
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No se proporcionaron archivos' },
        { status: 400 }
      )
    }

    // Crear FormData para Strapi
    const strapiFormData = new FormData()
    files.forEach((file) => {
      strapiFormData.append('files', file)
    })

    // Subir a Strapi
    const strapiUrl = getStrapiUrl('/api/upload')
    const response = await fetch(strapiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRAPI_API_TOKEN || ''}`,
      },
      body: strapiFormData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('[API /upload POST] Error al subir archivos:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      })
      return NextResponse.json(
        { error: 'Error al subir archivos a Strapi', details: errorData },
        { status: response.status }
      )
    }

    const result = await response.json()

    // 🔍 LOG CRÍTICO: Verificar respuesta de Strapi
    console.log('[API /upload POST] 📥 Respuesta de Strapi:', {
      esArray: Array.isArray(result),
      cantidad: Array.isArray(result) ? result.length : 1,
      primerArchivo: Array.isArray(result) ? {
        id: result[0]?.id,
        url: result[0]?.url,
        name: result[0]?.name,
        mime: result[0]?.mime,
        tieneId: !!result[0]?.id,
        tieneUrl: !!result[0]?.url,
      } : {
        id: result?.id,
        url: result?.url,
        name: result?.name,
        mime: result?.mime,
        tieneId: !!result?.id,
        tieneUrl: !!result?.url,
      },
      resultadoCompleto: JSON.stringify(result, null, 2),
    })

    // Strapi devuelve un array de archivos subidos
    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    console.error('[API /upload POST] Error:', error)
    return NextResponse.json(
      { error: 'Error al subir archivos', message: error.message },
      { status: 500 }
    )
  }
}
