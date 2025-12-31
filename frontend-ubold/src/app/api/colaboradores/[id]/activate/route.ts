import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

interface ColaboradorAttributes {
  email_login: string
  rol?: string
  activo: boolean
  persona?: any
}

/**
 * POST /api/colaboradores/[id]/activate
 * Activa un colaborador cambiando el campo activo de false a true
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    console.log('[API /colaboradores/[id]/activate] Activando colaborador:', id)

    // Primero obtener el colaborador para asegurarnos de tener el ID correcto
    let colaboradorId = id
    let colaborador: any = null

    // Intentar primero con el endpoint directo
    try {
      const getResponse = await strapiClient.get<StrapiResponse<StrapiEntity<ColaboradorAttributes>>>(
        `/api/colaboradores/${id}?fields=id,documentId,activo`
      )
      
      if (getResponse.data) {
        colaborador = getResponse.data
        const colaboradorData = (getResponse.data as any).attributes || getResponse.data
        colaboradorId = (getResponse.data as any).documentId || (getResponse.data as any).id || id
        console.log('[API /colaboradores/[id]/activate] Colaborador encontrado directamente, ID:', colaboradorId)
      }
    } catch (directError: any) {
      // Si falla, intentar buscar por filtro
      console.log('[API /colaboradores/[id]/activate] Endpoint directo falló, intentando búsqueda por filtro...')
      try {
        const filterResponse = await strapiClient.get<StrapiResponse<StrapiEntity<ColaboradorAttributes>>>(
          `/api/colaboradores?filters[id][$eq]=${id}&fields=id,documentId,activo&pagination[pageSize]=1`
        )
        
        if (filterResponse.data) {
          if (Array.isArray(filterResponse.data) && filterResponse.data.length > 0) {
            colaborador = filterResponse.data[0]
            colaboradorId = colaborador.documentId || colaborador.id || id
            console.log('[API /colaboradores/[id]/activate] Colaborador encontrado por filtro, ID:', colaboradorId)
          } else if (!Array.isArray(filterResponse.data)) {
            colaborador = filterResponse.data
            colaboradorId = (filterResponse.data as any).documentId || (filterResponse.data as any).id || id
            console.log('[API /colaboradores/[id]/activate] Colaborador encontrado por filtro (objeto), ID:', colaboradorId)
          }
        }
      } catch (filterError: any) {
        console.error('[API /colaboradores/[id]/activate] Error en búsqueda por filtro:', filterError.message)
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

    // Actualizar el campo activo a true usando el ID correcto
    const colaboradorData: any = {
      data: {
        activo: true,
      },
    }

    console.log('[API /colaboradores/[id]/activate] Actualizando colaborador con ID:', colaboradorId)

    const response = await strapiClient.put<StrapiResponse<StrapiEntity<ColaboradorAttributes>>>(
      `/api/colaboradores/${colaboradorId}`,
      colaboradorData
    )

    console.log('[API /colaboradores/[id]/activate] ✅ Colaborador activado exitosamente')

    return NextResponse.json({
      success: true,
      data: response.data,
      message: 'Colaborador activado exitosamente',
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /colaboradores/[id]/activate] ❌ Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al activar colaborador',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

