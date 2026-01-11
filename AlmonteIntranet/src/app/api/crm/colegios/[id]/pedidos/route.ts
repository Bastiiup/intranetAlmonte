/**
 * API Route para obtener pedidos relacionados con un colegio
 * GET /api/crm/colegios/[id]/pedidos
 * 
 * Los pedidos se relacionan indirectamente:
 * Pedido -> Cliente (WO-Cliente) -> Persona -> Trayectoria -> Colegio
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/crm/colegios/[id]/pedidos
 * Obtiene los pedidos relacionados con un colegio a través de sus contactos
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') || '1'
    const pageSize = searchParams.get('pageSize') || '20'

    console.log('[API /crm/colegios/[id]/pedidos GET] Buscando pedidos para colegio:', id)

    // Convertir el ID del colegio
    const colegioId = typeof id === 'string' ? parseInt(id) : id

    if (isNaN(colegioId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID de colegio inválido',
        },
        { status: 400 }
      )
    }

    // Paso 1: Obtener todas las personas que tienen trayectorias con este colegio
    const personasParams = new URLSearchParams({
      'populate[trayectorias][populate][colegio]': 'true',
      'pagination[page]': '1',
      'pagination[pageSize]': '1000', // Obtener todas las personas
      'filters[trayectorias][colegio][id][$eq]': colegioId.toString(),
    })

    const personasResponse = await strapiClient.get<any>(
      `/api/personas?${personasParams.toString()}`
    )

    const personas = Array.isArray(personasResponse.data) 
      ? personasResponse.data 
      : (personasResponse.data ? [personasResponse.data] : [])

    if (personas.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        meta: { pagination: { total: 0, page: 1, pageSize: parseInt(pageSize) } },
      })
    }

    // Extraer IDs de personas (documentId o id)
    const personaIds = personas
      .map((p: any) => {
        const id = p.documentId || p.id
        return id ? String(id) : null
      })
      .filter(Boolean) as string[]

    console.log('[API /crm/colegios/[id]/pedidos GET] Personas encontradas:', personaIds.length)

    if (personaIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        meta: { pagination: { total: 0, page: 1, pageSize: parseInt(pageSize) } },
      })
    }

    // Paso 2: Obtener WO-Clientes relacionados con estas personas
    // Construir filtro $or para buscar clientes por persona
    const clientesParams = new URLSearchParams({
      'populate[persona]': 'true',
      'pagination[page]': '1',
      'pagination[pageSize]': '1000', // Obtener todos los clientes
    })

    // Agregar filtros $or para cada persona
    personaIds.forEach((personaId, index) => {
      clientesParams.append(`filters[$or][${index}][persona][id][$eq]`, personaId)
    })

    const clientesResponse = await strapiClient.get<any>(
      `/api/wo-clientes?${clientesParams.toString()}`
    )

    const clientes = Array.isArray(clientesResponse.data)
      ? clientesResponse.data
      : (clientesResponse.data ? [clientesResponse.data] : [])

    const clienteIds = clientes
      .map((c: any) => {
        const id = c.documentId || c.id
        return id ? String(id) : null
      })
      .filter(Boolean) as string[]

    console.log('[API /crm/colegios/[id]/pedidos GET] Clientes encontrados:', clienteIds.length)

    if (clienteIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        meta: { pagination: { total: 0, page: 1, pageSize: parseInt(pageSize) } },
      })
    }

    // Paso 3: Obtener pedidos relacionados con estos clientes
    const pedidosParams = new URLSearchParams({
      'populate[cliente]': 'true',
      'populate[items]': 'true',
      'sort[0]': 'fecha_pedido:desc',
      'pagination[page]': page,
      'pagination[pageSize]': pageSize,
    })

    // Agregar filtros $or para cada cliente
    clienteIds.forEach((clienteId, index) => {
      pedidosParams.append(`filters[$or][${index}][cliente][id][$eq]`, clienteId)
    })

    const pedidosResponse = await strapiClient.get<any>(
      `/api/pedidos?${pedidosParams.toString()}`
    )

    const pedidos = Array.isArray(pedidosResponse.data)
      ? pedidosResponse.data
      : (pedidosResponse.data ? [pedidosResponse.data] : [])

    return NextResponse.json({
      success: true,
      data: pedidos,
      meta: pedidosResponse.meta || { pagination: { total: pedidos.length, page: parseInt(page), pageSize: parseInt(pageSize) } },
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/colegios/[id]/pedidos GET] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener pedidos del colegio',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}
