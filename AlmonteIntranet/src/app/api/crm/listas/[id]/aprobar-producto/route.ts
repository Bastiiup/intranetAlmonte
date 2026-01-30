/**
 * API Route para aprobar un producto individual en una lista
 * POST /api/crm/listas/[id]/aprobar-producto
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { productoId, productoNombre, productoIndex, aprobado } = body

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID de lista es requerido',
        },
        { status: 400 }
      )
    }

    if (productoId === undefined || aprobado === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'productoId y aprobado son requeridos',
        },
        { status: 400 }
      )
    }

    console.log('[Aprobar Producto] 🔍 Buscando producto:', {
      productoId,
      productoNombre,
      productoIndex,
      aprobado
    })

    console.log('[Aprobar Producto] 🚀 Iniciando aprobación...', { id, productoId, aprobado })

    // Obtener curso desde Strapi
    let curso: any = null

    try {
      const paramsDocId = new URLSearchParams({
        'filters[documentId][$eq]': String(id),
        'publicationState': 'preview',
      })
      const cursoResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>[]>>(
        `/api/cursos?${paramsDocId.toString()}`
      )
      
      if (cursoResponse.data && Array.isArray(cursoResponse.data) && cursoResponse.data.length > 0) {
        curso = cursoResponse.data[0]
      } else if (cursoResponse.data && !Array.isArray(cursoResponse.data)) {
        curso = cursoResponse.data
      }
    } catch (docIdError: any) {
      console.warn('[Aprobar Producto] ⚠️ Error al buscar por documentId:', docIdError.message)
    }

    // Si no se encontró con documentId, intentar con id numérico
    if (!curso && /^\d+$/.test(String(id))) {
      try {
        const cursoResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
          `/api/cursos/${id}?publicationState=preview`
        )
        
        if (cursoResponse.data) {
          curso = Array.isArray(cursoResponse.data) ? cursoResponse.data[0] : cursoResponse.data
        }
      } catch (idError: any) {
        console.warn('[Aprobar Producto] ⚠️ Error al buscar por id numérico:', idError.message)
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

    // Actualizar el producto específico en los materiales
    const materiales = ultimaVersion.materiales || []
    
    console.log('[Aprobar Producto] 📋 Materiales disponibles:', materiales.length)
    console.log('[Aprobar Producto] 📋 Primeros materiales:', materiales.slice(0, 3).map((m: any, i: number) => ({
      index: i,
      id: m.id,
      nombre: m.nombre,
      todas_las_keys: Object.keys(m)
    })))
    
    // Buscar por múltiples criterios (ID, nombre, índice)
    let materialIndex = -1
    
    // 1. Intentar por ID exacto
    if (materialIndex === -1) {
      materialIndex = materiales.findIndex((m: any) => 
        m.id === productoId || 
        String(m.id) === String(productoId)
      )
    }
    
    // 2. Intentar por nombre (si se proporcionó)
    if (materialIndex === -1 && productoNombre) {
      materialIndex = materiales.findIndex((m: any) => 
        m.nombre === productoNombre ||
        (m.nombre && m.nombre.trim().toLowerCase() === productoNombre.trim().toLowerCase())
      )
    }
    
    // 3. Intentar por índice (si se proporcionó)
    if (materialIndex === -1 && productoIndex !== undefined && productoIndex >= 0 && productoIndex < materiales.length) {
      materialIndex = productoIndex
    }
    
    // 4. Último intento: buscar por nombre parcial o ID como string
    if (materialIndex === -1) {
      materialIndex = materiales.findIndex((m: any) => {
        const mId = String(m.id || '')
        const mNombre = String(m.nombre || '').toLowerCase()
        const searchId = String(productoId).toLowerCase()
        const searchNombre = productoNombre ? String(productoNombre).toLowerCase() : ''
        
        return mId.includes(searchId) || 
               mNombre.includes(searchNombre) ||
               searchNombre.includes(mNombre)
      })
    }

    if (materialIndex === -1) {
      console.error('[Aprobar Producto] ❌ Producto no encontrado. Buscado:', {
        productoId,
        productoNombre,
        productoIndex,
        materialesCount: materiales.length,
        materialesIds: materiales.map((m: any, i: number) => ({ index: i, id: m.id, nombre: m.nombre }))
      })
      return NextResponse.json(
        {
          success: false,
          error: 'Producto no encontrado en la lista',
          detalles: `Buscado: ID=${productoId}, Nombre=${productoNombre}, Index=${productoIndex}. Total materiales: ${materiales.length}`,
        },
        { status: 404 }
      )
    }

    console.log('[Aprobar Producto] ✅ Producto encontrado en índice:', materialIndex, {
      materialId: materiales[materialIndex]?.id,
      materialNombre: materiales[materialIndex]?.nombre
    })

    // Actualizar el estado de aprobación del producto
    materiales[materialIndex] = {
      ...materiales[materialIndex],
      aprobado: aprobado === true,
      fecha_aprobacion: aprobado ? new Date().toISOString() : null,
    }

    // Actualizar la última versión con los materiales modificados
    const versionesActualizadas = versiones.map((v: any) => {
      const isUltimaVersion = v.id === ultimaVersion.id || 
                             (v.fecha_subida === ultimaVersion.fecha_subida && 
                              v.fecha_actualizacion === ultimaVersion.fecha_actualizacion) ||
                             v === ultimaVersion
      
      if (isUltimaVersion) {
        return {
          ...v,
          materiales: materiales,
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

    // Verificar si todos los productos están aprobados
    const todosAprobados = materiales.every((m: any) => m.aprobado === true)
    const listaAprobada = todosAprobados && materiales.length > 0

    // Preparar datos de actualización
    const updateData: any = {
      data: {
        versiones_materiales: versionesActualizadas,
      },
    }

    // Si todos los productos están aprobados, actualizar estado_revision a "revisado"
    if (listaAprobada) {
      updateData.data.estado_revision = 'revisado'
      updateData.data.fecha_revision = new Date().toISOString()
      console.log('[Aprobar Producto] ✅ Todos los productos están aprobados - actualizando estado_revision a "revisado"')
    } else if (aprobado === false) {
      // Si se está desaprobando un producto y el estado era "revisado", volver a "borrador"
      const estadoActual = attrs.estado_revision
      if (estadoActual === 'revisado') {
        updateData.data.estado_revision = 'borrador'
        console.log('[Aprobar Producto] ⚠️ Producto desaprobado - cambiando estado_revision a "borrador"')
      }
    }

    console.log('[Aprobar Producto] 💾 Guardando en Strapi...')
    const response = await strapiClient.put<any>(`/api/cursos/${cursoDocumentId}`, updateData)

    if ((response as any)?.error) {
      throw new Error(`Strapi devolvió un error: ${JSON.stringify((response as any).error)}`)
    }

    console.log('[Aprobar Producto] ✅ Producto aprobado exitosamente')

    return NextResponse.json({
      success: true,
      message: aprobado ? 'Producto aprobado' : 'Aprobación removida',
      data: {
        productoId,
        aprobado,
        todosAprobados,
        listaAprobada,
        totalProductos: materiales.length,
        productosAprobados: materiales.filter((m: any) => m.aprobado === true).length,
      },
    }, { status: 200 })

  } catch (error: any) {
    console.error('[Aprobar Producto] ❌ Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al aprobar el producto',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
