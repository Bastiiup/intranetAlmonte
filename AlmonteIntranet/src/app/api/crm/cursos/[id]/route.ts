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
  // Obtener el ID fuera del try para que esté disponible en el catch
  const { id } = await params
  
  try {
    debugLog('[API /crm/cursos/[id] GET] Buscando curso con ID:', id, 'Tipo:', typeof id)
    
    // El ID puede ser numérico o documentId (string), Strapi debería manejarlo automáticamente

    // Intentar con populate de lista_utiles, si falla intentar sin él
    // NOTA: El populate anidado de lista_utiles.materiales puede causar error 500 en Strapi
    // si el content type no está configurado correctamente
    let response: any
    try {
      const paramsObj = new URLSearchParams({
        'populate[materiales]': 'true',
        'populate[colegio]': 'true',
        'populate[lista_utiles]': 'true',
        'populate[lista_utiles][populate][materiales]': 'true',
      })
      response = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
        `/api/cursos/${id}?${paramsObj.toString()}`
      )
    } catch (error: any) {
      // Si falla con populate anidado de lista_utiles.materiales (error 500 común),
      // intentar solo con lista_utiles sin populate anidado
      if (error.status === 500 || error.status === 400) {
        debugLog('[API /crm/cursos/[id] GET] ⚠️ Error 500/400 con populate anidado lista_utiles.materiales, intentando sin populate anidado')
        try {
          const paramsObj = new URLSearchParams({
            'populate[materiales]': 'true',
            'populate[colegio]': 'true',
            'populate[lista_utiles]': 'true',
          })
          response = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
            `/api/cursos/${id}?${paramsObj.toString()}`
          )
        } catch (secondError: any) {
          // Si también falla, intentar sin lista_utiles completamente
          debugLog('[API /crm/cursos/[id] GET] ⚠️ Error también sin populate anidado, intentando sin lista_utiles')
          try {
            const paramsObj = new URLSearchParams({
              'populate[materiales]': 'true',
              'populate[colegio]': 'true',
            })
            response = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
              `/api/cursos/${id}?${paramsObj.toString()}`
            )
          } catch (thirdError: any) {
            // Si también falla, intentar solo con campos básicos
            debugLog('[API /crm/cursos/[id] GET] ⚠️ Error también sin lista_utiles, intentando solo campos básicos')
            response = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
              `/api/cursos/${id}`
            )
          }
        }
      } else {
        // Si es otro tipo de error, propagarlo
        throw error
      }
    }

    // Verificar que la respuesta tenga datos
    if (!response.data) {
      debugLog('[API /crm/cursos/[id] GET] ⚠️ Respuesta sin datos para ID:', id)
      return NextResponse.json(
        {
          success: false,
          error: `Curso con ID ${id} no encontrado`,
          status: 404,
        },
        { status: 404 }
      )
    }

    debugLog('[API /crm/cursos/[id] GET] ✅ Curso encontrado:', {
      hasData: !!response.data,
      id: response.data?.id || response.data?.documentId,
    })

    return NextResponse.json({
      success: true,
      data: response.data,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/cursos/[id] GET] Error:', {
      message: error.message,
      status: error.status,
      id,
    })
    
    // Si es un error 404, devolver mensaje más claro
    if (error.status === 404 || error.message?.includes('Not Found') || error.message?.includes('not found')) {
      return NextResponse.json(
        {
          success: false,
          error: `Curso con ID ${id} no encontrado`,
          status: 404,
        },
        { status: 404 }
      )
    }
    
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
    if (body.nombre_curso !== undefined && !body.nombre_curso?.trim()) {
      return NextResponse.json(
        { success: false, error: 'El nombre del curso no puede estar vacío' },
        { status: 400 }
      )
    }

    // Preparar datos para Strapi
    const cursoData: any = {
      data: {},
    }

    // Actualizar campos solo si están presentes
    if (body.nombre_curso !== undefined) {
      cursoData.data.nombre_curso = body.nombre_curso.trim()
    }
    if (body.nivel !== undefined) {
      cursoData.data.nivel = body.nivel
    }
    if (body.grado !== undefined) {
      cursoData.data.grado = body.grado
    }
    if (body.paralelo !== undefined) {
      cursoData.data.paralelo = body.paralelo || null
    }
    if (body.año !== undefined || body.ano !== undefined) {
      cursoData.data.año = body.año || body.ano || new Date().getFullYear()
    }
    if (body.activo !== undefined) {
      cursoData.data.activo = body.activo
    }

    // Actualizar relación lista_utiles
    if (body.lista_utiles !== undefined) {
      if (body.lista_utiles === null || body.lista_utiles === '') {
        // Desconectar lista_utiles
        cursoData.data.lista_utiles = { disconnect: true }
      } else {
        const listaUtilesId = typeof body.lista_utiles === 'number' 
          ? body.lista_utiles 
          : parseInt(String(body.lista_utiles))
        if (!isNaN(listaUtilesId)) {
          cursoData.data.lista_utiles = { connect: [listaUtilesId] }
        }
      }
    }

    // Actualizar materiales adicionales si se proporcionan
    if (body.materiales !== undefined) {
      if (Array.isArray(body.materiales) && body.materiales.length > 0) {
        cursoData.data.materiales = body.materiales.map((material: any) => ({
          material_nombre: material.material_nombre || '',
          tipo: material.tipo || 'util',
          cantidad: material.cantidad ? parseInt(String(material.cantidad)) : 1,
          obligatorio: material.obligatorio !== undefined ? material.obligatorio : true,
          ...(material.descripcion && { descripcion: material.descripcion }),
        }))
      } else {
        // Array vacío si no hay materiales
        cursoData.data.materiales = []
      }
    }
    
    // Limpiar campos undefined o null
    Object.keys(cursoData.data).forEach(key => {
      if (cursoData.data[key] === undefined || cursoData.data[key] === null) {
        delete cursoData.data[key]
      }
    })

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
