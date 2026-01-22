import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import { getRFQByToken } from '@/lib/services/rfqService'
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
          return {
            id: prod.id || prod.documentId,
            nombre: prodAttrs.nombre_libro || prodAttrs.nombre || 'Producto',
          }
        }),
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
    const rfqId = rfq.id || rfq.documentId
    
    // Obtener datos del formulario
    const formData = await request.formData()
    
    const empresaId = formData.get('empresa_id')
    const contactoId = formData.get('contacto_id')
    const numeroCotizacion = formData.get('numero_cotizacion')
    const precioTotal = formData.get('precio_total')
    const precioUnitario = formData.get('precio_unitario')
    const moneda = formData.get('moneda') || 'CLP'
    const notas = formData.get('notas')
    const fechaValidez = formData.get('fecha_validez')
    const archivoPdf = formData.get('archivo_pdf') as File | null
    
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
    const cotizacionData: any = {
      data: {
        rfq: { connect: [Number(rfqId)] },
        empresa: { connect: [Number(empresaId)] },
        fecha_recepcion: new Date().toISOString().split('T')[0],
        precio_total: parseFloat(String(precioTotal)),
        moneda: String(moneda),
        estado: 'pendiente',
        activo: true,
        ...(numeroCotizacion && { numero_cotizacion: String(numeroCotizacion).trim() }),
        ...(precioUnitario && { precio_unitario: parseFloat(String(precioUnitario)) }),
        ...(notas && { notas: String(notas).trim() }),
        ...(fechaValidez && { fecha_validez: String(fechaValidez) }),
        ...(contactoId && { contacto_responsable: { connect: [Number(contactoId)] } }),
        ...(archivoPdfId && { archivo_pdf: { connect: [archivoPdfId] } }),
      },
    }
    
    const cotizacionResponse = await strapiClient.post<StrapiResponse<StrapiEntity<any>>>(
      '/api/cotizaciones-recibidas',
      cotizacionData
    )
    
    // Actualizar estado de RFQ a "received" si es la primera cotización
    if (rfqAttrs.estado === 'sent') {
      await strapiClient.put(`/api/rfqs/${rfqId}`, {
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

