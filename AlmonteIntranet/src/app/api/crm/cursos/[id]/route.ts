/**
 * API Route para gestionar un curso específico
 * GET, PUT, DELETE /api/crm/cursos/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

// Helper para logs condicionales
const DEBUG = process.env.NODE_ENV === 'development' || process.env.DEBUG_CRM === 'true'
const debugLog = (...args: any[]) => {
  if (DEBUG) {
    console.log(...args)
  }
}

/**
 * GET /api/crm/cursos/[id]
 * Obtiene un curso específico con sus materiales
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    debugLog('[API /crm/cursos/[id] GET] Buscando curso:', id)

    const paramsObj = new URLSearchParams({
      'populate[materiales]': 'true',
      'populate[colegio]': 'true',
    })

    const response = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
      `/api/cursos/${id}?${paramsObj.toString()}`
    )

    return NextResponse.json({
      success: true,
      data: response.data,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/cursos/[id] GET] Error:', {
      message: error.message,
      status: error.status,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener curso',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * PUT /api/crm/cursos/[id]
 * Actualiza un curso
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    debugLog('[API /crm/cursos/[id] PUT] Actualizando curso:', id)

    // Validaciones
    if (!body.curso_nombre || !body.curso_nombre.trim()) {
      return NextResponse.json(
        { success: false, error: 'El nombre del curso es obligatorio' },
        { status: 400 }
      )
    }

    // Preparar datos para Strapi
    // ⚠️ IMPORTANTE: Verificar el nombre exacto del campo en Strapi
    const cursoData: any = {
      data: {},
    }
    
    // Agregar nombre del curso (intentar ambos nombres posibles)
    if (body.curso_nombre?.trim()) {
      cursoData.data.curso_nombre = body.curso_nombre.trim()
      cursoData.data.nombre = body.curso_nombre.trim() // Por si acaso
    } else if (body.nombre?.trim()) {
      cursoData.data.nombre = body.nombre.trim()
      cursoData.data.curso_nombre = body.nombre.trim()
    }
    
    // Agregar otros campos
    if (body.nivel) cursoData.data.nivel = body.nivel
    if (body.grado) cursoData.data.grado = body.grado
    if (body.activo !== undefined) cursoData.data.activo = body.activo
    
    // Materiales como componentes repeatable
    if (body.materiales && Array.isArray(body.materiales) && body.materiales.length > 0) {
      cursoData.data.materiales = body.materiales.map((material: any) => ({
        material_nombre: material.material_nombre || '',
        tipo: material.tipo || 'util',
        cantidad: material.cantidad ? parseInt(String(material.cantidad)) : 1,
        obligatorio: material.obligatorio !== undefined ? material.obligatorio : true,
        ...(material.descripcion && { descripcion: material.descripcion }),
      }))
    }
    
    // Limpiar campos undefined o null
    Object.keys(cursoData.data).forEach(key => {
      if (cursoData.data[key] === undefined || cursoData.data[key] === null) {
        delete cursoData.data[key]
      }
    })
    
    // Si hay ambos nombre y curso_nombre, mantener solo uno (preferir curso_nombre)
    if (cursoData.data.nombre && cursoData.data.curso_nombre) {
      delete cursoData.data.nombre
    }

    const response = await strapiClient.put<StrapiResponse<StrapiEntity<any>>>(
      `/api/cursos/${id}`,
      cursoData
    )

    debugLog('[API /crm/cursos/[id] PUT] Curso actualizado exitosamente')

    return NextResponse.json({
      success: true,
      data: response.data,
      message: 'Curso actualizado exitosamente',
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/cursos/[id] PUT] Error:', {
      message: error.message,
      status: error.status,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al actualizar curso',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * DELETE /api/crm/cursos/[id]
 * Elimina un curso
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    debugLog('[API /crm/cursos/[id] DELETE] Eliminando curso:', id)

    await strapiClient.delete(`/api/cursos/${id}`)

    return NextResponse.json({
      success: true,
      message: 'Curso eliminado exitosamente',
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/cursos/[id] DELETE] Error:', {
      message: error.message,
      status: error.status,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al eliminar curso',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}
