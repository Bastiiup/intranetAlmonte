/**
 * API Route de DEBUG para ver TODOS los cursos sin filtrar
 * GET /api/crm/listas/debug-all
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/crm/listas/debug-all
 * Obtiene TODOS los cursos sin filtrar (para debug)
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[API /crm/listas/debug-all GET] 🔍 Obteniendo TODOS los cursos...')

    // Construir query básica
    const filters: string[] = []
    
    // Populate y fields necesarios
    filters.push('populate[colegio][fields][0]=colegio_nombre')
    filters.push('populate[colegio][fields][1]=rbd')
    filters.push('fields[0]=nombre_curso')
    filters.push('fields[1]=nivel')
    filters.push('fields[2]=grado')
    filters.push('fields[3]=anio')
    filters.push('fields[4]=versiones_materiales')
    filters.push('fields[5]=activo')
    filters.push('publicationState=preview')
    
    // Obtener TODOS los resultados (sin filtrar por PDF)
    filters.push('pagination[pageSize]=1000') // Aumentar el límite para ver más cursos

    const queryString = `?${filters.join('&')}`
    const cacheBuster = `&_t=${Date.now()}`
    const finalQuery = `${queryString}${cacheBuster}`

    console.log('[API /crm/listas/debug-all GET] Query:', finalQuery)

    const response = await strapiClient.get<StrapiResponse<StrapiEntity<any>[]>>(
      `/api/cursos${finalQuery}`
    )

    if (!response || !response.data) {
      console.log('[API /crm/listas/debug-all GET] ⚠️ Respuesta vacía de Strapi')
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
      }, { status: 200 })
    }

    const cursos = Array.isArray(response.data) ? response.data : [response.data]
    
    console.log('[API /crm/listas/debug-all GET] ✅ Total de cursos obtenidos:', cursos.length)
    
    // Contar cuántos tienen versiones_materiales
    const cursosConVersiones = cursos.filter((c: any) => {
      const attrs = c.attributes || c
      const versiones = attrs.versiones_materiales || []
      return Array.isArray(versiones) && versiones.length > 0
    })
    
    console.log('[API /crm/listas/debug-all GET] 📊 Cursos con versiones_materiales:', cursosConVersiones.length)
    console.log('[API /crm/listas/debug-all GET] 📊 Cursos SIN versiones_materiales:', cursos.length - cursosConVersiones.length)

    // Devolver TODOS los cursos con información completa
    return NextResponse.json({
      success: true,
      data: cursos,
      count: cursos.length,
      stats: {
        total: cursos.length,
        conVersiones: cursosConVersiones.length,
        sinVersiones: cursos.length - cursosConVersiones.length,
      },
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/listas/debug-all GET] ❌ Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener cursos',
      },
      { status: 500 }
    )
  }
}
