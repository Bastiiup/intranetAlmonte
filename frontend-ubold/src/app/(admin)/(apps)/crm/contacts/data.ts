import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'
import { ContactType } from '@/app/(admin)/(apps)/crm/types'
import { STRAPI_API_URL } from '@/lib/strapi/config'

// Tipos Strapi para Persona
type PersonaAttributes = {
  nombre_completo?: string
  nombres?: string
  primer_apellido?: string
  segundo_apellido?: string
  rut?: string
  nivel_confianza?: 'baja' | 'media' | 'alta'
  origen?: 'mineduc' | 'csv' | 'manual' | 'crm' | 'web' | 'otro'
  activo?: boolean
  createdAt?: string
  updatedAt?: string
  emails?: Array<{ email?: string; principal?: boolean }>
  telefonos?: Array<{ telefono_norm?: string; telefono_raw?: string; principal?: boolean }>
  imagen?: {
    url?: string
    media?: {
      data?: {
        attributes?: {
          url?: string
        }
      }
    }
  }
  tags?: Array<{ name?: string }>
  trayectorias?: Array<{
    cargo?: string
    is_current?: boolean
    colegio?: {
      colegio_nombre?: string
      dependencia?: string
      comuna?: {
        comuna_nombre?: string
        region_nombre?: string
      }
      cartera_asignaciones?: Array<{
        is_current?: boolean
        rol?: string
        estado?: string
        prioridad?: 'alta' | 'media' | 'baja'
        ejecutivo?: {
          nombre_completo?: string
        }
      }>
    }
  }>
}

// Extender StrapiEntity para incluir documentId si existe
type PersonaEntity = StrapiEntity<PersonaAttributes> & {
  documentId?: string
}

export type ContactsQuery = {
  page?: number
  pageSize?: number
  search?: string
  origin?: string[]
  confidence?: string
}

export type ContactsResult = {
  contacts: ContactType[]
  pagination: {
    page: number
    pageSize: number
    total: number
    pageCount: number
  }
}

// Mapeo nivel_confianza → label
const nivelConfianzaToLabel = {
  "baja": { text: "Cold Lead", variant: "info" },
  "media": { text: "Prospect", variant: "warning" },
  "alta": { text: "Hot Lead", variant: "success" }
} as const

// Mapeo origen → categoría
const origenToCategory = {
  "mineduc": { name: "MINEDUC", variant: "primary" },
  "csv": { name: "Importado", variant: "secondary" },
  "manual": { name: "Manual", variant: "light" },
  "crm": { name: "CRM", variant: "info" },
  "web": { name: "Web", variant: "success" },
  "otro": { name: "Otro", variant: "dark" }
} as const

// Función de transformación
function transformPersonaToContact(persona: PersonaEntity): ContactType {
  const attrs = persona.attributes
  
  // 1. Nombre
  const name = attrs.nombre_completo || 
    `${attrs.nombres || ''} ${attrs.primer_apellido || ''} ${attrs.segundo_apellido || ''}`.trim() || 
    'Sin nombre'
  
  // 2. Email (principal o primero)
  const emailPrincipal = attrs.emails?.find(e => e.principal) || attrs.emails?.[0]
  const email = emailPrincipal?.email || ''
  
  // 3. Teléfono (principal o primero)
  const telefonoPrincipal = attrs.telefonos?.find(t => t.principal) || attrs.telefonos?.[0]
  const phone = telefonoPrincipal?.telefono_norm || telefonoPrincipal?.telefono_raw || ''
  
  // 4. Trayectoria actual (priorizar is_current)
  const trayectoriaActual = attrs.trayectorias?.find(t => t.is_current) || attrs.trayectorias?.[0]
  const colegio = trayectoriaActual?.colegio
  const comuna = colegio?.comuna
  
  // 5. Cargo
  const cargo = trayectoriaActual?.cargo || ''
  
  // 6. Empresa
  const empresa = colegio?.colegio_nombre || ''
  
  // 7. Región
  const region = comuna?.region_nombre || ''
  
  // 8. Comuna
  const comunaNombre = comuna?.comuna_nombre || ''
  
  // 9. Dependencia
  const dependencia = colegio?.dependencia || ''
  
  // 10. Representante Comercial
  const asignacionesComerciales = colegio?.cartera_asignaciones?.filter(
    ca => ca.is_current && ca.rol === 'comercial' && ca.estado === 'activa'
  ) || []
  
  const asignacionComercial = asignacionesComerciales.sort((a, b) => {
    const prioridadOrder = { alta: 3, media: 2, baja: 1 }
    return (prioridadOrder[b.prioridad || 'baja'] || 0) - (prioridadOrder[a.prioridad || 'baja'] || 0)
  })[0]
  
  const representanteComercial = asignacionComercial?.ejecutivo?.nombre_completo || ''
  
  // 11. Descripción
  const description = cargo ? `${cargo}${empresa ? ` en ${empresa}` : ''}` : empresa || ''
  
  // 12. Label desde nivel_confianza
  const label = nivelConfianzaToLabel[attrs.nivel_confianza || 'media'] || nivelConfianzaToLabel['media']
  
  // 13. Categorías desde tags + origen
  const categories = [
    ...(attrs.tags?.map(tag => ({ name: tag.name || '', variant: "secondary" as const })).filter(c => c.name) || []),
    ...(attrs.origen && origenToCategory[attrs.origen] ? [origenToCategory[attrs.origen]] : [])
  ]
  
  // 14. Avatar/Imagen
  let avatar: string | undefined = undefined
  if (attrs.imagen) {
    if (typeof attrs.imagen === 'string') {
      avatar = attrs.imagen.startsWith('http') ? attrs.imagen : `${STRAPI_API_URL}${attrs.imagen}`
    } else if (attrs.imagen.url) {
      avatar = attrs.imagen.url.startsWith('http') ? attrs.imagen.url : `${STRAPI_API_URL}${attrs.imagen.url}`
    } else if (attrs.imagen.media?.data?.attributes?.url) {
      const mediaUrl = attrs.imagen.media.data.attributes.url
      avatar = mediaUrl.startsWith('http') ? mediaUrl : `${STRAPI_API_URL}${mediaUrl}`
    }
  }
  
  return {
    id: persona.documentId ? parseInt(persona.documentId) : persona.id,
    name,
    cargo,
    email,
    phone,
    empresa,
    region,
    comuna: comunaNombre,
    dependencia,
    representanteComercial,
    description,
    avatar,
    label,
    categories,
    origen: attrs.origen,
    createdAt: attrs.createdAt ? new Date(attrs.createdAt) : undefined,
    updatedAt: attrs.updatedAt ? new Date(attrs.updatedAt) : undefined,
  }
}

// Función principal para obtener contactos
export async function getContacts(query: ContactsQuery = {}): Promise<ContactsResult> {
  const page = query.page || 1
  const pageSize = query.pageSize || 50
  
  // Construir parámetros de query
  const params = new URLSearchParams({
    'pagination[page]': page.toString(),
    'pagination[pageSize]': pageSize.toString(),
    'sort[0]': 'updatedAt:desc',
  })
  
  // Populate para relaciones (Strapi v4 syntax)
  params.append('populate[emails]', 'true')
  params.append('populate[telefonos]', 'true')
  params.append('populate[imagen][populate]', 'media')
  params.append('populate[tags]', 'true')
  params.append('populate[trayectorias][populate][colegio][populate][comuna]', 'true')
  params.append('populate[trayectorias][populate][colegio][populate][cartera_asignaciones][populate][ejecutivo]', 'true')
  
  // Filtros
  params.append('filters[activo][$eq]', 'true')
  
  // Búsqueda
  if (query.search) {
    // Intentar primero como RUT (formato exacto)
    if (query.search.match(/^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/)) {
      params.append('filters[rut][$eq]', query.search)
    } else {
      // Si no es RUT, buscar por nombre completo o email
      params.append('filters[$or][0][nombre_completo][$containsi]', query.search)
      params.append('filters[$or][1][emails][email][$containsi]', query.search)
      params.append('filters[$or][2][rut][$containsi]', query.search)
    }
  }
  
  // Filtro por origen
  if (query.origin && query.origin.length > 0) {
    query.origin.forEach((origin, index) => {
      params.append(`filters[origen][$in][${index}]`, origin)
    })
  }
  
  // Filtro por nivel de confianza
  if (query.confidence) {
    params.append('filters[nivel_confianza][$eq]', query.confidence)
  }
  
  const url = `/api/personas?${params.toString()}`
  const response = await strapiClient.get<StrapiResponse<PersonaEntity>>(url)
  
  const data = Array.isArray(response.data) ? response.data : [response.data]
  
  return {
    contacts: data.map(transformPersonaToContact),
    pagination: response.meta?.pagination || {
      page,
      pageSize,
      total: 0,
      pageCount: 0,
    }
  }
}

