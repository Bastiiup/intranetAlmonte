import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/crm/listas/diagnostico
 * Endpoint de diagnóstico para verificar listas ocultas, cursos y colegios asociados
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[Diagnóstico Listas] 🔍 Iniciando diagnóstico...')

    // 1. Obtener todos los cursos (sin filtros)
    const cursosResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>[]>>(
      '/api/cursos?pagination[limit]=10000&publicationState=preview'
    )

    const todosLosCursos = cursosResponse.data || []
    console.log('[Diagnóstico Listas] 📊 Total de cursos:', todosLosCursos.length)

    // 2. Analizar cursos con versiones_materiales
    const cursosConVersiones: any[] = []
    const cursosConPDFs: any[] = []
    const cursosSinVersiones: any[] = []
    const cursosConColegio: any[] = []
    const cursosSinColegio: any[] = []

    todosLosCursos.forEach((curso: any) => {
      const attrs = curso.attributes || curso
      const versiones = attrs.versiones_materiales || curso.versiones_materiales || []
      const tieneVersiones = Array.isArray(versiones) && versiones.length > 0
      const tienePDFs = Array.isArray(versiones) && versiones.some((v: any) => v.pdf_id || v.pdf_url)
      const tieneColegio = !!(attrs.colegio?.data || attrs.colegio || curso.colegio)

      if (tieneVersiones) {
        cursosConVersiones.push({
          id: curso.id || curso.documentId,
          documentId: curso.documentId,
          nombre: attrs.nombre_curso || curso.nombre_curso,
          cantidadVersiones: versiones.length,
          tienePDFs,
        })
      } else {
        cursosSinVersiones.push({
          id: curso.id || curso.documentId,
          nombre: attrs.nombre_curso || curso.nombre_curso,
        })
      }

      if (tienePDFs) {
        cursosConPDFs.push({
          id: curso.id || curso.documentId,
          nombre: attrs.nombre_curso || curso.nombre_curso,
          versiones: versiones.filter((v: any) => v.pdf_id || v.pdf_url).map((v: any) => ({
            pdf_id: v.pdf_id,
            pdf_url: v.pdf_url ? v.pdf_url.substring(0, 50) + '...' : null,
          })),
        })
      }

      if (tieneColegio) {
        const colegioData = attrs.colegio?.data || attrs.colegio || curso.colegio
        const colegioAttrs = colegioData?.attributes || colegioData
        cursosConColegio.push({
          cursoId: curso.id || curso.documentId,
          cursoNombre: attrs.nombre_curso || curso.nombre_curso,
          colegioId: colegioData?.id || colegioData?.documentId,
          colegioNombre: colegioAttrs?.colegio_nombre || colegioAttrs?.nombre || colegioData?.colegio_nombre || colegioData?.nombre,
          rbd: colegioAttrs?.rbd || colegioData?.rbd,
        })
      } else {
        cursosSinColegio.push({
          id: curso.id || curso.documentId,
          nombre: attrs.nombre_curso || curso.nombre_curso,
        })
      }
    })

    // 3. Obtener todos los colegios
    const colegiosResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>[]>>(
      '/api/colegios?pagination[limit]=10000&publicationState=preview'
    )

    const todosLosColegios = colegiosResponse.data || []
    console.log('[Diagnóstico Listas] 📊 Total de colegios:', todosLosColegios.length)

    // 4. Agrupar cursos por colegio
    const colegiosConCursos: Record<string, any> = {}
    cursosConColegio.forEach((item) => {
      const colegioKey = item.colegioId || item.colegioNombre
      if (!colegiosConCursos[colegioKey]) {
        colegiosConCursos[colegioKey] = {
          colegioId: item.colegioId,
          colegioNombre: item.colegioNombre,
          rbd: item.rbd,
          cursos: [],
          cursosConVersiones: 0,
          cursosConPDFs: 0,
        }
      }
      colegiosConCursos[colegioKey].cursos.push({
        cursoId: item.cursoId,
        cursoNombre: item.cursoNombre,
      })

      // Verificar si este curso tiene versiones
      const curso = todosLosCursos.find((c: any) => 
        (c.id || c.documentId) === item.cursoId
      )
      if (curso) {
        const attrs = curso.attributes || curso
        const versiones = attrs.versiones_materiales || curso.versiones_materiales || []
        if (Array.isArray(versiones) && versiones.length > 0) {
          colegiosConCursos[colegioKey].cursosConVersiones++
          if (versiones.some((v: any) => v.pdf_id || v.pdf_url)) {
            colegiosConCursos[colegioKey].cursosConPDFs++
          }
        }
      }
    })

    // 5. Colegios que deberían aparecer en /crm/listas pero no aparecen
    const colegiosConListas = Object.values(colegiosConCursos).filter((colegio: any) => 
      colegio.cursosConVersiones > 0
    )

    // 6. Resumen
    const resumen = {
      totalCursos: todosLosCursos.length,
      cursosConVersiones: cursosConVersiones.length,
      cursosConPDFs: cursosConPDFs.length,
      cursosSinVersiones: cursosSinVersiones.length,
      cursosConColegio: cursosConColegio.length,
      cursosSinColegio: cursosSinColegio.length,
      totalColegios: todosLosColegios.length,
      colegiosConCursos: Object.keys(colegiosConCursos).length,
      colegiosConListas: colegiosConListas.length,
      cursosOcultos: cursosConVersiones.filter((c: any) => {
        // Un curso está "oculto" si tiene versiones pero no tiene colegio asociado
        return !cursosConColegio.some((cc: any) => cc.cursoId === c.id)
      }),
    }

    console.log('[Diagnóstico Listas] ✅ Diagnóstico completado:', resumen)

    return NextResponse.json({
      success: true,
      resumen,
      detalles: {
        cursosConVersiones: cursosConVersiones.slice(0, 20), // Primeros 20
        cursosConPDFs: cursosConPDFs.slice(0, 20),
        cursosSinColegio: cursosSinColegio.slice(0, 20),
        colegiosConListas: colegiosConListas.slice(0, 20),
        cursosOcultos: resumen.cursosOcultos.slice(0, 20),
      },
      estadisticas: {
        porcentajeCursosConVersiones: ((cursosConVersiones.length / todosLosCursos.length) * 100).toFixed(2),
        porcentajeCursosConPDFs: ((cursosConPDFs.length / todosLosCursos.length) * 100).toFixed(2),
        porcentajeCursosConColegio: ((cursosConColegio.length / todosLosCursos.length) * 100).toFixed(2),
        porcentajeColegiosConListas: ((colegiosConListas.length / todosLosColegios.length) * 100).toFixed(2),
      },
    }, { status: 200 })
  } catch (error: any) {
    console.error('[Diagnóstico Listas] ❌ Error:', error)
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
