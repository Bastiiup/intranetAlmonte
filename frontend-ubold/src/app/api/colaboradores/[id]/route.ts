/**
 * API Route para gestionar un colaborador específico
 * GET, PUT, DELETE /api/colaboradores/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'
import { requireAuth } from '@/lib/auth/middleware'

export const dynamic = 'force-dynamic'

interface ColaboradorAttributes {
  email_login: string
  rol?: string
  rol_principal?: string
  rol_operativo?: string
  activo: boolean
  persona?: any
  empresa?: any
  usuario?: any
}

/**
 * GET /api/colaboradores/[id]
 * Obtiene un colaborador específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verificar autenticación
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const { id } = await params
    console.log('[API /colaboradores/[id] GET] Buscando colaborador con ID:', id)

    let colaborador: any = null

    // Intentar primero con el endpoint directo (funciona con documentId o id)
    try {
      const response = await strapiClient.get<StrapiResponse<StrapiEntity<ColaboradorAttributes>>>(
        `/api/colaboradores/${id}?populate[persona][fields]=rut,nombres,primer_apellido,segundo_apellido,nombre_completo&populate[usuario]=*`
      )
      
      if (response.data) {
        colaborador = response.data
        console.log('[API /colaboradores/[id] GET] Colaborador encontrado directamente')
      }
    } catch (directError: any) {
      console.log('[API /colaboradores/[id] GET] Endpoint directo falló, intentando búsqueda por filtro...')
      
      // Si falla, intentar buscar por filtro (útil cuando el ID es numérico pero necesitamos documentId)
      try {
        const filterResponse = await strapiClient.get<StrapiResponse<StrapiEntity<ColaboradorAttributes>>>(
          `/api/colaboradores?filters[id][$eq]=${id}&populate[persona][fields]=rut,nombres,primer_apellido,segundo_apellido,nombre_completo&populate[usuario]=*`
        )
        
        if (filterResponse.data) {
          if (Array.isArray(filterResponse.data) && filterResponse.data.length > 0) {
            colaborador = filterResponse.data[0]
            console.log('[API /colaboradores/[id] GET] Colaborador encontrado por filtro (array)')
          } else if (!Array.isArray(filterResponse.data)) {
            colaborador = filterResponse.data
            console.log('[API /colaboradores/[id] GET] Colaborador encontrado por filtro (objeto)')
          }
        }
      } catch (filterError: any) {
        console.error('[API /colaboradores/[id] GET] Error en búsqueda por filtro:', filterError.message)
      }
    }

    if (!colaborador) {
      return NextResponse.json(
        {
          success: false,
          error: 'Colaborador no encontrado',
          details: { id },
          status: 404,
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: colaborador,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /colaboradores/[id] GET] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener colaborador',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * PUT /api/colaboradores/[id]
 * Actualiza un colaborador
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verificar autenticación
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const { id } = await params
    const body = await request.json()

    // Validaciones básicas
    if (!body.email_login || !body.email_login.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'El email_login es obligatorio',
        },
        { status: 400 }
      )
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email_login.trim())) {
      return NextResponse.json(
        {
          success: false,
          error: 'El email_login no tiene un formato válido',
        },
        { status: 400 }
      )
    }

    // Validar contraseña si se proporciona
    if (body.password && body.password.trim().length > 0 && body.password.trim().length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: 'La contraseña debe tener al menos 6 caracteres',
        },
        { status: 400 }
      )
    }

    // Preparar datos para Strapi
    // Solo enviar campos que existen en el modelo de Strapi
    const colaboradorData: any = {
      data: {
        email_login: body.email_login.trim(),
        rol: body.rol || null,
        activo: body.activo !== undefined ? body.activo : true,
        // Solo enviar password si se proporcionó (no vacío)
        ...(body.password && body.password.trim().length > 0 && { password: body.password }),
        ...(body.persona && { persona: body.persona }),
        ...(body.usuario && { usuario: body.usuario }),
      },
    }

    const response = await strapiClient.put<StrapiResponse<StrapiEntity<ColaboradorAttributes>>>(
      `/api/colaboradores/${id}`,
      colaboradorData
    )

    return NextResponse.json({
      success: true,
      data: response.data,
      message: 'Colaborador actualizado exitosamente',
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /colaboradores/[id] PUT] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al actualizar colaborador',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * DELETE /api/colaboradores/[id]
 * Elimina un colaborador permanentemente
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verificar autenticación
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const { id } = await params
    console.log('[API /colaboradores/[id] DELETE] Eliminando colaborador:', id)

    // Eliminar permanentemente usando delete
    // Strapi puede devolver 200 con JSON o 204 sin contenido
    try {
      const response = await strapiClient.delete(
        `/api/colaboradores/${id}`
      )

      // Si la respuesta es exitosa (aunque esté vacía), retornar éxito
      return NextResponse.json({
        success: true,
        message: 'Colaborador eliminado permanentemente',
      }, { status: 200 })
    } catch (deleteError: any) {
      // Si el error es por respuesta vacía pero el status fue 200/204, considerar éxito
      if (deleteError.status === 200 || deleteError.status === 204) {
        return NextResponse.json({
          success: true,
          message: 'Colaborador eliminado permanentemente',
        }, { status: 200 })
      }
      throw deleteError
    }
  } catch (error: any) {
    console.error('[API /colaboradores/[id] DELETE] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al eliminar colaborador',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

