import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
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
    cargo?: string
    is_current?: boolean
    colegio?: {
      colegio_nombre?: string
      dependencia?: string
      zona?: string
      telefonos?: Array<{ telefono_norm?: string; telefono_raw?: string; numero?: string }>
      emails?: Array<{ email?: string }>
      website?: string
      comuna?: {
        comuna_nombre?: string
        region_nombre?: string
        zona?: string
      }
      cartera_asignaciones?: Array<{
        is_current?: boolean
        rol?: string
        estado?: string
        prioridad?: 'alta' | 'media' | 'baja'
        ejecutivo?: {
          nombre_completo?: string
        }
      }>
    }
  }>
}

/**
 * GET /api/crm/contacts
 * Obtiene el listado de contactos (personas) desde Strapi con búsqueda y filtros
 * 
 * Query params:
 * - page: Número de página (default: 1)
 * - pageSize: Tamaño de página (default: 50)
 * - search: Búsqueda por nombre_completo, email o rut
 * - origin: Filtro por origen (mineduc, csv, manual, crm, web, otro)
 * - confidence: Filtro por nivel_confianza (baja, media, alta)
 */
export async function GET(request: Request) {
  // Importar configuración de Strapi
  const { STRAPI_API_TOKEN } = await import('@/lib/strapi/config')
  
  try {
    // Validar que el token esté configurado
    if (!STRAPI_API_TOKEN) {
      console.error('[API /crm/contacts] ❌ STRAPI_API_TOKEN no está configurado')
      return NextResponse.json(
        {
          success: false,
          error: 'Token de Strapi no configurado. Verifica tu archivo .env.local',
          details: {
            hint: 'Asegúrate de tener STRAPI_API_TOKEN_LOCAL o STRAPI_API_TOKEN configurado en .env.local',
          },
        },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') || '1'
    const pageSize = searchParams.get('pageSize') || '50'
    const search = searchParams.get('search') || ''
    const origin = searchParams.get('origin') || ''
    const confidence = searchParams.get('confidence') || ''
    const tipo = searchParams.get('tipo') || '' // 'colegio' o 'empresa'

    // Construir parámetros de query
    const params = new URLSearchParams({
      'pagination[page]': page,
      'pagination[pageSize]': pageSize,
      'sort[0]': 'updatedAt:desc',
    })

    // Populate para relaciones (Strapi v4 syntax)
    // Nivel 1: Datos básicos de la persona
    params.append('populate[emails]', 'true')
    params.append('populate[telefonos]', 'true')
    params.append('populate[imagen]', 'true')
    params.append('populate[tags]', 'true')
    
    // Nivel 2: Trayectorias con populate completo del colegio
    // ⚠️ IMPORTANTE: Necesitamos traer todos los datos del colegio para mostrar en la tabla
    params.append('populate[trayectorias]', 'true')
    params.append('populate[trayectorias][populate][colegio]', 'true')
    params.append('populate[trayectorias][populate][colegio][populate][comuna]', 'true')
    params.append('populate[trayectorias][populate][colegio][populate][telefonos]', 'true')
    params.append('populate[trayectorias][populate][colegio][populate][emails]', 'true')
    params.append('populate[trayectorias][populate][colegio][populate][direcciones]', 'true')
    // Nota: website es un campo directo, se trae automáticamente con populate[colegio]

    // Filtros - Remover filtro de activo si causa problemas
    // params.append('filters[activo][$eq]', 'true')

    // Búsqueda
    if (search) {
      // Intentar primero como RUT (formato exacto)
      if (search.match(/^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/)) {
        params.append('filters[rut][$eq]', search)
      } else {
        // Si no es RUT, buscar por nombre completo o email
        params.append('filters[$or][0][nombre_completo][$containsi]', search)
        params.append('filters[$or][1][emails][email][$containsi]', search)
        params.append('filters[$or][2][rut][$containsi]', search)
      }
    }

    // Filtro por origen
    if (origin) {
      params.append('filters[origen][$eq]', origin)
    }

    // Filtro por nivel de confianza
    if (confidence) {
      params.append('filters[nivel_confianza][$eq]', confidence)
    }

    // Filtro por tipo: colegio o empresa
    if (tipo === 'colegio') {
      // Filtrar personas que tienen trayectorias con colegio
      params.append('filters[trayectorias][colegio][$notNull]', 'true')
    } else if (tipo === 'empresa') {
      // Filtrar personas que tienen relaciones con empresas a través de empresa-contactos
      // Esto requiere una consulta más compleja, por ahora usamos populate y filtramos después
      params.append('populate[empresa_contactos]', 'true')
      params.append('populate[empresa_contactos][populate][empresa]', 'true')
    }

    const url = `/api/personas?${params.toString()}`
    
    try {
      const response = await strapiClient.get<StrapiResponse<StrapiEntity<PersonaAttributes>>>(url)

      // Filtrar por tipo empresa si es necesario (ya que Strapi no puede filtrar directamente por relaciones many-to-many)
      let filteredData = response.data
      if (tipo === 'empresa') {
        const dataArray = Array.isArray(response.data) ? response.data : [response.data]
        filteredData = dataArray.filter((persona: any) => {
          const attrs = persona.attributes || persona
          // Verificar si tiene empresa_contactos con al menos una empresa
          const empresaContactos = attrs.empresa_contactos || []
          if (Array.isArray(empresaContactos)) {
            return empresaContactos.length > 0
          }
          // Si viene como objeto con data
          if (empresaContactos.data && Array.isArray(empresaContactos.data)) {
            return empresaContactos.data.length > 0
          }
          return false
        })
      } else if (tipo === 'colegio') {
        // Asegurar que solo incluimos personas con trayectorias que tengan colegio
        const dataArray = Array.isArray(response.data) ? response.data : [response.data]
        filteredData = dataArray.filter((persona: any) => {
          const attrs = persona.attributes || persona
          const trayectorias = attrs.trayectorias || []
          const trayectoriasArray = Array.isArray(trayectorias) ? trayectorias : (trayectorias.data || [])
          return trayectoriasArray.some((t: any) => {
            const tAttrs = t.attributes || t
            return tAttrs.colegio || t.colegio
          })
        })
      }

      return NextResponse.json({
        success: true,
        data: filteredData,
        meta: {
          ...response.meta,
          pagination: {
            ...response.meta?.pagination,
            total: Array.isArray(filteredData) ? filteredData.length : (filteredData ? 1 : 0),
          },
        },
      }, { status: 200 })
    } catch (strapiError: any) {
      // Manejar errores de autenticación
      if (strapiError.status === 401 || strapiError.status === 403) {
        console.error('[API /crm/contacts] ❌ Error de autenticación:', {
          status: strapiError.status,
          message: strapiError.message,
          tieneToken: !!STRAPI_API_TOKEN,
        })
        return NextResponse.json(
          {
            success: false,
            error: 'Error de autenticación con Strapi. Verifica tu token en .env.local',
            details: {
              status: strapiError.status,
              hint: 'Asegúrate de tener STRAPI_API_TOKEN_LOCAL configurado en .env.local si usas Strapi local',
            },
          },
          { status: 401 }
        )
      }
      
      // Si falla con populate anidado, intentar con populate más simple
      if (strapiError.status === 500 || strapiError.status === 400) {
        console.warn('[API /crm/contacts] Error con populate completo, intentando populate simplificado')
        
        // Simplificar populate
        const simpleParams = new URLSearchParams({
          'pagination[page]': page,
          'pagination[pageSize]': pageSize,
          'sort[0]': 'updatedAt:desc',
        })
        
        simpleParams.append('populate[emails]', 'true')
        simpleParams.append('populate[telefonos]', 'true')
        simpleParams.append('populate[imagen]', 'true')
        simpleParams.append('populate[trayectorias][populate][colegio]', 'true')
        
        // Agregar filtros
        if (search) {
          if (search.match(/^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/)) {
            simpleParams.append('filters[rut][$eq]', search)
          } else {
            simpleParams.append('filters[$or][0][nombre_completo][$containsi]', search)
            simpleParams.append('filters[$or][1][emails][email][$containsi]', search)
            simpleParams.append('filters[$or][2][rut][$containsi]', search)
          }
        }
        
        if (origin) {
          simpleParams.append('filters[origen][$eq]', origin)
        }
        
        if (confidence) {
          simpleParams.append('filters[nivel_confianza][$eq]', confidence)
        }
        
        try {
          const simpleResponse = await strapiClient.get<StrapiResponse<StrapiEntity<PersonaAttributes>>>(
            `/api/personas?${simpleParams.toString()}`
          )
          
          return NextResponse.json({
            success: true,
            data: simpleResponse.data,
            meta: simpleResponse.meta,
          }, { status: 200 })
        } catch (retryError: any) {
          throw strapiError // Lanzar el error original si el retry también falla
        }
      }
      throw strapiError
    }
  } catch (error: any) {
    console.error('[API /crm/contacts] Error al obtener contactos:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener contactos',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * POST /api/crm/contacts
 * Crea un nuevo contacto (persona)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validaciones básicas
    if (!body.nombres || !body.nombres.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'El nombre es obligatorio',
        },
        { status: 400 }
      )
    }

    // Generar nombre_completo si no se proporciona
    const nombres = body.nombres.trim()
    const primerApellido = body.primer_apellido?.trim() || ''
    const segundoApellido = body.segundo_apellido?.trim() || ''
    const nombreCompleto = body.nombre_completo?.trim() || 
      [nombres, primerApellido, segundoApellido].filter(Boolean).join(' ').trim()

    // Preparar datos para Strapi
    const personaData: any = {
      data: {
        nombres: nombres,
        ...(primerApellido && { primer_apellido: primerApellido }),
        ...(segundoApellido && { segundo_apellido: segundoApellido }),
        ...(nombreCompleto && { nombre_completo: nombreCompleto }),
        ...(body.rut && { rut: body.rut.trim() }),
        ...(body.genero && { genero: body.genero }),
        ...(body.cumpleagno && { cumpleagno: body.cumpleagno }),
        activo: body.activo !== undefined ? body.activo : true,
        nivel_confianza: body.nivel_confianza || 'media',
        origen: body.origen || 'manual',
      },
    }

    // Agregar emails si existen
    if (body.emails && Array.isArray(body.emails) && body.emails.length > 0) {
      personaData.data.emails = body.emails.map((emailItem: any, index: number) => {
        // Manejar tanto string como objeto
        const emailValue = typeof emailItem === 'string' ? emailItem : emailItem.email || ''
        return {
          email: typeof emailValue === 'string' ? emailValue.trim() : String(emailValue).trim(),
          principal: typeof emailItem === 'object' && emailItem.principal !== undefined ? emailItem.principal : index === 0,
        }
      })
    }

    // Agregar telefonos si existen
    if (body.telefonos && Array.isArray(body.telefonos) && body.telefonos.length > 0) {
      personaData.data.telefonos = body.telefonos.map((telefonoItem: any, index: number) => {
        // Manejar tanto string como objeto
        const telefonoValue = typeof telefonoItem === 'string' 
          ? telefonoItem 
          : telefonoItem.telefono_raw || telefonoItem.telefono || telefonoItem.numero || ''
        return {
          telefono_raw: typeof telefonoValue === 'string' ? telefonoValue.trim() : String(telefonoValue).trim(),
          principal: typeof telefonoItem === 'object' && telefonoItem.principal !== undefined ? telefonoItem.principal : index === 0,
        }
      })
    }

    const response = await strapiClient.post<StrapiResponse<StrapiEntity<PersonaAttributes>>>(
      '/api/personas',
      personaData
    )

    // Obtener el ID de la persona creada
    const personaResponseData = response.data as any
    const personaDocumentId = personaResponseData?.documentId
    const personaIdNum = personaResponseData?.id

    console.log('[API /crm/contacts POST] Persona creada:', {
      documentId: personaDocumentId,
      id: personaIdNum,
      data: personaResponseData,
    })

    // Si se proporcionó una trayectoria, crearla
    if (body.trayectoria && body.trayectoria.colegio) {
      try {
        // PASO 1: Obtener el ID numérico de la persona (necesario para connect)
        let personaIdParaTrayectoria: number | null = null
        
        if (personaIdNum && typeof personaIdNum === 'number') {
          personaIdParaTrayectoria = personaIdNum
        } else if (personaDocumentId) {
          // Si solo tenemos documentId, necesitamos obtener el id numérico
          try {
            const personaGetResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
              `/api/personas/${personaDocumentId}?fields[0]=id`
            )
            const personaData = Array.isArray(personaGetResponse.data) 
              ? personaGetResponse.data[0] 
              : personaGetResponse.data
            if (personaData && typeof personaData === 'object' && 'id' in personaData) {
              personaIdParaTrayectoria = personaData.id as number
              console.log('[API /crm/contacts POST] ✅ ID numérico obtenido desde documentId:', personaIdParaTrayectoria)
            }
          } catch (err: any) {
            console.error('[API /crm/contacts POST] ❌ Error obteniendo ID numérico de persona:', err)
          }
        }

        // PASO 2: Validar y convertir ID del colegio
        let colegioId = body.trayectoria.colegio
        const colegioIdNum = typeof colegioId === 'string' 
          ? (colegioId.trim() === '' ? null : parseInt(colegioId.trim()))
          : colegioId
        
        // Validar que ambos IDs sean válidos
        if (!personaIdParaTrayectoria || personaIdParaTrayectoria === 0) {
          console.warn('[API /crm/contacts POST] ⚠️ ID de persona inválido, omitiendo creación de trayectoria:', {
            personaDocumentId,
            personaIdNum,
            personaIdParaTrayectoria,
          })
        } else if (!colegioIdNum || colegioIdNum === 0 || isNaN(colegioIdNum)) {
          console.warn('[API /crm/contacts POST] ⚠️ ID de colegio inválido, omitiendo creación de trayectoria:', {
            colegioIdOriginal: body.trayectoria.colegio,
            colegioIdNum,
            cargo: body.trayectoria.cargo,
          })
        } else {
          console.log('[API /crm/contacts POST] Creando trayectoria:', {
            personaId: personaIdParaTrayectoria,
            colegioId: colegioIdNum,
            cargo: body.trayectoria.cargo,
          })
          
          const trayectoriaData = {
            data: {
              persona: { connect: [personaIdParaTrayectoria] },
              colegio: { connect: [colegioIdNum] },
              cargo: body.trayectoria.cargo || null,
              is_current: body.trayectoria.is_current !== undefined ? body.trayectoria.is_current : true,
              activo: true,
            },
          }
          
          // ⚠️ IMPORTANTE: El content type en Strapi es "persona-trayectorias"
          const trayectoriaResponse = await strapiClient.post('/api/persona-trayectorias', trayectoriaData)
          console.log('[API /crm/contacts POST] ✅ Trayectoria creada exitosamente:', trayectoriaResponse)
        }
      } catch (trayectoriaError: any) {
        console.error('[API /crm/contacts POST] ❌ Error al crear trayectoria:', {
          message: trayectoriaError.message,
          status: trayectoriaError.status,
          details: trayectoriaError.details,
          response: trayectoriaError.response,
        })
        // No fallar si la trayectoria no se puede crear, solo loguear
        // El contacto ya fue creado exitosamente
      }
    }

    // Revalidar para sincronización bidireccional
    revalidatePath('/crm/personas')
    revalidatePath('/crm/personas/[id]', 'page')
    revalidatePath('/crm/contacts')
    revalidateTag('personas', 'max')
    revalidateTag('contacts', 'max')

    return NextResponse.json({
      success: true,
      data: response.data,
      message: 'Contacto creado exitosamente',
    }, { status: 201 })
  } catch (error: any) {
    console.error('[API /crm/contacts POST] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al crear contacto',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

