import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

/**
 * POST /api/compras/ordenes-compra/[id]/upload
 * Sube un archivo (factura o despacho) a una orden de compra
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string
    
    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se proporcionó ningún archivo',
        },
        { status: 400 }
      )
    }
    
    if (!type || (type !== 'factura' && type !== 'despacho' && type !== 'pago')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tipo de archivo inválido. Debe ser "factura", "despacho" o "pago"',
        },
        { status: 400 }
      )
    }
    
    // Convertir File a Blob para Strapi
    const arrayBuffer = await file.arrayBuffer()
    const blob = new Blob([arrayBuffer], { type: file.type })
    
    // Crear FormData para Strapi
    const strapiFormData = new FormData()
    strapiFormData.append('files', blob, file.name)
    
    // Subir archivo a Strapi usando el cliente
    const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || process.env.STRAPI_URL || 'http://localhost:1337'
    const apiToken = process.env.STRAPI_API_TOKEN || ''
    
    const uploadResponse = await fetch(`${strapiUrl}/api/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
      },
      body: strapiFormData,
    })
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { error: { message: errorText } }
      }
      throw new Error(errorData.error?.message || 'Error al subir archivo')
    }
    
    const uploadData = await uploadResponse.json()
    const uploadedFile = Array.isArray(uploadData) ? uploadData[0] : uploadData
    
    // Actualizar la orden de compra con el archivo
    const updateData: any = {
      data: {},
    }
    
    if (type === 'factura') {
      updateData.data.factura = uploadedFile.id
    } else if (type === 'despacho') {
      updateData.data.orden_despacho = uploadedFile.id
    } else if (type === 'pago') {
      updateData.data.documento_pago = uploadedFile.id
    }
    
    const response = await strapiClient.put<StrapiResponse<StrapiEntity<any>>>(
      `/api/ordenes-compra/${id}`,
      updateData
    )
    
    // Normalizar response.data que puede ser array o objeto
    const ordenData = Array.isArray(response.data) ? response.data[0] : response.data
    
    return NextResponse.json({
      success: true,
      data: {
        ...ordenData,
        [type === 'factura' ? 'factura' : type === 'despacho' ? 'orden_despacho' : 'documento_pago']: uploadedFile,
      },
      message: `${type === 'factura' ? 'Factura' : type === 'despacho' ? 'Despacho' : 'Documento de Pago'} subido exitosamente`,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /compras/ordenes-compra/[id]/upload POST] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al subir archivo',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

