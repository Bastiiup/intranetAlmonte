import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware para proteger rutas de la intranet
 * 
 * Verifica si el usuario tiene una cookie de autenticación válida.
 * Si no la tiene, redirige al login.
 * 
 * Rutas públicas excluidas:
 * - /auth-1/* (páginas de autenticación)
 * - /api/auth/* (endpoints de autenticación)
 * - /api/tienda/upload (subida de archivos)
 * - /landing (página de landing si existe)
 */

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rutas públicas que no requieren autenticación
  const publicPaths = [
    '/auth-1',
    '/auth-2',
    '/api/auth', // Endpoints de autenticación
    '/api/tienda/upload', // Upload de archivos (maneja su propia auth)
    '/landing',
    '/error',
    '/not-found',
    '/favicon.ico',
    '/icon.svg',
  ]

  // Los endpoints de API manejan su propia autenticación mediante headers
  // No los bloqueamos aquí, solo las páginas de UI
  const isApiPath = pathname.startsWith('/api/')

  // Verificar si la ruta es pública
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path))

  // Si es una ruta de API, permitir acceso (la API maneja su propia auth)
  if (isApiPath && !pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  // Si es una ruta pública, permitir acceso sin verificar autenticación
  if (isPublicPath) {
    return NextResponse.next()
  }

  // Verificar cookies de autenticación (múltiples opciones para compatibilidad)
  const authToken = request.cookies.get('auth_token')?.value
  const authColaborador = request.cookies.get('auth_colaborador')?.value
  const colaboradorData = request.cookies.get('colaboradorData')?.value
  const colaborador = request.cookies.get('colaborador')?.value

  // Si no hay ninguna cookie de autenticación, redirigir al login
  if (!authToken && !authColaborador && !colaboradorData && !colaborador) {
    const loginUrl = new URL('/auth-1/sign-in', request.url)
    // Guardar la URL a la que intentaba acceder para redirigir después del login
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Si hay token, permitir acceso
  return NextResponse.next()
}

// Configuración del matcher para aplicar el middleware solo a rutas específicas
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}

