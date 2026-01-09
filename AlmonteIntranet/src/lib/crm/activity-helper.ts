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
  // Declarar actividadPayload fuera del try para que esté disponible en el catch
  let actividadPayload: any = null
  
  try {
    // ========== ESTRUCTURA DE STRAPI ==========
    // Campos REQUERIDOS (*):
    // - tipo* (Enumeration)
    // - titulo* (Text)
    // - fecha* (Datetime)
    // - estado* (Enumeration)
    //
    // Campos OPCIONALES:
    // - descripcion (Text)
    // - notas (Text)
    // - relacionado_con_contacto (Relation manyToOne con Persona)
    // - relacionado_con_lead (Relation manyToOne con Lead)
    // - relacionado_con_oportunidad (Relation manyToOne con Oportunidad)
    // - relacionado_con_colegio (Relation manyToOne con Colegio)
    // - creado_por (Relation manyToOne con "Intranet · Colaboradores")
    
    // IMPORTANTE: fecha es requerida por Strapi - siempre enviarla
    // Si no se proporciona, usar fecha/hora actual
    const fecha = activityData.fecha || new Date().toISOString()
    
    // Valores por defecto si no se proporcionan (campos requeridos)
    const tipo = activityData.tipo || 'nota' // Enumeration requerido
    const estado = activityData.estado || 'pendiente' // Enumeration requerido
    
    actividadPayload = {
      data: {
        // Campos REQUERIDOS - siempre enviar
        titulo: activityData.titulo, // Text requerido
        fecha: fecha, // Datetime requerido
        tipo: tipo, // Enumeration requerido (por defecto: "nota")
        estado: estado, // Enumeration requerido (por defecto: "pendiente")
        
        // Campos OPCIONALES - solo enviar si existen
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
    
    // creado_por es opcional - Relation manyToOne con "Intranet · Colaboradores"
    // IMPORTANTE: Si el colaborador no existe en Strapi, esto causará un error 400
    // Por seguridad, solo agregar si el ID es válido, pero si falla, el error será capturado
    // y no interrumpirá el flujo principal (la creación del lead/oportunidad)
    if (activityData.creado_por) {
      const creadoPorId = typeof activityData.creado_por === 'string' 
        ? parseInt(activityData.creado_por) 
        : activityData.creado_por
      if (!isNaN(creadoPorId) && creadoPorId > 0) {
        // Formato correcto: solo el ID numérico del colaborador
        // Target: "Intranet · Colaboradores" (endpoint: /api/colaboradores)
        // Strapi puede transformarlo internamente a {"set":[{"id":X}]}, pero eso es normal
        actividadPayload.data.creado_por = creadoPorId
      } else {
        console.warn('[Activity Helper] ⚠️ ID de creado_por inválido, omitiendo:', activityData.creado_por)
      }
    }
    // Nota: creado_por es opcional - si no se proporciona o es inválido, 
    // la actividad se creará sin creado_por

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

    // ========== LOGS DETALLADOS PARA DEBUGGING ==========
    console.log('═══════════════════════════════════════════════════════')
    console.log('[Activity Helper] 📝 CREANDO ACTIVIDAD AUTOMÁTICA')
    console.log('═══════════════════════════════════════════════════════')
    console.log('[Activity Helper] 📋 Datos de entrada:')
    console.log('  - Título:', activityData.titulo)
    console.log('  - Tipo:', tipo, '(por defecto: nota)')
    console.log('  - Estado:', estado, '(por defecto: pendiente)')
    console.log('  - Fecha:', fecha, '(por defecto: fecha actual)')
    console.log('  - Descripción:', activityData.descripcion || 'NO HAY')
    console.log('  - Notas:', activityData.notas || 'NO HAY')
    console.log('[Activity Helper] 🔗 Relaciones:')
    console.log('  - Relacionado con contacto:', activityData.relacionado_con_contacto || 'NO')
    console.log('  - Relacionado con lead:', activityData.relacionado_con_lead || 'NO')
    console.log('  - Relacionado con oportunidad:', activityData.relacionado_con_oportunidad || 'NO')
    console.log('  - Relacionado con colegio:', activityData.relacionado_con_colegio || 'NO')
    console.log('  - Creado por:', actividadPayload.data.creado_por || 'NO SE ENVÍA (opcional)')
    console.log('[Activity Helper] 📤 Payload que se enviará a Strapi:')
    console.log(JSON.stringify(payloadParaLog, null, 2))
    console.log('═══════════════════════════════════════════════════════')

    // Usar el endpoint correcto: /api/actividades
    // Nota: draftAndPublish está deshabilitado, así que las actividades se guardan directamente
    // No necesitamos publicar manualmente y NO debemos enviar publishedAt
    const response = await strapiClient.post<StrapiResponse<StrapiEntity<ActividadAttributes>>>(
      '/api/actividades',
      actividadPayload
    )

    // ========== LOGS DE RESPUESTA ==========
    const actividadId = (response.data as any)?.id || (response.data as any)?.documentId || 'unknown'
    console.log('═══════════════════════════════════════════════════════')
    console.log('[Activity Helper] ✅ ACTIVIDAD CREADA EXITOSAMENTE')
    console.log('═══════════════════════════════════════════════════════')
    console.log('[Activity Helper] 📋 Detalles de la actividad creada:')
    console.log('  - ID:', actividadId)
    console.log('  - Título:', activityData.titulo)
    console.log('  - Tipo:', tipo)
    console.log('  - Estado:', estado)
    console.log('  - Fecha:', fecha)
    console.log('[Activity Helper] 🔗 Relaciones establecidas:')
    console.log('  - Relacionado con contacto:', actividadPayload.data.relacionado_con_contacto || 'NO')
    console.log('  - Relacionado con lead:', actividadPayload.data.relacionado_con_lead || 'NO')
    console.log('  - Relacionado con oportunidad:', actividadPayload.data.relacionado_con_oportunidad || 'NO')
    console.log('  - Relacionado con colegio:', actividadPayload.data.relacionado_con_colegio || 'NO')
    console.log('  - Creado por:', actividadPayload.data.creado_por || 'NO')
    console.log('[Activity Helper] 📥 Respuesta completa de Strapi:')
    console.log(JSON.stringify(response, null, 2).substring(0, 500), '...')
    console.log('═══════════════════════════════════════════════════════')
  } catch (error: any) {
    // ========== LOGS DETALLADOS DE ERROR ==========
    console.log('═══════════════════════════════════════════════════════')
    console.log('[Activity Helper] ❌ ERROR AL CREAR ACTIVIDAD')
    console.log('═══════════════════════════════════════════════════════')
    console.error('[Activity Helper] ⚠️ Error al crear actividad automática:')
    console.error('  - Mensaje:', error.message)
    console.error('  - Status:', error.status)
    console.error('  - Status Text:', error.statusText)
    console.error('  - Título intentado:', activityData.titulo)
    console.error('  - Tipo:', activityData.tipo || 'nota (por defecto)')
    console.error('[Activity Helper] 📋 Payload que causó el error:')
    if (actividadPayload) {
      console.error(JSON.stringify(actividadPayload, null, 2))
    } else {
      console.error('  (Payload no disponible - error ocurrió antes de construir el payload)')
    }
    
    // Detectar tipos específicos de errores
    if (error.status === 404 || error.message?.includes('Not Found')) {
      console.error('[Activity Helper] ❌ PROBLEMA: Content-type "Actividad" no existe')
      console.error('[Activity Helper] 🔧 SOLUCIÓN:')
      console.error('  1. Verifica que el content-type esté creado en Strapi')
      console.error('  2. Verifica que el endpoint sea /api/actividades')
      console.error('  3. Reinicia Strapi después de crear el content-type')
    } else if (error.status === 403 || error.message?.includes('Forbidden')) {
      console.error('[Activity Helper] ❌ PROBLEMA: Error de permisos (403 Forbidden)')
      console.error('[Activity Helper] 🔧 SOLUCIÓN:')
      console.error('  1. Ve a Strapi Admin → Settings → Users & Permissions → Roles')
      console.error('  2. Selecciona el rol apropiado (Public, Authenticated, etc.)')
      console.error('  3. Busca "Actividad" en la lista de permisos')
      console.error('  4. Habilita: find, findOne, create, update, delete')
    } else if (error.status === 400) {
      console.error('[Activity Helper] ❌ PROBLEMA: Error de validación (400 Bad Request)')
      if (error.details?.errors) {
        console.error('[Activity Helper] 📋 Errores de validación detallados:')
        console.error(JSON.stringify(error.details.errors, null, 2))
        
        // Detectar si el error es por colaborador que no existe
        const errorMessage = error.message || ''
        if (errorMessage.includes('colaborador') && errorMessage.includes('do not exist')) {
          console.warn('[Activity Helper] ⚠️ CAUSA ESPECÍFICA: El colaborador no existe en Strapi')
          console.warn('[Activity Helper] 🔍 Detalles:')
          console.warn('  - ID de colaborador intentado:', actividadPayload.data.creado_por)
          console.warn('  - Este ID no existe en la tabla de colaboradores de Strapi')
          console.warn('[Activity Helper] 🔧 SOLUCIÓN:')
          console.warn('  1. Verifica que el colaborador con ID', actividadPayload.data.creado_por, 'exista en Strapi')
          console.warn('  2. O omite creado_por (es opcional) para crear la actividad sin colaborador')
          console.warn('  3. La actividad se puede crear manualmente después desde /crm/activities')
        }
        
        // Detectar si falta fecha
        const errorsArray = error.details?.errors || []
        const fechaError = errorsArray.find((e: any) => e.path?.includes('fecha'))
        if (fechaError) {
          console.error('[Activity Helper] ⚠️ CAUSA ESPECÍFICA: Fecha no definida')
          console.error('[Activity Helper] 🔧 SOLUCIÓN: El código debería enviar fecha automáticamente')
        }
      }
    } else {
      console.error('[Activity Helper] ❌ PROBLEMA: Error desconocido')
      console.error('[Activity Helper] 📋 Detalles completos del error:')
      console.error(JSON.stringify({
        message: error.message,
        status: error.status,
        details: error.details,
        stack: error.stack?.substring(0, 500),
      }, null, 2))
    }
    console.log('═══════════════════════════════════════════════════════')
    console.log('[Activity Helper] ⚠️ NOTA: Este error NO interrumpe el flujo principal')
    console.log('[Activity Helper] ⚠️ El lead/oportunidad se creó correctamente, solo falló la actividad')
    console.log('═══════════════════════════════════════════════════════')
    
    // No lanzar error para no interrumpir el flujo principal
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
