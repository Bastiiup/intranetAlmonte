/**
 * API Route para verificar el estado de las importaciones
 * GET /api/crm/colegios/verificar-importacion
 * 
 * Retorna estadísticas sobre:
 * - Total de colegios
 * - Colegios con cursos
 * - Cursos creados
 * - Cursos con cantidad_alumnos
 * - Últimas importaciones
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

const DEBUG = process.env.NODE_ENV === 'development' || process.env.DEBUG_CRM === 'true'
const debugLog = (...args: any[]) => {
  if (DEBUG) {
    console.log(...args)
  }
}

export async function GET(request: NextRequest) {
  try {
    debugLog('[API /crm/colegios/verificar-importacion] 🔍 Iniciando verificación...')

    // Obtener todos los colegios
    const colegiosResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>[]>>(
      '/api/colegios?pagination[pageSize]=10000&publicationState=preview'
    )
    const colegios = Array.isArray(colegiosResponse.data) ? colegiosResponse.data : []

    // Obtener todos los cursos
    const cursosResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>[]>>(
      '/api/cursos?pagination[pageSize]=10000&publicationState=preview&populate[colegio]=true'
    )
    const cursos = Array.isArray(cursosResponse.data) ? cursosResponse.data : []

    // Calcular estadísticas
    const totalColegios = colegios.length
    const totalCursos = cursos.length
    
    // Colegios con cursos
    const colegiosConCursos = new Set<number>()
    cursos.forEach((curso: any) => {
      const attrs = curso.attributes || curso
      const colegioId = attrs.colegio?.data?.id || attrs.colegio?.id || attrs.colegio
      if (colegioId) {
        colegiosConCursos.add(colegioId)
      }
    })

    // Cursos con cantidad_alumnos
    const cursosConAlumnos = cursos.filter((curso: any) => {
      const attrs = curso.attributes || curso
      const cantidadAlumnos = attrs.cantidad_alumnos
      return cantidadAlumnos !== null && cantidadAlumnos !== undefined && cantidadAlumnos > 0
    })

    // Agrupar cursos por colegio
    const cursosPorColegio = new Map<number, number>()
    const cursosConAlumnosPorColegio = new Map<number, number>()
    
    cursos.forEach((curso: any) => {
      const attrs = curso.attributes || curso
      const colegioId = attrs.colegio?.data?.id || attrs.colegio?.id || attrs.colegio
      if (colegioId) {
        cursosPorColegio.set(colegioId, (cursosPorColegio.get(colegioId) || 0) + 1)
        
        const cantidadAlumnos = attrs.cantidad_alumnos
        if (cantidadAlumnos !== null && cantidadAlumnos !== undefined && cantidadAlumnos > 0) {
          cursosConAlumnosPorColegio.set(colegioId, (cursosConAlumnosPorColegio.get(colegioId) || 0) + 1)
        }
      }
    })

    // Últimos cursos creados/actualizados (últimos 20)
    const cursosRecientes = cursos
      .sort((a: any, b: any) => {
        const aUpdated = new Date((a.attributes || a).updatedAt || 0).getTime()
        const bUpdated = new Date((b.attributes || b).updatedAt || 0).getTime()
        return bUpdated - aUpdated
      })
      .slice(0, 20)
      .map((curso: any) => {
        const attrs = curso.attributes || curso
        return {
          id: curso.id || curso.documentId,
          nombre: attrs.nombre_curso || 'Sin nombre',
          colegio: attrs.colegio?.data?.attributes?.colegio_nombre || 'Sin colegio',
          cantidad_alumnos: attrs.cantidad_alumnos || null,
          nivel: attrs.nivel,
          grado: attrs.grado,
          updatedAt: attrs.updatedAt,
        }
      })

    // Colegios recientes (últimos 10)
    const colegiosRecientes = colegios
      .sort((a: any, b: any) => {
        const aCreated = new Date((a.attributes || a).createdAt || 0).getTime()
        const bCreated = new Date((b.attributes || b).createdAt || 0).getTime()
        return bCreated - aCreated
      })
      .slice(0, 10)
      .map((colegio: any) => {
        const attrs = colegio.attributes || colegio
        const colegioId = colegio.id || colegio.documentId
        return {
          id: colegioId,
          nombre: attrs.colegio_nombre || 'Sin nombre',
          rbd: attrs.rbd,
          totalCursos: cursosPorColegio.get(colegioId) || 0,
          cursosConAlumnos: cursosConAlumnosPorColegio.get(colegioId) || 0,
          createdAt: attrs.createdAt,
        }
      })

    const estadisticas = {
      totalColegios,
      totalCursos,
      colegiosConCursos: colegiosConCursos.size,
      cursosConAlumnos: cursosConAlumnos.length,
      porcentajeCursosConAlumnos: totalCursos > 0 ? ((cursosConAlumnos.length / totalCursos) * 100).toFixed(1) : '0',
      cursosPorColegio: Array.from(cursosPorColegio.entries()).map(([id, count]) => ({
        colegioId: id,
        totalCursos: count,
        cursosConAlumnos: cursosConAlumnosPorColegio.get(id) || 0,
      })),
      cursosRecientes,
      colegiosRecientes,
    }

    debugLog('[API /crm/colegios/verificar-importacion] ✅ Verificación completada:', estadisticas)

    return NextResponse.json({
      success: true,
      data: estadisticas,
    })
  } catch (error: any) {
    debugLog('[API /crm/colegios/verificar-importacion] ❌ Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al verificar importación',
      },
      { status: 500 }
    )
  }
}
