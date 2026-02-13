import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'
import { normalizarCursoStrapi } from '@/lib/utils/strapi'

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

    // Usar strapiClient en lugar de fetch directo (más robusto)
    let curso: any = null
    
    // IMPORTANTE: versiones_materiales es un campo JSON, NO una relación
    // Por lo tanto, NO usar populate para versiones_materiales
    // Solo usar fields[] para incluirlo explícitamente
    
    // Intentar primero buscar por documentId si no es numérico
    if (isNaN(Number(cursoId))) {
      debugLog('🔍 Buscando por documentId:', cursoId)
      try {
        // NO especificar fields[] para que Strapi devuelva TODOS los campos, incluyendo versiones_materiales
        const paramsDocId = new URLSearchParams({
          'filters[documentId][$eq]': String(cursoId),
          'populate[colegio][populate][comuna]': 'true', // Populate colegio con comuna
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
        // Intentar sin fields específicos (traer todos los campos)
        try {
          const paramsDocId = new URLSearchParams({
            'filters[documentId][$eq]': String(cursoId),
            'populate[colegio][populate][comuna]': 'true', // Populate colegio con comuna
            'publicationState': 'preview',
          })
          const cursoResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>[]>>(
            `/api/cursos?${paramsDocId.toString()}`
          )
          if (cursoResponse.data && Array.isArray(cursoResponse.data) && cursoResponse.data.length > 0) {
            curso = cursoResponse.data[0]
            debugLog('✅ Curso encontrado por documentId (sin fields específicos)')
          }
        } catch (fallbackError: any) {
          debugLog('❌ Error también sin fields:', fallbackError.message)
        }
      }
    }
    
    // Si no se encontró, intentar con ID numérico
    if (!curso && /^\d+$/.test(String(cursoId))) {
      debugLog('🔍 Buscando por ID numérico:', cursoId)
      try {
        // NO especificar fields[] para que Strapi devuelva TODOS los campos, incluyendo versiones_materiales
        const paramsObj = new URLSearchParams({
          'populate[colegio][populate][comuna]': 'true', // Populate colegio con comuna
          'publicationState': 'preview',
        })
        const cursoResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
          `/api/cursos/${cursoId}?${paramsObj.toString()}`
        )
        
        if (cursoResponse.data) {
          curso = Array.isArray(cursoResponse.data) ? cursoResponse.data[0] : cursoResponse.data
          debugLog('✅ Curso encontrado por ID numérico')
        }
      } catch (idError: any) {
        debugLog('⚠️ Error buscando por ID:', idError.message)
        // Intentar sin fields específicos (traer todos los campos)
        try {
          const paramsObj = new URLSearchParams({
            'populate[colegio][populate][comuna]': 'true', // Populate colegio con comuna
            'publicationState': 'preview',
          })
          const cursoResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
            `/api/cursos/${cursoId}?${paramsObj.toString()}`
          )
          if (cursoResponse.data) {
            curso = Array.isArray(cursoResponse.data) ? cursoResponse.data[0] : cursoResponse.data
            debugLog('✅ Curso encontrado por ID numérico (sin fields específicos)')
          }
        } catch (fallbackError: any) {
          debugLog('❌ Error también sin fields:', fallbackError.message)
        }
      }
    }
    
    if (!curso) {
      debugLog('❌ Curso no encontrado con ningún método')
      return NextResponse.json(
        { 
          success: false,
          error: 'Curso no encontrado',
          details: `No se encontró curso con ID: ${cursoId}`
        },
        { status: 404 }
      )
    }
    
    debugLog('✅ Curso obtenido exitosamente')
    debugLog('📦 Estructura de respuesta RAW:', {
      tieneData: !!curso,
      dataKeys: curso ? Object.keys(curso) : [],
      tieneAttributes: !!curso?.attributes,
      attributesKeys: curso?.attributes ? Object.keys(curso.attributes) : [],
      tieneVersionesEnAttributes: !!curso?.attributes?.versiones_materiales,
      tieneVersionesEnRoot: !!curso?.versiones_materiales,
      versionesEnAttributes: curso?.attributes?.versiones_materiales ? 
        (Array.isArray(curso.attributes.versiones_materiales) ? curso.attributes.versiones_materiales.length : 'NO ES ARRAY') : 
        'NO EXISTE',
      versionesEnRoot: curso?.versiones_materiales ? 
        (Array.isArray(curso.versiones_materiales) ? curso.versiones_materiales.length : 'NO ES ARRAY') : 
        'NO EXISTE',
    })
    
    // Normalizar datos usando utilidad centralizada
    const cursoNormalizado = normalizarCursoStrapi(curso)
    
    if (!cursoNormalizado) {
      debugLog('❌ Error al normalizar curso')
      return NextResponse.json(
        {
          success: false,
          error: 'Error al procesar los datos del curso',
        },
        { status: 500 }
      )
    }
    
    debugLog('📊 Datos del curso normalizado:', {
      id: cursoNormalizado?.id,
      documentId: cursoNormalizado?.documentId,
      tieneVersiones: !!cursoNormalizado?.versiones_materiales,
      cantidadVersiones: cursoNormalizado?.versiones_materiales?.length || 0,
      tieneMateriales: cursoNormalizado?.versiones_materiales?.[0]?.materiales ? true : false,
      cantidadMateriales: cursoNormalizado?.versiones_materiales?.[0]?.materiales?.length || 0,
      tienePDF: !!cursoNormalizado?.versiones_materiales?.[0]?.pdf_id,
      pdf_id: cursoNormalizado?.versiones_materiales?.[0]?.pdf_id,
      versionesKeys: cursoNormalizado?.versiones_materiales?.[0] ? Object.keys(cursoNormalizado.versiones_materiales[0]) : [],
      versionesRaw: cursoNormalizado?.versiones_materiales?.[0] ? JSON.stringify(cursoNormalizado.versiones_materiales[0]).substring(0, 200) : 'N/A',
      tieneColegio: !!cursoNormalizado?.colegio,
      colegioNombre: cursoNormalizado?.colegio?.nombre || cursoNormalizado?.colegio?.data?.attributes?.nombre || cursoNormalizado?.colegio?.data?.nombre || 'NO ENCONTRADO',
      colegioKeys: cursoNormalizado?.colegio ? Object.keys(cursoNormalizado.colegio) : [],
    })
    
    // Log detallado de la estructura del colegio en el curso RAW
    debugLog('📊 Estructura del colegio en curso RAW:', {
      tieneColegio: !!curso?.attributes?.colegio,
      colegioType: curso?.attributes?.colegio ? typeof curso.attributes.colegio : 'N/A',
      colegioKeys: curso?.attributes?.colegio ? Object.keys(curso.attributes.colegio) : [],
      colegioDataKeys: curso?.attributes?.colegio?.data ? Object.keys(curso.attributes.colegio.data) : [],
      colegioDataAttributesKeys: curso?.attributes?.colegio?.data?.attributes ? Object.keys(curso.attributes.colegio.data.attributes) : [],
      colegioNombreRaw: curso?.attributes?.colegio?.data?.attributes?.nombre || curso?.attributes?.colegio?.data?.nombre || 'NO ENCONTRADO',
    })

    return NextResponse.json({
      success: true,
      data: cursoNormalizado,
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
