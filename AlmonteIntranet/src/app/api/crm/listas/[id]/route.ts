/**
 * API Route para obtener una lista específica con todos sus datos
 * GET /api/crm/listas/[id]
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
 * GET /api/crm/listas/[id]
 * Obtiene una lista específica con todos sus datos del curso
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID de lista es requerido',
        },
        { status: 400 }
      )
    }

    debugLog('[API /crm/listas/[id] GET] Obteniendo lista:', id)
    console.log('[API /crm/listas/[id] GET] ID recibido:', id, 'Tipo:', typeof id)

    // Intentar obtener el curso por documentId o id numérico
    let curso: any = null
    let cursoResponse: any = null
    let errorMessages: string[] = []

    // Primero intentar con documentId (puede ser string alfanumérico)
    try {
      console.log('[API /crm/listas/[id] GET] Intentando buscar por documentId:', id)
      const paramsDocId = new URLSearchParams({
        'filters[documentId][$eq]': String(id),
        'publicationState': 'preview',
        'populate[colegio]': 'true',
      })
      cursoResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>[]>>(
        `/api/cursos?${paramsDocId.toString()}`
      )
      
      console.log('[API /crm/listas/[id] GET] Respuesta por documentId:', {
        hasData: !!cursoResponse.data,
        isArray: Array.isArray(cursoResponse.data),
        length: Array.isArray(cursoResponse.data) ? cursoResponse.data.length : (cursoResponse.data ? 1 : 0)
      })
      
      if (cursoResponse.data && Array.isArray(cursoResponse.data) && cursoResponse.data.length > 0) {
        curso = cursoResponse.data[0]
        console.log('[API /crm/listas/[id] GET] ✅ Curso encontrado por documentId:', curso.id || curso.documentId)
        debugLog('[API /crm/listas/[id] GET] ✅ Curso encontrado por documentId')
      } else if (cursoResponse.data && !Array.isArray(cursoResponse.data)) {
        curso = cursoResponse.data
        console.log('[API /crm/listas/[id] GET] ✅ Curso encontrado por documentId (no array)')
        debugLog('[API /crm/listas/[id] GET] ✅ Curso encontrado por documentId (no array)')
      } else {
        errorMessages.push('No se encontró curso con documentId: ' + id)
      }
    } catch (docIdError: any) {
      const errorMsg = `Error al buscar por documentId: ${docIdError.message || docIdError}`
      errorMessages.push(errorMsg)
      console.error('[API /crm/listas/[id] GET] ⚠️', errorMsg)
      debugLog('[API /crm/listas/[id] GET] ⚠️', errorMsg)
    }

    // Si no se encontró con documentId, intentar con id numérico
    if (!curso) {
      const isNumeric = /^\d+$/.test(String(id))
      console.log('[API /crm/listas/[id] GET] ID es numérico?', isNumeric)
      
      if (isNumeric) {
        try {
          console.log('[API /crm/listas/[id] GET] Intentando buscar por id numérico:', id)
          cursoResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
            `/api/cursos/${id}?publicationState=preview&populate[colegio]=true`
          )
          
          console.log('[API /crm/listas/[id] GET] Respuesta por id numérico:', {
            hasData: !!cursoResponse.data,
            isArray: Array.isArray(cursoResponse.data)
          })
          
          if (cursoResponse.data) {
            curso = Array.isArray(cursoResponse.data) ? cursoResponse.data[0] : cursoResponse.data
            console.log('[API /crm/listas/[id] GET] ✅ Curso encontrado por id numérico:', curso.id || curso.documentId)
            debugLog('[API /crm/listas/[id] GET] ✅ Curso encontrado por id numérico')
          } else {
            errorMessages.push('No se encontró curso con id numérico: ' + id)
          }
        } catch (idError: any) {
          const errorMsg = `Error al buscar por id numérico: ${idError.message || idError}`
          errorMessages.push(errorMsg)
          console.error('[API /crm/listas/[id] GET] ⚠️', errorMsg)
          debugLog('[API /crm/listas/[id] GET] ⚠️', errorMsg)
        }
      }
    }

    if (!curso) {
      console.error('[API /crm/listas/[id] GET] ❌ Curso no encontrado. ID buscado:', id)
      console.error('[API /crm/listas/[id] GET] Errores:', errorMessages)
      return NextResponse.json(
        {
          success: false,
          error: 'Lista no encontrada',
          details: `No se pudo encontrar el curso con ID: ${id}`,
          errors: errorMessages,
        },
        { status: 404 }
      )
    }

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

    const nombreCurso = attrs.nombre_curso || attrs.curso_nombre || 'Sin nombre'
    const paralelo = attrs.paralelo ? ` ${attrs.paralelo}` : ''
    const nombreCompleto = `${nombreCurso}${paralelo}`

    const lista = {
      id: curso.id || curso.documentId,
      documentId: curso.documentId || String(curso.id || ''),
      nombre: nombreCompleto,
      nivel: attrs.nivel || 'Basica',
      grado: parseInt(attrs.grado) || 1,
      paralelo: attrs.paralelo || '',
      año: attrs.anio || attrs.año || attrs.ano || new Date().getFullYear(),
      descripcion: `Curso: ${nombreCompleto}`,
      activo: attrs.activo !== false,
      pdf_id: ultimaVersion?.pdf_id || null,
      pdf_url: ultimaVersion?.pdf_url || null,
      pdf_nombre: ultimaVersion?.nombre_archivo || ultimaVersion?.metadata?.nombre || null,
      colegio: colegioData ? {
        id: colegioData.id || colegioData.documentId,
        nombre: colegioAttrs?.colegio_nombre || '',
      } : null,
      curso: {
        id: curso.id || curso.documentId,
        nombre: nombreCompleto,
      },
      versiones: versiones,
      versiones_materiales: versiones,
      materiales: ultimaVersion?.materiales || [],
    }

    return NextResponse.json({
      success: true,
      data: lista,
    }, { status: 200 })
  } catch (error: any) {
    debugLog('[API /crm/listas/[id] GET] ❌ Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener la lista',
      },
      { status: 500 }
    )
  }
}
