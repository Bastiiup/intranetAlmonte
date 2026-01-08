/**
 * API Route para obtener contactos asociados a un colegio específico
 * GET /api/crm/colegios/[id]/contacts
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

interface PersonaAttributes {
  nombre_completo?: string
  nombres?: string
  primer_apellido?: string
  segundo_apellido?: string
  rut?: string
  nivel_confianza?: 'baja' | 'media' | 'alta'
  origen?: 'mineduc' | 'csv' | 'manual' | 'crm' | 'web' | 'otro'
  activo?: boolean
  createdAt?: string
  updatedAt?: string
  emails?: Array<{ email?: string; principal?: boolean }>
  telefonos?: Array<{ telefono_norm?: string; telefono_raw?: string; principal?: boolean }>
  imagen?: string | {
    url?: string
    media?: {
      data?: {
        attributes?: {
          url?: string
        }
      }
    }
  }
  tags?: Array<{ name?: string }>
  trayectorias?: Array<{
    id?: number
    documentId?: string
    cargo?: string
    curso?: string
    nivel?: string
    grado?: string
    is_current?: boolean
    colegio?: {
      id?: number
      documentId?: string
      colegio_nombre?: string
    }
  }>
}

/**
 * GET /api/crm/colegios/[id]/contacts
 * Obtiene los contactos asociados a un colegio específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') || '1'
    const pageSize = searchParams.get('pageSize') || '50'

    console.log('[API /crm/colegios/[id]/contacts GET] Buscando contactos para colegio:', id)

    // Convertir el ID del colegio a número si es necesario
    const colegioId = typeof id === 'string' ? parseInt(id) : id

    if (isNaN(colegioId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID de colegio inválido',
        },
        { status: 400 }
      )
    }

    // Construir parámetros de query
    const paramsObj = new URLSearchParams({
      'pagination[page]': page,
      'pagination[pageSize]': pageSize,
      'sort[0]': 'updatedAt:desc',
    })

    // Populate para relaciones
    paramsObj.append('populate[emails]', 'true')
    paramsObj.append('populate[telefonos]', 'true')
    paramsObj.append('populate[imagen]', 'true')
    paramsObj.append('populate[tags]', 'true')
    paramsObj.append('populate[trayectorias]', 'true')
    paramsObj.append('populate[trayectorias.colegio]', 'true')

    // Filtrar por contactos que tengan este colegio en sus trayectorias
    // En Strapi, para filtrar por relaciones anidadas usamos la sintaxis de filtros
    paramsObj.append('filters[activo][$eq]', 'true')
    paramsObj.append('filters[trayectorias][colegio][id][$eq]', colegioId.toString())

    const url = `/api/personas?${paramsObj.toString()}`
    const response = await strapiClient.get<StrapiResponse<StrapiEntity<PersonaAttributes>>>(url)

    // Filtrar solo las trayectorias que corresponden a este colegio
    const contactos = Array.isArray(response.data) ? response.data : [response.data]
    
    const contactosFiltrados = contactos.map((contacto: any) => {
      const attrs = contacto.attributes || contacto
      const trayectorias = attrs.trayectorias || []
      
      // Filtrar solo las trayectorias de este colegio
      const trayectoriasDelColegio = trayectorias.filter((t: any) => {
        const colegio = t.colegio?.data || t.colegio
        const colegioIdTrayectoria = colegio?.id || colegio?.documentId
        return colegioIdTrayectoria === colegioId || colegioIdTrayectoria === id
      })

      return {
        ...contacto,
        attributes: {
          ...attrs,
          trayectorias: trayectoriasDelColegio,
        },
      }
    })

    return NextResponse.json({
      success: true,
      data: contactosFiltrados,
      meta: response.meta,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/colegios/[id]/contacts GET] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener contactos del colegio',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}
