import { NextRequest, NextResponse } from 'next/server'

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || ''

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
    const params = await Promise.resolve(context.params)
    const cursoId = params.id

    debugLog('📤 Publicando lista/curso:', cursoId)

    if (!cursoId) {
      return NextResponse.json(
        { error: 'ID de curso no proporcionado' },
        { status: 400 }
      )
    }

    // Obtener datos del body (opcional: puede incluir notas o información adicional)
    const body = await request.json().catch(() => ({}))
    const { notas, validador_nombre, validador_email } = body

    debugLog('📝 Datos adicionales:', { notas, validador_nombre, validador_email })

    // Preparar actualización
    const updateData: any = {
      estado_revision: 'publicado',
      fecha_publicacion: new Date().toISOString(),
    }

    // Agregar información del validador si se proporciona
    if (validador_nombre || validador_email) {
      updateData.validador_info = {
        nombre: validador_nombre,
        email: validador_email,
        fecha_validacion: new Date().toISOString(),
      }
    }

    if (notas) {
      updateData.notas_publicacion = notas
    }

    debugLog('🔄 Actualizando curso en Strapi...', updateData)

    // Intentar primero con documentId
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

    // Si falla con documentId, intentar con ID numérico
    if (!response.ok && isNaN(Number(cursoId))) {
      debugLog('⚠️ Falló con documentId, intentando con búsqueda por filtro...')
      
      // Buscar el curso por documentId
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
          debugLog('✅ Encontrado ID numérico:', numericId)
          
          // Reintentar con ID numérico
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
      debugLog('❌ Error al actualizar curso en Strapi:', errorText)
      return NextResponse.json(
        { error: 'Error al publicar la lista', details: errorText },
        { status: response.status }
      )
    }

    const result = await response.json()
    debugLog('✅ Lista publicada exitosamente:', result)

    // Extraer los datos actualizados
    const actualData = result.data
    const attrs = actualData?.attributes || actualData

    return NextResponse.json({
      success: true,
      message: 'Lista publicada exitosamente',
      data: {
        id: actualData?.id,
        documentId: actualData?.documentId,
        estado_revision: attrs?.estado_revision,
        fecha_publicacion: attrs?.fecha_publicacion,
        validador_info: attrs?.validador_info,
      },
    })
  } catch (error) {
    debugLog('❌ Error inesperado:', error)
    return NextResponse.json(
      {
        error: 'Error al publicar la lista',
        details: error instanceof Error ? error.message : String(error),
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
