import { NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import { getStrapiUrl } from '@/lib/strapi/config'

export const dynamic = 'force-dynamic'

interface RegistroRequest {
  email: string
  password: string
  cliente_id: number
}

/**
 * Endpoint para registrar un nuevo usuario cliente
 * 
 * Flujo:
 * 1. Verificar que el cliente existe en WO-Clientes
 * 2. Verificar que el email del cliente coincide
 * 3. Crear usuario en Strapi (users-permissions)
 * 4. Vincular usuario con WO-Cliente en Intranet-Usuarios-Cliente
 */
export async function POST(request: Request) {
  try {
    const body: RegistroRequest = await request.json()
    const { email, password, cliente_id } = body

    // Validar datos
    if (!email || !password || !cliente_id) {
      return NextResponse.json(
        { error: 'Email, contraseña y cliente_id son requeridos' },
        { status: 400 }
      )
    }

    // 1. Verificar que el cliente existe y el email coincide
    const clienteResponse = await strapiClient.get<any>(
      `/api/wo-clientes/${cliente_id}`
    )

    const cliente = Array.isArray(clienteResponse.data)
      ? clienteResponse.data[0]
      : clienteResponse.data

    if (!cliente || cliente.correo_electronico !== email) {
      return NextResponse.json(
        { error: 'El email no coincide con el cliente especificado' },
        { status: 400 }
      )
    }

    // 2. Verificar si ya existe un usuario con este email
    const strapiUrl = getStrapiUrl('/api/users')
    const existingUsersResponse = await fetch(
      `${strapiUrl}?filters[email][$eq]=${encodeURIComponent(email)}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.STRAPI_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (existingUsersResponse.ok) {
      const existingUsers = await existingUsersResponse.json()
      if (existingUsers && existingUsers.length > 0) {
        return NextResponse.json(
          { error: 'Ya existe un usuario con este email' },
          { status: 400 }
        )
      }
    }

    // 3. Crear usuario en Strapi usando la API directamente (más confiable que /auth/local/register)
    // Primero intentamos con el endpoint de registro público
    const strapiAuthUrl = getStrapiUrl('/api/auth/local/register')
    console.log('[API /auth/registro] Intentando crear usuario en:', strapiAuthUrl)
    
    let registerResponse = await fetch(strapiAuthUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        username: email, // Usar email como username
      }),
    })

    let usuarioData: any = null
    let usuarioId: number | null = null

    // Si el endpoint público no funciona (404), creamos el usuario directamente con el API token
    if (!registerResponse.ok && registerResponse.status === 404) {
      console.log('[API /auth/registro] Endpoint /api/auth/local/register no disponible, creando usuario directamente con API token')
      
      // Crear usuario directamente usando la API de usuarios con el token
      const createUserUrl = getStrapiUrl('/api/users')
      const createUserResponse = await fetch(createUserUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.STRAPI_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          username: email,
          confirmed: true, // Confirmar automáticamente
          blocked: false,
        }),
      })

      if (!createUserResponse.ok) {
        const errorData = await createUserResponse.json().catch(() => ({}))
        console.error('[API /auth/registro] Error al crear usuario directamente:', {
          status: createUserResponse.status,
          error: errorData,
        })
        return NextResponse.json(
          { 
            error: errorData.error?.message || 'Error al crear usuario en Strapi',
            details: errorData,
          },
          { status: createUserResponse.status }
        )
      }

      usuarioData = await createUserResponse.json()
      usuarioId = usuarioData.id || usuarioData.data?.id

      // Generar JWT manualmente usando el endpoint de login
      if (usuarioId) {
        try {
          const loginUrl = getStrapiUrl('/api/auth/local')
          const loginResponse = await fetch(loginUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              identifier: email,
              password,
            }),
          })

          if (loginResponse.ok) {
            const loginData = await loginResponse.json()
            usuarioData = { ...usuarioData, jwt: loginData.jwt, user: loginData.user || usuarioData }
          }
        } catch (loginError) {
          console.warn('[API /auth/registro] No se pudo generar JWT automáticamente:', loginError)
          // Continuamos sin JWT, el usuario puede hacer login después
        }
      }
    } else if (registerResponse.ok) {
      // El endpoint público funcionó
      usuarioData = await registerResponse.json()
      usuarioId = usuarioData.user?.id
    } else {
      // Otro error
      const errorData = await registerResponse.json().catch(() => ({}))
      console.error('[API /auth/registro] Error al crear usuario:', {
        status: registerResponse.status,
        error: errorData,
      })
      return NextResponse.json(
        { 
          error: errorData.error?.message || 'Error al crear usuario',
          details: errorData,
        },
        { status: registerResponse.status }
      )
    }

    if (!usuarioId) {
      console.error('[API /auth/registro] Usuario creado pero sin ID:', usuarioData)
      return NextResponse.json(
        { error: 'Error: usuario creado pero sin ID' },
        { status: 500 }
      )
    }

    // 4. Vincular usuario con WO-Cliente
    const vinculacionResponse = await strapiClient.post<any>(
      '/api/intranet-usuarios-clientes',
      {
        data: {
          usuario: usuarioId,
          cliente: cliente_id,
          fecha_registro: new Date().toISOString(),
          activo: true,
        },
      }
    )

    return NextResponse.json(
      {
        message: 'Usuario registrado correctamente',
        usuario: {
          id: usuarioId,
          email: usuarioData.user?.email || usuarioData.email || email,
          username: usuarioData.user?.username || usuarioData.username || email,
        },
        jwt: usuarioData.jwt || null, // JWT puede ser null si no se pudo generar
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('[API /auth/registro] Error:', {
      message: error.message,
      stack: error.stack,
    })
    return NextResponse.json(
      {
        error: error.message || 'Error al registrar usuario',
        details: error.details || {},
      },
      { status: error.status || 500 }
    )
  }
}

