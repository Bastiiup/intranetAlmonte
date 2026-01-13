/**
 * API Route para gestionar miembros de un equipo
 * POST /api/crm/equipos/[id]/miembros - Agregar miembros
 * DELETE /api/crm/equipos/[id]/miembros - Remover miembros
 */

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

interface EquipoAttributes {
  nombre?: string
  miembros?: any
}

/**
 * POST /api/crm/equipos/[id]/miembros
 * Agrega miembros a un equipo
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: equipoId } = await params
    const body = await request.json()

    if (!body.miembros || !Array.isArray(body.miembros) || body.miembros.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Debe proporcionar al menos un miembro',
        },
        { status: 400 }
      )
    }

    // Obtener el equipo actual
    let documentId = equipoId
    let miembrosActuales: number[] = []

    try {
      const currentResponse = await strapiClient.get<StrapiResponse<StrapiEntity<EquipoAttributes>>>(
        `/api/equipos/${equipoId}?fields[0]=id&populate[miembros][fields][0]=id`
      )
      const currentData = Array.isArray(currentResponse.data) 
        ? currentResponse.data[0] 
        : currentResponse.data
      
      if (currentData?.documentId) {
        documentId = currentData.documentId
      }

      // Obtener IDs actuales de miembros
      const miembrosData = currentData?.attributes?.miembros?.data || currentData?.attributes?.miembros || []
      const miembrosArray = Array.isArray(miembrosData) ? miembrosData : [miembrosData]
      miembrosActuales = miembrosArray
        .map((m: any) => {
          const id = m.id || m.attributes?.id || m
          return typeof id === 'number' ? id : parseInt(String(id))
        })
        .filter((id: number) => !isNaN(id) && id > 0)
    } catch (error) {
      // Continuar con el ID original si falla
    }

    // Convertir nuevos miembros a IDs numéricos
    const nuevosMiembrosIds = body.miembros
      .map((id: string | number) => {
        const numId = typeof id === 'string' ? parseInt(id) : id
        return !isNaN(numId) && numId > 0 ? numId : null
      })
      .filter((id: number | null): id is number => id !== null)

    // Combinar miembros actuales con nuevos (sin duplicados)
    const todosLosMiembros = Array.from(new Set([...miembrosActuales, ...nuevosMiembrosIds]))

    // Actualizar equipo con todos los miembros
    const equipoData = {
      data: {
        miembros: { set: todosLosMiembros },
      },
    }

    const response = await strapiClient.put<StrapiResponse<StrapiEntity<EquipoAttributes>>>(
      `/api/equipos/${documentId}`,
      equipoData
    )

    // Revalidar cache
    revalidatePath('/crm/contacts')
    revalidatePath('/crm/contacts/[id]', 'page')
    revalidateTag('equipos', 'max')

    return NextResponse.json({
      success: true,
      data: response.data,
      message: 'Miembros agregados exitosamente',
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/equipos/[id]/miembros POST] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: 'Error al agregar miembros',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * DELETE /api/crm/equipos/[id]/miembros
 * Remueve miembros de un equipo
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: equipoId } = await params
    const { searchParams } = new URL(request.url)
    const miembrosParam = searchParams.get('miembros')

    if (!miembrosParam) {
      return NextResponse.json(
        {
          success: false,
          error: 'Debe proporcionar los IDs de los miembros a remover',
        },
        { status: 400 }
      )
    }

    // Parsear IDs de miembros a remover
    const miembrosARemover = miembrosParam
      .split(',')
      .map((id: string) => {
        const numId = parseInt(id.trim())
        return !isNaN(numId) && numId > 0 ? numId : null
      })
      .filter((id: number | null): id is number => id !== null)

    if (miembrosARemover.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se proporcionaron IDs válidos de miembros',
        },
        { status: 400 }
      )
    }

    // Obtener el equipo actual
    let documentId = equipoId
    let miembrosActuales: number[] = []

    try {
      const currentResponse = await strapiClient.get<StrapiResponse<StrapiEntity<EquipoAttributes>>>(
        `/api/equipos/${equipoId}?fields[0]=id&populate[miembros][fields][0]=id`
      )
      const currentData = Array.isArray(currentResponse.data) 
        ? currentResponse.data[0] 
        : currentResponse.data
      
      if (currentData?.documentId) {
        documentId = currentData.documentId
      }

      // Obtener IDs actuales de miembros
      const miembrosData = currentData?.attributes?.miembros?.data || currentData?.attributes?.miembros || []
      const miembrosArray = Array.isArray(miembrosData) ? miembrosData : [miembrosData]
      miembrosActuales = miembrosArray
        .map((m: any) => {
          const id = m.id || m.attributes?.id || m
          return typeof id === 'number' ? id : parseInt(String(id))
        })
        .filter((id: number) => !isNaN(id) && id > 0)
    } catch (error) {
      // Continuar con el ID original si falla
    }

    // Remover miembros especificados
    const miembrosRestantes = miembrosActuales.filter(id => !miembrosARemover.includes(id))

    // Actualizar equipo con miembros restantes
    const equipoData = {
      data: {
        miembros: { set: miembrosRestantes },
      },
    }

    const response = await strapiClient.put<StrapiResponse<StrapiEntity<EquipoAttributes>>>(
      `/api/equipos/${documentId}`,
      equipoData
    )

    // Revalidar cache
    revalidatePath('/crm/contacts')
    revalidatePath('/crm/contacts/[id]', 'page')
    revalidateTag('equipos', 'max')

    return NextResponse.json({
      success: true,
      data: response.data,
      message: 'Miembros removidos exitosamente',
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/equipos/[id]/miembros DELETE] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: 'Error al remover miembros',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}
