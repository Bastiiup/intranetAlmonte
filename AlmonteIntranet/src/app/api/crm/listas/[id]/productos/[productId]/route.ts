/**
 * API Route para editar y eliminar un producto individual
 * PUT    /api/crm/listas/[id]/productos/[productId]
 * DELETE /api/crm/listas/[id]/productos/[productId]
 *
 * Usa el mismo patrón que /productos/reorder (que funciona)
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse } from '@/lib/strapi/types'
import { obtenerUltimaVersion } from '@/lib/utils/strapi'
import { obtenerFechaChileISO } from '@/lib/utils/dates'
import { buscarProductoFlexible } from '@/lib/utils/productos'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{
    id: string
    productId: string
  }>
}

/**
 * PUT - Editar un producto específico
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: cursoId, productId } = await params
    const body = await request.json()

    console.log('[API PUT] Editando producto:', { cursoId, productId })

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

    // Extraer datos de identificación flexible del body
    const { _originalNombre, _productoIndex, ...datosProducto } = body

    // Usar buscarProductoFlexible (mismo patrón que aprobar-producto que funciona)
    const productoEncontrado = buscarProductoFlexible(
      materiales,
      productId,
      _originalNombre,
      _productoIndex !== undefined ? Number(_productoIndex) : undefined
    )

    if (!productoEncontrado) {
      console.error('[API PUT] Producto no encontrado:', { productId, _originalNombre, _productoIndex, ids: materiales.map((m: any) => m.id), nombres: materiales.map((m: any) => m.nombre) })
      return NextResponse.json({ success: false, error: 'Producto no encontrado' }, { status: 404 })
    }

    const productoIndex = materiales.findIndex((p: any) => p === productoEncontrado)

    // Actualizar producto conservando campos internos
    const productoActualizado = {
      ...materiales[productoIndex],
      ...datosProducto,
      id: materiales[productoIndex].id,
      coordenadas: materiales[productoIndex].coordenadas,
      fecha_edicion: obtenerFechaChileISO(),
    }

    const nuevosMateriales = [...materiales]
    nuevosMateriales[productoIndex] = productoActualizado

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

    console.log('[API PUT] Producto editado exitosamente')

    return NextResponse.json({
      success: true,
      message: 'Producto editado exitosamente',
      data: { producto: productoActualizado },
    })
  } catch (error: any) {
    console.error('[API PUT] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Error al editar el producto' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Eliminar un producto específico
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: cursoId, productId } = await params
    const body = await request.json().catch(() => ({}))

    console.log('[API DELETE] Eliminando producto:', { cursoId, productId })

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

    // Usar buscarProductoFlexible para encontrar el producto
    const productoEncontrado = buscarProductoFlexible(
      materiales,
      productId,
      body?.nombre,
      body?.index !== undefined ? Number(body.index) : undefined
    )

    if (!productoEncontrado) {
      console.error('[API DELETE] Producto no encontrado:', { productId, ids: materiales.map((m: any) => m.id) })
      return NextResponse.json({ success: false, error: 'Producto no encontrado' }, { status: 404 })
    }

    const productoIndex = materiales.findIndex((p: any) => p === productoEncontrado)
    const productoEliminado = materiales[productoIndex]
    const nuevosMateriales = materiales.filter((_: any, index: number) => index !== productoIndex)

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

    console.log('[API DELETE] Producto eliminado:', productoEliminado.nombre)

    return NextResponse.json({
      success: true,
      message: 'Producto eliminado exitosamente',
      data: {
        productoEliminado: productoEliminado.nombre,
        productosRestantes: nuevosMateriales.length,
      },
    })
  } catch (error: any) {
    console.error('[API DELETE] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Error al eliminar el producto' },
      { status: 500 }
    )
  }
}
