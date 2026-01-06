import type { StrapiEntity } from '@/lib/strapi/types'
import { LeadType } from '@/app/(admin)/(apps)/crm/types'
import { STRAPI_API_URL } from '@/lib/strapi/config'
import user1 from '@/assets/images/users/user-1.jpg'

// Tipos Strapi para Lead
type LeadAttributes = {
  nombre?: string
  email?: string
  telefono?: string
  empresa?: string
  monto_estimado?: number
  etiqueta?: 'baja' | 'media' | 'alta'
  estado?: 'in-progress' | 'proposal-sent' | 'follow-up' | 'pending' | 'negotiation' | 'rejected'
  fuente?: string
  fecha_creacion?: string
  activo?: boolean
  notas?: string
  fecha_proximo_seguimiento?: string
  createdAt?: string
  updatedAt?: string
  asignado_a?: any
  relacionado_con_persona?: any
  relacionado_con_colegio?: any
}

type LeadEntity = StrapiEntity<LeadAttributes>

export type LeadsQuery = {
  page?: number
  pageSize?: number
  search?: string
  etiqueta?: string
  estado?: string
  fuente?: string
}

export type LeadsResult = {
  leads: LeadType[]
  pagination: {
    page: number
    pageSize: number
    total: number
    pageCount: number
  }
}

// Mapeo etiqueta → label y color
const etiquetaToTag: Record<string, { label: string; color: string }> = {
  'baja': { label: 'Cold Lead', color: 'info' },
  'media': { label: 'Prospect', color: 'warning' },
  'alta': { label: 'Hot Lead', color: 'success' },
}

// Mapeo estado → status y variant
const estadoToStatus: Record<string, { status: string; statusVariant: string }> = {
  'in-progress': { status: 'In Progress', statusVariant: 'success' },
  'proposal-sent': { status: 'Proposal Sent', statusVariant: 'primary' },
  'follow-up': { status: 'Follow Up', statusVariant: 'info' },
  'pending': { status: 'Pending', statusVariant: 'warning' },
  'negotiation': { status: 'Negotiation', statusVariant: 'primary' },
  'rejected': { status: 'Rejected', statusVariant: 'danger' },
}

// Función de transformación
function transformLeadToLeadType(lead: LeadEntity | any): LeadType {
  // Manejar diferentes formatos de respuesta
  const attrs = lead.attributes || lead
  
  // ID - Guardar el ID real (documentId o id numérico) para actualizaciones
  const leadId = lead.documentId || lead.id
  const idReal = leadId ? (typeof leadId === 'string' ? leadId : leadId.toString()) : String(lead.id || '0')
  // ID formateado para mostrar
  const id = idReal.startsWith('#') ? idReal : `#LD${idReal.padStart(6, '0')}`
  
  // Nombre del cliente
  const customer = attrs.nombre || 'Sin nombre'
  
  // Empresa
  const company = attrs.empresa || 'Sin empresa'
  
  // Logo - intentar obtener de relacionado_con_colegio o usar default
  let logo: any = '/assets/images/logos/default.svg'
  if (attrs.relacionado_con_colegio) {
    const colegio = attrs.relacionado_con_colegio
    const colegioAttrs = colegio.attributes || colegio
    // Si el colegio tiene logo, usarlo
    if (colegioAttrs.logo) {
      const logoUrl = typeof colegioAttrs.logo === 'string' 
        ? colegioAttrs.logo 
        : colegioAttrs.logo.url || colegioAttrs.logo.data?.attributes?.url
      if (logoUrl) {
        logo = logoUrl.startsWith('http') ? logoUrl : `${STRAPI_API_URL}${logoUrl}`
      }
    }
  }
  
  // Email y teléfono
  const email = attrs.email || ''
  const phone = attrs.telefono || ''
  
  // Monto
  const amount = attrs.monto_estimado || 0
  
  // Etiqueta
  const etiquetaRaw = attrs.etiqueta || 'baja'
  const tag = etiquetaToTag[etiquetaRaw] || { label: 'Cold Lead', color: 'info' }
  
  // Estado
  const estadoRaw = attrs.estado || 'in-progress'
  const statusInfo = estadoToStatus[estadoRaw] || { status: 'In Progress', statusVariant: 'success' }
  
  // Asignado a
  let assigned = { avatar: user1, name: 'Sin asignar' }
  if (attrs.asignado_a) {
    const colaborador = attrs.asignado_a
    const colaboradorAttrs = colaborador.attributes || colaborador
    const nombre = colaboradorAttrs.nombre_completo || colaboradorAttrs.nombre || 'Sin nombre'
    
    // Avatar del colaborador
    let avatar: any = user1
    if (colaboradorAttrs.imagen) {
      const imagenUrl = typeof colaboradorAttrs.imagen === 'string'
        ? colaboradorAttrs.imagen
        : colaboradorAttrs.imagen.url || colaboradorAttrs.imagen.data?.attributes?.url
      if (imagenUrl) {
        avatar = imagenUrl.startsWith('http') ? imagenUrl : `${STRAPI_API_URL}${imagenUrl}`
      }
    }
    
    assigned = { avatar, name: nombre }
  }
  
  // Fecha de creación
  const fechaCreacion = attrs.fecha_creacion || attrs.createdAt
  const created = fechaCreacion 
    ? new Date(fechaCreacion).toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      })
    : new Date().toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      })
  
  return {
    id,
    realId: idReal, // Guardar el ID real para actualizaciones
    customer,
    company,
    logo,
    email,
    phone,
    amount,
    tag,
    assigned,
    status: statusInfo.status,
    statusVariant: statusInfo.statusVariant,
    created,
  }
}

/**
 * Obtiene leads desde la API
 */
export async function getLeads(query: LeadsQuery = {}): Promise<LeadsResult> {
  try {
    const params = new URLSearchParams()
    
    if (query.page) params.append('page', query.page.toString())
    if (query.pageSize) params.append('pageSize', query.pageSize.toString())
    if (query.search) params.append('search', query.search)
    if (query.etiqueta) params.append('etiqueta', query.etiqueta)
    if (query.estado) params.append('estado', query.estado)
    if (query.fuente) params.append('fuente', query.fuente)
    
    const url = `/api/crm/leads?${params.toString()}`
    console.log('[Leads data] Fetching:', url)
    
    const response = await fetch(url, {
      cache: 'no-store',
    })
    
    const result = await response.json()
    
    if (!response.ok || !result.success) {
      // Si el content-type no existe, retornar array vacío
      if (result.message?.includes('no existe en Strapi')) {
        console.warn('[Leads data] Content-type Lead no existe en Strapi')
        return {
          leads: [],
          pagination: {
            page: query.page || 1,
            pageSize: query.pageSize || 50,
            total: 0,
            pageCount: 0,
          },
        }
      }
      
      throw new Error(result.error || 'Error al obtener leads')
    }
    
    const leadsData = result.data || []
    const pagination = result.meta?.pagination || {
      page: query.page || 1,
      pageSize: query.pageSize || 50,
      total: 0,
      pageCount: 0,
    }
    
    // Transformar cada lead
    const leads = leadsData.map(transformLeadToLeadType)
    
    return {
      leads,
      pagination: {
        page: pagination.page || 1,
        pageSize: pagination.pageSize || 50,
        total: pagination.total || 0,
        pageCount: pagination.pageCount || 0,
      },
    }
  } catch (error: any) {
    console.error('[Leads data] Error:', error)
    throw error
  }
}

/**
 * Obtiene un lead por ID
 */
export async function getLeadById(id: string): Promise<LeadType | null> {
  try {
    // Limpiar el ID (remover #LD si existe)
    const cleanId = id.replace(/^#LD/, '').replace(/^#/, '')
    
    const response = await fetch(`/api/crm/leads/${cleanId}`, {
      cache: 'no-store',
    })
    
    const result = await response.json()
    
    if (!response.ok || !result.success) {
      return null
    }
    
    return transformLeadToLeadType(result.data)
  } catch (error: any) {
    console.error('[Leads data] Error al obtener lead:', error)
    return null
  }
}
