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
    nombre_libro?: string
    nombre?: string // Fallback
    editorial?: {
      nombre?: string
    }
    empresa?: string // Fallback
    portada_libro?: string | {
      url?: string
      data?: {
        attributes?: {
          url?: string
        }
      } | Array<{
        attributes?: {
          url?: string
        }
      }>
    }
    logo?: string | { // Fallback para compatibilidad
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
  
  // ID - Guardar el ID real (documentId o id numérico) para actualizaciones
  const oportunidadId = oportunidad.documentId || oportunidad.id
  const idReal = oportunidadId ? (typeof oportunidadId === 'string' ? oportunidadId : oportunidadId.toString()) : String(oportunidad.id || '0')
  // ID formateado para mostrar
  const id = idReal.startsWith('#') ? idReal : `#OP${idReal}`
  
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
  
  // Libro usa 'nombre_libro' no 'nombre', y 'portada_libro' no 'logo'
  const productName = producto?.nombre_libro || producto?.nombre || attrs.nombre || 'Sin nombre'
  const productBy = producto?.editorial?.nombre || producto?.empresa || 'Sin empresa'
  
  // Portada del libro (libro usa 'portada_libro' no 'logo')
  let productLogo = '/assets/images/logos/default.svg' // Logo por defecto
  if (producto?.portada_libro) {
    const portada = producto.portada_libro
    if (typeof portada === 'string') {
      const portadaUrl = portada
      productLogo = portadaUrl.startsWith('http') ? portadaUrl : `${STRAPI_API_URL}${portadaUrl}`
    } else if (portada.data) {
      // Strapi v4 format: { data: { attributes: { url: ... } } }
      const portadaData = Array.isArray(portada.data) ? portada.data[0] : portada.data
      const url = portadaData?.attributes?.url || portadaData?.url
      if (url) {
        productLogo = url.startsWith('http') ? url : `${STRAPI_API_URL}${url}`
      }
    } else if (portada.url) {
      productLogo = portada.url.startsWith('http') ? portada.url : `${STRAPI_API_URL}${portada.url}`
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
  let customerAvatar = '/assets/images/users/user-1.jpg' // Avatar por defecto
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
  
  // Etapa - mapear a español
  const etapaRaw = attrs.etapa || 'Qualification'
  const etapaLabels: Record<string, string> = {
    'Qualification': 'Calificación',
    'Proposal Sent': 'Propuesta Enviada',
    'Negotiation': 'Negociación',
    'Won': 'Ganada',
    'Lost': 'Perdida'
  }
  const stage = etapaLabels[etapaRaw] || etapaRaw
  
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
    realId: idReal, // ID real para actualizaciones (documentId o id numérico)
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

// Variable para habilitar datos mock (útil mientras se crea el content-type en Strapi)
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_OPPORTUNITIES === 'true'

// Función principal para obtener oportunidades
export async function getOpportunities(query: OpportunitiesQuery = {}): Promise<OpportunitiesResult> {
  // Si está habilitado el uso de datos mock, retornarlos
  if (USE_MOCK_DATA) {
    console.warn('[getOpportunities] Usando datos mock. El content-type Oportunidad no existe en Strapi.')
    return getMockOpportunities(query)
  }

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
    // Si hay un mensaje informativo, mostrarlo
    if (result.message) {
      throw new Error(result.message)
    }
    throw new Error(result.error || 'Error al obtener oportunidades')
  }
  
  // Si el resultado es exitoso pero viene con mensaje (content-type no existe)
  if (result.message && result.data && Array.isArray(result.data) && result.data.length === 0) {
    console.warn('[getOpportunities]', result.message)
    // Opcionalmente, usar datos mock si el content-type no existe
    if (process.env.NODE_ENV === 'development') {
      console.warn('[getOpportunities] Modo desarrollo: usando datos mock temporalmente')
      return getMockOpportunities(query)
    }
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
        customerAvatar: '/assets/images/users/user-1.jpg' as any,
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

// Función para obtener datos mock (temporal mientras se crea el content-type)
function getMockOpportunities(query: OpportunitiesQuery): OpportunitiesResult {
  const mockOpportunities: OpportunitiesType[] = [
    {
      id: 'mock-1',
      productName: 'Plataforma Escolar Completa',
      productBy: 'Colegio San José',
      productLogo: '/assets/images/logos/default.svg' as any,
      customerName: 'Juan Pérez',
      customerEmail: 'juan.perez@colegiosanjose.cl',
      customerAvatar: '/assets/images/users/user-dummy-img.jpg' as any,
      stage: 'Negotiation',
      amount: '$50,000',
      closeDate: '15 Mar, 2026',
      source: 'Referral',
      owner: 'María González',
      status: 'in-progress',
      priority: 'high',
    },
    {
      id: 'mock-2',
      productName: 'Sistema de Gestión Académica',
      productBy: 'Colegio Los Andes',
      productLogo: '/assets/images/logos/default.svg' as any,
      customerName: 'Ana Martínez',
      customerEmail: 'ana.martinez@colegiolosandes.cl',
      customerAvatar: '/assets/images/users/user-dummy-img.jpg' as any,
      stage: 'Proposal Sent',
      amount: '$35,000',
      closeDate: '20 Mar, 2026',
      source: 'Web',
      owner: 'Carlos Rodríguez',
      status: 'open',
      priority: 'medium',
    },
    {
      id: 'mock-3',
      productName: 'Plataforma de Comunicación Escolar',
      productBy: 'Instituto Nacional',
      productLogo: '/assets/images/logos/default.svg' as any,
      customerName: 'Pedro Silva',
      customerEmail: 'pedro.silva@institucionacional.cl',
      customerAvatar: '/assets/images/users/user-dummy-img.jpg' as any,
      stage: 'Qualification',
      amount: '$28,000',
      closeDate: '25 Mar, 2026',
      source: 'LinkedIn',
      owner: 'Laura Fernández',
      status: 'open',
      priority: 'low',
    },
  ]

  // Aplicar filtros
  let filtered = mockOpportunities

  if (query.search) {
    const searchLower = query.search.toLowerCase()
    filtered = filtered.filter(
      (opp) =>
        opp.productName.toLowerCase().includes(searchLower) ||
        opp.customerName.toLowerCase().includes(searchLower) ||
        opp.customerEmail.toLowerCase().includes(searchLower)
    )
  }

  if (query.stage) {
    filtered = filtered.filter((opp) => opp.stage === query.stage)
  }

  if (query.status) {
    filtered = filtered.filter((opp) => opp.status === query.status)
  }

  if (query.priority) {
    filtered = filtered.filter((opp) => opp.priority === query.priority)
  }

  // Aplicar paginación
  const page = query.page || 1
  const pageSize = query.pageSize || 50
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const paginated = filtered.slice(start, end)

  return {
    opportunities: paginated,
    pagination: {
      page,
      pageSize,
      total: filtered.length,
      pageCount: Math.ceil(filtered.length / pageSize),
    },
  }
}

