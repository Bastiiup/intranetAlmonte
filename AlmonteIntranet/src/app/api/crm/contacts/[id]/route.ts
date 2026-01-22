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
  equipos?: any // Relation many-to-many con Equipos
  empresa_contactos?: any // Relation one-to-many con empresa-contacto (puede venir como array, data, o objeto)
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
    // Parámetros base (sin equipos, por si el campo no existe aún en Strapi)
    // En Strapi v5, el formato de populate anidado cambió - usar formato simplificado
    const personaParamsBase = new URLSearchParams({
      'populate[emails]': 'true',
      'populate[telefonos]': 'true',
      'populate[imagen]': 'true',
      'populate[tags]': 'true',
      'populate[trayectorias]': 'true',
    })
    // Agregar populate anidado de trayectorias usando formato Strapi v5
    personaParamsBase.append('populate[trayectorias][populate]', 'colegio')
    personaParamsBase.append('populate[trayectorias][populate]', 'curso')
    personaParamsBase.append('populate[trayectorias][populate]', 'asignatura')
    // Para populate más profundo (colegio.comuna), usar formato de objeto
    personaParamsBase.append('populate[trayectorias][populate][colegio][populate]', 'comuna')
    
    // Intentar agregar populate de empresa_contactos (puede no existir en algunos schemas)
    // En Strapi v5, el formato de populate anidado cambió
    // Usamos el formato: populate[empresa_contactos][populate][0]=empresa
    try {
      personaParamsBase.append('populate[empresa_contactos]', 'true')
      // En Strapi v5, para populate anidado usamos el formato de array
      personaParamsBase.append('populate[empresa_contactos][populate]', 'empresa')
    } catch (e) {
      // Ignorar si no se puede agregar
      console.warn('[API /crm/contacts/[id] GET] No se pudo agregar populate de empresa_contactos')
    }

    // Parámetros con equipos (intentar primero)
    // En Strapi v5, el formato de populate anidado cambió
    const personaParamsConEquipos = new URLSearchParams(personaParamsBase)
    personaParamsConEquipos.append('populate[equipos]', 'true')
    personaParamsConEquipos.append('populate[equipos][populate]', 'colegio')
    personaParamsConEquipos.append('populate[equipos][populate]', 'lider')
    personaParamsConEquipos.append('populate[equipos][populate][lider][populate]', 'imagen')

    let personaResponse: StrapiResponse<StrapiEntity<PersonaAttributes>>
    let usarEquipos = true // Flag para saber si intentar con equipos
    let usarEmpresaContactos = true // Flag para saber si intentar con empresa_contactos
    
    try {
      // Intentar primero con todos los campos
      personaResponse = await strapiClient.get<StrapiResponse<StrapiEntity<PersonaAttributes>>>(
        `/api/personas/${contactId}?${personaParamsConEquipos.toString()}`
      )
    } catch (error: any) {
      // Si el error es por campo "equipos" inválido, intentar sin equipos
      // También manejar errores 500 que pueden ocurrir con populate
      if ((error.status === 400 || error.status === 500) && (error.details?.key === 'equipos' || error.message?.includes('equipos'))) {
        console.warn('[API /crm/contacts/[id] GET] Campo equipos no existe en Persona, intentando sin equipos')
        usarEquipos = false
        try {
          personaResponse = await strapiClient.get<StrapiResponse<StrapiEntity<PersonaAttributes>>>(
            `/api/personas/${contactId}?${personaParamsBase.toString()}`
          )
        } catch (retryError: any) {
          // Si el error es por campo "empresa_contactos" inválido, intentar sin empresa_contactos
          // También manejar errores 500 que pueden ocurrir con populate
          if ((retryError.status === 400 || retryError.status === 500) && (retryError.details?.key === 'empresa_contactos' || retryError.message?.includes('empresa_contactos'))) {
            console.warn('[API /crm/contacts/[id] GET] Campo empresa_contactos no existe en Persona, intentando sin empresa_contactos')
            usarEmpresaContactos = false
            const personaParamsSinEmpresa = new URLSearchParams({
              'populate[emails]': 'true',
              'populate[telefonos]': 'true',
              'populate[imagen]': 'true',
              'populate[tags]': 'true',
              'populate[trayectorias][populate][colegio][populate][comuna]': 'true',
              'populate[trayectorias][populate][curso]': 'true',
              'populate[trayectorias][populate][asignatura]': 'true',
            })
            try {
              personaResponse = await strapiClient.get<StrapiResponse<StrapiEntity<PersonaAttributes>>>(
                `/api/personas/${contactId}?${personaParamsSinEmpresa.toString()}`
              )
            } catch (retryError2: any) {
              // Si falla con documentId, intentar buscar por id numérico
              if (retryError2.status === 404) {
                const searchParams = new URLSearchParams({
                  'filters[id][$eq]': contactId,
                  ...Object.fromEntries(personaParamsSinEmpresa.entries()),
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
                throw retryError2
              }
            }
          } else {
            // Si falla con documentId, intentar buscar por id numérico
            if (retryError.status === 404) {
              const searchParams = new URLSearchParams({
                'filters[id][$eq]': contactId,
                ...Object.fromEntries(personaParamsBase.entries()),
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
              throw retryError
            }
          }
        }
      } else if ((error.status === 400 || error.status === 500) && (error.details?.key === 'empresa_contactos' || error.message?.includes('empresa_contactos'))) {
        // Si el error es por campo "empresa_contactos" inválido o error 500, intentar sin empresa_contactos
        console.warn('[API /crm/contacts/[id] GET] Error con empresa_contactos (status:', error.status, '), intentando sin empresa_contactos')
        usarEmpresaContactos = false
        const personaParamsSinEmpresa = new URLSearchParams({
          'populate[emails]': 'true',
          'populate[telefonos]': 'true',
          'populate[imagen]': 'true',
          'populate[tags]': 'true',
          'populate[trayectorias][populate][colegio][populate][comuna]': 'true',
          'populate[trayectorias][populate][curso]': 'true',
          'populate[trayectorias][populate][asignatura]': 'true',
        })
        try {
          personaResponse = await strapiClient.get<StrapiResponse<StrapiEntity<PersonaAttributes>>>(
            `/api/personas/${contactId}?${personaParamsSinEmpresa.toString()}`
          )
        } catch (retryError: any) {
          // Si falla con documentId, intentar buscar por id numérico
          if (retryError.status === 404) {
            const searchParams = new URLSearchParams({
              'filters[id][$eq]': contactId,
              ...Object.fromEntries(personaParamsSinEmpresa.entries()),
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
            throw retryError
          }
        }
      } else if (error.status === 404) {
        // Si falla con documentId, intentar buscar por id numérico
        const searchParams = new URLSearchParams({
          'filters[id][$eq]': contactId,
          ...Object.fromEntries(personaParamsConEquipos.entries()),
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
    const personaIdNum = personaData.id || personaData.documentId

    // Validar que tenemos un ID válido
    if (!personaIdNum) {
      console.error('[API /crm/contacts/[id] GET] ❌ No se pudo obtener ID de persona:', {
        personaDataId: personaData.id,
        personaDataDocumentId: personaData.documentId,
      })
      return NextResponse.json(
        { success: false, error: 'No se pudo obtener ID válido del contacto' },
        { status: 400 }
      )
    }

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
    // Manejar diferentes formatos de trayectorias (puede venir como array, data, etc.)
    let trayectoriasArray: any[] = []
    if (personaAttrs.trayectorias) {
      if (Array.isArray(personaAttrs.trayectorias)) {
        trayectoriasArray = personaAttrs.trayectorias
      } else if ((personaAttrs.trayectorias as any).data && Array.isArray((personaAttrs.trayectorias as any).data)) {
        trayectoriasArray = (personaAttrs.trayectorias as any).data
      } else if ((personaAttrs.trayectorias as any).id || (personaAttrs.trayectorias as any).documentId) {
        trayectoriasArray = [personaAttrs.trayectorias]
      }
    }
    
    const trayectorias = trayectoriasArray
      .map((t: any) => {
        try {
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
          colegio: colegioData ? {
            id: colegioData?.id || colegioData?.documentId,
            documentId: colegioData?.documentId || String(colegioData?.id || ''),
            nombre: colegioAttrs?.colegio_nombre || '',
            rbd: colegioAttrs?.rbd || '',
            dependencia: colegioAttrs?.dependencia || '',
            region: colegioAttrs?.region || comunaAttrs?.region_nombre || '',
            comuna: comunaAttrs?.comuna_nombre || comunaAttrs?.nombre || '',
          } : null,
          curso: cursoData ? {
            id: cursoData?.id || cursoData?.documentId,
            nombre: cursoAttrs?.nombre || '',
          } : null,
          asignatura: asignaturaData ? {
            id: asignaturaData?.id || asignaturaData?.documentId,
            nombre: asignaturaAttrs?.nombre || '',
          } : null,
        }
        } catch (error: any) {
          console.warn('[API /crm/contacts/[id] GET] Error procesando trayectoria individual:', error.message, t)
          return null
        }
      })
      .filter((t: any) => t !== null) // Filtrar trayectorias que fallaron al procesar

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

    // PASO 4: Normalizar empresa_contactos (manejar casos donde puede no existir o estar vacío)
    let empresaContactosArray: any[] = []
    let empresaContactosRaw: any = null
    if (usarEmpresaContactos) {
      try {
        empresaContactosRaw = (personaAttrs as any).empresa_contactos
        console.log('[API /crm/contacts/[id] GET] 🔍 Verificando empresa_contactos en personaAttrs:', {
          tieneEmpresaContactos: !!empresaContactosRaw,
          tipo: typeof empresaContactosRaw,
          esArray: Array.isArray(empresaContactosRaw),
          tieneData: !!empresaContactosRaw?.data,
        })
        if (empresaContactosRaw) {
          if (Array.isArray(empresaContactosRaw)) {
            empresaContactosArray = empresaContactosRaw
            console.log('[API /crm/contacts/[id] GET] ✅ empresa_contactos es array directo:', empresaContactosArray.length)
          } else if (empresaContactosRaw.data && Array.isArray(empresaContactosRaw.data)) {
            empresaContactosArray = empresaContactosRaw.data
            console.log('[API /crm/contacts/[id] GET] ✅ empresa_contactos viene en .data:', empresaContactosArray.length)
          } else if (empresaContactosRaw.id || empresaContactosRaw.documentId) {
            empresaContactosArray = [empresaContactosRaw]
            console.log('[API /crm/contacts/[id] GET] ✅ empresa_contactos es objeto único')
          }
        } else {
          console.log('[API /crm/contacts/[id] GET] ⚠️ empresa_contactos es null/undefined')
        }
      } catch (error: any) {
        console.warn('[API /crm/contacts/[id] GET] Error normalizando empresa_contactos:', error.message)
        empresaContactosArray = []
      }
    }
    
    // FALLBACK: Si no se obtuvieron empresa_contactos del populate, intentar obtenerlos directamente
    if (empresaContactosArray.length === 0 && personaIdNum) {
      console.log('[API /crm/contacts/[id] GET] 🔄 Fallback: Obteniendo empresa_contactos directamente desde API')
      try {
        // Asegurar que personaIdNum sea un número para el filtro
        const personaIdNumForFilter = typeof personaIdNum === 'number' 
          ? personaIdNum 
          : (typeof personaIdNum === 'string' && /^\d+$/.test(personaIdNum) 
            ? parseInt(personaIdNum) 
            : null)
        
        if (personaIdNumForFilter) {
          const empresaContactosResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
            `/api/empresa-contactos?filters[persona][id][$eq]=${personaIdNumForFilter}&populate[empresa]=true`
          )
          
          if (empresaContactosResponse.data) {
            const empresaContactosFromApi = Array.isArray(empresaContactosResponse.data) 
              ? empresaContactosResponse.data 
              : [empresaContactosResponse.data]
            
            empresaContactosArray = empresaContactosFromApi
            console.log('[API /crm/contacts/[id] GET] ✅ Obtenidos', empresaContactosArray.length, 'empresa_contactos desde API directa')
          }
        } else {
          console.warn('[API /crm/contacts/[id] GET] ⚠️ personaIdNum no es un número válido para el fallback:', personaIdNum)
        }
      } catch (fallbackError: any) {
        console.warn('[API /crm/contacts/[id] GET] ⚠️ Error en fallback de empresa_contactos:', {
          message: fallbackError.message,
          status: fallbackError.status,
          details: fallbackError.details,
        })
        // Continuar sin empresa_contactos si el fallback falla
      }
    }
    
    const empresaContactos = empresaContactosArray
      .map((ec: any) => {
        try {
          const ecAttrs = ec.attributes || ec
          const empresaData = ecAttrs.empresa?.data || ecAttrs.empresa || ec.empresa?.data || ec.empresa
          const empresaAttrs = empresaData?.attributes || empresaData

          console.log('[API /crm/contacts/[id] GET] 🔍 Procesando empresa_contacto:', {
            ecId: ec.id || ec.documentId,
            tieneEmpresa: !!empresaData,
            empresaId: empresaData?.id || empresaData?.documentId,
            empresaNombre: empresaAttrs?.empresa_nombre || empresaAttrs?.nombre,
          })

          return {
            id: ec.id || ec.documentId,
            documentId: ec.documentId || String(ec.id || ''),
            cargo: ecAttrs.cargo || ec.cargo || '',
            empresa: {
              id: empresaData?.id || empresaData?.documentId,
              documentId: empresaData?.documentId || String(empresaData?.id || ''),
              empresa_nombre: empresaAttrs?.empresa_nombre || empresaAttrs?.nombre || '',
              nombre: empresaAttrs?.empresa_nombre || empresaAttrs?.nombre || '',
            },
          }
        } catch (error: any) {
          console.warn('[API /crm/contacts/[id] GET] Error procesando empresa_contacto individual:', error.message, ec)
          return null
        }
      })
      .filter((ec: any) => ec !== null && ec.empresa && (ec.empresa.id || ec.empresa.documentId)) // Filtrar elementos que fallaron o no tienen empresa válida

    // PASO 5: Obtener colegios únicos de las trayectorias
    const colegiosUnicos = Array.from(
      new Map(
        trayectorias
          .filter((t): t is NonNullable<typeof t> => t !== null && t !== undefined)
          .filter((t) => {
            const colegio = t.colegio
            return colegio !== null && colegio !== undefined && (colegio.id || colegio.documentId)
          })
          .map((t) => {
            const colegio = t.colegio!
            return [colegio.id || colegio.documentId, colegio]
          })
      ).values()
    )

    // PASO 5: Obtener y normalizar equipos (solo si el campo existe)
    let equipos: any[] = []
    if (usarEquipos && personaAttrs.equipos) {
      const equiposRaw = personaAttrs.equipos?.data || personaAttrs.equipos || []
      const equiposArray = Array.isArray(equiposRaw) ? equiposRaw : [equiposRaw]
      
      equipos = equiposArray
        .map((eq: any) => {
          const eqAttrs = eq.attributes || eq
          const colegioData = eqAttrs.colegio?.data || eqAttrs.colegio
          const colegioAttrs = colegioData?.attributes || colegioData
          const liderData = eqAttrs.lider?.data || eqAttrs.lider
          const liderAttrs = liderData?.attributes || liderData

          return {
            id: eq.id || eq.documentId,
            documentId: eq.documentId || String(eq.id || ''),
            nombre: eqAttrs.nombre || '',
            descripcion: eqAttrs.descripcion || '',
            activo: eqAttrs.activo !== undefined ? eqAttrs.activo : true,
            colegio: colegioData ? {
              id: colegioData.id || colegioData.documentId,
              documentId: colegioData.documentId || String(colegioData.id || ''),
              nombre: colegioAttrs?.colegio_nombre || '',
            } : null,
            lider: liderData ? {
              id: liderData.id || liderData.documentId,
              documentId: liderData.documentId || String(liderData.id || ''),
              nombre: liderAttrs?.nombre_completo || '',
            } : null,
          }
        })
        .filter((eq: any) => eq.nombre) // Solo equipos con nombre válido
    }

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
        empresa_contactos: empresaContactos,
        equipos,
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
