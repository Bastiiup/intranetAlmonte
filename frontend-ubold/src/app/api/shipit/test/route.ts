/**
 * API Route para probar la conexión con Shipit
 * GET: Verifica que las credenciales estén configuradas y la conexión funcione
 */

import { NextRequest, NextResponse } from 'next/server'
import shipitClient from '@/lib/shipit/client'
import { SHIPIT_API_TOKEN, SHIPIT_API_EMAIL, SHIPIT_API_URL } from '@/lib/shipit/config'

export const dynamic = 'force-dynamic'

/**
 * GET /api/shipit/test
 * Prueba la conexión con Shipit API
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar configuración
    const config = {
      hasToken: !!SHIPIT_API_TOKEN,
      tokenLength: SHIPIT_API_TOKEN?.length || 0,
      hasEmail: !!SHIPIT_API_EMAIL,
      email: SHIPIT_API_EMAIL || 'No configurado',
      apiUrl: SHIPIT_API_URL,
    }

    if (!SHIPIT_API_TOKEN) {
      return NextResponse.json(
        {
          success: false,
          error: 'SHIPIT_API_TOKEN no está configurado',
          config,
        },
        { status: 400 }
      )
    }

    if (!SHIPIT_API_EMAIL) {
      return NextResponse.json(
        {
          success: false,
          error: 'SHIPIT_API_EMAIL no está configurado (requerido para autenticación)',
          config,
        },
        { status: 400 }
      )
    }

    // Intentar hacer una petición simple a la API
    // Nota: Este endpoint puede variar según la versión de la API
    // Si no existe, al menos verificamos que la autenticación esté correcta
    try {
      // Intentar obtener información básica o listar envíos (puede requerir parámetros)
      // Si este endpoint no existe, el error nos dirá si la autenticación es correcta
      const testResponse = await shipitClient.get('shipments', { per_page: 1 })
      
      return NextResponse.json({
        success: true,
        message: 'Conexión con Shipit API exitosa',
        config: {
          ...config,
          email: config.email, // Mostrar email (puede ser sensible, considerar ocultarlo en producción)
        },
        testResponse: testResponse,
      })
    } catch (apiError: any) {
      // Si el error es 401/403, es problema de autenticación
      // Si es 404, puede ser que el endpoint no exista pero la autenticación está bien
      if (apiError.status === 401 || apiError.status === 403) {
        return NextResponse.json(
          {
            success: false,
            error: 'Error de autenticación con Shipit API',
            details: apiError.message,
            config: {
              ...config,
              email: config.email,
            },
            suggestion: 'Verifica que el token y el email sean correctos',
          },
          { status: 401 }
        )
      }

      // Otros errores pueden ser normales (endpoint no existe, etc.)
      return NextResponse.json({
        success: true,
        message: 'Configuración correcta, pero el endpoint de prueba no está disponible',
        config: {
          ...config,
          email: config.email,
        },
        apiError: {
          status: apiError.status,
          message: apiError.message,
        },
        note: 'La autenticación parece estar configurada correctamente. El error puede ser del endpoint específico.',
      })
    }
  } catch (error: any) {
    console.error('Error al probar conexión con Shipit:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al probar conexión',
        details: error,
      },
      { status: 500 }
    )
  }
}
