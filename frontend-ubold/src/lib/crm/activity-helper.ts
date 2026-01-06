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

    await strapiClient.post<StrapiResponse<StrapiEntity<ActividadAttributes>>>(
      '/api/actividades',
      actividadPayload
    )

    console.log('[Activity Helper] ✅ Actividad creada automáticamente:', activityData.titulo)
  } catch (error: any) {
    // No lanzar error para no interrumpir el flujo principal
    console.error('[Activity Helper] ⚠️ Error al crear actividad automática:', {
      message: error.message,
      titulo: activityData.titulo,
    })
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
