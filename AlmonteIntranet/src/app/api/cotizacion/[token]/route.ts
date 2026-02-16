import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import { validateCotizacionToken } from '@/lib/email/sendgrid'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cotizacion/[token]
 * Obtiene una cotización por su token de acceso (público)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Validar token
    const tokenData = validateCotizacionToken(token)
    if (!tokenData.valid || !tokenData.cotizacionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Token inválido o expirado',
        },
        { status: 401 }
      )
    }

    // Buscar cotización por token o ID
    const cotizacionId = tokenData.cotizacionId
    
    // Intentar buscar por token primero
    let cotizacionResponse
    try {
      cotizacionResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
        `/api/cotizaciones?filters[token_acceso][$eq]=${encodeURIComponent(token)}&populate[empresas]=true&populate[productos]=true&populate[creado_por][populate][persona]=true`
      )
      
      let cotizacion
      if (cotizacionResponse.data && Array.isArray(cotizacionResponse.data) && cotizacionResponse.data.length > 0) {
        cotizacion = cotizacionResponse.data[0]
      } else if (cotizacionResponse.data && !Array.isArray(cotizacionResponse.data)) {
        cotizacion = cotizacionResponse.data
      } else {
        // Si no se encuentra por token, buscar por ID
        cotizacionResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
          `/api/cotizaciones/${cotizacionId}?populate[empresas]=true&populate[productos]=true&populate[creado_por][populate][persona]=true`
        )
        cotizacion = cotizacionResponse.data
      }

      if (!cotizacion) {
        return NextResponse.json(
          {
            success: false,
            error: 'Cotización no encontrada',
          },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        data: cotizacion,
      }, { status: 200 })
    } catch (error: any) {
      // Si falla, intentar buscar directamente por ID
      try {
        cotizacionResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
          `/api/cotizaciones/${cotizacionId}?populate[empresas]=true&populate[productos]=true&populate[creado_por][populate][persona]=true`
        )
        
        if (!cotizacionResponse.data) {
          return NextResponse.json(
            {
              success: false,
              error: 'Cotización no encontrada',
            },
            { status: 404 }
          )
        }

        return NextResponse.json({
          success: true,
          data: cotizacionResponse.data,
        }, { status: 200 })
      } catch (err: any) {
        throw err
      }
    }
  } catch (error: any) {
    console.error('[API /cotizacion/[token] GET] Error:', {
      message: error.message,
      status: error.status,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener cotización',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * POST /api/cotizacion/[token]
 * Permite a una empresa responder con su valor estimado (público)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()

    // Validar token
    const tokenData = validateCotizacionToken(token)
    if (!tokenData.valid || !tokenData.cotizacionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Token inválido o expirado',
        },
        { status: 401 }
      )
    }

    const { valor_empresa, empresa_id, notas } = body

    if (!valor_empresa || isNaN(Number(valor_empresa))) {
      return NextResponse.json(
        {
          success: false,
          error: 'El valor de la empresa es obligatorio y debe ser un número válido',
        },
        { status: 400 }
      )
    }

    // Buscar cotización
    const cotizacionId = tokenData.cotizacionId
    let cotizacionResponse
    try {
      cotizacionResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
        `/api/cotizaciones?filters[token_acceso][$eq]=${encodeURIComponent(token)}`
      )
      
      let cotizacion: StrapiEntity<any> | null = null
      if (cotizacionResponse.data && Array.isArray(cotizacionResponse.data) && cotizacionResponse.data.length > 0) {
        cotizacion = cotizacionResponse.data[0]
      } else if (cotizacionResponse.data && !Array.isArray(cotizacionResponse.data)) {
        cotizacion = cotizacionResponse.data
      } else {
        cotizacionResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
          `/api/cotizaciones/${cotizacionId}`
        )
        if (cotizacionResponse.data) {
          cotizacion = Array.isArray(cotizacionResponse.data) ? cotizacionResponse.data[0] : cotizacionResponse.data
        }
      }

      if (!cotizacion) {
        return NextResponse.json(
          {
            success: false,
            error: 'Cotización no encontrada',
          },
          { status: 404 }
        )
      }

      const cotizacionDocId = cotizacion.documentId || cotizacion.id || cotizacionId

      // Actualizar cotización con el valor de la empresa
      // Guardar respuestas en un array para permitir múltiples empresas
      const attrs = cotizacion.attributes || cotizacion
      const respuestasExistentes = attrs.respuestas_empresas || []
      
      // Buscar si ya existe una respuesta de esta empresa
      const respuestaExistenteIndex = respuestasExistentes.findIndex(
        (r: any) => String(r.empresa_id) === String(empresa_id)
      )

      const nuevaRespuesta = {
        empresa_id: empresa_id || null,
        valor_empresa: Number(valor_empresa),
        notas: notas || '',
        fecha_respuesta: new Date().toISOString(),
      }

      let respuestasActualizadas
      if (respuestaExistenteIndex >= 0) {
        // Actualizar respuesta existente
        respuestasActualizadas = [...respuestasExistentes]
        respuestasActualizadas[respuestaExistenteIndex] = nuevaRespuesta
      } else {
        // Agregar nueva respuesta
        respuestasActualizadas = [...respuestasExistentes, nuevaRespuesta]
      }

      await strapiClient.put(`/api/cotizaciones/${cotizacionDocId}`, {
        data: {
          respuestas_empresas: respuestasActualizadas,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Valor registrado exitosamente. Gracias por su respuesta.',
      }, { status: 200 })
    } catch (error: any) {
      // Si falla, intentar buscar directamente por ID
      try {
        cotizacionResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
          `/api/cotizaciones/${cotizacionId}`
        )
        
        if (!cotizacionResponse.data) {
          return NextResponse.json(
            {
              success: false,
              error: 'Cotización no encontrada',
            },
            { status: 404 }
          )
        }

        // Extraer cotización única (puede ser array o objeto)
        const cotizacion: StrapiEntity<any> = Array.isArray(cotizacionResponse.data) 
          ? cotizacionResponse.data[0] 
          : cotizacionResponse.data

        const cotizacionDocId = cotizacion.documentId || cotizacion.id || cotizacionId
        const attrs = cotizacion.attributes || cotizacion
        const respuestasExistentes = attrs.respuestas_empresas || []
        
        const nuevaRespuesta = {
          empresa_id: empresa_id || null,
          valor_empresa: Number(valor_empresa),
          notas: notas || '',
          fecha_respuesta: new Date().toISOString(),
        }

        const respuestasActualizadas = [...respuestasExistentes, nuevaRespuesta]

        await strapiClient.put(`/api/cotizaciones/${cotizacionDocId}`, {
          data: {
            respuestas_empresas: respuestasActualizadas,
          },
        })

        return NextResponse.json({
          success: true,
          message: 'Valor registrado exitosamente. Gracias por su respuesta.',
        }, { status: 200 })
      } catch (err: any) {
        throw err
      }
    }
  } catch (error: any) {
    console.error('[API /cotizacion/[token] POST] Error:', {
      message: error.message,
      status: error.status,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al registrar respuesta',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}





