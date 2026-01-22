/**
 * API Route para gestionar una empresa específica
 * GET, PUT, DELETE /api/crm/empresas/[id]
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

/**
 * Genera un slug a partir de un texto
 */
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .trim()
    .replace(/[^\w\s-]/g, '') // Remover caracteres especiales excepto espacios y guiones
    .replace(/\s+/g, '-') // Reemplazar espacios por guiones
    .replace(/-+/g, '-') // Reemplazar múltiples guiones por uno solo
    .replace(/^-+|-+$/g, '') // Remover guiones al inicio y final
}

interface EmpresaAttributes {
  nombre?: string
  empresa_nombre?: string
  slug?: string
  razon_social?: string
  rut?: string
  giro?: string
  estado?: string
  region?: string
  comuna?: any
  telefonos?: any[]
  emails?: any[]
  direcciones?: any[]
  datos_facturacion?: any
}

/**
 * GET /api/crm/empresas/[id]
 * Obtiene una empresa específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    debugLog('[API /crm/empresas/[id] GET] Buscando empresa con ID:', id)

    let empresa: any = null

    // Intentar primero con el endpoint directo
    try {
      const paramsObj = new URLSearchParams({
        'populate[comuna]': 'true',
        'populate[telefonos]': 'true',
        'populate[emails]': 'true',
        'populate[direcciones]': 'true',
        'populate[datos_facturacion]': 'true',
      })
      
      const response = await strapiClient.get<StrapiResponse<StrapiEntity<EmpresaAttributes>>>(
        `/api/empresas/${id}?${paramsObj.toString()}`
      )
      
      if (response.data) {
        // Extraer objeto único si es array
        empresa = Array.isArray(response.data) 
          ? (response.data.length > 0 ? response.data[0] : null)
          : response.data
        debugLog('[API /crm/empresas/[id] GET] Empresa encontrada directamente')
      }
    } catch (directError: any) {
      debugLog('[API /crm/empresas/[id] GET] Endpoint directo falló, intentando búsqueda por filtro...')
      
      try {
        const isDocumentId = /^[a-zA-Z0-9_-]+$/.test(id) && !/^\d+$/.test(id)
        
        let filterParamsObj: URLSearchParams
        
        if (isDocumentId) {
          filterParamsObj = new URLSearchParams({
            'filters[documentId][$eq]': id,
            'populate[comuna]': 'true',
            'populate[telefonos]': 'true',
            'populate[emails]': 'true',
            'populate[direcciones]': 'true',
            'populate[datos_facturacion]': 'true',
          })
        } else {
          filterParamsObj = new URLSearchParams({
            'filters[id][$eq]': id.toString(),
            'populate[comuna]': 'true',
            'populate[telefonos]': 'true',
            'populate[emails]': 'true',
            'populate[direcciones]': 'true',
            'populate[datos_facturacion]': 'true',
          })
        }
        
        const filterResponse = await strapiClient.get<StrapiResponse<StrapiEntity<EmpresaAttributes>>>(
          `/api/empresas?${filterParamsObj.toString()}`
        )
        
        if (filterResponse.data) {
          if (Array.isArray(filterResponse.data) && filterResponse.data.length > 0) {
            empresa = filterResponse.data[0]
          } else if (!Array.isArray(filterResponse.data)) {
            empresa = filterResponse.data
          }
        }
      } catch (filterError: any) {
        console.error('[API /crm/empresas/[id] GET] Error en búsqueda por filtro:', filterError.message)
      }
    }

    if (!empresa) {
      return NextResponse.json(
        {
          success: false,
          error: 'Empresa no encontrada',
          details: { id },
          status: 404,
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: empresa,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/empresas/[id] GET] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener empresa',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * PUT /api/crm/empresas/[id]
 * Actualiza una empresa
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Validaciones básicas
    if (!body.empresa_nombre || !body.empresa_nombre.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'El nombre de la empresa es obligatorio',
        },
        { status: 400 }
      )
    }

    // Generar slug desde el nombre (asegurarse de que no sea vacío)
    const nombreEmpresa = (body.empresa_nombre?.trim() || body.nombre?.trim() || '').trim()
    
    if (!nombreEmpresa) {
      return NextResponse.json(
        {
          success: false,
          error: 'El nombre de la empresa es obligatorio',
        },
        { status: 400 }
      )
    }
    
    const slug = generateSlug(nombreEmpresa) || generateSlug('empresa-' + Date.now())

    // Preparar datos para Strapi
    const empresaData: any = {
      data: {
        // Enviar tanto 'nombre' como 'empresa_nombre' por compatibilidad
        nombre: nombreEmpresa,
        empresa_nombre: nombreEmpresa,
        slug: slug,
        ...(body.razon_social && { razon_social: body.razon_social.trim() }),
        ...(body.rut && { rut: body.rut.trim() }),
        ...(body.giro && { giro: body.giro.trim() }),
        ...(body.estado && { estado: body.estado }),
        ...(body.region && { region: body.region }),
        ...(body.website && { website: body.website.trim() }),
        // Relación comuna
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
        // Direcciones
        ...(body.direcciones && Array.isArray(body.direcciones) && {
          direcciones: body.direcciones.map((d: any) => {
            const direccion: any = {
              ...(d.nombre_calle && { nombre_calle: d.nombre_calle }),
              ...(d.numero_calle && { numero_calle: d.numero_calle }),
              ...(d.complemento_direccion && { complemento_direccion: d.complemento_direccion }),
              ...(d.tipo_direccion && { tipo_direccion: d.tipo_direccion }),
              ...(d.direccion_principal_envio_facturacion && { direccion_principal_envio_facturacion: d.direccion_principal_envio_facturacion }),
            }
            if (d.comuna && (typeof d.comuna === 'number' || (typeof d.comuna === 'string' && !isNaN(parseInt(d.comuna))))) {
              direccion.comuna = { connect: [parseInt(d.comuna.toString())] }
            }
            return direccion
          }),
        }),
        // Datos de facturación
        ...(body.datos_facturacion && {
          datos_facturacion: {
            ...(body.datos_facturacion.first_name && { first_name: body.datos_facturacion.first_name }),
            ...(body.datos_facturacion.last_name && { last_name: body.datos_facturacion.last_name }),
            ...(body.datos_facturacion.company && { company: body.datos_facturacion.company }),
            ...(body.datos_facturacion.email && { email: body.datos_facturacion.email }),
            ...(body.datos_facturacion.phone && { phone: body.datos_facturacion.phone }),
            ...(body.datos_facturacion.address_1 && { address_1: body.datos_facturacion.address_1 }),
            ...(body.datos_facturacion.address_2 && { address_2: body.datos_facturacion.address_2 }),
            ...(body.datos_facturacion.city && { city: body.datos_facturacion.city }),
            ...(body.datos_facturacion.state && { state: body.datos_facturacion.state }),
            ...(body.datos_facturacion.postcode && { postcode: body.datos_facturacion.postcode }),
            ...(body.datos_facturacion.country && { country: body.datos_facturacion.country || 'CL' }),
          },
        }),
      },
    }

    const response = await strapiClient.put<StrapiResponse<StrapiEntity<EmpresaAttributes>>>(
      `/api/empresas/${id}`,
      empresaData
    )

    // Extraer objeto único de la respuesta
    const updatedData = Array.isArray(response.data) 
      ? (response.data.length > 0 ? response.data[0] : response.data)
      : response.data

    // Revalidar para sincronización bidireccional
    revalidatePath('/crm/empresas')
    revalidatePath(`/crm/empresas/${id}`)
    revalidatePath('/crm/empresas/[id]', 'page')
    revalidateTag('empresas', 'max')

    return NextResponse.json({
      success: true,
      data: updatedData,
      message: 'Empresa actualizada exitosamente',
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/empresas/[id] PUT] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al actualizar empresa',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * DELETE /api/crm/empresas/[id]
 * Elimina una empresa permanentemente
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    debugLog('[API /crm/empresas/[id] DELETE] Eliminando empresa:', id)

    try {
      await strapiClient.delete(`/api/empresas/${id}`)

      // Revalidar para sincronización bidireccional
      revalidatePath('/crm/empresas')
      revalidatePath(`/crm/empresas/${id}`)
      revalidatePath('/crm/empresas/[id]', 'page')
      revalidateTag('empresas', 'max')

      return NextResponse.json({
        success: true,
        message: 'Empresa eliminada permanentemente',
      }, { status: 200 })
    } catch (deleteError: any) {
      if (deleteError.status === 200 || deleteError.status === 204) {
        return NextResponse.json({
          success: true,
          message: 'Empresa eliminada permanentemente',
        }, { status: 200 })
      }
      throw deleteError
    }
  } catch (error: any) {
    console.error('[API /crm/empresas/[id] DELETE] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al eliminar empresa',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

