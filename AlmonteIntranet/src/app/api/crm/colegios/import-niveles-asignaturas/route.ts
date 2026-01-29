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
export const maxDuration = 300 // 5 minutos para procesar archivos grandes
export const runtime = 'nodejs'

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
  // Campos para nombre de colegio
  nombre_colegio?: string
  colegio_nombre?: string
  nombre?: string
}

/**
 * Convertir número a romano (para Media: 1->I, 2->II, 3->III, 4->IV)
 */
function numeroARomano(num: number): string {
  const romanos: Record<number, string> = {
    1: 'I',
    2: 'II',
    3: 'III',
    4: 'IV',
  }
  return romanos[num] || String(num)
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
  const startTime = Date.now()
  try {
    debugLog('[API /crm/colegios/import-niveles-asignaturas] 🚀 INICIANDO IMPORTACIÓN...')
    
    // Verificar content-type primero
    const contentType = request.headers.get('content-type') || ''
    debugLog('[API /crm/colegios/import-niveles-asignaturas] Content-Type recibido:', contentType)
    
    let formData: FormData
    try {
      // Intentar parsear FormData con timeout
      formData = await Promise.race([
        request.formData(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout al leer el archivo. El archivo puede ser demasiado grande.')), 60000)
        )
      ])
    } catch (formDataError: any) {
      debugLog('[API /crm/colegios/import-niveles-asignaturas] ❌ Error al parsear FormData:', {
        message: formDataError.message,
        name: formDataError.name,
        stack: formDataError.stack,
      })
      
      // Mensaje más específico según el tipo de error
      let errorMessage = 'No se pudo leer el archivo.'
      if (formDataError.message?.includes('Timeout')) {
        errorMessage = 'El archivo es demasiado grande o la conexión es lenta. Intenta con un archivo más pequeño o divide el archivo en partes.'
      } else if (formDataError.message?.includes('Failed to parse')) {
        errorMessage = 'El archivo excede el límite de tamaño permitido por el servidor. El límite máximo es 100MB, pero archivos muy grandes pueden requerir procesamiento en partes.'
      } else {
        errorMessage = formDataError.message || 'Verifica que el archivo no esté corrupto y que no exceda el tamaño máximo.'
      }
      
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: 400 }
      )
    }
    
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

    // Validar tamaño (max 100MB)
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: 'El archivo es demasiado grande. Tamaño máximo: 100MB',
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

    debugLog('[API /crm/colegios/import-niveles-asignaturas] 📄 Archivo leído:', {
      totalFilas: rawData.length,
      columnas: rawData.length > 0 ? Object.keys(rawData[0]).join(', ') : 'N/A',
      primeras3Filas: rawData.slice(0, 3),
    })

    if (rawData.length < 1) {
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

      // Nombre de colegio (opcional): soportar nombre_colegio, NOMBRE_COLEGIO, colegio_nombre, COLEGIO_NOMBRE, nombre, NOMBRE
      const nombreColegioValue = row.nombre_colegio || row.NOMBRE_COLEGIO || row.colegio_nombre || 
                                 row.COLEGIO_NOMBRE || row.nombre || row.NOMBRE || row.Nombre || row.Colegio
      const nombreColegio = nombreColegioValue ? String(nombreColegioValue).trim() : undefined

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
        nombre_colegio: nombreColegio,
        colegio_nombre: nombreColegio,
        nombre: nombreColegio,
      }
    })

    debugLog('[API /crm/colegios/import-niveles-asignaturas] 📊 Datos normalizados:', {
      totalFilasNormalizadas: nivelesData.length,
      filasConRBD: nivelesData.filter(r => r.rbd).length,
      filasConAño: nivelesData.filter(r => r.año).length,
      filasCompletas: nivelesData.filter(r => r.rbd && r.año).length,
      ejemplosNormalizados: nivelesData.slice(0, 5).map(r => ({
        rbd: r.rbd,
        año: r.año,
        nivel: r.nivel,
        id_nivel: r.id_nivel,
        ens_bas_med: r.ens_bas_med,
      })),
    })

    // Agrupar por RBD y año, y extraer nombres de colegios
    const colegiosMap = new Map<string, Map<number, NivelRow[]>>()
    const rbdToNombreColegio = new Map<string, string>() // Mapa RBD -> nombre_colegio del archivo

    nivelesData.forEach((row) => {
      if (!row.rbd || !row.año) {
        debugLog('[API /crm/colegios/import-niveles-asignaturas] ⚠️ Fila ignorada por falta de RBD o Año:', {
          rbd: row.rbd,
          año: row.año,
          nivel: row.nivel,
        })
        return
      }

      const rbd = String(row.rbd)
      
      // Si esta fila tiene nombre_colegio y aún no lo tenemos para este RBD, guardarlo
      if (row.nombre_colegio && !rbdToNombreColegio.has(rbd)) {
        rbdToNombreColegio.set(rbd, row.nombre_colegio)
      }
      
      if (!colegiosMap.has(rbd)) {
        colegiosMap.set(rbd, new Map())
      }

      const añosMap = colegiosMap.get(rbd)!
      if (!añosMap.has(row.año)) {
        añosMap.set(row.año, [])
      }

      añosMap.get(row.año)!.push(row)
    })
    
    debugLog('[API /crm/colegios/import-niveles-asignaturas] 📊 Nombres de colegios extraídos del archivo:', {
      totalNombres: rbdToNombreColegio.size,
      ejemplos: Array.from(rbdToNombreColegio.entries()).slice(0, 5),
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

    // OPTIMIZACIÓN: Cargar TODOS los cursos de una vez para evitar búsquedas individuales
    debugLog('[API /crm/colegios/import-niveles-asignaturas] 📥 Cargando todos los cursos de Strapi...')
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
    
    debugLog('[API /crm/colegios/import-niveles-asignaturas] ✅ Cursos cargados e indexados:', {
      totalCursos: todosLosCursos.length,
      cursosIndexados: cursosIndex.size,
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

    const totalColegios = colegiosMap.size
    let colegiosProcesados = 0

    debugLog('[API /crm/colegios/import-niveles-asignaturas] 📊 Iniciando procesamiento de colegios:', {
      totalColegios,
      totalAños: Array.from(colegiosMap.values()).reduce((sum, añosMap) => sum + añosMap.size, 0),
    })

    for (const [rbd, añosMap] of colegiosMap.entries()) {
      colegiosProcesados++
      
      // Log de progreso cada 10 colegios o al final
      if (colegiosProcesados % 10 === 0 || colegiosProcesados === totalColegios) {
        const porcentaje = ((colegiosProcesados / totalColegios) * 100).toFixed(1)
        debugLog(`[API /crm/colegios/import-niveles-asignaturas] 📈 Progreso: ${colegiosProcesados}/${totalColegios} colegios procesados (${porcentaje}%)`)
        console.log(`[PROGRESO] Colegios: ${colegiosProcesados}/${totalColegios} (${porcentaje}%)`)
      }
      
      let colegioId = rbdToColegioId.get(rbd)

      // Si el colegio no existe, crearlo automáticamente (sin sobrescribir si ya existe)
      if (!colegioId) {
        try {
          debugLog(`[API /crm/colegios/import-niveles-asignaturas] 🆕 Creando colegio con RBD ${rbd}...`)
          
          // Verificar nuevamente si existe (por si acaso se creó en otro proceso)
          const checkResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>[]>>(
            `/api/colegios?filters[rbd][$eq]=${rbd}&publicationState=preview`
          )
          
          const colegiosExistentes = Array.isArray(checkResponse.data) ? checkResponse.data : []
          if (colegiosExistentes.length > 0) {
            // Ya existe, usar su ID
            const colegioExistente = colegiosExistentes[0]
            colegioId = colegioExistente.id || colegioExistente.documentId
            if (colegioId) {
              rbdToColegioId.set(rbd, colegioId)
              debugLog(`[API /crm/colegios/import-niveles-asignaturas] ✅ Colegio con RBD ${rbd} encontrado después de verificación (ID: ${colegioId})`)
              
              // Si el colegio existe pero tiene nombre genérico y tenemos nombre del archivo, actualizarlo
              const nombreDelArchivo = rbdToNombreColegio.get(rbd)
              if (nombreDelArchivo) {
                const attrs = (colegioExistente as any)?.attributes || colegioExistente
                const nombreActual = attrs?.colegio_nombre || colegioExistente?.colegio_nombre || ''
                const esNombreGenerico = nombreActual.includes('Colegio RBD') || !nombreActual.trim() || nombreActual === `Colegio RBD ${rbd}`
                
                if (esNombreGenerico && nombreActual.trim() !== nombreDelArchivo.trim()) {
                  try {
                    debugLog(`[API /crm/colegios/import-niveles-asignaturas] 🔄 Actualizando nombre genérico "${nombreActual}" a "${nombreDelArchivo}"`)
                    await strapiClient.put<StrapiResponse<StrapiEntity<any>>>(
                      `/api/colegios/${colegioId}`,
                      {
                        data: {
                          colegio_nombre: nombreDelArchivo.trim(),
                        },
                      }
                    )
                    debugLog(`[API /crm/colegios/import-niveles-asignaturas] ✅ Nombre actualizado exitosamente`)
                  } catch (updateError: any) {
                    debugLog(`[API /crm/colegios/import-niveles-asignaturas] ⚠️ Error al actualizar nombre del colegio:`, updateError.message)
                    // No fallar el proceso completo por esto, solo loguear
                  }
                }
              }
            }
          } else {
            // Crear nuevo colegio con datos mínimos
            // Usar nombre del archivo si está disponible, sino usar nombre temporal
            const nombreDelArchivo = rbdToNombreColegio.get(rbd)
            const nombreColegio = nombreDelArchivo || `Colegio RBD ${rbd}`
            
            const nuevoColegioData = {
              data: {
                colegio_nombre: nombreColegio,
                rbd: parseInt(rbd),
                estado: 'Por Verificar',
              },
            }
            
            if (nombreDelArchivo) {
              debugLog(`[API /crm/colegios/import-niveles-asignaturas] 📝 Creando colegio con nombre del archivo: "${nombreDelArchivo}"`)
            }
            
            const createResponse = await strapiClient.post<StrapiResponse<StrapiEntity<any>>>(
              '/api/colegios',
              nuevoColegioData
            )
            
            if (createResponse.data) {
              const nuevoColegio = Array.isArray(createResponse.data) ? createResponse.data[0] : createResponse.data
              colegioId = nuevoColegio?.id || nuevoColegio?.documentId
              
              if (colegioId) {
                rbdToColegioId.set(rbd, colegioId)
                debugLog(`[API /crm/colegios/import-niveles-asignaturas] ✅ Colegio creado con RBD ${rbd} (ID: ${colegioId})`)
              } else {
                throw new Error('No se pudo obtener ID del colegio creado')
              }
            } else {
              throw new Error('No se recibió data en la respuesta de creación')
            }
          }
        } catch (createError: any) {
          // Si hay error al crear (por ejemplo, RBD duplicado), intentar buscar nuevamente
          debugLog(`[API /crm/colegios/import-niveles-asignaturas] ⚠️ Error al crear colegio RBD ${rbd}, intentando buscar nuevamente:`, createError.message)
          
          try {
            const retryResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>[]>>(
              `/api/colegios?filters[rbd][$eq]=${rbd}&publicationState=preview`
            )
            const retryColegios = Array.isArray(retryResponse.data) ? retryResponse.data : []
            if (retryColegios.length > 0) {
              const colegioRetry = retryColegios[0]
              colegioId = colegioRetry.id || colegioRetry.documentId
              if (colegioId) {
                rbdToColegioId.set(rbd, colegioId)
                debugLog(`[API /crm/colegios/import-niveles-asignaturas] ✅ Colegio con RBD ${rbd} encontrado después de reintento (ID: ${colegioId})`)
              }
            }
          } catch (retryError: any) {
            debugLog(`[API /crm/colegios/import-niveles-asignaturas] ❌ Error en reintento para RBD ${rbd}:`, retryError.message)
          }
          
          // Si aún no tenemos colegioId, reportar error y continuar
          if (!colegioId) {
            resultados.push({
              rbd,
              año: 0,
              cursosCreados: 0,
              cursosActualizados: 0,
              errores: [`No se pudo crear ni encontrar colegio con RBD ${rbd}: ${createError.message}`],
            })
            continue
          }
        }
      }

      for (const [año, niveles] of añosMap.entries()) {
        const cursosCreados: number[] = []
        const cursosActualizados: number[] = []
        const errores: string[] = []

        // Procesar niveles en lotes para optimizar velocidad (batch processing)
      const BATCH_SIZE = 10 // Procesar 10 cursos en paralelo
      const nivelesArray = Array.from(niveles)
      
      for (let i = 0; i < nivelesArray.length; i += BATCH_SIZE) {
        const batch = nivelesArray.slice(i, i + BATCH_SIZE)
        
        // Procesar lote en paralelo
        await Promise.all(
          batch.map(async (nivelRow) => {
            try {
              const { nivel, grado } = parseNivel(nivelRow.nivel || '', nivelRow.id_nivel || nivelRow.idNivel)
              // Para Media usar números romanos (I, II, III, IV), para Básico usar números arábigos (1º, 2º, etc.)
              const gradoTexto = nivel === 'Media' ? numeroARomano(grado) : `${grado}º`
              const nombreCurso = `${gradoTexto} ${nivel === 'Media' ? 'Medio' : 'Básico'} ${año}`
              
              debugLog(`[API /crm/colegios/import-niveles-asignaturas] 🔄 Procesando nivel para RBD ${rbd}, año ${año}:`, {
                nivelOriginal: nivelRow.nivel,
                idNivel: nivelRow.id_nivel || nivelRow.idNivel,
                nivelParseado: nivel,
                gradoParseado: grado,
                nombreCurso,
                ens_bas_med: nivelRow.ens_bas_med,
              })

              // OPTIMIZACIÓN: Buscar curso en el índice en lugar de hacer llamada a Strapi
              const cursoKey = `${colegioId}-${nivel}-${grado}-${año}`
              let cursoExistente = cursosIndex.get(cursoKey)
              
              // Si no se encuentra con año, intentar sin año y verificar manualmente
              if (!cursoExistente) {
                const cursoSinAño = cursosIndex.get(`${colegioId}-${nivel}-${grado}`)
                if (cursoSinAño) {
                  const attrs = cursoSinAño.attributes || cursoSinAño
                  const cursoAño = attrs.año || attrs.ano
                  const nombreCursoAttr = attrs.nombre_curso || ''
                  // Verificar que el año coincida
                  if (cursoAño === año || nombreCursoAttr.includes(String(año))) {
                    cursoExistente = cursoSinAño
                  }
                }
              }
              
              let cursoId: number | undefined

              if (cursoExistente) {
                // Actualizar curso existente usando strapiClient directamente
                cursoId = cursoExistente.id || cursoExistente.documentId
                
                const updateData: any = {
                  data: {
                    nombre_curso: nombreCurso,
                    nivel,
                    grado: String(grado), // grado debe ser string en Strapi
                    // Añadir asignatura y cantidad de alumnos si existen
                    ...(nivelRow.asignatura && { asignatura: nivelRow.asignatura }),
                    ...(nivelRow.cantidad_alumnos && { cantidad_alumnos: nivelRow.cantidad_alumnos }),
                  },
                }

                try {
                  await strapiClient.put<StrapiResponse<StrapiEntity<any>>>(
                    `/api/cursos/${cursoId}`,
                    updateData
                  )

                  cursosActualizados.push(cursoId)
                  debugLog(`[API /crm/colegios/import-niveles-asignaturas] ✅ Curso actualizado: ${nombreCurso} (ID: ${cursoId}) para RBD ${rbd}, año ${año}`)
                } catch (updateError: any) {
                  const errorMsg = `Error al actualizar curso ${nombreCurso}: ${updateError.message || 'Error desconocido'}`
                  errores.push(errorMsg)
                  debugLog(`[API /crm/colegios/import-niveles-asignaturas] ❌ Error al actualizar curso ${nombreCurso} para RBD ${rbd}, año ${año}:`, updateError)
                }
              } else {
                // Crear nuevo curso usando strapiClient directamente
                // NOTA: NO incluir campo 'año' - Strapi lo rechaza con "Invalid key año"
                // El año ya está incluido en nombre_curso (ej: "1º Básico 2022")
                const createData: any = {
                  data: {
                    nombre_curso: nombreCurso,
                    nivel,
                    grado: String(grado), // grado debe ser string en Strapi
                    // año: año, // ❌ NO incluir - Strapi rechaza este campo
                    activo: true,
                    colegio: { connect: [colegioId] }, // Relación manyToOne
                    // Añadir asignatura y cantidad de alumnos si existen
                    ...(nivelRow.asignatura && { asignatura: nivelRow.asignatura }),
                    ...(nivelRow.cantidad_alumnos && { cantidad_alumnos: nivelRow.cantidad_alumnos }),
                  },
                }

                try {
                  const createResponse = await strapiClient.post<StrapiResponse<StrapiEntity<any>>>(
                    '/api/cursos',
                    createData
                  )

                  if (createResponse.data) {
                    const nuevoCurso = Array.isArray(createResponse.data) ? createResponse.data[0] : createResponse.data
                    cursoId = nuevoCurso?.id || nuevoCurso?.documentId

                    if (cursoId) {
                      cursosCreados.push(cursoId)
                      debugLog(`[API /crm/colegios/import-niveles-asignaturas] ✅ Curso creado: ${nombreCurso} (ID: ${cursoId}) para RBD ${rbd}, año ${año}`)
                    } else {
                      errores.push(`No se pudo obtener ID del curso creado: ${nombreCurso}`)
                    }
                  } else {
                    const errorMsg = `Error al crear curso ${nombreCurso}: No se recibió data en la respuesta`
                    errores.push(errorMsg)
                    debugLog(`[API /crm/colegios/import-niveles-asignaturas] ❌ Error al crear curso ${nombreCurso} para RBD ${rbd}, año ${año}: No data en respuesta`, createResponse)
                  }
                } catch (createError: any) {
                  const errorMsg = `Error al crear curso ${nombreCurso}: ${createError.message || 'Error desconocido'}`
                  errores.push(errorMsg)
                  debugLog(`[API /crm/colegios/import-niveles-asignaturas] ❌ Error al crear curso ${nombreCurso} para RBD ${rbd}, año ${año}:`, {
                    error: createError.message,
                    stack: createError.stack,
                    response: createError.response,
                  })
                }
              }
            } catch (error: any) {
              const errorMsg = `Error procesando nivel ${nivelRow.nivel} (ID: ${nivelRow.id_nivel}): ${error.message}`
              errores.push(errorMsg)
              debugLog(`[API /crm/colegios/import-niveles-asignaturas] ❌ Error procesando nivel ${nivelRow.nivel} para colegio RBD ${rbd} año ${año}:`, {
                error: error.message,
                stack: error.stack,
                nivelRow,
              })
            }
          })
        )
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
    const tiempoTotal = ((Date.now() - startTime) / 1000).toFixed(2)

    debugLog('[API /crm/colegios/import-niveles-asignaturas] ✅✅✅ IMPORTACIÓN COMPLETADA ✅✅✅', {
      totalColegios: colegiosMap.size,
      totalCursosCreados,
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
