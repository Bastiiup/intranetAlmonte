/**
 * API Route para exportar listas de cursos seleccionados
 * POST /api/crm/listas/exportar-cursos
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

const DEBUG = true
const debugLog = (...args: any[]) => {
  if (DEBUG) {
    console.log('[API /api/crm/listas/exportar-cursos]', ...args)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cursosIds, colegioId, formato = 'csv' } = body

    debugLog('Exportando cursos:', { cursosIds, colegioId, formato })

    if (!cursosIds || !Array.isArray(cursosIds) || cursosIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Se requiere al menos un curso' },
        { status: 400 }
      )
    }

    // Obtener información del colegio
    let colegio: any = null
    if (colegioId) {
      try {
        const colegioResponse = await strapiClient.get<any>(`/api/colegios/${colegioId}?populate=*`)
        colegio = colegioResponse.data?.attributes || colegioResponse.data
      } catch (err) {
        debugLog('Error al obtener colegio:', err)
      }
    }

    // Obtener todos los cursos con sus versiones_materiales
    const cursos: any[] = []
    for (const cursoId of cursosIds) {
      try {
        const response = await strapiClient.get<any>(
          `/api/cursos/${cursoId}?populate=colegio&publicationState=preview`
        )
        const cursoData = response.data?.attributes || response.data
        // Asegurar que versiones_materiales esté presente
        const versiones = cursoData.versiones_materiales || []
        cursos.push({
          id: cursoId,
          ...cursoData,
          versiones_materiales: versiones, // Asegurar que esté presente
        })
        debugLog('Curso obtenido:', {
          id: cursoId,
          nombre: cursoData.nombre_curso,
          versiones: versiones.length,
          versionesActivas: versiones.filter((v: any) => v.activo !== false).length,
        })
      } catch (err) {
        debugLog('Error al obtener curso:', cursoId, err)
      }
    }

    debugLog('Cursos obtenidos:', cursos.length)

    if (formato === 'csv') {
      return exportarCSV(cursos, colegio)
    } else if (formato === 'escolar') {
      return exportarEscolar(cursos, colegio)
    } else {
      return NextResponse.json(
        { success: false, error: 'Formato no soportado' },
        { status: 400 }
      )
    }
  } catch (error: any) {
    debugLog('Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al exportar cursos',
      },
      { status: 500 }
    )
  }
}

function exportarCSV(cursos: any[], colegio: any) {
  debugLog('Generando CSV con formato de plantilla completa...')
  
  const rows: string[][] = []
  
  // Headers según la plantilla
  rows.push([
    'Colegio',
    'RBD',
    'Comuna',
    'Orden_colegio',
    'Curso',
    'Año_curso',
    'Orden_curso',
    'Asignatura',
    'Orden_asignatura',
    'Lista_nombre',
    'Año_lista',
    'Fecha_actualizacion',
    'Fecha_publicacion',
    'URL_lista',
    'URL_publicacion',
    'Orden_lista',
    'Libro_nombre',
    'Libro_codigo',
    'Libro_isbn',
    'Libro_autor',
    'Libro_editorial',
    'Libro_orden',
    'Libro_cantidad',
    'Libro_observaciones',
    'Libro_mes_uso',
  ])

  // Data
  cursos.forEach((curso, cursoIdx) => {
    const colegioNombre = colegio?.colegio_nombre || curso.colegio?.data?.attributes?.colegio_nombre || ''
    const colegioRBD = colegio?.rbd || curso.colegio?.data?.attributes?.rbd || ''
    const colegioComuna = colegio?.comuna?.comuna_nombre || 
                          curso.colegio?.data?.attributes?.comuna?.data?.attributes?.comuna_nombre || 
                          ''
    const cursoNombre = curso.nombre_curso || ''
    const año = curso.anio || curso.año || new Date().getFullYear()

    const versiones = curso.versiones_materiales || []
    
    versiones.forEach((version: any, versionIdx: number) => {
      const materiales = version.materiales || []
      const listaNombre = version.nombre || `Lista de Útiles ${año}`
      const fechaActualizacion = version.fecha_actualizacion || curso.updatedAt || ''
      const fechaPublicacion = version.fecha_publicacion || curso.publishedAt || ''
      const urlLista = version.pdf_url || ''
      const urlPublicacion = version.url_publicacion || ''
      
      // Agrupar por asignatura
      const materialesPorAsignatura = new Map<string, any[]>()
      
      materiales.forEach((material: any) => {
        const asignatura = material.asignatura || 'General'
        if (!materialesPorAsignatura.has(asignatura)) {
          materialesPorAsignatura.set(asignatura, [])
        }
        materialesPorAsignatura.get(asignatura)!.push(material)
      })

      // Si no hay materiales, crear una fila vacía
      if (materiales.length === 0) {
        rows.push([
          colegioNombre,
          String(colegioRBD),
          colegioComuna,
          String(1), // Orden_colegio
          cursoNombre,
          String(año),
          String(cursoIdx + 1), // Orden_curso
          '', // Asignatura
          '', // Orden_asignatura
          listaNombre,
          String(año),
          fechaActualizacion ? new Date(fechaActualizacion).toISOString().split('T')[0] : '',
          fechaPublicacion ? new Date(fechaPublicacion).toISOString().split('T')[0] : '',
          urlLista,
          urlPublicacion,
          String(versionIdx + 1), // Orden_lista
          '', // Libro_nombre
          '', // Libro_codigo
          '', // Libro_isbn
          '', // Libro_autor
          '', // Libro_editorial
          '', // Libro_orden
          '', // Libro_cantidad
          '', // Libro_observaciones
          '', // Libro_mes_uso
        ])
      } else {
        // Procesar por asignatura
        let asignaturaIdx = 0
        materialesPorAsignatura.forEach((materialesAsignatura, asignatura) => {
          asignaturaIdx++
          
          materialesAsignatura.forEach((material: any, materialIdx: number) => {
            rows.push([
              colegioNombre,
              String(colegioRBD),
              colegioComuna,
              String(1), // Orden_colegio
              cursoNombre,
              String(año),
              String(cursoIdx + 1), // Orden_curso
              asignatura,
              String(asignaturaIdx), // Orden_asignatura
              listaNombre,
              String(año),
              fechaActualizacion ? new Date(fechaActualizacion).toISOString().split('T')[0] : '',
              fechaPublicacion ? new Date(fechaPublicacion).toISOString().split('T')[0] : '',
              urlLista,
              urlPublicacion,
              String(versionIdx + 1), // Orden_lista
              material.nombre || '',
              material.codigo || '',
              material.isbn || '',
              material.autor || '',
              material.editorial || '',
              String(material.orden || materialIdx + 1), // Libro_orden
              String(material.cantidad || 1),
              material.observaciones || '',
              material.mes_uso || '',
            ])
          })
        })
      }
    })
  })

  // Convertir a CSV
  const csvContent = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  // Agregar BOM para Excel UTF-8
  const bom = '\uFEFF'
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })

  return new NextResponse(blob, {
    headers: {
      'Content-Type': 'text/csv;charset=utf-8',
      'Content-Disposition': `attachment; filename="listas_export_${Date.now()}.csv"`,
    },
  })
}

function exportarEscolar(cursos: any[], colegio: any) {
  debugLog('Generando formato para escolar.cl (mismo formato que CSV)...')
  
  // Usar el mismo formato que exportarCSV pero en Excel
  const rows: string[][] = []
  
  // Headers según la plantilla (igual que CSV, agregando URL ORIGINAL)
  rows.push([
    'Colegio',
    'RBD',
    'Comuna',
    'Orden_colegio',
    'Curso',
    'Año_curso',
    'Orden_curso',
    'Asignatura',
    'Orden_asignatura',
    'Lista_nombre',
    'Año_lista',
    'Fecha_actualizacion',
    'Fecha_publicacion',
    'URL_lista',
    'URL_publicacion',
    'URL ORIGINAL', // Campo agregado
    'Orden_lista',
    'Libro_nombre',
    'Libro_codigo',
    'Libro_isbn',
    'Libro_autor',
    'Libro_editorial',
    'Libro_orden',
    'Libro_cantidad',
    'Libro_observaciones',
    'Libro_mes_uso',
  ])

  // Data (igual que CSV pero filtrando solo versiones activas)
  cursos.forEach((curso, cursoIdx) => {
    const colegioNombre = colegio?.colegio_nombre || curso.colegio?.data?.attributes?.colegio_nombre || ''
    const colegioRBD = colegio?.rbd || curso.colegio?.data?.attributes?.rbd || ''
    const colegioComuna = colegio?.comuna?.comuna_nombre || 
                          curso.colegio?.data?.attributes?.comuna?.data?.attributes?.comuna_nombre || 
                          ''
    const cursoNombre = curso.nombre_curso || ''
    const año = curso.anio || curso.año || new Date().getFullYear()

    const versiones = curso.versiones_materiales || []
    // Filtrar solo versiones activas
    const versionesActivas = versiones.filter((v: any) => v.activo !== false)
    // Ordenar por fecha y procesar solo las activas
    const versionesOrdenadas = [...versionesActivas].sort((a: any, b: any) => {
      const fechaA = new Date(a.fecha_actualizacion || a.fecha_subida || 0).getTime()
      const fechaB = new Date(b.fecha_actualizacion || b.fecha_subida || 0).getTime()
      return fechaB - fechaA
    })
    
    versionesOrdenadas.forEach((version: any, versionIdx: number) => {
      const materiales = version.materiales || []
      const listaNombre = version.nombre || `Lista de Útiles ${año}`
      const fechaActualizacion = version.fecha_actualizacion || curso.updatedAt || ''
      const fechaPublicacion = version.fecha_publicacion || curso.publishedAt || ''
      const urlLista = version.pdf_url || ''
      const urlPublicacion = version.url_publicacion || ''
      // Obtener URL ORIGINAL de la versión (puede estar en metadata.url_original)
      const urlOriginal = version.metadata?.url_original || version.url_original || ''
      
      // Agrupar por asignatura
      const materialesPorAsignatura = new Map<string, any[]>()
      
      materiales.forEach((material: any) => {
        const asignatura = material.asignatura || 'General'
        if (!materialesPorAsignatura.has(asignatura)) {
          materialesPorAsignatura.set(asignatura, [])
        }
        materialesPorAsignatura.get(asignatura)!.push(material)
      })

      // Si no hay materiales, crear una fila vacía
      if (materiales.length === 0) {
        rows.push([
          colegioNombre,
          String(colegioRBD),
          colegioComuna,
          String(1), // Orden_colegio
          cursoNombre,
          String(año),
          String(cursoIdx + 1), // Orden_curso
          '', // Asignatura
          '', // Orden_asignatura
          listaNombre,
          String(año),
          fechaActualizacion ? new Date(fechaActualizacion).toISOString().split('T')[0] : '',
          fechaPublicacion ? new Date(fechaPublicacion).toISOString().split('T')[0] : '',
          urlLista,
          urlPublicacion,
          urlOriginal, // URL ORIGINAL agregada
          String(versionIdx + 1), // Orden_lista
          '', // Libro_nombre
          '', // Libro_codigo
          '', // Libro_isbn
          '', // Libro_autor
          '', // Libro_editorial
          '', // Libro_orden
          '', // Libro_cantidad
          '', // Libro_observaciones
          '', // Libro_mes_uso
        ])
      } else {
        // Procesar por asignatura
        let asignaturaIdx = 0
        materialesPorAsignatura.forEach((materialesAsignatura, asignatura) => {
          asignaturaIdx++
          
          materialesAsignatura.forEach((material: any, materialIdx: number) => {
            rows.push([
              colegioNombre,
              String(colegioRBD),
              colegioComuna,
              String(1), // Orden_colegio
              cursoNombre,
              String(año),
              String(cursoIdx + 1), // Orden_curso
              asignatura,
              String(asignaturaIdx), // Orden_asignatura
              listaNombre,
              String(año),
              fechaActualizacion ? new Date(fechaActualizacion).toISOString().split('T')[0] : '',
              fechaPublicacion ? new Date(fechaPublicacion).toISOString().split('T')[0] : '',
              urlLista,
              urlPublicacion,
              urlOriginal, // URL ORIGINAL agregada
              String(versionIdx + 1), // Orden_lista
              material.nombre || '',
              material.codigo || '',
              material.isbn || '',
              material.autor || '',
              material.editorial || '',
              String(material.orden || materialIdx + 1), // Libro_orden
              String(material.cantidad || 1),
              material.observaciones || '',
              material.mes_uso || '',
            ])
          })
        })
      }
    })
  })

  // Convertir a CSV (UTF-8 sin BOM)
  const csvContent = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })

  return new NextResponse(blob, {
    headers: {
      'Content-Type': 'text/csv;charset=utf-8',
      'Content-Disposition': `attachment; filename="escolar_export_${Date.now()}.csv"`,
    },
  })
}
