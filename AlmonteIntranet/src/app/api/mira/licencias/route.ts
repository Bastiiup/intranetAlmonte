import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Obtener licencias con populate de libro_mira y estudiante
    const licencias = await strapiClient.get<{
      data: any[]
      meta?: any
    }>(
      '/api/licencia-estudiantes?populate[libro_mira][populate][libro][populate][portada_libro]=true&populate[estudiante][populate][persona]=true&populate[estudiante][populate][colegio]=true&sort=createdAt:desc'
    )

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
              id: attributes.libro_mira.data.id,
              documentId: attributes.libro_mira.data.documentId,
              activo: attributes.libro_mira.data.attributes?.activo !== false,
              tiene_omr: attributes.libro_mira.data.attributes?.tiene_omr || false,
              libro: attributes.libro_mira.data.attributes?.libro?.data
                ? {
                    id: attributes.libro_mira.data.attributes.libro.data.id,
                    isbn_libro: attributes.libro_mira.data.attributes.libro.data.attributes?.isbn_libro || '',
                    nombre_libro: attributes.libro_mira.data.attributes.libro.data.attributes?.nombre_libro || '',
                    portada_libro: attributes.libro_mira.data.attributes.libro.data.attributes?.portada_libro?.data
                      ? {
                          url: attributes.libro_mira.data.attributes.libro.data.attributes.portada_libro.data.attributes?.url || '',
                        }
                      : null,
                  }
                : null,
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
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener licencias',
      },
      { status: 500 }
    )
  }
}
