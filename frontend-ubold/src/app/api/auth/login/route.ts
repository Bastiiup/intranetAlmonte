import { NextResponse } from 'next/server'
import { getStrapiUrl } from '@/lib/strapi/config'
import strapiClient from '@/lib/strapi/client'
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

    // Obtener colaborador completo con populate de persona
    // Asegurarse de que el colaborador siempre tenga el ID
    let colaboradorCompleto = data.colaborador
    
    // Extraer ID del colaborador (puede estar en diferentes lugares)
    const colaboradorId = data.colaborador?.id || 
                         data.colaborador?.documentId || 
                         data.colaborador?.data?.id || 
                         data.colaborador?.data?.documentId ||
                         data.colaborador?.attributes?.id ||
                         null
    
    // Asegurarse de que el colaborador tenga el ID en el nivel superior
    if (colaboradorCompleto && colaboradorId) {
      // Si no tiene ID en el nivel superior, agregarlo
      if (!colaboradorCompleto.id && !colaboradorCompleto.documentId) {
        colaboradorCompleto = {
          ...colaboradorCompleto,
          id: colaboradorId,
        }
      }
    }
    
    if (colaboradorId) {
      try {
        const colaboradorConPersona = await strapiClient.get<any>(
          `/api/colaboradores/${colaboradorId}?populate[persona][fields][0]=nombres&populate[persona][fields][1]=primer_apellido&populate[persona][fields][2]=segundo_apellido&populate[persona][fields][3]=nombre_completo`
        )
        
        // Extraer datos del colaborador con persona
        // Manejar diferentes estructuras de respuesta de Strapi
        let personaData = null
        
        if (colaboradorConPersona.data) {
          const colaboradorData = colaboradorConPersona.data
          const colaboradorAttrs = colaboradorData.attributes || colaboradorData
          personaData = colaboradorAttrs.persona
          
          // Si persona viene como objeto con data
          if (personaData?.data) {
            personaData = personaData.data.attributes || personaData.data
          } else if (personaData?.attributes) {
            personaData = personaData.attributes
          }
        } else if (colaboradorConPersona.attributes) {
          personaData = colaboradorConPersona.attributes.persona
          
          // Si persona viene como objeto con data
          if (personaData?.data) {
            personaData = personaData.data.attributes || personaData.data
          } else if (personaData?.attributes) {
            personaData = personaData.attributes
          }
        }
        
        // Actualizar colaboradorCompleto con persona y asegurar que tenga ID
        if (personaData) {
          colaboradorCompleto = {
            ...colaboradorCompleto,
            id: colaboradorCompleto.id || colaboradorId,
            documentId: colaboradorCompleto.documentId || colaboradorId,
            persona: personaData,
          }
          console.log('[API /auth/login] ✅ Persona obtenida para colaborador:', {
            id: colaboradorCompleto.id || colaboradorId,
            email_login: colaboradorCompleto.email_login,
            nombreCompleto: personaData.nombre_completo,
            nombres: personaData.nombres,
          })
        } else {
          // Asegurar que tenga ID aunque no tenga persona
          colaboradorCompleto = {
            ...colaboradorCompleto,
            id: colaboradorCompleto.id || colaboradorId,
            documentId: colaboradorCompleto.documentId || colaboradorId,
          }
          console.warn('[API /auth/login] ⚠️ Colaborador no tiene persona asociada:', colaboradorId)
        }
      } catch (error: any) {
        console.warn('[API /auth/login] ⚠️ No se pudo obtener persona del colaborador:', error.message)
        // Asegurar que tenga ID aunque falle la obtención de persona
        colaboradorCompleto = {
          ...colaboradorCompleto,
          id: colaboradorCompleto.id || colaboradorId,
          documentId: colaboradorCompleto.documentId || colaboradorId,
        }
      }
    } else {
      console.error('[API /auth/login] ❌ No se pudo extraer ID del colaborador:', {
        estructura: JSON.stringify(data.colaborador, null, 2).substring(0, 500),
      })
    }

    // Crear respuesta con cookies establecidas en el servidor
    const response = NextResponse.json(
      {
        message: 'Login exitoso',
        jwt: data.jwt,
        usuario: data.usuario,
        colaborador: colaboradorCompleto,
      },
      { status: 200 }
    )

    // Registrar log de login (usar request original)
    const requestForLog = new Request(request.url, {
      method: request.method,
      headers: request.headers,
    })
    // Agregar cookie de colaborador temporalmente para el log (usar colaboradorCompleto con persona)
    if (colaboradorCompleto) {
      requestForLog.headers.set('cookie', `colaboradorData=${JSON.stringify(colaboradorCompleto)}`)
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

    if (colaboradorCompleto) {
      // El middleware busca 'colaboradorData', así que usamos ese nombre
      // Guardar colaboradorCompleto con persona poblada
      response.cookies.set('colaboradorData', JSON.stringify(colaboradorCompleto), {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 días
      })
      
      // También establecer 'colaborador' para compatibilidad con el código existente
      response.cookies.set('colaborador', JSON.stringify(colaboradorCompleto), {
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

