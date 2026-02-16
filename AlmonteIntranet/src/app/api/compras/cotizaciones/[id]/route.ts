// Alias para /api/compras/cotizaciones-recibidas/[id]
import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/compras/cotizaciones/[id]
 * Obtiene una cotización recibida específica (alias de cotizaciones-recibidas/[id])
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
          error: 'ID de cotización no proporcionado',
        },
        { status: 400 }
      )
    }
    
    let cotizacion: any = null
    
    // Intentar primero con el endpoint directo
    try {
      const response = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
        `/api/cotizaciones-recibidas/${id}?populate[rfq][populate][productos]=true&populate[empresa]=true&populate[contacto_responsable]=true&populate[orden_compra]=true&populate[archivo_pdf]=true`
      )
      
      if (response.data) {
        cotizacion = response.data
      }
    } catch (directError: any) {
      // Si falla con 404, intentar buscar por documentId o id alternativo
      if (directError.status === 404) {
        const isNumericId = /^\d+$/.test(id)
        console.log(`[API /compras/cotizaciones/[id] GET] Error 404 con ID directo "${id}" (${isNumericId ? 'numérico' : 'documentId'}), buscando por filtros alternativos`)
        
        try {
          // Intentar buscar por id numérico si el ID es numérico, o por documentId si no lo es
          let searchParams: URLSearchParams
          if (isNumericId) {
            // Si es numérico, buscar por id numérico
            searchParams = new URLSearchParams({
              'filters[id][$eq]': id,
              'populate[rfq][populate][productos]': 'true',
              'populate[empresa]': 'true',
              'populate[contacto_responsable]': 'true',
              'populate[orden_compra]': 'true',
              'populate[archivo_pdf]': 'true',
            })
          } else {
            // Si no es numérico (es un UUID string), buscar por documentId
            searchParams = new URLSearchParams({
              'filters[documentId][$eq]': id,
              'populate[rfq][populate][productos]': 'true',
              'populate[empresa]': 'true',
              'populate[contacto_responsable]': 'true',
              'populate[orden_compra]': 'true',
              'populate[archivo_pdf]': 'true',
            })
          }
          
          try {
            const filterResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
              `/api/cotizaciones-recibidas?${searchParams.toString()}`
            )
            
            if (filterResponse.data) {
              if (Array.isArray(filterResponse.data) && filterResponse.data.length > 0) {
                cotizacion = filterResponse.data[0]
                console.log(`[API /compras/cotizaciones/[id] GET] ✅ Cotización encontrada con filtro alternativo`)
              } else if (!Array.isArray(filterResponse.data)) {
                cotizacion = filterResponse.data
                console.log(`[API /compras/cotizaciones/[id] GET] ✅ Cotización encontrada con filtro alternativo (objeto único)`)
              }
            }
          } catch (filterError: any) {
            // Si aún falla, intentar con el filtro alternativo (invertir la búsqueda)
            console.warn(`[API /compras/cotizaciones/[id] GET] Error con primer filtro, intentando filtro alternativo`)
            const altSearchParams = new URLSearchParams({
              ...(isNumericId ? { 'filters[documentId][$eq]': id } : { 'filters[id][$eq]': id }),
              'populate[rfq][populate][productos]': 'true',
              'populate[empresa]': 'true',
              'populate[contacto_responsable]': 'true',
              'populate[orden_compra]': 'true',
              'populate[archivo_pdf]': 'true',
            })
            
            try {
              const altFilterResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
                `/api/cotizaciones-recibidas?${altSearchParams.toString()}`
              )
              
              if (altFilterResponse.data) {
                if (Array.isArray(altFilterResponse.data) && altFilterResponse.data.length > 0) {
                  cotizacion = altFilterResponse.data[0]
                  console.log(`[API /compras/cotizaciones/[id] GET] ✅ Cotización encontrada con filtro alternativo invertido`)
                } else if (!Array.isArray(altFilterResponse.data)) {
                  cotizacion = altFilterResponse.data
                }
              }
            } catch (altFilterError: any) {
              console.error(`[API /compras/cotizaciones/[id] GET] Error con filtro alternativo:`, altFilterError.message)
            }
          }
        } catch (searchError: any) {
          console.error(`[API /compras/cotizaciones/[id] GET] Error al buscar por filtros:`, searchError.message)
        }
      } else {
        throw directError
      }
    }
    
    if (!cotizacion) {
      return NextResponse.json(
        {
          success: false,
          error: `Cotización recibida no encontrada con ID: ${id}. Verifica que el ID sea correcto (puede ser id numérico o documentId).`,
          details: {
            hint: 'El ID puede ser un número (id) o un string (documentId). Verifica que la cotización exista en Strapi.',
            isNumericId: /^\d+$/.test(id),
          },
        },
        { status: 404 }
      )
    }
    
    // Normalizar la cotización para asegurar campos consistentes
    const cotizacionData = cotizacion
    const cotizacionAttrs = cotizacionData.attributes || cotizacionData
    
    // Normalizar nombres de campos: precio_total -> monto_total (para compatibilidad con frontend)
    // También asegurar que precio_unitario esté disponible
    const cotizacionNormalizada = {
      ...cotizacionData,
      id: cotizacionData.id,
      documentId: cotizacionData.documentId,
      attributes: {
        ...cotizacionAttrs,
        // Asegurar que ambos nombres estén disponibles
        precio_total: cotizacionAttrs.precio_total,
        precio_unitario: cotizacionAttrs.precio_unitario,
        monto_total: cotizacionAttrs.precio_total || cotizacionAttrs.monto_total, // Compatibilidad
        monto_unitario: cotizacionAttrs.precio_unitario || cotizacionAttrs.monto_unitario, // Compatibilidad
      },
      // También en el nivel superior para compatibilidad
      precio_total: cotizacionAttrs.precio_total,
      precio_unitario: cotizacionAttrs.precio_unitario,
      monto_total: cotizacionAttrs.precio_total || cotizacionAttrs.monto_total,
      monto_unitario: cotizacionAttrs.precio_unitario || cotizacionAttrs.monto_unitario,
    }
    
    // Si hay RFQ relacionada, obtener productos de la RFQ para mostrar en items
    if (cotizacionAttrs.rfq) {
      const rfq = cotizacionAttrs.rfq?.data || cotizacionAttrs.rfq
      const rfqAttrs = rfq?.attributes || rfq
      
      if (rfqAttrs?.productos) {
        // Extraer productos de la RFQ
        let productosRFQ: any[] = []
        if (Array.isArray(rfqAttrs.productos)) {
          productosRFQ = rfqAttrs.productos
        } else if (rfqAttrs.productos.data) {
          if (Array.isArray(rfqAttrs.productos.data)) {
            productosRFQ = rfqAttrs.productos.data
          } else if (rfqAttrs.productos.data && typeof rfqAttrs.productos.data === 'object') {
            productosRFQ = [rfqAttrs.productos.data]
          }
        }
        
        // Obtener cantidades de la RFQ si están disponibles
        const productosCantidades = rfqAttrs.productos_cantidades
          ? (typeof rfqAttrs.productos_cantidades === 'string' 
              ? JSON.parse(rfqAttrs.productos_cantidades) 
              : rfqAttrs.productos_cantidades)
          : {}
        
        // Crear items basados en productos de la RFQ
        const items = productosRFQ.map((producto: any) => {
          const prodAttrs = producto.attributes || producto
          const productoId = producto.documentId || producto.id
          const cantidad = productosCantidades[productoId] || productosCantidades[String(productoId)] || 1
          
          return {
            producto: producto,
            producto_nombre: prodAttrs.nombre_libro || prodAttrs.nombre || 'Producto',
            cantidad: cantidad,
            precio_unitario: cotizacionAttrs.precio_unitario, // Precio unitario de la cotización
            subtotal: cotizacionAttrs.precio_unitario ? Number(cotizacionAttrs.precio_unitario) * Number(cantidad) : null,
            precio_total: cotizacionAttrs.precio_unitario ? Number(cotizacionAttrs.precio_unitario) * Number(cantidad) : null,
          }
        })
        
        cotizacionNormalizada.attributes.items = items
        cotizacionNormalizada.items = items
      }
    }
    
    return NextResponse.json({
      success: true,
      data: cotizacionNormalizada,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /compras/cotizaciones/[id] GET] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener cotización recibida',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

