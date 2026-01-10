import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

const DEBUG = process.env.NODE_ENV === 'development' || process.env.DEBUG_CRM === 'true'
const debugLog = (...args: any[]) => {
  if (DEBUG) {
    console.log(...args)
  }
}

/**
 * GET /api/crm/listas-utiles/[id]
 * Obtiene una lista de útiles específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    debugLog('[API /crm/listas-utiles/[id] GET] ID:', id)

    const response = await strapiClient.get(
      `/api/listas-utiles/${id}?populate[materiales]=true`
    )

    if (response.error) {
      debugLog('[API /crm/listas-utiles/[id] GET] ❌ Error:', response.error)
      return NextResponse.json(
        {
          success: false,
          error: response.error.message || 'Error al obtener lista de útiles',
          details: response.error,
        },
        { status: response.error.status || 500 }
      )
    }

    debugLog('[API /crm/listas-utiles/[id] GET] ✅ Exitoso')

    return NextResponse.json({
      success: true,
      data: response.data,
    })
  } catch (error: any) {
    debugLog('[API /crm/listas-utiles/[id] GET] ❌ Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener lista de útiles',
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/crm/listas-utiles/[id]
 * Actualiza una lista de útiles
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()

    debugLog('[API /crm/listas-utiles/[id] PUT] ID:', id)
    debugLog('[API /crm/listas-utiles/[id] PUT] Request recibido:', body)

    // Validaciones
    if (body.nivel && body.nivel !== 'Basica' && body.nivel !== 'Media') {
      return NextResponse.json(
        {
          success: false,
          error: 'El nivel debe ser "Basica" o "Media"',
        },
        { status: 400 }
      )
    }

    if (body.grado !== undefined) {
      const gradoNum = parseInt(body.grado)
      if (isNaN(gradoNum) || gradoNum < 1 || gradoNum > 8) {
        return NextResponse.json(
          {
            success: false,
            error: 'El grado debe ser un número entre 1 y 8',
          },
          { status: 400 }
        )
      }
      body.grado = gradoNum
    }

    // Construir payload
    const payload: any = {
      data: {},
    }

    if (body.nombre !== undefined) {
      payload.data.nombre = body.nombre.trim()
    }
    if (body.nivel !== undefined) {
      payload.data.nivel = body.nivel
    }
    if (body.grado !== undefined) {
      payload.data.grado = body.grado
    }
    if (body.descripcion !== undefined) {
      payload.data.descripcion = body.descripcion || null
    }
    if (body.activo !== undefined) {
      payload.data.activo = body.activo
    }

    // Actualizar materiales si se proporcionan
    if (Array.isArray(body.materiales)) {
      payload.data.materiales = body.materiales.map((m: any) => ({
        material_nombre: m.material_nombre?.trim() || '',
        tipo: m.tipo || 'util',
        cantidad: parseInt(m.cantidad) || 1,
        obligatorio: m.obligatorio !== false,
        descripcion: m.descripcion || null,
      }))
    }

    debugLog('[API /crm/listas-utiles/[id] PUT] Payload:', JSON.stringify(payload, null, 2))

    const response = await strapiClient.put(`/api/listas-utiles/${id}`, payload)

    if (response.error) {
      debugLog('[API /crm/listas-utiles/[id] PUT] ❌ Error:', response.error)
      return NextResponse.json(
        {
          success: false,
          error: response.error.message || 'Error al actualizar lista de útiles',
          details: response.error,
        },
        { status: response.error.status || 500 }
      )
    }

    debugLog('[API /crm/listas-utiles/[id] PUT] ✅ Actualizado exitosamente')

    return NextResponse.json({
      success: true,
      data: response.data,
    })
  } catch (error: any) {
    debugLog('[API /crm/listas-utiles/[id] PUT] ❌ Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al actualizar lista de útiles',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/crm/listas-utiles/[id]
 * Elimina una lista de útiles
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    debugLog('[API /crm/listas-utiles/[id] DELETE] ID:', id)

    // Verificar si la lista está siendo usada por algún curso
    const cursosResponse = await strapiClient.get(
      `/api/cursos?filters[lista_utiles][id][$eq]=${id}&pagination[limit]=1`
    )

    if (!cursosResponse.error && cursosResponse.data) {
      const cursos = Array.isArray(cursosResponse.data)
        ? cursosResponse.data
        : cursosResponse.data?.data || []
      if (cursos.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'No se puede eliminar esta lista porque está siendo usada por uno o más cursos',
            cursosUsando: cursos.length,
          },
          { status: 400 }
        )
      }
    }

    const response = await strapiClient.delete(`/api/listas-utiles/${id}`)

    if (response.error) {
      debugLog('[API /crm/listas-utiles/[id] DELETE] ❌ Error:', response.error)
      return NextResponse.json(
        {
          success: false,
          error: response.error.message || 'Error al eliminar lista de útiles',
          details: response.error,
        },
        { status: response.error.status || 500 }
      )
    }

    debugLog('[API /crm/listas-utiles/[id] DELETE] ✅ Eliminado exitosamente')

    return NextResponse.json({
      success: true,
      message: 'Lista de útiles eliminada exitosamente',
    })
  } catch (error: any) {
    debugLog('[API /crm/listas-utiles/[id] DELETE] ❌ Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al eliminar lista de útiles',
      },
      { status: 500 }
    )
  }
}
