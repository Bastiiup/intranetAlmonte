/**
 * API Route para duplicar una lista (curso)
 * POST /api/crm/listas/[id]/duplicar
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
 * POST /api/crm/listas/[id]/duplicar
 * Duplica un curso (lista) con opciones configurables
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID de lista es requerido',
        },
        { status: 400 }
      )
    }

    debugLog('[API /crm/listas/[id]/duplicar] Duplicando curso:', id)
    console.log('[API /crm/listas/[id]/duplicar] ID recibido:', id)
    console.log('[API /crm/listas/[id]/duplicar] Opciones:', body)

    // Opciones de duplicación
    const {
      nuevoNombre,
      nuevoAño,
      nuevoColegioId,
      copiarMateriales = true,
      copiarPDF = false,
    } = body

    // Buscar el curso original
    let curso: any = null
    let cursoIdParaBuscar: string | number | null = null

    // Intentar buscar por documentId primero
    try {
      const paramsDocId = new URLSearchParams({
        'filters[documentId][$eq]': String(id),
        'publicationState': 'preview',
        'populate[colegio]': 'true',
        'populate[versiones_materiales]': 'true',
      })
      const cursoResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>[]>>(
        `/api/cursos?${paramsDocId.toString()}`
      )

      if (cursoResponse.data && Array.isArray(cursoResponse.data) && cursoResponse.data.length > 0) {
        curso = cursoResponse.data[0]
        cursoIdParaBuscar = curso.documentId || curso.id
      } else if (cursoResponse.data && !Array.isArray(cursoResponse.data)) {
        curso = cursoResponse.data
        cursoIdParaBuscar = curso.documentId || curso.id
      }
    } catch (docIdError: any) {
      console.error('[API /crm/listas/[id]/duplicar] ⚠️ Error al buscar por documentId:', docIdError.message)
    }

    // Si no se encontró, intentar con id numérico
    if (!curso) {
      const isNumeric = /^\d+$/.test(String(id))
      if (isNumeric) {
        try {
          const cursoResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
            `/api/cursos/${id}?publicationState=preview&populate[colegio]=true&populate[versiones_materiales]=true`
          )

          if (cursoResponse.data) {
            curso = Array.isArray(cursoResponse.data) ? cursoResponse.data[0] : cursoResponse.data
            cursoIdParaBuscar = curso.documentId || curso.id
          }
        } catch (idError: any) {
          console.error('[API /crm/listas/[id]/duplicar] ⚠️ Error al buscar por id numérico:', idError.message)
        }
      }
    }

    if (!curso) {
      return NextResponse.json(
        {
          success: false,
          error: 'Curso no encontrado',
          details: `No se pudo encontrar el curso con ID: ${id}`,
        },
        { status: 404 }
      )
    }

    const attrs = curso.attributes || curso
    const colegioData = attrs.colegio?.data || attrs.colegio
    const colegioIdOriginal = colegioData?.id || colegioData?.documentId

    // Determinar valores para el nuevo curso
    const nombreCurso = nuevoNombre || attrs.nombre_curso || attrs.curso_nombre || 'Curso sin nombre'
    const año = nuevoAño || attrs.año || attrs.ano || new Date().getFullYear()
    const colegioIdFinal = nuevoColegioId || colegioIdOriginal

    // Obtener ID numérico del colegio si es necesario
    let colegioIdNum: number | null = null
    if (typeof colegioIdFinal === 'string' && !/^\d+$/.test(String(colegioIdFinal))) {
      try {
        const colegioResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
          `/api/colegios/${colegioIdFinal}?fields=id,documentId&publicationState=preview`
        )
        const colegioData = Array.isArray(colegioResponse.data) ? colegioResponse.data[0] : colegioResponse.data
        colegioIdNum = colegioData?.id || null
      } catch (error: any) {
        console.error('[API /crm/listas/[id]/duplicar] ⚠️ Error obteniendo ID del colegio:', error)
        return NextResponse.json(
          {
            success: false,
            error: 'No se pudo obtener el ID del colegio',
            details: error.message,
          },
          { status: 400 }
        )
      }
    } else {
      colegioIdNum = typeof colegioIdFinal === 'number' ? colegioIdFinal : parseInt(String(colegioIdFinal))
    }

    if (!colegioIdNum) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID de colegio inválido',
        },
        { status: 400 }
      )
    }

    // Preparar datos del nuevo curso
    const nuevoCursoData: any = {
      data: {
        nombre_curso: nombreCurso,
        colegio: { connect: [colegioIdNum] },
        nivel: attrs.nivel || 'Basica',
        grado: String(attrs.grado || '1'),
        año: año,
        activo: true, // Por defecto activo
      },
    }

    // Copiar materiales si se solicita
    if (copiarMateriales && attrs.versiones_materiales && Array.isArray(attrs.versiones_materiales) && attrs.versiones_materiales.length > 0) {
      // Obtener la última versión
      const ultimaVersion = attrs.versiones_materiales.sort((a: any, b: any) => {
        const fechaA = new Date(a.fecha_actualizacion || a.fecha_subida || 0).getTime()
        const fechaB = new Date(b.fecha_actualizacion || b.fecha_subida || 0).getTime()
        return fechaB - fechaA
      })[0]

      if (ultimaVersion && ultimaVersion.materiales) {
        const versionMaterial = {
          id: `version-${Date.now()}-${Math.random()}`,
          fecha_subida: new Date().toISOString(),
          fecha_actualizacion: new Date().toISOString(),
          nombre_archivo: ultimaVersion.nombre_archivo || `Lista_${nombreCurso}_${año}`,
          pdf_id: copiarPDF ? ultimaVersion.pdf_id : null,
          materiales: ultimaVersion.materiales.map((m: any) => ({
            ...m,
            // Limpiar IDs si existen
            id: undefined,
          })),
          procesado_con_ia: ultimaVersion.procesado_con_ia || false,
        }

        nuevoCursoData.data.versiones_materiales = [versionMaterial]
      }
    } else {
      // Si no se copian materiales, crear versión vacía
      nuevoCursoData.data.versiones_materiales = []
    }

    // Crear el nuevo curso
    console.log('[API /crm/listas/[id]/duplicar] Creando curso duplicado:', {
      nombre: nombreCurso,
      año,
      colegioId: colegioIdNum,
      copiarMateriales,
      copiarPDF,
    })

    const cursoResponse = await strapiClient.post<StrapiResponse<StrapiEntity<any>>>(
      '/api/cursos',
      nuevoCursoData
    )

    const cursoCreado = Array.isArray(cursoResponse.data)
      ? cursoResponse.data[0]
      : cursoResponse.data

    const nuevoCursoId = cursoCreado?.id || cursoCreado?.documentId

    debugLog('[API /crm/listas/[id]/duplicar] ✅ Curso duplicado exitosamente:', nuevoCursoId)
    console.log('[API /crm/listas/[id]/duplicar] ✅ Curso duplicado:', nuevoCursoId)

    return NextResponse.json({
      success: true,
      message: 'Curso duplicado exitosamente',
      data: {
        id: nuevoCursoId,
        documentId: cursoCreado?.documentId,
        nombre: nombreCurso,
        año,
      },
    }, { status: 200 })
  } catch (error: any) {
    debugLog('[API /crm/listas/[id]/duplicar] ❌ Error:', error)
    console.error('[API /crm/listas/[id]/duplicar] ❌ Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al duplicar el curso',
        details: error.response?.data || error.data,
      },
      { status: error.status || 500 }
    )
  }
}
