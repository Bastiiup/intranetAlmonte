import { NextRequest, NextResponse } from 'next/server'
import { strapiClient } from '@/lib/strapi'

/**
 * GET /api/debug/matriculados
 * Endpoint de debug para revisar los datos de matrícula por colegio
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rbd = searchParams.get('rbd')
    const colegioId = searchParams.get('colegioId')
    
    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      filtros: { rbd, colegioId },
    }
    
    // Si se proporciona un RBD, buscar ese colegio específico
    if (rbd) {
      const colegioResponse = await strapiClient.get(`/api/colegios?filters[rbd][$eq]=${rbd}&populate[cursos][fields][0]=matricula&populate[cursos][fields][1]=nombre_curso`)
      const colegios = Array.isArray(colegioResponse.data) ? colegioResponse.data : [colegioResponse.data]
      
      if (colegios.length > 0) {
        const colegio = colegios[0]
        const attrs = colegio.attributes || colegio
        const cursos = attrs.cursos?.data || attrs.cursos || []
        
        debugInfo.colegio = {
          id: colegio.id || colegio.documentId,
          documentId: colegio.documentId,
          nombre: attrs.colegio_nombre || attrs.nombre,
          rbd: attrs.rbd,
          totalCursos: cursos.length,
        }
        
        debugInfo.cursos = cursos.map((curso: any) => {
          const cursoAttrs = curso.attributes || curso
          return {
            id: curso.id || curso.documentId,
            documentId: curso.documentId,
            nombre: cursoAttrs.nombre_curso || curso.nombre_curso,
            matricula: cursoAttrs.matricula || curso.matricula,
            tieneMatricula: !!(cursoAttrs.matricula || curso.matricula),
            matriculaValue: cursoAttrs.matricula || curso.matricula || null,
            tipoMatricula: typeof (cursoAttrs.matricula || curso.matricula),
          }
        })
        
        const matriculaTotal = cursos.reduce((sum: number, curso: any) => {
          const cursoAttrs = curso.attributes || curso
          const matricula = cursoAttrs.matricula || curso.matricula || 0
          return sum + (typeof matricula === 'number' ? matricula : 0)
        }, 0)
        
        debugInfo.matriculaTotal = matriculaTotal
        debugInfo.cursosConMatricula = cursos.filter((curso: any) => {
          const cursoAttrs = curso.attributes || curso
          return !!(cursoAttrs.matricula || curso.matricula)
        }).length
      } else {
        debugInfo.error = `No se encontró colegio con RBD ${rbd}`
      }
    } else if (colegioId) {
      // Si se proporciona un colegioId, buscar ese colegio
      const colegioResponse = await strapiClient.get(`/api/colegios/${colegioId}?populate[cursos][fields][0]=matricula&populate[cursos][fields][1]=nombre_curso`)
      const colegio = colegioResponse.data
      
      if (colegio) {
        const attrs = colegio.attributes || colegio
        const cursos = attrs.cursos?.data || attrs.cursos || []
        
        debugInfo.colegio = {
          id: colegio.id || colegio.documentId,
          documentId: colegio.documentId,
          nombre: attrs.colegio_nombre || attrs.nombre,
          rbd: attrs.rbd,
          totalCursos: cursos.length,
        }
        
        debugInfo.cursos = cursos.map((curso: any) => {
          const cursoAttrs = curso.attributes || curso
          return {
            id: curso.id || curso.documentId,
            documentId: curso.documentId,
            nombre: cursoAttrs.nombre_curso || curso.nombre_curso,
            matricula: cursoAttrs.matricula || curso.matricula,
            tieneMatricula: !!(cursoAttrs.matricula || curso.matricula),
            matriculaValue: cursoAttrs.matricula || curso.matricula || null,
            tipoMatricula: typeof (cursoAttrs.matricula || curso.matricula),
          }
        })
        
        const matriculaTotal = cursos.reduce((sum: number, curso: any) => {
          const cursoAttrs = curso.attributes || curso
          const matricula = cursoAttrs.matricula || curso.matricula || 0
          return sum + (typeof matricula === 'number' ? matricula : 0)
        }, 0)
        
        debugInfo.matriculaTotal = matriculaTotal
        debugInfo.cursosConMatricula = cursos.filter((curso: any) => {
          const cursoAttrs = curso.attributes || curso
          return !!(cursoAttrs.matricula || curso.matricula)
        }).length
      } else {
        debugInfo.error = `No se encontró colegio con ID ${colegioId}`
      }
    } else {
      // Si no se proporciona filtro, obtener los primeros 5 colegios con listas
      const response = await strapiClient.get('/api/crm/listas/por-colegio')
      const data = await response.json()
      
      if (data.success && data.data) {
        const colegios = Array.isArray(data.data) ? data.data : [data.data]
        debugInfo.colegios = colegios.slice(0, 5).map((colegio: any) => ({
          id: colegio.id || colegio.documentId,
          documentId: colegio.documentId,
          nombre: colegio.nombre || colegio.colegio_nombre,
          rbd: colegio.rbd,
          matriculaTotal: colegio.matriculaTotal,
          tieneMatriculaTotal: !!colegio.matriculaTotal,
          totalCursos: colegio.cursos?.length || 0,
          cursos: colegio.cursos?.slice(0, 3).map((curso: any) => ({
            id: curso.id || curso.documentId,
            nombre: curso.nombre_curso || curso.attributes?.nombre_curso,
            matricula: curso._matricula || curso.matricula || curso.attributes?.matricula,
            tieneMatricula: !!(curso._matricula || curso.matricula || curso.attributes?.matricula),
          })) || [],
        }))
      } else {
        debugInfo.error = 'No se pudieron obtener los colegios'
      }
    }
    
    return NextResponse.json({
      success: true,
      debug: debugInfo,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /debug/matriculados GET] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al obtener datos de matrícula',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 })
  }
}
