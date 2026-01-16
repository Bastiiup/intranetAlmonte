/**
 * DELETE /api/crm/listas/[id]
 * Elimina el curso completo (incluyendo todos sus PDFs)
 * Las "listas" son cursos que tienen PDFs, así que eliminamos el curso completo
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
 * DELETE /api/crm/listas/[id]
 * Elimina el curso completo
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    debugLog('[API /crm/listas/[id] DELETE] ==========================================')
    debugLog('[API /crm/listas/[id] DELETE] 🗑️ INICIANDO ELIMINACIÓN DE CURSO')
    debugLog('[API /crm/listas/[id] DELETE] ID recibido:', id)

    // PASO 0: Obtener el curso para identificar el ID correcto (documentId o id numérico)
    let cursoId: number | string | null = null
    let cursoDocumentId: string | null = null
    let cursoCompletoData: any = null

    try {
      // Intentar obtener el curso con el ID recibido (puede ser id numérico o documentId)
      const cursoResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
        `/api/cursos/${id}?populate[lista_utiles]=true&publicationState=preview`
      )
      
      cursoCompletoData = Array.isArray(cursoResponse.data) 
        ? cursoResponse.data[0] 
        : cursoResponse.data
      
      if (cursoCompletoData) {
        cursoId = cursoCompletoData.id || null
        cursoDocumentId = cursoCompletoData.documentId || null
        debugLog('[API /crm/listas/[id] DELETE] ✅ Curso encontrado:', {
          id: cursoId,
          documentId: cursoDocumentId,
          nombre: cursoCompletoData.attributes?.nombre_curso || 'Sin nombre'
        })
      }
    } catch (getError: any) {
      debugLog('[API /crm/listas/[id] DELETE] ⚠️ No se pudo obtener curso con ID directo, intentando búsqueda...')
      
      // Intentar buscar por id numérico
      try {
        const searchResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>[]>>(
          `/api/cursos?filters[id][$eq]=${id}&populate[lista_utiles]=true&publicationState=preview`
        )
        const cursos = Array.isArray(searchResponse.data) ? searchResponse.data : [searchResponse.data]
        if (cursos.length > 0) {
          cursoCompletoData = cursos[0]
          cursoId = cursoCompletoData.id || null
          cursoDocumentId = cursoCompletoData.documentId || null
          debugLog('[API /crm/listas/[id] DELETE] ✅ Curso encontrado por búsqueda:', {
            id: cursoId,
            documentId: cursoDocumentId
          })
        }
      } catch (searchError: any) {
        // Intentar buscar por documentId
        try {
          const searchResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>[]>>(
            `/api/cursos?filters[documentId][$eq]=${id}&populate[lista_utiles]=true&publicationState=preview`
          )
          const cursos = Array.isArray(searchResponse.data) ? searchResponse.data : [searchResponse.data]
          if (cursos.length > 0) {
            cursoCompletoData = cursos[0]
            cursoId = cursoCompletoData.id || null
            cursoDocumentId = cursoCompletoData.documentId || null
            debugLog('[API /crm/listas/[id] DELETE] ✅ Curso encontrado por documentId:', {
              id: cursoId,
              documentId: cursoDocumentId
            })
          } else {
            throw new Error(`Curso con ID ${id} no encontrado en Strapi`)
          }
        } catch (docIdError: any) {
          debugLog('[API /crm/listas/[id] DELETE] ❌ No se pudo encontrar el curso:', docIdError)
          throw new Error(`Curso con ID ${id} no encontrado: ${docIdError.message}`)
        }
      }
    }

    if (!cursoCompletoData) {
      throw new Error(`No se pudo obtener el curso con ID ${id}`)
    }

    // Determinar qué ID usar para eliminar (preferir documentId si está disponible)
    const idParaEliminar = cursoDocumentId || cursoId || id
    debugLog('[API /crm/listas/[id] DELETE] ID que se usará para eliminar:', idParaEliminar)

    // PASO 1: Eliminar las listas-utiles asociadas al curso
    let listasEliminadas = 0
    try {
      const cursoAttrs = cursoCompletoData?.attributes || cursoCompletoData || {}
      const listaUtiles = cursoAttrs.lista_utiles

      if (listaUtiles) {
        const listas = Array.isArray(listaUtiles) ? listaUtiles : [listaUtiles]
        debugLog('[API /crm/listas/[id] DELETE] Listas-utiles encontradas:', listas.length)

        for (const lista of listas) {
          const listaData = lista.data || lista
          const listaId = listaData?.id || listaData?.documentId
          const listaDocumentId = listaData?.documentId || null

          if (listaId || listaDocumentId) {
            const idListaParaEliminar = listaDocumentId || listaId
            try {
              debugLog('[API /crm/listas/[id] DELETE] Eliminando lista-utiles:', idListaParaEliminar)
              await strapiClient.delete<StrapiResponse<StrapiEntity<any>>>(`/api/listas-utiles/${idListaParaEliminar}`)
              listasEliminadas++
              debugLog('[API /crm/listas/[id] DELETE] ✅ Lista-utiles eliminada:', idListaParaEliminar)
            } catch (listaError: any) {
              debugLog('[API /crm/listas/[id] DELETE] ⚠️ Error al eliminar lista-utiles:', idListaParaEliminar, listaError.message)
              // Continuar aunque falle una lista
            }
          }
        }
      } else {
        debugLog('[API /crm/listas/[id] DELETE] El curso no tiene listas-utiles asociadas')
      }
    } catch (error: any) {
      debugLog('[API /crm/listas/[id] DELETE] ⚠️ Error al buscar/eliminar listas-utiles:', error.message)
      // Continuar con la eliminación del curso
    }

    // PASO 2: Eliminar el curso completo
    let cursoEliminado = false
    const idsParaIntentar = [idParaEliminar]
    
    // Si tenemos ambos IDs, intentar con ambos
    if (cursoDocumentId && cursoId && cursoDocumentId !== cursoId) {
      idsParaIntentar.push(cursoId)
      idsParaIntentar.push(cursoDocumentId)
    }

    for (const idIntento of idsParaIntentar) {
      try {
        debugLog('[API /crm/listas/[id] DELETE] Intentando eliminar curso con ID:', idIntento)
        const deleteResponse = await strapiClient.delete<StrapiResponse<StrapiEntity<any>>>(`/api/cursos/${idIntento}`)
        debugLog('[API /crm/listas/[id] DELETE] ✅ Respuesta de eliminación:', deleteResponse)
        cursoEliminado = true
        break
      } catch (deleteError: any) {
        debugLog('[API /crm/listas/[id] DELETE] ⚠️ Error al eliminar con ID', idIntento, ':', deleteError.message)
        // Continuar con el siguiente ID
      }
    }

    if (!cursoEliminado) {
      throw new Error(`No se pudo eliminar el curso con ninguno de los IDs intentados: ${idsParaIntentar.join(', ')}`)
    }

    // PASO 3: Verificar que el curso realmente fue eliminado
    try {
      await new Promise(resolve => setTimeout(resolve, 500)) // Esperar un momento
      
      const verifyResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
        `/api/cursos/${idParaEliminar}?publicationState=preview`
      )
      
      // Si todavía existe, lanzar error
      if (verifyResponse.data) {
        debugLog('[API /crm/listas/[id] DELETE] ⚠️ ADVERTENCIA: El curso todavía existe después de eliminar')
        throw new Error('El curso todavía existe después de la eliminación')
      }
    } catch (verifyError: any) {
      // Si es 404, significa que el curso fue eliminado correctamente
      if (verifyError.status === 404 || verifyError.message?.includes('404')) {
        debugLog('[API /crm/listas/[id] DELETE] ✅ Verificación: Curso eliminado correctamente (404 = no existe)')
      } else {
        debugLog('[API /crm/listas/[id] DELETE] ⚠️ Error al verificar eliminación:', verifyError.message)
        // No lanzar error aquí, la eliminación puede haber sido exitosa
      }
    }

    debugLog('[API /crm/listas/[id] DELETE] ✅ ELIMINACIÓN COMPLETADA EXITOSAMENTE')
    debugLog('[API /crm/listas/[id] DELETE] ==========================================')

    return NextResponse.json({
      success: true,
      message: `Curso y ${listasEliminadas} lista(s) asociada(s) eliminada(s) exitosamente`,
      listasEliminadas,
      cursoId: idParaEliminar,
    }, { status: 200 })
  } catch (error: any) {
    debugLog('[API /crm/listas/[id] DELETE] ❌ ERROR EN ELIMINACIÓN:', error)
    debugLog('[API /crm/listas/[id] DELETE] ==========================================')
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al eliminar curso',
        details: error.details || {},
      },
      { status: error.status || 500 }
    )
  }
}
