import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/crm/listas/verificar-colegios-cursos
 * Verifica si los cursos con versiones_materiales tienen colegio asociado
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[Verificar Colegios Cursos] 🔍 Iniciando verificación...')

    // Obtener cursos con versiones_materiales
    // NO usar fields restrictivo para que las relaciones se incluyan automáticamente
    // Solo usar populate para cargar relaciones
    const cursosResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>[]>>(
      '/api/cursos?pagination[limit]=10000&publicationState=preview&populate[colegio]=true'
    )

    const todosLosCursos = cursosResponse.data || []
    console.log('[Verificar Colegios Cursos] 📊 Total de cursos:', todosLosCursos.length)

    // Analizar cursos
    const cursosConVersiones: any[] = []
    const cursosConVersionesYColegio: any[] = []
    const cursosConVersionesSinColegio: any[] = []

    todosLosCursos.forEach((curso: any) => {
      const attrs = curso.attributes || curso
      const versiones = attrs.versiones_materiales || curso.versiones_materiales || []
      const tieneVersiones = Array.isArray(versiones) && versiones.length > 0

      if (tieneVersiones) {
        const colegioData = attrs.colegio?.data || attrs.colegio || curso.colegio
        const tieneColegio = !!(colegioData?.id || colegioData?.documentId)

        const cursoInfo = {
          id: curso.id || curso.documentId,
          documentId: curso.documentId,
          nombre: attrs.nombre_curso || curso.nombre_curso,
          cantidadVersiones: versiones.length,
          tieneColegio,
          colegioId: colegioData?.id || colegioData?.documentId || null,
          colegioNombre: colegioData?.attributes?.colegio_nombre || colegioData?.colegio_nombre || null,
          estructuraColegio: {
            enAttrs: !!attrs.colegio,
            enCurso: !!curso.colegio,
            tieneData: !!colegioData,
            tipo: typeof attrs.colegio || typeof curso.colegio,
          },
        }

        cursosConVersiones.push(cursoInfo)

        if (tieneColegio) {
          cursosConVersionesYColegio.push(cursoInfo)
        } else {
          cursosConVersionesSinColegio.push(cursoInfo)
        }
      }
    })

    const resumen = {
      totalCursos: todosLosCursos.length,
      cursosConVersiones: cursosConVersiones.length,
      cursosConVersionesYColegio: cursosConVersionesYColegio.length,
      cursosConVersionesSinColegio: cursosConVersionesSinColegio.length,
      porcentajeConColegio: cursosConVersiones.length > 0 
        ? ((cursosConVersionesYColegio.length / cursosConVersiones.length) * 100).toFixed(2)
        : '0.00',
    }

    console.log('[Verificar Colegios Cursos] ✅ Verificación completada:', resumen)

    return NextResponse.json({
      success: true,
      resumen,
      detalles: {
        cursosConVersionesYColegio: cursosConVersionesYColegio.slice(0, 10),
        cursosConVersionesSinColegio: cursosConVersionesSinColegio.slice(0, 20),
      },
    }, { status: 200 })
  } catch (error: any) {
    console.error('[Verificar Colegios Cursos] ❌ Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al verificar',
        details: error.response?.data || error.data,
      },
      { status: 500 }
    )
  }
}
