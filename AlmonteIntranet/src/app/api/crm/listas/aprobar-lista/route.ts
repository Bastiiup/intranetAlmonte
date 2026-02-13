/**
 * API Route para aprobar una lista completa
 * POST /api/crm/listas/aprobar-lista
 */

import { NextRequest, NextResponse } from 'next/server'
import { getColaboradorFromCookies } from '@/lib/auth/cookies'
import { revalidatePath } from 'next/cache'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'
import { obtenerFechaChileISO } from '@/lib/utils/dates'
import { normalizarCursoStrapi, obtenerUltimaVersion } from '@/lib/utils/strapi'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // Validación de permisos
    const colaborador = await getColaboradorFromCookies()
    if (!colaborador) {
      console.error('[Aprobar Lista] ❌ Usuario no autenticado')
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado. Debes iniciar sesión para aprobar listas.',
        },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { listaId } = body

    if (!listaId) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID de lista es requerido',
        },
        { status: 400 }
      )
    }

    console.log('[Aprobar Lista] 🚀 Aprobando lista completa...', { listaId })

    // Obtener curso desde Strapi
    let curso: any = null

    try {
      const paramsDocId = new URLSearchParams({
        'filters[documentId][$eq]': String(listaId),
        'publicationState': 'preview',
      })
      const cursoResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>[]>>(
        `/api/cursos?${paramsDocId.toString()}`
      )
      
      if (cursoResponse.data && Array.isArray(cursoResponse.data) && cursoResponse.data.length > 0) {
        curso = cursoResponse.data[0]
      } else if (cursoResponse.data && !Array.isArray(cursoResponse.data)) {
        curso = cursoResponse.data
      }
    } catch (docIdError: any) {
      console.warn('[Aprobar Lista] ⚠️ Error al buscar por documentId:', docIdError.message)
    }

    // Si no se encontró con documentId, intentar con id numérico
    if (!curso && /^\d+$/.test(String(listaId))) {
      try {
        const cursoResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
          `/api/cursos/${listaId}?publicationState=preview`
        )
        
        if (cursoResponse.data) {
          curso = Array.isArray(cursoResponse.data) ? cursoResponse.data[0] : cursoResponse.data
        }
      } catch (idError: any) {
        console.warn('[Aprobar Lista] ⚠️ Error al buscar por id numérico:', idError.message)
      }
    }

    if (!curso) {
      return NextResponse.json(
        {
          success: false,
          error: 'Lista no encontrada',
        },
        { status: 404 }
      )
    }

    // Normalizar curso de Strapi
    const cursoNormalizado = normalizarCursoStrapi(curso)
    if (!cursoNormalizado) {
      console.error('[Aprobar Lista] ❌ Error al normalizar curso')
      return NextResponse.json(
        {
          success: false,
          error: 'Error al procesar los datos del curso',
        },
        { status: 500 }
      )
    }

    const versiones = cursoNormalizado.versiones_materiales || []
    const ultimaVersion = obtenerUltimaVersion(versiones)

    if (!ultimaVersion) {
      return NextResponse.json(
        {
          success: false,
          error: 'No hay versión de materiales disponible',
        },
        { status: 400 }
      )
    }

    const materiales = ultimaVersion.materiales || []
    
    if (materiales.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'La lista no tiene productos para aprobar',
        },
        { status: 400 }
      )
    }

    // Aprobar todos los productos
    const materialesAprobados = materiales.map((m: any) => ({
      ...m,
      aprobado: true,
      fecha_aprobacion: m.aprobado ? m.fecha_aprobacion : obtenerFechaChileISO(),
    }))

    // Actualizar la última versión
    const versionesActualizadas = versiones.map((v: any) => {
      const isUltimaVersion = v.id === ultimaVersion.id || 
                             (v.fecha_subida === ultimaVersion.fecha_subida && 
                              v.fecha_actualizacion === ultimaVersion.fecha_actualizacion) ||
                             v === ultimaVersion
      
      if (isUltimaVersion) {
        return {
          ...v,
          materiales: materialesAprobados,
          fecha_actualizacion: obtenerFechaChileISO(),
        }
      }
      return v
    })

    // Guardar en Strapi
    const cursoDocumentId = curso.documentId || curso.id
    if (!cursoDocumentId) {
      return NextResponse.json(
        {
          success: false,
          error: 'El curso no tiene documentId válido',
        },
        { status: 400 }
      )
    }

    // Combinar actualización de versiones_materiales Y estado_revision en una sola llamada
    // ⚠️ IMPORTANTE: Al aprobar la lista completa, el estado cambia a "publicado" (lista para exportación)
    const updateData = {
      data: {
        versiones_materiales: versionesActualizadas,
        estado_revision: 'publicado', // Cambiar a "publicado" para indicar que está lista para exportación
        fecha_revision: obtenerFechaChileISO(),
        fecha_publicacion: obtenerFechaChileISO(), // Agregar fecha de publicación
      },
    }

    console.log('[Aprobar Lista] 💾 Guardando versiones y estado en Strapi...')
    
    try {
      const response = await strapiClient.put<any>(`/api/cursos/${cursoDocumentId}`, updateData)

      if ((response as any)?.error) {
        throw new Error(`Strapi devolvió un error: ${JSON.stringify((response as any).error)}`)
      }

      console.log('[Aprobar Lista] ✅ Versiones y estado guardados exitosamente')
    } catch (error: any) {
      // Si falla por estado_revision, intentar solo con versiones_materiales
      if (error.message?.includes('estado_revision') || error.message?.includes('Invalid key')) {
        console.warn('[Aprobar Lista] ⚠️ estado_revision no existe, guardando solo versiones_materiales')
        
        const updateDataSinEstado = {
          data: {
            versiones_materiales: versionesActualizadas,
          },
        }
        
        const response = await strapiClient.put<any>(`/api/cursos/${cursoDocumentId}`, updateDataSinEstado)
        
        if ((response as any)?.error) {
          throw new Error(`Strapi devolvió un error: ${JSON.stringify((response as any).error)}`)
        }
        
        console.log('[Aprobar Lista] ✅ Versiones guardadas (sin estado_revision)')
        
        // Guardar estado en metadata como fallback
        const versionesConEstadoEnMetadata = versionesActualizadas.map((v: any) => {
          if (v === ultimaVersion || v.id === ultimaVersion.id) {
            return {
              ...v,
              metadata: {
                ...v.metadata,
                estado_revision: 'publicado', // Cambiar a "publicado" para indicar que está lista para exportación
                fecha_revision: obtenerFechaChileISO(),
                fecha_publicacion: obtenerFechaChileISO(), // Agregar fecha de publicación
              }
            }
          }
          return v
        })
        
        try {
          await strapiClient.put<any>(`/api/cursos/${cursoDocumentId}`, {
            data: { versiones_materiales: versionesConEstadoEnMetadata }
          })
          console.log('[Aprobar Lista] ✅ Estado guardado en metadata como fallback')
        } catch (metadataError: any) {
          console.warn('[Aprobar Lista] ⚠️ No se pudo guardar estado en metadata:', metadataError.message)
        }
      } else {
        throw error
      }
    }

    console.log('[Aprobar Lista] ✅ Lista aprobada exitosamente')

    // Obtener el colegio_id si existe (una sola vez, reutilizar)
    // El colegio normalizado tiene id y documentId directamente (no dentro de data)
    let colegioId: string | number | null = cursoNormalizado.colegio?.documentId || 
                      cursoNormalizado.colegio?.id || 
                      cursoNormalizado.colegio_id ||
                      null
    
    // Si no se encontró en el curso normalizado, intentar desde el curso original de Strapi
    if (!colegioId) {
      const cursoAttrs = curso.attributes || curso
      const colegioData = cursoAttrs.colegio?.data || cursoAttrs.colegio
      if (colegioData) {
        // Priorizar documentId sobre id (más confiable para navegación)
        colegioId = colegioData.documentId || colegioData.id || null
      }
    }
    
    console.log('[Aprobar Lista] 📋 Colegio ID obtenido:', colegioId, {
      desdeNormalizado: !!(cursoNormalizado.colegio?.documentId || cursoNormalizado.colegio?.id),
      desdeOriginal: !!(curso.attributes?.colegio || curso.colegio),
      estructuraColegio: {
        normalizado: cursoNormalizado.colegio ? {
          tieneId: !!cursoNormalizado.colegio.id,
          tieneDocumentId: !!cursoNormalizado.colegio.documentId,
          id: cursoNormalizado.colegio.id,
          documentId: cursoNormalizado.colegio.documentId,
        } : null,
        original: curso.attributes?.colegio ? {
          tieneData: !!curso.attributes.colegio.data,
          tieneId: !!curso.attributes.colegio.data?.id,
          tieneDocumentId: !!curso.attributes.colegio.data?.documentId,
        } : null,
      }
    })

    // Revalidar todas las rutas relacionadas para que el estado se actualice en el listado
    try {
      console.log('[Aprobar Lista] 🔄 Revalidando rutas del caché de Next.js...')
      
      // Revalidar la página de validación individual
      revalidatePath(`/crm/listas/${cursoDocumentId}/validacion`)
      
      // Revalidar la página de listado de cursos del colegio (si existe)
      if (colegioId) {
        revalidatePath(`/crm/listas/colegio/${colegioId}`)
        console.log(`[Aprobar Lista] ✅ Revalidado: /crm/listas/colegio/${colegioId}`)
      }
      
      // Revalidar la ruta principal de listas
      revalidatePath('/crm/listas')
      
      console.log('[Aprobar Lista] ✅ Rutas revalidadas exitosamente')
    } catch (revalidateError: any) {
      console.warn('[Aprobar Lista] ⚠️ Error al revalidar rutas (no crítico):', revalidateError.message)
      // No lanzar el error, solo registrarlo
    }

    return NextResponse.json({
      success: true,
      message: 'Lista aprobada exitosamente',
      data: {
        listaId,
        colegioId: colegioId, // ⚠️ IMPORTANTE: Incluir colegioId en la respuesta para que el frontend pueda navegar
        totalProductos: materialesAprobados.length,
        productosAprobados: materialesAprobados.length,
        listaAprobada: true,
        revalidacionExitosa: true,
      },
    }, { status: 200 })

  } catch (error: any) {
    console.error('[Aprobar Lista] ❌ Error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    })
    
    return NextResponse.json(
      {
        success: false,
        error: 'Error al aprobar la lista. Por favor, intenta nuevamente.',
        detalles: error instanceof Error ? error.message : 'Error desconocido',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
      },
      { status: 500 }
    )
  }
}
