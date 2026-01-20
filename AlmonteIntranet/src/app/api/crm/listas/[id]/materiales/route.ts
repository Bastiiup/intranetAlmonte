/**
 * PUT /api/crm/listas/[id]/materiales
 * Guarda los materiales editados en la versión más reciente del curso
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { materiales } = body

    if (!Array.isArray(materiales)) {
      return NextResponse.json(
        {
          success: false,
          error: 'materiales debe ser un array',
        },
        { status: 400 }
      )
    }

    debugLog('[API /crm/listas/[id]/materiales PUT] Guardando materiales...', {
      id,
      cantidad: materiales.length,
    })

    // 1. Obtener el curso
    let curso: any = null
    try {
      // Intentar con id directo
      try {
        const cursoResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
          `/api/cursos/${id}?publicationState=preview`
        )
        curso = Array.isArray(cursoResponse.data) ? cursoResponse.data[0] : cursoResponse.data
      } catch (idError: any) {
        // Si falla, intentar con documentId
        const searchResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>[]>>(
          `/api/cursos?filters[documentId][$eq]=${id}&publicationState=preview`
        )
        const cursos = Array.isArray(searchResponse.data) ? searchResponse.data : [searchResponse.data]
        if (cursos.length > 0) {
          curso = cursos[0]
        } else {
          throw new Error('Curso no encontrado')
        }
      }
    } catch (error: any) {
      debugLog('[API /crm/listas/[id]/materiales PUT] Error al obtener curso:', error.message)
      return NextResponse.json(
        {
          success: false,
          error: 'Error al obtener curso: ' + error.message,
        },
        { status: 404 }
      )
    }

    if (!curso) {
      return NextResponse.json(
        {
          success: false,
          error: 'Curso no encontrado',
        },
        { status: 404 }
      )
    }

    const attrs = curso.attributes || curso
    const versionesExistentes = attrs.versiones_materiales || []

    if (versionesExistentes.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'El curso no tiene versiones de materiales. Primero debes subir un PDF.',
        },
        { status: 400 }
      )
    }

    // 2. Actualizar la versión más reciente con los materiales
    const versionesActualizadas = [...versionesExistentes]
    const ultimaVersion = versionesActualizadas[versionesActualizadas.length - 1]
    
    versionesActualizadas[versionesActualizadas.length - 1] = {
      ...ultimaVersion,
      materiales,
      fecha_actualizacion: new Date().toISOString(),
    }

    // 3. Actualizar el curso en Strapi
    const cursoId = curso.documentId || curso.id
    const updateData = {
      data: {
        versiones_materiales: versionesActualizadas,
      },
    }

    debugLog('[API /crm/listas/[id]/materiales PUT] Actualizando curso:', {
      cursoId,
      versiones: versionesActualizadas.length,
      materiales: materiales.length,
    })

    try {
      const updateResponse = await strapiClient.put<StrapiResponse<StrapiEntity<any>>>(
        `/api/cursos/${cursoId}`,
        updateData
      )

      debugLog('[API /crm/listas/[id]/materiales PUT] ✅ Materiales guardados exitosamente')

      return NextResponse.json({
        success: true,
        message: `Se guardaron ${materiales.length} materiales correctamente`,
        data: {
          materiales,
          versiones: versionesActualizadas.length,
        },
      })
    } catch (updateError: any) {
      debugLog('[API /crm/listas/[id]/materiales PUT] Error al actualizar:', updateError.message)
      return NextResponse.json(
        {
          success: false,
          error: 'Error al actualizar curso: ' + updateError.message,
          details: updateError.response?.data || updateError.data,
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    debugLog('[API /crm/listas/[id]/materiales PUT] Error general:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al guardar materiales',
      },
      { status: 500 }
    )
  }
}



