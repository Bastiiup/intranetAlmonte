import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

interface LeadAttributes {
  nombre?: string
  email?: string
  telefono?: string
  empresa?: string
  monto_estimado?: number
  etiqueta?: 'baja' | 'media' | 'alta'
  estado?: 'in-progress' | 'proposal-sent' | 'follow-up' | 'pending' | 'negotiation' | 'rejected'
  fuente?: string
  fecha_creacion?: string
  activo?: boolean
  notas?: string
  fecha_proximo_seguimiento?: string
  createdAt?: string
  updatedAt?: string
  asignado_a?: any
  relacionado_con_persona?: any
  relacionado_con_colegio?: any
}

/**
 * GET /api/crm/leads/[id]
 * Obtiene un lead específico por ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const paramsObj = new URLSearchParams({
      'populate[asignado_a]': 'true',
      'populate[relacionado_con_persona]': 'true',
      'populate[relacionado_con_colegio]': 'true',
    })

    const response = await strapiClient.get<StrapiResponse<StrapiEntity<LeadAttributes>>>(
      `/api/leads/${id}?${paramsObj.toString()}`
    )

    return NextResponse.json({
      success: true,
      data: response.data,
    })
  } catch (error: any) {
    console.error('[API /crm/leads/[id] GET] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener lead',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * PUT /api/crm/leads/[id]
 * Actualiza un lead
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('========================================')
  console.log('[API /crm/leads/[id] PUT] 🎯 INICIADO')
  
  try {
    const { id } = await params
    const body = await request.json()

    console.log('[API /crm/leads/[id] PUT] 📥 Parámetros recibidos')
    console.log('[API /crm/leads/[id] PUT] ID recibido:', id, 'tipo:', typeof id)
    console.log('[API /crm/leads/[id] PUT] Body recibido:', JSON.stringify(body, null, 2))

    // Buscar el lead primero para obtener el documentId correcto
    let lead: any = null
    try {
      console.log('[API /crm/leads/[id] PUT] 🔍 Buscando lead con ID:', id)
      const searchResponse = await strapiClient.get<any>(`/api/leads?filters[id][$eq]=${id}&populate=*`)
      
      if (searchResponse.data && Array.isArray(searchResponse.data) && searchResponse.data.length > 0) {
        lead = searchResponse.data[0]
      } else if (searchResponse.data && !Array.isArray(searchResponse.data)) {
        lead = searchResponse.data
      } else if (Array.isArray(searchResponse) && searchResponse.length > 0) {
        lead = searchResponse[0]
      }
      
      // Si no se encuentra con id, intentar con documentId
      if (!lead) {
        console.log('[API /crm/leads/[id] PUT] 🔍 No encontrado con id, buscando con documentId:', id)
        const docIdResponse = await strapiClient.get<any>(`/api/leads/${id}?populate=*`)
        if (docIdResponse.data) {
          lead = docIdResponse.data
        } else if (docIdResponse) {
          lead = docIdResponse
        }
      }
    } catch (searchError: any) {
      console.warn('[API /crm/leads/[id] PUT] ⚠️ Error al buscar lead:', searchError.message)
      // Continuar con el ID recibido como fallback
    }

    // Determinar el documentId a usar
    let documentId = id
    if (lead) {
      documentId = lead.documentId || lead.data?.documentId || lead.id?.toString() || id
      console.log('[API /crm/leads/[id] PUT] ✅ Lead encontrado')
      console.log('[API /crm/leads/[id] PUT] 📋 documentId:', documentId)
      console.log('[API /crm/leads/[id] PUT] 📋 id original:', lead.id)
    } else {
      console.log('[API /crm/leads/[id] PUT] ⚠️ Lead no encontrado, usando ID recibido:', id)
      documentId = id
    }

    // Validaciones básicas
    if (body.nombre !== undefined && (!body.nombre || !body.nombre.trim())) {
      console.log('[API /crm/leads/[id] PUT] ❌ Validación fallida: nombre vacío')
      return NextResponse.json(
        {
          success: false,
          error: 'El nombre del lead no puede estar vacío',
        },
        { status: 400 }
      )
    }

    // Preparar datos para Strapi
    const leadData: any = {
      data: {},
    }

    console.log('[API /crm/leads/[id] PUT] 🔨 Preparando datos para Strapi...')

    // Solo incluir campos que se están actualizando
    if (body.nombre !== undefined) {
      leadData.data.nombre = body.nombre.trim()
      console.log('[API /crm/leads/[id] PUT] ✅ nombre:', leadData.data.nombre)
    }
    if (body.email !== undefined) {
      leadData.data.email = body.email?.trim() || null
      console.log('[API /crm/leads/[id] PUT] ✅ email:', leadData.data.email)
    }
    if (body.telefono !== undefined) {
      leadData.data.telefono = body.telefono?.trim() || null
      console.log('[API /crm/leads/[id] PUT] ✅ telefono:', leadData.data.telefono)
    }
    if (body.empresa !== undefined) {
      leadData.data.empresa = body.empresa?.trim() || null
      console.log('[API /crm/leads/[id] PUT] ✅ empresa:', leadData.data.empresa)
    }
    if (body.monto_estimado !== undefined) {
      leadData.data.monto_estimado = body.monto_estimado !== null ? Number(body.monto_estimado) : null
      console.log('[API /crm/leads/[id] PUT] ✅ monto_estimado:', leadData.data.monto_estimado)
    }
    if (body.etiqueta !== undefined) {
      leadData.data.etiqueta = body.etiqueta || null
      console.log('[API /crm/leads/[id] PUT] ✅ etiqueta:', leadData.data.etiqueta)
    }
    if (body.estado !== undefined) {
      leadData.data.estado = body.estado || null
      console.log('[API /crm/leads/[id] PUT] ✅ estado:', leadData.data.estado)
    }
    if (body.fuente !== undefined) {
      leadData.data.fuente = body.fuente?.trim() || null
      console.log('[API /crm/leads/[id] PUT] ✅ fuente:', leadData.data.fuente)
    }
    if (body.notas !== undefined) {
      leadData.data.notas = body.notas?.trim() || null
      console.log('[API /crm/leads/[id] PUT] ✅ notas:', leadData.data.notas)
    }
    if (body.fecha_proximo_seguimiento !== undefined) {
      leadData.data.fecha_proximo_seguimiento = body.fecha_proximo_seguimiento || null
      console.log('[API /crm/leads/[id] PUT] ✅ fecha_proximo_seguimiento:', leadData.data.fecha_proximo_seguimiento)
    }
    if (body.activo !== undefined) {
      leadData.data.activo = body.activo
      console.log('[API /crm/leads/[id] PUT] ✅ activo:', leadData.data.activo)
    }

    // Relación con colaborador (asignado_a)
    if (body.asignado_a !== undefined) {
      if (body.asignado_a === null) {
        leadData.data.asignado_a = { disconnect: [id] }
      } else {
        const colaboradorId = typeof body.asignado_a === 'object' ? body.asignado_a.id || body.asignado_a.documentId : body.asignado_a
        if (colaboradorId) {
          leadData.data.asignado_a = typeof colaboradorId === 'number' ? colaboradorId : parseInt(String(colaboradorId))
        }
      }
    }

    // Relación con persona (relacionado_con_persona)
    if (body.relacionado_con_persona !== undefined) {
      if (body.relacionado_con_persona === null) {
        leadData.data.relacionado_con_persona = { disconnect: [id] }
      } else {
        const personaId = typeof body.relacionado_con_persona === 'object' ? body.relacionado_con_persona.id || body.relacionado_con_persona.documentId : body.relacionado_con_persona
        if (personaId) {
          leadData.data.relacionado_con_persona = typeof personaId === 'number' ? personaId : parseInt(String(personaId))
        }
      }
    }

    // Relación con colegio (relacionado_con_colegio)
    if (body.relacionado_con_colegio !== undefined) {
      if (body.relacionado_con_colegio === null) {
        leadData.data.relacionado_con_colegio = { disconnect: [id] }
      } else {
        const colegioId = typeof body.relacionado_con_colegio === 'object' ? body.relacionado_con_colegio.id || body.relacionado_con_colegio.documentId : body.relacionado_con_colegio
        if (colegioId) {
          leadData.data.relacionado_con_colegio = typeof colegioId === 'number' ? colegioId : parseInt(String(colegioId))
        }
      }
    }

    console.log('[API /crm/leads/[id] PUT] 📤 ========================================')
    console.log('[API /crm/leads/[id] PUT] 📤 DATOS FINALES PARA STRAPI:')
    console.log('[API /crm/leads/[id] PUT] 📤 JSON completo:', JSON.stringify(leadData, null, 2))
    console.log('[API /crm/leads/[id] PUT] 📤 Campos en data:', Object.keys(leadData.data))
    console.log('[API /crm/leads/[id] PUT] 🌐 URL de Strapi:', `/api/leads/${documentId}`)
    console.log('[API /crm/leads/[id] PUT] 📋 Usando documentId:', documentId, '(ID recibido:', id, ')')
    console.log('[API /crm/leads/[id] PUT] 📤 ========================================')
    
    let response: any
    try {
      response = await strapiClient.put<StrapiResponse<StrapiEntity<LeadAttributes>>>(
        `/api/leads/${documentId}`,
        leadData
      )
      
      console.log('[API /crm/leads/[id] PUT] 📡 ========================================')
      console.log('[API /crm/leads/[id] PUT] 📡 RESPUESTA DE STRAPI RECIBIDA')
      console.log('[API /crm/leads/[id] PUT] 📡 Response completo:', JSON.stringify(response, null, 2))
      if (response.data) {
        console.log('[API /crm/leads/[id] PUT] 📡 Response.data:', JSON.stringify(response.data, null, 2))
      }
      console.log('[API /crm/leads/[id] PUT] 📡 ========================================')
    } catch (strapiError: any) {
      console.error('[API /crm/leads/[id] PUT] ❌ ========================================')
      console.error('[API /crm/leads/[id] PUT] ❌ ERROR AL LLAMAR A STRAPI')
      console.error('[API /crm/leads/[id] PUT] ❌ Error completo:', strapiError)
      console.error('[API /crm/leads/[id] PUT] ❌ Error message:', strapiError.message)
      console.error('[API /crm/leads/[id] PUT] ❌ Error status:', strapiError.status)
      console.error('[API /crm/leads/[id] PUT] ❌ Error response:', strapiError.response)
      if (strapiError.response?.data) {
        console.error('[API /crm/leads/[id] PUT] ❌ Error response.data:', JSON.stringify(strapiError.response.data, null, 2))
      }
      console.error('[API /crm/leads/[id] PUT] ❌ ========================================')
      throw strapiError
    }

    console.log('[API /crm/leads/[id] PUT] 🔄 Revalidando cache...')
    
    // Revalidar para sincronización bidireccional
    revalidatePath('/crm/leads')
    revalidateTag('leads')
    
    console.log('[API /crm/leads/[id] PUT] ✅ Cache revalidado')

    console.log('[API /crm/leads/[id] PUT] ✅ Actualización exitosa')
    console.log('[API /crm/leads/[id] PUT] ✅ PUT COMPLETADO')
    console.log('========================================')

    return NextResponse.json({
      success: true,
      data: response.data,
      message: 'Lead actualizado exitosamente',
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/leads/[id] PUT] ❌ ERROR')
    console.error('[API /crm/leads/[id] PUT] Error completo:', error)
    console.error('[API /crm/leads/[id] PUT] Error message:', error.message)
    console.error('[API /crm/leads/[id] PUT] Error status:', error.status)
    console.error('[API /crm/leads/[id] PUT] Error details:', error.details)
    console.error('[API /crm/leads/[id] PUT] Error stack:', error.stack)
    console.log('========================================')
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al actualizar lead',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * DELETE /api/crm/leads/[id]
 * Elimina un lead (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Buscar el lead primero para obtener el documentId correcto
    let lead: any = null
    try {
      const searchResponse = await strapiClient.get<any>(`/api/leads?filters[id][$eq]=${id}&populate=*`)
      
      if (searchResponse.data && Array.isArray(searchResponse.data) && searchResponse.data.length > 0) {
        lead = searchResponse.data[0]
      } else if (searchResponse.data && !Array.isArray(searchResponse.data)) {
        lead = searchResponse.data
      } else if (Array.isArray(searchResponse) && searchResponse.length > 0) {
        lead = searchResponse[0]
      }
      
      if (!lead) {
        const docIdResponse = await strapiClient.get<any>(`/api/leads/${id}?populate=*`)
        if (docIdResponse.data) {
          lead = docIdResponse.data
        } else if (docIdResponse) {
          lead = docIdResponse
        }
      }
    } catch (searchError: any) {
      // Continuar con el ID recibido como fallback
    }

    const documentId = lead?.documentId || lead?.data?.documentId || lead?.id?.toString() || id

    // Soft delete: marcar como activo = false
    const leadData = {
      data: {
        activo: false,
      },
    }

    await strapiClient.put<StrapiResponse<StrapiEntity<LeadAttributes>>>(
      `/api/leads/${documentId}`,
      leadData
    )

    // Revalidar cache
    revalidatePath('/crm/leads')
    revalidateTag('leads')

    return NextResponse.json({
      success: true,
      message: 'Lead eliminado exitosamente',
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/leads/[id] DELETE] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al eliminar lead',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}
