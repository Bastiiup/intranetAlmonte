/**
 * API Route para descargar y guardar el PDF de la factura en WordPress/WooCommerce
 */

import { NextRequest, NextResponse } from 'next/server'
import wooCommerceClient from '@/lib/woocommerce/client'

export const dynamic = 'force-dynamic'

/**
 * POST /api/openfactura/guardar-pdf
 * Descarga el PDF de Haulmer y lo guarda como attachment en WordPress
 * Luego actualiza el pedido con la referencia al PDF
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validar datos requeridos
    if (!body.order_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Se requiere order_id',
        },
        { status: 400 }
      )
    }

    if (!body.pdf_url) {
      return NextResponse.json(
        {
          success: false,
          error: 'Se requiere pdf_url',
        },
        { status: 400 }
      )
    }

    const { order_id, pdf_url, folio, documento_id, xml_url, timbre } = body

    console.log('[Haulmer] Guardando PDF para pedido:', {
      order_id,
      pdf_url,
      folio,
    })

    // Descargar el PDF desde Haulmer
    const pdfResponse = await fetch(pdf_url)
    if (!pdfResponse.ok) {
      throw new Error(`Error al descargar PDF: ${pdfResponse.status}`)
    }

    const pdfBlob = await pdfResponse.blob()
    const pdfBuffer = await pdfBlob.arrayBuffer()

    // Convertir a base64 para enviarlo a WordPress
    const base64Pdf = Buffer.from(pdfBuffer).toString('base64')
    const pdfFileName = `factura-${folio || order_id}-${Date.now()}.pdf`

    // Subir el PDF a WordPress como media attachment
    // Usar la API de WordPress Media con autenticación OAuth 1.0a (WooCommerce)
    const WOOCOMMERCE_URL = process.env.NEXT_PUBLIC_WOOCOMMERCE_URL || ''
    const WOOCOMMERCE_CONSUMER_KEY = process.env.WOOCOMMERCE_CONSUMER_KEY || ''
    const WOOCOMMERCE_CONSUMER_SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET || ''

    if (!WOOCOMMERCE_URL || !WOOCOMMERCE_CONSUMER_KEY || !WOOCOMMERCE_CONSUMER_SECRET) {
      throw new Error('Credenciales de WooCommerce no configuradas')
    }

    // Guardar la URL del PDF en meta_data del pedido
    // Nota: Subir el archivo PDF directamente a WordPress Media Library requiere
    // autenticación especial (Application Passwords o plugin específico).
    // Por ahora guardamos la URL del PDF de Haulmer en meta_data,
    // que es accesible desde WooCommerce y se puede descargar cuando sea necesario.
    
    const pdfAttachmentUrl = pdf_url
    const mediaId: string | null = null

    console.log('[Haulmer] Guardando URL del PDF en meta_data del pedido:', {
      order_id,
      pdf_url: pdfAttachmentUrl,
      folio,
    })
    
    // Si en el futuro quieres subir el archivo PDF a WordPress Media Library,
    // necesitarías:
    // 1. Configurar Application Passwords en WordPress
    // 2. O usar un plugin que permita subir archivos vía REST API
    // 3. O implementar la subida desde el frontend después de recibir la URL

    // Actualizar el pedido con meta_data que incluya la información de la factura
    // Mantener compatibilidad con ambos nombres (openfactura y haulmer)
    const metaData = [
      {
        key: '_openfactura_folio',
        value: folio?.toString() || '',
      },
      {
        key: '_haulmer_folio',
        value: folio?.toString() || '',
      },
      {
        key: '_openfactura_documento_id',
        value: documento_id || '',
      },
      {
        key: '_haulmer_documento_id',
        value: documento_id || '',
      },
      {
        key: '_openfactura_pdf_url',
        value: pdfAttachmentUrl,
      },
      {
        key: '_haulmer_pdf_url',
        value: pdfAttachmentUrl,
      },
      {
        key: '_openfactura_pdf_original_url',
        value: pdf_url,
      },
      {
        key: '_haulmer_pdf_original_url',
        value: pdf_url,
      },
      {
        key: '_openfactura_xml_url',
        value: xml_url || '',
      },
      {
        key: '_haulmer_xml_url',
        value: xml_url || '',
      },
      {
        key: '_openfactura_timbre',
        value: timbre || '',
      },
      {
        key: '_haulmer_timbre',
        value: timbre || '',
      },
      {
        key: '_openfactura_pdf_attachment_id',
        value: mediaId || '',
      },
      {
        key: '_haulmer_pdf_attachment_id',
        value: mediaId || '',
      },
      {
        key: '_factura_emitida',
        value: '1',
      },
      {
        key: '_factura_fecha_emision',
        value: new Date().toISOString(),
      },
    ]

    // Obtener el pedido actual para preservar meta_data existente
    let existingMetaData: Array<{ key: string; value: string }> = []
    try {
      const currentOrder = await wooCommerceClient.get(`orders/${order_id}`)
      if (currentOrder && (currentOrder as any).meta_data) {
        existingMetaData = (currentOrder as any).meta_data
      }
    } catch (error) {
      console.warn('[Haulmer] No se pudo obtener pedido actual, usando solo nuevos meta_data')
    }

    // Combinar meta_data existente con los nuevos
    // Eliminar duplicados (mantener los nuevos si hay conflicto)
    const combinedMetaData = [...existingMetaData]
    const newKeys = new Set(metaData.map(m => m.key))
    
    // Agregar nuevos meta_data, reemplazando los existentes si hay conflicto
    metaData.forEach(newMeta => {
      const existingIndex = combinedMetaData.findIndex(m => m.key === newMeta.key)
      if (existingIndex >= 0) {
        combinedMetaData[existingIndex] = newMeta
      } else {
        combinedMetaData.push(newMeta)
      }
    })

    // Actualizar el pedido con los meta_data combinados
    const orderUpdate = await wooCommerceClient.put(
      `orders/${order_id}`,
      {
        meta_data: combinedMetaData,
      }
    )

    console.log('[Haulmer] Pedido actualizado con información de factura:', {
      order_id,
      meta_data_count: metaData.length,
    })

    return NextResponse.json({
      success: true,
      data: {
        order_id,
        media_id: mediaId,
        pdf_url: pdfAttachmentUrl,
        folio,
        documento_id,
        uploaded_to_wordpress: !!mediaId,
      },
    })
  } catch (error: any) {
    console.error('[Haulmer] Error al guardar PDF:', {
      message: error.message,
      stack: error.stack,
    })

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al guardar PDF de factura',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: error.status || 500 }
    )
  }
}
