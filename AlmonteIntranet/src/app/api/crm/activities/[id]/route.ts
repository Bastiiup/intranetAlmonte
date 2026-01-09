import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

interface ActividadAttributes {
  tipo?: 'llamada' | 'email' | 'reunion' | 'nota' | 'cambio_estado' | 'tarea' | 'recordatorio' | 'otro'
  titulo?: string
  descripcion?: string
  fecha?: string
  estado?: 'completada' | 'pendiente' | 'cancelada' | 'en_progreso'
  notas?: string
  relacionado_con_contacto?: any
  relacionado_con_lead?: any
  relacionado_con_oportunidad?: any
  relacionado_con_colegio?: any
  creado_por?: any
  createdAt?: string
  updatedAt?: string
}

/**
 * GET /api/crm/activities/[id]
 * Obtiene una actividad específica por ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const paramsObj = new URLSearchParams({
      'populate[creado_por]': 'true',
      'populate[relacionado_con_contacto]': 'true',
      'populate[relacionado_con_lead]': 'true',
      'populate[relacionado_con_oportunidad]': 'true',
      'populate[relacionado_con_colegio]': 'true',
    })

    const response = await strapiClient.get<StrapiResponse<StrapiEntity<ActividadAttributes>>>(
      `/api/actividades/${id}?${paramsObj.toString()}`
    )

    return NextResponse.json({
      success: true,
      data: response.data,
    })
  } catch (error: any) {
    console.error('[API /crm/activities/[id] GET] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener actividad',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * PUT /api/crm/activities/[id]
 * Actualiza una actividad
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Buscar la actividad primero para obtener el documentId
    let actividad: any = null
    try {
      const searchResponse = await strapiClient.get<any>(`/api/actividades?filters[id][$eq]=${id}&populate=*`)
      
      if (searchResponse.data && Array.isArray(searchResponse.data) && searchResponse.data.length > 0) {
        actividad = searchResponse.data[0]
      } else if (searchResponse.data && !Array.isArray(searchResponse.data)) {
        actividad = searchResponse.data
      }
      
      if (!actividad) {
        const docIdResponse = await strapiClient.get<any>(`/api/actividades/${id}?populate=*`)
        if (docIdResponse.data) {
          actividad = docIdResponse.data
        }
      }
    } catch (searchError: any) {
      // Continuar con el ID recibido como fallback
    }

    const documentId = actividad?.documentId || actividad?.data?.documentId || actividad?.id?.toString() || id

    // Preparar datos para Strapi
    const actividadData: any = {
      data: {},
    }

    if (body.tipo !== undefined) actividadData.data.tipo = body.tipo
    if (body.titulo !== undefined) actividadData.data.titulo = body.titulo?.trim() || null
    if (body.descripcion !== undefined) actividadData.data.descripcion = body.descripcion?.trim() || null
    if (body.fecha !== undefined) actividadData.data.fecha = body.fecha
    if (body.estado !== undefined) actividadData.data.estado = body.estado
    if (body.notas !== undefined) actividadData.data.notas = body.notas?.trim() || null

    // Relaciones
    if (body.relacionado_con_contacto !== undefined) {
      actividadData.data.relacionado_con_contacto = body.relacionado_con_contacto || null
    }
    if (body.relacionado_con_lead !== undefined) {
      actividadData.data.relacionado_con_lead = body.relacionado_con_lead || null
    }
    if (body.relacionado_con_oportunidad !== undefined) {
      actividadData.data.relacionado_con_oportunidad = body.relacionado_con_oportunidad || null
    }
    if (body.relacionado_con_colegio !== undefined) {
      actividadData.data.relacionado_con_colegio = body.relacionado_con_colegio || null
    }
    if (body.creado_por !== undefined) {
      actividadData.data.creado_por = body.creado_por || null
    }

    const response = await strapiClient.put<StrapiResponse<StrapiEntity<ActividadAttributes>>>(
      `/api/actividades/${documentId}`,
      actividadData
    )

    // Revalidar cache
    revalidatePath('/crm/activities')
    revalidateTag('activities', 'max')

    return NextResponse.json({
      success: true,
      data: response.data,
      message: 'Actividad actualizada exitosamente',
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/activities/[id] PUT] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al actualizar actividad',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * DELETE /api/crm/activities/[id]
 * Elimina una actividad
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Buscar la actividad primero para obtener el documentId
    let actividad: any = null
    try {
      const searchResponse = await strapiClient.get<any>(`/api/actividades?filters[id][$eq]=${id}&populate=*`)
      
      if (searchResponse.data && Array.isArray(searchResponse.data) && searchResponse.data.length > 0) {
        actividad = searchResponse.data[0]
      } else if (searchResponse.data && !Array.isArray(searchResponse.data)) {
        actividad = searchResponse.data
      }
      
      if (!actividad) {
        const docIdResponse = await strapiClient.get<any>(`/api/actividades/${id}?populate=*`)
        if (docIdResponse.data) {
          actividad = docIdResponse.data
        }
      }
    } catch (searchError: any) {
      // Continuar con el ID recibido como fallback
    }

    const documentId = actividad?.documentId || actividad?.data?.documentId || actividad?.id?.toString() || id

    await strapiClient.delete(`/api/actividades/${documentId}`)

    // Revalidar cache
    revalidatePath('/crm/activities')
    revalidateTag('activities', 'max')

    return NextResponse.json({
      success: true,
      message: 'Actividad eliminada exitosamente',
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/activities/[id] DELETE] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al eliminar actividad',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}
