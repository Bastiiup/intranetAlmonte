import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi'

/**
 * Endpoint de diagnóstico para obtener el schema del content type persona-trayectorias
 * Esto nos ayudará a ver qué campos están definidos en Strapi
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[DEBUG] Obteniendo schema de persona-trayectorias...')
    
    // Intentar obtener el schema del content type
    // En Strapi v4, podemos intentar obtener información del content type
    const contentTypes = [
      'persona-trayectorias',
      'persona-trayectoria',
      'profesores',
      'profesor',
    ]
    
    const results: any = {
      timestamp: new Date().toISOString(),
      contentTypes: {},
      errors: [],
    }
    
    for (const contentType of contentTypes) {
      try {
        // Intentar obtener una entrada para ver la estructura
        const response = await strapiClient.get<any>(
          `/api/${contentType}?pagination[pageSize]=1&fields[0]=id`
        )
        
        results.contentTypes[contentType] = {
          exists: true,
          hasData: !!response.data,
          sampleData: response.data ? (Array.isArray(response.data) ? response.data[0] : response.data) : null,
        }
        
        // Intentar obtener el schema (si Strapi lo expone)
        try {
          const schemaResponse = await strapiClient.get<any>(
            `/api/${contentType}/content-type-schema`
          )
          results.contentTypes[contentType].schema = schemaResponse
        } catch (schemaError: any) {
          results.contentTypes[contentType].schemaError = schemaError.message
        }
        
      } catch (error: any) {
        results.contentTypes[contentType] = {
          exists: false,
          error: error.message,
          status: error.status,
        }
        results.errors.push({
          contentType,
          error: error.message,
          status: error.status,
        })
      }
    }
    
    // También intentar obtener información de la estructura de una trayectoria real
    try {
      const trayectoriasResponse = await strapiClient.get<any>(
        '/api/persona-trayectorias?pagination[pageSize]=1&populate=*'
      )
      
      if (trayectoriasResponse.data && (Array.isArray(trayectoriasResponse.data) ? trayectoriasResponse.data.length > 0 : trayectoriasResponse.data)) {
        const sample = Array.isArray(trayectoriasResponse.data) ? trayectoriasResponse.data[0] : trayectoriasResponse.data
        results.sampleTrayectoria = {
          id: sample.id,
          documentId: sample.documentId,
          attributes: sample.attributes || sample,
          allKeys: Object.keys(sample.attributes || sample),
        }
      }
    } catch (error: any) {
      results.sampleTrayectoriaError = error.message
    }
    
    // Intentar crear una trayectoria de prueba para ver qué campos acepta
    // (pero no la guardaremos realmente)
    results.recommendedFields = [
      'persona',
      'colegio',
      'cargo',
      'anio',
      'curso',
      'asignatura',
      'is_current',
      'activo',
      'fecha_inicio',
      'fecha_fin',
      'notas',
    ]
    
    results.prohibitedFields = [
      'region',
      'comuna',
      'dependencia',
      'zona',
      'colegio_nombre',
      'rbd',
      'telefonos',
      'emails',
      'direcciones',
      'website',
      'estado',
    ]
    
    return NextResponse.json({
      success: true,
      diagnostic: results,
    })
  } catch (error: any) {
    console.error('[DEBUG] Error obteniendo schema:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: error,
      },
      { status: 500 }
    )
  }
}
