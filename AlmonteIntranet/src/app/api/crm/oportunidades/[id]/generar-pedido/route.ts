/**
 * API Route para generar un pedido desde una oportunidad ganada
 * POST /api/crm/oportunidades/[id]/generar-pedido
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

/**
 * POST /api/crm/oportunidades/[id]/generar-pedido
 * Convierte una oportunidad ganada en un pedido
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: oportunidadId } = await params

    // Obtener la oportunidad
    const oportunidadResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
      `/api/oportunidades/${oportunidadId}?populate[empresa][populate][datos_facturacion]=true&populate[producto]=true&populate[contacto]=true`
    )

    const oportunidad = Array.isArray(oportunidadResponse.data) 
      ? oportunidadResponse.data[0] 
      : oportunidadResponse.data

    if (!oportunidad) {
      return NextResponse.json(
        { success: false, error: 'Oportunidad no encontrada' },
        { status: 404 }
      )
    }

    const attrs = oportunidad.attributes || oportunidad

    // Verificar que la oportunidad esté ganada
    if (attrs.etapa !== 'Won') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Solo se pueden generar pedidos de oportunidades ganadas (Won). La oportunidad actual está en etapa: ' + attrs.etapa 
        },
        { status: 400 }
      )
    }

    // Verificar que haya una empresa asociada
    const empresa = attrs.empresa?.data || attrs.empresa
    if (!empresa) {
      return NextResponse.json(
        { success: false, error: 'La oportunidad no tiene una empresa asociada. Es necesario asociar una empresa para generar el pedido.' },
        { status: 400 }
      )
    }

    const empresaAttrs = empresa.attributes || empresa
    const datosFacturacion = empresaAttrs.datos_facturacion || {}

    // Obtener el producto de la oportunidad
    const producto = attrs.producto?.data || attrs.producto
    const productoAttrs = producto?.attributes || producto

    // Generar número de pedido único
    const timestamp = Date.now()
    const numeroPedido = `OP-${oportunidadId}-${timestamp}`

    // Preparar items del pedido
    const items = []
    if (producto) {
      const productoId = producto.id || producto.documentId
      const precio = attrs.monto || (productoAttrs?.precio_venta ? parseFloat(productoAttrs.precio_venta) : 0)
      
      items.push({
        producto_id: productoId,
        sku: productoAttrs?.sku || productoAttrs?.codigo_producto || '',
        nombre: productoAttrs?.nombre_libro || productoAttrs?.titulo || attrs.nombre || 'Producto',
        cantidad: 1, // Por defecto 1, se puede ajustar
        precio_unitario: precio,
        total: precio,
      })
    }

    if (items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'La oportunidad no tiene productos asociados. Es necesario asociar un producto para generar el pedido.' },
        { status: 400 }
      )
    }

    // Calcular totales
    const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0)
    const impuestos = 0 // Se puede calcular según sea necesario
    const envio = 0
    const descuento = 0
    const total = subtotal + impuestos + envio - descuento

    // Preparar datos de facturación desde la empresa
    const billing = {
      first_name: datosFacturacion.first_name || '',
      last_name: datosFacturacion.last_name || '',
      company: datosFacturacion.company || empresaAttrs.razon_social || empresaAttrs.empresa_nombre || '',
      email: datosFacturacion.email || (empresaAttrs.emails && empresaAttrs.emails.length > 0 ? empresaAttrs.emails[0].email : ''),
      phone: datosFacturacion.phone || '',
      address_1: datosFacturacion.address_1 || '',
      address_2: datosFacturacion.address_2 || '',
      city: datosFacturacion.city || '',
      state: datosFacturacion.state || empresaAttrs.region || '',
      postcode: datosFacturacion.postcode || '',
      country: datosFacturacion.country || 'CL',
    }

    // Preparar datos del pedido
    const pedidoData = {
      data: {
        numero_pedido: numeroPedido,
        fecha_pedido: new Date().toISOString(),
        estado: 'pending', // Pedido pendiente por defecto
        total: total,
        subtotal: subtotal,
        impuestos: impuestos,
        envio: envio,
        descuento: descuento,
        moneda: attrs.moneda || 'CLP',
        origen: 'crm',
        items: items,
        billing: billing,
        shipping: { ...billing }, // Mismos datos de facturación para envío
        metodo_pago: 'transferencia',
        metodo_pago_titulo: 'Transferencia Bancaria',
        nota_cliente: `Pedido generado desde oportunidad: ${attrs.nombre}${attrs.descripcion ? `\n${attrs.descripcion}` : ''}`,
        // Relación con empresa (si existe en Strapi)
        empresa: empresa.id || empresa.documentId,
      },
    }

    // Crear el pedido
    const pedidoResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/tienda/pedidos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pedidoData),
    })

    const pedidoResult = await pedidoResponse.json()

    if (!pedidoResponse.ok || !pedidoResult.success) {
      throw new Error(pedidoResult.error || 'Error al crear el pedido')
    }

    // Actualizar la oportunidad para indicar que se generó el pedido
    // Se puede agregar un campo en la oportunidad o actualizar la descripción
    try {
      const oportunidadUpdateData = {
        data: {
          descripcion: (attrs.descripcion || '') + `\n\n[PEDIDO GENERADO] Número de pedido: ${numeroPedido} - ${new Date().toLocaleString('es-CL')}`,
        },
      }
      await strapiClient.put(`/api/oportunidades/${oportunidadId}`, oportunidadUpdateData)
    } catch (updateError) {
      console.error('Error al actualizar oportunidad:', updateError)
      // No interrumpir el flujo si falla la actualización
    }

    return NextResponse.json({
      success: true,
      data: {
        pedido: pedidoResult.data,
        oportunidad: {
          id: oportunidadId,
          nombre: attrs.nombre,
        },
      },
      message: `Pedido ${numeroPedido} generado exitosamente desde la oportunidad`,
    }, { status: 201 })
  } catch (error: any) {
    console.error('[API /crm/oportunidades/[id]/generar-pedido POST] Error:', {
      message: error.message,
      status: error.status,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al generar pedido desde oportunidad',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}





