/**
 * API Route para calcular costos de envío (cotización) con Shipit
 * POST: Calcula el costo de envío para un pedido antes de crearlo
 */

import { NextRequest, NextResponse } from 'next/server'
import shipitClient from '@/lib/shipit/client'
import type { ShipitSizes, ShipitDestiny } from '@/lib/shipit/types'
import { getCommuneId } from '@/lib/shipit/communes'

export const dynamic = 'force-dynamic'

/**
 * Tipo para la solicitud de cotización
 */
interface RateRequest {
  commune_id?: number
  commune_name?: string
  sizes: ShipitSizes
  kind?: 0 | 1 | 2 // 0: normal, 1: express, 2: same_day
  courier?: string // Courier específico (opcional)
  insurance_amount?: number // Monto del seguro (opcional)
}

/**
 * Tipo para la respuesta de cotización
 */
interface ShipitRate {
  courier: {
    name: string
    client: string
  }
  price: number
  estimated_days?: number
  available: boolean
  kind: 0 | 1 | 2
}

/**
 * POST /api/shipit/rates
 * Calcula los costos de envío disponibles para un destino y dimensiones específicas
 * 
 * Body:
 * {
 *   commune_id?: number,        // ID de comuna (requerido si no hay commune_name)
 *   commune_name?: string,      // Nombre de comuna (requerido si no hay commune_id)
 *   sizes: {                    // Dimensiones del paquete
 *     width: number,           // cm
 *     height: number,           // cm
 *     length: number,           // cm
 *     weight: number            // kg
 *   },
 *   kind?: 0 | 1 | 2,          // Tipo de envío (0: normal, 1: express, 2: same_day)
 *   courier?: string,           // Courier específico (opcional)
 *   insurance_amount?: number   // Monto del seguro (opcional)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body: RateRequest = await request.json()
    const { commune_id, commune_name, sizes, kind = 0, courier, insurance_amount } = body

    // Validar que se proporcione commune_id o commune_name
    let finalCommuneId = commune_id
    if (!finalCommuneId && commune_name) {
      finalCommuneId = getCommuneId(commune_name) || undefined
    }

    if (!finalCommuneId) {
      return NextResponse.json(
        {
          success: false,
          error: 'commune_id o commune_name válido es requerido',
        },
        { status: 400 }
      )
    }

    // Validar dimensiones
    if (!sizes || !sizes.width || !sizes.height || !sizes.length || !sizes.weight) {
      return NextResponse.json(
        {
          success: false,
          error: 'Las dimensiones (width, height, length, weight) son requeridas',
        },
        { status: 400 }
      )
    }

    console.log('[API Shipit Rates] Calculando costos de envío:', {
      commune_id: finalCommuneId,
      sizes,
      kind,
      courier,
    })

    // Construir datos para la cotización
    // Nota: La API de Shipit puede tener diferentes endpoints para cotización
    // Según la documentación, puede ser /shipments/rates o /rates
    const rateData: any = {
      commune_id: finalCommuneId,
      sizes: {
        width: sizes.width,
        height: sizes.height,
        length: sizes.length,
        weight: sizes.weight,
      },
      kind: kind,
    }

    if (courier) {
      rateData.courier = courier
    }

    if (insurance_amount) {
      rateData.insurance_amount = insurance_amount
    }

    // Intentar obtener cotizaciones de Shipit
    // Nota: El endpoint exacto puede variar según la versión de la API
    // Intentar primero con /shipments/rates, luego con /rates
    let rates: ShipitRate[] = []
    try {
      const response = await shipitClient.post<{ rates: ShipitRate[] } | ShipitRate[]>(
        'shipments/rates',
        rateData
      )
      
      // La respuesta puede venir como { rates: [...] } o directamente como array
      if (Array.isArray(response)) {
        rates = response
      } else if (response.rates && Array.isArray(response.rates)) {
        rates = response.rates
      } else {
        rates = [response as any]
      }
    } catch (error: any) {
      // Si falla con shipments/rates, intentar con /rates
      if (error.status === 404 || error.message?.includes('not found')) {
        try {
          const response = await shipitClient.post<{ rates: ShipitRate[] } | ShipitRate[]>(
            'rates',
            rateData
          )
          
          if (Array.isArray(response)) {
            rates = response
          } else if (response.rates && Array.isArray(response.rates)) {
            rates = response.rates
          } else {
            rates = [response as any]
          }
        } catch (secondError: any) {
          console.error('[API Shipit Rates] Error al obtener cotizaciones:', secondError)
          throw secondError
        }
      } else {
        throw error
      }
    }

    // Ordenar por precio (más barato primero)
    rates.sort((a, b) => a.price - b.price)

    console.log('[API Shipit Rates] ✅ Cotizaciones obtenidas:', rates.length)

    return NextResponse.json({
      success: true,
      data: {
        rates,
        commune_id: finalCommuneId,
        commune_name: commune_name || 'N/A',
        sizes,
        kind,
      },
    })
  } catch (error: any) {
    console.error('[API Shipit Rates] ❌ Error al calcular costos:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al calcular costos de envío',
        status: error.status || 500,
        details: error.details,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * GET /api/shipit/rates
 * Obtiene información sobre las tarifas disponibles (documentación)
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Usa POST para calcular costos de envío',
    usage: {
      method: 'POST',
      endpoint: '/api/shipit/rates',
      body: {
        commune_id: 'number (opcional si hay commune_name)',
        commune_name: 'string (opcional si hay commune_id)',
        sizes: {
          width: 'number (cm)',
          height: 'number (cm)',
          length: 'number (cm)',
          weight: 'number (kg)',
        },
        kind: '0 | 1 | 2 (opcional, default: 0)',
        courier: 'string (opcional)',
        insurance_amount: 'number (opcional)',
      },
    },
  })
}


