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
          `/api/cursos/${cursoId}?populate=colegio&populate=versiones_materiales`
        )
        const cursoData = response.data?.attributes || response.data
        cursos.push({
          id: cursoId,
          ...cursoData,
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
  debugLog('Generando formato para escolar.cl...')
  
  // Formato específico para escolar.cl
  const rows: string[][] = []
  
  // Headers específicos de escolar.cl
  rows.push([
    'Establecimiento',
    'RBD',
    'Nivel',
    'Curso',
    'Producto',
    'ISBN',
    'Cantidad por Alumno',
    'Total Estudiantes',
    'Total Productos',
  ])

  // Data
  cursos.forEach((curso) => {
    const colegioNombre = colegio?.colegio_nombre || curso.colegio?.data?.attributes?.colegio_nombre || ''
    const colegioRBD = colegio?.rbd || curso.colegio?.data?.attributes?.rbd || ''
    const cursoNombre = curso.nombre_curso || ''
    const nivel = curso.nivel || ''
    const matriculados = curso.matricula || 0 // Campo correcto según Strapi: "matricula"

    const versiones = curso.versiones_materiales || []
    const ultimaVersion = versiones[versiones.length - 1]
    
    if (ultimaVersion) {
      const materiales = ultimaVersion.materiales || []
      
      materiales.forEach((material: any) => {
        const cantidadPorAlumno = material.cantidad || 1
        const totalProductos = cantidadPorAlumno * matriculados
        
        rows.push([
          colegioNombre,
          String(colegioRBD),
          nivel,
          cursoNombre,
          material.nombre || '',
          material.isbn || '',
          String(cantidadPorAlumno),
          String(matriculados),
          String(totalProductos),
        ])
      })
    }
  })

  // Convertir a CSV (escolar.cl usa CSV con formato específico)
  const csvContent = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  // Agregar BOM para Excel UTF-8
  const bom = '\uFEFF'
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })

  return new NextResponse(blob, {
    headers: {
      'Content-Type': 'text/csv;charset=utf-8',
      'Content-Disposition': `attachment; filename="escolar_export_${Date.now()}.csv"`,
    },
  })
}
