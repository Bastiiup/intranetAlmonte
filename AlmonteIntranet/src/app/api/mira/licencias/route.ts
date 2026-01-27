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
    // Especificar campos explícitamente para evitar errores con relaciones de media
    // IMPORTANTE: Incluir nombre_libro e isbn_libro que son los campos necesarios para mostrar en la tabla
    const queryParams = new URLSearchParams({
      'populate[libro_mira][populate][libro][fields][0]': 'nombre_libro',
      'populate[libro_mira][populate][libro][fields][1]': 'isbn_libro',
      'populate[libro_mira][populate][libro][fields][2]': 'subtitulo_libro',
      // NO incluir portada_libro porque causa error de validación en Strapi
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
    
    console.log('[API /api/mira/licencias] Query params:', queryParams.toString())
    
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

    // Construir un mapa libro_mira.id -> datos de libro (nombre_libro, isbn_libro)
    const libroMiraIds = new Set<string>()
    for (const licencia of licencias.data) {
      const attributes = licencia.attributes || licencia
      const libroMiraData = attributes.libro_mira?.data || attributes.libro_mira
      if (libroMiraData?.id) {
        libroMiraIds.add(String(libroMiraData.id))
      }
    }

    const mapaLibros = new Map<string, { nombre_libro: string; isbn_libro: string }>()

    if (libroMiraIds.size > 0) {
      const idsArray = Array.from(libroMiraIds)
      const librosParams = new URLSearchParams({
        'fields[0]': 'id',
        'populate[libro][fields][0]': 'nombre_libro',
        'populate[libro][fields][1]': 'isbn_libro',
        'pagination[pageSize]': '1000',
      })
      // Filtro por IDs de libro_mira usados en las licencias
      librosParams.append('filters[id][$in]', idsArray.join(','))

      const librosUrl = `${getStrapiUrl('/api/libros-mira')}?${librosParams.toString()}`
      console.log('[API /api/mira/licencias] Cargando libros-mira relacionados desde:', librosUrl)

      const librosResponse = await fetch(librosUrl, {
        method: 'GET',
        headers: STRAPI_API_TOKEN
          ? {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${STRAPI_API_TOKEN}`,
            }
          : {
              'Content-Type': 'application/json',
            },
      })

      if (!librosResponse.ok) {
        const errorText = await librosResponse.text()
        console.error('[API /api/mira/licencias] Error al cargar libros-mira relacionados:', errorText)
      } else {
        const librosData = await librosResponse.json()
        console.log(
          '[API /api/mira/licencias] Total libros-mira relacionados recibidos:',
          librosData.data?.length ?? 0
        )

        if (Array.isArray(librosData.data)) {
          for (const libroMira of librosData.data) {
            const libroMiraId = String(libroMira.id)
            const libroData =
              libroMira.attributes?.libro?.data || libroMira.attributes?.libro || null

            if (!libroData) continue

            const libroAttrs = libroData.attributes || libroData
            const nombreLibro = libroAttrs.nombre_libro || ''
            const isbnLibro = libroAttrs.isbn_libro || ''

            mapaLibros.set(libroMiraId, { nombre_libro: nombreLibro, isbn_libro: isbnLibro })
          }
        }
      }
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
        libro_mira: (() => {
          const libroMiraData = attributes.libro_mira?.data || attributes.libro_mira
          if (!libroMiraData) return null

          const libroInfo = mapaLibros.get(String(libroMiraData.id))

          return {
            id: libroMiraData.id || libroMiraData.documentId,
            documentId:
              libroMiraData.documentId || String(libroMiraData.id || ''),
            activo: libroMiraData.attributes?.activo !== false,
            tiene_omr: libroMiraData.attributes?.tiene_omr || false,
            libro: libroInfo
              ? {
                  id: libroMiraData.id,
                  isbn_libro: libroInfo.isbn_libro,
                  nombre_libro: libroInfo.nombre_libro,
                  portada_libro: null,
                }
              : null,
          }
        })(),
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
