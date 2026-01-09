import type { StrapiEntity } from '@/lib/strapi/types'

// Tipos Strapi para Actividad
type ActividadAttributes = {
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

type ActividadEntity = StrapiEntity<ActividadAttributes>

export type ActivityType = {
  id: string
  realId?: string
  tipo: string
  titulo: string
  descripcion?: string
  fecha: string
  fechaFormateada: string
  hora: string
  estado: string
  notas?: string
  relacionadoCon?: {
    tipo: 'contacto' | 'lead' | 'oportunidad' | 'colegio'
    nombre: string
    id: string
  }
  creadoPor?: {
    nombre: string
    avatar?: string
  }
}

export type ActivitiesQuery = {
  page?: number
  pageSize?: number
  search?: string
  tipo?: string
  estado?: string
  relacionado_con?: string
  relacionado_id?: string
}

export type ActivitiesResult = {
  activities: ActivityType[]
  pagination: {
    page: number
    pageSize: number
    total: number
    pageCount: number
  }
}

// Mapeo tipo → icono y color
const tipoToIcon: Record<string, { icon: string; color: string }> = {
  'llamada': { icon: 'TbPhoneCall', color: 'secondary' },
  'email': { icon: 'TbMail', color: 'danger' },
  'reunion': { icon: 'TbCalendarEvent', color: 'primary' },
  'nota': { icon: 'TbPencil', color: 'muted' },
  'cambio_estado': { icon: 'TbEdit', color: 'primary' },
  'tarea': { icon: 'TbCheck', color: 'info' },
  'recordatorio': { icon: 'TbClock', color: 'warning' },
  'otro': { icon: 'TbDots', color: 'muted' },
}

// Mapeo estado → badge
const estadoToBadge: Record<string, { label: string; variant: string }> = {
  'completada': { label: 'Completada', variant: 'success' },
  'pendiente': { label: 'Pendiente', variant: 'warning' },
  'cancelada': { label: 'Cancelada', variant: 'danger' },
  'en_progreso': { label: 'En Progreso', variant: 'info' },
}

// Función de transformación
function transformActividadToActivityType(actividad: ActividadEntity | any): ActivityType {
  const attrs = actividad.attributes || actividad
  
  // ID
  const actividadId = actividad.documentId || actividad.id
  const idReal = actividadId ? (typeof actividadId === 'string' ? actividadId : actividadId.toString()) : String(actividad.id || '0')
  const id = idReal.startsWith('#') ? idReal : `#ACT${idReal.padStart(6, '0')}`
  
  // Tipo
  const tipo = attrs.tipo || 'nota'
  
  // Título y descripción
  const titulo = attrs.titulo || 'Sin título'
  const descripcion = attrs.descripcion || ''
  
  // Fecha
  const fecha = attrs.fecha || attrs.createdAt || new Date().toISOString()
  const fechaObj = new Date(fecha)
  const fechaFormateada = fechaObj.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
  const hora = fechaObj.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
  
  // Estado
  const estadoRaw = attrs.estado || 'pendiente'
  const estado = estadoToBadge[estadoRaw]?.label || estadoRaw
  
  // Notas
  const notas = attrs.notas || ''
  
  // Relacionado con
  let relacionadoCon: ActivityType['relacionadoCon'] | undefined
  if (attrs.relacionado_con_contacto) {
    const contacto = attrs.relacionado_con_contacto
    const contactoAttrs = contacto.attributes || contacto
    relacionadoCon = {
      tipo: 'contacto',
      nombre: contactoAttrs.nombre_completo || contactoAttrs.nombres || 'Contacto',
      id: contacto.documentId || contacto.id
    }
  } else if (attrs.relacionado_con_lead) {
    const lead = attrs.relacionado_con_lead
    const leadAttrs = lead.attributes || lead
    relacionadoCon = {
      tipo: 'lead',
      nombre: leadAttrs.nombre || 'Lead',
      id: lead.documentId || lead.id
    }
  } else if (attrs.relacionado_con_oportunidad) {
    const oportunidad = attrs.relacionado_con_oportunidad
    const oportunidadAttrs = oportunidad.attributes || oportunidad
    relacionadoCon = {
      tipo: 'oportunidad',
      nombre: oportunidadAttrs.nombre || 'Oportunidad',
      id: oportunidad.documentId || oportunidad.id
    }
  } else if (attrs.relacionado_con_colegio) {
    const colegio = attrs.relacionado_con_colegio
    const colegioAttrs = colegio.attributes || colegio
    relacionadoCon = {
      tipo: 'colegio',
      nombre: colegioAttrs.nombre || colegioAttrs.colegio_nombre || 'Colegio',
      id: colegio.documentId || colegio.id
    }
  }
  
  // Creado por
  let creadoPor: ActivityType['creadoPor'] | undefined
  if (attrs.creado_por) {
    const colaborador = attrs.creado_por
    const colaboradorAttrs = colaborador.attributes || colaborador
    const nombre = colaboradorAttrs.persona?.nombre_completo || 
                   colaboradorAttrs.nombre_completo || 
                   colaboradorAttrs.email_login || 
                   'Sin nombre'
    creadoPor = {
      nombre,
      avatar: undefined // Se puede agregar si hay imagen
    }
  }
  
  return {
    id,
    realId: idReal,
    tipo,
    titulo,
    descripcion,
    fecha,
    fechaFormateada,
    hora,
    estado,
    notas,
    relacionadoCon,
    creadoPor,
  }
}

/**
 * Obtiene actividades desde la API
 */
export async function getActivities(query: ActivitiesQuery = {}): Promise<ActivitiesResult> {
  try {
    const params = new URLSearchParams()
    
    if (query.page) params.append('page', query.page.toString())
    if (query.pageSize) params.append('pageSize', query.pageSize.toString())
    if (query.search) params.append('search', query.search)
    if (query.tipo) params.append('tipo', query.tipo)
    if (query.estado) params.append('estado', query.estado)
    if (query.relacionado_con) params.append('relacionado_con', query.relacionado_con)
    if (query.relacionado_id) params.append('relacionado_id', query.relacionado_id)
    
    const url = `/api/crm/activities?${params.toString()}`
    console.log('[Activities data] Fetching:', url)
    
    const response = await fetch(url, {
      cache: 'no-store',
    })
    
    const result = await response.json()
    
    if (!response.ok || !result.success) {
      if (result.message?.includes('no existe en Strapi')) {
        console.warn('[Activities data] Content-type Actividad no existe en Strapi')
        return {
          activities: [],
          pagination: {
            page: query.page || 1,
            pageSize: query.pageSize || 50,
            total: 0,
            pageCount: 0,
          },
        }
      }
      
      throw new Error(result.error || 'Error al obtener actividades')
    }
    
    const activitiesData = result.data || []
    const pagination = result.meta?.pagination || {
      page: query.page || 1,
      pageSize: query.pageSize || 50,
      total: 0,
      pageCount: 0,
    }
    
    // Transformar cada actividad
    const activities = activitiesData.map(transformActividadToActivityType)
    
    return {
      activities,
      pagination: {
        page: pagination.page || 1,
        pageSize: pagination.pageSize || 50,
        total: pagination.total || 0,
        pageCount: pagination.pageCount || 0,
      },
    }
  } catch (error: any) {
    console.error('[Activities data] Error:', error)
    throw error
  }
}

/**
 * Obtiene una actividad por ID
 */
export async function getActivityById(id: string): Promise<ActivityType | null> {
  try {
    const cleanId = id.replace(/^#ACT/, '').replace(/^#/, '')
    
    const response = await fetch(`/api/crm/activities/${cleanId}`, {
      cache: 'no-store',
    })
    
    const result = await response.json()
    
    if (!response.ok || !result.success) {
      return null
    }
    
    return transformActividadToActivityType(result.data)
  } catch (error: any) {
    console.error('[Activities data] Error al obtener actividad:', error)
    return null
  }
}

export { tipoToIcon, estadoToBadge }
