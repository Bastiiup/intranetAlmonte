import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

/**
 * POST /api/compras/ordenes-compra/[id]/confirmar-recepcion
 * Confirma la recepción física de productos y los agrega al inventario
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Primero, buscar la orden de compra para obtener el documentId correcto
    const isNumericId = /^\d+$/.test(id)
    let ordenCompra: StrapiEntity<any> | null = null
    let ordenIdParaUpdate: string | number = id
    
    try {
      const ordenResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
        `/api/ordenes-compra/${id}?fields[0]=id&fields[1]=documentId`
      )
      
      if (ordenResponse.data) {
        ordenCompra = Array.isArray(ordenResponse.data) ? ordenResponse.data[0] : ordenResponse.data
        ordenIdParaUpdate = ordenCompra.documentId || ordenCompra.id || id
      }
    } catch (ordenError: any) {
      if (ordenError.status === 404) {
        try {
          const searchParams = new URLSearchParams({
            ...(isNumericId ? { 'filters[id][$eq]': id } : { 'filters[documentId][$eq]': id }),
            'fields[0]': 'id',
            'fields[1]': 'documentId',
          })
          
          const filterResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
            `/api/ordenes-compra?${searchParams.toString()}`
          )
          
          if (filterResponse.data) {
            const ordenes = Array.isArray(filterResponse.data) ? filterResponse.data : [filterResponse.data]
            if (ordenes.length > 0) {
              ordenCompra = ordenes[0]
              ordenIdParaUpdate = ordenCompra.documentId || ordenCompra.id || id
            }
          }
        } catch (filterError: any) {
          console.error('[Confirmar Recepción] Error al buscar orden:', filterError.message)
        }
      }
    }
    
    if (!ordenCompra) {
      return NextResponse.json(
        {
          success: false,
          error: `Orden de compra no encontrada con ID: ${id}`,
        },
        { status: 404 }
      )
    }
    
    // Obtener la orden de compra completa con relaciones
    const poResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
      `/api/ordenes-compra/${ordenIdParaUpdate}?populate[cotizacion_recibida][populate][rfq][populate][productos]=true&populate[cotizacion_recibida][populate][items]=true`
    )
    
    if (!poResponse.data) {
      return NextResponse.json(
        {
          success: false,
          error: 'Orden de compra no encontrada',
        },
        { status: 404 }
      )
    }
    
    const po = Array.isArray(poResponse.data) ? poResponse.data[0] : poResponse.data
    const attrs = po.attributes || po
    const estadoActual = attrs.estado
    
    // Verificar que el estado sea "en_envio"
    if (estadoActual !== 'en_envio') {
      return NextResponse.json(
        {
          success: false,
          error: `No se puede confirmar recepción. El estado actual es "${estadoActual}". Debe estar en "en_envio".`,
        },
        { status: 400 }
      )
    }
    
    // Obtener items de la orden
    const cotizacion = attrs.cotizacion_recibida?.data || attrs.cotizacion_recibida
    const cotAttrs = cotizacion?.attributes || cotizacion || {}
    const rfq = cotAttrs.rfq?.data || cotAttrs.rfq
    const rfqAttrs = rfq?.attributes || rfq || {}
    
    // Obtener items desde el componente o desde productos del RFQ
    let items: any[] = []
    const itemsComponent = cotAttrs.items || []
    
    if (itemsComponent.length > 0) {
      items = itemsComponent
    } else {
      // Generar items desde productos del RFQ
      const productos = rfqAttrs.productos?.data || rfqAttrs.productos || []
      const productosCantidades = rfqAttrs.productos_cantidades || {}
      
      items = productos.map((producto: any) => {
        const prodAttrs = producto.attributes || producto
        const productoId = producto.documentId || producto.id
        const cantidad = productosCantidades[String(productoId)] || productosCantidades[productoId] || 1
        
        return {
          producto: productoId,
          producto_nombre: prodAttrs.nombre_libro || prodAttrs.nombre || 'Producto',
          cantidad: cantidad,
        }
      })
    }
    
    // Agregar productos al inventario
    const stockResults = []
    for (const item of items) {
      const productoId = item.producto || item.producto_id
      const cantidad = item.cantidad || 1
      
      if (!productoId) {
        console.warn(`[Confirmar Recepción] ⚠️ Item sin producto ID:`, item)
        continue
      }
      
      try {
        // Buscar producto primero para obtener el documentId correcto
        const isProductoNumericId = /^\d+$/.test(String(productoId))
        let producto: StrapiEntity<any> | null = null
        let productoIdParaUpdate: string | number = productoId
        
        try {
          const productoResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
            `/api/libros/${productoId}?fields[0]=id&fields[1]=documentId&fields[2]=stock_quantity`
          )
          
          if (productoResponse.data) {
            producto = Array.isArray(productoResponse.data) ? productoResponse.data[0] : productoResponse.data
            productoIdParaUpdate = producto.documentId || producto.id || productoId
          }
        } catch (prodError: any) {
          if (prodError.status === 404) {
            try {
              const searchParams = new URLSearchParams({
                ...(isProductoNumericId ? { 'filters[id][$eq]': String(productoId) } : { 'filters[documentId][$eq]': String(productoId) }),
                'fields[0]': 'id',
                'fields[1]': 'documentId',
                'fields[2]': 'stock_quantity',
              })
              
              const filterResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
                `/api/libros?${searchParams.toString()}`
              )
              
              if (filterResponse.data) {
                const productos = Array.isArray(filterResponse.data) ? filterResponse.data : [filterResponse.data]
                if (productos.length > 0) {
                  producto = productos[0]
                  productoIdParaUpdate = producto.documentId || producto.id || productoId
                }
              }
            } catch (filterError: any) {
              console.error(`[Confirmar Recepción] Error al buscar producto ${productoId}:`, filterError.message)
            }
          }
        }
        
        if (!producto) {
          console.warn(`[Confirmar Recepción] ⚠️ Producto ${productoId} no encontrado`)
          continue
        }
        
        const prodAttrs = producto.attributes || producto
        const stockActual = Number(prodAttrs.stock_quantity || prodAttrs.stockQuantity || 0)
        const nuevoStock = stockActual + cantidad
        
        // Actualizar stock usando el ID correcto
        const updateData: any = {
          data: {
            stock_quantity: nuevoStock,
            stock_status: nuevoStock > 0 ? 'instock' : 'outofstock',
          },
        }
        
        console.log(`[Confirmar Recepción] Actualizando stock para producto ${productoIdParaUpdate}: ${stockActual} + ${cantidad} = ${nuevoStock}`)
        
        await strapiClient.put<StrapiResponse<StrapiEntity<any>>>(
          `/api/libros/${productoIdParaUpdate}`,
          updateData
        )
        
        stockResults.push({
          productoId,
          producto_nombre: item.producto_nombre || 'Producto',
          cantidad,
          stockAnterior: stockActual,
          stockNuevo: nuevoStock,
          success: true,
        })
        
        console.log(`[Confirmar Recepción] ✅ Stock actualizado para producto ${productoId}: ${stockActual} + ${cantidad} = ${nuevoStock}`)
      } catch (err: any) {
        console.error(`[Confirmar Recepción] ❌ Error al actualizar stock para producto ${productoId}:`, err.message)
        stockResults.push({
          productoId,
          producto_nombre: item.producto_nombre || 'Producto',
          cantidad,
          success: false,
          error: err.message,
        })
      }
    }
    
    // Actualizar estado de la orden a "recibida_confirmada" usando el ID correcto
    const fechaRecepcion = new Date().toISOString().split('T')[0]
    console.log('[Confirmar Recepción] Actualizando orden a recibida_confirmada:', {
      ordenIdParaUpdate,
      fechaRecepcion,
    })
    
    await strapiClient.put<StrapiResponse<StrapiEntity<any>>>(
      `/api/ordenes-compra/${ordenIdParaUpdate}`,
      {
        data: {
          estado: 'recibida_confirmada',
          fecha_recepcion_confirmada: fechaRecepcion,
        },
      }
    )
    
    return NextResponse.json({
      success: true,
      message: 'Recepción confirmada y productos agregados al inventario',
      data: {
        itemsProcesados: stockResults.length,
        itemsExitosos: stockResults.filter(r => r.success).length,
        itemsFallidos: stockResults.filter(r => !r.success).length,
        resultados: stockResults,
      },
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /compras/ordenes-compra/[id]/confirmar-recepcion POST] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al confirmar recepción',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}





