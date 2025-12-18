/**
 * API Route para emitir facturas electrónicas a través de Haulmer (Espacio)
 * Documentación: https://espacio.haulmer.com/
 */

import { NextRequest, NextResponse } from 'next/server'
import openFacturaClient from '@/lib/openfactura/client'
import type { HaulmerDTE, HaulmerEmitResponse, TipoDTE } from '@/lib/openfactura/types'

export const dynamic = 'force-dynamic'

/**
 * Función auxiliar para convertir tipo de documento a código SII
 */
function getTipoDTE(tipo: string): TipoDTE {
  const tipos: Record<string, TipoDTE> = {
    'factura': 33, // Factura Electrónica
    'factura_exenta': 34, // Factura Exenta
    'boleta': 39, // Boleta Electrónica
    'boleta_exenta': 41, // Boleta Exenta
    'nota_credito': 61, // Nota de Crédito
    'nota_debito': 56, // Nota de Débito
  }
  return tipos[tipo.toLowerCase()] || 39 // Por defecto Boleta
}

/**
 * Función auxiliar para formatear RUT (12345678-9)
 */
function formatearRUT(rut: string): string {
  // Limpiar y formatear RUT
  const rutLimpio = rut.replace(/[.-]/g, '').trim()
  if (rutLimpio.length < 8) {
    throw new Error('RUT inválido')
  }
  const cuerpo = rutLimpio.slice(0, -1)
  const dv = rutLimpio.slice(-1).toUpperCase()
  return `${cuerpo}-${dv}`
}

/**
 * Función auxiliar para convertir precio a centavos (sin decimales)
 */
function aCentavos(precio: number): number {
  return Math.round(precio * 100)
}

/**
 * POST /api/openfactura/emitir
 * Emite una factura electrónica a través de Haulmer
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validar datos requeridos
    if (!body.receptor || !body.receptor.rut) {
      return NextResponse.json(
        {
          success: false,
          error: 'Se requiere el RUT del receptor',
        },
        { status: 400 }
      )
    }

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Se requiere al menos un item en la factura',
        },
        { status: 400 }
      )
    }

    // Obtener datos del emisor desde variables de entorno
    const emisorRUT = process.env.HAULMER_EMISOR_RUT || process.env.EMISOR_RUT || ''
    const emisorRazonSocial = process.env.HAULMER_EMISOR_RAZON_SOCIAL || process.env.EMISOR_RAZON_SOCIAL || ''
    const emisorGiro = process.env.HAULMER_EMISOR_GIRO || process.env.EMISOR_GIRO || ''
    const emisorDireccion = process.env.HAULMER_EMISOR_DIRECCION || process.env.EMISOR_DIRECCION || ''
    const emisorComuna = process.env.HAULMER_EMISOR_COMUNA || process.env.EMISOR_COMUNA || ''
    const emisorCiudad = process.env.HAULMER_EMISOR_CIUDAD || process.env.EMISOR_CIUDAD || ''

    if (!emisorRUT || !emisorRazonSocial) {
      return NextResponse.json(
        {
          success: false,
          error: 'Datos del emisor no configurados. Configure HAULMER_EMISOR_RUT y HAULMER_EMISOR_RAZON_SOCIAL',
        },
        { status: 400 }
      )
    }

    const tipoDocumento = body.tipo || 'boleta'
    const tipoDTE = getTipoDTE(tipoDocumento)
    const fechaEmision = body.fecha || new Date().toISOString().split('T')[0]

    // Calcular totales
    let mntNeto = 0
    let mntTotal = 0
    let iva = 0
    const descuentoGlobal = body.descuento_global || 0

    // Procesar items y calcular totales
    const detalle = body.items.map((item: any) => {
      const cantidad = item.cantidad || item.quantity || 1
      const precioUnitario = parseFloat(item.precio || item.price || 0)
      const descuentoItem = item.descuento || 0
      const impuestoItem = item.impuesto || 0
      
      const montoItem = (precioUnitario * cantidad) - descuentoItem
      const montoItemConImpuesto = montoItem + impuestoItem
      
      mntNeto += montoItem
      iva += impuestoItem
      mntTotal += montoItemConImpuesto

      return {
        NmbItem: (item.nombre || item.name || '').substring(0, 80), // Máximo 80 caracteres
        QtyItem: cantidad,
        UnmdItem: item.unidad_medida || 'UN',
        PrcItem: aCentavos(precioUnitario),
        MontoItem: aCentavos(montoItemConImpuesto),
        ...(item.codigo || item.sku ? {
          CdgItem: {
            TpoCodigo: 'INT1',
            VlrCodigo: (item.codigo || item.sku || '').toString(),
          }
        } : {}),
      }
    })

    // Aplicar descuento global
    if (descuentoGlobal > 0) {
      const descuentoEnCentavos = aCentavos(descuentoGlobal)
      mntTotal = Math.max(0, mntTotal - descuentoEnCentavos)
    }

    // Formatear RUTs
    const rutEmisor = formatearRUT(emisorRUT)
    const rutReceptor = formatearRUT(body.receptor.rut)

    // Construir documento en formato Haulmer
    const documento: HaulmerDTE = {
      Encabezado: {
        IdDoc: {
          TipoDTE: tipoDTE,
          FchEmis: fechaEmision,
        },
        Emisor: {
          RUTEmisor: rutEmisor,
          RznSoc: emisorRazonSocial,
          GiroEmis: emisorGiro,
          DirOrigen: emisorDireccion,
          CmnaOrigen: emisorComuna,
          ...(emisorCiudad ? { CiudadOrigen: emisorCiudad } : {}),
        },
        Receptor: {
          RUTRecep: rutReceptor,
          RznSocRecep: body.receptor.razon_social || 'Consumidor Final',
          ...(body.receptor.giro ? { GiroRecep: body.receptor.giro } : {}),
          DirRecep: body.receptor.direccion || '',
          CmnaRecep: body.receptor.comuna || '',
          ...(body.receptor.ciudad ? { CiudadRecep: body.receptor.ciudad } : {}),
          ...(body.receptor.email ? { Contacto: body.receptor.email } : {}),
        },
      },
      Detalle: detalle,
      Totales: {
        MntNeto: aCentavos(mntNeto),
        ...(iva > 0 ? { IVA: aCentavos(iva) } : {}),
        MntTotal: aCentavos(mntTotal),
      },
    }

    console.log('[Haulmer] Emitiendo documento:', {
      tipo: tipoDTE,
      receptor: rutReceptor,
      items: detalle.length,
      mntTotal: mntTotal / 100,
    })

    // Emitir documento en Haulmer (Espacio)
    // Intentar diferentes endpoints posibles según la documentación de Haulmer
    let response: any
    let lastError: any = null
    
    // Lista de endpoints posibles a probar
    const possibleEndpoints = [
      '/api/dte/emitir',
      '/api/v1/dte/emitir',
      '/dte/emitir',
      '/api/documentos/emitir',
      '/api/emitir',
    ]
    
    for (const endpoint of possibleEndpoints) {
      try {
        console.log('[Haulmer] Intentando endpoint:', endpoint)
        response = await openFacturaClient.post<HaulmerEmitResponse>(
          endpoint,
          documento
        )
        console.log('[Haulmer] ✅ Endpoint exitoso:', endpoint)
        break // Si funciona, salir del loop
      } catch (apiError: any) {
        lastError = apiError
        console.warn('[Haulmer] ❌ Endpoint falló:', endpoint, {
          message: apiError.message,
          status: apiError.status,
        })
        // Si es un error 405, continuar probando otros endpoints
        if (apiError.message?.includes('405') || apiError.status === 405) {
          continue
        }
        // Si es otro error, lanzarlo inmediatamente
        throw new Error(`Error al comunicarse con Haulmer (${endpoint}): ${apiError.message}`)
      }
    }
    
    // Si ningún endpoint funcionó, lanzar el último error
    if (!response && lastError) {
      console.error('[Haulmer] Todos los endpoints fallaron. Último error:', {
        message: lastError.message,
        status: lastError.status,
        endpointsProbados: possibleEndpoints,
      })
      throw new Error(
        `No se pudo conectar con Haulmer. Endpoints probados: ${possibleEndpoints.join(', ')}. ` +
        `Último error: ${lastError.message}`
      )
    }

    // La respuesta puede venir en diferentes formatos según Haulmer
    // Intentar extraer los datos de diferentes formas
    let responseData: any = null
    let folio: number | string | undefined
    let documento_id: string | undefined
    let pdf_url: string | undefined
    let xml_url: string | undefined
    let timbre: string | undefined

    // Intentar diferentes estructuras de respuesta
    if (response.data) {
      responseData = response.data
    } else if (response.documento) {
      responseData = response.documento
    } else if (response.resultado) {
      responseData = response.resultado
    } else {
      responseData = response
    }

    // Extraer folio de diferentes campos posibles
    folio = responseData?.folio || responseData?.Folio || responseData?.folioRef || responseData?.FolioRef
    documento_id = responseData?.documento_id || responseData?.documentoId || responseData?.id || responseData?.ID
    pdf_url = responseData?.pdf_url || responseData?.pdfUrl || responseData?.pdf || responseData?.url_pdf
    xml_url = responseData?.xml_url || responseData?.xmlUrl || responseData?.xml || responseData?.url_xml
    timbre = responseData?.timbre || responseData?.Timbre || responseData?.timbreElectronico

    // Validar que al menos tengamos folio o documento_id
    const hasValidResponse = !!(folio || documento_id)

    if (hasValidResponse) {
      console.log('[Haulmer] Documento emitido exitosamente:', {
        folio,
        documento_id,
        pdf_url: pdf_url ? 'presente' : 'no presente',
        responseKeys: Object.keys(responseData || {}),
      })

      return NextResponse.json({
        success: true,
        data: {
          folio,
          documento_id,
          pdf_url,
          xml_url,
          timbre,
        },
      })
    } else {
      // Log detallado para debugging
      console.error('[Haulmer] Respuesta inválida de Haulmer:', {
        response,
        responseData,
        responseKeys: response ? Object.keys(response) : [],
        responseDataKeys: responseData ? Object.keys(responseData) : [],
      })
      throw new Error(
        responseData?.error || 
        responseData?.mensaje || 
        responseData?.message || 
        response?.error || 
        response?.message || 
        'La respuesta de Haulmer no contiene folio ni documento_id'
      )
    }
  } catch (error: any) {
    console.error('[Haulmer] Error al emitir documento:', {
      message: error.message,
      stack: error.stack,
    })

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al emitir factura electrónica',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * GET /api/openfactura/emitir
 * Obtener estado de un documento emitido
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const folio = searchParams.get('folio')
    const documento_id = searchParams.get('documento_id')

    if (!folio && !documento_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Se requiere folio o documento_id',
        },
        { status: 400 }
      )
    }

    // Consultar estado del documento
    const response = await openFacturaClient.get<HaulmerEmitResponse>(
      `/api/dte/consultar`,
      { folio, documento_id }
    )

    return NextResponse.json({
      success: true,
      data: response,
    })
  } catch (error: any) {
    console.error('[Haulmer] Error al consultar documento:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al consultar documento',
      },
      { status: error.status || 500 }
    )
  }
}
