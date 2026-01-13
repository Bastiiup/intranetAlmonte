/**
 * API Route para obtener contactos asociados a un colegio específico
 * GET /api/crm/colegios/[id]/contacts
 */

import { NextRequest, NextResponse } from 'next/server'
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
    curso?: any // Relación
    asignatura?: any // Relación
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
    const { id: colegioId } = await params
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') || '1'
    const pageSize = searchParams.get('pageSize') || '50'

    debugLog('🔍 [API /crm/colegios/[id]/contacts GET] Buscando contactos para colegio:', colegioId)

    // PASO 1: Obtener el ID numérico del colegio si es documentId
    const isDocumentId = typeof colegioId === 'string' && !/^\d+$/.test(colegioId)
    let colegioIdNum: number | string = colegioId

    if (isDocumentId) {
      try {
        const colegioResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
          `/api/colegios/${colegioId}?fields[0]=id`
        )
        const colegioData = Array.isArray(colegioResponse.data) ? colegioResponse.data[0] : colegioResponse.data
        if (colegioData && typeof colegioData === 'object' && 'id' in colegioData) {
          colegioIdNum = colegioData.id as number
          debugLog('✅ [API /crm/colegios/[id]/contacts GET] ID numérico del colegio:', colegioIdNum)
        }
      } catch (error: any) {
        console.error('❌ [API /crm/colegios/[id]/contacts GET] Error obteniendo ID del colegio:', error)
        return NextResponse.json(
          { success: false, error: 'Colegio no encontrado' },
          { status: 404 }
        )
      }
    }

    // PASO 2: Estrategia alternativa - Obtener trayectorias directamente del colegio
    // Esto es más confiable que filtrar personas por trayectorias
    debugLog('📤 [API /crm/colegios/[id]/contacts GET] Estrategia: Obtener trayectorias del colegio primero')
    
    let contactos: any[] = []
    let responseMeta: any = null
    
    try {
      // ESTRATEGIA 1: Obtener trayectorias del colegio directamente
      // Nota: No filtramos por activo aquí porque activo es un campo de persona, no de trayectoria
      // Filtraremos por persona.activo después
      const trayectoriasParams = new URLSearchParams({
        'filters[colegio][id][$eq]': String(colegioIdNum),
        'populate[persona][populate][emails]': 'true',
        'populate[persona][populate][telefonos]': 'true',
        'populate[persona][populate][imagen]': 'true',
        'populate[persona][populate][tags]': 'true',
        'populate[colegio][populate][comuna]': 'true',
        'populate[curso]': 'true',
        'populate[asignatura]': 'true',
        'populate[curso_asignatura]': 'true',
        'pagination[pageSize]': '1000', // Obtener todas las trayectorias
      })
      
      const trayectoriasResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
        `/api/persona-trayectorias?${trayectoriasParams.toString()}`
      )
      
      debugLog('📥 [API /crm/colegios/[id]/contacts GET] Trayectorias encontradas:', Array.isArray(trayectoriasResponse.data) ? trayectoriasResponse.data.length : 1)
      
      if (trayectoriasResponse.data && Array.isArray(trayectoriasResponse.data) && trayectoriasResponse.data.length > 0) {
        // Agrupar trayectorias por persona
        const personasMap = new Map<string, any>()
        
        trayectoriasResponse.data.forEach((trayectoria: any) => {
          const tAttrs = trayectoria.attributes || trayectoria
          const personaData = tAttrs.persona?.data || tAttrs.persona
          
          if (!personaData) return
          
          const personaId = String(personaData.documentId || personaData.id)
          const personaAttrs = personaData.attributes || personaData
          
          // Solo incluir personas activas
          if (personaAttrs.activo === false) return
          
          // Si la persona ya está en el mapa, agregar esta trayectoria
          if (personasMap.has(personaId)) {
            const personaExistente = personasMap.get(personaId)!
            personaExistente.trayectorias.push(trayectoria)
          } else {
            // Crear nueva entrada para esta persona
            personasMap.set(personaId, {
              ...personaData,
              attributes: {
                ...personaAttrs,
                trayectorias: [trayectoria],
              },
            })
          }
        })
        
        contactos = Array.from(personasMap.values())
        debugLog('✅ [API /crm/colegios/[id]/contacts GET] Personas únicas encontradas:', contactos.length)
        // Guardar meta de la respuesta de trayectorias
        responseMeta = trayectoriasResponse.meta || null
      } else {
        debugLog('⚠️ [API /crm/colegios/[id]/contacts GET] No se encontraron trayectorias, intentando método alternativo...')
        
        // ESTRATEGIA 2: Método alternativo - Filtrar personas directamente
        const paramsObj = new URLSearchParams({
          'pagination[page]': page,
          'pagination[pageSize]': pageSize,
          'sort[0]': 'updatedAt:desc',
        })

        // Populate completo de trayectorias con sus relaciones
        paramsObj.append('populate[trayectorias][populate][colegio][populate][comuna]', 'true')
        paramsObj.append('populate[trayectorias][populate][curso]', 'true')
        paramsObj.append('populate[trayectorias][populate][asignatura]', 'true')
        paramsObj.append('populate[trayectorias][populate][curso_asignatura]', 'true')

        // Populate de persona
        paramsObj.append('populate[emails]', 'true')
        paramsObj.append('populate[telefonos]', 'true')
        paramsObj.append('populate[imagen]', 'true')
        paramsObj.append('populate[tags]', 'true')

        // Filtrar por contactos activos
        paramsObj.append('filters[activo][$eq]', 'true')

        // Intentar con id numérico
        paramsObj.append('filters[trayectorias][colegio][id][$eq]', String(colegioIdNum))

        const url = `/api/personas?${paramsObj.toString()}`
        debugLog('📤 [API /crm/colegios/[id]/contacts GET] Query alternativa:', url)

        const response = await strapiClient.get<StrapiResponse<StrapiEntity<PersonaAttributes>>>(url)

        debugLog('📥 [API /crm/colegios/[id]/contacts GET] Respuesta Strapi (alternativa):', Array.isArray(response.data) ? response.data.length : 1, 'personas encontradas')

        if (response.data) {
          contactos = Array.isArray(response.data) ? response.data : [response.data]
        }
        // Guardar meta de la respuesta alternativa
        responseMeta = response.meta || null
      }
    } catch (error: any) {
      console.error('❌ [API /crm/colegios/[id]/contacts GET] Error en estrategia principal:', error)
      // Continuar con el procesamiento aunque haya error
    }

    if (!contactos || contactos.length === 0) {
      debugLog('⚠️ [API /crm/colegios/[id]/contacts GET] No se encontraron contactos')
      return NextResponse.json({ success: true, data: [] })
    }

    // PASO 3: Transformar y normalizar trayectorias
    const contactosFiltrados = contactos.map((contacto: any) => {
      const attrs = contacto.attributes || contacto
      const trayectorias = attrs.trayectorias?.data || attrs.trayectorias || []

      // Transformar trayectorias
      const trayectoriasDelColegio = trayectorias
        .map((t: any) => {
          const tAttrs = t.attributes || t
          const colegioData = tAttrs.colegio?.data || tAttrs.colegio
          const colegioAttrs = colegioData?.attributes || colegioData
          const tColegioId = colegioData?.id
          const tColegioDocId = colegioData?.documentId

          // Verificar si esta trayectoria pertenece al colegio (ya debería estar filtrada, pero verificamos por seguridad)
          const perteneceAlColegio =
            (tColegioId && String(tColegioId) === String(colegioIdNum)) ||
            (tColegioDocId && String(tColegioDocId) === String(colegioId))

          if (!perteneceAlColegio) return null

          // Extraer datos del curso (es una relación)
          const cursoData = tAttrs.curso?.data || tAttrs.curso
          const cursoAttrs = cursoData?.attributes || cursoData

          // Extraer datos de la asignatura (es una relación)
          const asignaturaData = tAttrs.asignatura?.data || tAttrs.asignatura
          const asignaturaAttrs = asignaturaData?.attributes || asignaturaData

          // Extraer datos de la comuna del colegio
          const comunaData = colegioAttrs?.comuna?.data || colegioAttrs?.comuna
          const comunaAttrs = comunaData?.attributes || comunaData

          return {
            id: t.id || t.documentId,
            documentId: t.documentId || String(t.id || ''),

            // Datos del colegio
            colegioId: tColegioId || tColegioDocId,
            colegioNombre: colegioAttrs?.colegio_nombre || 'Sin nombre',
            colegioRBD: colegioAttrs?.rbd || '',
            colegioDependencia: colegioAttrs?.dependencia || '',
            colegioRegion: colegioAttrs?.region || '',
            colegioZona: colegioAttrs?.zona || '',

            // Datos de la comuna
            comunaId: comunaData?.id || comunaData?.documentId,
            comunaNombre: comunaAttrs?.nombre || comunaAttrs?.comuna_nombre || '',

            // Datos de la trayectoria
            cargo: tAttrs.cargo || '',
            anio: tAttrs.anio || null,

            // Datos del curso (relación)
            cursoId: cursoData?.id || cursoData?.documentId,
            cursoNombre: cursoAttrs?.nombre || '',

            // Datos de la asignatura (relación)
            asignaturaId: asignaturaData?.id || asignaturaData?.documentId,
            asignaturaNombre: asignaturaAttrs?.nombre || '',

            // Estados
            is_current: tAttrs.is_current || false,
            activo: tAttrs.activo !== undefined ? tAttrs.activo : true,

            // Fechas
            fecha_inicio: tAttrs.fecha_inicio || null,
            fecha_fin: tAttrs.fecha_fin || null,
          }
        })
        .filter(Boolean) // Eliminar nulls

      return {
        ...contacto,
        attributes: {
          ...attrs,
          trayectorias: trayectoriasDelColegio,
        },
      }
    })

    // PASO 4: Filtrar solo contactos con trayectorias en este colegio
    const contactosConTrayectorias = contactosFiltrados.filter(
      (c) => (c.attributes.trayectorias?.length || 0) > 0
    )

    debugLog('✅ [API /crm/colegios/[id]/contacts GET] Contactos filtrados con trayectorias:', contactosConTrayectorias.length)

    return NextResponse.json({
      success: true,
      data: contactosConTrayectorias,
      meta: {
        ...(responseMeta || {}),
        total: contactosConTrayectorias.length,
        colegioId,
        colegioIdNum,
      },
    }, { status: 200 })
  } catch (error: any) {
    console.error('❌ [API /crm/colegios/[id]/contacts GET] Error obteniendo contactos del colegio:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: 'Error obteniendo contactos',
        details: error instanceof Error ? error.message : 'Unknown error',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}
