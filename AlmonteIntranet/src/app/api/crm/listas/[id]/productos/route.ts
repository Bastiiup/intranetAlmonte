/**
 * API Route para agregar un producto a la lista
 * POST /api/crm/listas/[id]/productos
 *
 * Usa el mismo patrón que reorder y [productId] (que funcionan)
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse } from '@/lib/strapi/types'
import { obtenerUltimaVersion } from '@/lib/utils/strapi'
import { obtenerFechaChileISO } from '@/lib/utils/dates'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * POST - Agregar un nuevo producto a la lista
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: cursoId } = await params
    const body = await request.json()

    console.log('[API POST] Agregando producto:', { cursoId, nombre: body.nombre })

    if (!body.nombre || !body.nombre.trim()) {
      return NextResponse.json({ success: false, error: 'El nombre del producto es obligatorio' }, { status: 400 })
    }

    // Mismo patrón que reorder (que funciona)
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

    // Generar ID único para el nuevo producto
    const maxIdNum = materiales.reduce((max: number, m: any) => {
      const match = String(m.id || '').match(/producto-(\d+)/)
      return match ? Math.max(max, parseInt(match[1])) : max
    }, 0)
    const nuevoId = `producto-${maxIdNum + 1}`

    // Crear el nuevo producto
    const nuevoProducto = {
      id: nuevoId,
      nombre: body.nombre.trim(),
      cantidad: body.cantidad || 1,
      isbn: body.isbn || '',
      marca: body.marca || '',
      precio: body.precio || 0,
      orden: body.orden || materiales.length + 1,
      categoria: body.categoria || '',
      asignatura: body.asignatura || '',
      descripcion: body.descripcion || '',
      comprar: body.comprar !== false,
      validado: false,
      aprobado: false,
      disponibilidad: 'no_encontrado',
      encontrado_en_woocommerce: false,
      fecha_creacion: obtenerFechaChileISO(),
    }

    // Insertar en la posición correcta según el orden
    const nuevosMateriales = [...materiales]
    const insertIndex = Math.min(Math.max((nuevoProducto.orden - 1), 0), nuevosMateriales.length)
    nuevosMateriales.splice(insertIndex, 0, nuevoProducto)

    // Recalcular orden de todos los productos
    nuevosMateriales.forEach((m: any, i: number) => {
      m.orden = i + 1
    })

    // Mismo patrón de versiones que reorder
    const versionActualizada = {
      ...ultimaVersion,
      materiales: nuevosMateriales,
      fecha_actualizacion: obtenerFechaChileISO(),
    }
    const fechaUltimaVersion = ultimaVersion.fecha_actualizacion || ultimaVersion.fecha_subida
    const otrasVersiones = versiones.filter((v: any) => {
      const fechaV = v.fecha_actualizacion || v.fecha_subida
      return fechaV !== fechaUltimaVersion
    })
    const versionesActualizadas = [versionActualizada, ...otrasVersiones]

    // Guardar en Strapi (mismo patrón que reorder)
    await strapiClient.put(`/api/cursos/${cursoId}`, {
      data: { versiones_materiales: versionesActualizadas },
    })

    console.log('[API POST] Producto agregado exitosamente:', nuevoProducto.nombre)

    return NextResponse.json({
      success: true,
      message: 'Producto agregado exitosamente',
      data: { producto: nuevoProducto },
    })
  } catch (error: any) {
    console.error('[API POST] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Error al agregar el producto' },
      { status: 500 }
    )
  }
}
