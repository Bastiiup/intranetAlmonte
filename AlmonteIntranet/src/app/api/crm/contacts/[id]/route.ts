/**
 * API Route para obtener un contacto individual con toda su información
 * GET /api/crm/contacts/[id]
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
    anio?: number
    is_current?: boolean
    activo?: boolean
    fecha_inicio?: string
    fecha_fin?: string
    curso?: any
    asignatura?: any
    colegio?: {
      id?: number
      documentId?: string
      colegio_nombre?: string
      rbd?: string | number
      dependencia?: string
      region?: string
      comuna?: {
        comuna_nombre?: string
        region_nombre?: string
      }
    }
  }>
}

interface ActividadAttributes {
  tipo?: 'llamada' | 'email' | 'reunion' | 'nota' | 'cambio_estado' | 'tarea' | 'recordatorio' | 'otro'
  titulo?: string
  descripcion?: string
  fecha?: string
  estado?: 'completada' | 'pendiente' | 'cancelada' | 'en_progreso'
  notas?: string
  creado_por?: {
    id?: number
    documentId?: string
    nombre_completo?: string
    email?: string
  }
}

/**
 * GET /api/crm/contacts/[id]
 * Obtiene un contacto individual con trayectorias, colegios y actividades
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contactId } = await params

    // PASO 1: Obtener el contacto (persona) con todas sus relaciones
    const personaParams = new URLSearchParams({
      'populate[emails]': 'true',
      'populate[telefonos]': 'true',
      'populate[imagen]': 'true',
      'populate[tags]': 'true',
      'populate[trayectorias][populate][colegio][populate][comuna]': 'true',
      'populate[trayectorias][populate][curso]': 'true',
      'populate[trayectorias][populate][asignatura]': 'true',
    })

    let personaResponse: StrapiResponse<StrapiEntity<PersonaAttributes>>
    try {
      personaResponse = await strapiClient.get<StrapiResponse<StrapiEntity<PersonaAttributes>>>(
        `/api/personas/${contactId}?${personaParams.toString()}`
      )
    } catch (error: any) {
      // Si falla con documentId, intentar buscar por id numérico
      if (error.status === 404) {
        const searchParams = new URLSearchParams({
          'filters[id][$eq]': contactId,
          ...Object.fromEntries(personaParams.entries()),
        })
        const searchResponse = await strapiClient.get<StrapiResponse<StrapiEntity<PersonaAttributes>>>(
          `/api/personas?${searchParams.toString()}`
        )
        if (Array.isArray(searchResponse.data) && searchResponse.data.length > 0) {
          personaResponse = { ...searchResponse, data: searchResponse.data[0] }
        } else {
          throw new Error('Contacto no encontrado')
        }
      } else {
        throw error
      }
    }

    const personaData = Array.isArray(personaResponse.data) 
      ? personaResponse.data[0] 
      : personaResponse.data

    if (!personaData) {
      return NextResponse.json(
        { success: false, error: 'Contacto no encontrado' },
        { status: 404 }
      )
    }

    const personaAttrs = personaData.attributes || personaData
    const personaIdNum = personaData.id

    // PASO 2: Obtener actividades relacionadas con este contacto
    let actividades: any[] = []
    try {
      const actividadesParams = new URLSearchParams({
        'filters[relacionado_con_contacto][id][$eq]': String(personaIdNum),
        'populate[creado_por]': 'true',
        'sort[0]': 'fecha:desc',
        'pagination[pageSize]': '100',
      })

      const actividadesResponse = await strapiClient.get<StrapiResponse<StrapiEntity<ActividadAttributes>>>(
        `/api/actividades?${actividadesParams.toString()}`
      )

      if (actividadesResponse.data) {
        actividades = Array.isArray(actividadesResponse.data) 
          ? actividadesResponse.data 
          : [actividadesResponse.data]
      }
    } catch (error: any) {
      console.error('[API /crm/contacts/[id] GET] Error obteniendo actividades:', error)
      // Continuar sin actividades si hay error
    }

    // PASO 3: Transformar y normalizar datos
    const trayectorias = (personaAttrs.trayectorias?.data || personaAttrs.trayectorias || [])
      .map((t: any) => {
        const tAttrs = t.attributes || t
        const colegioData = tAttrs.colegio?.data || tAttrs.colegio
        const colegioAttrs = colegioData?.attributes || colegioData
        const cursoData = tAttrs.curso?.data || tAttrs.curso
        const cursoAttrs = cursoData?.attributes || cursoData
        const asignaturaData = tAttrs.asignatura?.data || tAttrs.asignatura
        const asignaturaAttrs = asignaturaData?.attributes || asignaturaData
        const comunaData = colegioAttrs?.comuna?.data || colegioAttrs?.comuna
        const comunaAttrs = comunaData?.attributes || comunaData

        return {
          id: t.id || t.documentId,
          documentId: t.documentId || String(t.id || ''),
          cargo: tAttrs.cargo || '',
          anio: tAttrs.anio || null,
          is_current: tAttrs.is_current || false,
          activo: tAttrs.activo !== undefined ? tAttrs.activo : true,
          fecha_inicio: tAttrs.fecha_inicio || null,
          fecha_fin: tAttrs.fecha_fin || null,
          colegio: {
            id: colegioData?.id || colegioData?.documentId,
            documentId: colegioData?.documentId || String(colegioData?.id || ''),
            nombre: colegioAttrs?.colegio_nombre || '',
            rbd: colegioAttrs?.rbd || '',
            dependencia: colegioAttrs?.dependencia || '',
            region: colegioAttrs?.region || comunaAttrs?.region_nombre || '',
            comuna: comunaAttrs?.comuna_nombre || comunaAttrs?.nombre || '',
          },
          curso: {
            id: cursoData?.id || cursoData?.documentId,
            nombre: cursoAttrs?.nombre || '',
          },
          asignatura: {
            id: asignaturaData?.id || asignaturaData?.documentId,
            nombre: asignaturaAttrs?.nombre || '',
          },
        }
      })

    const actividadesNormalizadas = actividades.map((act: any) => {
      const actAttrs = act.attributes || act
      const creadoPorData = actAttrs.creado_por?.data || actAttrs.creado_por
      const creadoPorAttrs = creadoPorData?.attributes || creadoPorData

      return {
        id: act.id || act.documentId,
        documentId: act.documentId || String(act.id || ''),
        tipo: actAttrs.tipo || 'otro',
        titulo: actAttrs.titulo || '',
        descripcion: actAttrs.descripcion || '',
        fecha: actAttrs.fecha || '',
        estado: actAttrs.estado || 'pendiente',
        notas: actAttrs.notas || '',
        creado_por: creadoPorData ? {
          id: creadoPorData.id || creadoPorData.documentId,
          nombre: creadoPorAttrs?.nombre_completo || creadoPorAttrs?.email || 'Desconocido',
          email: creadoPorAttrs?.email || '',
        } : null,
      }
    })

    // PASO 4: Obtener colegios únicos de las trayectorias
    const colegiosUnicos = Array.from(
      new Map(
        trayectorias
          .filter(t => t.colegio.id)
          .map(t => [t.colegio.id, t.colegio])
      ).values()
    )

    return NextResponse.json({
      success: true,
      data: {
        id: personaData.id,
        documentId: personaData.documentId || String(personaData.id || ''),
        nombre_completo: personaAttrs.nombre_completo || '',
        nombres: personaAttrs.nombres || '',
        primer_apellido: personaAttrs.primer_apellido || '',
        segundo_apellido: personaAttrs.segundo_apellido || '',
        rut: personaAttrs.rut || '',
        nivel_confianza: personaAttrs.nivel_confianza || 'media',
        origen: personaAttrs.origen || 'manual',
        activo: personaAttrs.activo !== undefined ? personaAttrs.activo : true,
        createdAt: personaAttrs.createdAt || '',
        updatedAt: personaAttrs.updatedAt || '',
        emails: personaAttrs.emails || [],
        telefonos: personaAttrs.telefonos || [],
        imagen: personaAttrs.imagen,
        tags: personaAttrs.tags || [],
        trayectorias,
        colegios: colegiosUnicos,
        actividades: actividadesNormalizadas,
      },
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/contacts/[id] GET] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: 'Error obteniendo contacto',
        details: error instanceof Error ? error.message : 'Unknown error',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}
