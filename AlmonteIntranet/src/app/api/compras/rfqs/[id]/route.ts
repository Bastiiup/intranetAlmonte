import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/compras/rfqs/[id]
 * Obtiene una RFQ específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    let rfq: any = null
    
    // Intentar primero con el endpoint directo
    try {
      // Usar populate específico para evitar errores con comuna y asegurar que traiga emails
      // Populatear empresas y emails, pero evitar populatear comuna usando populate anidado específico
      const response = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
        `/api/rfqs/${id}?populate[empresas][populate][emails]=true&populate[productos]=true&populate[creado_por][populate][persona]=true&populate[cotizaciones_recibidas][populate][empresa][populate][emails]=true&populate[cotizaciones_recibidas][populate][contacto_responsable]=true`
      )
      
      if (response.data) {
        rfq = response.data
      }
    } catch (directError: any) {
      // Si falla, intentar buscar por documentId
      try {
        const isDocumentId = /^[a-zA-Z0-9_-]+$/.test(id) && !/^\d+$/.test(id)
        
        let filterParams: URLSearchParams
        // Usar populate específico para evitar errores con comuna y asegurar que traiga emails
        if (isDocumentId) {
          filterParams = new URLSearchParams({
            'filters[documentId][$eq]': id,
            'populate[empresas][populate][emails]': 'true',
            'populate[productos]': 'true',
            'populate[creado_por][populate][persona]': 'true',
            'populate[cotizaciones_recibidas][populate][empresa][populate][emails]': 'true',
            'populate[cotizaciones_recibidas][populate][contacto_responsable]': 'true',
          })
        } else {
          filterParams = new URLSearchParams({
            'filters[id][$eq]': id.toString(),
            'populate[empresas][populate][emails]': 'true',
            'populate[productos]': 'true',
            'populate[creado_por][populate][persona]': 'true',
            'populate[cotizaciones_recibidas][populate][empresa][populate][emails]': 'true',
            'populate[cotizaciones_recibidas][populate][contacto_responsable]': 'true',
          })
        }
        
        try {
          const filterResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
            `/api/rfqs?${filterParams.toString()}`
          )
          
          if (filterResponse.data) {
            if (Array.isArray(filterResponse.data) && filterResponse.data.length > 0) {
              rfq = filterResponse.data[0]
            } else if (!Array.isArray(filterResponse.data)) {
              rfq = filterResponse.data
            }
          }
        } catch (filterError: any) {
          // Si falla, intentar con populate más simple
          console.warn('[API /compras/rfqs/[id] GET] Error con populate específico en filtro, intentando populate más simple')
          const simpleFilterParams = new URLSearchParams({
            ...(isDocumentId ? { 'filters[documentId][$eq]': id } : { 'filters[id][$eq]': id.toString() }),
            'populate[empresas][populate][emails]': 'true',
            'populate[productos]': 'true',
            'populate[creado_por][populate][persona]': 'true',
            'populate[cotizaciones_recibidas][populate][empresa][populate][emails]': 'true',
            'populate[cotizaciones_recibidas][populate][contacto_responsable]': 'true',
          })
          
          const simpleFilterResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
            `/api/rfqs?${simpleFilterParams.toString()}`
          )
          
          if (simpleFilterResponse.data) {
            if (Array.isArray(simpleFilterResponse.data) && simpleFilterResponse.data.length > 0) {
              rfq = simpleFilterResponse.data[0]
            } else if (!Array.isArray(simpleFilterResponse.data)) {
              rfq = simpleFilterResponse.data
            }
          }
        }
      } catch (filterError: any) {
        console.error('[API /compras/rfqs/[id] GET] Error en búsqueda por filtro:', filterError.message)
      }
    }
    
    if (!rfq) {
      return NextResponse.json(
        {
          success: false,
          error: 'RFQ no encontrada',
        },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: rfq,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /compras/rfqs/[id] GET] Error:', error)
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
 * PUT /api/compras/rfqs/[id]
 * Actualiza una RFQ
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
    
    if (body.nombre) updateData.data.nombre = body.nombre.trim()
    if (body.descripcion !== undefined) updateData.data.descripcion = body.descripcion?.trim() || null
    if (body.fecha_solicitud) updateData.data.fecha_solicitud = body.fecha_solicitud
    if (body.fecha_vencimiento !== undefined) updateData.data.fecha_vencimiento = body.fecha_vencimiento || null
    if (body.estado) updateData.data.estado = body.estado
    if (body.moneda) updateData.data.moneda = body.moneda
    if (body.notas_internas !== undefined) updateData.data.notas_internas = body.notas_internas?.trim() || null
    if (body.activo !== undefined) updateData.data.activo = body.activo
    
    // Actualizar relaciones
    if (body.empresas && Array.isArray(body.empresas)) {
      updateData.data.empresas = { connect: body.empresas.map((id: any) => Number(id)) }
    }
    if (body.productos && Array.isArray(body.productos)) {
      updateData.data.productos = { connect: body.productos.map((id: any) => Number(id)) }
    }
    
    // Intentar primero con el ID recibido
    let response: StrapiResponse<StrapiEntity<any>>
    try {
      response = await strapiClient.put<StrapiResponse<StrapiEntity<any>>>(
        `/api/rfqs/${id}`,
        updateData
      )
    } catch (putError: any) {
      // Si falla con 404, buscar la RFQ para obtener el ID correcto
      if (putError.status === 404) {
        console.warn('[API /compras/rfqs/[id] PUT] Error 404 con ID, buscando RFQ para obtener ID correcto:', id)
        try {
          // Intentar buscar por documentId si el ID no es numérico, o por id si es numérico
          const isNumericId = /^\d+$/.test(id)
          let searchResponse: StrapiResponse<StrapiEntity<any>>
          
          if (isNumericId) {
            // Si es numérico, buscar por documentId
            searchResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
              `/api/rfqs?filters[documentId][$eq]=${id}`
            )
          } else {
            // Si no es numérico, buscar por id numérico
            searchResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
              `/api/rfqs?filters[id][$eq]=${id}`
            )
          }
          
          if (searchResponse.data) {
            const rfqData = Array.isArray(searchResponse.data) ? searchResponse.data[0] : searchResponse.data
            if (rfqData) {
              // Usar documentId si está disponible, sino usar id
              const correctId = rfqData.documentId || rfqData.id || id
              console.log('[API /compras/rfqs/[id] PUT] RFQ encontrada, usando ID correcto:', correctId)
              response = await strapiClient.put<StrapiResponse<StrapiEntity<any>>>(
                `/api/rfqs/${correctId}`,
                updateData
              )
            } else {
              throw putError
            }
          } else {
            throw putError
          }
        } catch (searchError: any) {
          console.error('[API /compras/rfqs/[id] PUT] Error al buscar RFQ:', searchError)
          throw putError
        }
      } else {
        throw putError
      }
    }
    
    return NextResponse.json({
      success: true,
      data: response.data,
      message: 'RFQ actualizada exitosamente',
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /compras/rfqs/[id] PUT] Error:', error)
    
    // Manejar errores de Strapi
    let errorMessage = error.message || 'Error al actualizar RFQ'
    let statusCode = error.status || 500
    
    if (error.status === 404) {
      errorMessage = 'El content type "rfqs" no existe en Strapi. Por favor, créalo primero según la documentación en docs/crm/STRAPI-SCHEMA-COMPRAS-PROVEEDORES.md'
      statusCode = 404
    } else if (error.response?.data) {
      // Intentar extraer mensaje de error de Strapi
      const strapiError = error.response.data
      if (strapiError.error?.message) {
        errorMessage = strapiError.error.message
      } else if (typeof strapiError === 'string') {
        errorMessage = strapiError
      }
    }
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        status: statusCode,
      },
      { status: statusCode }
    )
  }
}

/**
 * DELETE /api/compras/rfqs/[id]
 * Elimina (soft delete) una RFQ
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Soft delete: marcar como inactiva
    try {
      await strapiClient.put<StrapiResponse<StrapiEntity<any>>>(`/api/rfqs/${id}`, {
        data: {
          activo: false,
        },
      })
    } catch (deleteError: any) {
      // Si falla con 404, buscar la RFQ para obtener el ID correcto
      if (deleteError.status === 404) {
        console.warn('[API /compras/rfqs/[id] DELETE] Error 404 con ID, buscando RFQ para obtener ID correcto:', id)
        try {
          const isNumericId = /^\d+$/.test(id)
          let searchResponse: StrapiResponse<StrapiEntity<any>>
          
          if (isNumericId) {
            searchResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
              `/api/rfqs?filters[documentId][$eq]=${id}`
            )
          } else {
            searchResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
              `/api/rfqs?filters[id][$eq]=${id}`
            )
          }
          
          if (searchResponse.data) {
            const rfqData = Array.isArray(searchResponse.data) ? searchResponse.data[0] : searchResponse.data
            if (rfqData) {
              const correctId = rfqData.documentId || rfqData.id || id
              console.log('[API /compras/rfqs/[id] DELETE] RFQ encontrada, usando ID correcto:', correctId)
              await strapiClient.put<StrapiResponse<StrapiEntity<any>>>(`/api/rfqs/${correctId}`, {
                data: {
                  activo: false,
                },
              })
            } else {
              throw deleteError
            }
          } else {
            throw deleteError
          }
        } catch (searchError: any) {
          console.error('[API /compras/rfqs/[id] DELETE] Error al buscar RFQ:', searchError)
          throw deleteError
        }
      } else {
        throw deleteError
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'RFQ eliminada exitosamente',
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /compras/rfqs/[id] DELETE] Error:', error)
    
    // Manejar errores de Strapi
    let errorMessage = error.message || 'Error al eliminar RFQ'
    let statusCode = error.status || 500
    
    if (error.status === 404) {
      errorMessage = 'El content type "rfqs" no existe en Strapi. Por favor, créalo primero según la documentación en docs/crm/STRAPI-SCHEMA-COMPRAS-PROVEEDORES.md'
      statusCode = 404
    } else if (error.response?.data) {
      // Intentar extraer mensaje de error de Strapi
      const strapiError = error.response.data
      if (strapiError.error?.message) {
        errorMessage = strapiError.error.message
      } else if (typeof strapiError === 'string') {
        errorMessage = strapiError
      }
    }
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        status: statusCode,
      },
      { status: statusCode }
    )
  }
}

