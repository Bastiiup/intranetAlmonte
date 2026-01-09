/**
 * Endpoint de diagnóstico para verificar la estructura de trayectorias en Strapi
 * GET /api/debug/strapi-trayectorias?personaId=XXX&colegioId=YYY
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const personaId = searchParams.get('personaId')
    const colegioId = searchParams.get('colegioId')
    const trayectoriaId = searchParams.get('trayectoriaId')

    const diagnostic: any = {
      timestamp: new Date().toISOString(),
      queries: [],
      results: {},
      errors: [],
    }

    // 1. Verificar estructura del content type "profesores" (trayectorias)
    try {
      console.log('[DEBUG] Consultando estructura de profesores...')
      const profesoresResponse = await strapiClient.get('/api/profesores?pagination[pageSize]=1&populate=*')
      diagnostic.queries.push('GET /api/profesores?pagination[pageSize]=1&populate=*')
      
      if (profesoresResponse.data && Array.isArray(profesoresResponse.data) && profesoresResponse.data.length > 0) {
        const primeraTrayectoria = profesoresResponse.data[0]
        diagnostic.results.estructuraTrayectoria = {
          id: primeraTrayectoria.id,
          documentId: primeraTrayectoria.documentId,
          attributes: primeraTrayectoria.attributes,
          estructuraCompleta: JSON.stringify(primeraTrayectoria, null, 2),
        }
      } else {
        diagnostic.results.estructuraTrayectoria = {
          mensaje: 'No hay trayectorias en Strapi para analizar estructura',
        }
      }
    } catch (error: any) {
      diagnostic.errors.push({
        query: 'GET /api/profesores',
        error: error.message,
        status: error.status,
        details: error.response?.data,
      })
    }

    // 2. Si se proporciona personaId, verificar trayectorias de esa persona
    if (personaId) {
      try {
        console.log('[DEBUG] Consultando trayectorias de persona:', personaId)
        
        // Intentar con populate completo
        const personaTrayectoriasResponse = await strapiClient.get(
          `/api/profesores?filters[persona][id][$eq]=${personaId}&populate[persona]=*&populate[colegio]=*&populate[colegio][populate][comuna]=*&populate[curso]=*&populate[asignatura]=*`
        )
        diagnostic.queries.push(`GET /api/profesores?filters[persona][id][$eq]=${personaId}&populate=*`)
        
        diagnostic.results.trayectoriasPersona = {
          personaId,
          cantidad: Array.isArray(personaTrayectoriasResponse.data) ? personaTrayectoriasResponse.data.length : 1,
          datos: personaTrayectoriasResponse.data,
          estructuraCompleta: JSON.stringify(personaTrayectoriasResponse.data, null, 2),
        }
      } catch (error: any) {
        diagnostic.errors.push({
          query: `GET /api/profesores?filters[persona][id][$eq]=${personaId}`,
          error: error.message,
          status: error.status,
          details: error.response?.data,
        })
      }
    }

    // 3. Si se proporciona colegioId, verificar trayectorias de ese colegio
    if (colegioId) {
      try {
        console.log('[DEBUG] Consultando trayectorias de colegio:', colegioId)
        
        // Intentar con id numérico
        const colegioTrayectoriasResponse = await strapiClient.get(
          `/api/profesores?filters[colegio][id][$eq]=${colegioId}&populate[persona]=*&populate[colegio]=*&populate[colegio][populate][comuna]=*`
        )
        diagnostic.queries.push(`GET /api/profesores?filters[colegio][id][$eq]=${colegioId}&populate=*`)
        
        diagnostic.results.trayectoriasColegio = {
          colegioId,
          cantidad: Array.isArray(colegioTrayectoriasResponse.data) ? colegioTrayectoriasResponse.data.length : 1,
          datos: colegioTrayectoriasResponse.data,
          estructuraCompleta: JSON.stringify(colegioTrayectoriasResponse.data, null, 2),
        }
      } catch (error: any) {
        diagnostic.errors.push({
          query: `GET /api/profesores?filters[colegio][id][$eq]=${colegioId}`,
          error: error.message,
          status: error.status,
          details: error.response?.data,
        })
      }
    }

    // 4. Si se proporciona trayectoriaId, verificar esa trayectoria específica
    if (trayectoriaId) {
      try {
        console.log('[DEBUG] Consultando trayectoria específica:', trayectoriaId)
        
        const trayectoriaResponse = await strapiClient.get(
          `/api/profesores/${trayectoriaId}?populate[persona]=*&populate[colegio]=*&populate[colegio][populate][comuna]=*&populate[colegio][populate][telefonos]=*&populate[colegio][populate][emails]=*&populate[curso]=*&populate[asignatura]=*`
        )
        diagnostic.queries.push(`GET /api/profesores/${trayectoriaId}?populate=*`)
        
        diagnostic.results.trayectoriaEspecifica = {
          trayectoriaId,
          datos: trayectoriaResponse.data,
          estructuraCompleta: JSON.stringify(trayectoriaResponse.data, null, 2),
        }
      } catch (error: any) {
        diagnostic.errors.push({
          query: `GET /api/profesores/${trayectoriaId}`,
          error: error.message,
          status: error.status,
          details: error.response?.data,
        })
      }
    }

    // 5. Verificar estructura de persona con trayectorias
    if (personaId) {
      try {
        console.log('[DEBUG] Consultando persona con trayectorias:', personaId)
        
        const personaResponse = await strapiClient.get(
          `/api/personas/${personaId}?populate[trayectorias]=*&populate[trayectorias][populate][colegio]=*&populate[trayectorias][populate][colegio][populate][comuna]=*&populate[trayectorias][populate][colegio][populate][telefonos]=*&populate[trayectorias][populate][colegio][populate][emails]=*`
        )
        diagnostic.queries.push(`GET /api/personas/${personaId}?populate[trayectorias]=*`)
        
        diagnostic.results.personaConTrayectorias = {
          personaId,
          datos: personaResponse.data,
          estructuraCompleta: JSON.stringify(personaResponse.data, null, 2),
        }
      } catch (error: any) {
        diagnostic.errors.push({
          query: `GET /api/personas/${personaId}?populate[trayectorias]=*`,
          error: error.message,
          status: error.status,
          details: error.response?.data,
        })
      }
    }

    // 6. Verificar estructura de colegio con trayectorias
    if (colegioId) {
      try {
        console.log('[DEBUG] Consultando colegio con trayectorias:', colegioId)
        
        const colegioResponse = await strapiClient.get(
          `/api/colegios/${colegioId}?populate[persona_trayectorias]=*&populate[comuna]=*&populate[telefonos]=*&populate[emails]=*`
        )
        diagnostic.queries.push(`GET /api/colegios/${colegioId}?populate[persona_trayectorias]=*`)
        
        diagnostic.results.colegioConTrayectorias = {
          colegioId,
          datos: colegioResponse.data,
          estructuraCompleta: JSON.stringify(colegioResponse.data, null, 2),
        }
      } catch (error: any) {
        diagnostic.errors.push({
          query: `GET /api/colegios/${colegioId}?populate[persona_trayectorias]=*`,
          error: error.message,
          status: error.status,
          details: error.response?.data,
        })
      }
    }

    return NextResponse.json({
      success: true,
      diagnostic,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[DEBUG] Error general:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.response?.data,
    }, { status: 500 })
  }
}
