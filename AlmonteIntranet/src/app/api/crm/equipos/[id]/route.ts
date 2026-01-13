/**
 * API Route para gestionar un equipo individual
 * GET /api/crm/equipos/[id] - Obtener equipo
 * PUT /api/crm/equipos/[id] - Actualizar equipo
 * DELETE /api/crm/equipos/[id] - Eliminar equipo
 */

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

interface EquipoAttributes {
  nombre?: string
  descripcion?: string
  activo?: boolean
  createdAt?: string
  updatedAt?: string
  miembros?: any
  colegio?: any
  lider?: any
}

/**
 * GET /api/crm/equipos/[id]
 * Obtiene un equipo individual
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: equipoId } = await params

    const paramsObj = new URLSearchParams({
      'populate[miembros][populate][emails]': 'true',
      'populate[miembros][populate][telefonos]': 'true',
      'populate[miembros][populate][imagen]': 'true',
      'populate[colegio]': 'true',
      'populate[lider][populate][emails]': 'true',
      'populate[lider][populate][imagen]': 'true',
    })

    let equipoResponse: StrapiResponse<StrapiEntity<EquipoAttributes>>
    try {
      equipoResponse = await strapiClient.get<StrapiResponse<StrapiEntity<EquipoAttributes>>>(
        `/api/equipos/${equipoId}?${paramsObj.toString()}`
      )
    } catch (error: any) {
      // Si falla con documentId, intentar buscar por id numérico
      if (error.status === 404) {
        const searchParams = new URLSearchParams({
          'filters[id][$eq]': equipoId,
          ...Object.fromEntries(paramsObj.entries()),
        })
        const searchResponse = await strapiClient.get<StrapiResponse<StrapiEntity<EquipoAttributes>>>(
          `/api/equipos?${searchParams.toString()}`
        )
        if (Array.isArray(searchResponse.data) && searchResponse.data.length > 0) {
          equipoResponse = { ...searchResponse, data: searchResponse.data[0] }
        } else {
          throw new Error('Equipo no encontrado')
        }
      } else {
        throw error
      }
    }

    const equipoData = Array.isArray(equipoResponse.data) 
      ? equipoResponse.data[0] 
      : equipoResponse.data

    if (!equipoData) {
      return NextResponse.json(
        { success: false, error: 'Equipo no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: equipoData,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/equipos/[id] GET] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: 'Error obteniendo equipo',
        details: error instanceof Error ? error.message : 'Unknown error',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * PUT /api/crm/equipos/[id]
 * Actualiza un equipo
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: equipoId } = await params
    const body = await request.json()

    // Obtener el equipo actual para obtener el documentId si es necesario
    let documentId = equipoId
    try {
      const currentResponse = await strapiClient.get<StrapiResponse<StrapiEntity<EquipoAttributes>>>(
        `/api/equipos/${equipoId}?fields[0]=id`
      )
      const currentData = Array.isArray(currentResponse.data) 
        ? currentResponse.data[0] 
        : currentResponse.data
      if (currentData?.documentId) {
        documentId = currentData.documentId
      }
    } catch (error) {
      // Continuar con el ID original si falla
    }

    // Preparar datos para actualizar
    const equipoData: any = {
      data: {},
    }

    if (body.nombre !== undefined) {
      equipoData.data.nombre = body.nombre.trim()
    }
    if (body.descripcion !== undefined) {
      equipoData.data.descripcion = body.descripcion?.trim() || null
    }
    if (body.activo !== undefined) {
      equipoData.data.activo = body.activo
    }

    // Actualizar miembros
    if (body.miembros !== undefined) {
      if (Array.isArray(body.miembros)) {
        const miembrosIds = body.miembros
          .map((id: string | number) => {
            const numId = typeof id === 'string' ? parseInt(id) : id
            return !isNaN(numId) && numId > 0 ? numId : null
          })
          .filter((id: number | null): id is number => id !== null)

        equipoData.data.miembros = { set: miembrosIds }
      }
    }

    // Actualizar colegio
    if (body.colegio !== undefined) {
      if (body.colegio === null || body.colegio === '') {
        equipoData.data.colegio = null
      } else {
        const colegioId = typeof body.colegio === 'string' ? parseInt(body.colegio) : body.colegio
        if (!isNaN(colegioId) && colegioId > 0) {
          equipoData.data.colegio = colegioId
        }
      }
    }

    // Actualizar líder
    if (body.lider !== undefined) {
      if (body.lider === null || body.lider === '') {
        equipoData.data.lider = null
      } else {
        const liderId = typeof body.lider === 'string' ? parseInt(body.lider) : body.lider
        if (!isNaN(liderId) && liderId > 0) {
          equipoData.data.lider = liderId
        }
      }
    }

    const response = await strapiClient.put<StrapiResponse<StrapiEntity<EquipoAttributes>>>(
      `/api/equipos/${documentId}`,
      equipoData
    )

    // Revalidar cache
    revalidatePath('/crm/contacts')
    revalidatePath('/crm/contacts/[id]', 'page')
    revalidateTag('equipos')

    return NextResponse.json({
      success: true,
      data: response.data,
      message: 'Equipo actualizado exitosamente',
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/equipos/[id] PUT] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: 'Error al actualizar equipo',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * DELETE /api/crm/equipos/[id]
 * Elimina un equipo
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: equipoId } = await params

    // Obtener el documentId si es necesario
    let documentId = equipoId
    try {
      const currentResponse = await strapiClient.get<StrapiResponse<StrapiEntity<EquipoAttributes>>>(
        `/api/equipos/${equipoId}?fields[0]=id`
      )
      const currentData = Array.isArray(currentResponse.data) 
        ? currentResponse.data[0] 
        : currentResponse.data
      if (currentData?.documentId) {
        documentId = currentData.documentId
      }
    } catch (error) {
      // Continuar con el ID original si falla
    }

    await strapiClient.delete(`/api/equipos/${documentId}`)

    // Revalidar cache
    revalidatePath('/crm/contacts')
    revalidatePath('/crm/contacts/[id]', 'page')
    revalidateTag('equipos')

    return NextResponse.json({
      success: true,
      message: 'Equipo eliminado exitosamente',
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/equipos/[id] DELETE] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: 'Error al eliminar equipo',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}
