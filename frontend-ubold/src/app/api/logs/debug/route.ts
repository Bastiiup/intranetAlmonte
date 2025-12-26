import { NextRequest, NextResponse } from 'next/server'
import { logActivity } from '@/lib/logging'

export const dynamic = 'force-dynamic'

/**
 * GET /api/logs/debug
 * Endpoint temporal para verificar que logActivity funciona correctamente
 */
export async function GET(request: NextRequest) {
  try {
    // Intentar obtener usuario del request
    const colaboradorCookie = request.cookies.get('colaboradorData')?.value
    const cookieHeader = request.headers.get('cookie')
    
    const debugInfo = {
      tieneRequest: !!request,
      tieneCookies: !!request.cookies,
      tieneColaboradorCookie: !!colaboradorCookie,
      tieneCookieHeader: !!cookieHeader,
      colaboradorCookiePreview: colaboradorCookie ? colaboradorCookie.substring(0, 200) : 'NO HAY COOKIE',
      cookieHeaderPreview: cookieHeader ? cookieHeader.substring(0, 200) : 'NO HAY HEADER',
      todasLasCookies: request.cookies.getAll().map(c => c.name).join(', '),
    }
    
    // Intentar parsear la cookie
    let colaboradorParsed = null
    if (colaboradorCookie) {
      try {
        colaboradorParsed = JSON.parse(colaboradorCookie)
        debugInfo.colaboradorId = colaboradorParsed.id || colaboradorParsed.documentId || 'NO HAY ID'
        debugInfo.colaboradorEmail = colaboradorParsed.email_login || 'NO HAY EMAIL'
      } catch (e: any) {
        debugInfo.parseError = e.message
      }
    }
    
    return NextResponse.json({
      success: true,
      debug: debugInfo,
      message: 'Información de debug del request actual',
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 })
  }
}

