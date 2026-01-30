import { NextRequest, NextResponse } from 'next/server'

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || ''

const DEBUG = process.env.NODE_ENV === 'development'
const debugLog = (...args: any[]) => {
  if (DEBUG) {
    console.log('[API /crm/listas/[id]]', ...args)
  }
}

/**
 * GET /api/crm/listas/[id]
 * Obtiene los datos completos de un curso/lista específico
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = await Promise.resolve(context.params)
    const cursoId = params.id

    debugLog('📋 Obteniendo curso/lista:', cursoId)

    if (!cursoId) {
      return NextResponse.json(
        { error: 'ID de curso no proporcionado' },
        { status: 400 }
      )
    }

    // Intentar primero con el ID tal cual (puede ser documentId o ID numérico)
    let response = await fetch(
      `${STRAPI_URL}/api/cursos/${cursoId}?populate=*`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_TOKEN}`,
        },
        cache: 'no-store',
      }
    )

    // Si falla con documentId, intentar buscar por filtro
    if (!response.ok && isNaN(Number(cursoId))) {
      debugLog('⚠️ Falló con documentId, intentando con búsqueda por filtro...')
      
      const searchResponse = await fetch(
        `${STRAPI_URL}/api/cursos?filters[documentId][$eq]=${cursoId}&populate=*`,
        {
          headers: {
            Authorization: `Bearer ${STRAPI_TOKEN}`,
          },
          cache: 'no-store',
        }
      )

      if (searchResponse.ok) {
        const searchData = await searchResponse.json()
        if (searchData.data && searchData.data.length > 0) {
          // Usar el primer resultado
          const curso = searchData.data[0]
          debugLog('✅ Curso encontrado por documentId:', curso.documentId || curso.id)
          
          return NextResponse.json({
            success: true,
            data: curso,
          })
        }
      }
    }

    if (!response.ok) {
      const errorText = await response.text()
      debugLog('❌ Error al obtener curso desde Strapi:', errorText)
      return NextResponse.json(
        { error: 'Curso no encontrado', details: errorText },
        { status: response.status }
      )
    }

    const result = await response.json()
    debugLog('✅ Curso obtenido exitosamente')

    return NextResponse.json({
      success: true,
      data: result.data,
    })
  } catch (error) {
    debugLog('❌ Error inesperado:', error)
    return NextResponse.json(
      {
        error: 'Error al obtener el curso',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
