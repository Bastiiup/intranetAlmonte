import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

interface OportunidadAttributes {
  nombre?: string
  descripcion?: string
  monto?: number
  moneda?: string
  etapa?: string
  estado?: 'open' | 'in-progress' | 'closed'
  prioridad?: 'low' | 'medium' | 'high'
  fecha_cierre?: string
  fuente?: string
  activo?: boolean
  producto?: any
  contacto?: any
  propietario?: any
}

/**
 * GET /api/crm/oportunidades/[id]
 * Obtiene una oportunidad específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const paramsObj = new URLSearchParams({
      'populate[producto][populate]': 'portada_libro',
      // imagen es un componente (logo-o-avatar) que tiene un campo 'imagen' de tipo media
      'populate[contacto][populate][imagen][populate]': 'imagen',
      'populate[propietario]': 'true',
    })

    const response = await strapiClient.get<StrapiResponse<StrapiEntity<OportunidadAttributes>>>(
      `/api/oportunidades/${id}?${paramsObj.toString()}`
    )

    return NextResponse.json({
      success: true,
      data: response.data,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/oportunidades/[id] GET] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener oportunidad',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * PUT /api/crm/oportunidades/[id]
 * Actualiza una oportunidad
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('========================================')
  console.log('[API /crm/oportunidades/[id] PUT] 🎯 INICIADO')
  
  try {
    const { id } = await params
    const body = await request.json()

    console.log('[API /crm/oportunidades/[id] PUT] 📥 Parámetros recibidos')
    console.log('[API /crm/oportunidades/[id] PUT] ID recibido:', id, 'tipo:', typeof id)
    console.log('[API /crm/oportunidades/[id] PUT] Body recibido:', JSON.stringify(body, null, 2))

    // Buscar la oportunidad primero para obtener el documentId correcto
    let oportunidad: any = null
    try {
      console.log('[API /crm/oportunidades/[id] PUT] 🔍 Buscando oportunidad con ID:', id)
      const searchResponse = await strapiClient.get<any>(`/api/oportunidades?filters[id][$eq]=${id}&populate=*`)
      
      if (searchResponse.data && Array.isArray(searchResponse.data) && searchResponse.data.length > 0) {
        oportunidad = searchResponse.data[0]
      } else if (searchResponse.data && !Array.isArray(searchResponse.data)) {
        oportunidad = searchResponse.data
      } else if (Array.isArray(searchResponse) && searchResponse.length > 0) {
        oportunidad = searchResponse[0]
      }
      
      // Si no se encuentra con id, intentar con documentId
      if (!oportunidad) {
        console.log('[API /crm/oportunidades/[id] PUT] 🔍 No encontrado con id, buscando con documentId:', id)
        const docIdResponse = await strapiClient.get<any>(`/api/oportunidades/${id}?populate=*`)
        if (docIdResponse.data) {
          oportunidad = docIdResponse.data
        } else if (docIdResponse) {
          oportunidad = docIdResponse
        }
      }
    } catch (searchError: any) {
      console.warn('[API /crm/oportunidades/[id] PUT] ⚠️ Error al buscar oportunidad:', searchError.message)
      // Continuar con el ID recibido como fallback
    }

    // Determinar el documentId a usar
    let documentId = id
    if (oportunidad) {
      documentId = oportunidad.documentId || oportunidad.data?.documentId || oportunidad.id?.toString() || id
      console.log('[API /crm/oportunidades/[id] PUT] ✅ Oportunidad encontrada')
      console.log('[API /crm/oportunidades/[id] PUT] 📋 documentId:', documentId)
      console.log('[API /crm/oportunidades/[id] PUT] 📋 id original:', oportunidad.id)
    } else {
      console.log('[API /crm/oportunidades/[id] PUT] ⚠️ Oportunidad no encontrada, usando ID recibido:', id)
      documentId = id
    }

    // Validaciones básicas
    if (body.nombre !== undefined && (!body.nombre || !body.nombre.trim())) {
      console.log('[API /crm/oportunidades/[id] PUT] ❌ Validación fallida: nombre vacío')
      return NextResponse.json(
        {
          success: false,
          error: 'El nombre de la oportunidad no puede estar vacío',
        },
        { status: 400 }
      )
    }

    // Preparar datos para Strapi
    const oportunidadData: any = {
      data: {},
    }

    console.log('[API /crm/oportunidades/[id] PUT] 🔨 Preparando datos para Strapi...')

    // Solo incluir campos que se están actualizando
    if (body.nombre !== undefined) {
      oportunidadData.data.nombre = body.nombre.trim()
      console.log('[API /crm/oportunidades/[id] PUT] ✅ nombre:', oportunidadData.data.nombre)
    }
    if (body.descripcion !== undefined) {
      oportunidadData.data.descripcion = body.descripcion?.trim() || null
      console.log('[API /crm/oportunidades/[id] PUT] ✅ descripcion:', oportunidadData.data.descripcion)
    }
    if (body.monto !== undefined) {
      oportunidadData.data.monto = body.monto !== null ? Number(body.monto) : null
      console.log('[API /crm/oportunidades/[id] PUT] ✅ monto:', oportunidadData.data.monto)
    }
    if (body.moneda !== undefined) {
      oportunidadData.data.moneda = body.moneda || null
      console.log('[API /crm/oportunidades/[id] PUT] ✅ moneda:', oportunidadData.data.moneda)
    }
    if (body.etapa !== undefined) {
      const etapaValue = body.etapa || null
      oportunidadData.data.etapa = etapaValue
      console.log('[API /crm/oportunidades/[id] PUT] ✅ etapa recibida:', body.etapa)
      console.log('[API /crm/oportunidades/[id] PUT] ✅ etapa a enviar a Strapi:', etapaValue)
      console.log('[API /crm/oportunidades/[id] PUT] ✅ tipo de etapa:', typeof etapaValue)
    } else {
      console.log('[API /crm/oportunidades/[id] PUT] ⚠️ etapa NO está en el body')
    }
    if (body.estado !== undefined) {
      oportunidadData.data.estado = body.estado || null
    }
    if (body.prioridad !== undefined) {
      oportunidadData.data.prioridad = body.prioridad || null
    }
    if (body.fecha_cierre !== undefined) {
      oportunidadData.data.fecha_cierre = body.fecha_cierre || null
    }
    if (body.fuente !== undefined) {
      oportunidadData.data.fuente = body.fuente || null
    }
    if (body.activo !== undefined) {
      oportunidadData.data.activo = body.activo
    }

    // Relación con contacto (Persona)
    if (body.contacto !== undefined) {
      if (body.contacto === null) {
        oportunidadData.data.contacto = { disconnect: [id] }
      } else {
        const contactoId = typeof body.contacto === 'object' ? body.contacto.id || body.contacto.documentId : body.contacto
        if (contactoId) {
          oportunidadData.data.contacto = { connect: [typeof contactoId === 'number' ? contactoId : parseInt(String(contactoId))] }
        }
      }
    }

    // Relación con propietario (Colaborador)
    if (body.propietario !== undefined) {
      if (body.propietario === null) {
        oportunidadData.data.propietario = { disconnect: [id] }
      } else {
        const propietarioId = typeof body.propietario === 'object' ? body.propietario.id || body.propietario.documentId : body.propietario
        if (propietarioId) {
          oportunidadData.data.propietario = { connect: [typeof propietarioId === 'number' ? propietarioId : parseInt(String(propietarioId))] }
        }
      }
    }

    // Relación con producto (si existe)
    if (body.producto !== undefined) {
      if (body.producto === null) {
        oportunidadData.data.producto = { disconnect: [id] }
      } else {
        const productoId = typeof body.producto === 'object' ? body.producto.id || body.producto.documentId : body.producto
        if (productoId) {
          oportunidadData.data.producto = { connect: [typeof productoId === 'number' ? productoId : parseInt(String(productoId))] }
        }
      }
    }

    console.log('[API /crm/oportunidades/[id] PUT] 📤 ========================================')
    console.log('[API /crm/oportunidades/[id] PUT] 📤 DATOS FINALES PARA STRAPI:')
    console.log('[API /crm/oportunidades/[id] PUT] 📤 JSON completo:', JSON.stringify(oportunidadData, null, 2))
    console.log('[API /crm/oportunidades/[id] PUT] 📤 Campos en data:', Object.keys(oportunidadData.data))
    if (oportunidadData.data.etapa !== undefined) {
      console.log('[API /crm/oportunidades/[id] PUT] 📤 Valor de etapa:', oportunidadData.data.etapa)
      console.log('[API /crm/oportunidades/[id] PUT] 📤 Tipo de etapa:', typeof oportunidadData.data.etapa)
    }
    console.log('[API /crm/oportunidades/[id] PUT] 🌐 URL de Strapi:', `/api/oportunidades/${documentId}`)
    console.log('[API /crm/oportunidades/[id] PUT] 📋 Usando documentId:', documentId, '(ID recibido:', id, ')')
    console.log('[API /crm/oportunidades/[id] PUT] 📤 ========================================')
    
    let response: any
    try {
      response = await strapiClient.put<StrapiResponse<StrapiEntity<OportunidadAttributes>>>(
        `/api/oportunidades/${documentId}`,
        oportunidadData
      )
      
      console.log('[API /crm/oportunidades/[id] PUT] 📡 ========================================')
      console.log('[API /crm/oportunidades/[id] PUT] 📡 RESPUESTA DE STRAPI RECIBIDA')
      console.log('[API /crm/oportunidades/[id] PUT] 📡 Response completo:', JSON.stringify(response, null, 2))
      if (response.data) {
        console.log('[API /crm/oportunidades/[id] PUT] 📡 Response.data:', JSON.stringify(response.data, null, 2))
        if (response.data.attributes) {
          console.log('[API /crm/oportunidades/[id] PUT] 📡 Response.data.attributes.etapa:', response.data.attributes.etapa)
        }
      }
      console.log('[API /crm/oportunidades/[id] PUT] 📡 ========================================')
    } catch (strapiError: any) {
      console.error('[API /crm/oportunidades/[id] PUT] ❌ ========================================')
      console.error('[API /crm/oportunidades/[id] PUT] ❌ ERROR AL LLAMAR A STRAPI')
      console.error('[API /crm/oportunidades/[id] PUT] ❌ Error completo:', strapiError)
      console.error('[API /crm/oportunidades/[id] PUT] ❌ Error message:', strapiError.message)
      console.error('[API /crm/oportunidades/[id] PUT] ❌ Error status:', strapiError.status)
      console.error('[API /crm/oportunidades/[id] PUT] ❌ Error response:', strapiError.response)
      if (strapiError.response?.data) {
        console.error('[API /crm/oportunidades/[id] PUT] ❌ Error response.data:', JSON.stringify(strapiError.response.data, null, 2))
      }
      console.error('[API /crm/oportunidades/[id] PUT] ❌ ========================================')
      throw strapiError
    }

    console.log('[API /crm/oportunidades/[id] PUT] 🔄 Revalidando cache...')
    
    // Revalidar para sincronización bidireccional
    revalidatePath('/crm/opportunities')
    revalidatePath('/crm/pipeline')
    revalidatePath(`/crm/opportunities/${id}`)
    revalidateTag('oportunidades', 'max')
    
    console.log('[API /crm/oportunidades/[id] PUT] ✅ Cache revalidado')

    return NextResponse.json({
      success: true,
      data: response.data,
      message: 'Oportunidad actualizada exitosamente',
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/oportunidades/[id] PUT] ❌ ERROR')
    console.error('[API /crm/oportunidades/[id] PUT] Error completo:', error)
    console.error('[API /crm/oportunidades/[id] PUT] Error message:', error.message)
    console.error('[API /crm/oportunidades/[id] PUT] Error status:', error.status)
    console.error('[API /crm/oportunidades/[id] PUT] Error details:', error.details)
    console.error('[API /crm/oportunidades/[id] PUT] Error stack:', error.stack)
    console.log('========================================')
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al actualizar oportunidad',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * DELETE /api/crm/oportunidades/[id]
 * Elimina una oportunidad permanentemente
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    try {
      await strapiClient.delete(`/api/oportunidades/${id}`)

      // Revalidar para sincronización bidireccional
      revalidatePath('/crm/opportunities')
      revalidatePath(`/crm/opportunities/${id}`)
      revalidateTag('oportunidades', 'max')

      return NextResponse.json({
        success: true,
        message: 'Oportunidad eliminada permanentemente',
      }, { status: 200 })
    } catch (deleteError: any) {
      // Si el error es por respuesta vacía pero el status fue 200/204, considerar éxito
      if (deleteError.status === 200 || deleteError.status === 204) {
        return NextResponse.json({
          success: true,
          message: 'Oportunidad eliminada permanentemente',
        }, { status: 200 })
      }
      throw deleteError
    }
  } catch (error: any) {
    console.error('[API /crm/oportunidades/[id] DELETE] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al eliminar oportunidad',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}
