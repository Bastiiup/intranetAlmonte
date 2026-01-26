import { NextRequest, NextResponse } from 'next/server'
import { getStrapiUrl, STRAPI_API_TOKEN } from '@/lib/strapi/config'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Aumentar timeout a 60 segundos

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '25')
    
    // Construir query con populate profundo para libro_mira.libro
    // Usar populate=* para la relación libro para obtener todos los campos necesarios
    const queryParams = new URLSearchParams({
      'populate[libro_mira][populate][libro]': '*',
      'populate[libro_mira][fields][0]': 'activo',
      'populate[libro_mira][fields][1]': 'tiene_omr',
      'populate[estudiante][populate][persona][fields][0]': 'nombres',
      'populate[estudiante][populate][persona][fields][1]': 'primer_apellido',
      'populate[estudiante][populate][persona][fields][2]': 'segundo_apellido',
      'populate[estudiante][populate][colegio][fields][0]': 'colegio_nombre',
      'populate[estudiante][fields][0]': 'email',
      'populate[estudiante][fields][1]': 'nivel',
      'populate[estudiante][fields][2]': 'curso',
      'populate[estudiante][fields][3]': 'activo',
      'pagination[page]': page.toString(),
      'pagination[pageSize]': pageSize.toString(),
      'sort': 'createdAt:desc',
    })
    
    const url = `${getStrapiUrl('/api/licencias-estudiantes')}?${queryParams.toString()}`
    
    // Usar fetch directamente con timeout más largo (60 segundos)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000)
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    
    if (STRAPI_API_TOKEN) {
      headers['Authorization'] = `Bearer ${STRAPI_API_TOKEN}`
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Error ${response.status}: ${errorText}`)
    }
    
    const licencias = await response.json()

    if (!licencias.data || !Array.isArray(licencias.data)) {
      return NextResponse.json(
        { success: false, error: 'Formato de respuesta inválido' },
        { status: 500 }
      )
    }

    // Transformar datos para la interfaz
    const transformedData = licencias.data.map((licencia: any) => {
      const attributes = licencia.attributes || licencia
      
      return {
        id: licencia.id,
        documentId: licencia.documentId || String(licencia.id),
        codigo_activacion: attributes.codigo_activacion || '',
        fecha_activacion: attributes.fecha_activacion || null,
        activa: attributes.activa !== false,
        fecha_vencimiento: attributes.fecha_vencimiento || null,
        libro_mira: attributes.libro_mira?.data
          ? {
              id: attributes.libro_mira.data.id || attributes.libro_mira.data.documentId,
              documentId: attributes.libro_mira.data.documentId || String(attributes.libro_mira.data.id || ''),
              activo: attributes.libro_mira.data.attributes?.activo !== false,
              tiene_omr: attributes.libro_mira.data.attributes?.tiene_omr || false,
              libro: (() => {
                // Intentar múltiples formas de acceder a la relación libro
                const libroData = 
                  attributes.libro_mira.data.attributes?.libro?.data ||
                  attributes.libro_mira.data.attributes?.libro ||
                  attributes.libro_mira.data.libro?.data ||
                  attributes.libro_mira.data.libro ||
                  null
                
                if (!libroData) {
                  console.warn('[API /api/mira/licencias] Libro no encontrado en libro_mira:', {
                    libroMiraId: attributes.libro_mira.data.id,
                    estructura: JSON.stringify(attributes.libro_mira.data, null, 2).substring(0, 500)
                  })
                  return null
                }
                
                // Manejar tanto estructura con .attributes como sin ella
                const libroAttrs = libroData.attributes || libroData
                
                return {
                  id: libroData.id || libroData.documentId,
                  isbn_libro: libroAttrs.isbn_libro || '',
                  nombre_libro: libroAttrs.nombre_libro || '',
                  portada_libro: libroAttrs.portada_libro?.data
                    ? {
                        url: libroAttrs.portada_libro.data.attributes?.url || libroAttrs.portada_libro.data.url || '',
                      }
                    : libroAttrs.portada_libro?.url
                    ? {
                        url: libroAttrs.portada_libro.url,
                      }
                    : null,
                }
              })(),
            }
          : null,
        estudiante: attributes.estudiante?.data
          ? {
              id: attributes.estudiante.data.id,
              email: attributes.estudiante.data.attributes?.email || '',
              activo: attributes.estudiante.data.attributes?.activo !== false,
              nivel: attributes.estudiante.data.attributes?.nivel || '',
              curso: attributes.estudiante.data.attributes?.curso || '',
              persona: attributes.estudiante.data.attributes?.persona?.data
                ? {
                    id: attributes.estudiante.data.attributes.persona.data.id,
                    nombres: attributes.estudiante.data.attributes.persona.data.attributes?.nombres || '',
                    primer_apellido: attributes.estudiante.data.attributes.persona.data.attributes?.primer_apellido || '',
                    segundo_apellido: attributes.estudiante.data.attributes.persona.data.attributes?.segundo_apellido || '',
                  }
                : null,
              colegio: attributes.estudiante.data.attributes?.colegio?.data
                ? {
                    id: attributes.estudiante.data.attributes.colegio.data.id,
                    nombre: attributes.estudiante.data.attributes.colegio.data.attributes?.colegio_nombre || '',
                  }
                : null,
            }
          : null,
        createdAt: attributes.createdAt || null,
        updatedAt: attributes.updatedAt || null,
      }
    })

    return NextResponse.json({
      success: true,
      data: transformedData,
      meta: licencias.meta,
    })
  } catch (error: any) {
    console.error('[API /api/mira/licencias] Error:', error)
    
    // Detectar timeout específicamente
    if (error.name === 'AbortError' || error.message?.includes('timeout') || error.message?.includes('Timeout')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Timeout: La petición a Strapi tardó más de 60 segundos. Intenta con paginación más pequeña.',
        },
        { status: 504 }
      )
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener licencias',
      },
      { status: 500 }
    )
  }
}
