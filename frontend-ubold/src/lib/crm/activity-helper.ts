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
    // IMPORTANTE: fecha es requerida por Strapi - siempre enviarla
    // Si no se proporciona, usar fecha/hora actual
    const fecha = activityData.fecha || new Date().toISOString()
    
    // Valores por defecto si no se proporcionan
    const tipo = activityData.tipo || 'nota'
    const estado = activityData.estado || 'pendiente'
    
    const actividadPayload: any = {
      data: {
        titulo: activityData.titulo, // Campo requerido
        fecha: fecha, // SIEMPRE enviar fecha (requerida por Strapi)
        tipo: tipo, // Valor por defecto si no se proporciona
        estado: estado, // Valor por defecto si no se proporciona
        // Campos opcionales
        ...(activityData.descripcion && { descripcion: activityData.descripcion }),
        ...(activityData.notas && { notas: activityData.notas }),
      },
    }

    // Agregar relaciones - formato correcto: solo el ID numérico (no {connect: [...]} ni {set: [...]})
    // Strapi v5 acepta directamente el ID numérico para relaciones Many-to-One
    if (activityData.relacionado_con_contacto) {
      const contactoId = typeof activityData.relacionado_con_contacto === 'string' 
        ? parseInt(activityData.relacionado_con_contacto) 
        : activityData.relacionado_con_contacto
      if (!isNaN(contactoId) && contactoId > 0) {
        // Formato correcto: solo el ID numérico
        actividadPayload.data.relacionado_con_contacto = contactoId
      }
    }
    if (activityData.relacionado_con_lead) {
      const leadId = typeof activityData.relacionado_con_lead === 'string' 
        ? parseInt(activityData.relacionado_con_lead) 
        : activityData.relacionado_con_lead
      if (!isNaN(leadId) && leadId > 0) {
        // Formato correcto: solo el ID numérico
        actividadPayload.data.relacionado_con_lead = leadId
      }
    }
    if (activityData.relacionado_con_oportunidad) {
      const oportunidadId = typeof activityData.relacionado_con_oportunidad === 'string' 
        ? parseInt(activityData.relacionado_con_oportunidad) 
        : activityData.relacionado_con_oportunidad
      if (!isNaN(oportunidadId) && oportunidadId > 0) {
        // Formato correcto: solo el ID numérico
        actividadPayload.data.relacionado_con_oportunidad = oportunidadId
      }
    }
    if (activityData.relacionado_con_colegio) {
      const colegioId = typeof activityData.relacionado_con_colegio === 'string' 
        ? parseInt(activityData.relacionado_con_colegio) 
        : activityData.relacionado_con_colegio
      if (!isNaN(colegioId) && colegioId > 0) {
        // Formato correcto: solo el ID numérico
        actividadPayload.data.relacionado_con_colegio = colegioId
      }
    }
    
    // creado_por es opcional - solo agregar si es válido
    // IMPORTANTE: Si el colaborador no existe en Strapi, esto causará un error 400
    // Por seguridad, solo agregar si el ID es válido, pero si falla, el error será capturado
    // y no interrumpirá el flujo principal (la creación del lead/oportunidad)
    if (activityData.creado_por) {
      const creadoPorId = typeof activityData.creado_por === 'string' 
        ? parseInt(activityData.creado_por) 
        : activityData.creado_por
      if (!isNaN(creadoPorId) && creadoPorId > 0) {
        // Formato correcto: solo el ID numérico
        // Strapi puede transformarlo internamente a {"set":[{"id":X}]}, pero eso es normal
        actividadPayload.data.creado_por = creadoPorId
      } else {
        console.warn('[Activity Helper] ⚠️ ID de creado_por inválido, omitiendo:', activityData.creado_por)
      }
    }
    // Nota: creado_por es opcional según los cambios en Strapi
    // Si no se proporciona o es inválido, la actividad se creará sin creado_por

    // Asegurarse de que NO se envíe publishedAt (draftAndPublish está deshabilitado)
    // Limpiar cualquier campo que no deba enviarse - hacerlo antes de enviar
    if (actividadPayload.data.publishedAt !== undefined) {
      delete actividadPayload.data.publishedAt
    }
    if (actividadPayload.publishedAt !== undefined) {
      delete actividadPayload.publishedAt
    }
    // También limpiar cualquier campo relacionado con publicación
    if (actividadPayload.data.published !== undefined) {
      delete actividadPayload.data.published
    }

    // Log del payload final (sin campos sensibles)
    const payloadParaLog = JSON.parse(JSON.stringify(actividadPayload))
    // Asegurarse de que no tenga publishedAt en el log
    if (payloadParaLog.data) {
      delete payloadParaLog.data.publishedAt
      delete payloadParaLog.data.published
    }

    console.log('[Activity Helper] 📝 Intentando crear actividad:', {
      titulo: activityData.titulo,
      tipo: tipo,
      fecha: fecha,
      estado: estado,
      tieneCreadoPor: !!actividadPayload.data.creado_por,
      creadoPorId: actividadPayload.data.creado_por || 'NO SE ENVÍA',
      payload: JSON.stringify(payloadParaLog, null, 2),
    })

    // Usar el endpoint correcto: /api/actividades
    // Nota: draftAndPublish está deshabilitado, así que las actividades se guardan directamente
    // No necesitamos publicar manualmente y NO debemos enviar publishedAt
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
        
        // Detectar si el error es por colaborador que no existe
        const errorMessage = error.message || ''
        if (errorMessage.includes('colaborador') && errorMessage.includes('do not exist')) {
          console.warn('[Activity Helper] ⚠️ El colaborador especificado no existe en Strapi')
          console.warn('[Activity Helper] ⚠️ La actividad se creará sin creado_por en el próximo intento')
          console.warn('[Activity Helper] ⚠️ Para evitar este error, verifica que el colaborador con ID existe antes de crear la actividad')
        }
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
