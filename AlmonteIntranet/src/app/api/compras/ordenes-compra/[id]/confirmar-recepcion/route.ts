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
    
    // Verificar que todos los documentos estén presentes (múltiples formas de acceso - igual que en el frontend)
    const factura = attrs.factura?.data || attrs.factura || attrs.attributes?.factura
    const despacho = attrs.orden_despacho?.data || attrs.despacho?.data || attrs.despacho || attrs.orden_despacho || attrs.attributes?.orden_despacho
    const pago = attrs.documento_pago?.data || attrs.documento_pago || attrs.attributes?.documento_pago
    
    console.log('[Confirmar Recepción] Verificando documentos:', {
      tieneFactura: !!factura,
      tieneDespacho: !!despacho,
      tienePago: !!pago,
      facturaRaw: factura ? (typeof factura === 'object' ? JSON.stringify(factura).substring(0, 100) : factura) : null,
      despachoRaw: despacho ? (typeof despacho === 'object' ? JSON.stringify(despacho).substring(0, 100) : despacho) : null,
      pagoRaw: pago ? (typeof pago === 'object' ? JSON.stringify(pago).substring(0, 100) : pago) : null,
      estadoActual,
      attrsKeys: Object.keys(attrs),
    })
    
    if (!factura || !despacho || !pago) {
      const documentosFaltantes = []
      if (!factura) documentosFaltantes.push('Factura')
      if (!despacho) documentosFaltantes.push('Despacho')
      if (!pago) documentosFaltantes.push('Documento de Pago')
      
      console.error('[Confirmar Recepción] ❌ Faltan documentos:', documentosFaltantes)
      
      return NextResponse.json(
        {
          success: false,
          error: `No se puede confirmar recepción. Faltan documentos: ${documentosFaltantes.join(', ')}`,
          detalles: {
            factura: !!factura,
            despacho: !!despacho,
            pago: !!pago,
          },
        },
        { status: 400 }
      )
    }
    
    // Verificar que no esté ya confirmada
    if (estadoActual === 'recibida_confirmada') {
      return NextResponse.json(
        {
          success: false,
          error: 'La recepción ya ha sido confirmada anteriormente',
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
        
        // ═══════════════════════════════════════════════════════════════════
        // REGISTRAR MOVIMIENTO DE INVENTARIO
        // ═══════════════════════════════════════════════════════════════════
        try {
          const movimientoData = {
            data: {
              libro: productoIdParaUpdate,
              tipo: 'entrada',
              cantidad: cantidad,
              stock_anterior: stockActual,
              stock_nuevo: nuevoStock,
              motivo: `Recepción de Orden de Compra ${ordenIdParaUpdate}`,
              referencia_tipo: 'orden_compra',
              referencia_id: String(ordenIdParaUpdate),
              orden_compra: ordenIdParaUpdate,
              fecha_movimiento: new Date().toISOString(),
              metadata: {
                producto_nombre: item.producto_nombre || 'Producto',
                rfq_id: rfq?.documentId || rfq?.id || null,
                cotizacion_id: cotizacion?.documentId || cotizacion?.id || null,
              }
            }
          }

          await strapiClient.post('/api/movimientos-inventario', movimientoData)
          console.log(`[Confirmar Recepción] 📦 Movimiento de inventario registrado para producto ${productoId}`)
        } catch (movimientoError: any) {
          // No fallar si el registro de movimiento falla
          console.error(`[Confirmar Recepción] ⚠️ Error al registrar movimiento de inventario (no crítico):`, movimientoError.message)
        }
        
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





