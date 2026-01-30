/**
 * API Route para importar niveles, asignaturas y cantidad de alumnos desde CSV/Excel
 * POST /api/crm/colegios/import-niveles-asignaturas
 * 
 * Formato esperado del CSV/Excel:
 * - AGNO: Año de los datos
 * - RBD: RBD del colegio (conector con content type Colegios)
 * - Nivel: Nombre del nivel (ej: "I Medio", "II Medio", "III Medio", "IV Medio")
 * - ID_NIVEL: Código numérico del nivel (12=I Medio, 13=II Medio, 14=III Medio, 15=IV Medio)
 * - ENS_BAS_MED: Tipo de enseñanza (Media, Básica)
 * - CICLO: Ciclo educativo (Educación Media, Educación Básica)
 * - Asignatura: Nombre de la asignatura (opcional, puede venir en otro archivo)
 * - Cantidad_Alumnos: Cantidad de alumnos (opcional, puede venir en otro archivo)
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

const DEBUG = process.env.NODE_ENV === 'development' || process.env.DEBUG_CRM === 'true'
const debugLog = (...args: any[]) => {
  if (DEBUG) {
    console.log(...args)
  }
}

interface NivelRow {
  agno?: number
  año?: number
  rbd?: string | number
  nivel?: string
  id_nivel?: number
  idNivel?: number
  ens_bas_med?: string
  tipo_ensenanza?: string
  ciclo?: string
  asignatura?: string
  cantidad_alumnos?: number
  cantidadAlumnos?: number
}

/**
 * Mapear nombre de nivel a grado y nivel
 * 
 * ID_NIVEL según MINEDUC:
 * - 1-3: Pre-básica (no se usa en este contexto)
 * - 4-7: 1° a 4° Básico (Primer Ciclo)
 * - 8-11: 5° a 8° Básico (Segundo Ciclo)
 * - 12-15: I a IV Medio
 */
function parseNivel(nivelStr: string, idNivel?: number): { nivel: 'Basica' | 'Media', grado: number } {
  const nivel = String(nivelStr || '').trim().toLowerCase()
  
  // Si tenemos ID_NIVEL, usarlo como referencia (más confiable)
  if (idNivel) {
    // Media: 12=I Medio, 13=II Medio, 14=III Medio, 15=IV Medio
    if (idNivel >= 12 && idNivel <= 15) {
      return {
        nivel: 'Media',
        grado: idNivel - 11 // 12->1, 13->2, 14->3, 15->4
      }
    }
    // Básica según ID_NIVEL de MINEDUC:
    // ID_NIVEL 4 = 1° Básico, 5 = 2° Básico, 6 = 3° Básico, 7 = 4° Básico
    // ID_NIVEL 8 = 5° Básico, 9 = 6° Básico, 10 = 7° Básico, 11 = 8° Básico
    if (idNivel >= 4 && idNivel <= 11) {
      return {
        nivel: 'Basica',
        grado: idNivel - 3 // 4->1, 5->2, 6->3, 7->4, 8->5, 9->6, 10->7, 11->8
      }
    }
    // Si es 1-3, asumir que es básica (aunque normalmente es pre-básica)
    if (idNivel >= 1 && idNivel <= 3) {
      return {
        nivel: 'Basica',
        grado: idNivel
      }
    }
  }
  
  // Parsear desde texto del nivel (ej: "1° Básico", "7° Básico", "I Medio", "II Medio")
  if (nivel.includes('medio')) {
    // Intentar extraer el número romano primero (más común en Media)
    // Buscar patrones como "I Medio", "II Medio", "III Medio", "IV Medio"
    const matchRomano = nivel.match(/\b([ivxlcdm]+)\s*medio/i) // I, II, III, IV seguido de "medio"
    if (matchRomano) {
      const romanos: Record<string, number> = { 
        'i': 1, 
        'ii': 2, 
        'iii': 3, 
        'iv': 4,
        '1': 1, // Por si acaso viene como "1 Medio"
        '2': 2,
        '3': 3,
        '4': 4
      }
      const grado = romanos[matchRomano[1].toLowerCase()] || 1
      return { nivel: 'Media', grado: Math.min(grado, 4) }
    }
    // Si no hay romano, buscar número arábigo
    const match = nivel.match(/(\d+)/)
    const grado = match ? parseInt(match[1]) : 1
    return { nivel: 'Media', grado: Math.min(grado, 4) }
  }
  
  if (nivel.includes('basica') || nivel.includes('básica')) {
    const match = nivel.match(/(\d+)/)
    const grado = match ? parseInt(match[1]) : 1
    return { nivel: 'Basica', grado: Math.min(grado, 8) }
  }
  
  // Default
  return { nivel: 'Basica', grado: 1 }
}

/**
 * POST /api/crm/colegios/import-niveles-asignaturas
 * Procesa un archivo CSV/Excel con niveles y asignaturas
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se proporcionó ningún archivo',
        },
        { status: 400 }
      )
    }

    // Validar tipo de archivo
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
    ]

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tipo de archivo no válido. Se aceptan: .xlsx, .xls, .csv',
        },
        { status: 400 }
      )
    }

    debugLog('[API /crm/colegios/import-niveles-asignaturas] Procesando archivo:', {
      nombre: file.name,
      tipo: file.type,
      tamaño: file.size,
    })

    // Leer archivo
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]

    if (!worksheet) {
      return NextResponse.json(
        {
          success: false,
          error: 'El archivo no contiene hojas válidas',
        },
        { status: 400 }
      )
    }

    // Convertir a JSON
    const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' })

    if (rawData.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: 'El archivo debe contener al menos una fila de datos',
        },
        { status: 400 }
      )
    }

    // Normalizar datos - soportar múltiples formatos de columnas
    const nivelesData: NivelRow[] = rawData.map((row: any) => {
      // Año: soportar AÑO (con tilde), AGNO, año, ano
      const añoValue = row.año || row.AÑO || row.agno || row.AGNO || row.ano || row.ANO
      const año = añoValue ? parseInt(String(añoValue)) : undefined

      // RBD: soportar RBD, rbd
      const rbdValue = row.rbd || row.RBD
      const rbd = rbdValue ? String(rbdValue).trim() : undefined

      // Nivel: soportar NIVEL, nivel
      const nivelValue = row.nivel || row.NIVEL
      const nivel = nivelValue ? String(nivelValue).trim() : undefined

      // ID_NIVEL: soportar ID_NIVEL, id_nivel, idNivel
      const idNivelValue = row.id_nivel || row.ID_NIVEL || row.idNivel
      const idNivel = idNivelValue ? parseInt(String(idNivelValue)) : undefined

      // Tipo de enseñanza: soportar EDUCACIÓN, ENS_BAS_MED, tipo_ensenanza
      const educacionValue = row.educación || row.EDUCACIÓN || row.educacion || row.EDUCACION || row.ens_bas_med || row.ENS_BAS_MED || row.tipo_ensenanza
      const tipoEnsenanza = educacionValue ? String(educacionValue).trim() : undefined

      // Ciclo: soportar CICLO, ciclo
      const cicloValue = row.ciclo || row.CICLO
      const ciclo = cicloValue ? String(cicloValue).trim() : undefined

      // Asignatura (opcional): soportar asignatura, Asignatura, nom_subsector
      const asignaturaValue = row.asignatura || row.Asignatura || row.nom_subsector || row.NOM_SUBSECTOR
      const asignatura = asignaturaValue ? String(asignaturaValue).trim() : undefined

      // Cantidad de alumnos (opcional)
      const cantidadAlumnosValue = row.cantidad_alumnos || row.Cantidad_Alumnos || row.cantidadAlumnos
      const cantidadAlumnos = cantidadAlumnosValue ? parseInt(String(cantidadAlumnosValue)) : undefined

      return {
        agno: año,
        año: año,
        rbd: rbd,
        nivel: nivel,
        id_nivel: idNivel,
        idNivel: idNivel,
        ens_bas_med: tipoEnsenanza,
        tipo_ensenanza: tipoEnsenanza,
        ciclo: ciclo,
        asignatura: asignatura,
        cantidad_alumnos: cantidadAlumnos,
        cantidadAlumnos: cantidadAlumnos,
      }
    })

    // Agrupar por RBD y año
    const colegiosMap = new Map<string, Map<number, NivelRow[]>>()

    nivelesData.forEach((row) => {
      if (!row.rbd || !row.año) return

      const rbd = String(row.rbd)
      if (!colegiosMap.has(rbd)) {
        colegiosMap.set(rbd, new Map())
      }

      const añosMap = colegiosMap.get(rbd)!
      if (!añosMap.has(row.año)) {
        añosMap.set(row.año, [])
      }

      añosMap.get(row.año)!.push(row)
    })

    debugLog('[API /crm/colegios/import-niveles-asignaturas] Datos procesados:', {
      totalFilas: nivelesData.length,
      colegiosUnicos: colegiosMap.size,
      colegiosConDatos: Array.from(colegiosMap.entries()).map(([rbd, años]) => ({
        rbd,
        años: Array.from(años.keys()),
        totalNiveles: Array.from(años.values()).flat().length,
      })),
    })

    // Obtener todos los colegios de Strapi para mapear RBD a ID
    const colegiosResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>[]>>(
      '/api/colegios?pagination[pageSize]=10000&publicationState=preview'
    )

    const colegios = Array.isArray(colegiosResponse.data) ? colegiosResponse.data : []
    const rbdToColegioId = new Map<string, number>()

    colegios.forEach((colegio: any) => {
      const attrs = (colegio as any)?.attributes || colegio
      const rbd = attrs?.rbd || colegio?.rbd
      if (rbd) {
        const colegioId = colegio.id || colegio.documentId
        if (colegioId) {
          rbdToColegioId.set(String(rbd), colegioId)
        }
      }
    })

    debugLog('[API /crm/colegios/import-niveles-asignaturas] Colegios encontrados en Strapi:', {
      total: colegios.length,
      conRBD: rbdToColegioId.size,
    })

    // Procesar cada colegio
    const resultados: Array<{
      rbd: string
      colegioId?: number
      año: number
      cursosCreados: number
      cursosActualizados: number
      errores: string[]
    }> = []

    for (const [rbd, añosMap] of colegiosMap.entries()) {
      const colegioId = rbdToColegioId.get(rbd)

      if (!colegioId) {
        resultados.push({
          rbd,
          año: 0,
          cursosCreados: 0,
          cursosActualizados: 0,
          errores: [`Colegio con RBD ${rbd} no encontrado en Strapi`],
        })
        continue
      }

      for (const [año, niveles] of añosMap.entries()) {
        const cursosCreados: number[] = []
        const cursosActualizados: number[] = []
        const errores: string[] = []

        for (const nivelRow of niveles) {
          try {
            const { nivel, grado } = parseNivel(nivelRow.nivel || '', nivelRow.id_nivel || nivelRow.idNivel)
            const nombreCurso = `${grado}º ${nivel === 'Media' ? 'Media' : 'Básico'}`

            // Buscar si el curso ya existe
            // Nota: Strapi puede no tener filtro directo por año, así que filtramos por colegio, nivel y grado
            const cursosResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>[]>>(
              `/api/cursos?filters[colegio][id][$eq]=${colegioId}&filters[nivel][$eq]=${nivel}&filters[grado][$eq]=${grado}&publicationState=preview`
            )

            const cursosExistentes = Array.isArray(cursosResponse.data) ? cursosResponse.data : []
            
            // Filtrar por año también (ya que Strapi puede no filtrar por año directamente)
            const cursoExistente = cursosExistentes.find((curso: any) => {
              const attrs = (curso as any)?.attributes || curso
              const cursoAño = attrs.año || attrs.ano
              return cursoAño === año
            })
            
            let cursoId: number | undefined

            if (cursoExistente && !Array.isArray(cursoExistente)) {
              // Actualizar curso existente
              cursoId = (cursoExistente as any).id || (cursoExistente as any).documentId
              
              const updateData: any = {
                nombre_curso: nombreCurso,
                nivel,
                grado,
                // Nota: año no se puede actualizar directamente en Strapi según el código existente
              }

              // Usar la API de cursos para actualizar
              const updateResponse = await fetch(`/api/crm/cursos/${cursoId}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData),
              })

              if (!updateResponse.ok) {
                const errorData = await updateResponse.json()
                throw new Error(errorData.error || 'Error al actualizar curso')
              }

              cursosActualizados.push(cursoId)
              debugLog(`[API] ✅ Curso actualizado: ${nombreCurso} (ID: ${cursoId})`)
            } else {
              // Crear nuevo curso usando la API de colegios
              const createData: any = {
                nombre_curso: nombreCurso,
                nivel,
                grado,
                año,
                activo: true,
              }

              const createResponse = await fetch(`/api/crm/colegios/${colegioId}/cursos`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(createData),
              })

              const createResult = await createResponse.json()

              if (createResult.success && createResult.data) {
                const nuevoCurso = Array.isArray(createResult.data) ? createResult.data[0] : createResult.data
                cursoId = nuevoCurso?.id || nuevoCurso?.documentId

                if (cursoId) {
                  cursosCreados.push(cursoId)
                  debugLog(`[API] ✅ Curso creado: ${nombreCurso} (ID: ${cursoId})`)
                } else {
                  errores.push(`No se pudo obtener ID del curso creado: ${nombreCurso}`)
                }
              } else {
                errores.push(`Error al crear curso ${nombreCurso}: ${createResult.error || 'Error desconocido'}`)
              }
            }
          } catch (error: any) {
            errores.push(`Error procesando nivel ${nivelRow.nivel}: ${error.message}`)
            debugLog(`[API] ❌ Error:`, error)
          }
        }

        resultados.push({
          rbd,
          colegioId,
          año,
          cursosCreados: cursosCreados.length,
          cursosActualizados: cursosActualizados.length,
          errores,
        })
      }
    }

    const totalCursosCreados = resultados.reduce((sum, r) => sum + r.cursosCreados, 0)
    const totalCursosActualizados = resultados.reduce((sum, r) => sum + r.cursosActualizados, 0)
    const totalErrores = resultados.reduce((sum, r) => sum + r.errores.length, 0)

    return NextResponse.json({
      success: true,
      data: {
        resultados,
        resumen: {
          totalColegios: colegiosMap.size,
          totalCursosCreados,
          totalCursosActualizados,
          totalErrores,
        },
      },
    }, { status: 200 })
  } catch (error: any) {
    debugLog('[API /crm/colegios/import-niveles-asignaturas] ❌ Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al procesar el archivo',
      },
      { status: 500 }
    )
  }
}
