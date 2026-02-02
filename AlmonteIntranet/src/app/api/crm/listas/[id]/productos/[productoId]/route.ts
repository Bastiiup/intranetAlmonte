/**
 * API Route para eliminar un producto de una lista
 * DELETE /api/crm/listas/[id]/productos/[productoId]
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; productoId: string }> | { id: string; productoId: string } }
) {
  try {
    const params = await Promise.resolve(context.params)
    const { id: listaId, productoId } = params

    console.log('[Eliminar Producto] 🗑️ Eliminando producto...', { listaId, productoId })

    if (!listaId || !productoId) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID de lista y producto requeridos',
        },
        { status: 400 }
      )
    }

    // Obtener datos del body (opcional: nombre e índice del producto)
    const body = await request.json().catch(() => ({}))
    const { nombre, index } = body

    console.log('[Eliminar Producto] 📝 Datos recibidos:', { nombre, index })

    // Obtener curso desde Strapi
    let curso: any = null

    try {
      const paramsDocId = new URLSearchParams({
        'filters[documentId][$eq]': String(listaId),
        'publicationState': 'preview',
      })
      const cursoResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>[]>>(
        `/api/cursos?${paramsDocId.toString()}`
      )
      
      if (cursoResponse.data && Array.isArray(cursoResponse.data) && cursoResponse.data.length > 0) {
        curso = cursoResponse.data[0]
      }
    } catch (docIdError: any) {
      console.warn('[Eliminar Producto] ⚠️ Error al buscar por documentId:', docIdError.message)
    }

    // Si no se encontró con documentId, intentar con id numérico
    if (!curso && /^\d+$/.test(String(listaId))) {
      try {
        const cursoResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
          `/api/cursos/${listaId}?publicationState=preview`
        )
        
        if (cursoResponse.data) {
          curso = Array.isArray(cursoResponse.data) ? cursoResponse.data[0] : cursoResponse.data
        }
      } catch (idError: any) {
        console.warn('[Eliminar Producto] ⚠️ Error al buscar por id numérico:', idError.message)
      }
    }

    if (!curso) {
      return NextResponse.json(
        {
          success: false,
          error: 'Lista no encontrada',
        },
        { status: 404 }
      )
    }

    const attrs = curso.attributes || curso
    const versiones = attrs.versiones_materiales || []
    const ultimaVersion = versiones.length > 0 
      ? versiones.sort((a: any, b: any) => {
          const fechaA = new Date(a.fecha_actualizacion || a.fecha_subida || 0).getTime()
          const fechaB = new Date(b.fecha_actualizacion || b.fecha_subida || 0).getTime()
          return fechaB - fechaA
        })[0]
      : null

    if (!ultimaVersion) {
      return NextResponse.json(
        {
          success: false,
          error: 'No hay versión de materiales disponible',
        },
        { status: 400 }
      )
    }

    const materiales = ultimaVersion.materiales || []
    
    if (materiales.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'La lista no tiene productos',
        },
        { status: 400 }
      )
    }

    // Encontrar y eliminar el producto
    let productoEliminado = false
    let materialesActualizados = materiales.filter((m: any, idx: number) => {
      // Buscar por ID, nombre o índice
      const matchId = m.id === productoId || m.productoId === productoId
      const matchNombre = nombre && m.nombre === nombre
      const matchIndex = index !== undefined && idx === index
      
      if (matchId || matchNombre || matchIndex) {
        console.log('[Eliminar Producto] ✅ Producto encontrado y eliminado:', {
          id: m.id,
          nombre: m.nombre,
          matchId,
          matchNombre,
          matchIndex,
        })
        productoEliminado = true
        return false // Eliminar este elemento
      }
      return true // Mantener este elemento
    })

    if (!productoEliminado) {
      return NextResponse.json(
        {
          success: false,
          error: 'Producto no encontrado en la lista',
        },
        { status: 404 }
      )
    }

    // Actualizar la última versión
    const versionesActualizadas = versiones.map((v: any) => {
      const isUltimaVersion = v.id === ultimaVersion.id || 
                             (v.fecha_subida === ultimaVersion.fecha_subida && 
                              v.fecha_actualizacion === ultimaVersion.fecha_actualizacion) ||
                             v === ultimaVersion
      
      if (isUltimaVersion) {
        return {
          ...v,
          materiales: materialesActualizados,
          fecha_actualizacion: new Date().toISOString(),
        }
      }
      return v
    })

    // Guardar en Strapi
    const cursoDocumentId = curso.documentId || curso.id
    if (!cursoDocumentId) {
      return NextResponse.json(
        {
          success: false,
          error: 'El curso no tiene documentId válido',
        },
        { status: 400 }
      )
    }

    const updateData = {
      data: {
        versiones_materiales: versionesActualizadas,
      },
    }

    console.log('[Eliminar Producto] 💾 Guardando cambios en Strapi...')
    const response = await strapiClient.put<any>(`/api/cursos/${cursoDocumentId}`, updateData)

    if ((response as any)?.error) {
      throw new Error(`Strapi devolvió un error: ${JSON.stringify((response as any).error)}`)
    }

    console.log('[Eliminar Producto] ✅ Producto eliminado exitosamente')

    return NextResponse.json({
      success: true,
      message: 'Producto eliminado exitosamente',
      data: {
        listaId,
        productoId,
        totalProductosRestantes: materialesActualizados.length,
      },
    }, { status: 200 })

  } catch (error: any) {
    console.error('[Eliminar Producto] ❌ Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al eliminar el producto',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
