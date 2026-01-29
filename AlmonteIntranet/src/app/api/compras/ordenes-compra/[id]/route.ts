import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/compras/ordenes-compra/[id]
 * Obtiene una Orden de Compra específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID de Orden de Compra no proporcionado',
        },
        { status: 400 }
      )
    }
    
    const isNumericId = /^\d+$/.test(id)
    // items es un componente, no una relación, así que no se puede poblar
    // Los items se obtienen directamente desde la cotización
    // Poblar productos del RFQ para generar items si no existen en la cotización
    const populateParams = 'populate[empresa][populate][emails]=true&populate[cotizacion_recibida][populate][rfq][populate][productos]=true&populate[cotizacion_recibida][populate][empresa][populate][emails]=true&populate[creado_por][populate][persona][populate][emails]=true&populate[factura]=true&populate[orden_despacho]=true&populate[documento_pago]=true'
    
    let ordenCompra: StrapiEntity<any> | null = null
    
    // Intentar primero con el endpoint directo
    try {
      const response = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
        `/api/ordenes-compra/${id}?${populateParams}`
      )
      
      if (response.data) {
        ordenCompra = Array.isArray(response.data) ? response.data[0] : response.data
        console.log('[API /compras/ordenes-compra/[id] GET] ✅ Orden de Compra encontrada directamente')
      }
    } catch (directError: any) {
      // Si falla con 404, intentar buscar por filtros alternativos
      if (directError.status === 404) {
        console.log(`[API /compras/ordenes-compra/[id] GET] Error 404 con ID directo "${id}" (${isNumericId ? 'numérico' : 'documentId'}), buscando por filtros alternativos`)
        
        try {
          // Intentar buscar por id numérico si el ID es numérico, o por documentId si no lo es
          const searchParams = new URLSearchParams({
            ...(isNumericId ? { 'filters[id][$eq]': id } : { 'filters[documentId][$eq]': id }),
            'populate[empresa][populate][emails]': 'true',
            'populate[cotizacion_recibida][populate][rfq][populate][productos]': 'true',
            'populate[cotizacion_recibida][populate][empresa][populate][emails]': 'true',
            'populate[creado_por][populate][persona][populate][emails]': 'true',
            'populate[factura]': 'true',
            'populate[orden_despacho]': 'true',
            'populate[documento_pago]': 'true',
          })
          
          const filterResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
            `/api/ordenes-compra?${searchParams.toString()}`
          )
          
          if (filterResponse.data) {
            if (Array.isArray(filterResponse.data) && filterResponse.data.length > 0) {
              ordenCompra = filterResponse.data[0]
              console.log(`[API /compras/ordenes-compra/[id] GET] ✅ Orden de Compra encontrada con filtro alternativo`)
            } else if (!Array.isArray(filterResponse.data)) {
              ordenCompra = filterResponse.data
              console.log(`[API /compras/ordenes-compra/[id] GET] ✅ Orden de Compra encontrada con filtro alternativo (objeto único)`)
            }
          }
          
          // Si aún no se encontró, intentar con el filtro inverso
          if (!ordenCompra) {
            const altSearchParams = new URLSearchParams({
              ...(isNumericId ? { 'filters[documentId][$eq]': id } : { 'filters[id][$eq]': id }),
              'populate[empresa][populate][emails]': 'true',
              'populate[cotizacion_recibida][populate][rfq][populate][productos]': 'true',
              'populate[cotizacion_recibida][populate][empresa][populate][emails]': 'true',
              'populate[creado_por][populate][persona][populate][emails]': 'true',
              'populate[factura]': 'true',
              'populate[orden_despacho]': 'true',
            })
            
            const altFilterResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
              `/api/ordenes-compra?${altSearchParams.toString()}`
            )
            
            if (altFilterResponse.data) {
              if (Array.isArray(altFilterResponse.data) && altFilterResponse.data.length > 0) {
                ordenCompra = altFilterResponse.data[0]
                console.log(`[API /compras/ordenes-compra/[id] GET] ✅ Orden de Compra encontrada con filtro inverso`)
              } else if (!Array.isArray(altFilterResponse.data)) {
                ordenCompra = altFilterResponse.data
                console.log(`[API /compras/ordenes-compra/[id] GET] ✅ Orden de Compra encontrada con filtro inverso (objeto único)`)
              }
            }
          }
        } catch (filterError: any) {
          console.error('[API /compras/ordenes-compra/[id] GET] Error en búsqueda alternativa:', filterError.message)
        }
      } else {
        // Si no es 404, lanzar el error original
        throw directError
      }
    }
    
    if (!ordenCompra) {
      return NextResponse.json(
        {
          success: false,
          error: `Orden de Compra no encontrada con ID: ${id}. Verifica que el ID sea correcto (puede ser id numérico o documentId).`,
        },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: ordenCompra,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /compras/ordenes-compra/[id] GET] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener Orden de Compra',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * PUT /api/compras/ordenes-compra/[id]
 * Actualiza una Orden de Compra
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const updateData: any = {
      data: {},
    }
    
    if (body.fecha_entrega_estimada !== undefined) {
      updateData.data.fecha_entrega_estimada = body.fecha_entrega_estimada || null
    }
    if (body.estado) {
      updateData.data.estado = body.estado
    }
    if (body.notas !== undefined) {
      updateData.data.notas = body.notas?.trim() || null
    }
    if (body.direccion_facturacion) {
      updateData.data.direccion_facturacion = body.direccion_facturacion
    }
    if (body.direccion_despacho) {
      updateData.data.direccion_despacho = body.direccion_despacho
    }
    if (body.activo !== undefined) {
      updateData.data.activo = body.activo
    }
    
    // Manejar subida de factura y orden de despacho
    if (body.factura_id) {
      updateData.data.factura = { connect: [Number(body.factura_id)] }
    }
    if (body.orden_despacho_id) {
      updateData.data.orden_despacho = { connect: [Number(body.orden_despacho_id)] }
    }
    
    // Usar documentId si el ID es un UUID, o el ID numérico directamente
    // Strapi v5 acepta ambos formatos en el endpoint PUT
    const response = await strapiClient.put<StrapiResponse<StrapiEntity<any>>>(
      `/api/ordenes-compra/${id}`,
      updateData
    )
    
    return NextResponse.json({
      success: true,
      data: response.data,
      message: 'Orden de Compra actualizada exitosamente',
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /compras/ordenes-compra/[id] PUT] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al actualizar Orden de Compra',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}


