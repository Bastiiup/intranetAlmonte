import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

const DEBUG = true
const debugLog = (...args: any[]) => {
  if (DEBUG) {
    console.log(...args)
  }
}

/**
 * GET /api/crm/colegios/[colegioId]/cursos
 * Obtiene TODOS los cursos de un colegio específico (con y sin listas)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ colegioId: string }> }
) {
  try {
    const { colegioId } = await params
    
    debugLog('[API /crm/colegios/[colegioId]/cursos GET] Obteniendo cursos del colegio:', colegioId)

    // Primero obtener el colegio para tener su RBD
    const colegioResponse = await strapiClient.get<any>(
      `/api/colegios/${colegioId}?populate=*`
    )

    if (!colegioResponse || !colegioResponse.data) {
      return NextResponse.json({
        success: false,
        error: 'Colegio no encontrado',
      }, { status: 404 })
    }

    const colegioData = colegioResponse.data
    const colegioAttrs = colegioData.attributes || colegioData
    const colegioRbd = colegioAttrs.rbd || colegioData.rbd

    if (!colegioRbd) {
      return NextResponse.json({
        success: false,
        error: 'El colegio no tiene RBD asignado',
      }, { status: 400 })
    }

    debugLog('[API /crm/colegios/[colegioId]/cursos GET] RBD del colegio:', colegioRbd)

    // Obtener TODOS los cursos del colegio
    const filters: string[] = []
    filters.push(`filters[colegio][rbd][$eq]=${colegioRbd}`)
    filters.push('pagination[pageSize]=1000')
    filters.push('sort[0]=anio:desc')
    filters.push('sort[1]=nivel:asc')
    filters.push('sort[2]=grado:asc')
    filters.push('populate[colegio][fields][0]=colegio_nombre')
    filters.push('populate[colegio][fields][1]=rbd')
    
    const queryString = filters.join('&')
    const cursosResponse = await strapiClient.get<any>(`/api/cursos?${queryString}`)

    if (!cursosResponse || !cursosResponse.data) {
      return NextResponse.json({
        success: true,
        data: {
          colegio: {
            id: colegioData.id || colegioData.documentId,
            documentId: colegioData.documentId || String(colegioData.id),
            nombre: colegioAttrs.colegio_nombre || '',
            rbd: colegioRbd,
          },
          cursos: [],
        },
        count: 0,
      }, { status: 200 })
    }

    const cursosArray = Array.isArray(cursosResponse.data) ? cursosResponse.data : [cursosResponse.data]
    
    debugLog('[API /crm/colegios/[colegioId]/cursos GET] Total de cursos obtenidos:', cursosArray.length)

    // Mapear cursos
    const cursos = cursosArray.map((curso: any) => {
      const attrs = curso.attributes || curso
      const versiones = attrs.versiones_materiales || []
      const ultimaVersion = versiones.length > 0 ? versiones[versiones.length - 1] : null
      const materiales = ultimaVersion?.materiales || []

      return {
        id: curso.id || curso.documentId,
        documentId: curso.documentId || String(curso.id),
        nombre: attrs.nombre_curso || '',
        nivel: attrs.nivel || '',
        grado: attrs.grado || 0,
        año: attrs.anio || attrs.año || new Date().getFullYear(),
        letra: attrs.letra || '',
        matricula: attrs.matricula || 0,
        cantidadVersiones: versiones.length,
        cantidadProductos: materiales.length,
        tieneListaUtiles: versiones.length > 0,
        pdf_id: ultimaVersion?.pdf_id || null,
        pdf_url: ultimaVersion?.pdf_url || null,
        updatedAt: curso.updatedAt || curso.attributes?.updatedAt || null,
      }
    })

    // Agrupar por año
    const cursosPorAño = cursos.reduce((acc: any, curso: any) => {
      const año = curso.año
      if (!acc[año]) {
        acc[año] = []
      }
      acc[año].push(curso)
      return acc
    }, {})

    debugLog('[API /crm/colegios/[colegioId]/cursos GET] Cursos agrupados por año:', Object.keys(cursosPorAño))

    return NextResponse.json({
      success: true,
      data: {
        colegio: {
          id: colegioData.id || colegioData.documentId,
          documentId: colegioData.documentId || String(colegioData.id),
          nombre: colegioAttrs.colegio_nombre || '',
          rbd: colegioRbd,
          comuna: colegioAttrs.comuna?.data?.attributes?.comuna_nombre || colegioAttrs.provincia || '',
          region: colegioAttrs.region || '',
        },
        cursos,
        cursosPorAño,
        total: cursos.length,
      },
      count: cursos.length,
    }, { status: 200 })
  } catch (error: any) {
    debugLog('[API /crm/colegios/[colegioId]/cursos GET] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener cursos',
      },
      { status: 500 }
    )
  }
}
