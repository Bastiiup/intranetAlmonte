/**
 * API Route para gestionar un colegio específico
 * GET, PUT, DELETE /api/crm/colegios/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

// Helper para logs condicionales de debugging
const DEBUG = process.env.NODE_ENV === 'development' || process.env.DEBUG_CRM === 'true'
const debugLog = (...args: any[]) => {
  if (DEBUG) {
    console.log(...args)
  }
}

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
    debugLog('[API /crm/colegios/[id] GET] Buscando colegio con ID:', id)

    let colegio: any = null

    // Intentar primero con el endpoint directo
    try {
      // Construir populate manual para todas las relaciones necesarias
      const paramsObj = new URLSearchParams({
        'populate[comuna]': 'true',
        'populate[telefonos]': 'true',
        'populate[emails]': 'true',
        'populate[direcciones]': 'true',
        'populate[cartera_asignaciones][populate][ejecutivo]': 'true',
        'populate[persona_trayectorias][populate][persona]': 'true',
        'populate[persona_trayectorias][populate][colegio]': 'true',
        'populate[persona_trayectorias][populate][curso]': 'true',
        'populate[persona_trayectorias][populate][asignatura]': 'true',
      })
      
      const response = await strapiClient.get<StrapiResponse<StrapiEntity<ColegioAttributes>>>(
        `/api/colegios/${id}?${paramsObj.toString()}`
      )
      
      if (response.data) {
        colegio = response.data
        debugLog('[API /crm/colegios/[id] GET] Colegio encontrado directamente')
        debugLog('[API /crm/colegios/[id] GET] Estructura de datos recibida:', {
          tieneAttributes: !!colegio.attributes,
          keys: Object.keys(colegio),
          tienePersonaTrayectorias: !!(colegio.attributes?.persona_trayectorias || colegio.persona_trayectorias),
        })
      }
    } catch (directError: any) {
      debugLog('[API /crm/colegios/[id] GET] Endpoint directo falló, intentando búsqueda por filtro...')
      
      // Si falla, intentar buscar por filtro (tanto por id como por documentId)
      try {
        // Intentar primero por documentId si parece ser un documentId (string alfanumérico)
        const isDocumentId = /^[a-zA-Z0-9_-]+$/.test(id) && !/^\d+$/.test(id)
        
        let filterParamsObj: URLSearchParams
        
        if (isDocumentId) {
          // Buscar por documentId con populate manual
          filterParamsObj = new URLSearchParams({
            'filters[documentId][$eq]': id,
            'populate[comuna]': 'true',
            'populate[telefonos]': 'true',
            'populate[emails]': 'true',
            'populate[direcciones]': 'true',
            'populate[cartera_asignaciones][populate][ejecutivo]': 'true',
            'populate[persona_trayectorias][populate][persona]': 'true',
            'populate[persona_trayectorias][populate][colegio]': 'true',
            'populate[persona_trayectorias][populate][curso]': 'true',
            'populate[persona_trayectorias][populate][asignatura]': 'true',
          })
          debugLog('[API /crm/colegios/[id] GET] Buscando por documentId:', id)
        } else {
          // Buscar por id numérico con populate manual
          filterParamsObj = new URLSearchParams({
            'filters[id][$eq]': id.toString(),
            'populate[comuna]': 'true',
            'populate[telefonos]': 'true',
            'populate[emails]': 'true',
            'populate[direcciones]': 'true',
            'populate[cartera_asignaciones][populate][ejecutivo]': 'true',
            'populate[persona_trayectorias][populate][persona]': 'true',
            'populate[persona_trayectorias][populate][colegio]': 'true',
            'populate[persona_trayectorias][populate][curso]': 'true',
            'populate[persona_trayectorias][populate][asignatura]': 'true',
          })
          debugLog('[API /crm/colegios/[id] GET] Buscando por id numérico:', id)
        }
        
        const filterResponse = await strapiClient.get<StrapiResponse<StrapiEntity<ColegioAttributes>>>(
          `/api/colegios?${filterParamsObj.toString()}`
        )
        
        if (filterResponse.data) {
          if (Array.isArray(filterResponse.data) && filterResponse.data.length > 0) {
            colegio = filterResponse.data[0]
            debugLog('[API /crm/colegios/[id] GET] Colegio encontrado por filtro (array)')
          } else if (!Array.isArray(filterResponse.data)) {
            colegio = filterResponse.data
            debugLog('[API /crm/colegios/[id] GET] Colegio encontrado por filtro (objeto)')
          }
        }
        
        // Si no se encontró, intentar el método alternativo
        if (!colegio) {
          debugLog('[API /crm/colegios/[id] GET] No encontrado con primer método, intentando método alternativo')
          const alternateFilterParams = new URLSearchParams({
            'filters[id][$eq]': isDocumentId ? id : id.toString(),
            'populate[comuna]': 'true',
            'populate[telefonos]': 'true',
            'populate[emails]': 'true',
            'populate[direcciones]': 'true',
            'populate[cartera_asignaciones][populate][ejecutivo]': 'true',
            'populate[persona_trayectorias][populate][persona]': 'true',
            'populate[persona_trayectorias][populate][colegio]': 'true',
            'populate[persona_trayectorias][populate][curso]': 'true',
            'populate[persona_trayectorias][populate][asignatura]': 'true',
          })
          
          try {
            const alternateResponse = await strapiClient.get<StrapiResponse<StrapiEntity<ColegioAttributes>>>(
              `/api/colegios?${alternateFilterParams.toString()}`
            )
            
            if (alternateResponse.data) {
              if (Array.isArray(alternateResponse.data) && alternateResponse.data.length > 0) {
                colegio = alternateResponse.data[0]
                debugLog('[API /crm/colegios/[id] GET] Colegio encontrado por método alternativo (array)')
              } else if (!Array.isArray(alternateResponse.data)) {
                colegio = alternateResponse.data
                debugLog('[API /crm/colegios/[id] GET] Colegio encontrado por método alternativo (objeto)')
              }
            }
          } catch (altError: any) {
            console.error('[API /crm/colegios/[id] GET] Error en método alternativo:', altError.message)
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
            ...(body.estado && { estado: body.estado }),
            ...(body.dependencia && { dependencia: body.dependencia }),
            ...(body.region && { region: body.region }),
            ...(body.zona && { zona: body.zona }),
            ...(body.website && { website: body.website.trim() }),
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
        // Direcciones: usar campos correctos del componente contacto.direccion
        // Nota: Solo incluir comuna si es un ID numérico válido
        ...(body.direcciones && Array.isArray(body.direcciones) && {
          direcciones: body.direcciones.map((d: any) => {
            const direccion: any = {
              ...(d.nombre_calle && { nombre_calle: d.nombre_calle }),
              ...(d.numero_calle && { numero_calle: d.numero_calle }),
              ...(d.complemento_direccion && { complemento_direccion: d.complemento_direccion }),
              ...(d.tipo_direccion && { tipo_direccion: d.tipo_direccion }),
              ...(d.direccion_principal_envio_facturacion && { direccion_principal_envio_facturacion: d.direccion_principal_envio_facturacion }),
            }
            // Solo incluir comuna si es un ID numérico válido
            if (d.comuna && (typeof d.comuna === 'number' || (typeof d.comuna === 'string' && !isNaN(parseInt(d.comuna))))) {
              direccion.comuna = { connect: [parseInt(d.comuna.toString())] }
            }
            return direccion
          }),
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
    debugLog('[API /crm/colegios/[id] DELETE] Eliminando colegio:', id)

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

