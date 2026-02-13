import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getColaboradorFromCookies } from '@/lib/auth/cookies'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'
import { obtenerFechaChileISO } from '@/lib/utils/dates'
import { normalizarCursoStrapi } from '@/lib/utils/strapi'

const DEBUG = process.env.NODE_ENV === 'development'
const debugLog = (...args: any[]) => {
  if (DEBUG) {
    console.log('[API /crm/listas/[id]/publicar]', ...args)
  }
}

/**
 * POST /api/crm/listas/[id]/publicar
 * Publica una lista (curso) cambiando su estado_revision a "publicado"
 * Esto indica que la lista está validada y lista para comercialización/exportación
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Validación de permisos
    const colaborador = await getColaboradorFromCookies()
    if (!colaborador) {
      debugLog('❌ Usuario no autenticado')
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado. Debes iniciar sesión para publicar listas.',
        },
        { status: 401 }
      )
    }

    const params = await Promise.resolve(context.params)
    const cursoId = params.id

    debugLog('📤 Publicando lista/curso:', cursoId)

    if (!cursoId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'ID de curso no proporcionado' 
        },
        { status: 400 }
      )
    }

    // Obtener datos del body (opcional: puede incluir notas o información adicional)
    const body = await request.json().catch(() => ({}))
    const { notas, validador_nombre, validador_email } = body

    debugLog('📝 Datos adicionales:', { notas, validador_nombre, validador_email })

    // Obtener curso desde Strapi para verificar que existe
    let curso: any = null

    try {
      const paramsDocId = new URLSearchParams({
        'filters[documentId][$eq]': String(cursoId),
        'publicationState': 'preview',
      })
      const cursoResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>[]>>(
        `/api/cursos?${paramsDocId.toString()}`
      )
      
      if (cursoResponse.data && Array.isArray(cursoResponse.data) && cursoResponse.data.length > 0) {
        curso = cursoResponse.data[0]
        debugLog('✅ Curso encontrado por documentId')
      }
    } catch (docIdError: any) {
      debugLog('⚠️ Error buscando por documentId:', docIdError.message)
    }

    // Si no se encontró con documentId, intentar con id numérico
    if (!curso && /^\d+$/.test(String(cursoId))) {
      try {
        const cursoResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
          `/api/cursos/${cursoId}?publicationState=preview`
        )
        
        if (cursoResponse.data) {
          curso = Array.isArray(cursoResponse.data) ? cursoResponse.data[0] : cursoResponse.data
          debugLog('✅ Curso encontrado por ID numérico')
        }
      } catch (idError: any) {
        debugLog('⚠️ Error buscando por ID:', idError.message)
      }
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

    // Normalizar curso
    const cursoNormalizado = normalizarCursoStrapi(curso)
    if (!cursoNormalizado) {
      return NextResponse.json(
        {
          success: false,
          error: 'Error al procesar los datos del curso',
        },
        { status: 500 }
      )
    }

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

    // Preparar actualización
    const updateData: any = {
      estado_revision: 'publicado',
      fecha_publicacion: obtenerFechaChileISO(),
    }

    // Agregar información del validador si se proporciona
    if (validador_nombre || validador_email) {
      updateData.validador_info = {
        nombre: validador_nombre,
        email: validador_email,
        fecha_validacion: obtenerFechaChileISO(),
      }
    }

    if (notas) {
      updateData.notas_publicacion = notas
    }

    debugLog('🔄 Actualizando curso en Strapi...', updateData)

    try {
      const response = await strapiClient.put<any>(`/api/cursos/${cursoDocumentId}`, {
        data: updateData,
      })

      if ((response as any)?.error) {
        throw new Error(`Strapi devolvió un error: ${JSON.stringify((response as any).error)}`)
      }

      debugLog('✅ Lista publicada exitosamente')

      // Normalizar respuesta
      const actualData = (response as any).data || response
      const attrs = actualData?.attributes || actualData

      // Obtener colegioId para revalidar el listado
      const colegioId = cursoNormalizado.colegio?.id || 
                        cursoNormalizado.colegio?.documentId || 
                        cursoNormalizado.colegio_id

      // Revalidar rutas relacionadas
      try {
        debugLog('🔄 Revalidando rutas del caché de Next.js...')
        revalidatePath(`/crm/listas/${cursoDocumentId}/validacion`)
        if (colegioId) {
          revalidatePath(`/crm/listas/colegio/${colegioId}`)
          debugLog(`✅ Revalidado: /crm/listas/colegio/${colegioId}`)
        }
        revalidatePath('/crm/listas')
        debugLog('✅ Rutas revalidadas exitosamente')
      } catch (revalidateError: any) {
        debugLog('⚠️ Error al revalidar rutas (no crítico):', revalidateError.message)
      }

      return NextResponse.json({
        success: true,
        message: 'Lista publicada exitosamente',
        data: {
          id: actualData?.id,
          documentId: actualData?.documentId,
          estado_revision: attrs?.estado_revision || 'publicado',
          fecha_publicacion: attrs?.fecha_publicacion,
          validador_info: attrs?.validador_info,
          colegioId: colegioId,
        },
      })
    } catch (error: any) {
      // Si falla por estado_revision, intentar guardar en metadata como fallback
      if (error.message?.includes('estado_revision') || error.message?.includes('Invalid key')) {
        debugLog('⚠️ estado_revision no existe, guardando en metadata como fallback')
        
        // Obtener versiones actuales
        const versiones = cursoNormalizado.versiones_materiales || []
        const ultimaVersion = versiones.length > 0 
          ? versiones.sort((a: any, b: any) => {
              const fechaA = new Date(a.fecha_actualizacion || a.fecha_subida || 0).getTime()
              const fechaB = new Date(b.fecha_actualizacion || b.fecha_subida || 0).getTime()
              return fechaB - fechaA
            })[0]
          : null

        if (ultimaVersion) {
          const versionesConMetadata = versiones.map((v: any) => {
            if (v === ultimaVersion || v.id === ultimaVersion.id) {
              return {
                ...v,
                metadata: {
                  ...v.metadata,
                  estado_revision: 'publicado',
                  fecha_publicacion: obtenerFechaChileISO(),
                }
              }
            }
            return v
          })

          try {
            await strapiClient.put<any>(`/api/cursos/${cursoDocumentId}`, {
              data: { versiones_materiales: versionesConMetadata }
            })
            debugLog('✅ Estado guardado en metadata como fallback')
            
            return NextResponse.json({
              success: true,
              message: 'Lista publicada exitosamente (estado guardado en metadata)',
              data: {
                id: curso.id,
                documentId: cursoDocumentId,
                estado_revision: 'publicado',
                fecha_publicacion: obtenerFechaChileISO(),
              },
            })
          } catch (metadataError: any) {
            debugLog('❌ Error también al guardar en metadata:', metadataError.message)
            throw error // Lanzar error original
          }
        }
      }
      
      throw error
    }
  } catch (error: any) {
    debugLog('❌ Error inesperado:', {
      message: error.message,
      stack: error.stack,
    })
    return NextResponse.json(
      {
        success: false,
        error: 'Error al publicar la lista. Por favor, intenta nuevamente.',
        detalles: error instanceof Error ? error.message : 'Error desconocido',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/crm/listas/[id]/publicar
 * Cambia el estado de una lista (despublicar, volver a borrador, etc.)
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = await Promise.resolve(context.params)
    const cursoId = params.id

    if (!cursoId) {
      return NextResponse.json(
        { error: 'ID de curso no proporcionado' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { estado_revision, notas } = body

    if (!estado_revision || !['borrador', 'revisado', 'publicado'].includes(estado_revision)) {
      return NextResponse.json(
        { error: 'Estado de revisión inválido. Debe ser: borrador, revisado o publicado' },
        { status: 400 }
      )
    }

    debugLog('🔄 Cambiando estado de revisión:', { cursoId, estado_revision, notas })

    const updateData: any = {
      estado_revision,
    }

    if (notas) {
      updateData.notas_revision = notas
    }

    // Si se está publicando, agregar fecha
    if (estado_revision === 'publicado') {
      updateData.fecha_publicacion = new Date().toISOString()
    }

    // Intentar con documentId primero
    let response = await fetch(
      `${STRAPI_URL}/api/cursos/${cursoId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${STRAPI_TOKEN}`,
        },
        body: JSON.stringify({ data: updateData }),
      }
    )

    // Si falla, intentar buscar por documentId y usar ID numérico
    if (!response.ok && isNaN(Number(cursoId))) {
      const searchResponse = await fetch(
        `${STRAPI_URL}/api/cursos?filters[documentId][$eq]=${cursoId}`,
        {
          headers: {
            Authorization: `Bearer ${STRAPI_TOKEN}`,
          },
        }
      )

      if (searchResponse.ok) {
        const searchData = await searchResponse.json()
        if (searchData.data && searchData.data.length > 0) {
          const numericId = searchData.data[0].id
          response = await fetch(
            `${STRAPI_URL}/api/cursos/${numericId}`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${STRAPI_TOKEN}`,
              },
              body: JSON.stringify({ data: updateData }),
            }
          )
        }
      }
    }

    if (!response.ok) {
      const errorText = await response.text()
      debugLog('❌ Error al actualizar estado:', errorText)
      return NextResponse.json(
        { error: 'Error al cambiar estado de revisión', details: errorText },
        { status: response.status }
      )
    }

    const result = await response.json()
    const actualData = result.data
    const attrs = actualData?.attributes || actualData

    return NextResponse.json({
      success: true,
      message: `Estado cambiado a "${estado_revision}" exitosamente`,
      data: {
        id: actualData?.id,
        documentId: actualData?.documentId,
        estado_revision: attrs?.estado_revision,
      },
    })
  } catch (error) {
    debugLog('❌ Error inesperado:', error)
    return NextResponse.json(
      {
        error: 'Error al cambiar estado de revisión',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
