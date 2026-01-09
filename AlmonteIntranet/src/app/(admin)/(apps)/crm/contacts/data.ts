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
  // ⚠️ IMPORTANTE: Manejar diferentes formatos de trayectorias (puede venir como array, data, etc.)
  let trayectoriasArray: any[] = []
  if (attrs.trayectorias) {
    // Caso 1: Viene como array directo
    if (Array.isArray(attrs.trayectorias)) {
      trayectoriasArray = attrs.trayectorias
    }
    // Caso 2: Viene como { data: [...] }
    else if (attrs.trayectorias.data && Array.isArray(attrs.trayectorias.data)) {
      trayectoriasArray = attrs.trayectorias.data
    }
    // Caso 3: Viene como objeto único
    else if (attrs.trayectorias.id || attrs.trayectorias.documentId) {
      trayectoriasArray = [attrs.trayectorias]
    }
  }
  
  // Extraer atributos de cada trayectoria si es necesario
  trayectoriasArray = trayectoriasArray.map((t: any) => {
    // Si tiene attributes, extraerlos
    if (t.attributes) {
      return { ...t, ...t.attributes }
    }
    return t
  })
  
  // Buscar trayectoria actual (priorizar is_current)
  const trayectoriaActual = trayectoriasArray.find((t: { is_current?: boolean }) => t.is_current) || trayectoriasArray[0]
  
  // Debug logging para desarrollo
  if (process.env.NODE_ENV === 'development') {
    console.group('[transformPersonaToContact] Debug Trayectoria')
    console.log('Persona:', attrs.nombre_completo)
    console.log('Trayectorias raw:', attrs.trayectorias)
    console.log('Trayectorias procesadas:', trayectoriasArray)
    console.log('Trayectoria actual:', trayectoriaActual)
    if (trayectoriaActual?.colegio) {
      console.log('Estructura del colegio:', JSON.stringify(trayectoriaActual.colegio, null, 2))
    }
    console.groupEnd()
  }
  
  // Extraer colegio de diferentes formatos posibles
  let colegio: any = null
  if (trayectoriaActual?.colegio) {
    const colegioRaw = trayectoriaActual.colegio
    
    // Caso 1: colegio viene con { data: { id, attributes } }
    if (colegioRaw.data) {
      if (Array.isArray(colegioRaw.data)) {
        colegio = colegioRaw.data[0]?.attributes || colegioRaw.data[0]
      } else {
        colegio = colegioRaw.data.attributes || colegioRaw.data
      }
    }
    // Caso 2: colegio viene con { id, attributes }
    else if (colegioRaw.attributes) {
      colegio = colegioRaw.attributes
    }
    // Caso 3: colegio viene directo (ya populado)
    else if (colegioRaw.colegio_nombre || colegioRaw.id || colegioRaw.documentId) {
      colegio = colegioRaw
    }
    
    // Si después de todo esto solo tenemos un ID sin datos, el colegio no está populado
    if (colegio && !colegio.colegio_nombre && !colegio.rbd) {
      console.warn('[transformPersonaToContact] ⚠️ Colegio no populado correctamente:', {
        colegioRaw,
        colegio,
        tieneNombre: !!colegio.colegio_nombre,
        tieneRbd: !!colegio.rbd,
        tieneId: !!colegio.id,
        tieneDocumentId: !!colegio.documentId,
      })
      colegio = null
    }
    
    // Log del resultado final (siempre, no solo en desarrollo)
    if (colegio) {
      console.log('[transformPersonaToContact] ✅ Colegio extraído exitosamente:', {
        nombre: colegio.colegio_nombre,
        rbd: colegio.rbd,
        dependencia: colegio.dependencia,
        region: colegio.region,
        hasEmails: !!colegio.emails,
        hasTelefonos: !!colegio.telefonos,
        hasComuna: !!colegio.comuna,
        hasWebsite: !!colegio.website,
      })
    } else {
      console.warn('[transformPersonaToContact] ❌ No se pudo extraer colegio de trayectoria:', {
        trayectoriaActual,
        tieneTrayectoria: !!trayectoriaActual,
        tieneColegio: !!trayectoriaActual?.colegio,
      })
    }
  } else {
    console.warn('[transformPersonaToContact] ⚠️ No hay trayectoria actual o no tiene colegio:', {
      tieneTrayectoriaActual: !!trayectoriaActual,
      trayectoriasArray: trayectoriasArray.length,
    })
  }
  
  // Extraer comuna de diferentes formatos posibles
  let comuna: any = null
  if (colegio?.comuna) {
    const comunaRaw = colegio.comuna
    
    // Caso 1: comuna viene con { data: { id, attributes } }
    if (comunaRaw.data) {
      if (Array.isArray(comunaRaw.data)) {
        comuna = comunaRaw.data[0]?.attributes || comunaRaw.data[0]
      } else {
        comuna = comunaRaw.data.attributes || comunaRaw.data
      }
    }
    // Caso 2: comuna viene con { id, attributes }
    else if (comunaRaw.attributes) {
      comuna = comunaRaw.attributes
    }
    // Caso 3: comuna viene directo
    else if (comunaRaw.comuna_nombre || comunaRaw.region_nombre) {
      comuna = comunaRaw
    }
    
    if (process.env.NODE_ENV === 'development' && comuna) {
      console.log('[transformPersonaToContact] Comuna extraída:', {
        nombre: comuna.comuna_nombre,
        region: comuna.region_nombre,
        zona: comuna.zona,
      })
    }
  }
  
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
  let asignacionesComerciales: any[] = []
  if (colegio?.cartera_asignaciones) {
    // Manejar diferentes formatos de cartera_asignaciones
    const asignaciones = Array.isArray(colegio.cartera_asignaciones) 
      ? colegio.cartera_asignaciones 
      : Array.isArray(colegio.cartera_asignaciones.data)
      ? colegio.cartera_asignaciones.data
      : []
    
    asignacionesComerciales = asignaciones
      .map((ca: any) => {
        // Extraer atributos si vienen en formato Strapi
        const attrs = ca.attributes || ca
        return {
          is_current: attrs.is_current,
          rol: attrs.rol,
          estado: attrs.estado,
          prioridad: attrs.prioridad,
          ejecutivo: attrs.ejecutivo?.attributes || attrs.ejecutivo?.data?.attributes || attrs.ejecutivo,
        }
      })
      .filter((ca: any) => 
        ca.is_current && ca.rol === 'comercial' && ca.estado === 'activa'
      )
  }
  
  const asignacionComercial = asignacionesComerciales.sort((a: any, b: any) => {
    const prioridadOrder: Record<string, number> = { alta: 3, media: 2, baja: 1 }
    const prioridadA = (a.prioridad || 'baja') as keyof typeof prioridadOrder
    const prioridadB = (b.prioridad || 'baja') as keyof typeof prioridadOrder
    return (prioridadOrder[prioridadB] || 0) - (prioridadOrder[prioridadA] || 0)
  })[0]
  
  const representanteComercial = asignacionComercial?.ejecutivo?.nombre_completo || asignacionComercial?.ejecutivo?.data?.attributes?.nombre_completo || ''
  
  // 9. Zona (del colegio o comuna)
  const zona = colegio?.zona || comuna?.zona || ''
  
  // 10. Teléfonos del colegio
  const telefonosColegio = colegio?.telefonos?.map((t: { telefono_norm?: string; telefono_raw?: string; numero?: string }) => 
    t.telefono_norm || t.telefono_raw || t.numero || ''
  ).filter((t: string) => t) || []
  
  // 11. Emails del colegio
  const emailsColegio = colegio?.emails?.map((e: { email?: string }) => e.email || '').filter((e: string) => e) || []
  
  // 12. Website del colegio (puede venir en diferentes formatos)
  let websiteColegio = ''
  if (colegio?.website) {
    const websiteRaw = colegio.website
    
    // Si es string directo
    if (typeof websiteRaw === 'string') {
      websiteColegio = websiteRaw
    }
    // Si viene como objeto con data
    else if (websiteRaw.data) {
      const websiteData = Array.isArray(websiteRaw.data) ? websiteRaw.data[0] : websiteRaw.data
      websiteColegio = websiteData?.attributes?.url || websiteData?.url || ''
    }
    // Si viene como objeto con attributes
    else if (websiteRaw.attributes) {
      websiteColegio = websiteRaw.attributes.url || ''
    }
    // Si viene como objeto con url directo
    else if (websiteRaw.url) {
      websiteColegio = websiteRaw.url
    }
  }
  
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
      
      // Guardar también documentId para referencia
      const documentId = persona.documentId || (persona.id ? String(persona.id) : undefined)
      
      return {
        id: personaId,
        // Guardar documentId también para referencia (usar type assertion para agregar campo extra)
        ...(documentId && { documentId } as any),
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
  
  // Transformar cada persona a ContactType
  const contacts = data.map((persona: any) => {
    try {
      return transformPersonaToContact(persona)
    } catch (error) {
      console.error('Error transformando persona:', error, persona)
      // Retornar un contacto básico en caso de error
      return {
        id: persona.documentId || persona.id || 0,
        name: persona.attributes?.nombre_completo || persona.nombre_completo || 'Sin nombre',
        email: '',
        phone: '',
        description: '',
        label: { text: 'Prospect', variant: 'warning' },
        categories: [],
      } as ContactType
    }
  })
  
  return {
    contacts,
    pagination: result.meta?.pagination || {
      page,
      pageSize,
      total: result.meta?.pagination?.total || data.length,
      pageCount: result.meta?.pagination?.pageCount || 1,
    }
  }
}

