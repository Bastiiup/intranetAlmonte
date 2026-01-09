/**
 * Endpoint de diagnóstico para probar crear una trayectoria en Strapi
 * POST /api/debug/strapi-create-trayectoria
 * Body: { personaId: number, colegioId: number, cargo?: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { personaId, colegioId, cargo } = body

    if (!personaId || !colegioId) {
      return NextResponse.json({
        success: false,
        error: 'personaId y colegioId son requeridos',
      }, { status: 400 })
    }

    const diagnostic: any = {
      timestamp: new Date().toISOString(),
      input: { personaId, colegioId, cargo },
      steps: [],
      errors: [],
    }

    // PASO 1: Verificar que la persona existe
    try {
      console.log('[DEBUG] Verificando persona:', personaId)
      const personaResponse = await strapiClient.get(`/api/personas/${personaId}?fields[0]=id&fields[1]=documentId&fields[2]=nombre_completo`)
      const personaData = Array.isArray(personaResponse.data) ? personaResponse.data[0] : personaResponse.data
      
      diagnostic.steps.push({
        step: 'Verificar persona',
        success: true,
        persona: {
          id: personaData?.id,
          documentId: personaData?.documentId,
          nombre: personaData?.attributes?.nombre_completo || personaData?.nombre_completo,
        },
      })
    } catch (error: any) {
      diagnostic.errors.push({
        step: 'Verificar persona',
        error: error.message,
        status: error.status,
      })
      return NextResponse.json({
        success: false,
        error: 'Persona no encontrada',
        diagnostic,
      }, { status: 404 })
    }

    // PASO 2: Verificar que el colegio existe
    try {
      console.log('[DEBUG] Verificando colegio:', colegioId)
      const colegioResponse = await strapiClient.get(`/api/colegios/${colegioId}?fields[0]=id&fields[1]=documentId&fields[2]=colegio_nombre`)
      const colegioData = Array.isArray(colegioResponse.data) ? colegioResponse.data[0] : colegioResponse.data
      
      diagnostic.steps.push({
        step: 'Verificar colegio',
        success: true,
        colegio: {
          id: colegioData?.id,
          documentId: colegioData?.documentId,
          nombre: colegioData?.attributes?.colegio_nombre || colegioData?.colegio_nombre,
        },
      })
    } catch (error: any) {
      diagnostic.errors.push({
        step: 'Verificar colegio',
        error: error.message,
        status: error.status,
      })
      return NextResponse.json({
        success: false,
        error: 'Colegio no encontrado',
        diagnostic,
      }, { status: 404 })
    }

    // PASO 3: Preparar payload para crear trayectoria
    const personaIdNum = typeof personaId === 'number' ? personaId : parseInt(String(personaId))
    const colegioIdNum = typeof colegioId === 'number' ? colegioId : parseInt(String(colegioId))

    const trayectoriaPayload = {
      data: {
        persona: { connect: [personaIdNum] },
        colegio: { connect: [colegioIdNum] },
        cargo: cargo || null,
        is_current: true,
        activo: true,
      },
    }

    diagnostic.steps.push({
      step: 'Preparar payload',
      payload: trayectoriaPayload,
    })

    // PASO 4: Intentar crear la trayectoria
    try {
      console.log('[DEBUG] Creando trayectoria con payload:', JSON.stringify(trayectoriaPayload, null, 2))
      const trayectoriaResponse = await strapiClient.post('/api/profesores', trayectoriaPayload)
      
      diagnostic.steps.push({
        step: 'Crear trayectoria',
        success: true,
        response: trayectoriaResponse.data,
        estructuraCompleta: JSON.stringify(trayectoriaResponse.data, null, 2),
      })

      // PASO 5: Verificar que se creó correctamente consultándola
      const trayectoriaData = Array.isArray(trayectoriaResponse.data) ? trayectoriaResponse.data[0] : trayectoriaResponse.data
      const trayectoriaId = trayectoriaData?.id || trayectoriaData?.documentId

      if (trayectoriaId) {
        try {
          const verifyResponse = await strapiClient.get(
            `/api/profesores/${trayectoriaId}?populate[persona]=*&populate[colegio]=*&populate[colegio][populate][comuna]=*`
          )
          
          diagnostic.steps.push({
            step: 'Verificar trayectoria creada',
            success: true,
            trayectoriaVerificada: verifyResponse.data,
            estructuraCompleta: JSON.stringify(verifyResponse.data, null, 2),
          })
        } catch (error: any) {
          diagnostic.errors.push({
            step: 'Verificar trayectoria creada',
            error: error.message,
            status: error.status,
          })
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Trayectoria creada exitosamente',
        trayectoriaId,
        diagnostic,
      }, { status: 200 })
    } catch (error: any) {
      diagnostic.errors.push({
        step: 'Crear trayectoria',
        error: error.message,
        status: error.status,
        response: error.response?.data,
        detallesCompletos: JSON.stringify(error.response?.data, null, 2),
      })

      return NextResponse.json({
        success: false,
        error: 'Error al crear trayectoria',
        diagnostic,
      }, { status: error.status || 500 })
    }
  } catch (error: any) {
    console.error('[DEBUG] Error general:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.response?.data,
    }, { status: 500 })
  }
}
