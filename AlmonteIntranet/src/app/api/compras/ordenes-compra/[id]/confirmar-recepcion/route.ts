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
    
    // Obtener la orden de compra
    const poResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
      `/api/ordenes-compra/${id}?populate[cotizacion_recibida][populate][rfq][populate][productos]=true&populate[cotizacion_recibida][populate][items]=true`
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
        // Obtener producto actual
        const productoResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
          `/api/libros/${productoId}?fields[0]=id&fields[1]=documentId&fields[2]=stock_quantity`
        )
        
        if (!productoResponse.data) {
          console.warn(`[Confirmar Recepción] ⚠️ Producto ${productoId} no encontrado`)
          continue
        }
        
        const producto = Array.isArray(productoResponse.data) ? productoResponse.data[0] : productoResponse.data
        const prodAttrs = producto.attributes || producto
        const stockActual = Number(prodAttrs.stock_quantity || prodAttrs.stockQuantity || 0)
        const nuevoStock = stockActual + cantidad
        
        // Actualizar stock
        const updateData: any = {
          data: {
            stock_quantity: nuevoStock,
            stock_status: nuevoStock > 0 ? 'instock' : 'outofstock',
          },
        }
        
        await strapiClient.put<StrapiResponse<StrapiEntity<any>>>(
          `/api/libros/${productoId}`,
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
    
    // Actualizar estado de la orden a "recibida_confirmada"
    const fechaRecepcion = new Date().toISOString().split('T')[0]
    await strapiClient.put<StrapiResponse<StrapiEntity<any>>>(
      `/api/ordenes-compra/${id}`,
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





