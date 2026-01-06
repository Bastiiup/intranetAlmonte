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
  tipo: ActividadAttributes['tipo']
  titulo: string
  descripcion?: string
  relacionado_con_contacto?: string | number
  relacionado_con_lead?: string | number
  relacionado_con_oportunidad?: string | number
  relacionado_con_colegio?: string | number
  creado_por?: string | number
  estado?: ActividadAttributes['estado']
  notas?: string
}): Promise<void> {
  try {
    const actividadPayload: any = {
      data: {
        tipo: activityData.tipo || 'nota',
        titulo: activityData.titulo,
        descripcion: activityData.descripcion || null,
        fecha: new Date().toISOString(),
        estado: activityData.estado || 'completada',
        notas: activityData.notas || null,
      },
    }

    // Agregar relaciones
    if (activityData.relacionado_con_contacto) {
      actividadPayload.data.relacionado_con_contacto = activityData.relacionado_con_contacto
    }
    if (activityData.relacionado_con_lead) {
      actividadPayload.data.relacionado_con_lead = activityData.relacionado_con_lead
    }
    if (activityData.relacionado_con_oportunidad) {
      actividadPayload.data.relacionado_con_oportunidad = activityData.relacionado_con_oportunidad
    }
    if (activityData.relacionado_con_colegio) {
      actividadPayload.data.relacionado_con_colegio = activityData.relacionado_con_colegio
    }
    if (activityData.creado_por) {
      actividadPayload.data.creado_por = activityData.creado_por
    }

    console.log('[Activity Helper] 📝 Intentando crear actividad:', {
      titulo: activityData.titulo,
      tipo: activityData.tipo,
      payload: JSON.stringify(actividadPayload, null, 2),
    })

    // Intentar primero con "actividades" (plural español)
    // Si falla, intentar con "actividads" (plural que Strapi puede generar)
    let response: any
    try {
      response = await strapiClient.post<StrapiResponse<StrapiEntity<ActividadAttributes>>>(
        '/api/actividades',
        actividadPayload
      )
    } catch (firstError: any) {
      // Si falla con 404, intentar con "actividads" (sin la 'e')
      if (firstError.status === 404) {
        console.log('[Activity Helper] Intentando con endpoint alternativo: /api/actividads')
        try {
          response = await strapiClient.post<StrapiResponse<StrapiEntity<ActividadAttributes>>>(
            '/api/actividads',
            actividadPayload
          )
        } catch (secondError: any) {
          // Si ambos fallan, lanzar el error original
          throw firstError
        }
      } else {
        throw firstError
      }
    }

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
    
    // Si el error es 404, puede ser que el content-type no existe
    if (error.status === 404 || error.message?.includes('Not Found')) {
      console.error('[Activity Helper] ❌ El content-type "Actividad" no existe en Strapi. Verifica que esté creado.')
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
