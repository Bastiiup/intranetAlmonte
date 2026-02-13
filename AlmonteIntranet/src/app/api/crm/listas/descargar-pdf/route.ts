import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/crm/listas/descargar-pdf
 * Descarga un PDF desde una URL externa y lo retorna como blob
 * Esto evita problemas de CORS al descargar desde el cliente
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url } = body

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL es requerida' },
        { status: 400 }
      )
    }

    // Validar que sea una URL válida
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return NextResponse.json(
        { error: 'URL debe comenzar con http:// o https://' },
        { status: 400 }
      )
    }

    console.log(`[API /crm/listas/descargar-pdf] Descargando PDF desde: ${url}`)

    // Descargar el PDF desde la URL (desde el servidor para evitar CORS)
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/pdf,*/*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!response.ok) {
      console.error(`[API /crm/listas/descargar-pdf] Error al descargar PDF: ${response.status} ${response.statusText}`)
      return NextResponse.json(
        { 
          error: 'Error al descargar PDF',
          status: response.status,
          statusText: response.statusText,
        },
        { status: response.status }
      )
    }

    // Obtener el contenido como ArrayBuffer
    const arrayBuffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'application/pdf'

    // Validar que sea un PDF
    const esPDF = contentType.includes('pdf') || url.toLowerCase().endsWith('.pdf')

    if (!esPDF) {
      console.warn(`[API /crm/listas/descargar-pdf] El archivo podría no ser un PDF. Content-Type: ${contentType}`)
    }

    console.log(`[API /crm/listas/descargar-pdf] PDF descargado correctamente (${(arrayBuffer.byteLength / 1024).toFixed(2)} KB)`)

    // Retornar el PDF como base64 para que el cliente pueda subirlo
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    return NextResponse.json({
      success: true,
      data: base64,
      contentType,
      size: arrayBuffer.byteLength,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/listas/descargar-pdf] Error:', {
      message: error?.message || String(error),
      name: error?.name,
      stack: error?.stack,
    })
    return NextResponse.json(
      { 
        error: 'Error al descargar PDF',
        message: error?.message || String(error) || 'Error desconocido',
      },
      { status: 500 }
    )
  }
}
