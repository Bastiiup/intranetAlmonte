import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse } from '@/lib/strapi/types'
import { obtenerUltimaVersion } from '@/lib/utils/strapi'
import { obtenerFechaChileISO } from '@/lib/utils/dates'

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

    console.log('[API PUT /productos/:productId] Editando producto:', { cursoId, productId, body })

    // Obtener el curso
    const cursoResponse = await strapiClient.get<StrapiResponse<any>>(`/api/cursos/${cursoId}?populate=*`)
    
    if (!cursoResponse || !cursoResponse.data) {
      return NextResponse.json(
        { success: false, error: 'Curso no encontrado' },
        { status: 404 }
      )
    }

    const curso = cursoResponse.data
    const attrs = curso.attributes || curso
    const versiones = attrs.versiones_materiales || []
    
    // Obtener la última versión
    const ultimaVersion = obtenerUltimaVersion(versiones)
    
    if (!ultimaVersion) {
      return NextResponse.json(
        { success: false, error: 'No hay versiones de materiales' },
        { status: 404 }
      )
    }

    const materiales = ultimaVersion.materiales || []
    
    // Buscar el producto por ID
    const productoIndex = materiales.findIndex((p: any) => String(p.id) === String(productId))
    
    if (productoIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Producto no encontrado' },
        { status: 404 }
      )
    }

    // Actualizar el producto
    const productoActualizado = {
      ...materiales[productoIndex],
      ...body,
      // Mantener campos que no deberían cambiar
      id: materiales[productoIndex].id,
      coordenadas: materiales[productoIndex].coordenadas,
    }

    // Actualizar el array de materiales
    const nuevosMateriales = [...materiales]
    nuevosMateriales[productoIndex] = productoActualizado

    // Actualizar la versión
    const versionActualizada = {
      ...ultimaVersion,
      materiales: nuevosMateriales,
      fecha_actualizacion: obtenerFechaChileISO(),
    }

    // Actualizar las versiones - Comparar por fecha para evitar duplicados
    const fechaUltimaVersion = ultimaVersion.fecha_actualizacion || ultimaVersion.fecha_subida
    const otrasVersiones = versiones.filter((v: any) => {
      const fechaV = v.fecha_actualizacion || v.fecha_subida
      return fechaV !== fechaUltimaVersion
    })
    
    const versionesActualizadas = [versionActualizada, ...otrasVersiones]

    // Guardar en Strapi
    await strapiClient.put(`/api/cursos/${cursoId}`, {
      data: {
        versiones_materiales: versionesActualizadas,
      },
    })

    console.log('[API PUT /productos/:productId] ✅ Producto editado exitosamente')

    return NextResponse.json({
      success: true,
      message: 'Producto editado exitosamente',
      data: {
        producto: productoActualizado,
      },
    })
  } catch (error: any) {
    console.error('[API PUT /productos/:productId] ❌ Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al editar el producto',
      },
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

    console.log('[API DELETE /productos/:productId] Eliminando producto:', { cursoId, productId })

    // Obtener el curso
    const cursoResponse = await strapiClient.get<StrapiResponse<any>>(`/api/cursos/${cursoId}?populate=*`)
    
    if (!cursoResponse || !cursoResponse.data) {
      return NextResponse.json(
        { success: false, error: 'Curso no encontrado' },
        { status: 404 }
      )
    }

    const curso = cursoResponse.data
    const attrs = curso.attributes || curso
    const versiones = attrs.versiones_materiales || []
    
    // Obtener la última versión
    const ultimaVersion = obtenerUltimaVersion(versiones)
    
    if (!ultimaVersion) {
      return NextResponse.json(
        { success: false, error: 'No hay versiones de materiales' },
        { status: 404 }
      )
    }

    const materiales = ultimaVersion.materiales || []
    
    // Buscar el producto por ID
    const productoIndex = materiales.findIndex((p: any) => String(p.id) === String(productId))
    
    if (productoIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Producto no encontrado' },
        { status: 404 }
      )
    }

    const productoEliminado = materiales[productoIndex]

    // Eliminar el producto del array
    const nuevosMateriales = materiales.filter((_: any, index: number) => index !== productoIndex)

    console.log('[API DELETE] Materiales antes:', materiales.length)
    console.log('[API DELETE] Materiales después:', nuevosMateriales.length)

    // Actualizar la versión
    const versionActualizada = {
      ...ultimaVersion,
      materiales: nuevosMateriales,
      fecha_actualizacion: obtenerFechaChileISO(),
    }

    // Actualizar las versiones - Comparar por fecha para evitar duplicados
    const fechaUltimaVersion = ultimaVersion.fecha_actualizacion || ultimaVersion.fecha_subida
    const otrasVersiones = versiones.filter((v: any) => {
      const fechaV = v.fecha_actualizacion || v.fecha_subida
      return fechaV !== fechaUltimaVersion
    })
    
    const versionesActualizadas = [versionActualizada, ...otrasVersiones]

    console.log('[API DELETE] Versiones antes:', versiones.length)
    console.log('[API DELETE] Versiones después:', versionesActualizadas.length)

    // Guardar en Strapi
    const updateResponse = await strapiClient.put(`/api/cursos/${cursoId}`, {
      data: {
        versiones_materiales: versionesActualizadas,
      },
    })

    console.log('[API DELETE] Respuesta de Strapi:', updateResponse ? 'OK' : 'ERROR')

    console.log('[API DELETE /productos/:productId] ✅ Producto eliminado exitosamente:', productoEliminado.nombre)

    return NextResponse.json({
      success: true,
      message: 'Producto eliminado exitosamente',
      data: {
        productoEliminado,
        productosRestantes: nuevosMateriales.length,
      },
    })
  } catch (error: any) {
    console.error('[API DELETE /productos/:productId] ❌ Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al eliminar el producto',
      },
      { status: 500 }
    )
  }
}
