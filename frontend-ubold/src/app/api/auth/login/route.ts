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
 * Usa el endpoint personalizado de Strapi que verifica email_login y password
 * del Colaborador directamente
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

    // Llamar al endpoint personalizado de Strapi para login de colaboradores
    const loginUrl = getStrapiUrl('/api/colaboradores/login')
    const loginResponse = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email_login: email, // Usar email_login del Colaborador
        password, // Usar password del Colaborador
      }),
    })

    if (!loginResponse.ok) {
      const errorData = await loginResponse.json().catch(() => ({}))
      console.error('[API /auth/login] Error al autenticar:', {
        status: loginResponse.status,
        error: errorData,
      })
      return NextResponse.json(
        { 
          error: errorData.error?.message || errorData.message || 'Error al iniciar sesión',
        },
        { status: loginResponse.status }
      )
    }

    const data = await loginResponse.json()

    return NextResponse.json(
      {
        message: 'Login exitoso',
        jwt: data.jwt,
        usuario: data.usuario,
        colaborador: data.colaborador,
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

