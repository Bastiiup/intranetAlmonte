/**
 * Servicio para gestión de RFQ (Request for Quotation)
 * Maneja la lógica de negocio para solicitudes de cotización
 */

import strapiClient from '@/lib/strapi/client'
import { sendEmail } from '@/lib/email/sendgrid'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'
import crypto from 'crypto'

export interface RFQData {
  nombre: string
  descripcion?: string
  fecha_solicitud: string
  fecha_vencimiento?: string
  estado?: 'draft' | 'sent' | 'received' | 'converted' | 'cancelled'
  moneda?: 'CLP' | 'USD' | 'EUR'
  empresas: number[] // IDs de empresas
  productos: number[] // IDs de productos
  creado_por?: number // ID del colaborador
  notas_internas?: string
}

export interface CotizacionRecibidaData {
  rfq_id: number
  empresa_id: number
  contacto_id?: number
  numero_cotizacion?: string
  fecha_recepcion: string
  fecha_validez?: string
  precio_unitario?: number
  precio_total: number
  moneda?: 'CLP' | 'USD' | 'EUR'
  notas?: string
  archivo_pdf?: File | string
}

/**
 * Genera un token único para acceso público a una RFQ
 */
export function generateRFQToken(rfqId: string | number): string {
  const timestamp = Date.now()
  const random = crypto.randomBytes(16).toString('hex')
  return `rfq_${rfqId}_${timestamp}_${random}`
}

/**
 * Genera número único de RFQ
 * Formato: RFQ-YYYY-XXX
 */
export async function generateRFQNumber(): Promise<string> {
  const year = new Date().getFullYear()
  
  try {
    // Buscar última RFQ del año
    const response = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
      `/api/rfqs?filters[numero_rfq][$containsi]=RFQ-${year}&sort[0]=createdAt:desc&pagination[pageSize]=1`
    )
    
    let lastNumber = 0
    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      const lastRFQ = response.data[0]
      const attrs = lastRFQ.attributes || lastRFQ
      const numero = attrs.numero_rfq
      if (numero) {
        const match = numero.match(/RFQ-\d{4}-(\d+)/)
        if (match) {
          lastNumber = parseInt(match[1])
        }
      }
    }
    
    const nextNumber = (lastNumber + 1).toString().padStart(3, '0')
    return `RFQ-${year}-${nextNumber}`
  } catch (error) {
    // Si hay error, usar timestamp como fallback
    const timestamp = Date.now().toString().slice(-6)
    return `RFQ-${year}-${timestamp}`
  }
}

/**
 * Crea una nueva RFQ
 */
export async function createRFQ(data: RFQData): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    console.log('[RFQService] Iniciando creación de RFQ con datos:', {
      nombre: data.nombre,
      empresasCount: data.empresas.length,
      productosCount: data.productos.length,
    })
    
    // Generar número único
    const numeroRFQ = await generateRFQNumber()
    console.log('[RFQService] Número RFQ generado:', numeroRFQ)
    
    // Validar y convertir IDs de empresas
    const empresasIds: number[] = []
    for (const empresaId of data.empresas) {
      const idNum = typeof empresaId === 'string' ? parseInt(empresaId) : empresaId
      if (isNaN(idNum) || idNum <= 0) {
        // Intentar buscar por documentId
        try {
          const empresaResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
            `/api/empresas/${empresaId}`
          )
          if (empresaResponse.data) {
            const empresa = Array.isArray(empresaResponse.data) ? empresaResponse.data[0] : empresaResponse.data
            const empresaIdInterno = empresa.id
            if (empresaIdInterno) {
              empresasIds.push(Number(empresaIdInterno))
            }
          }
        } catch (err) {
          console.warn(`[RFQService] No se pudo encontrar empresa con ID: ${empresaId}`)
        }
      } else {
        empresasIds.push(idNum)
      }
    }
    
    if (empresasIds.length === 0) {
      return {
        success: false,
        error: 'No se encontraron empresas válidas para conectar',
      }
    }
    
    // Validar y convertir IDs de productos
    const productosIds: number[] = []
    for (const productoId of data.productos) {
      const idNum = typeof productoId === 'string' ? parseInt(productoId) : productoId
      if (isNaN(idNum) || idNum <= 0) {
        // Intentar buscar por documentId
        try {
          const productoResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
            `/api/productos/${productoId}`
          )
          if (productoResponse.data) {
            const producto = Array.isArray(productoResponse.data) ? productoResponse.data[0] : productoResponse.data
            const productoIdInterno = producto.id
            if (productoIdInterno) {
              productosIds.push(Number(productoIdInterno))
            }
          }
        } catch (err) {
          console.warn(`[RFQService] No se pudo encontrar producto con ID: ${productoId}`)
        }
      } else {
        productosIds.push(idNum)
      }
    }
    
    if (productosIds.length === 0) {
      return {
        success: false,
        error: 'No se encontraron productos válidos para conectar',
      }
    }
    
    // Preparar datos para Strapi
    const rfqData: any = {
      data: {
        numero_rfq: numeroRFQ,
        nombre: data.nombre.trim(),
        fecha_solicitud: data.fecha_solicitud,
        estado: data.estado || 'draft',
        moneda: data.moneda || 'CLP',
        activo: true,
        ...(data.descripcion && { descripcion: data.descripcion.trim() }),
        ...(data.fecha_vencimiento && { fecha_vencimiento: data.fecha_vencimiento }),
        ...(data.notas_internas && { notas_internas: data.notas_internas.trim() }),
        // Relaciones - usar IDs internos validados
        empresas: { connect: empresasIds },
        productos: { connect: productosIds },
        ...(data.creado_por && { creado_por: { connect: [data.creado_por] } }),
      },
    }
    
    console.log('[RFQService] Enviando datos a Strapi:', {
      numero_rfq: numeroRFQ,
      nombre: rfqData.data.nombre,
      empresasIds: empresasIds.length,
      productosIds: productosIds.length,
    })
    
    const response = await strapiClient.post<StrapiResponse<StrapiEntity<any>>>(
      '/api/rfqs',
      rfqData
    )
    
    console.log('[RFQService] RFQ creada exitosamente:', response.data)
    
    return {
      success: true,
      data: response.data,
    }
  } catch (error: any) {
    console.error('[RFQService] Error al crear RFQ:', error)
    
    // Extraer mensaje de error más detallado
    let errorMessage = 'Error al crear RFQ'
    if (error.message) {
      errorMessage = error.message
    } else if (error.response?.data?.error?.message) {
      errorMessage = error.response.data.error.message
    } else if (typeof error.response?.data === 'string') {
      errorMessage = error.response.data
    } else if (error.status === 404) {
      errorMessage = 'El content type "rfqs" no existe en Strapi. Por favor, créalo primero según la documentación.'
    } else if (error.status === 400) {
      errorMessage = 'Datos inválidos. Verifique que las empresas y productos existan en Strapi.'
    }
    
    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Envía RFQ a proveedores por email
 */
export async function sendRFQToProviders(
  rfqId: string | number,
  empresaIds?: number[]
): Promise<{ success: boolean; resultados: Array<{ empresa: string; success: boolean; error?: string }>; error?: string }> {
  try {
    // Obtener RFQ con relaciones
    const rfqResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
      `/api/rfqs/${rfqId}?populate[empresas][populate][emails]=true&populate[productos]=true&populate[creado_por][populate][persona]=true`
    )
    
    if (!rfqResponse.data) {
      return {
        success: false,
        resultados: [],
        error: 'RFQ no encontrada',
      }
    }
    
    // Extraer RFQ única (puede ser array o objeto)
    const rfq: StrapiEntity<any> = Array.isArray(rfqResponse.data) 
      ? rfqResponse.data[0] 
      : rfqResponse.data
    
    if (!rfq) {
      return {
        success: false,
        resultados: [],
        error: 'RFQ no encontrada',
      }
    }
    
    const attrs = rfq.attributes || rfq
    let empresas = attrs.empresas?.data || attrs.empresas || []
    
    // Filtrar empresas si se especificaron IDs
    if (empresaIds && Array.isArray(empresaIds) && empresaIds.length > 0) {
      empresas = empresas.filter((emp: any) => {
        const empId = emp.id || emp.documentId
        return empresaIds.includes(Number(empId))
      })
    }
    
    if (empresas.length === 0) {
      return {
        success: false,
        resultados: [],
        error: 'No hay empresas asociadas a esta RFQ',
      }
    }
    
    // Generar token único
    const token = generateRFQToken(rfqId)
    
    // Guardar token en RFQ
    await strapiClient.put(`/api/rfqs/${rfqId}`, {
      data: {
        token_acceso: token,
        estado: 'sent',
      },
    })
    
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const replyUrl = `${appUrl}/quote-reply/${token}`
    
    // Preparar datos para email
    const productos = attrs.productos?.data || attrs.productos || []
    const creadoPor = attrs.creado_por?.data || attrs.creado_por
    const creadoPorNombre = creadoPor?.persona?.nombre_completo || creadoPor?.persona?.nombres || 'Equipo de Compras'
    
    // Enviar email a cada empresa
    const resultados: Array<{ empresa: string; success: boolean; error?: string }> = []
    
    for (const empresa of empresas) {
      const empAttrs = empresa.attributes || empresa
      const empresaNombre = empAttrs.empresa_nombre || empAttrs.nombre || 'Empresa'
      
      // Buscar email principal de la empresa
      const emails = empAttrs.emails || []
      const emailPrincipal = emails.find((e: any) => e.principal) || emails[0]
      const empresaEmail = emailPrincipal?.email || empAttrs.email
      
      if (!empresaEmail) {
        resultados.push({
          empresa: empresaNombre,
          success: false,
          error: 'No tiene email configurado',
        })
        continue
      }
      
      // Generar HTML del email
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Solicitud de Cotización - ${attrs.numero_rfq || attrs.nombre}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">Solicitud de Cotización</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">
              Estimado/a <strong>${empresaNombre}</strong>,
            </p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              Le solicitamos cotización para los siguientes productos:
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <h2 style="margin-top: 0; color: #667eea;">${attrs.numero_rfq || attrs.nombre}</h2>
              ${attrs.descripcion ? `<p style="color: #666;">${attrs.descripcion}</p>` : ''}
              ${attrs.fecha_vencimiento ? `<p style="color: #666; margin-top: 10px;"><strong>Fecha límite:</strong> ${new Date(attrs.fecha_vencimiento).toLocaleDateString('es-CL')}</p>` : ''}
            </div>

            ${productos.length > 0 ? `
            <div style="margin: 20px 0;">
              <h3 style="color: #333; margin-bottom: 15px;">Productos solicitados:</h3>
              <ul style="list-style: none; padding: 0;">
                ${productos.map((prod: any) => {
                  const prodAttrs = prod.attributes || prod
                  const prodNombre = prodAttrs.nombre_libro || prodAttrs.nombre || 'Producto'
                  return `<li style="padding: 10px; background: white; margin-bottom: 8px; border-radius: 5px; border-left: 3px solid #667eea;">${prodNombre}</li>`
                }).join('')}
              </ul>
            </div>
            ` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${replyUrl}" 
                 style="display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                Responder Cotización
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              Por favor, haga clic en el botón anterior para acceder al formulario y proporcionar su cotización.
              Puede llenar el formulario en línea o subir un PDF con su cotización.
            </p>
            
            <p style="font-size: 14px; color: #666; margin-top: 20px;">
              Si tiene alguna pregunta, no dude en contactarnos.
            </p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #999; text-align: center;">
              Este es un correo automático. Por favor, no responda directamente a este mensaje.<br>
              Solicitud creada por: ${creadoPorNombre}
            </p>
          </div>
        </body>
        </html>
      `
      
      const emailResult = await sendEmail({
        to: empresaEmail,
        subject: `Solicitud de Cotización: ${attrs.numero_rfq || attrs.nombre}`,
        html: emailHtml,
      })
      
      resultados.push({
        empresa: empresaNombre,
        success: emailResult.success,
        error: emailResult.error,
      })
    }
    
    return {
      success: true,
      resultados,
    }
  } catch (error: any) {
    console.error('[RFQService] Error al enviar RFQ:', error)
    return {
      success: false,
      resultados: [],
      error: error.message || 'Error al enviar RFQ',
    }
  }
}

/**
 * Obtiene RFQ por token (para acceso público)
 */
export async function getRFQByToken(token: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
      `/api/rfqs?filters[token_acceso][$eq]=${encodeURIComponent(token)}&populate[empresas]=true&populate[productos]=true`
    )
    
    if (!response.data || (Array.isArray(response.data) && response.data.length === 0)) {
      return {
        success: false,
        error: 'RFQ no encontrada o token inválido',
      }
    }
    
    const rfq = Array.isArray(response.data) ? response.data[0] : response.data
    
    return {
      success: true,
      data: rfq,
    }
  } catch (error: any) {
    console.error('[RFQService] Error al obtener RFQ por token:', error)
    return {
      success: false,
      error: error.message || 'Error al obtener RFQ',
    }
  }
}

