/**
 * Servicio para gestión de Órdenes de Compra (PO)
 * Maneja la lógica de negocio para órdenes de compra
 */

import strapiClient from '@/lib/strapi/client'
import { sendEmail } from '@/lib/email/sendgrid'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

/**
 * Genera número único de Orden de Compra
 * Formato: PO-YYYY-XXX
 */
export async function generatePONumber(): Promise<string> {
  const year = new Date().getFullYear()
  
  try {
    // Buscar última PO del año
    const response = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
      `/api/ordenes-compra?filters[numero_po][$containsi]=PO-${year}&sort[0]=createdAt:desc&pagination[pageSize]=1`
    )
    
    let lastNumber = 0
    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      const lastPO = response.data[0]
      const attrs = lastPO.attributes || lastPO
      const numero = attrs.numero_po
      if (numero) {
        const match = numero.match(/PO-\d{4}-(\d+)/)
        if (match) {
          lastNumber = parseInt(match[1])
        }
      }
    }
    
    const nextNumber = (lastNumber + 1).toString().padStart(3, '0')
    return `PO-${year}-${nextNumber}`
  } catch (error) {
    // Si hay error, usar timestamp como fallback
    const timestamp = Date.now().toString().slice(-6)
    return `PO-${year}-${timestamp}`
  }
}

/**
 * Crea una Orden de Compra desde una cotización recibida
 */
export async function createPOFromCotizacion(
  cotizacionRecibidaId: number,
  creadoPorId?: number
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    // Obtener cotización recibida con relaciones
    const cotizacionResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
      `/api/cotizaciones-recibidas/${cotizacionRecibidaId}?populate[rfq]=true&populate[empresa][populate][datos_facturacion]=true&populate[empresa][populate][emails]=true`
    )
    
    if (!cotizacionResponse.data) {
      return {
        success: false,
        error: 'Cotización recibida no encontrada',
      }
    }
    
    const cotizacion = cotizacionResponse.data
    const cotizacionAttrs = cotizacion.attributes || cotizacion
    
    // Validar que la cotización esté aprobada
    if (cotizacionAttrs.estado !== 'aprobada') {
      return {
        success: false,
        error: 'Solo se pueden generar POs de cotizaciones aprobadas',
      }
    }
    
    // Validar que no tenga una PO ya generada
    if (cotizacionAttrs.orden_compra?.data) {
      return {
        success: false,
        error: 'Esta cotización ya tiene una Orden de Compra asociada',
      }
    }
    
    const empresa = cotizacionAttrs.empresa?.data || cotizacionAttrs.empresa
    const empresaAttrs = empresa?.attributes || empresa
    const rfq = cotizacionAttrs.rfq?.data || cotizacionAttrs.rfq
    const rfqAttrs = rfq?.attributes || rfq
    
    // Generar número único de PO
    const numeroPO = await generatePONumber()
    
    // Preparar datos de facturación y despacho desde la empresa
    const datosFacturacion = empresaAttrs.datos_facturacion || {}
    const direccionFacturacion = {
      first_name: datosFacturacion.first_name || '',
      last_name: datosFacturacion.last_name || '',
      company: datosFacturacion.company || empresaAttrs.empresa_nombre || empresaAttrs.nombre || '',
      email: datosFacturacion.email || empresaAttrs.emails?.[0]?.email || '',
      phone: datosFacturacion.phone || '',
      address_1: datosFacturacion.address_1 || '',
      address_2: datosFacturacion.address_2 || '',
      city: datosFacturacion.city || '',
      state: datosFacturacion.state || '',
      postcode: datosFacturacion.postcode || '',
      country: datosFacturacion.country || 'CL',
    }
    
    // Crear PO
    const poData: any = {
      data: {
        numero_po: numeroPO,
        fecha_emision: new Date().toISOString().split('T')[0],
        monto_total: cotizacionAttrs.precio_total || 0,
        moneda: cotizacionAttrs.moneda || 'CLP',
        estado: 'emitida',
        activo: true,
        direccion_facturacion: direccionFacturacion,
        direccion_despacho: direccionFacturacion, // Por defecto igual a facturación
        // Relaciones
        cotizacion_recibida: { connect: [cotizacionRecibidaId] },
        empresa: { connect: [empresa.id || empresa.documentId] },
        ...(creadoPorId && { creado_por: { connect: [creadoPorId] } }),
      },
    }
    
    const poResponse = await strapiClient.post<StrapiResponse<StrapiEntity<any>>>(
      '/api/ordenes-compra',
      poData
    )
    
    // Actualizar estado de cotización a "convertida"
    await strapiClient.put(`/api/cotizaciones-recibidas/${cotizacionRecibidaId}`, {
      data: {
        estado: 'convertida',
        orden_compra: { connect: [poResponse.data.id || poResponse.data.documentId] },
      },
    })
    
    // Actualizar estado de RFQ a "converted" si todas las cotizaciones están convertidas o rechazadas
    if (rfqAttrs) {
      const rfqId = rfq.id || rfq.documentId
      // Verificar estado de todas las cotizaciones de esta RFQ
      const cotizacionesResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
        `/api/cotizaciones-recibidas?filters[rfq][id][$eq]=${rfqId}`
      )
      
      const cotizaciones = Array.isArray(cotizacionesResponse.data) 
        ? cotizacionesResponse.data 
        : (cotizacionesResponse.data ? [cotizacionesResponse.data] : [])
      
      const todasConvertidasORechazadas = cotizaciones.every((cot: any) => {
        const cotAttrs = cot.attributes || cot
        return cotAttrs.estado === 'convertida' || cotAttrs.estado === 'rechazada'
      })
      
      if (todasConvertidasORechazadas && cotizaciones.length > 0) {
        await strapiClient.put(`/api/rfqs/${rfqId}`, {
          data: {
            estado: 'converted',
          },
        })
      }
    }
    
    // Enviar email al proveedor con detalles de la PO
    await sendPOEmailToProvider(poResponse.data, empresaAttrs)
    
    return {
      success: true,
      data: poResponse.data,
    }
  } catch (error: any) {
    console.error('[OrdenCompraService] Error al crear PO:', error)
    return {
      success: false,
      error: error.message || 'Error al crear Orden de Compra',
    }
  }
}

/**
 * Envía email al proveedor con detalles de la Orden de Compra
 */
async function sendPOEmailToProvider(po: any, empresa: any): Promise<void> {
  try {
    const poAttrs = po.attributes || po
    const empresaNombre = empresa.empresa_nombre || empresa.nombre || 'Empresa'
    
    // Buscar email principal de la empresa
    const emails = empresa.emails || []
    const emailPrincipal = emails.find((e: any) => e.principal) || emails[0]
    const empresaEmail = emailPrincipal?.email || empresa.email
    
    if (!empresaEmail) {
      console.warn('[OrdenCompraService] No se puede enviar email: empresa sin email configurado')
      return
    }
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Orden de Compra - ${poAttrs.numero_po}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">Orden de Compra</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-bottom: 20px;">
            Estimado/a <strong>${empresaNombre}</strong>,
          </p>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            Nos complace informarle que su cotización ha sido aprobada y se ha generado la siguiente Orden de Compra:
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
            <h2 style="margin-top: 0; color: #28a745;">${poAttrs.numero_po}</h2>
            <p style="font-size: 18px; font-weight: bold; margin-top: 15px;">
              Monto Total: ${new Intl.NumberFormat('es-CL', { 
                style: 'currency', 
                currency: poAttrs.moneda || 'CLP' 
              }).format(poAttrs.monto_total || 0)}
            </p>
            ${poAttrs.fecha_emision ? `<p style="color: #666; margin-top: 10px;">Fecha de Emisión: ${new Date(poAttrs.fecha_emision).toLocaleDateString('es-CL')}</p>` : ''}
            ${poAttrs.fecha_entrega_estimada ? `<p style="color: #666; margin-top: 10px;">Fecha Estimada de Entrega: ${new Date(poAttrs.fecha_entrega_estimada).toLocaleDateString('es-CL')}</p>` : ''}
          </div>
          
          ${poAttrs.notas ? `
          <div style="margin: 20px 0;">
            <h3 style="color: #333; margin-bottom: 10px;">Notas:</h3>
            <p style="background: white; padding: 15px; border-radius: 5px;">${poAttrs.notas}</p>
          </div>
          ` : ''}
          
          <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 0; font-size: 14px; color: #856404;">
              <strong>Próximos pasos:</strong><br>
              Por favor, confirme la recepción de esta orden y proceda con la preparación del pedido.
              Una vez despachado, envíenos la factura y orden de despacho.
            </p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #999; text-align: center;">
            Este es un correo automático. Por favor, no responda directamente a este mensaje.
          </p>
        </div>
      </body>
      </html>
    `
    
    await sendEmail({
      to: empresaEmail,
      subject: `Orden de Compra: ${poAttrs.numero_po}`,
      html: emailHtml,
    })
    
    console.log('[OrdenCompraService] ✅ Email de PO enviado a:', empresaEmail)
  } catch (error: any) {
    console.error('[OrdenCompraService] Error al enviar email de PO:', error)
    // No lanzar error, solo loguear
  }
}

/**
 * Aprobar una cotización recibida
 */
export async function aprobarCotizacion(
  cotizacionId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await strapiClient.put(`/api/cotizaciones-recibidas/${cotizacionId}`, {
      data: {
        estado: 'aprobada',
      },
    })
    
    return { success: true }
  } catch (error: any) {
    console.error('[OrdenCompraService] Error al aprobar cotización:', error)
    return {
      success: false,
      error: error.message || 'Error al aprobar cotización',
    }
  }
}

/**
 * Rechazar una cotización recibida
 */
export async function rechazarCotizacion(
  cotizacionId: number,
  motivo?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await strapiClient.put(`/api/cotizaciones-recibidas/${cotizacionId}`, {
      data: {
        estado: 'rechazada',
        ...(motivo && { notas: motivo }),
      },
    })
    
    return { success: true }
  } catch (error: any) {
    console.error('[OrdenCompraService] Error al rechazar cotización:', error)
    return {
      success: false,
      error: error.message || 'Error al rechazar cotización',
    }
  }
}

