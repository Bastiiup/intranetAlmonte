/**
 * API Route para verificar cobertura de Shipit
 * GET: Verifica si Shipit puede entregar en una dirección específica
 */

import { NextRequest, NextResponse } from 'next/server'
import shipitClient from '@/lib/shipit/client'
import type { ShipitCoverage } from '@/lib/shipit/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/shipit/coverage
 * Verifica la cobertura de Shipit para una comuna específica
 * 
 * Query params:
 * - commune_id: ID numérico de la comuna (requerido)
 * - commune_name: Nombre de la comuna (alternativo)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const communeId = searchParams.get('commune_id')
    const communeName = searchParams.get('commune_name')

    if (!communeId && !communeName) {
      return NextResponse.json(
        {
          success: false,
          error: 'commune_id o commune_name es requerido',
        },
        { status: 400 }
      )
    }

    const params: Record<string, string> = {}
    if (communeId) {
      params.commune_id = communeId
    }
    if (communeName) {
      params.commune_name = communeName
    }

    console.log('[API] Verificando cobertura de Shipit:', params)

    const coverage = await shipitClient.get<ShipitCoverage>(
      'coverage',
      params
    )

    return NextResponse.json({
      success: true,
      data: coverage,
    })
  } catch (error: any) {
    console.error('Error al verificar cobertura de Shipit:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al verificar cobertura',
        status: error.status || 500,
        details: error.details,
      },
      { status: error.status || 500 }
    )
  }
}
