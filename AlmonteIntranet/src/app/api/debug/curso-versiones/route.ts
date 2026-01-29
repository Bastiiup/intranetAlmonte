import { NextRequest, NextResponse } from 'next/server'
import { strapiClient } from '@/lib/strapi'

/**
 * Endpoint temporal para debug: ver la estructura exacta de versiones_materiales
 * GET /api/debug/curso-versiones?cursoId=190273
 * GET /api/debug/curso-versiones?rbd=10479 (busca cursos del colegio con ese RBD)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const cursoId = searchParams.get('cursoId')
  const rbd = searchParams.get('rbd')

  try {
    let response: any
    let cursos: any[] = []

    if (rbd) {
      // Buscar por RBD del colegio
      const params = new URLSearchParams({
        'filters[colegio][rbd][$eq]': rbd,
        'populate': '*',
        'publicationState': 'preview',
      })
      response = await strapiClient.get(`/api/cursos?${params.toString()}`)
      cursos = Array.isArray(response.data) ? response.data : [response.data]
    } else if (cursoId) {
      // Buscar por ID de curso
      response = await strapiClient.get(`/api/cursos/${cursoId}`, {
        params: {
          'populate': '*',
          'publicationState': 'preview',
        }
      })
      cursos = [response.data]
    } else {
      return NextResponse.json({
        success: false,
        error: 'Debes proporcionar cursoId o rbd',
      }, { status: 400 })
    }

    const resultados = cursos.map((curso: any) => {
      const attrs = curso?.attributes || curso
      const versionesRaw = attrs.versiones_materiales || curso.versiones_materiales
      
      // Verificar relación con colegio
      const colegioData = attrs.colegio?.data || attrs.colegio || curso.colegio?.data || curso.colegio
      const colegioAttrs = colegioData?.attributes || colegioData
      const colegioId = colegioData?.id || colegioData?.documentId
      const colegioRBD = colegioAttrs?.rbd || colegioData?.rbd
      const colegioNombre = colegioAttrs?.colegio_nombre || colegioData?.colegio_nombre

      return {
        cursoId: curso.id || curso.documentId,
        nombre: attrs.nombre_curso || curso.nombre_curso,
        relacionColegio: {
          tieneColegio: !!colegioData,
          tieneColegioEnAttrs: !!attrs.colegio,
          tieneColegioEnCurso: !!curso.colegio,
          colegioId: colegioId || null,
          colegioRBD: colegioRBD || null,
          colegioNombre: colegioNombre || null,
          estructuraColegio: colegioData ? {
            tieneId: !!colegioId,
            tieneRBD: !!colegioRBD,
            tieneNombre: !!colegioNombre,
            keys: Object.keys(colegioData).slice(0, 10),
          } : null,
        },
        estructura: {
          tieneAttributes: !!curso.attributes,
          tieneVersionesEnAttrs: 'versiones_materiales' in attrs,
          tieneVersionesEnCurso: 'versiones_materiales' in curso,
          tipoVersionesAttrs: typeof attrs.versiones_materiales,
          tipoVersionesCurso: typeof curso.versiones_materiales,
          esArrayAttrs: Array.isArray(attrs.versiones_materiales),
          esArrayCurso: Array.isArray(curso.versiones_materiales),
          valorAttrs: attrs.versiones_materiales,
          valorCurso: curso.versiones_materiales,
          keysAttrs: attrs.versiones_materiales && typeof attrs.versiones_materiales === 'object' && !Array.isArray(attrs.versiones_materiales)
            ? Object.keys(attrs.versiones_materiales) 
            : null,
          keysCurso: curso.versiones_materiales && typeof curso.versiones_materiales === 'object' && !Array.isArray(curso.versiones_materiales)
            ? Object.keys(curso.versiones_materiales)
            : null,
          esNull: attrs.versiones_materiales === null || curso.versiones_materiales === null,
          esUndefined: attrs.versiones_materiales === undefined && curso.versiones_materiales === undefined,
          esObjetoVacio: attrs.versiones_materiales && typeof attrs.versiones_materiales === 'object' && !Array.isArray(attrs.versiones_materiales)
            ? Object.keys(attrs.versiones_materiales).length === 0 
            : false,
          versionesRaw: versionesRaw,
          versionesRawType: typeof versionesRaw,
          versionesRawIsArray: Array.isArray(versionesRaw),
          versionesRawKeys: versionesRaw && typeof versionesRaw === 'object' && !Array.isArray(versionesRaw)
            ? Object.keys(versionesRaw)
            : null,
        },
      }
    })

    return NextResponse.json({
      success: true,
      busqueda: rbd ? { tipo: 'rbd', valor: rbd } : { tipo: 'cursoId', valor: cursoId },
      cantidadCursos: resultados.length,
      cursos: resultados,
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      busqueda: rbd ? { tipo: 'rbd', valor: rbd } : { tipo: 'cursoId', valor: cursoId },
    }, { status: 500 })
  }
}
