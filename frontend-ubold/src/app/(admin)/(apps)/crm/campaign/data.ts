import type { StrapiEntity } from '@/lib/strapi/types'
import user1 from '@/assets/images/users/user-1.jpg'
import { StaticImageData } from 'next/image'

// Tipos Strapi para Campaña
type CampanaAttributes = {
  nombre?: string
  descripcion?: string
  presupuesto?: number
  objetivo?: number
  estado?: 'en_progreso' | 'exitosa' | 'programada' | 'fallida' | 'en_curso'
  tags?: string[]
  fecha_inicio?: string
  fecha_fin?: string
  creado_por?: any
  contactos?: any
  leads?: any
  colegios?: any
  createdAt?: string
  updatedAt?: string
}

type CampanaEntity = StrapiEntity<CampanaAttributes>

export type CampaignType = {
  id: string
  realId?: string
  name: string
  creator: {
    name: string
    avatar: StaticImageData | string
  }
  budget: string
  goals: string
  status: 'In Progress' | 'Success' | 'Scheduled' | 'Failed' | 'Ongoing'
  tags: string[]
  dateCreated: string
  dateCreatedTime: string
}

export type CampaignsQuery = {
  page?: number
  pageSize?: number
  search?: string
  estado?: string
}

export type CampaignsResult = {
  campaigns: CampaignType[]
  pagination: {
    page: number
    pageSize: number
    total: number
    pageCount: number
  }
}

// Mapeo estado Strapi → UI
const estadoToStatus: Record<string, 'In Progress' | 'Success' | 'Scheduled' | 'Failed' | 'Ongoing'> = {
  'en_progreso': 'In Progress',
  'exitosa': 'Success',
  'programada': 'Scheduled',
  'fallida': 'Failed',
  'en_curso': 'Ongoing',
}

// Función de transformación
function transformCampanaToCampaignType(campana: CampanaEntity | any): CampaignType {
  const attrs = campana.attributes || campana
  
  // ID
  const campanaId = campana.documentId || campana.id
  const idReal = campanaId ? (typeof campanaId === 'string' ? campanaId : campanaId.toString()) : String(campana.id || '0')
  const id = idReal.startsWith('#') ? idReal : `#CAMP${idReal.padStart(6, '0')}`
  
  // Nombre
  const name = attrs.nombre || 'Sin nombre'
  
  // Creador
  let creator = { name: 'Sin asignar', avatar: user1 }
  if (attrs.creado_por) {
    const colaborador = attrs.creado_por
    const colaboradorAttrs = colaborador.attributes || colaborador
    const nombre = colaboradorAttrs.persona?.nombre_completo || 
                   colaboradorAttrs.nombre_completo || 
                   colaboradorAttrs.email_login || 
                   'Sin nombre'
    
    let avatar: any = user1
    if (colaboradorAttrs.imagen) {
      const imagenUrl = typeof colaboradorAttrs.imagen === 'string'
        ? colaboradorAttrs.imagen
        : colaboradorAttrs.imagen.url || colaboradorAttrs.imagen.data?.attributes?.url
      if (imagenUrl) {
        avatar = imagenUrl.startsWith('http') ? imagenUrl : `${process.env.NEXT_PUBLIC_STRAPI_API_URL || ''}${imagenUrl}`
      }
    }
    
    creator = { name: nombre, avatar }
  }
  
  // Presupuesto y objetivo
  const presupuesto = attrs.presupuesto || 0
  const objetivo = attrs.objetivo || 0
  const budget = `$${presupuesto.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  const goals = `$${objetivo.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  
  // Estado
  const estadoRaw = attrs.estado || 'programada'
  const status = estadoToStatus[estadoRaw] || 'Scheduled'
  
  // Tags
  const tags = Array.isArray(attrs.tags) ? attrs.tags : []
  
  // Fechas
  const fechaCreacion = attrs.createdAt || attrs.fecha_inicio || new Date().toISOString()
  const fechaObj = new Date(fechaCreacion)
  const dateCreated = fechaObj.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
  const dateCreatedTime = fechaObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
  
  return {
    id,
    realId: idReal,
    name,
    creator,
    budget,
    goals,
    status,
    tags,
    dateCreated,
    dateCreatedTime,
  }
}

/**
 * Obtiene campañas desde la API
 */
export async function getCampaigns(query: CampaignsQuery = {}): Promise<CampaignsResult> {
  try {
    const params = new URLSearchParams()
    
    if (query.page) params.append('page', query.page.toString())
    if (query.pageSize) params.append('pageSize', query.pageSize.toString())
    if (query.search) params.append('search', query.search)
    if (query.estado) params.append('estado', query.estado)
    
    const url = `/api/crm/campaigns?${params.toString()}`
    console.log('[Campaigns data] Fetching:', url)
    
    const response = await fetch(url, {
      cache: 'no-store',
    })
    
    const result = await response.json()
    
    if (!response.ok || !result.success) {
      if (result.message?.includes('no existe en Strapi')) {
        console.warn('[Campaigns data] Content-type Campaña no existe en Strapi')
        return {
          campaigns: [],
          pagination: {
            page: query.page || 1,
            pageSize: query.pageSize || 50,
            total: 0,
            pageCount: 0,
          },
        }
      }
      
      throw new Error(result.error || 'Error al obtener campañas')
    }
    
    const campaignsData = result.data || []
    const pagination = result.meta?.pagination || {
      page: query.page || 1,
      pageSize: query.pageSize || 50,
      total: 0,
      pageCount: 0,
    }
    
    // Transformar cada campaña
    const campaigns = campaignsData.map(transformCampanaToCampaignType)
    
    return {
      campaigns,
      pagination: {
        page: pagination.page || 1,
        pageSize: pagination.pageSize || 50,
        total: pagination.total || 0,
        pageCount: pagination.pageCount || 0,
      },
    }
  } catch (error: any) {
    console.error('[Campaigns data] Error:', error)
    throw error
  }
}

/**
 * Obtiene una campaña por ID
 */
export async function getCampaignById(id: string): Promise<CampaignType | null> {
  try {
    const cleanId = id.replace(/^#CAMP/, '').replace(/^#/, '')
    
    const response = await fetch(`/api/crm/campaigns/${cleanId}`, {
      cache: 'no-store',
    })
    
    const result = await response.json()
    
    if (!response.ok || !result.success) {
      return null
    }
    
    return transformCampanaToCampaignType(result.data)
  } catch (error: any) {
    console.error('[Campaigns data] Error al obtener campaña:', error)
    return null
  }
}
