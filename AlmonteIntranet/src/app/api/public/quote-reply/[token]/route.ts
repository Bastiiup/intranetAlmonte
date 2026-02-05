import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import { getRFQByToken, generateCotizacionNumber } from '@/lib/services/rfqService'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/public/quote-reply/[token]
 * Obtiene datos de RFQ para mostrar en formulario público
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    
    const result = await getRFQByToken(token)
    
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'RFQ no encontrada o token inválido',
        },
        { status: 404 }
      )
    }
    
    // Retornar solo datos necesarios para el formulario (sin información sensible)
    const rfq = result.data
    const attrs = rfq.attributes || rfq
    const empresas = attrs.empresas?.data || attrs.empresas || []
    const productos = attrs.productos?.data || attrs.productos || []
    
    // Obtener productos_cantidades
    const productosCantidades = attrs.productos_cantidades || {}
    let cantidadesParsed: Record<string, number> = {}
    if (productosCantidades) {
      try {
        cantidadesParsed = typeof productosCantidades === 'string' 
          ? JSON.parse(productosCantidades) 
          : productosCantidades
      } catch (e) {
        console.warn('[API /public/quote-reply/[token] GET] Error al parsear productos_cantidades:', e)
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        id: rfq.id || rfq.documentId,
        numero_rfq: attrs.numero_rfq,
        nombre: attrs.nombre,
        descripcion: attrs.descripcion,
        fecha_vencimiento: attrs.fecha_vencimiento,
        moneda: attrs.moneda || 'CLP',
        productos: productos.map((prod: any) => {
          const prodAttrs = prod.attributes || prod
          const prodId = prod.documentId || prod.id
          return {
            id: prod.id,
            documentId: prod.documentId,
            nombre: prodAttrs.nombre_libro || prodAttrs.nombre || 'Producto',
            isbn: prodAttrs.isbn_libro || prodAttrs.isbn || '',
            sku: prodAttrs.sku || '',
          }
        }),
        productos_cantidades: cantidadesParsed,
        empresas: empresas.map((emp: any) => {
          const empAttrs = emp.attributes || emp
          return {
            id: emp.id || emp.documentId,
            nombre: empAttrs.empresa_nombre || empAttrs.nombre || 'Empresa',
          }
        }),
      },
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /public/quote-reply/[token] GET] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener RFQ',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * POST /api/public/quote-reply/[token]
 * Recibe respuesta de cotización desde formulario público
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    
    // Validar token y obtener RFQ
    const rfqResult = await getRFQByToken(token)
    if (!rfqResult.success || !rfqResult.data) {
      return NextResponse.json(
        {
          success: false,
          error: 'Token inválido o RFQ no encontrada',
        },
        { status: 404 }
      )
    }
    
    const rfq = rfqResult.data
    const rfqAttrs = rfq.attributes || rfq
    // Para relaciones manyToOne, necesitamos el ID interno numérico, no el documentId
    const rfqIdInterno = typeof rfq.id === 'number' ? rfq.id : (rfq.documentId ? null : Number(rfq.id))
    let rfqIdFinal = rfqIdInterno
    
    // Si no tenemos ID interno, buscar por documentId
    if (!rfqIdFinal || isNaN(rfqIdFinal)) {
      try {
        const rfqResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
          `/api/rfqs?filters[documentId][$eq]=${rfq.documentId || rfq.id}`
        )
        if (rfqResponse.data) {
          const rfqEncontrada = Array.isArray(rfqResponse.data) ? rfqResponse.data[0] : rfqResponse.data
          if (rfqEncontrada && rfqEncontrada.id) {
            rfqIdFinal = Number(rfqEncontrada.id)
          }
        }
      } catch (err) {
        console.warn(`[API /public/quote-reply/[token] POST] No se pudo encontrar RFQ con documentId: ${rfq.documentId || rfq.id}`)
        rfqIdFinal = Number(rfq.id) // Fallback al ID original
      }
    }
    
    const rfqId = rfqIdFinal
    
    // Obtener datos del formulario
    const formData = await request.formData()
    
    const empresaId = formData.get('empresa_id')
    const contactoId = formData.get('contacto_id')
    const precioTotal = formData.get('precio_total')
    const moneda = formData.get('moneda') || 'CLP'
    const notas = formData.get('notas')
    const fechaValidez = formData.get('fecha_validez')
    const archivoPdf = formData.get('archivo_pdf') as File | null
    const itemsJson = formData.get('items') as string | null
    
    // Parsear items si existen
    let items: Array<{
      producto: string
      cantidad: number
      precio_unitario: number
      subtotal: number
    }> = []
    
    if (itemsJson) {
      try {
        items = JSON.parse(itemsJson)
      } catch (e) {
        console.error('[API /public/quote-reply/[token] POST] Error al parsear items:', e)
      }
    }
    
    // Validaciones
    if (!empresaId) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID de empresa es obligatorio',
        },
        { status: 400 }
      )
    }
    
    if (!precioTotal) {
      return NextResponse.json(
        {
          success: false,
          error: 'Precio total es obligatorio',
        },
        { status: 400 }
      )
    }
    
    // Verificar que la empresa esté asociada a esta RFQ
    const empresas = rfqAttrs.empresas?.data || rfqAttrs.empresas || []
    const empresaEncontrada = empresas.find((emp: any) => {
      const empId = emp.id || emp.documentId
      return String(empId) === String(empresaId)
    })
    
    if (!empresaEncontrada) {
      return NextResponse.json(
        {
          success: false,
          error: 'La empresa no está asociada a esta RFQ',
        },
        { status: 400 }
      )
    }
    
    // Subir archivo PDF si existe
    let archivoPdfId: number | null = null
    if (archivoPdf && archivoPdf instanceof File) {
      try {
        // Convertir File a Buffer para Strapi
        const arrayBuffer = await archivoPdf.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        
        // Crear FormData para Strapi
        const uploadFormData = new FormData()
        const blob = new Blob([buffer], { type: 'application/pdf' })
        uploadFormData.append('files', blob, archivoPdf.name)
        uploadFormData.append('refId', String(rfqId))
        uploadFormData.append('ref', 'api::cotizacion-recibida.cotizacion-recibida')
        uploadFormData.append('field', 'archivo_pdf')
        
        // Subir a Strapi Media Library usando strapiClient
        const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || ''
        const uploadResponse = await fetch(`${strapiUrl}/api/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.STRAPI_API_TOKEN}`,
          },
          body: uploadFormData,
        })
        
        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json()
          if (uploadResult && Array.isArray(uploadResult) && uploadResult.length > 0) {
            archivoPdfId = uploadResult[0].id
          }
        } else {
          console.error('[API /public/quote-reply] Error al subir PDF:', await uploadResponse.text())
        }
      } catch (uploadError) {
        console.error('[API /public/quote-reply] Error al subir PDF:', uploadError)
        // Continuar sin el PDF si falla la subida
      }
    }
    
    // Crear cotización recibida
    // IMPORTANTE: Para relaciones manyToOne en Strapi v5, usar el ID directamente
    // Asegurar que empresaId sea el ID interno numérico correcto
    let empresaIdInterno = Number(empresaId)
    if (isNaN(empresaIdInterno) || empresaIdInterno <= 0) {
      // Si no es numérico, buscar por documentId
      try {
        const empresaResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
          `/api/empresas?filters[documentId][$eq]=${empresaId}`
        )
        if (empresaResponse.data) {
          const empresa = Array.isArray(empresaResponse.data) ? empresaResponse.data[0] : empresaResponse.data
          if (empresa && empresa.id) {
            empresaIdInterno = Number(empresa.id)
          }
        }
      } catch (err) {
        console.warn(`[API /public/quote-reply/[token] POST] No se pudo encontrar empresa con ID: ${empresaId}`)
      }
    }
    
    // Generar número de cotización automáticamente
    const numeroCotizacion = await generateCotizacionNumber()
    
    // Preparar items para el componente
    const itemsComponent = items.map((item) => ({
      producto: item.producto, // ID del producto (documentId o id numérico)
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      subtotal: item.subtotal,
    }))
    
    const cotizacionData: any = {
      data: {
        rfq: Number(rfqId), // Para manyToOne, usar ID directamente
        empresa: empresaIdInterno, // Para manyToOne, usar ID directamente
        fecha_recepcion: new Date().toISOString().split('T')[0],
        precio_total: parseFloat(String(precioTotal)),
        moneda: String(moneda),
        estado: 'pendiente',
        activo: true,
        numero_cotizacion: numeroCotizacion, // Generado automáticamente
        ...(notas && { notas: String(notas).trim() }),
        ...(fechaValidez && { fecha_validez: String(fechaValidez) }),
        ...(contactoId && { contacto_responsable: Number(contactoId) }), // manyToOne también
        ...(archivoPdfId && { archivo_pdf: { connect: [archivoPdfId] } }),
        ...(itemsComponent.length > 0 && { items: itemsComponent }), // Componente repeatable
      },
    }
    
    console.log('[API /public/quote-reply/[token] POST] Creando cotización recibida:', {
      rfqId,
      empresaId: empresaIdInterno,
      empresaIdOriginal: empresaId,
      precioTotal,
    })
    
    const cotizacionResponse = await strapiClient.post<StrapiResponse<StrapiEntity<any>>>(
      '/api/cotizaciones-recibidas',
      cotizacionData
    )
    
    // Actualizar estado de RFQ a "received" si es la primera cotización
    // Usar documentId para la operación PUT
    if (rfqAttrs.estado === 'sent') {
      const rfqIdParaUpdate = rfq.documentId || rfq.id
      await strapiClient.put(`/api/rfqs/${rfqIdParaUpdate}`, {
        data: {
          estado: 'received',
        },
      })
    }
    
    return NextResponse.json({
      success: true,
      data: cotizacionResponse.data,
      message: 'Cotización recibida exitosamente',
    }, { status: 201 })
  } catch (error: any) {
    console.error('[API /public/quote-reply/[token] POST] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al procesar cotización',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

