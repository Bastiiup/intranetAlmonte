import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware para proteger todas las rutas de la intranet
 * Verifica que el usuario esté autenticado antes de permitir acceso
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // IMPORTANTE: Verificar primero si es una ruta de autenticación y permitir acceso inmediatamente
  if (pathname.startsWith('/auth-1') || pathname.startsWith('/auth-2')) {
    return NextResponse.next()
  }

  // Rutas públicas que no requieren autenticación
  const publicRoutePatterns = [
    '/landing',
    '/coming-soon',
    '/maintenance',
    '/error',
  ]

  // Rutas de API públicas (no requieren autenticación)
  const publicApiRoutes = [
    '/api/auth/login',
    '/api/health',
  ]

  // Verificar si la ruta es pública
  const isPublicRoute = publicRoutePatterns.some(pattern => pathname.startsWith(pattern))
  const isPublicApiRoute = publicApiRoutes.some(route => pathname.startsWith(route))

  // Si es una ruta pública o API pública, permitir acceso sin verificar autenticación
  if (isPublicRoute || isPublicApiRoute) {
    return NextResponse.next()
  }

  // Verificar autenticación mediante cookies
  const authToken = request.cookies.get('auth_token')?.value
  const colaboradorData = request.cookies.get('colaboradorData')?.value || request.cookies.get('colaborador')?.value

  // Si no hay token ni datos de colaborador
  if (!authToken || !colaboradorData) {
    // Si es una ruta de API, retornar 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'No autorizado. Debes iniciar sesión para acceder a este recurso.' },
        { status: 401 }
      )
    }

    // Si es una ruta de página, redirigir a login
    const loginUrl = new URL('/auth-1/sign-in', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Si hay token y datos, permitir acceso
  return NextResponse.next()
}

/**
 * Configuración del matcher para aplicar el middleware solo a rutas específicas
 * Excluye archivos estáticos, imágenes, y rutas públicas
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     * - auth routes (auth-1, auth-2)
     * - static assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$).*)',
  ],
}

