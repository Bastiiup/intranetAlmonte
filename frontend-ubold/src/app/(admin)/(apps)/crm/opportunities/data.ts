import type { StrapiEntity } from '@/lib/strapi/types'
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
function transformOportunidadToOpportunity(oportunidad: OportunidadEntity | any): OpportunitiesType {
  // Manejar diferentes formatos de respuesta
  const attrs = oportunidad.attributes || oportunidad
  
  // ID
  const oportunidadId = oportunidad.documentId || oportunidad.id
  const id = oportunidadId ? (typeof oportunidadId === 'string' ? oportunidadId : oportunidadId.toString()) : `#OP${oportunidad.id || '0'}`
  
  // Extraer producto de diferentes formatos posibles
  let producto: any = null
  if (attrs.producto) {
    const productoRaw = attrs.producto
    
    // Caso 1: producto viene con { data: { id, attributes } }
    if (productoRaw.data) {
      if (Array.isArray(productoRaw.data)) {
        producto = productoRaw.data[0]?.attributes || productoRaw.data[0]
      } else {
        producto = productoRaw.data.attributes || productoRaw.data
      }
    }
    // Caso 2: producto viene con { id, attributes }
    else if (productoRaw.attributes) {
      producto = productoRaw.attributes
    }
    // Caso 3: producto viene directo (ya populado)
    else if (productoRaw.nombre || productoRaw.id || productoRaw.documentId) {
      producto = productoRaw
    }
  }
  
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
  
  // Extraer contacto de diferentes formatos posibles
  let contacto: any = null
  if (attrs.contacto) {
    const contactoRaw = attrs.contacto
    
    // Caso 1: contacto viene con { data: { id, attributes } }
    if (contactoRaw.data) {
      if (Array.isArray(contactoRaw.data)) {
        contacto = contactoRaw.data[0]?.attributes || contactoRaw.data[0]
      } else {
        contacto = contactoRaw.data.attributes || contactoRaw.data
      }
    }
    // Caso 2: contacto viene con { id, attributes }
    else if (contactoRaw.attributes) {
      contacto = contactoRaw.attributes
    }
    // Caso 3: contacto viene directo (ya populado)
    else if (contactoRaw.nombre_completo || contactoRaw.id || contactoRaw.documentId) {
      contacto = contactoRaw
    }
  }
  
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
  
  // Extraer propietario de diferentes formatos posibles
  let propietario: any = null
  if (attrs.propietario) {
    const propietarioRaw = attrs.propietario
    
    // Caso 1: propietario viene con { data: { id, attributes } }
    if (propietarioRaw.data) {
      if (Array.isArray(propietarioRaw.data)) {
        propietario = propietarioRaw.data[0]?.attributes || propietarioRaw.data[0]
      } else {
        propietario = propietarioRaw.data.attributes || propietarioRaw.data
      }
    }
    // Caso 2: propietario viene con { id, attributes }
    else if (propietarioRaw.attributes) {
      propietario = propietarioRaw.attributes
    }
    // Caso 3: propietario viene directo (ya populado)
    else if (propietarioRaw.nombre_completo || propietarioRaw.id || propietarioRaw.documentId) {
      propietario = propietarioRaw
    }
  }
  
  const owner = propietario?.nombre_completo || 'Sin asignar'
  
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
  
  // Construir parámetros de query para la API route
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  })
  
  if (query.search) {
    params.append('search', query.search)
  }
  
  if (query.stage) {
    params.append('stage', query.stage)
  }
  
  if (query.status) {
    params.append('status', query.status)
  }
  
  if (query.priority) {
    params.append('priority', query.priority)
  }
  
  // Llamar a la API route del servidor
  const response = await fetch(`/api/crm/oportunidades?${params.toString()}`)
  
  if (!response.ok) {
    throw new Error(`Error al obtener oportunidades: ${response.statusText}`)
  }
  
  const result = await response.json()
  
  if (!result.success) {
    throw new Error(result.error || 'Error al obtener oportunidades')
  }
  
  // Manejar diferentes formatos de respuesta de Strapi
  let data: any[] = []
  if (Array.isArray(result.data)) {
    data = result.data
  } else if (result.data && typeof result.data === 'object') {
    // Si viene como objeto con data array dentro
    if (Array.isArray(result.data.data)) {
      data = result.data.data
    } else {
      // Si viene como un solo objeto
      data = [result.data]
    }
  }
  
  // Transformar cada oportunidad a OpportunitiesType
  const opportunities = data.map((oportunidad: any) => {
    try {
      return transformOportunidadToOpportunity(oportunidad)
    } catch (error) {
      console.error('Error transformando oportunidad:', error, oportunidad)
      // Retornar una oportunidad básica en caso de error
      return {
        id: oportunidad.documentId || oportunidad.id || '0',
        productName: oportunidad.attributes?.nombre || oportunidad.nombre || 'Sin nombre',
        productBy: 'Sin empresa',
        productLogo: '/assets/images/logos/default.svg' as any,
        customerName: 'Sin contacto',
        customerEmail: '',
        customerAvatar: '/assets/images/users/user-dummy-img.jpg' as any,
        stage: 'Qualification',
        amount: '$0',
        closeDate: '-',
        source: 'Manual',
        owner: 'Sin asignar',
        status: 'open' as const,
        priority: 'medium' as const,
      } as OpportunitiesType
    }
  })
  
  return {
    opportunities,
    pagination: result.meta?.pagination || {
      page,
      pageSize,
      total: result.meta?.pagination?.total || data.length,
      pageCount: result.meta?.pagination?.pageCount || 1,
    }
  }
}

