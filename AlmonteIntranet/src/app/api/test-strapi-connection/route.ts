/**
 * Endpoint de prueba para verificar la conexión a Strapi
 * GET /api/test-strapi-connection
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import { STRAPI_API_URL, STRAPI_API_TOKEN } from '@/lib/strapi/config'
import type { StrapiResponse } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const results: any = {
      timestamp: new Date().toISOString(),
      config: {
        url: STRAPI_API_URL,
        tieneToken: !!STRAPI_API_TOKEN,
        tokenLength: STRAPI_API_TOKEN?.length || 0,
        tokenPreview: STRAPI_API_TOKEN ? `${STRAPI_API_TOKEN.substring(0, 20)}...` : 'NO CONFIGURADO',
      },
      tests: [],
    }

    // Test 1: Obtener cursos (paginación limitada)
    try {
      const cursosResponse = await strapiClient.get<StrapiResponse<any[]>>(
        '/api/cursos?pagination[limit]=3&populate[colegio]=true'
      )
      
      results.tests.push({
        test: 'GET /api/cursos',
        success: true,
        status: 'OK',
        data: {
          total: cursosResponse.meta?.pagination?.total || 0,
          count: cursosResponse.data?.length || 0,
          firstCourse: cursosResponse.data?.[0] ? {
            id: cursosResponse.data[0].id || cursosResponse.data[0].documentId,
            nombre: cursosResponse.data[0].attributes?.nombre_curso || cursosResponse.data[0].nombre_curso,
            tieneColegio: !!cursosResponse.data[0].attributes?.colegio || !!cursosResponse.data[0].colegio,
          } : null,
        },
      })
    } catch (error: any) {
      results.tests.push({
        test: 'GET /api/cursos',
        success: false,
        error: error.message || 'Error desconocido',
        status: error.status || 'N/A',
        details: error.data || error.details,
      })
    }

    // Test 2: Obtener colegios
    try {
      const colegiosResponse = await strapiClient.get<StrapiResponse<any[]>>(
        '/api/colegios?pagination[limit]=3'
      )
      
      results.tests.push({
        test: 'GET /api/colegios',
        success: true,
        status: 'OK',
        data: {
          total: colegiosResponse.meta?.pagination?.total || 0,
          count: colegiosResponse.data?.length || 0,
          firstColegio: colegiosResponse.data?.[0] ? {
            id: colegiosResponse.data[0].id || colegiosResponse.data[0].documentId,
            nombre: colegiosResponse.data[0].attributes?.nombre || colegiosResponse.data[0].nombre,
            rbd: colegiosResponse.data[0].attributes?.rbd || colegiosResponse.data[0].rbd,
          } : null,
        },
      })
    } catch (error: any) {
      results.tests.push({
        test: 'GET /api/colegios',
        success: false,
        error: error.message || 'Error desconocido',
        status: error.status || 'N/A',
        details: error.data || error.details,
      })
    }

    // Test 3: Verificar endpoint de listas por colegio
    try {
      const listasResponse = await strapiClient.get<StrapiResponse<any[]>>(
        '/api/cursos?pagination[limit]=1&fields[0]=versiones_materiales&populate[colegio]=true&publicationState=preview'
      )
      
      results.tests.push({
        test: 'GET /api/cursos con versiones_materiales',
        success: true,
        status: 'OK',
        data: {
          tieneVersiones: listasResponse.data?.[0]?.attributes?.versiones_materiales ? true : false,
          versionesCount: Array.isArray(listasResponse.data?.[0]?.attributes?.versiones_materiales) 
            ? listasResponse.data[0].attributes.versiones_materiales.length 
            : 0,
        },
      })
    } catch (error: any) {
      results.tests.push({
        test: 'GET /api/cursos con versiones_materiales',
        success: false,
        error: error.message || 'Error desconocido',
        status: error.status || 'N/A',
        details: error.data || error.details,
      })
    }

    // Resumen
    const successCount = results.tests.filter((t: any) => t.success).length
    const failCount = results.tests.filter((t: any) => !t.success).length
    
    results.summary = {
      totalTests: results.tests.length,
      successful: successCount,
      failed: failCount,
      connectionStatus: failCount === 0 ? 'OK' : 'ERROR',
    }

    return NextResponse.json(results, {
      status: failCount === 0 ? 200 : 207, // 207 Multi-Status si hay algunos fallos
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        error: 'Error al ejecutar tests de conexión',
        message: error.message || 'Error desconocido',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
