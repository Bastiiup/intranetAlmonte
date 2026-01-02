/**
 * API Route para gestionar un colegio específico
 * GET, PUT, DELETE /api/crm/colegios/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

interface ColegioAttributes {
  colegio_nombre?: string
  rbd?: number
  estado?: string
  dependencia?: string
  region?: string
  zona?: string
  comuna?: any
  telefonos?: any[]
  emails?: any[]
  direcciones?: any[]
}

/**
 * GET /api/crm/colegios/[id]
 * Obtiene un colegio específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('[API /crm/colegios/[id] GET] Buscando colegio con ID:', id)

    let colegio: any = null

    // Intentar primero con el endpoint directo
    try {
      const response = await strapiClient.get<StrapiResponse<StrapiEntity<ColegioAttributes>>>(
        `/api/colegios/${id}?populate[comuna]=true&populate[telefonos]=true&populate[emails]=true`
      )
      
      if (response.data) {
        colegio = response.data
        console.log('[API /crm/colegios/[id] GET] Colegio encontrado directamente')
      }
    } catch (directError: any) {
      console.log('[API /crm/colegios/[id] GET] Endpoint directo falló, intentando búsqueda por filtro...')
      
      // Si falla, intentar buscar por filtro
      try {
        const filterResponse = await strapiClient.get<StrapiResponse<StrapiEntity<ColegioAttributes>>>(
          `/api/colegios?filters[id][$eq]=${id}&populate[comuna]=true&populate[telefonos]=true&populate[emails]=true`
        )
        
        if (filterResponse.data) {
          if (Array.isArray(filterResponse.data) && filterResponse.data.length > 0) {
            colegio = filterResponse.data[0]
            console.log('[API /crm/colegios/[id] GET] Colegio encontrado por filtro (array)')
          } else if (!Array.isArray(filterResponse.data)) {
            colegio = filterResponse.data
            console.log('[API /crm/colegios/[id] GET] Colegio encontrado por filtro (objeto)')
          }
        }
      } catch (filterError: any) {
        console.error('[API /crm/colegios/[id] GET] Error en búsqueda por filtro:', filterError.message)
      }
    }

    if (!colegio) {
      return NextResponse.json(
        {
          success: false,
          error: 'Colegio no encontrado',
          details: { id },
          status: 404,
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: colegio,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/colegios/[id] GET] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener colegio',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * PUT /api/crm/colegios/[id]
 * Actualiza un colegio
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Validaciones básicas
    if (!body.colegio_nombre || !body.colegio_nombre.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'El nombre del colegio es obligatorio',
        },
        { status: 400 }
      )
    }

    // Preparar datos para Strapi
    const colegioData: any = {
      data: {
        colegio_nombre: body.colegio_nombre.trim(),
        ...(body.rbd && { rbd: parseInt(body.rbd) }),
        ...(body.rut && { rut: body.rut.trim() }),
        ...(body.estado && { estado: body.estado }),
        ...(body.dependencia && { dependencia: body.dependencia }),
        ...(body.tipo_institucion && { tipo_institucion: body.tipo_institucion }),
        ...(body.region && { region: body.region }),
        ...(body.zona && { zona: body.zona }),
        ...(body.website && { website: body.website.trim() }),
        ...(body.origen && { origen: body.origen }),
        ...(body.representante_comercial && { representante_comercial: body.representante_comercial.trim() }),
        ...(body.estatus_pipeline && { estatus_pipeline: body.estatus_pipeline }),
        // Relación comuna (usar connect para Strapi v4)
        ...(body.comunaId && { comuna: { connect: [parseInt(body.comunaId.toString())] } }),
        // Componentes repeatable
        ...(body.telefonos && Array.isArray(body.telefonos) && {
          telefonos: body.telefonos.map((t: any) => ({
            telefono_raw: t.telefono_raw || '',
            ...(t.tipo && { tipo: t.tipo }),
            ...(t.principal !== undefined && { principal: t.principal }),
          })),
        }),
        ...(body.emails && Array.isArray(body.emails) && {
          emails: body.emails.map((e: any) => ({
            email: e.email || '',
            ...(e.tipo && { tipo: e.tipo }),
            ...(e.principal !== undefined && { principal: e.principal }),
          })),
        }),
        ...(body.direcciones && Array.isArray(body.direcciones) && {
          direcciones: body.direcciones.map((d: any) => ({
            ...(d.calle && { calle: d.calle }),
            ...(d.numero && { numero: d.numero }),
            ...(d.comuna && { comuna: d.comuna }),
            ...(d.region && { region: d.region }),
          })),
        }),
      },
    }

    const response = await strapiClient.put<StrapiResponse<StrapiEntity<ColegioAttributes>>>(
      `/api/colegios/${id}`,
      colegioData
    )

    // Revalidar para sincronización bidireccional
    revalidatePath('/crm/colegios')
    revalidatePath(`/crm/colegios/${id}`)
    revalidatePath('/crm/colegios/[id]', 'page')
    revalidateTag('colegios', 'max')

    return NextResponse.json({
      success: true,
      data: response.data,
      message: 'Colegio actualizado exitosamente',
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/colegios/[id] PUT] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al actualizar colegio',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * DELETE /api/crm/colegios/[id]
 * Elimina un colegio permanentemente
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('[API /crm/colegios/[id] DELETE] Eliminando colegio:', id)

    try {
      await strapiClient.delete(`/api/colegios/${id}`)

      // Revalidar para sincronización bidireccional
      revalidatePath('/crm/colegios')
      revalidatePath(`/crm/colegios/${id}`)
      revalidatePath('/crm/colegios/[id]', 'page')
      revalidateTag('colegios', 'max')

      return NextResponse.json({
        success: true,
        message: 'Colegio eliminado permanentemente',
      }, { status: 200 })
    } catch (deleteError: any) {
      // Si el error es por respuesta vacía pero el status fue 200/204, considerar éxito
      if (deleteError.status === 200 || deleteError.status === 204) {
        return NextResponse.json({
          success: true,
          message: 'Colegio eliminado permanentemente',
        }, { status: 200 })
      }
      throw deleteError
    }
  } catch (error: any) {
    console.error('[API /crm/colegios/[id] DELETE] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al eliminar colegio',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

