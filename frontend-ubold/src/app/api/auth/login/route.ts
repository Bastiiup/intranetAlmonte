import { NextResponse } from 'next/server'
import { getStrapiUrl } from '@/lib/strapi/config'

export const dynamic = 'force-dynamic'

interface LoginRequest {
  email: string
  password: string
}

/**
 * Endpoint para login de usuarios cliente
 * 
 * Usa el endpoint de autenticación de Strapi (users-permissions)
 * y retorna el JWT token junto con los datos del cliente vinculado
 */
export async function POST(request: Request) {
  try {
    const body: LoginRequest = await request.json()
    const { email, password } = body

    // Validar datos
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      )
    }

    // Autenticar con Strapi (users-permissions)
    const strapiAuthUrl = getStrapiUrl('/api/auth/local')
    const loginResponse = await fetch(strapiAuthUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identifier: email, // Strapi usa 'identifier' que puede ser email o username
        password,
      }),
    })

    if (!loginResponse.ok) {
      const errorData = await loginResponse.json().catch(() => ({}))
      console.error('[API /auth/login] Error al autenticar:', errorData)
      return NextResponse.json(
        { error: errorData.error?.message || 'Credenciales inválidas' },
        { status: loginResponse.status || 401 }
      )
    }

    const authData = await loginResponse.json()
    const usuarioId = authData.user?.id

    if (!usuarioId) {
      return NextResponse.json(
        { error: 'Error: usuario autenticado pero sin ID' },
        { status: 500 }
      )
    }

    // Obtener datos del cliente vinculado
    const strapiUrl = getStrapiUrl(
      `/api/intranet-usuarios-clientes?filters[usuario][id][$eq]=${usuarioId}&populate=cliente`
    )

    const vinculacionResponse = await fetch(strapiUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.STRAPI_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    })

    let clienteData = null
    if (vinculacionResponse.ok) {
      const vinculacionData = await vinculacionResponse.json()
      const vinculacion = Array.isArray(vinculacionData.data)
        ? vinculacionData.data[0]
        : vinculacionData.data

      if (vinculacion?.cliente) {
        clienteData = vinculacion.cliente
      }

      // Actualizar último acceso
      if (vinculacion?.id) {
        const updateUrl = getStrapiUrl(
          `/api/intranet-usuarios-clientes/${vinculacion.id}`
        )
        await fetch(updateUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${process.env.STRAPI_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: {
              ultimo_acceso: new Date().toISOString(),
            },
          }),
        }).catch((err) => {
          console.warn('[API /auth/login] Error al actualizar último acceso:', err)
        })
      }
    }

    return NextResponse.json(
      {
        message: 'Login exitoso',
        jwt: authData.jwt,
        usuario: {
          id: authData.user.id,
          email: authData.user.email,
          username: authData.user.username,
        },
        cliente: clienteData,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[API /auth/login] Error:', {
      message: error.message,
      stack: error.stack,
    })
    return NextResponse.json(
      {
        error: error.message || 'Error al iniciar sesión',
        details: error.details || {},
      },
      { status: error.status || 500 }
    )
  }
}

