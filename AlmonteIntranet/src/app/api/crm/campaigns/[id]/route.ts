import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

interface CampanaAttributes {
  nombre?: string
  descripcion?: string
  presupuesto?: number
  objetivo?: number
  estado?: 'en_progreso' | 'exitosa' | 'programada' | 'fallida' | 'en_curso'
  tags?: string[]
  fecha_inicio?: string
  fecha_fin?: string
  creado_por?: any
  contactos?: any
  leads?: any
  colegios?: any
  createdAt?: string
  updatedAt?: string
}

/**
 * GET /api/crm/campaigns/[id]
 * Obtiene una campaña específica por ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const paramsObj = new URLSearchParams({
      'populate[creado_por]': 'true',
      'populate[contactos]': 'true',
      'populate[leads]': 'true',
      'populate[colegios]': 'true',
    })

    const response = await strapiClient.get<StrapiResponse<StrapiEntity<CampanaAttributes>>>(
      `/api/campanas/${id}?${paramsObj.toString()}`
    )

    return NextResponse.json({
      success: true,
      data: response.data,
    })
  } catch (error: any) {
    console.error('[API /crm/campaigns/[id] GET] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener campaña',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * PUT /api/crm/campaigns/[id]
 * Actualiza una campaña
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // En Strapi v5, intentar primero usar el endpoint directo con el ID
    // Si el ID es un documentId (string largo), esto debería funcionar
    let documentId = id
    
    try {
      // Primero intentar el endpoint directo (funciona con documentId)
      const directResponse = await strapiClient.get<any>(`/api/campanas/${id}?populate=*`)
      if (directResponse.data) {
        const campana = directResponse.data
        documentId = campana.documentId || campana.id?.toString() || id
      }
    } catch (directError: any) {
      // Si falla y el ID es numérico, intentar buscar por filters
      if (!isNaN(Number(id))) {
        try {
          const searchResponse = await strapiClient.get<any>(`/api/campanas?filters[id][$eq]=${id}&populate=*`)
          
          if (searchResponse.data && Array.isArray(searchResponse.data) && searchResponse.data.length > 0) {
            const campana = searchResponse.data[0]
            documentId = campana.documentId || campana.id?.toString() || id
          } else if (searchResponse.data && !Array.isArray(searchResponse.data)) {
            const campana = searchResponse.data
            documentId = campana.documentId || campana.id?.toString() || id
          }
        } catch (searchError: any) {
          // Si ambos fallan, usar el ID recibido como documentId
          console.warn('[API /crm/campaigns/[id] PUT] No se pudo encontrar campaña, usando ID recibido:', id)
        }
      } else {
        // Si el ID no es numérico, asumir que es un documentId y usarlo directamente
        console.log('[API /crm/campaigns/[id] PUT] Usando ID como documentId:', id)
      }
    }

    // Preparar datos para Strapi
    const campanaData: any = {
      data: {},
    }

    if (body.nombre !== undefined) campanaData.data.nombre = body.nombre?.trim() || null
    if (body.descripcion !== undefined) campanaData.data.descripcion = body.descripcion?.trim() || null
    if (body.presupuesto !== undefined) campanaData.data.presupuesto = body.presupuesto ? Number(body.presupuesto) : 0
    if (body.objetivo !== undefined) campanaData.data.objetivo = body.objetivo ? Number(body.objetivo) : 0
    if (body.estado !== undefined) campanaData.data.estado = body.estado
    if (body.tags !== undefined) campanaData.data.tags = body.tags || []
    if (body.fecha_inicio !== undefined) campanaData.data.fecha_inicio = body.fecha_inicio
    if (body.fecha_fin !== undefined) campanaData.data.fecha_fin = body.fecha_fin || null

    // Relaciones
    if (body.creado_por !== undefined) {
      campanaData.data.creado_por = body.creado_por || null
    }
    if (body.contactos !== undefined) {
      campanaData.data.contactos = body.contactos || []
    }
    if (body.leads !== undefined) {
      campanaData.data.leads = body.leads || []
    }
    if (body.colegios !== undefined) {
      campanaData.data.colegios = body.colegios || []
    }

    const response = await strapiClient.put<StrapiResponse<StrapiEntity<CampanaAttributes>>>(
      `/api/campanas/${documentId}`,
      campanaData
    )

    // Revalidar cache
    revalidatePath('/crm/campaign')
    revalidateTag('campaigns', 'max')

    return NextResponse.json({
      success: true,
      data: response.data,
      message: 'Campaña actualizada exitosamente',
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/campaigns/[id] PUT] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al actualizar campaña',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * DELETE /api/crm/campaigns/[id]
 * Elimina una campaña
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // En Strapi v5, intentar primero usar el endpoint directo con el ID
    // Si el ID es un documentId (string largo), esto debería funcionar
    let documentId = id
    
    try {
      // Primero intentar el endpoint directo (funciona con documentId)
      const directResponse = await strapiClient.get<any>(`/api/campanas/${id}?populate=*`)
      if (directResponse.data) {
        const campana = directResponse.data
        documentId = campana.documentId || campana.id?.toString() || id
      }
    } catch (directError: any) {
      // Si falla y el ID es numérico, intentar buscar por filters
      if (!isNaN(Number(id))) {
        try {
          const searchResponse = await strapiClient.get<any>(`/api/campanas?filters[id][$eq]=${id}&populate=*`)
          
          if (searchResponse.data && Array.isArray(searchResponse.data) && searchResponse.data.length > 0) {
            const campana = searchResponse.data[0]
            documentId = campana.documentId || campana.id?.toString() || id
          } else if (searchResponse.data && !Array.isArray(searchResponse.data)) {
            const campana = searchResponse.data
            documentId = campana.documentId || campana.id?.toString() || id
          }
        } catch (searchError: any) {
          // Si ambos fallan, usar el ID recibido como documentId
          console.warn('[API /crm/campaigns/[id] DELETE] No se pudo encontrar campaña, usando ID recibido:', id)
        }
      } else {
        // Si el ID no es numérico, asumir que es un documentId y usarlo directamente
        console.log('[API /crm/campaigns/[id] DELETE] Usando ID como documentId:', id)
      }
    }

    await strapiClient.delete(`/api/campanas/${documentId}`)

    // Revalidar cache
    revalidatePath('/crm/campaign')
    revalidateTag('campaigns', 'max')

    return NextResponse.json({
      success: true,
      message: 'Campaña eliminada exitosamente',
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/campaigns/[id] DELETE] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al eliminar campaña',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}
