/**
 * API Route para generar URL del formulario de cliente por código QR
 * GET /api/cliente/qr/[codigo]
 * Retorna la URL completa para el código QR
 */

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ codigo: string }> }
) {
  try {
    const { codigo } = await params
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   process.env.VERCEL_URL || 
                   request.headers.get('host') || 
                   'http://localhost:3000'
    
    const protocol = baseUrl.includes('localhost') ? 'http' : 'https'
    const url = `${protocol}://${baseUrl.replace(/^https?:\/\//, '')}/cliente/${codigo}`

    return NextResponse.json({
      success: true,
      codigo,
      url,
      qr_data: url, // Para generar QR directamente
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al generar URL',
      },
      { status: 500 }
    )
  }
}
