/**
 * API Route para importar cantidad de alumnos (matriculados) desde CSV/Excel
 * POST /api/crm/colegios/import-matriculados
 * 
 * Formato esperado del CSV/Excel:
 * - AGNO o AÑO: Año de los datos (ej: 2025)
 * - RBD: RBD del colegio (obligatorio)
 * - NIVEL o ID_NIVEL: Nivel del curso (ej: "5° Básico", "I Medio", o código numérico)
 * - N_ALU: Número total de alumnos en el curso (obligatorio)
 * - N_ALU_GRADO1, N_ALU_GRADO2, etc.: Número de alumnos por grado (opcional, para cursos combinados)
 * - EDUCACIÓN o ENS_BAS_MED: Tipo de enseñanza (Básica, Media)
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutos para procesar archivos grandes
export const runtime = 'nodejs'

const DEBUG = process.env.NODE_ENV === 'development' || process.env.DEBUG_CRM === 'true'
const debugLog = (...args: any[]) => {
  if (DEBUG) {
    console.log(...args)
  }
}

interface MatriculadoRow {
  agno?: number
  año?: number
  rbd?: string | number
  nivel?: string
  id_nivel?: number
  idNivel?: number
  n_alu?: number
  N_ALU?: number
  cantidad_alumnos?: number
  ens_bas_med?: string
  tipo_ensenanza?: string
  educacion?: string
}

/**
 * Mapear nombre de nivel a grado y nivel (reutilizar función similar)
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
    if (idNivel >= 4 && idNivel <= 11) {
      return {
        nivel: 'Basica',
        grado: idNivel - 3 // 4->1, 5->2, 6->3, 7->4, 8->5, 9->6, 10->7, 11->8
      }
    }
    if (idNivel >= 1 && idNivel <= 3) {
      return {
        nivel: 'Basica',
        grado: idNivel
      }
    }
  }
  
  // Parsear desde texto del nivel
  if (nivel.includes('medio')) {
    const matchRomano = nivel.match(/\b([ivxlcdm]+)\s*medio/i)
    if (matchRomano) {
      const romanos: Record<string, number> = { 
        'i': 1, 'ii': 2, 'iii': 3, 'iv': 4,
        '1': 1, '2': 2, '3': 3, '4': 4
      }
      const grado = romanos[matchRomano[1].toLowerCase()] || 1
      return { nivel: 'Media', grado: Math.min(grado, 4) }
    }
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
 * POST /api/crm/colegios/import-matriculados
 * Procesa un archivo CSV/Excel con cantidad de alumnos
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  debugLog('[API /crm/colegios/import-matriculados] 🚀 INICIANDO IMPORTACIÓN DE MATRICULADOS...')

  try {
    const contentType = request.headers.get('content-type') || ''
    debugLog('[API /crm/colegios/import-matriculados] Content-Type recibido:', contentType)
    
    let rawData: any[] = []
    let nombreArchivo = 'archivo_importado'
    
    // Soportar tanto FormData (legacy) como JSON (nuevo método - procesado en cliente)
    if (contentType.includes('application/json')) {
      // Nuevo método: datos ya procesados en el cliente (evita límites de Next.js)
      const body = await request.json()
      rawData = body.datos || []
      nombreArchivo = body.nombreArchivo || 'archivo_importado'
      
      debugLog('[API /crm/colegios/import-matriculados] Datos recibidos como JSON:', {
        nombreArchivo,
        totalFilas: rawData.length,
        columnas: rawData.length > 0 ? Object.keys(rawData[0]).join(', ') : 'N/A',
      })
    } else {
      // Método legacy: procesar FormData (para compatibilidad)
      let formData: FormData
      try {
        formData = await request.formData()
      } catch (formDataError: any) {
        debugLog('[API /crm/colegios/import-matriculados] ❌ Error al parsear FormData:', formDataError)
        return NextResponse.json(
          {
            success: false,
            error: 'Error al procesar el archivo. Por favor, intenta nuevamente. Si el archivo es muy grande, el sistema ahora procesa archivos en el cliente automáticamente.',
          },
          { status: 400 }
        )
      }
      
      const file = formData.get('file') as File | null

      if (!file) {
        return NextResponse.json(
          { success: false, error: 'No se proporcionó ningún archivo' },
          { status: 400 }
        )
      }

      nombreArchivo = file.name

      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'text/csv', // .csv
      ]

      if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
        return NextResponse.json(
          { success: false, error: 'Tipo de archivo no válido. Se aceptan: .xlsx, .xls, .csv' },
          { status: 400 }
        )
      }

      const maxSize = 100 * 1024 * 1024 // 100MB
      if (file.size > maxSize) {
        return NextResponse.json(
          { success: false, error: 'El archivo es demasiado grande. Tamaño máximo: 100MB' },
          { status: 400 }
        )
      }

      debugLog('[API /crm/colegios/import-matriculados] Procesando archivo (método legacy):', {
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
          { success: false, error: 'El archivo no contiene hojas válidas' },
          { status: 400 }
        )
      }

      // Convertir a JSON
      rawData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' })
    }

    if (rawData.length < 1) {
      return NextResponse.json(
        { success: false, error: 'El archivo debe contener al menos una fila de datos' },
        { status: 400 }
      )
    }

    debugLog('[API /crm/colegios/import-matriculados] 📄 Archivo leído:', {
      totalFilasRaw: rawData.length,
      columnasDetectadas: rawData.length > 0 ? Object.keys(rawData[0]) : [],
      primeras3Filas: rawData.slice(0, 3),
    })

    // Normalizar datos
    const matriculadosData: MatriculadoRow[] = rawData.map((row: any) => {
      const añoValue = row.agno || row.AGNO || row.año || row.Año || row.ano || row.ANO
      const año = añoValue ? parseInt(String(añoValue)) : undefined

      const rbdValue = row.rbd || row.RBD
      const rbd = rbdValue ? String(rbdValue).trim() : undefined

      const nivelValue = row.nivel || row.NIVEL
      const nivel = nivelValue ? String(nivelValue).trim() : undefined

      const idNivelValue = row.id_nivel || row.ID_NIVEL || row.idNivel
      const idNivel = idNivelValue ? parseInt(String(idNivelValue)) : undefined

      // N_ALU puede venir como N_ALU, n_alu, cantidad_alumnos, etc.
      const nAluValue = row.N_ALU || row.n_alu || row.cantidad_alumnos || row.Cantidad_Alumnos
      const nAlu = nAluValue ? parseInt(String(nAluValue)) : undefined

      const educacionValue = row.educación || row.EDUCACIÓN || row.educacion || row.EDUCACION || row.ens_bas_med || row.ENS_BAS_MED || row.tipo_ensenanza
      const tipoEnsenanza = educacionValue ? String(educacionValue).trim() : undefined

      return {
        agno: año,
        año: año,
        rbd: rbd,
        nivel: nivel,
        id_nivel: idNivel,
        idNivel: idNivel,
        n_alu: nAlu,
        N_ALU: nAlu,
        cantidad_alumnos: nAlu,
        ens_bas_med: tipoEnsenanza,
        tipo_ensenanza: tipoEnsenanza,
        educacion: tipoEnsenanza,
      }
    })

    debugLog('[API /crm/colegios/import-matriculados] 📊 Datos normalizados:', {
      totalFilasNormalizadas: matriculadosData.length,
      filasConRBD: matriculadosData.filter(r => r.rbd).length,
      filasConAño: matriculadosData.filter(r => r.año).length,
      filasConN_ALU: matriculadosData.filter(r => r.n_alu || r.N_ALU).length,
      filasCompletas: matriculadosData.filter(r => r.rbd && r.año && (r.n_alu || r.N_ALU)).length,
    })

    // Agrupar por RBD y año
    const colegiosMap = new Map<string, Map<number, MatriculadoRow[]>>()

    matriculadosData.forEach((row) => {
      if (!row.rbd || !row.año || (!row.n_alu && !row.N_ALU)) {
        debugLog('[API /crm/colegios/import-matriculados] ⚠️ Fila ignorada por falta de datos:', {
          rbd: row.rbd,
          año: row.año,
          n_alu: row.n_alu || row.N_ALU,
        })
        return
      }

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

    debugLog('[API /crm/colegios/import-matriculados] Datos procesados:', {
      totalFilas: matriculadosData.length,
      colegiosUnicos: colegiosMap.size,
      colegiosConDatos: Array.from(colegiosMap.entries()).map(([rbd, años]) => ({
        rbd,
        años: Array.from(años.keys()),
        totalRegistros: Array.from(años.values()).flat().length,
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

    debugLog('[API /crm/colegios/import-matriculados] Colegios encontrados en Strapi:', {
      total: colegios.length,
      conRBD: rbdToColegioId.size,
    })

    // OPTIMIZACIÓN: Cargar TODOS los cursos de una vez para evitar búsquedas individuales
    debugLog('[API /crm/colegios/import-matriculados] 📥 Cargando todos los cursos de Strapi...')
    const todosLosCursosResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>[]>>(
      '/api/cursos?pagination[pageSize]=10000&publicationState=preview&populate[colegio]=true'
    )
    const todosLosCursos = Array.isArray(todosLosCursosResponse.data) ? todosLosCursosResponse.data : []
    
    // Crear un índice de cursos por colegio, nivel, grado y año para búsqueda rápida
    // Clave: `${colegioId}-${nivel}-${grado}-${año}`
    const cursosIndex = new Map<string, any>()
    todosLosCursos.forEach((curso: any) => {
      const attrs = curso.attributes || curso
      const colegioId = attrs.colegio?.data?.id || attrs.colegio?.id || attrs.colegio
      const nivel = attrs.nivel
      const grado = attrs.grado
      const año = attrs.año || attrs.ano
      const nombreCurso = attrs.nombre_curso || ''
      
      if (colegioId && nivel && grado) {
        // Crear múltiples claves para búsqueda flexible
        if (año) {
          cursosIndex.set(`${colegioId}-${nivel}-${grado}-${año}`, curso)
        }
        // También indexar por nombre de curso que contiene el año
        if (nombreCurso && nombreCurso.includes(String(año))) {
          cursosIndex.set(`${colegioId}-${nivel}-${grado}-${año}`, curso)
        }
        // Clave genérica sin año (por si acaso)
        cursosIndex.set(`${colegioId}-${nivel}-${grado}`, curso)
      }
    })
    
    debugLog('[API /crm/colegios/import-matriculados] ✅ Cursos cargados e indexados:', {
      totalCursos: todosLosCursos.length,
      cursosIndexados: cursosIndex.size,
    })

    // Procesar cada colegio
    const resultados: Array<{
      rbd: string
      colegioId?: number
      año: number
      cursosActualizados: number
      errores: string[]
    }> = []

    const totalColegios = colegiosMap.size
    let colegiosProcesados = 0

    debugLog('[API /crm/colegios/import-matriculados] 📊 Iniciando procesamiento de colegios:', {
      totalColegios,
    })

    for (const [rbd, añosMap] of colegiosMap.entries()) {
      colegiosProcesados++
      
      // Log de progreso cada 10 colegios o al final
      if (colegiosProcesados % 10 === 0 || colegiosProcesados === totalColegios) {
        const porcentaje = ((colegiosProcesados / totalColegios) * 100).toFixed(1)
        debugLog(`[API /crm/colegios/import-matriculados] 📈 Progreso: ${colegiosProcesados}/${totalColegios} colegios procesados (${porcentaje}%)`)
        console.log(`[PROGRESO MATRICULADOS] Colegios: ${colegiosProcesados}/${totalColegios} (${porcentaje}%)`)
      }
      
      const colegioId = rbdToColegioId.get(rbd)

      if (!colegioId) {
        resultados.push({
          rbd,
          año: 0,
          cursosActualizados: 0,
          errores: [`Colegio con RBD ${rbd} no encontrado en Strapi`],
        })
        continue
      }

      for (const [año, matriculados] of añosMap.entries()) {
        const cursosActualizados: number[] = []
        const errores: string[] = []

        // Procesar matriculados en lotes para optimizar velocidad (batch processing)
        const BATCH_SIZE = 10 // Procesar 10 cursos en paralelo
        const matriculadosArray = Array.from(matriculados)
        
        for (let i = 0; i < matriculadosArray.length; i += BATCH_SIZE) {
          const batch = matriculadosArray.slice(i, i + BATCH_SIZE)
          
          // Procesar lote en paralelo
          await Promise.all(
            batch.map(async (matRow) => {
              try {
                const { nivel, grado } = parseNivel(matRow.nivel || '', matRow.id_nivel || matRow.idNivel)
                const cantidadAlumnos = matRow.n_alu || matRow.N_ALU || matRow.cantidad_alumnos || 0

                if (cantidadAlumnos <= 0) {
                  errores.push(`Cantidad de alumnos inválida o cero para RBD ${rbd}, nivel ${matRow.nivel}`)
                  return
                }

                debugLog(`[API /crm/colegios/import-matriculados] 🔄 Procesando matriculados para RBD ${rbd}, año ${año}:`, {
                  nivelOriginal: matRow.nivel,
                  idNivel: matRow.id_nivel || matRow.idNivel,
                  nivelParseado: nivel,
                  gradoParseado: grado,
                  cantidadAlumnos,
                })

                // OPTIMIZACIÓN: Buscar curso en el índice en lugar de hacer llamada a Strapi
                const cursoKey = `${colegioId}-${nivel}-${grado}-${año}`
                let cursoExistente = cursosIndex.get(cursoKey)
                
                // Si no se encuentra con año, intentar sin año
                if (!cursoExistente) {
                  cursoExistente = cursosIndex.get(`${colegioId}-${nivel}-${grado}`)
                  // Verificar que el año coincida si se encontró sin año
                  if (cursoExistente) {
                    const attrs = cursoExistente.attributes || cursoExistente
                    const cursoAño = attrs.año || attrs.ano
                    const nombreCurso = attrs.nombre_curso || ''
                    if (cursoAño !== año && !nombreCurso.includes(String(año))) {
                      cursoExistente = undefined
                    }
                  }
                }
                
                if (cursoExistente) {
                  // Actualizar curso existente con cantidad de alumnos
                  const cursoId = cursoExistente.id || cursoExistente.documentId
                  
                  const updateData: any = {
                    data: {
                      cantidad_alumnos: cantidadAlumnos,
                    },
                  }

                  try {
                    await strapiClient.put<StrapiResponse<StrapiEntity<any>>>(
                      `/api/cursos/${cursoId}`,
                      updateData
                    )

                    cursosActualizados.push(cursoId)
                    debugLog(`[API /crm/colegios/import-matriculados] ✅ Matriculados actualizados: ${cantidadAlumnos} alumnos para curso (ID: ${cursoId}) RBD ${rbd}, año ${año}, ${grado}º ${nivel}`)
                  } catch (updateError: any) {
                    const errorMsg = `Error al actualizar matriculados para curso ${grado}º ${nivel} ${año}: ${updateError.message || 'Error desconocido'}`
                    errores.push(errorMsg)
                    debugLog(`[API /crm/colegios/import-matriculados] ❌ Error al actualizar curso para RBD ${rbd}, año ${año}:`, updateError)
                  }
                } else {
                  // Curso no encontrado - no es error crítico, solo informativo
                  debugLog(`[API /crm/colegios/import-matriculados] ⚠️ Curso no encontrado para RBD ${rbd}, año ${año}, ${grado}º ${nivel}. Se puede crear primero con la importación de niveles.`)
                  errores.push(`Curso no encontrado: ${grado}º ${nivel} ${año}. Crea el curso primero con la importación de niveles.`)
                }
              } catch (error: any) {
                const errorMsg = `Error procesando matriculados ${matRow.nivel} (ID: ${matRow.id_nivel}): ${error.message}`
                errores.push(errorMsg)
                debugLog(`[API /crm/colegios/import-matriculados] ❌ Error procesando matriculados para colegio RBD ${rbd} año ${año}:`, {
                  error: error.message,
                  stack: error.stack,
                  matRow,
                })
              }
            })
          )
        }

        resultados.push({
          rbd,
          colegioId,
          año,
          cursosActualizados: cursosActualizados.length,
          errores,
        })
      }
    }

    const totalCursosActualizados = resultados.reduce((sum, r) => sum + r.cursosActualizados, 0)
    const totalErrores = resultados.reduce((sum, r) => sum + r.errores.length, 0)
    const tiempoTotal = ((Date.now() - startTime) / 1000).toFixed(2)

    debugLog('[API /crm/colegios/import-matriculados] ✅✅✅ IMPORTACIÓN COMPLETADA ✅✅✅', {
      totalColegios: colegiosMap.size,
      totalCursosActualizados,
      totalErrores,
      tiempoTotal: `${tiempoTotal}s`,
      resultadosPorColegio: resultados.length,
    })

    return NextResponse.json({
      success: true,
      data: {
        resultados,
        resumen: {
          totalColegios: colegiosMap.size,
          totalCursosActualizados,
          totalErrores,
        },
      },
    }, { status: 200 })
  } catch (error: any) {
    debugLog('[API /crm/colegios/import-matriculados] ❌ Error general:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
