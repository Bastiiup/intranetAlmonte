/**
 * API Route para servir PDFs desde Strapi con autenticación
 * GET /api/crm/cursos/pdf/[pdfId]
 */

import { NextRequest, NextResponse } from 'next/server'
import { getStrapiUrl, STRAPI_API_TOKEN } from '@/lib/strapi/config'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/crm/cursos/pdf/[pdfId]
 * Obtiene un PDF desde Strapi Media Library y lo sirve con autenticación
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pdfId: string }> }
) {
  try {
    const { pdfId } = await params

    if (!pdfId) {
      return NextResponse.json(
        { error: 'PDF ID es requerido' },
        { status: 400 }
      )
    }

    // Obtener el archivo desde Strapi Media Library
    const strapiUrl = getStrapiUrl(`/api/upload/files/${pdfId}`)
    
    const response = await fetch(strapiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${STRAPI_API_TOKEN || ''}`,
      },
    })

    if (!response.ok) {
      console.error('[API /crm/cursos/pdf/[pdfId] GET] Error al obtener PDF:', {
        status: response.status,
        statusText: response.statusText,
        pdfId,
      })
      return NextResponse.json(
        { error: 'No se pudo obtener el PDF' },
        { status: response.status }
      )
    }

    // Obtener la información del archivo
    const fileData = await response.json()
    
    if (!fileData.url) {
      return NextResponse.json(
        { error: 'El archivo no tiene URL' },
        { status: 404 }
      )
    }

    // Construir URL completa del archivo
    const fileUrl = fileData.url.startsWith('http')
      ? fileData.url
      : `${getStrapiUrl('').replace(/\/$/, '')}${fileData.url}`

    // Obtener el archivo PDF
    const pdfResponse = await fetch(fileUrl, {
      headers: {
        'Authorization': `Bearer ${STRAPI_API_TOKEN || ''}`,
      },
    })

    if (!pdfResponse.ok) {
      console.error('[API /crm/cursos/pdf/[pdfId] GET] Error al obtener archivo PDF:', {
        status: pdfResponse.status,
        statusText: pdfResponse.statusText,
        fileUrl,
      })
      return NextResponse.json(
        { error: 'No se pudo obtener el archivo PDF' },
        { status: pdfResponse.status }
      )
    }

    // Obtener el contenido del PDF
    const pdfBuffer = await pdfResponse.arrayBuffer()

    // Retornar el PDF con headers apropiados
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${fileData.name || 'documento.pdf'}"`,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'X-Frame-Options': 'SAMEORIGIN',
      },
    })
  } catch (error: any) {
    console.error('[API /crm/cursos/pdf/[pdfId] GET] Error:', error)
    return NextResponse.json(
      { error: 'Error al obtener el PDF', message: error.message },
      { status: 500 }
    )
  }
}
