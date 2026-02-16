import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/empresa-contactos
 * Obtiene relaciones empresa-contacto con filtros opcionales
 * 
 * Query params:
 * - filters[persona][id][$eq]: Filtrar por ID de persona
 * - filters[empresa][id][$eq]: Filtrar por ID de empresa
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Construir parámetros de filtro
    const params = new URLSearchParams()
    
    // Agregar populate para relaciones
    params.append('populate[persona]', 'true')
    params.append('populate[empresa]', 'true')
    
    // Copiar todos los filtros de la query string
    searchParams.forEach((value, key) => {
      if (key.startsWith('filters')) {
        params.append(key, value)
      }
    })
    
    const response = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
      `/api/empresa-contactos?${params.toString()}`
    )
    
    return NextResponse.json({
      success: true,
      data: response.data,
      meta: response.meta,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /empresa-contactos GET] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener relaciones empresa-contacto',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * POST /api/empresa-contactos
 * Crea o actualiza una relación empresa-contacto
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { persona_id, empresa_id, cargo } = body

    if (!persona_id || !empresa_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'persona_id y empresa_id son obligatorios',
        },
        { status: 400 }
      )
    }

    // Convertir IDs a números
    const personaIdNum = typeof persona_id === 'number' ? persona_id : parseInt(String(persona_id))
    const empresaIdNum = typeof empresa_id === 'number' ? empresa_id : parseInt(String(empresa_id))

    if (isNaN(personaIdNum) || isNaN(empresaIdNum)) {
      return NextResponse.json(
        {
          success: false,
          error: 'IDs inválidos',
        },
        { status: 400 }
      )
    }

    // Buscar si ya existe una relación empresa-contacto para esta persona y empresa
    try {
      const existingResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
        `/api/empresa-contactos?filters[persona][id][$eq]=${personaIdNum}&filters[empresa][id][$eq]=${empresaIdNum}`
      )

      // Extraer objeto único de la respuesta
      const existing = Array.isArray(existingResponse.data) 
        ? (existingResponse.data.length > 0 ? existingResponse.data[0] : null)
        : existingResponse.data

      if (existing) {
        // Extraer ID del objeto (puede estar en attributes o directamente)
        const existingAttrs = existing.attributes || existing
        const existingId = existingAttrs.documentId || existingAttrs.id || existing.documentId || existing.id
        const updateData: any = {
          data: {
            persona: { connect: [personaIdNum] },
            empresa: { connect: [empresaIdNum] },
            ...(cargo && { cargo: cargo.trim() }),
          },
        }

        await strapiClient.put(`/api/empresa-contactos/${existingId}`, updateData)

        return NextResponse.json({
          success: true,
          data: { id: existingId, updated: true },
          message: 'Relación empresa-contacto actualizada',
        }, { status: 200 })
      }
    } catch (error: any) {
      // Si no existe, continuar para crear
      console.log('[API /empresa-contactos POST] No se encontró relación existente, creando nueva')
    }

    // Crear nueva relación
    const createData: any = {
      data: {
        persona: { connect: [personaIdNum] },
        empresa: { connect: [empresaIdNum] },
        ...(cargo && { cargo: cargo.trim() }),
      },
    }

    const response = await strapiClient.post<StrapiResponse<StrapiEntity<any>>>(
      '/api/empresa-contactos',
      createData
    )

    // Extraer objeto único de la respuesta
    const createdData = Array.isArray(response.data) 
      ? (response.data.length > 0 ? response.data[0] : response.data)
      : response.data

    return NextResponse.json({
      success: true,
      data: createdData,
      message: 'Relación empresa-contacto creada',
    }, { status: 201 })
  } catch (error: any) {
    console.error('[API /empresa-contactos POST] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al crear/actualizar relación empresa-contacto',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

