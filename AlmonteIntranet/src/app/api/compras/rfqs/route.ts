import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import { createRFQ, sendRFQToProviders } from '@/lib/services/rfqService'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/compras/rfqs
 * Lista todas las RFQs con filtros y paginación
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') || '1'
    const pageSize = searchParams.get('pageSize') || '25'
    const search = searchParams.get('search') || ''
    const estado = searchParams.get('estado') || ''
    const empresaId = searchParams.get('empresaId') || ''
    
    // Usar populate específico para evitar errores con comuna en empresas
    // Para empresas (manyToMany): populatear empresas con emails anidados
    // Para productos (manyToMany): usar populate=true (populate=* causa error "Invalid key portada_libro")
    // NOTA: En Strapi v5, no se puede usar populate[empresas]=* y populate[empresas][populate][emails] al mismo tiempo
    // IMPORTANTE: Para cotizaciones_recibidas, populatear también empresa y contacto_responsable
    const params = new URLSearchParams({
      'pagination[page]': page,
      'pagination[pageSize]': pageSize,
      'sort[0]': 'createdAt:desc',
      'populate[empresas][populate][emails]': 'true',
      'populate[productos]': 'true', // Usar populate simple - si hay error con portada_libro, Strapi lo ignorará pero seguirá populando
      'populate[creado_por][populate][persona]': 'true',
      'populate[cotizaciones_recibidas][populate][empresa][populate][emails]': 'true',
      'populate[cotizaciones_recibidas][populate][contacto_responsable]': 'true',
    })
    
    if (search) {
      params.append('filters[$or][0][nombre][$containsi]', search)
      params.append('filters[$or][1][numero_rfq][$containsi]', search)
      params.append('filters[$or][2][descripcion][$containsi]', search)
    }
    
    if (estado) {
      params.append('filters[estado][$eq]', estado)
    }
    
    // Si hay filtro por empresaId, verificar si es documentId y convertirlo a ID numérico
    let empresaIdFinal = empresaId
    if (empresaId) {
      const isDocumentId = typeof empresaId === 'string' && !/^\d+$/.test(empresaId)
      
      if (isDocumentId) {
        try {
          // Obtener el ID numérico de la empresa si es documentId
          const empresaResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
            `/api/empresas/${empresaId}?fields[0]=id`
          )
          const empresaData = Array.isArray(empresaResponse.data) 
            ? empresaResponse.data[0] 
            : empresaResponse.data
          
          if (empresaData && typeof empresaData === 'object' && 'id' in empresaData) {
            empresaIdFinal = String(empresaData.id as number)
          } else {
            // Si no se encuentra la empresa, retornar error
            return NextResponse.json(
              {
                success: false,
                error: 'Empresa no encontrada',
              },
              { status: 404 }
            )
          }
        } catch (error: any) {
          console.error('[API /compras/rfqs GET] Error al obtener empresa:', error)
          return NextResponse.json(
            {
              success: false,
              error: 'Error al obtener empresa: ' + (error.message || 'Empresa no encontrada'),
            },
            { status: error.status || 404 }
          )
        }
      }
      
      params.append('filters[empresas][id][$eq]', empresaIdFinal)
    }
    
    const response = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
      `/api/rfqs?${params.toString()}`
    )
    
    return NextResponse.json({
      success: true,
      data: response.data,
      meta: response.meta,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /compras/rfqs GET] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener RFQs',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * POST /api/compras/rfqs
 * Crea una nueva RFQ
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('[API /compras/rfqs POST] 📥 Datos recibidos del frontend:', {
      nombre: body.nombre,
      empresas: body.empresas,
      empresasType: body.empresas?.map((e: any) => ({ e, type: typeof e })),
      productos: body.productos,
      productosType: body.productos?.map((p: any) => ({ p, type: typeof p })),
    })
    
    // Validaciones básicas
    if (!body.nombre || !body.nombre.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'El nombre de la RFQ es obligatorio',
        },
        { status: 400 }
      )
    }
    
    if (!body.empresas || !Array.isArray(body.empresas) || body.empresas.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Debe seleccionar al menos una empresa',
        },
        { status: 400 }
      )
    }
    
    if (!body.productos || !Array.isArray(body.productos) || body.productos.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Debe seleccionar al menos un producto',
        },
        { status: 400 }
      )
    }
    
    console.log('[API /compras/rfqs POST] ✅ Validaciones pasadas, llamando a createRFQ con:', {
      productos: body.productos,
      productosCount: body.productos.length,
    })
    
    const rfqData = {
      nombre: body.nombre.trim(),
      descripcion: body.descripcion?.trim(),
      fecha_solicitud: body.fecha_solicitud || new Date().toISOString().split('T')[0],
      fecha_vencimiento: body.fecha_vencimiento,
      estado: body.estado || 'draft',
      moneda: body.moneda || 'CLP',
      // IMPORTANTE: empresas puede contener números (ID interno) o strings (documentId)
      // NO convertir a Number porque documentId son UUIDs que se convertirían en NaN
      empresas: body.empresas, // Pasar tal como vienen, el servicio los procesará
      // IMPORTANTE: productos puede contener números (ID interno) o strings (documentId)
      // NO convertir a Number porque documentId son UUIDs que se convertirían en NaN
      productos: body.productos, // Pasar tal como vienen, el servicio los procesará
      productos_cantidades: body.productos_cantidades || {}, // Cantidades por producto
      creado_por: body.creado_por ? Number(body.creado_por) : undefined,
      notas_internas: body.notas_internas?.trim(),
    }
    
    console.log('[API /compras/rfqs POST] 📦 Datos preparados para createRFQ:', {
      empresas: rfqData.empresas,
      empresasTypes: rfqData.empresas.map((e: any) => ({ e, type: typeof e })),
      productos: rfqData.productos,
      productosTypes: rfqData.productos.map((p: any) => ({ p, type: typeof p })),
    })
    
    const result = await createRFQ(rfqData)
    
    if (!result.success) {
      // Determinar código de estado apropiado basado en el error
      let statusCode = 500
      if (result.error?.includes('no existe en Strapi')) {
        statusCode = 404
      } else if (result.error?.includes('inválidos') || result.error?.includes('válidas')) {
        statusCode = 400
      }
      
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Error al crear RFQ',
        },
        { status: statusCode }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'RFQ creada exitosamente',
    }, { status: 201 })
  } catch (error: any) {
    console.error('[API /compras/rfqs POST] Error:', error)
    
    // Manejar errores de Strapi
    let errorMessage = error.message || 'Error al crear RFQ'
    let statusCode = error.status || 500
    
    if (error.status === 404) {
      errorMessage = 'El content type "rfqs" no existe en Strapi. Por favor, créalo primero según la documentación en docs/crm/STRAPI-SCHEMA-COMPRAS-PROVEEDORES.md'
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

