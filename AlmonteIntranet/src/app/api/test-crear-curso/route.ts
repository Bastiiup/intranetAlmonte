/**
 * API Route de prueba para crear un curso en Strapi
 * GET /api/test-crear-curso
 * 
 * Este endpoint prueba la creación de un curso con diferentes configuraciones
 * para identificar qué campos son aceptados por Strapi
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const colegioId = searchParams.get('colegioId') || '122752' // ID del colegio de prueba (Abraham Lincoln)
    
    console.log('[TEST] 🧪 Iniciando prueba de creación de curso...')
    console.log('[TEST] Colegio ID:', colegioId)
    
    // Obtener el ID numérico del colegio si es documentId
    const isDocumentId = typeof colegioId === 'string' && !/^\d+$/.test(colegioId)
    let colegioIdNum: number | null = null

    if (isDocumentId) {
      try {
        const colegioResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
          `/api/colegios/${colegioId}?fields=id&publicationState=preview`
        )
        const colegioData = Array.isArray(colegioResponse.data) ? colegioResponse.data[0] : colegioResponse.data
        const colegioAttrs = colegioData?.attributes || colegioData
        
        if (colegioData && colegioAttrs) {
          colegioIdNum = colegioData.id || colegioAttrs.id || null
          console.log('[TEST] ID numérico del colegio:', colegioIdNum)
        }
      } catch (error: any) {
        console.error('[TEST] ❌ Error obteniendo ID del colegio:', error)
        return NextResponse.json({
          success: false,
          error: `Colegio no encontrado: ${error.message}`,
          pruebas: [],
        }, { status: 404 })
      }
    } else {
      colegioIdNum = parseInt(String(colegioId))
      if (isNaN(colegioIdNum)) {
        return NextResponse.json({
          success: false,
          error: 'ID de colegio inválido',
          pruebas: [],
        }, { status: 400 })
      }
    }

    if (!colegioIdNum) {
      return NextResponse.json({
        success: false,
        error: 'No se pudo determinar el ID del colegio',
        pruebas: [],
      }, { status: 400 })
    }

    const resultados: any[] = []

    // PRUEBA 1: Crear curso SIN campo año
    console.log('[TEST] 📝 Prueba 1: Crear curso SIN campo año')
    try {
      const cursoData1: any = {
        data: {
          nombre_curso: `TEST Curso Sin Año ${Date.now()}`,
          colegio: { connect: [colegioIdNum] },
          nivel: 'Basica',
          grado: '1',
          activo: true,
        },
      }

      console.log('[TEST] Payload Prueba 1:', JSON.stringify(cursoData1, null, 2))
      
      const response1 = await strapiClient.post<StrapiResponse<StrapiEntity<any>>>(
        '/api/cursos',
        cursoData1
      )

      const cursoCreado1 = Array.isArray(response1.data) ? response1.data[0] : response1.data
      resultados.push({
        prueba: 'Sin campo año',
        success: true,
        cursoId: cursoCreado1?.id,
        documentId: cursoCreado1?.documentId,
        data: cursoCreado1,
      })
      console.log('[TEST] ✅ Prueba 1 exitosa:', cursoCreado1?.id, cursoCreado1?.documentId)
    } catch (error: any) {
      resultados.push({
        prueba: 'Sin campo año',
        success: false,
        error: error.message,
        details: error.details || error.response || {},
      })
      console.error('[TEST] ❌ Prueba 1 falló:', error.message)
    }

    // PRUEBA 2: Crear curso CON campo "año" (con acento)
    console.log('[TEST] 📝 Prueba 2: Crear curso CON campo "año" (con acento)')
    try {
      const cursoData2: any = {
        data: {
          nombre_curso: `TEST Curso Con Año ${Date.now()}`,
          colegio: { connect: [colegioIdNum] },
          nivel: 'Basica',
          grado: '2',
          año: 2026,
          activo: true,
        },
      }

      console.log('[TEST] Payload Prueba 2:', JSON.stringify(cursoData2, null, 2))
      
      const response2 = await strapiClient.post<StrapiResponse<StrapiEntity<any>>>(
        '/api/cursos',
        cursoData2
      )

      const cursoCreado2 = Array.isArray(response2.data) ? response2.data[0] : response2.data
      resultados.push({
        prueba: 'Con campo "año" (con acento)',
        success: true,
        cursoId: cursoCreado2?.id,
        documentId: cursoCreado2?.documentId,
        data: cursoCreado2,
      })
      console.log('[TEST] ✅ Prueba 2 exitosa:', cursoCreado2?.id, cursoCreado2?.documentId)
    } catch (error: any) {
      resultados.push({
        prueba: 'Con campo "año" (con acento)',
        success: false,
        error: error.message,
        details: error.details || error.response || {},
      })
      console.error('[TEST] ❌ Prueba 2 falló:', error.message)
    }

    // PRUEBA 3: Crear curso CON campo "ano" (sin acento)
    console.log('[TEST] 📝 Prueba 3: Crear curso CON campo "ano" (sin acento)')
    try {
      const cursoData3: any = {
        data: {
          nombre_curso: `TEST Curso Con Ano ${Date.now()}`,
          colegio: { connect: [colegioIdNum] },
          nivel: 'Basica',
          grado: '3',
          ano: 2026,
          activo: true,
        },
      }

      console.log('[TEST] Payload Prueba 3:', JSON.stringify(cursoData3, null, 2))
      
      const response3 = await strapiClient.post<StrapiResponse<StrapiEntity<any>>>(
        '/api/cursos',
        cursoData3
      )

      const cursoCreado3 = Array.isArray(response3.data) ? response3.data[0] : response3.data
      resultados.push({
        prueba: 'Con campo "ano" (sin acento)',
        success: true,
        cursoId: cursoCreado3?.id,
        documentId: cursoCreado3?.documentId,
        data: cursoCreado3,
      })
      console.log('[TEST] ✅ Prueba 3 exitosa:', cursoCreado3?.id, cursoCreado3?.documentId)
    } catch (error: any) {
      resultados.push({
        prueba: 'Con campo "ano" (sin acento)',
        success: false,
        error: error.message,
        details: error.details || error.response || {},
      })
      console.error('[TEST] ❌ Prueba 3 falló:', error.message)
    }

    // PRUEBA 4: Verificar cursos creados
    console.log('[TEST] 📝 Prueba 4: Verificar cursos creados')
    try {
      const cursosResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>[]>>(
        `/api/cursos?filters[colegio][id][$eq]=${colegioIdNum}&publicationState=preview&pagination[limit]=10`
      )
      
      const cursos = Array.isArray(cursosResponse.data) ? cursosResponse.data : []
      const cursosTest = cursos.filter((c: any) => {
        const attrs = c.attributes || c
        return attrs.nombre_curso?.includes('TEST')
      })

      resultados.push({
        prueba: 'Verificar cursos creados',
        success: true,
        totalCursos: cursos.length,
        cursosTest: cursosTest.length,
        cursos: cursosTest.map((c: any) => {
          const attrs = c.attributes || c
          return {
            id: c.id,
            documentId: c.documentId,
            nombre: attrs.nombre_curso,
            nivel: attrs.nivel,
            grado: attrs.grado,
            año: attrs.año || attrs.ano || 'No tiene',
          }
        }),
      })
      console.log('[TEST] ✅ Prueba 4 exitosa:', cursosTest.length, 'cursos de prueba encontrados')
    } catch (error: any) {
      resultados.push({
        prueba: 'Verificar cursos creados',
        success: false,
        error: error.message,
        details: error.details || error.response || {},
      })
      console.error('[TEST] ❌ Prueba 4 falló:', error.message)
    }

    return NextResponse.json({
      success: true,
      colegioId: colegioIdNum,
      resultados: resultados,
      resumen: {
        exitosas: resultados.filter(r => r.success).length,
        fallidas: resultados.filter(r => !r.success).length,
      },
    }, { status: 200 })

  } catch (error: any) {
    console.error('[TEST] ❌ Error general:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Error desconocido',
      stack: error.stack,
    }, { status: 500 })
  }
}
