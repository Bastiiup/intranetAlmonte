/**
 * API Route para debug: verificar colegio por RBD
 * GET /api/crm/listas/debug-colegio?rbd=24508
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rbd = searchParams.get('rbd')

    if (!rbd) {
      return NextResponse.json({
        success: false,
        error: 'RBD es requerido',
      }, { status: 400 })
    }

    console.log(`[DEBUG] Buscando colegio con RBD: ${rbd}`)

    // Buscar colegio por RBD
    const colegioResponse = await strapiClient.get<any>(
      `/api/colegios?filters[rbd][$eq]=${rbd}&populate=*`
    )

    const colegios = Array.isArray(colegioResponse.data) ? colegioResponse.data : [colegioResponse.data]
    console.log(`[DEBUG] Colegios encontrados: ${colegios.length}`)

    if (colegios.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No se encontró colegio con RBD ${rbd}`,
        rbd,
      }, { status: 404 })
    }

    const colegio = colegios[0]
    const colegioId = colegio.id || colegio.documentId
    const colegioAttrs = colegio.attributes || colegio

    console.log(`[DEBUG] Colegio encontrado:`, {
      id: colegioId,
      nombre: colegioAttrs.colegio_nombre,
      rbd: colegioAttrs.rbd,
    })

    // Buscar cursos del colegio
    const cursosResponse = await strapiClient.get<any>(
      `/api/cursos?filters[colegio][documentId][$eq]=${colegioId}&populate=colegio&pagination[pageSize]=1000`
    )

    const cursos = Array.isArray(cursosResponse.data) ? cursosResponse.data : [cursosResponse.data]
    console.log(`[DEBUG] Cursos encontrados: ${cursos.length}`)

    // Analizar cada curso
    const cursosAnalizados = cursos.map((curso: any) => {
      const attrs = curso.attributes || curso
      const versiones = attrs.versiones_materiales || []
      
      return {
        id: curso.id || curso.documentId,
        nombre: attrs.nombre_curso || 'Sin nombre',
        nivel: attrs.nivel,
        grado: attrs.grado,
        año: attrs.anio || attrs.año,
        tieneVersiones: versiones.length > 0,
        cantidadVersiones: versiones.length,
        versiones: versiones.map((v: any) => ({
          id: v.id,
          nombre_archivo: v.nombre_archivo,
          fecha_subida: v.fecha_subida,
          cantidad_materiales: v.materiales?.length || 0,
        })),
      }
    })

    const cursosConListas = cursosAnalizados.filter((c: any) => c.tieneVersiones)

    return NextResponse.json({
      success: true,
      colegio: {
        id: colegioId,
        documentId: colegio.documentId || String(colegioId),
        nombre: colegioAttrs.colegio_nombre,
        rbd: colegioAttrs.rbd,
      },
      totalCursos: cursos.length,
      cursosConListas: cursosConListas.length,
      cursos: cursosAnalizados,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[DEBUG] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al buscar colegio',
      stack: error.stack,
    }, { status: 500 })
  }
}
