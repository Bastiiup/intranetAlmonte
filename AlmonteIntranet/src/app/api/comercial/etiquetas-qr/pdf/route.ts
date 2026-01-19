/**
 * API Route para servir PDFs de etiquetas QR desde Strapi con autenticación
 * GET /api/comercial/etiquetas-qr/pdf
 * 
 * Query params:
 * - url: URL del PDF en Strapi (requerido)
 */

import { NextRequest, NextResponse } from 'next/server'
import { STRAPI_API_URL, STRAPI_API_TOKEN } from '@/lib/strapi/config'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/comercial/etiquetas-qr/pdf
 * Obtiene un PDF desde Strapi y lo sirve con headers apropiados para iframe
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pdfUrl = searchParams.get('url')

    if (!pdfUrl) {
      return NextResponse.json(
        { error: 'URL del PDF es requerida' },
        { status: 400 }
      )
    }

    // Construir URL completa si es relativa
    let fileUrl = pdfUrl
    if (!pdfUrl.startsWith('http://') && !pdfUrl.startsWith('https://')) {
      const baseUrl = STRAPI_API_URL.replace(/\/$/, '')
      const cleanUrl = pdfUrl.startsWith('/') ? pdfUrl : `/${pdfUrl}`
      fileUrl = `${baseUrl}${cleanUrl}`
    }

    console.log('[API /comercial/etiquetas-qr/pdf] 📄 Obteniendo PDF:', fileUrl)

    // Obtener el archivo PDF desde Strapi con autenticación
    const pdfResponse = await fetch(fileUrl, {
      headers: {
        'Authorization': `Bearer ${STRAPI_API_TOKEN || ''}`,
      },
    })

    if (!pdfResponse.ok) {
      console.error('[API /comercial/etiquetas-qr/pdf] ❌ Error al obtener PDF:', {
        status: pdfResponse.status,
        statusText: pdfResponse.statusText,
        fileUrl,
      })
      return NextResponse.json(
        { error: 'No se pudo obtener el PDF', status: pdfResponse.status },
        { status: pdfResponse.status }
      )
    }

    // Obtener el contenido del PDF
    const pdfBuffer = await pdfResponse.arrayBuffer()

    // Extraer nombre del archivo de la URL
    const urlParts = fileUrl.split('/')
    const fileName = urlParts[urlParts.length - 1] || 'etiqueta-qr.pdf'

    // Retornar el PDF con headers apropiados para iframe
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'X-Frame-Options': 'SAMEORIGIN',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error: any) {
    console.error('[API /comercial/etiquetas-qr/pdf] ❌ Error:', error)
    return NextResponse.json(
      { error: 'Error al obtener el PDF', message: error.message },
      { status: 500 }
    )
  }
}
