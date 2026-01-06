import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

interface ActividadAttributes {
  tipo?: 'llamada' | 'email' | 'reunion' | 'nota' | 'cambio_estado' | 'tarea' | 'recordatorio' | 'otro'
  titulo?: string
  descripcion?: string
  fecha?: string
  estado?: 'completada' | 'pendiente' | 'cancelada' | 'en_progreso'
  notas?: string
  relacionado_con_contacto?: any
  relacionado_con_lead?: any
  relacionado_con_oportunidad?: any
  relacionado_con_colegio?: any
  creado_por?: any
  createdAt?: string
  updatedAt?: string
}

/**
 * GET /api/crm/activities
 * Obtiene todas las actividades con filtros y paginación
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')
    const search = searchParams.get('search') || ''
    const tipo = searchParams.get('tipo') || ''
    const estado = searchParams.get('estado') || ''
    const relacionado_con = searchParams.get('relacionado_con') || '' // 'contacto', 'lead', 'oportunidad', 'colegio'
    const relacionado_id = searchParams.get('relacionado_id') || ''

    // Construir query params para Strapi
    // Nota: draftAndPublish está deshabilitado, así que no necesitamos publicationState
    const params = new URLSearchParams({
      'pagination[page]': page.toString(),
      'pagination[pageSize]': pageSize.toString(),
      'sort[0]': 'fecha:desc',
      'populate[creado_por]': 'true',
      'populate[relacionado_con_contacto]': 'true',
      'populate[relacionado_con_lead]': 'true',
      'populate[relacionado_con_oportunidad]': 'true',
      'populate[relacionado_con_colegio]': 'true',
    })

    // Filtros
    if (tipo) {
      params.append('filters[tipo][$eq]', tipo)
    }
    if (estado) {
      params.append('filters[estado][$eq]', estado)
    }

    // Filtro por relación
    if (relacionado_con && relacionado_id) {
      const relationField = `relacionado_con_${relacionado_con}`
      params.append(`filters[${relationField}][id][$eq]`, relacionado_id)
    }

    // Búsqueda por título o descripción
    if (search) {
      params.append('filters[$or][0][titulo][$containsi]', search)
      params.append('filters[$or][1][descripcion][$containsi]', search)
    }

    // Endpoint correcto: /api/actividades (plural con "es")
    const response = await strapiClient.get<StrapiResponse<StrapiEntity<ActividadAttributes>[]>>(
      `/api/actividades?${params.toString()}`
    )

    const activitiesData = response.data || []
    const pagination = response.meta?.pagination || {
      page: 1,
      pageSize: 50,
      total: 0,
      pageCount: 0,
    }

    console.log('[API /crm/activities] ✅ Actividades obtenidas:', {
      count: Array.isArray(activitiesData) ? activitiesData.length : activitiesData ? 1 : 0,
      total: pagination.total,
    })

    return NextResponse.json({
      success: true,
      data: activitiesData,
      meta: {
        pagination,
      },
    })
  } catch (error: any) {
    console.error('[API /crm/activities] Error al obtener actividades:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })

    // Detectar si Strapi está caído
    if (error.status === 502 || error.message?.includes('Bad Gateway')) {
      return NextResponse.json(
        {
          success: false,
          error: 'El servidor de Strapi no responde (Bad Gateway). Por favor, verifica que Strapi esté funcionando.',
          details: error.details || {},
          status: 502,
        },
        { status: 502 }
      )
    }

    // Detectar tipos específicos de errores
    if (error.status === 404 || error.message?.includes('Not Found')) {
      console.error('[API /crm/activities] ❌ Content-type "Actividad" no existe en Strapi o el endpoint es incorrecto')
      console.error('[API /crm/activities] Verifica que el content-type esté creado con el nombre "actividad"')
      console.error('[API /crm/activities] Endpoint esperado: /api/actividades')
      return NextResponse.json(
        {
          success: false,
          data: [],
          meta: {
            pagination: {
              page: 1,
              pageSize: 50,
              total: 0,
              pageCount: 0,
            },
          },
          message: 'El content-type "Actividad" no existe en Strapi. Necesitas crearlo primero usando el prompt en PROMPT-CURSOR-CREAR-ACTIVIDADES-Y-CAMPAÑAS-STRAPI.md',
          error: 'Content-type no encontrado',
        },
        { status: 404 }
      )
    }
    
    // Error de permisos
    if (error.status === 403 || error.message?.includes('Forbidden')) {
      console.error('[API /crm/activities] ❌ Error de permisos (403 Forbidden)')
      console.error('[API /crm/activities] Verifica que los permisos estén configurados en Strapi:')
      console.error('[API /crm/activities] Settings → Users & Permissions → Roles → [Tu Rol] → Actividad')
      console.error('[API /crm/activities] Debe tener habilitado: find, findOne, create, update, delete')
      return NextResponse.json(
        {
          success: false,
          data: [],
          meta: {
            pagination: {
              page: 1,
              pageSize: 50,
              total: 0,
              pageCount: 0,
            },
          },
          message: 'Error de permisos. Verifica que el rol tenga permisos para "Actividad" en Strapi Admin.',
          error: 'Permisos insuficientes',
        },
        { status: 403 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener actividades',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * POST /api/crm/activities
 * Crea una nueva actividad
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validaciones básicas
    // Nota: Según cambios en Strapi, solo titulo es requerido
    // fecha, tipo y estado tienen valores por defecto automáticos
    if (!body.titulo || !body.titulo.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'El título de la actividad es obligatorio',
        },
        { status: 400 }
      )
    }

    // Preparar datos para Strapi
    // Solo enviar campos que queremos establecer explícitamente
    // Strapi establecerá automáticamente: fecha (actual), tipo ("nota"), estado ("pendiente")
    const actividadData: any = {
      data: {
        titulo: body.titulo.trim(),
        // Enviar solo si queremos sobrescribir los valores por defecto
        ...(body.tipo && { tipo: body.tipo }),
        ...(body.descripcion && { descripcion: body.descripcion.trim() }),
        ...(body.fecha && { fecha: body.fecha }),
        ...(body.estado && { estado: body.estado }),
        ...(body.notas && { notas: body.notas.trim() }),
      },
    }

    // Relaciones - convertir a números si es necesario y validar
    if (body.relacionado_con_contacto) {
      const contactoId = typeof body.relacionado_con_contacto === 'string' 
        ? parseInt(body.relacionado_con_contacto) 
        : body.relacionado_con_contacto
      if (!isNaN(contactoId) && contactoId > 0) {
        actividadData.data.relacionado_con_contacto = contactoId
      }
    }
    if (body.relacionado_con_lead) {
      const leadId = typeof body.relacionado_con_lead === 'string' 
        ? parseInt(body.relacionado_con_lead) 
        : body.relacionado_con_lead
      if (!isNaN(leadId) && leadId > 0) {
        actividadData.data.relacionado_con_lead = leadId
      }
    }
    if (body.relacionado_con_oportunidad) {
      const oportunidadId = typeof body.relacionado_con_oportunidad === 'string' 
        ? parseInt(body.relacionado_con_oportunidad) 
        : body.relacionado_con_oportunidad
      if (!isNaN(oportunidadId) && oportunidadId > 0) {
        actividadData.data.relacionado_con_oportunidad = oportunidadId
      }
    }
    if (body.relacionado_con_colegio) {
      const colegioId = typeof body.relacionado_con_colegio === 'string' 
        ? parseInt(body.relacionado_con_colegio) 
        : body.relacionado_con_colegio
      if (!isNaN(colegioId) && colegioId > 0) {
        actividadData.data.relacionado_con_colegio = colegioId
      }
    }
    // creado_por es opcional - solo agregar si es válido
    if (body.creado_por) {
      const creadoPorId = typeof body.creado_por === 'string' 
        ? parseInt(body.creado_por) 
        : body.creado_por
      if (!isNaN(creadoPorId) && creadoPorId > 0) {
        actividadData.data.creado_por = creadoPorId
      }
    }

    const response = await strapiClient.post<StrapiResponse<StrapiEntity<ActividadAttributes>>>(
      '/api/actividades',
      actividadData
    )

    // Revalidar cache
    revalidatePath('/crm/activities')
    revalidateTag('activities', 'max')

    return NextResponse.json({
      success: true,
      data: response.data,
      message: 'Actividad creada exitosamente',
    }, { status: 201 })
  } catch (error: any) {
    console.error('[API /crm/activities] Error al crear actividad:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })

    // Detectar tipos específicos de errores
    if (error.status === 404 || error.message?.includes('Not Found')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Content-type "Actividad" no encontrado en Strapi. Verifica que esté creado correctamente.',
          details: error.details || {},
        },
        { status: 404 }
      )
    }

    if (error.status === 403 || error.message?.includes('Forbidden')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Permisos insuficientes. Verificar configuración en Strapi Admin → Settings → Users & Permissions',
          details: error.details || {},
        },
        { status: 403 }
      )
    }

    if (error.status === 400 || error.message?.includes('ValidationError')) {
      // Extraer mensaje de validación más descriptivo
      let errorMessage = 'Error de validación al crear actividad'
      if (error.details?.errors && Array.isArray(error.details.errors)) {
        const firstError = error.details.errors[0]
        if (firstError.message) {
          errorMessage = firstError.message
        }
      }
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          details: error.details || {},
        },
        { status: 400 }
      )
    }

    if (error.status === 502 || error.message?.includes('Bad Gateway')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Strapi no está disponible. Por favor, verifica que Strapi esté funcionando.',
          details: error.details || {},
        },
        { status: 502 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al crear actividad',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}
