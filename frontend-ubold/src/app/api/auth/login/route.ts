import { NextResponse } from 'next/server'
import { getStrapiUrl } from '@/lib/strapi/config'

export const dynamic = 'force-dynamic'

interface LoginRequest {
  email: string
  password: string
}

/**
 * Endpoint para login de usuarios colaborador
 * 
 * Usa el endpoint de autenticación de Strapi (users-permissions)
 * y retorna el JWT token junto con los datos del colaborador vinculado
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

    // 1. Buscar Colaborador por email_login
    const colaboradorUrl = getStrapiUrl(
      `/api/colaboradores?filters[email_login][$eq]=${encodeURIComponent(email)}&populate[persona]=*&populate[usuario]=*`
    )

    const colaboradorResponse = await fetch(colaboradorUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.STRAPI_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    })

    if (!colaboradorResponse.ok) {
      const errorText = await colaboradorResponse.text()
      console.error('[API /auth/login] Error al buscar colaborador:', {
        status: colaboradorResponse.status,
        statusText: colaboradorResponse.statusText,
        url: colaboradorUrl,
        error: errorText,
      })
      return NextResponse.json(
        { 
          error: 'Error al buscar colaborador',
          details: errorText,
        },
        { status: colaboradorResponse.status }
      )
    }

    const colaboradorResponseData = await colaboradorResponse.json()
    const colaboradores = Array.isArray(colaboradorResponseData.data)
      ? colaboradorResponseData.data
      : colaboradorResponseData.data
        ? [colaboradorResponseData.data]
        : []

    if (colaboradores.length === 0) {
      return NextResponse.json(
        { error: 'No se encontró un colaborador con este email' },
        { status: 404 }
      )
    }

    const colaborador = colaboradores[0]

    // 2. Verificar que el Colaborador esté activo
    if (!colaborador.activo) {
      return NextResponse.json(
        { error: 'Tu cuenta está desactivada. Contacta al administrador.' },
        { status: 403 }
      )
    }

    // 3. Verificar que tenga usuario vinculado
    if (!colaborador.usuario) {
      return NextResponse.json(
        { error: 'No tienes una cuenta creada. Contacta al administrador para que te cree una cuenta.' },
        { status: 403 }
      )
    }

    // Obtener el email del usuario vinculado
    // El usuario puede venir como objeto (con populate) o como ID
    let usuarioEmail: string | null = null
    let usuarioId: string | number | null = null

    if (typeof colaborador.usuario === 'object' && colaborador.usuario !== null) {
      // Si viene como objeto (con populate), usar su email o username
      usuarioEmail = colaborador.usuario.email || colaborador.usuario.username || null
      usuarioId = colaborador.usuario.id || null
    } else {
      // Si viene como ID, necesitamos buscar el usuario
      usuarioId = colaborador.usuario
    }

    // Si no tenemos el email, buscar el usuario por ID
    if (!usuarioEmail && usuarioId) {
      try {
        const usuarioUrl = getStrapiUrl(`/api/users/${usuarioId}`)
        const usuarioResponse = await fetch(usuarioUrl, {
          headers: {
            'Authorization': `Bearer ${process.env.STRAPI_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
        })
        
        if (usuarioResponse.ok) {
          const usuarioData = await usuarioResponse.json()
          usuarioEmail = usuarioData.email || usuarioData.username || null
        }
      } catch (e) {
        console.error('[API /auth/login] Error al buscar usuario:', e)
      }
    }

    if (!usuarioEmail) {
      return NextResponse.json(
        { error: 'Error: no se pudo obtener el email del usuario vinculado' },
        { status: 500 }
      )
    }

    // 4. Autenticar con Strapi (users-permissions) usando el email del usuario vinculado
    const strapiAuthUrl = getStrapiUrl('/api/auth/local')
    const loginResponse = await fetch(strapiAuthUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identifier: usuarioEmail, // Usar el email del usuario de Strapi, no el email_login
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

    // 5. Verificar que el usuario autenticado coincide con el vinculado al colaborador
    if (String(usuarioId) !== String(colaborador.usuario.id || colaborador.usuario)) {
      return NextResponse.json(
        { error: 'Error: el usuario autenticado no coincide con el colaborador' },
        { status: 403 }
      )
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
        colaborador: {
          id: colaborador.id,
          email_login: colaborador.email_login,
          activo: colaborador.activo,
          persona: colaborador.persona,
        },
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

