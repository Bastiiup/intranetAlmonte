/**
 * POST - Reordenar productos (materiales) y actualizar orden, categoría y asignatura
 * Body: { orderedIds: (string|number)[], productos?: { id: string|number, orden?: number, categoria?: string, asignatura?: string }[] }
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse } from '@/lib/strapi/types'
import { obtenerUltimaVersion } from '@/lib/utils/strapi'
import { obtenerFechaChileISO } from '@/lib/utils/dates'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: cursoId } = await params
    const body = await request.json()
    const { orderedIds = [], productos: productosPayload = [] } = body as {
      orderedIds: (string | number)[]
      productos?: { id: string | number; orden?: number; categoria?: string; asignatura?: string }[]
    }

    const cursoResponse = await strapiClient.get<StrapiResponse<any>>(`/api/cursos/${cursoId}?populate=*`)
    if (!cursoResponse?.data) {
      return NextResponse.json({ success: false, error: 'Curso no encontrado' }, { status: 404 })
    }

    const curso = cursoResponse.data
    const attrs = curso.attributes || curso
    const versiones = attrs.versiones_materiales || []
    const ultimaVersion = obtenerUltimaVersion(versiones)
    if (!ultimaVersion) {
      return NextResponse.json({ success: false, error: 'No hay versiones de materiales' }, { status: 404 })
    }

    const materiales = ultimaVersion.materiales || []
    const mapPayload = new Map(
      productosPayload.map((p) => [String(p.id), p])
    )

    // Reordenar según orderedIds y actualizar orden (1-based)
    const reordenados: any[] = []
    const used = new Set<string>()
    for (let i = 0; i < orderedIds.length; i++) {
      const id = String(orderedIds[i])
      const mat = materiales.find((m: any) => String(m.id) === id)
      if (mat) {
        const extra = mapPayload.get(id) || ({} as { categoria?: string; asignatura?: string })
        reordenados.push({
          ...mat,
          orden: i + 1,
          ...(extra.categoria !== undefined && { categoria: extra.categoria }),
          ...(extra.asignatura !== undefined && { asignatura: extra.asignatura }),
        })
        used.add(id)
      }
    }
    // Añadir cualquier material que no estuviera en orderedIds al final
    materiales.forEach((m: any) => {
      const id = String(m.id)
      if (!used.has(id)) {
        const extra = mapPayload.get(id) || ({} as { categoria?: string; asignatura?: string })
        reordenados.push({
          ...m,
          orden: reordenados.length + 1,
          ...(extra.categoria !== undefined && { categoria: extra.categoria }),
          ...(extra.asignatura !== undefined && { asignatura: extra.asignatura }),
        })
      }
    })

    const versionActualizada = {
      ...ultimaVersion,
      materiales: reordenados,
      fecha_actualizacion: obtenerFechaChileISO(),
    }
    const fechaUltimaVersion = ultimaVersion.fecha_actualizacion || ultimaVersion.fecha_subida
    const otrasVersiones = versiones.filter((v: any) => {
      const fechaV = v.fecha_actualizacion || v.fecha_subida
      return fechaV !== fechaUltimaVersion
    })
    const versionesActualizadas = [versionActualizada, ...otrasVersiones]

    await strapiClient.put(`/api/cursos/${cursoId}`, {
      data: { versiones_materiales: versionesActualizadas },
    })

    return NextResponse.json({
      success: true,
      message: 'Orden actualizado',
      data: { materiales: reordenados },
    })
  } catch (error: any) {
    console.error('[API POST /productos/reorder] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Error al reordenar' },
      { status: 500 }
    )
  }
}
