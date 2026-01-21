/**
 * API Route para editar y eliminar productos de una lista
 * PUT /api/crm/listas/[id]/productos/[productoId] - Editar producto
 * DELETE /api/crm/listas/[id]/productos/[productoId] - Eliminar producto
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'
import { createWooCommerceClient } from '@/lib/woocommerce/client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * PUT /api/crm/listas/[id]/productos/[productoId]
 * Edita un producto en la lista
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; productoId: string }> }
) {
  try {
    const { id, productoId } = await params
    const body = await request.json()

    if (!id || !productoId) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID de lista y producto son requeridos',
        },
        { status: 400 }
      )
    }

    console.log('[Editar Producto] 🚀 Editando producto...', { id, productoId, body })

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
      console.warn('[Editar Producto] ⚠️ Error al buscar por documentId:', docIdError.message)
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
        console.warn('[Editar Producto] ⚠️ Error al buscar por id numérico:', idError.message)
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
    
    // Buscar el producto (por ID, nombre o índice)
    let materialIndex = -1
    
    // Intentar por ID
    materialIndex = materiales.findIndex((m: any) => 
      m.id === productoId || String(m.id) === String(productoId)
    )
    
    // Si no se encuentra, intentar por nombre
    if (materialIndex === -1 && body.nombre) {
      materialIndex = materiales.findIndex((m: any) => 
        m.nombre === body.nombre ||
        (m.nombre && m.nombre.trim().toLowerCase() === body.nombre.trim().toLowerCase())
      )
    }
    
    // Si no se encuentra, intentar por índice
    if (materialIndex === -1 && body.index !== undefined) {
      materialIndex = body.index
    }

    if (materialIndex === -1) {
      console.error('[Editar Producto] ❌ Producto no encontrado. Buscado:', {
        productoId,
        nombre: body.nombre,
        index: body.index,
        totalMateriales: materiales.length,
        primerosMateriales: materiales.slice(0, 3).map((m: any, i: number) => ({
          index: i,
          id: m.id,
          nombre: m.nombre
        }))
      })
      return NextResponse.json(
        {
          success: false,
          error: 'Producto no encontrado en la lista',
          detalles: `Buscado: ID=${productoId}, Nombre=${body.nombre}, Index=${body.index}. Total materiales: ${materiales.length}`,
        },
        { status: 404 }
      )
    }

    console.log('[Editar Producto] ✅ Producto encontrado en índice:', materialIndex, {
      productoActual: materiales[materialIndex],
      nuevosDatos: body
    })

    // Actualizar el producto con los nuevos datos
    const productoActualizado = {
      ...materiales[materialIndex],
      ...body, // Sobrescribir con los nuevos datos
      // Mantener campos importantes si no se proporcionan
      id: materiales[materialIndex].id || `producto-${materialIndex + 1}`,
      // Asegurar que los campos numéricos sean números
      cantidad: body.cantidad !== undefined ? parseInt(String(body.cantidad)) : materiales[materialIndex].cantidad,
      precio: body.precio !== undefined ? parseFloat(String(body.precio)) : materiales[materialIndex].precio,
    }
    
    console.log('[Editar Producto] 📝 Producto actualizado:', productoActualizado)

    // Reemplazar el producto en el array
    materiales[materialIndex] = productoActualizado

    // Actualizar la última versión
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

    const updateData = {
      data: {
        versiones_materiales: versionesActualizadas,
      },
    }

    console.log('[Editar Producto] 💾 Guardando en Strapi...')
    const response = await strapiClient.put<any>(`/api/cursos/${cursoDocumentId}`, updateData)

    if ((response as any)?.error) {
      throw new Error(`Strapi devolvió un error: ${JSON.stringify((response as any).error)}`)
    }

    console.log('[Editar Producto] ✅ Producto editado exitosamente en Strapi')

    // ============================================
    // ACTUALIZAR EN WOOCOMMERCE SI TIENE woocommerce_id
    // ============================================
    const productoOriginal = materiales[materialIndex]
    const woocommerceId = productoActualizado.woocommerce_id || productoOriginal.woocommerce_id
    const actualizacionesWooCommerce: string[] = []
    
    console.log('[Editar Producto] 🔍 Verificando actualización en WooCommerce...', {
      woocommerceId,
      productoOriginal: {
        nombre: productoOriginal.nombre,
        precio: productoOriginal.precio,
        isbn: productoOriginal.isbn,
        stock_quantity: productoOriginal.stock_quantity,
        woocommerce_id: productoOriginal.woocommerce_id
      },
      body: {
        nombre: body.nombre,
        precio: body.precio,
        isbn: body.isbn,
        stock_quantity: body.stock_quantity
      }
    })
    
    if (woocommerceId) {
      try {
        console.log('[Editar Producto] 🔄 Actualizando producto en WooCommerce...', { woocommerceId })
        
        const wooCommerceClient = createWooCommerceClient('woo_escolar')
        const updateDataWooCommerce: any = {}
        
        // Actualizar nombre si cambió
        if (body.nombre && body.nombre.trim() !== (productoOriginal.nombre || '').trim()) {
          updateDataWooCommerce.name = body.nombre.trim()
          actualizacionesWooCommerce.push(`nombre: "${productoOriginal.nombre}" -> "${body.nombre}"`)
          console.log('[Editar Producto] 📝 Nombre cambió, se actualizará en WooCommerce')
        }
        
        // Actualizar precio si cambió (comparar números)
        const precioOriginal = parseFloat(String(productoOriginal.precio || 0))
        const precioNuevo = parseFloat(String(body.precio || 0))
        if (body.precio !== undefined && precioNuevo !== precioOriginal) {
          updateDataWooCommerce.regular_price = String(precioNuevo)
          actualizacionesWooCommerce.push(`precio: ${precioOriginal} -> ${precioNuevo}`)
          console.log('[Editar Producto] 💰 Precio cambió, se actualizará en WooCommerce')
        }
        
        // Actualizar SKU/ISBN si cambió
        const isbnOriginal = String(productoOriginal.isbn || '').trim()
        const isbnNuevo = String(body.isbn || '').trim()
        if (body.isbn !== undefined && isbnNuevo !== isbnOriginal) {
          updateDataWooCommerce.sku = isbnNuevo || ''
          actualizacionesWooCommerce.push(`SKU/ISBN: "${isbnOriginal}" -> "${isbnNuevo}"`)
          console.log('[Editar Producto] 🏷️ SKU/ISBN cambió, se actualizará en WooCommerce')
        }
        
        // Actualizar descripción si cambió
        const descripcionOriginal = String(productoOriginal.descripcion || '').trim()
        const descripcionNueva = String(body.descripcion || '').trim()
        if (body.descripcion !== undefined && descripcionNueva !== descripcionOriginal) {
          updateDataWooCommerce.description = descripcionNueva || ''
          actualizacionesWooCommerce.push(`descripción actualizada`)
          console.log('[Editar Producto] 📄 Descripción cambió, se actualizará en WooCommerce')
        }
        
        // Actualizar stock si se proporciona (siempre actualizar si se envía)
        if (body.stock_quantity !== undefined) {
          const stockOriginal = parseInt(String(productoOriginal.stock_quantity || 0))
          const nuevoStock = parseInt(String(body.stock_quantity)) || 0
          updateDataWooCommerce.stock_quantity = nuevoStock
          updateDataWooCommerce.stock_status = nuevoStock > 0 ? 'instock' : 'outofstock'
          actualizacionesWooCommerce.push(`stock: ${stockOriginal} -> ${nuevoStock}`)
          console.log('[Editar Producto] 📦 Stock cambió, se actualizará en WooCommerce')
        }
        
        // Solo actualizar si hay cambios
        if (Object.keys(updateDataWooCommerce).length > 0) {
          console.log('[Editar Producto] 📤 Datos a actualizar en WooCommerce:', JSON.stringify(updateDataWooCommerce, null, 2))
          
          const wooResponse = await wooCommerceClient.put<any>(`products/${woocommerceId}`, updateDataWooCommerce)
          
          console.log('[Editar Producto] ✅ Producto actualizado en WooCommerce:', {
            woocommerceId,
            actualizaciones: actualizacionesWooCommerce,
            respuesta: wooResponse ? 'OK' : 'Sin respuesta'
          })
        } else {
          console.log('[Editar Producto] ⚠️ No hay cambios para actualizar en WooCommerce (todos los valores son iguales)')
        }
      } catch (wooError: any) {
        // No fallar la operación completa si falla WooCommerce, solo loguear
        console.error('[Editar Producto] ❌ Error al actualizar en WooCommerce:', {
          woocommerceId,
          error: wooError.message,
          stack: wooError.stack,
          response: wooError.response?.data || wooError.response || 'Sin respuesta'
        })
        // Continuar con la respuesta exitosa de Strapi pero indicar el error
        actualizacionesWooCommerce.push(`ERROR: ${wooError.message}`)
      }
    } else {
      console.log('[Editar Producto] ℹ️ Producto no tiene woocommerce_id, solo se actualizó en Strapi')
    }

    return NextResponse.json({
      success: true,
      message: 'Producto editado exitosamente',
      data: {
        producto: productoActualizado,
        index: materialIndex,
        actualizadoEnWooCommerce: !!woocommerceId,
        actualizacionesWooCommerce: actualizacionesWooCommerce.length > 0 ? actualizacionesWooCommerce : undefined,
      },
    }, { status: 200 })

  } catch (error: any) {
    console.error('[Editar Producto] ❌ Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al editar el producto',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/crm/listas/[id]/productos/[productoId]
 * Elimina un producto de la lista
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; productoId: string }> }
) {
  try {
    const { id, productoId } = await params

    if (!id || !productoId) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID de lista y producto son requeridos',
        },
        { status: 400 }
      )
    }

    console.log('[Eliminar Producto] 🗑️ Eliminando producto...', { id, productoId })

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
      console.warn('[Eliminar Producto] ⚠️ Error al buscar por documentId:', docIdError.message)
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
    
    // Buscar el producto
    let materialIndex = materiales.findIndex((m: any) => 
      m.id === productoId || 
      String(m.id) === String(productoId) ||
      m.nombre === productoId
    )

    if (materialIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          error: 'Producto no encontrado en la lista',
        },
        { status: 404 }
      )
    }

    // Eliminar el producto del array
    const productoEliminado = materiales[materialIndex]
    materiales.splice(materialIndex, 1)

    // Actualizar la última versión
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

    const updateData = {
      data: {
        versiones_materiales: versionesActualizadas,
      },
    }

    console.log('[Eliminar Producto] 💾 Guardando en Strapi...')
    const response = await strapiClient.put<any>(`/api/cursos/${cursoDocumentId}`, updateData)

    if ((response as any)?.error) {
      throw new Error(`Strapi devolvió un error: ${JSON.stringify((response as any).error)}`)
    }

    console.log('[Eliminar Producto] ✅ Producto eliminado exitosamente')

    return NextResponse.json({
      success: true,
      message: 'Producto eliminado exitosamente',
      data: {
        productoEliminado,
        totalProductos: materiales.length,
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
