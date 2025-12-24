import { NextResponse } from 'next/server'
import { getStrapiUrl } from '@/lib/strapi/config'
import { logActivity, createLogDescription } from '@/lib/logging'

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
      
      // Detectar mensajes específicos de Strapi y proporcionar mensajes más claros
      const errorMessage = errorData.error?.message || errorData.message || 'Error al iniciar sesión'
      let userFriendlyMessage = errorMessage
      
      // Detectar si el colaborador no tiene contraseña configurada
      if (
        errorMessage.toLowerCase().includes('no se ha configurado una contraseña') ||
        errorMessage.toLowerCase().includes('contraseña') && errorMessage.toLowerCase().includes('colaborador')
      ) {
        userFriendlyMessage = 'Este colaborador no tiene una contraseña configurada. Por favor, contacta al administrador para que configure una contraseña en Strapi.'
      } else if (errorMessage.toLowerCase().includes('invalid') || errorMessage.toLowerCase().includes('incorrect')) {
        userFriendlyMessage = 'Email o contraseña incorrectos. Verifica tus credenciales e intenta nuevamente.'
      } else if (errorMessage.toLowerCase().includes('not found') || errorMessage.toLowerCase().includes('no encontrado')) {
        userFriendlyMessage = 'No se encontró un colaborador con este email. Verifica que el email sea correcto.'
      }
      
      return NextResponse.json(
        { 
          error: userFriendlyMessage,
          originalError: errorMessage, // Mantener el error original para debugging
        },
        { status: loginResponse.status }
      )
    }

    const data = await loginResponse.json()

    // Crear respuesta con cookies establecidas en el servidor
    const response = NextResponse.json(
      {
        message: 'Login exitoso',
        jwt: data.jwt,
        usuario: data.usuario,
        colaborador: data.colaborador,
      },
      { status: 200 }
    )

    // Registrar log de login (usar request original)
    const requestForLog = new Request(request.url, {
      method: request.method,
      headers: request.headers,
    })
    // Agregar cookie de colaborador temporalmente para el log
    if (data.colaborador) {
      requestForLog.headers.set('cookie', `colaboradorData=${JSON.stringify(data.colaborador)}`)
    }
    
    logActivity(requestForLog as any, {
      accion: 'login',
      entidad: 'usuario',
      entidadId: data.colaborador?.id || data.colaborador?.documentId || null,
      descripcion: createLogDescription('login', 'usuario', null, `Usuario ${data.colaborador?.email_login || email}`),
      metadata: { email: data.colaborador?.email_login || email },
    }).catch(() => {})

    // Establecer cookies en el servidor para que el middleware las detecte
    if (data.jwt) {
      response.cookies.set('auth_token', data.jwt, {
        httpOnly: false, // Necesario para que el cliente también pueda leerlo
        secure: process.env.NODE_ENV === 'production', // HTTPS en producción
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 días
      })
    }

    if (data.colaborador) {
      // El middleware busca 'colaboradorData', así que usamos ese nombre
      response.cookies.set('colaboradorData', JSON.stringify(data.colaborador), {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 días
      })
      
      // También establecer 'colaborador' para compatibilidad con el código existente
      response.cookies.set('colaborador', JSON.stringify(data.colaborador), {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      })
    }

    if (data.usuario) {
      response.cookies.set('user', JSON.stringify(data.usuario), {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      })
    }

    return response
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

