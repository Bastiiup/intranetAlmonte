import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import { logActivity, createLogDescription } from '@/lib/logging'

export const dynamic = 'force-dynamic'

/**
 * GET /api/logs/test
 * Endpoint de prueba para verificar que el logging funciona
 */
export async function GET(request: NextRequest) {
  try {
    // Intentar crear un log de prueba
    await logActivity(request, {
      accion: 'ver',
      entidad: 'logs',
      descripcion: createLogDescription('ver', 'logs', null, 'Prueba de logging'),
      metadata: { test: true },
    })

    // Intentar obtener logs con diferentes nombres posibles
    // "Log de Actividades" en Strapi puede convertirse a diferentes slugs
    const possibleNames = [
      'log-de-actividades',    // Más probable: "Log de Actividades" → "log-de-actividades"
      'log-de-actividad',      // Singular
      'logs-de-actividades',   // Plural con guión
      'activity-logs',         // En inglés
      'activity_logs',         // Con guión bajo
      'activityLogs',          // CamelCase
      'logs',                  // Nombre corto
      'log-actividades',       // Sin "de"
    ]
    
    const results: any = {}
    
    for (const name of possibleNames) {
      try {
        const response = await strapiClient.get<any>(`/api/${name}?pagination[pageSize]=1`)
        results[name] = {
          success: true,
          hasData: !!response.data,
          count: Array.isArray(response.data) ? response.data.length : response.data ? 1 : 0,
        }
      } catch (error: any) {
        results[name] = {
          success: false,
          error: error.message,
          status: error.status,
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Prueba de logging completada',
      possibleContentTypeNames: results,
      recommendation: Object.entries(results).find(([_, result]: any) => result.success)?.[0] || 'No se encontró ningún Content Type válido',
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error en prueba de logging',
      },
      { status: 500 }
    )
  }
}

