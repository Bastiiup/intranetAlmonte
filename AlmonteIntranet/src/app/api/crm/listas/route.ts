/**
 * API Route para obtener cursos que tienen PDFs (listas de útiles)
 * GET /api/crm/listas
 * 
 * Las "listas" son cursos que tienen versiones de materiales (PDFs) subidos
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

/**
 * GET /api/crm/listas
 * Obtiene todos los cursos que tienen al menos una versión de materiales (PDF) subida
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const colegioId = searchParams.get('colegioId')
    const nivel = searchParams.get('nivel')
    const grado = searchParams.get('grado')
    const año = searchParams.get('año') || searchParams.get('ano')

    debugLog('[API /crm/listas GET] Obteniendo cursos con PDFs...')

    // Construir filtros
    const filters: string[] = []
    
    // Filtrar solo cursos que tienen versiones_materiales (PDFs)
    // En Strapi, necesitamos obtener todos los cursos y filtrar en el código
    // porque no hay un filtro directo para "tiene versiones_materiales"
    
    if (colegioId) {
      filters.push(`filters[colegio][id][$eq]=${colegioId}`)
    }
    if (nivel) {
      filters.push(`filters[nivel][$eq]=${encodeURIComponent(nivel)}`)
    }
    if (grado) {
      filters.push(`filters[grado][$eq]=${grado}`)
    }
    if (año) {
      filters.push(`filters[año][$eq]=${año}`)
    }

    // Populate y fields necesarios
    filters.push('populate[colegio][fields][0]=colegio_nombre')
    filters.push('populate[colegio][fields][1]=rbd')
    filters.push('fields[0]=nombre_curso')
    filters.push('fields[1]=nivel')
    filters.push('fields[2]=grado')
    filters.push('fields[3]=año')
    filters.push('fields[4]=paralelo')
    filters.push('fields[5]=versiones_materiales') // Campo JSON, no relación
    filters.push('fields[6]=activo')
    filters.push('publicationState=preview')

    const queryString = filters.length > 0 ? `?${filters.join('&')}` : '?populate[colegio]=true&fields[0]=versiones_materiales&publicationState=preview'

    debugLog('[API /crm/listas GET] Query:', queryString)

    const response = await strapiClient.get<StrapiResponse<StrapiEntity<any>[]>>(
      `/api/cursos${queryString}`
    )

    const cursos = Array.isArray(response.data) ? response.data : [response.data]

    // Filtrar solo los cursos que tienen al menos una versión de materiales (PDF)
    const cursosConPDFs = cursos.filter((curso: any) => {
      const attrs = curso.attributes || curso
      const versiones = attrs.versiones_materiales || []
      return Array.isArray(versiones) && versiones.length > 0
    })

    debugLog('[API /crm/listas GET] ✅ Cursos con PDFs encontrados:', cursosConPDFs.length)

    // Transformar a formato de "lista" para el frontend
    const listas = cursosConPDFs.map((curso: any) => {
      const attrs = curso.attributes || curso
      const versiones = attrs.versiones_materiales || []
      const ultimaVersion = versiones.length > 0 
        ? versiones.sort((a: any, b: any) => {
            const fechaA = new Date(a.fecha_actualizacion || a.fecha_subida || 0).getTime()
            const fechaB = new Date(b.fecha_actualizacion || b.fecha_subida || 0).getTime()
            return fechaB - fechaA
          })[0]
        : null

      const colegioData = attrs.colegio?.data || attrs.colegio
      const colegioAttrs = colegioData?.attributes || colegioData

      return {
        id: curso.id || curso.documentId,
        documentId: curso.documentId || String(curso.id || ''),
        nombre: attrs.nombre_curso || attrs.curso_nombre || 'Sin nombre',
        nivel: attrs.nivel || 'Basica',
        grado: parseInt(attrs.grado) || 1,
        año: attrs.año || attrs.ano || new Date().getFullYear(),
        descripcion: `Curso: ${attrs.nombre_curso || ''}`,
        activo: attrs.activo !== false,
        pdf_id: ultimaVersion?.pdf_id || null,
        pdf_nombre: ultimaVersion?.nombre_archivo || ultimaVersion?.metadata?.nombre || null,
        colegio: colegioData ? {
          id: colegioData.id || colegioData.documentId,
          nombre: colegioAttrs?.colegio_nombre || '',
        } : null,
        curso: {
          id: curso.id || curso.documentId,
          nombre: attrs.nombre_curso || attrs.curso_nombre || '',
        },
        versiones: versiones.length,
      }
    })

    return NextResponse.json({
      success: true,
      data: listas,
      count: listas.length,
    }, { status: 200 })
  } catch (error: any) {
    debugLog('[API /crm/listas GET] ❌ Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener listas',
      },
      { status: 500 }
    )
  }
}
