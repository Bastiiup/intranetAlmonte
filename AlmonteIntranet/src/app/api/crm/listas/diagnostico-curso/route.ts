import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/crm/listas/diagnostico-curso
 * Endpoint de diagnóstico para verificar la estructura de un curso específico
 * Útil para verificar si versiones_materiales se está retornando desde Strapi
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cursoId = searchParams.get('cursoId') || searchParams.get('id')
    
    if (!cursoId) {
      return NextResponse.json({
        success: false,
        error: 'Se requiere cursoId o id como parámetro',
      }, { status: 400 })
    }

    console.log('[Diagnóstico] 🔍 Consultando curso:', cursoId)

    // Intentar obtener el curso directamente desde Strapi
    // Sin usar fields específicos para que retorne todos los campos
    const response = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
      `/api/cursos/${cursoId}?publicationState=preview`
    )

    if (!response || !response.data) {
      return NextResponse.json({
        success: false,
        error: 'Curso no encontrado',
      }, { status: 404 })
    }

    const curso = response.data
    const attrs = (curso as any)?.attributes || curso

    // Analizar la estructura del curso
    const diagnostico = {
      cursoId: curso.id || curso.documentId,
      documentId: curso.documentId || curso.id,
      tieneAttributes: !!curso.attributes,
      todasLasKeys: Object.keys(attrs),
      tieneVersionesMateriales: 'versiones_materiales' in attrs,
      tipoVersionesMateriales: typeof attrs.versiones_materiales,
      esArray: Array.isArray(attrs.versiones_materiales),
      cantidadVersiones: Array.isArray(attrs.versiones_materiales) ? attrs.versiones_materiales.length : 'N/A',
      versionesMateriales: attrs.versiones_materiales,
      nombreCurso: attrs.nombre_curso || attrs.curso_nombre,
      tieneColegio: !!attrs.colegio,
      colegioId: attrs.colegio?.data?.id || attrs.colegio?.id,
      // Estructura completa del curso (limitado a 2000 caracteres)
      estructuraCompleta: JSON.stringify(attrs, null, 2).substring(0, 2000),
    }

    console.log('[Diagnóstico] 📊 Resultado:', diagnostico)

    return NextResponse.json({
      success: true,
      diagnostico,
      curso: {
        id: curso.id || curso.documentId,
        documentId: curso.documentId || curso.id,
        nombre: attrs.nombre_curso || attrs.curso_nombre,
        versiones_materiales: attrs.versiones_materiales,
      },
    }, { status: 200 })
  } catch (error: any) {
    console.error('[Diagnóstico] ❌ Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener diagnóstico',
        details: error.response?.data || error.data,
      },
      { status: 500 }
    )
  }
}
