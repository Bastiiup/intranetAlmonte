/**
 * API Route para actualizaciones masivas de listas
 * PATCH /api/crm/listas/bulk-update
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
 * PATCH /api/crm/listas/bulk-update
 * Actualiza múltiples cursos/listas de forma masiva
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { ids, updates } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Se requiere un array de IDs',
        },
        { status: 400 }
      )
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: 'Se requiere un objeto de actualizaciones',
        },
        { status: 400 }
      )
    }

    debugLog('[API /crm/listas/bulk-update] Actualizando cursos:', { ids, updates })
    console.log('[API /crm/listas/bulk-update] IDs:', ids.length, 'Actualizaciones:', updates)

    const results: Array<{ id: string | number; success: boolean; error?: string }> = []

    // Procesar cada ID
    for (const id of ids) {
      try {
        // Buscar el curso por documentId o id numérico
        let curso: any = null
        let cursoIdParaActualizar: string | number | null = null

        // Intentar buscar por documentId
        try {
          const paramsDocId = new URLSearchParams({
            'filters[documentId][$eq]': String(id),
            'publicationState': 'preview',
          })
          const cursoResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>[]>>(
            `/api/cursos?${paramsDocId.toString()}`
          )

          if (cursoResponse.data && Array.isArray(cursoResponse.data) && cursoResponse.data.length > 0) {
            curso = cursoResponse.data[0]
            cursoIdParaActualizar = curso.documentId || curso.id
          } else if (cursoResponse.data && !Array.isArray(cursoResponse.data)) {
            curso = cursoResponse.data
            cursoIdParaActualizar = curso.documentId || curso.id
          }
        } catch (docIdError: any) {
          console.error('[API /crm/listas/bulk-update] ⚠️ Error al buscar por documentId:', docIdError.message)
        }

        // Si no se encontró, intentar con id numérico
        if (!curso) {
          const isNumeric = /^\d+$/.test(String(id))
          if (isNumeric) {
            try {
              const cursoResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
                `/api/cursos/${id}?publicationState=preview`
              )

              if (cursoResponse.data) {
                curso = Array.isArray(cursoResponse.data) ? cursoResponse.data[0] : cursoResponse.data
                cursoIdParaActualizar = curso.documentId || curso.id
              }
            } catch (idError: any) {
              console.error('[API /crm/listas/bulk-update] ⚠️ Error al buscar por id numérico:', idError.message)
            }
          }
        }

        if (!curso || !cursoIdParaActualizar) {
          results.push({ id, success: false, error: 'Curso no encontrado' })
          continue
        }

        // Preparar datos de actualización
        const updateData: any = {
          data: {},
        }

        // Actualizar activo/inactivo
        if (updates.activo !== undefined) {
          updateData.data.activo = updates.activo
        }

        // Actualizar colegio
        if (updates.colegioId) {
          // Obtener ID numérico del colegio
          let colegioIdNum: number | null = null
          if (typeof updates.colegioId === 'string' && !/^\d+$/.test(String(updates.colegioId))) {
            try {
              const colegioResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
                `/api/colegios/${updates.colegioId}?fields=id,documentId&publicationState=preview`
              )
              const colegioData = Array.isArray(colegioResponse.data) ? colegioResponse.data[0] : colegioResponse.data
              colegioIdNum = colegioData?.id || null
            } catch (error: any) {
              console.error('[API /crm/listas/bulk-update] ⚠️ Error obteniendo ID del colegio:', error)
              results.push({ id, success: false, error: 'No se pudo obtener el ID del colegio' })
              continue
            }
          } else {
            colegioIdNum = typeof updates.colegioId === 'number' ? updates.colegioId : parseInt(String(updates.colegioId))
          }

          if (colegioIdNum) {
            updateData.data.colegio = { connect: [colegioIdNum] }
          } else {
            results.push({ id, success: false, error: 'ID de colegio inválido' })
            continue
          }
        }

        // Actualizar año
        if (updates.año !== undefined) {
          updateData.data.año = updates.año
        }


        // Si no hay nada que actualizar, saltar
        if (Object.keys(updateData.data).length === 0) {
          results.push({ id, success: true })
          continue
        }

        // Actualizar el curso
        const deleteId = curso.documentId || curso.id || cursoIdParaActualizar
        await strapiClient.put<StrapiResponse<StrapiEntity<any>>>(
          `/api/cursos/${deleteId}`,
          updateData
        )

        results.push({ id, success: true })
        console.log(`[API /crm/listas/bulk-update] ✅ Curso ${id} actualizado`)
      } catch (error: any) {
        console.error(`[API /crm/listas/bulk-update] ❌ Error actualizando curso ${id}:`, error)
        results.push({
          id,
          success: false,
          error: error.message || 'Error desconocido',
        })
      }
    }

    const successful = results.filter((r) => r.success)
    const failed = results.filter((r) => !r.success)

    debugLog('[API /crm/listas/bulk-update] Resultados:', {
      total: results.length,
      successful: successful.length,
      failed: failed.length,
    })

    return NextResponse.json({
      success: true,
      message: `${successful.length} curso(s) actualizado(s) exitosamente`,
      data: {
        total: results.length,
        successful: successful.length,
        failed: failed.length,
        results,
      },
    }, { status: 200 })
  } catch (error: any) {
    debugLog('[API /crm/listas/bulk-update] ❌ Error:', error)
    console.error('[API /crm/listas/bulk-update] ❌ Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al actualizar cursos',
      },
      { status: error.status || 500 }
    )
  }
}
