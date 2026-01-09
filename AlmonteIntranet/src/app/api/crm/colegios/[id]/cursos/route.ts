/**
 * API Route para gestionar cursos de un colegio
 * GET, POST /api/crm/colegios/[id]/cursos
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

interface CursoAttributes {
  nombre_curso?: string // ✅ Campo correcto en Strapi
  curso_nombre?: string // Mantener por compatibilidad
  titulo?: string // Campo existente en Strapi
  nivel?: string
  grado?: string
  activo?: boolean
  colegio?: any
  materiales?: Array<{
    material_nombre?: string
    tipo?: string
    cantidad?: number
    obligatorio?: boolean
    descripcion?: string
  }>
}

/**
 * GET /api/crm/colegios/[id]/cursos
 * Obtiene los cursos de un colegio específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: colegioId } = await params
    debugLog('[API /crm/colegios/[id]/cursos GET] Buscando cursos para colegio:', colegioId)

    // Obtener el ID numérico del colegio si es documentId
    const isDocumentId = typeof colegioId === 'string' && !/^\d+$/.test(colegioId)
    let colegioIdNum: number | string = colegioId

    if (isDocumentId) {
      try {
        const colegioResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
          `/api/colegios/${colegioId}?fields=id`
        )
        const colegioData = Array.isArray(colegioResponse.data) ? colegioResponse.data[0] : colegioResponse.data
        if (colegioData && typeof colegioData === 'object' && 'id' in colegioData) {
          colegioIdNum = colegioData.id as number
          debugLog('[API /crm/colegios/[id]/cursos GET] ID numérico del colegio:', colegioIdNum)
        }
      } catch (error: any) {
        console.error('[API /crm/colegios/[id]/cursos GET] Error obteniendo ID del colegio:', error)
        return NextResponse.json(
          { success: false, error: 'Colegio no encontrado' },
          { status: 404 }
        )
      }
    }

    // Buscar cursos del colegio
    // ⚠️ No usar sort hasta verificar qué campos son ordenables en Strapi
    const paramsObj = new URLSearchParams({
      'filters[colegio][id][$eq]': String(colegioIdNum),
      'populate[materiales]': 'true',
      // Removido sort hasta verificar el schema en Strapi
    })

    const response = await strapiClient.get<StrapiResponse<StrapiEntity<CursoAttributes>[]>>(
      `/api/cursos?${paramsObj.toString()}`
    )

    const cursos = Array.isArray(response.data) ? response.data : []

    return NextResponse.json({
      success: true,
      data: cursos,
      meta: {
        total: cursos.length,
      },
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/colegios/[id]/cursos GET] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener cursos',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * POST /api/crm/colegios/[id]/cursos
 * Crea un nuevo curso para el colegio
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: colegioId } = await params
    const body = await request.json()

    debugLog('[API /crm/colegios/[id]/cursos POST] Creando curso para colegio:', colegioId)

    // Obtener el ID numérico del colegio
    const isDocumentId = typeof colegioId === 'string' && !/^\d+$/.test(colegioId)
    let colegioIdNum: number | string = colegioId

    if (isDocumentId) {
      try {
        const colegioResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
          `/api/colegios/${colegioId}?fields=id`
        )
        const colegioData = Array.isArray(colegioResponse.data) ? colegioResponse.data[0] : colegioResponse.data
        if (colegioData && typeof colegioData === 'object' && 'id' in colegioData) {
          colegioIdNum = colegioData.id as number
        }
      } catch (error: any) {
        return NextResponse.json(
          { success: false, error: 'Colegio no encontrado' },
          { status: 404 }
        )
      }
    }

    // Validaciones
    if (!body.curso_nombre || !body.curso_nombre.trim()) {
      return NextResponse.json(
        { success: false, error: 'El nombre del curso es obligatorio' },
        { status: 400 }
      )
    }

    // Preparar datos para Strapi
    // ✅ Campo correcto en Strapi: nombre_curso (NO nombre, NO curso_nombre, NO titulo)
    const nombreCurso = body.curso_nombre?.trim() || body.nombre_curso?.trim()
    if (!nombreCurso) {
      return NextResponse.json(
        {
          success: false,
          error: 'El nombre del curso es obligatorio',
        },
        { status: 400 }
      )
    }

    const cursoData: any = {
      data: {
        nombre_curso: nombreCurso, // ✅ Campo correcto en Strapi
        colegio: { connect: [typeof colegioIdNum === 'number' ? colegioIdNum : parseInt(String(colegioIdNum))] },
        ...(body.nivel && { nivel: body.nivel }),
        ...(body.grado && { grado: body.grado }),
        ...(body.activo !== undefined && { activo: body.activo !== false }),
        // Materiales como componentes repeatable
        ...(body.materiales && Array.isArray(body.materiales) && body.materiales.length > 0 && {
          materiales: body.materiales.map((material: any) => ({
            material_nombre: material.material_nombre || '',
            tipo: material.tipo || 'util',
            cantidad: material.cantidad ? parseInt(String(material.cantidad)) : 1,
            obligatorio: material.obligatorio !== undefined ? material.obligatorio : true,
            ...(material.descripcion && { descripcion: material.descripcion }),
          })),
        }),
      },
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

    const response = await strapiClient.post<StrapiResponse<StrapiEntity<CursoAttributes>>>(
      '/api/cursos',
      cursoData
    )

    debugLog('[API /crm/colegios/[id]/cursos POST] Curso creado exitosamente')

    return NextResponse.json({
      success: true,
      data: response.data,
      message: 'Curso creado exitosamente',
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/colegios/[id]/cursos POST] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al crear curso',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}
