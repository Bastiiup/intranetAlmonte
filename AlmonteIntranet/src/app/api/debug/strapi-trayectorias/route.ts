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

    // 1. Intentar encontrar el content type correcto de trayectorias
    const posiblesNombres = [
      'profesores',
      'persona-trayectorias',
      'trayectorias',
      'persona_trayectorias',
      'persona-trayectoria',
      'persona_trayectoria',
    ]

    let contentTypeEncontrado: string | null = null
    let estructuraEjemplo: any = null

    for (const nombre of posiblesNombres) {
      try {
        console.log(`[DEBUG] Intentando encontrar content type: /api/${nombre}`)
        // Primero probar sin populate para ver si existe
        const testResponse = await strapiClient.get<any>(`/api/${nombre}?pagination[pageSize]=1`)
        
        if (testResponse.data !== undefined) {
          console.log(`[DEBUG] ✅ Content type encontrado: /api/${nombre}`)
          contentTypeEncontrado = nombre
          
          // Ahora obtener con populate completo para ver la estructura real
          const fullResponse = await strapiClient.get<any>(
            `/api/${nombre}?pagination[pageSize]=1&populate[persona]=*&populate[colegio]=*`
          )
          
          if (fullResponse.data && Array.isArray(fullResponse.data) && fullResponse.data.length > 0) {
            estructuraEjemplo = fullResponse.data[0]
          } else if (fullResponse.data) {
            estructuraEjemplo = fullResponse.data
          }
          
          diagnostic.queries.push(`GET /api/${nombre}?pagination[pageSize]=1&populate=*`)
          diagnostic.results.contentTypeEncontrado = nombre
          diagnostic.results.estructuraTrayectoria = {
            id: estructuraEjemplo?.id,
            documentId: estructuraEjemplo?.documentId,
            attributes: estructuraEjemplo?.attributes,
            estructuraCompleta: JSON.stringify(estructuraEjemplo, null, 2),
          }
          break
        }
      } catch (error: any) {
        console.log(`[DEBUG] /api/${nombre} no existe (${error.status})`)
        diagnostic.errors.push({
          query: `GET /api/${nombre}`,
          error: error.message,
          status: error.status,
          details: error.response?.data,
        })
      }
    }

    if (!contentTypeEncontrado) {
      diagnostic.results.estructuraTrayectoria = {
        mensaje: 'No se encontró el content type de trayectorias. Intentados: ' + posiblesNombres.join(', '),
        sugerencia: 'Verifica en Strapi Admin el nombre exacto del content type',
      }
    }

    // 2. Si se proporciona personaId, verificar trayectorias de esa persona
    if (personaId && contentTypeEncontrado) {
      try {
        console.log('[DEBUG] Consultando trayectorias de persona:', personaId)
        
        // Usar el content type encontrado y populate simplificado
        const personaTrayectoriasResponse = await strapiClient.get<any>(
          `/api/${contentTypeEncontrado}?filters[persona][id][$eq]=${personaId}&populate[persona][fields][0]=id&populate[persona][fields][1]=nombre_completo&populate[colegio][fields][0]=id&populate[colegio][fields][1]=colegio_nombre&populate[colegio][fields][2]=rbd`
        )
        diagnostic.queries.push(`GET /api/${contentTypeEncontrado}?filters[persona][id][$eq]=${personaId}`)
        
        diagnostic.results.trayectoriasPersona = {
          personaId,
          cantidad: Array.isArray(personaTrayectoriasResponse.data) ? personaTrayectoriasResponse.data.length : 1,
          datos: personaTrayectoriasResponse.data,
          estructuraCompleta: JSON.stringify(personaTrayectoriasResponse.data, null, 2),
        }
      } catch (error: any) {
        diagnostic.errors.push({
          query: `GET /api/${contentTypeEncontrado}?filters[persona][id][$eq]=${personaId}`,
          error: error.message,
          status: error.status,
          details: error.response?.data,
        })
      }
    } else if (personaId && !contentTypeEncontrado) {
      diagnostic.errors.push({
        query: `Consultar trayectorias de persona ${personaId}`,
        error: 'No se puede consultar: content type de trayectorias no encontrado',
      })
    }

    // 3. Si se proporciona colegioId, verificar trayectorias de ese colegio
    if (colegioId && contentTypeEncontrado) {
      try {
        console.log('[DEBUG] Consultando trayectorias de colegio:', colegioId)
        
        // Usar el content type encontrado y populate simplificado
        const colegioTrayectoriasResponse = await strapiClient.get<any>(
          `/api/${contentTypeEncontrado}?filters[colegio][id][$eq]=${colegioId}&populate[persona][fields][0]=id&populate[persona][fields][1]=nombre_completo&populate[colegio][fields][0]=id&populate[colegio][fields][1]=colegio_nombre`
        )
        diagnostic.queries.push(`GET /api/${contentTypeEncontrado}?filters[colegio][id][$eq]=${colegioId}`)
        
        diagnostic.results.trayectoriasColegio = {
          colegioId,
          cantidad: Array.isArray(colegioTrayectoriasResponse.data) ? colegioTrayectoriasResponse.data.length : 1,
          datos: colegioTrayectoriasResponse.data,
          estructuraCompleta: JSON.stringify(colegioTrayectoriasResponse.data, null, 2),
        }
      } catch (error: any) {
        diagnostic.errors.push({
          query: `GET /api/${contentTypeEncontrado}?filters[colegio][id][$eq]=${colegioId}`,
          error: error.message,
          status: error.status,
          details: error.response?.data,
        })
      }
    } else if (colegioId && !contentTypeEncontrado) {
      diagnostic.errors.push({
        query: `Consultar trayectorias de colegio ${colegioId}`,
        error: 'No se puede consultar: content type de trayectorias no encontrado',
      })
    }

    // 4. Si se proporciona trayectoriaId, verificar esa trayectoria específica
    if (trayectoriaId) {
      try {
        console.log('[DEBUG] Consultando trayectoria específica:', trayectoriaId)
        
        const trayectoriaResponse = await strapiClient.get<any>(
          `/api/persona-trayectorias/${trayectoriaId}?populate[persona][fields][0]=id&populate[persona][fields][1]=nombre_completo&populate[colegio][fields][0]=id&populate[colegio][fields][1]=colegio_nombre&populate[colegio][fields][2]=rbd`
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

    // 5. Verificar estructura de persona con trayectorias (populate simplificado)
    if (personaId) {
      try {
        console.log('[DEBUG] Consultando persona con trayectorias:', personaId)
        
        // Populate simplificado sin relaciones circulares
        const personaResponse = await strapiClient.get<any>(
          `/api/personas/${personaId}?populate[trayectorias][populate][colegio][fields][0]=id&populate[trayectorias][populate][colegio][fields][1]=colegio_nombre&populate[trayectorias][populate][colegio][fields][2]=rbd`
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
          sugerencia: 'El populate puede tener relaciones circulares. Intentar con populate simplificado.',
        })
      }
    }

    // 6. Verificar estructura de colegio - probar diferentes nombres de relación
    if (colegioId) {
      const posiblesNombresRelacion = [
        'persona_trayectorias',
        'trayectorias',
        'persona-trayectorias',
        'persona-trayectorias',
      ]

      let relacionEncontrada = false

      for (const nombreRelacion of posiblesNombresRelacion) {
        try {
          console.log(`[DEBUG] Intentando relación: populate[${nombreRelacion}]=*`)
          
          const colegioResponse = await strapiClient.get<any>(
            `/api/colegios/${colegioId}?populate[${nombreRelacion}][populate][persona][fields][0]=id&populate[${nombreRelacion}][populate][persona][fields][1]=nombre_completo`
          )
          
          diagnostic.queries.push(`GET /api/colegios/${colegioId}?populate[${nombreRelacion}]=*`)
          
          diagnostic.results.colegioConTrayectorias = {
            colegioId,
            nombreRelacion: nombreRelacion,
            datos: colegioResponse.data,
            estructuraCompleta: JSON.stringify(colegioResponse.data, null, 2),
          }
          
          relacionEncontrada = true
          break
        } catch (error: any) {
          console.log(`[DEBUG] Relación ${nombreRelacion} no funciona (${error.status})`)
          diagnostic.errors.push({
            query: `GET /api/colegios/${colegioId}?populate[${nombreRelacion}]=*`,
            error: error.message,
            status: error.status,
            details: error.response?.data,
          })
        }
      }

      if (!relacionEncontrada) {
        diagnostic.results.colegioConTrayectorias = {
          colegioId,
          mensaje: 'No se encontró la relación correcta. Intentados: ' + posiblesNombresRelacion.join(', '),
          sugerencia: 'Verifica en Strapi Admin el nombre exacto de la relación en el content type Colegio',
        }
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
