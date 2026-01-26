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
    // Especificar campos explícitamente para evitar errores de validación con relaciones de media
    const queryParams = new URLSearchParams({
      'populate[libro_mira][populate][libro][fields][0]': 'nombre_libro',
      'populate[libro_mira][populate][libro][fields][1]': 'isbn_libro',
      'populate[libro_mira][populate][libro][fields][2]': 'subtitulo_libro',
      // NO incluir portada_libro aquí porque causa error de validación en Strapi
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

    console.log('[API /api/mira/licencias] Total licencias recibidas:', licencias.data.length)
    if (licencias.data.length > 0) {
      console.log('[API /api/mira/licencias] Ejemplo de estructura de licencia:', JSON.stringify(licencias.data[0], null, 2).substring(0, 1000))
    }

    // Transformar datos para la interfaz
    const transformedData = licencias.data.map((licencia: any) => {
      const attributes = licencia.attributes || licencia
      
      console.log('[API /api/mira/licencias] Procesando licencia ID:', licencia.id)
      console.log('[API /api/mira/licencias] Estructura libro_mira:', JSON.stringify(attributes.libro_mira, null, 2).substring(0, 500))
      console.log('[API /api/mira/licencias] Estructura estudiante:', JSON.stringify(attributes.estudiante, null, 2).substring(0, 500))
      
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
                const libroMiraData = attributes.libro_mira.data
                const libroData = 
                  libroMiraData?.attributes?.libro?.data ||
                  libroMiraData?.attributes?.libro ||
                  libroMiraData?.libro?.data ||
                  libroMiraData?.libro ||
                  null
                
                console.log('[API /api/mira/licencias] libroData extraido:', JSON.stringify(libroData, null, 2).substring(0, 300))
                
                if (!libroData) {
                  console.warn('[API /api/mira/licencias] Libro no encontrado en libro_mira:', {
                    libroMiraId: libroMiraData?.id,
                    estructuraLibroMira: JSON.stringify(libroMiraData, null, 2).substring(0, 500)
                  })
                  return null
                }
                
                // Manejar tanto estructura con .attributes como sin ella
                const libroAttrs = libroData.attributes || libroData
                const nombreLibro = libroAttrs.nombre_libro || ''
                const isbnLibro = libroAttrs.isbn_libro || ''
                
                console.log('[API /api/mira/licencias] Nombre libro extraido:', nombreLibro, 'ISBN:', isbnLibro)
                
                return {
                  id: libroData.id || libroData.documentId,
                  isbn_libro: isbnLibro,
                  nombre_libro: nombreLibro,
                  // portada_libro no se incluye porque no se puede popular en este nivel de anidación
                  // Si se necesita, se debe hacer una petición separada o usar populate más específico
                  portada_libro: null,
                }
              })(),
            }
          : null,
        estudiante: (() => {
          const estudianteData = attributes.estudiante?.data
          if (!estudianteData) {
            console.log('[API /api/mira/licencias] No hay estudiante en licencia ID:', licencia.id)
            return null
          }
          
          const estudianteAttrs = estudianteData.attributes || estudianteData
          const personaData = estudianteAttrs.persona?.data || estudianteAttrs.persona
          const personaAttrs = personaData?.attributes || personaData
          
          console.log('[API /api/mira/licencias] Persona extraida:', {
            nombres: personaAttrs?.nombres,
            primer_apellido: personaAttrs?.primer_apellido,
            segundo_apellido: personaAttrs?.segundo_apellido
          })
          
          return {
            id: estudianteData.id,
            email: estudianteAttrs.email || '',
            activo: estudianteAttrs.activo !== false,
            nivel: estudianteAttrs.nivel || '',
            curso: estudianteAttrs.curso || '',
            persona: personaAttrs
              ? {
                  id: personaData.id || personaData.documentId,
                  nombres: personaAttrs.nombres || '',
                  primer_apellido: personaAttrs.primer_apellido || '',
                  segundo_apellido: personaAttrs.segundo_apellido || '',
                }
              : null,
            colegio: estudianteAttrs.colegio?.data
              ? {
                  id: estudianteAttrs.colegio.data.id,
                  nombre: estudianteAttrs.colegio.data.attributes?.colegio_nombre || '',
                }
              : null,
          }
        })(),
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
