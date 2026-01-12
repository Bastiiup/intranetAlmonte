import { NextResponse } from 'next/server'
import { getStrapiUrl } from '@/lib/strapi/config'
import strapiClient from '@/lib/strapi/client'
import { logActivity, createLogDescription } from '@/lib/logging'
import { extractStrapiData, getStrapiId, normalizeColaborador, normalizePersona } from '@/lib/strapi/helpers'

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

    // Generar token de sesión único para sesión única
    const sessionToken = crypto.randomUUID()
    console.log('[API /auth/login] 🔐 Token de sesión generado:', sessionToken.substring(0, 8) + '...')

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
        // CRÍTICO: Incluir RUT en los campos solicitados (necesario para chat)
        const colaboradorConPersona = await strapiClient.get<any>(
          `/api/colaboradores/${colaboradorId}?populate[persona][fields][0]=rut&populate[persona][fields][1]=nombres&populate[persona][fields][2]=primer_apellido&populate[persona][fields][3]=segundo_apellido&populate[persona][fields][4]=nombre_completo`
        )
        
        // Extraer datos del colaborador con persona usando helpers
        const colaboradorData = extractStrapiData(colaboradorConPersona)
        const colaboradorAttrs = normalizeColaborador(colaboradorData)
        const colaboradorDocumentId = getStrapiId(colaboradorData) || colaboradorId
        
        // Normalizar persona si existe
        const personaData = colaboradorAttrs?.persona ? normalizePersona(colaboradorAttrs.persona) : null
        
        console.log('[API /auth/login] 🔑 documentId extraído del colaborador:', {
          documentId: colaboradorDocumentId,
          id: colaboradorId,
          tieneDocumentId: !!colaboradorDocumentId,
          tipoDocumentId: typeof colaboradorDocumentId,
        })
        
        // Actualizar colaboradorCompleto con persona y asegurar que tenga ID y documentId
        if (personaData) {
          colaboradorCompleto = {
            ...colaboradorCompleto,
            id: colaboradorCompleto.id || colaboradorId,
            documentId: colaboradorDocumentId || colaboradorCompleto.documentId || colaboradorId,
            persona: personaData,
          }
          console.log('[API /auth/login] ✅ Persona obtenida para colaborador:', {
            id: colaboradorCompleto.id || colaboradorId,
            email_login: colaboradorCompleto.email_login,
            nombreCompleto: personaData.nombre_completo,
            nombres: personaData.nombres,
            rut: personaData.rut || 'NO ENCONTRADO',
            tieneRut: !!personaData.rut,
          })
        } else {
          // Asegurar que tenga ID y documentId aunque no tenga persona
          colaboradorCompleto = {
            ...colaboradorCompleto,
            id: colaboradorCompleto.id || colaboradorId,
            documentId: colaboradorDocumentId || colaboradorCompleto.documentId || colaboradorId,
          }
          console.warn('[API /auth/login] ⚠️ Colaborador no tiene persona asociada:', colaboradorId)
        }

        // Guardar token de sesión único en Strapi para sesión única
        try {
          const idParaGuardar = colaboradorDocumentId || colaboradorId
          console.log('[API /auth/login] 💾 Guardando token de sesión en Strapi:', {
            id: idParaGuardar,
            tokenPreview: sessionToken.substring(0, 12) + '...',
            email: colaboradorCompleto.email_login,
          })
          
          await strapiClient.put(`/api/colaboradores/${idParaGuardar}`, {
            data: {
              session_token: sessionToken,
            },
          })
          
          // Verificar que se guardó correctamente
          const verificacion = await strapiClient.get<any>(`/api/colaboradores/${idParaGuardar}`)
          const verificacionData = verificacion.data?.attributes || verificacion.data || verificacion
          const tokenGuardado = verificacionData?.session_token
          
          if (tokenGuardado === sessionToken) {
            console.log('[API /auth/login] ✅ Token de sesión guardado y verificado en Strapi')
          } else {
            console.warn('[API /auth/login] ⚠️ Token guardado pero no coincide con el esperado:', {
              esperado: sessionToken.substring(0, 12) + '...',
              guardado: tokenGuardado?.substring(0, 12) + '...',
            })
          }
        } catch (sessionError: any) {
          console.error('[API /auth/login] ❌ Error al guardar token de sesión en Strapi:', {
            error: sessionError.message,
            status: sessionError.status,
            id: colaboradorDocumentId || colaboradorId,
          })
          // Continuar aunque falle, pero el sistema de sesión única no funcionará
        }
      } catch (error: any) {
        console.warn('[API /auth/login] ⚠️ No se pudo obtener persona del colaborador:', error.message)
        // Asegurar que tenga ID y documentId aunque falle la obtención de persona
        // Intentar extraer documentId de colaboradorCompleto si ya lo tiene
        const documentIdFallback = colaboradorCompleto.documentId || colaboradorId
        colaboradorCompleto = {
          ...colaboradorCompleto,
          id: colaboradorCompleto.id || colaboradorId,
          documentId: documentIdFallback,
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
      // Asegurar que el ID esté en el nivel superior antes de guardar en cookie
      const colaboradorIdFinal = colaboradorCompleto.id || colaboradorCompleto.documentId
      if (!colaboradorCompleto.id && !colaboradorCompleto.documentId && colaboradorIdFinal) {
        colaboradorCompleto.id = colaboradorIdFinal
      }
      
      // Crear estructura limpia para la cookie (sin estructuras anidadas de Strapi)
      // Incluir todos los campos necesarios: id, documentId, email_login, rol, plataforma, activo, persona, session_token
      const colaboradorParaCookie = {
        id: colaboradorCompleto.id || colaboradorCompleto.documentId,
        documentId: colaboradorCompleto.documentId || colaboradorCompleto.id,
        email_login: colaboradorCompleto.email_login || colaboradorCompleto.email,
        rol: colaboradorCompleto.rol || 'soporte',
        plataforma: colaboradorCompleto.plataforma || 'general', // Incluir plataforma (moraleja, escolar, general)
        activo: colaboradorCompleto.activo !== undefined ? colaboradorCompleto.activo : true,
        persona: colaboradorCompleto.persona || null,
        session_token: sessionToken, // Token de sesión único para sesión única
      }
      
      console.log('[API /auth/login] 💾 Estructura del colaborador ANTES de guardar en cookie:', {
        estructuraOriginal: JSON.stringify(colaboradorCompleto, null, 2).substring(0, 1000),
        estructuraParaCookie: JSON.stringify(colaboradorParaCookie, null, 2).substring(0, 1000),
        tieneId: !!colaboradorParaCookie.id,
        id: colaboradorParaCookie.id,
        tieneDocumentId: !!colaboradorParaCookie.documentId,
        documentId: colaboradorParaCookie.documentId,
        email_login: colaboradorParaCookie.email_login,
        rol: colaboradorParaCookie.rol,
        activo: colaboradorParaCookie.activo,
        tienePersona: !!colaboradorParaCookie.persona,
      })
      
      // Guardar estructura limpia en cookie (sin estructuras anidadas de Strapi)
      const cookieValue = JSON.stringify(colaboradorParaCookie)
      console.log('[API /auth/login] 💾 Valor de cookie a guardar (primeros 200 chars):', cookieValue.substring(0, 200))
      
      // Guardar en múltiples nombres de cookie para compatibilidad:
      // 1. colaboradorData - usado por logging y middleware
      // 2. colaborador - compatibilidad con código existente
      // 3. auth_colaborador - usado por lib/auth.ts y otros endpoints
      response.cookies.set('colaboradorData', cookieValue, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 días
      })
      
      response.cookies.set('colaborador', cookieValue, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      })
      
      response.cookies.set('auth_colaborador', cookieValue, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      })
      
      console.log('[API /auth/login] ✅ Cookies guardadas exitosamente:', {
        nombres: ['colaboradorData', 'colaborador', 'auth_colaborador'],
        id: colaboradorParaCookie.id,
        documentId: colaboradorParaCookie.documentId,
        email: colaboradorParaCookie.email_login,
        tienePersona: !!colaboradorParaCookie.persona,
        personaRut: colaboradorParaCookie.persona?.rut || 'NO RUT',
        cookieSize: cookieValue.length,
        maxAge: '7 días',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
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

