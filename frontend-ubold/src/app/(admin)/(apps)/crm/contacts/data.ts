import { ContactType } from '@/app/(admin)/(apps)/crm/types'
import { STRAPI_API_URL } from '@/lib/strapi/config'
import type { StrapiEntity } from '@/lib/strapi/types'

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
  tags?: Array<{ name?: string }>
  trayectorias?: Array<{
    cargo?: string
    is_current?: boolean
    colegio?: {
      colegio_nombre?: string
      dependencia?: string
      zona?: string
      telefonos?: Array<{ telefono_norm?: string; telefono_raw?: string; numero?: string }>
      emails?: Array<{ email?: string }>
      website?: string
      comuna?: {
        comuna_nombre?: string
        region_nombre?: string
        zona?: string
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

// Tipo para la respuesta de la API (puede venir como StrapiEntity o como objeto plano)
type PersonaEntity = (StrapiEntity<PersonaAttributes> & {
  documentId?: string
}) | {
  id?: number
  documentId?: string
  attributes?: PersonaAttributes
  [key: string]: any
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
  // Manejar diferentes formatos de respuesta
  const attrs = persona.attributes || persona as any
  
  // 1. Nombre
  const name = attrs.nombre_completo || 
    `${attrs.nombres || ''} ${attrs.primer_apellido || ''} ${attrs.segundo_apellido || ''}`.trim() || 
    'Sin nombre'
  
  // 2. Email (principal o primero)
  const emailPrincipal = attrs.emails?.find((e: { email?: string; principal?: boolean }) => e.principal) || attrs.emails?.[0]
  const email = emailPrincipal?.email || ''
  
  // 3. Teléfono (principal o primero)
  const telefonoPrincipal = attrs.telefonos?.find((t: { telefono_norm?: string; telefono_raw?: string; principal?: boolean }) => t.principal) || attrs.telefonos?.[0]
  const phone = telefonoPrincipal?.telefono_norm || telefonoPrincipal?.telefono_raw || ''
  
  // 4. Trayectoria actual (priorizar is_current)
  const trayectoriaActual = attrs.trayectorias?.find((t: { is_current?: boolean }) => t.is_current) || attrs.trayectorias?.[0]
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
    (ca: { is_current?: boolean; rol?: string; estado?: string; prioridad?: 'alta' | 'media' | 'baja' }) => 
      ca.is_current && ca.rol === 'comercial' && ca.estado === 'activa'
  ) || []
  
  const asignacionComercial = asignacionesComerciales.sort((a: { prioridad?: 'alta' | 'media' | 'baja' }, b: { prioridad?: 'alta' | 'media' | 'baja' }) => {
    const prioridadOrder = { alta: 3, media: 2, baja: 1 }
    return (prioridadOrder[b.prioridad || 'baja'] || 0) - (prioridadOrder[a.prioridad || 'baja'] || 0)
  })[0]
  
  const representanteComercial = asignacionComercial?.ejecutivo?.nombre_completo || ''
  
  // 9. Zona (del colegio o comuna)
  const zona = colegio?.zona || comuna?.zona || ''
  
  // 10. Teléfonos del colegio
  const telefonosColegio = colegio?.telefonos?.map((t: { telefono_norm?: string; telefono_raw?: string; numero?: string }) => 
    t.telefono_norm || t.telefono_raw || t.numero || ''
  ).filter((t: string) => t) || []
  
  // 11. Emails del colegio
  const emailsColegio = colegio?.emails?.map((e: { email?: string }) => e.email || '').filter((e: string) => e) || []
  
  // 12. Website del colegio
  const websiteColegio = colegio?.website || ''
  
  // 13. Descripción
  const description = cargo ? `${cargo}${empresa ? ` en ${empresa}` : ''}` : empresa || ''
  
  // 14. Label desde nivel_confianza
  const nivelConfianza = (attrs.nivel_confianza || 'media') as keyof typeof nivelConfianzaToLabel
  const label = nivelConfianzaToLabel[nivelConfianza] || nivelConfianzaToLabel['media']
  
  // 15. Categorías desde tags + origen
  const origen = attrs.origen as keyof typeof origenToCategory | undefined
  const categories = [
    ...(attrs.tags?.map((tag: { name?: string }) => ({ name: tag.name || '', variant: "secondary" as const })).filter((c: { name: string }) => c.name) || []),
    ...(origen && origenToCategory[origen] ? [origenToCategory[origen]] : [])
  ]
  
  // 16. Avatar/Imagen
  let avatar: string | undefined = undefined
  if (attrs.imagen) {
    if (typeof attrs.imagen === 'string') {
      const imagenUrl = attrs.imagen
      avatar = imagenUrl.startsWith('http') ? imagenUrl : `${STRAPI_API_URL}${imagenUrl}`
    } else {
      // attrs.imagen es un objeto aquí
      if (attrs.imagen.url) {
        const url = attrs.imagen.url
        avatar = url.startsWith('http') ? url : `${STRAPI_API_URL}${url}`
      } else if (attrs.imagen.media?.data?.attributes?.url) {
        const mediaUrl = attrs.imagen.media.data.attributes.url
        avatar = mediaUrl.startsWith('http') ? mediaUrl : `${STRAPI_API_URL}${mediaUrl}`
      }
    }
  }
  
      // Obtener el ID correcto (documentId es el identificador principal en Strapi)
      let personaId: number = 0
      if (persona.documentId) {
        personaId = parseInt(persona.documentId)
      } else if (persona.id) {
        if (typeof persona.id === 'number') {
          personaId = persona.id
        } else if (typeof persona.id === 'string') {
          personaId = parseInt(persona.id)
        } else {
          personaId = parseInt(String(persona.id))
        }
      }
      
      return {
        id: personaId,
    name,
    cargo,
    email,
    phone,
    empresa,
    region,
    comuna: comunaNombre,
    zona,
    dependencia,
    representanteComercial,
    telefonosColegio,
    emailsColegio,
    websiteColegio,
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
  
  // Construir parámetros de query para la API route
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  })
  
  if (query.search) {
    params.append('search', query.search)
  }
  
  if (query.origin && query.origin.length > 0) {
    params.append('origin', query.origin[0]) // Por ahora solo el primero
  }
  
  if (query.confidence) {
    params.append('confidence', query.confidence)
  }
  
  // Llamar a la API route del servidor
  const response = await fetch(`/api/crm/contacts?${params.toString()}`)
  
  if (!response.ok) {
    throw new Error(`Error al obtener contactos: ${response.statusText}`)
  }
  
  const result = await response.json()
  
  if (!result.success) {
    throw new Error(result.error || 'Error al obtener contactos')
  }
  
  const data = Array.isArray(result.data) ? result.data : [result.data]
  
  return {
    contacts: data.map(transformPersonaToContact),
    pagination: result.meta?.pagination || {
      page,
      pageSize,
      total: 0,
      pageCount: 0,
    }
  }
}

