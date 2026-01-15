import { NextRequest, NextResponse } from 'next/server'
import { getColaboradorFromCookies } from '@/lib/auth/cookies'
import { cookies } from 'next/headers'

/**
 * GET /api/debug/colaborador-sesion
 * 
 * Obtiene información completa del colaborador en sesión desde múltiples fuentes:
 * - Cookies (colaboradorData, colaborador, auth_colaborador)
 * - Headers
 * - Verificación en Strapi
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    
    // ========== MÉTODO 1: Usar helper getColaboradorFromCookies ==========
    const colaboradorFromHelper = await getColaboradorFromCookies()
    
    // ========== MÉTODO 2: Extracción directa desde cookies ==========
    const todasLasCookies = cookieStore.getAll()
    const cookiesRelevantes: Record<string, any> = {}
    
    const cookieNames = ['colaboradorData', 'colaborador', 'auth_colaborador', 'auth_token', 'auth_user']
    cookieNames.forEach(name => {
      const cookie = cookieStore.get(name)
      if (cookie) {
        try {
          const parsed = JSON.parse(cookie.value)
          cookiesRelevantes[name] = parsed
        } catch {
          cookiesRelevantes[name] = cookie.value
        }
      }
    })
    
    // ========== MÉTODO 3: Extracción desde headers ==========
    const cookieHeader = request.headers.get('cookie')
    let cookiesFromHeader: Record<string, any> = {}
    
    if (cookieHeader) {
      const parsed = cookieHeader.split(';').reduce((acc: Record<string, string>, cookie: string) => {
        const [name, ...valueParts] = cookie.trim().split('=')
        if (name && valueParts.length > 0) {
          const value = valueParts.join('=')
          try {
            JSON.parse(value)
            acc[name] = value
          } catch {
            acc[name] = decodeURIComponent(value)
          }
        }
        return acc
      }, {})
      
      Object.keys(parsed).forEach(name => {
        if (cookieNames.includes(name)) {
          try {
            cookiesFromHeader[name] = JSON.parse(parsed[name])
          } catch {
            cookiesFromHeader[name] = parsed[name]
          }
        }
      })
    }
    
    // ========== MÉTODO 4: Verificar en Strapi si el colaborador existe ==========
    let verificacionStrapi: any = null
    if (colaboradorFromHelper?.id || colaboradorFromHelper?.documentId) {
      try {
        const strapiUrl = process.env.STRAPI_API_URL || 'https://strapi.moraleja.cl'
        const strapiToken = process.env.STRAPI_API_TOKEN || ''
        
        const idParaBuscar = colaboradorFromHelper.id || colaboradorFromHelper.documentId
        const url = `${strapiUrl}/api/colaboradores/${idParaBuscar}?populate[persona][populate]=*`
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${strapiToken}`,
            'Content-Type': 'application/json',
          },
        })
        
        if (response.ok) {
          const data = await response.json()
          verificacionStrapi = {
            existe: true,
            data: data.data || data,
            status: response.status,
          }
        } else {
          verificacionStrapi = {
            existe: false,
            error: `Status ${response.status}`,
            status: response.status,
          }
        }
      } catch (error: any) {
        verificacionStrapi = {
          existe: false,
          error: error.message,
        }
      }
    }
    
    // ========== Extraer información de persona ==========
    let personaInfo: any = null
    if (colaboradorFromHelper?.persona) {
      const persona = colaboradorFromHelper.persona
      const personaAttrs = persona.attributes || persona.data?.attributes || persona.data || persona
      
      personaInfo = {
        rut: personaAttrs.rut || null,
        nombres: personaAttrs.nombres || null,
        primer_apellido: personaAttrs.primer_apellido || null,
        segundo_apellido: personaAttrs.segundo_apellido || null,
        nombre_completo: personaAttrs.nombre_completo || 
                        `${(personaAttrs.nombres || '').trim()} ${(personaAttrs.primer_apellido || '').trim()}`.trim() ||
                        null,
        genero: personaAttrs.genero || null,
        telefono_principal: personaAttrs.telefono_principal || null,
        emails: personaAttrs.emails || null,
        telefonos: personaAttrs.telefonos || null,
      }
    }
    
    // ========== Preparar respuesta completa ==========
    const resultado = {
      timestamp: new Date().toISOString(),
      metodos: {
        helper: {
          disponible: !!colaboradorFromHelper,
          datos: colaboradorFromHelper,
        },
        cookiesDirectas: {
          disponibles: Object.keys(cookiesRelevantes).length > 0,
          cookies: cookiesRelevantes,
        },
        headers: {
          disponible: Object.keys(cookiesFromHeader).length > 0,
          cookies: cookiesFromHeader,
        },
        verificacionStrapi: verificacionStrapi,
      },
      colaboradorFinal: {
        id: colaboradorFromHelper?.id || null,
        documentId: colaboradorFromHelper?.documentId || null,
        email_login: colaboradorFromHelper?.email_login || null,
        rol: colaboradorFromHelper?.rol || null,
        activo: colaboradorFromHelper?.activo ?? null,
        persona: personaInfo,
      },
      todasLasCookies: todasLasCookies.map(c => ({
        name: c.name,
        value: c.value.length > 200 ? c.value.substring(0, 200) + '...' : c.value,
        hasValue: !!c.value,
        valueLength: c.value.length,
      })),
      recomendaciones: {
        idParaLogging: colaboradorFromHelper?.id || colaboradorFromHelper?.documentId || null,
        emailParaLogging: colaboradorFromHelper?.email_login || null,
        nombreParaLogging: personaInfo?.nombre_completo || personaInfo?.nombres || colaboradorFromHelper?.email_login || null,
        existeEnStrapi: verificacionStrapi?.existe || false,
        puedeUsarEnLogs: !!(colaboradorFromHelper?.id || colaboradorFromHelper?.documentId),
      },
    }
    
    return NextResponse.json(resultado, { status: 200 })
  } catch (error: any) {
    console.error('[API /debug/colaborador-sesion] Error:', error)
    return NextResponse.json(
      {
        error: 'Error al obtener información del colaborador',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
