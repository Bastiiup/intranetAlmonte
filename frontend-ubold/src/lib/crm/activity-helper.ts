import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

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
}

/**
 * Crea una actividad automáticamente en Strapi
 * Esta función se puede llamar desde las API routes cuando se crean/actualizan entidades del CRM
 */
export async function createActivity(activityData: {
  titulo: string // Único campo requerido
  tipo?: ActividadAttributes['tipo'] // Opcional - por defecto "nota" en Strapi
  descripcion?: string
  fecha?: string // Opcional - por defecto fecha/hora actual en Strapi
  estado?: ActividadAttributes['estado'] // Opcional - por defecto "pendiente" en Strapi
  notas?: string
  relacionado_con_contacto?: string | number
  relacionado_con_lead?: string | number
  relacionado_con_oportunidad?: string | number
  relacionado_con_colegio?: string | number
  creado_por?: string | number // Opcional - ya no es requerido según cambios en Strapi
}): Promise<void> {
  try {
    // Nota: Strapi ahora establece automáticamente valores por defecto:
    // - fecha: fecha/hora actual si no se envía
    // - tipo: "nota" si no se envía
    // - estado: "pendiente" si no se envía
    // Solo necesitamos enviar los campos que queremos establecer explícitamente
    const actividadPayload: any = {
      data: {
        titulo: activityData.titulo, // Único campo realmente requerido
        // Enviar solo si queremos sobrescribir los valores por defecto
        ...(activityData.tipo && { tipo: activityData.tipo }),
        ...(activityData.descripcion && { descripcion: activityData.descripcion }),
        ...(activityData.fecha && { fecha: activityData.fecha }),
        ...(activityData.estado && { estado: activityData.estado }),
        ...(activityData.notas && { notas: activityData.notas }),
      },
    }

    // Agregar relaciones (convertir a números si es necesario)
    if (activityData.relacionado_con_contacto) {
      const contactoId = typeof activityData.relacionado_con_contacto === 'string' 
        ? parseInt(activityData.relacionado_con_contacto) 
        : activityData.relacionado_con_contacto
      if (!isNaN(contactoId) && contactoId > 0) {
        actividadPayload.data.relacionado_con_contacto = contactoId
      }
    }
    if (activityData.relacionado_con_lead) {
      const leadId = typeof activityData.relacionado_con_lead === 'string' 
        ? parseInt(activityData.relacionado_con_lead) 
        : activityData.relacionado_con_lead
      if (!isNaN(leadId) && leadId > 0) {
        actividadPayload.data.relacionado_con_lead = leadId
      }
    }
    if (activityData.relacionado_con_oportunidad) {
      const oportunidadId = typeof activityData.relacionado_con_oportunidad === 'string' 
        ? parseInt(activityData.relacionado_con_oportunidad) 
        : activityData.relacionado_con_oportunidad
      if (!isNaN(oportunidadId) && oportunidadId > 0) {
        actividadPayload.data.relacionado_con_oportunidad = oportunidadId
      }
    }
    if (activityData.relacionado_con_colegio) {
      const colegioId = typeof activityData.relacionado_con_colegio === 'string' 
        ? parseInt(activityData.relacionado_con_colegio) 
        : activityData.relacionado_con_colegio
      if (!isNaN(colegioId) && colegioId > 0) {
        actividadPayload.data.relacionado_con_colegio = colegioId
      }
    }
    
    // creado_por es opcional - solo agregar si es válido
    if (activityData.creado_por) {
      const creadoPorId = typeof activityData.creado_por === 'string' 
        ? parseInt(activityData.creado_por) 
        : activityData.creado_por
      if (!isNaN(creadoPorId) && creadoPorId > 0) {
        actividadPayload.data.creado_por = creadoPorId
      } else {
        console.warn('[Activity Helper] ⚠️ ID de creado_por inválido, omitiendo:', activityData.creado_por)
      }
    }
    // Nota: creado_por ya NO es requerido según los cambios en Strapi

    console.log('[Activity Helper] 📝 Intentando crear actividad:', {
      titulo: activityData.titulo,
      tipo: activityData.tipo,
      payload: JSON.stringify(actividadPayload, null, 2),
    })

    // Usar el endpoint correcto: /api/actividades (confirmado por el usuario)
    // Nota: draftAndPublish está deshabilitado, así que las actividades se guardan directamente
    // No necesitamos publicar manualmente
    const response = await strapiClient.post<StrapiResponse<StrapiEntity<ActividadAttributes>>>(
      '/api/actividades',
      actividadPayload
    )

    console.log('[Activity Helper] ✅ Actividad creada automáticamente:', {
      titulo: activityData.titulo,
      response: response.data ? 'OK' : 'Sin datos',
      responseData: response.data,
    })
  } catch (error: any) {
    // No lanzar error para no interrumpir el flujo principal, pero loguear bien
    console.error('[Activity Helper] ⚠️ Error al crear actividad automática:', {
      message: error.message,
      status: error.status,
      statusText: error.statusText,
      titulo: activityData.titulo,
      tipo: activityData.tipo,
      errorDetails: error.details || error,
      stack: error.stack,
    })
    
    // Detectar tipos específicos de errores
    if (error.status === 404 || error.message?.includes('Not Found')) {
      console.error('[Activity Helper] ❌ El content-type "Actividad" no existe en Strapi o el endpoint es incorrecto.')
      console.error('[Activity Helper] Verifica que el content-type esté creado y el endpoint sea /api/actividades')
    } else if (error.status === 403 || error.message?.includes('Forbidden')) {
      console.error('[Activity Helper] ❌ Error de permisos (403 Forbidden)')
      console.error('[Activity Helper] Verifica que los permisos estén configurados en Strapi:')
      console.error('[Activity Helper] Settings → Users & Permissions → Roles → [Tu Rol] → Actividad')
      console.error('[Activity Helper] Debe tener habilitado: find, findOne, create, update, delete')
    } else if (error.status === 400) {
      console.error('[Activity Helper] ❌ Error de validación (400 Bad Request)')
      if (error.details?.errors) {
        console.error('[Activity Helper] Errores de validación:', JSON.stringify(error.details.errors, null, 2))
      }
    }
  }
}

/**
 * Obtiene el ID del colaborador desde las cookies del request
 */
export async function getColaboradorIdFromRequest(request: Request): Promise<string | number | null> {
  try {
    // Intentar obtener de las cookies
    const cookieHeader = request.headers.get('cookie')
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=')
        acc[key] = value
        return acc
      }, {} as Record<string, string>)

      // Buscar en diferentes cookies posibles
      const colaboradorStr = cookies['auth_colaborador'] || cookies['colaboradorData']
      if (colaboradorStr) {
        try {
          const colaborador = JSON.parse(decodeURIComponent(colaboradorStr))
          return colaborador.id || colaborador.documentId || null
        } catch (e) {
          // Ignorar errores de parsing
        }
      }
    }
    return null
  } catch (error) {
    console.error('[Activity Helper] Error al obtener colaborador de cookies:', error)
    return null
  }
}
