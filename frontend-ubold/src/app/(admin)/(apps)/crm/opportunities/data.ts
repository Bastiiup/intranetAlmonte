import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'
import { OpportunitiesType } from '@/app/(admin)/(apps)/crm/types'
import { STRAPI_API_URL } from '@/lib/strapi/config'

// Tipos Strapi para Oportunidad
type OportunidadAttributes = {
  nombre?: string
  descripcion?: string
  monto?: number
  moneda?: string
  etapa?: string
  estado?: 'open' | 'in-progress' | 'closed'
  prioridad?: 'low' | 'medium' | 'high'
  fecha_cierre?: string
  fuente?: string
  activo?: boolean
  createdAt?: string
  updatedAt?: string
  producto?: {
    nombre?: string
    empresa?: string
    logo?: string | {
      url?: string
      media?: {
        data?: {
          attributes?: {
            url?: string
          }
        }
      }
    }
  }
  contacto?: {
    nombre_completo?: string
    email?: string
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
  }
  propietario?: {
    nombre_completo?: string
  }
}

// Extender StrapiEntity para incluir documentId si existe
type OportunidadEntity = StrapiEntity<OportunidadAttributes> & {
  documentId?: string
}

export type OpportunitiesQuery = {
  page?: number
  pageSize?: number
  search?: string
  stage?: string
  status?: string
  priority?: string
}

export type OpportunitiesResult = {
  opportunities: OpportunitiesType[]
  pagination: {
    page: number
    pageSize: number
    total: number
    pageCount: number
  }
}

// Función de transformación
function transformOportunidadToOpportunity(oportunidad: OportunidadEntity): OpportunitiesType {
  const attrs = oportunidad.attributes
  
  // ID
  const id = oportunidad.documentId || oportunidad.id?.toString() || `#OP${oportunidad.id}`
  
  // Producto
  const producto = attrs.producto
  const productName = producto?.nombre || attrs.nombre || 'Sin nombre'
  const productBy = producto?.empresa || 'Sin empresa'
  
  // Logo del producto
  let productLogo = '/assets/images/logos/default.svg' // Logo por defecto
  if (producto?.logo) {
    if (typeof producto.logo === 'string') {
      const logoUrl = producto.logo
      productLogo = logoUrl.startsWith('http') ? logoUrl : `${STRAPI_API_URL}${logoUrl}`
    } else {
      // producto.logo es un objeto aquí
      if (producto.logo.url) {
        const url = producto.logo.url
        productLogo = url.startsWith('http') ? url : `${STRAPI_API_URL}${url}`
      } else if (producto.logo.media?.data?.attributes?.url) {
        const mediaUrl = producto.logo.media.data.attributes.url
        productLogo = mediaUrl.startsWith('http') ? mediaUrl : `${STRAPI_API_URL}${mediaUrl}`
      }
    }
  }
  
  // Contacto
  const contacto = attrs.contacto
  const customerName = contacto?.nombre_completo || 'Sin contacto'
  const customerEmail = contacto?.email || ''
  
  // Avatar del contacto
  let customerAvatar = '/assets/images/users/user-dummy-img.jpg' // Avatar por defecto
  if (contacto?.imagen) {
    if (typeof contacto.imagen === 'string') {
      const imagenUrl = contacto.imagen
      customerAvatar = imagenUrl.startsWith('http') ? imagenUrl : `${STRAPI_API_URL}${imagenUrl}`
    } else {
      // contacto.imagen es un objeto aquí
      if (contacto.imagen.url) {
        const url = contacto.imagen.url
        customerAvatar = url.startsWith('http') ? url : `${STRAPI_API_URL}${url}`
      } else if (contacto.imagen.media?.data?.attributes?.url) {
        const mediaUrl = contacto.imagen.media.data.attributes.url
        customerAvatar = mediaUrl.startsWith('http') ? mediaUrl : `${STRAPI_API_URL}${mediaUrl}`
      }
    }
  }
  
  // Etapa
  const stage = attrs.etapa || 'Qualification'
  
  // Monto
  const monto = attrs.monto || 0
  const moneda = attrs.moneda || 'USD'
  const amount = `${moneda === 'USD' ? '$' : moneda} ${monto.toLocaleString()}`
  
  // Fecha de cierre
  const fechaCierre = attrs.fecha_cierre || attrs.updatedAt
  const closeDate = fechaCierre ? new Date(fechaCierre).toLocaleDateString('es-ES', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  }) : '-'
  
  // Fuente
  const source = attrs.fuente || 'Manual'
  
  // Propietario
  const owner = attrs.propietario?.nombre_completo || 'Sin asignar'
  
  // Estado
  const status = attrs.estado || 'open'
  
  // Prioridad
  const priority = attrs.prioridad || 'medium'
  
  return {
    id,
    productName,
    productBy,
    productLogo: productLogo as any, // Cast necesario para StaticImageData
    customerName,
    customerEmail,
    customerAvatar: customerAvatar as any, // Cast necesario para StaticImageData
    stage,
    amount,
    closeDate,
    source,
    owner,
    status,
    priority,
  }
}

// Función principal para obtener oportunidades
export async function getOpportunities(query: OpportunitiesQuery = {}): Promise<OpportunitiesResult> {
  const page = query.page || 1
  const pageSize = query.pageSize || 50
  
  // Construir parámetros de query
  const params = new URLSearchParams({
    'pagination[page]': page.toString(),
    'pagination[pageSize]': pageSize.toString(),
    'sort[0]': 'updatedAt:desc',
  })
  
  // Populate para relaciones (Strapi v4 syntax)
  params.append('populate[producto][populate][logo][populate]', 'media')
  params.append('populate[contacto][populate][imagen][populate]', 'media')
  params.append('populate[propietario]', 'true')
  
  // Filtros
  params.append('filters[activo][$eq]', 'true')
  
  // Búsqueda
  if (query.search) {
    params.append('filters[$or][0][nombre][$containsi]', query.search)
    params.append('filters[$or][1][descripcion][$containsi]', query.search)
    params.append('filters[$or][2][contacto][nombre_completo][$containsi]', query.search)
  }
  
  // Filtro por etapa
  if (query.stage) {
    params.append('filters[etapa][$eq]', query.stage)
  }
  
  // Filtro por estado
  if (query.status) {
    params.append('filters[estado][$eq]', query.status)
  }
  
  // Filtro por prioridad
  if (query.priority) {
    params.append('filters[prioridad][$eq]', query.priority)
  }
  
  const url = `/api/oportunidades?${params.toString()}`
  const response = await strapiClient.get<StrapiResponse<OportunidadEntity>>(url)
  
  const data = Array.isArray(response.data) ? response.data : [response.data]
  
  return {
    opportunities: data.map(transformOportunidadToOpportunity),
    pagination: response.meta?.pagination || {
      page,
      pageSize,
      total: 0,
      pageCount: 0,
    }
  }
}

