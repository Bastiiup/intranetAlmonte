/**
 * Script para importar niveles y asignaturas directamente desde un archivo Excel/CSV
 * Uso: node scripts/importar-niveles-directo.js "ruta/al/archivo.xlsx"
 */

const fs = require('fs')
const path = require('path')
const XLSX = require('xlsx')

// Cargar variables de entorno
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://strapi.moraleja.cl'
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

if (!STRAPI_API_TOKEN) {
  console.error('❌ ERROR: STRAPI_API_TOKEN no está configurado en .env.local')
  process.exit(1)
}

// Función para hacer peticiones a Strapi
async function strapiRequest(method, endpoint, data = null) {
  const url = `${STRAPI_API_URL}${endpoint}`
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
  }

  if (data) {
    options.body = JSON.stringify(data)
  }

  const response = await fetch(url, options)
  const result = await response.json()

  if (!response.ok) {
    throw new Error(`Strapi error (${response.status}): ${result.error?.message || JSON.stringify(result)}`)
  }

  return result
}

// Función para parsear nivel
function parseNivel(nivelStr, idNivel) {
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
  
  // Parsear desde texto del nivel (ej: "1° Básico", "7° Básico", "I Medio")
  if (nivel.includes('medio')) {
    // Intentar extraer el número romano primero (más común en Media)
    const matchRomano = nivel.match(/\b([ivxlcdm]+)\s*medio/i)
    if (matchRomano) {
      const romanos = { 'i': 1, 'ii': 2, 'iii': 3, 'iv': 4 }
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

// Función principal
async function importarArchivo(filePath) {
  console.log(`\n📂 Leyendo archivo: ${filePath}\n`)

  if (!fs.existsSync(filePath)) {
    console.error(`❌ ERROR: El archivo no existe: ${filePath}`)
    process.exit(1)
  }

  // Leer archivo
  const buffer = fs.readFileSync(filePath)
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const firstSheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[firstSheetName]

  if (!worksheet) {
    console.error('❌ ERROR: El archivo no contiene hojas válidas')
    process.exit(1)
  }

  // Convertir a JSON
  const rawData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' })

  console.log(`✅ Archivo leído: ${rawData.length} filas`)
  console.log(`📋 Columnas: ${rawData.length > 0 ? Object.keys(rawData[0]).join(', ') : 'N/A'}\n`)

  // Normalizar datos
  const nivelesData = rawData.map((row) => {
    const añoValue = row.año || row.AÑO || row.agno || row.AGNO || row.ano || row.ANO
    const año = añoValue ? parseInt(String(añoValue)) : undefined

    const rbdValue = row.rbd || row.RBD
    const rbd = rbdValue ? String(rbdValue).trim() : undefined

    const nivelValue = row.nivel || row.NIVEL
    const nivel = nivelValue ? String(nivelValue).trim() : undefined

    const idNivelValue = row.id_nivel || row.ID_NIVEL || row.idNivel
    const idNivel = idNivelValue ? parseInt(String(idNivelValue)) : undefined

    const educacionValue = row.educación || row.EDUCACIÓN || row.educacion || row.EDUCACION || row.ens_bas_med || row.ENS_BAS_MED || row.tipo_ensenanza
    const tipoEnsenanza = educacionValue ? String(educacionValue).trim() : undefined

    const asignaturaValue = row.asignatura || row.Asignatura || row.nom_subsector || row.NOM_SUBSECTOR
    const asignatura = asignaturaValue ? String(asignaturaValue).trim() : undefined

    const cantidadAlumnosValue = row.cantidad_alumnos || row.Cantidad_Alumnos || row.cantidadAlumnos
    const cantidadAlumnos = cantidadAlumnosValue ? parseInt(String(cantidadAlumnosValue)) : undefined

    return {
      año,
      rbd,
      nivel,
      id_nivel: idNivel,
      ens_bas_med: tipoEnsenanza,
      asignatura,
      cantidad_alumnos: cantidadAlumnos,
    }
  })

  // Filtrar filas válidas
  const filasValidas = nivelesData.filter(r => r.rbd && r.año)
  console.log(`📊 Filas válidas (con RBD y año): ${filasValidas.length} de ${nivelesData.length}\n`)

  // Agrupar por RBD y año
  const colegiosMap = new Map()

  filasValidas.forEach((row) => {
    const rbd = String(row.rbd)
    if (!colegiosMap.has(rbd)) {
      colegiosMap.set(rbd, new Map())
    }

    const añosMap = colegiosMap.get(rbd)
    if (!añosMap.has(row.año)) {
      añosMap.set(row.año, [])
    }

    añosMap.get(row.año).push(row)
  })

  console.log(`🏫 Colegios únicos encontrados: ${colegiosMap.size}\n`)

  // Obtener todos los colegios de Strapi
  console.log('🔍 Obteniendo colegios de Strapi...')
  const colegiosResponse = await strapiRequest('GET', '/api/colegios?pagination[pageSize]=10000&publicationState=preview')
  const colegios = Array.isArray(colegiosResponse.data) ? colegiosResponse.data : []
  const rbdToColegioId = new Map()

  colegios.forEach((colegio) => {
    const attrs = colegio?.attributes || colegio
    const rbd = attrs?.rbd || colegio?.rbd
    if (rbd) {
      const colegioId = colegio.id || colegio.documentId
      if (colegioId) {
        rbdToColegioId.set(String(rbd), colegioId)
      }
    }
  })

  console.log(`✅ Colegios en Strapi: ${colegios.length} (${rbdToColegioId.size} con RBD)\n`)

  // Procesar cada colegio
  const resultados = []
  let totalCursosCreados = 0
  let totalCursosActualizados = 0
  let totalErrores = 0

  for (const [rbd, añosMap] of colegiosMap.entries()) {
    const colegioId = rbdToColegioId.get(rbd)

    if (!colegioId) {
      console.log(`⚠️  RBD ${rbd}: Colegio no encontrado en Strapi`)
      resultados.push({
        rbd,
        año: 0,
        cursosCreados: 0,
        cursosActualizados: 0,
        errores: [`Colegio con RBD ${rbd} no encontrado en Strapi`],
      })
      totalErrores++
      continue
    }

    for (const [año, niveles] of añosMap.entries()) {
      const cursosCreados = []
      const cursosActualizados = []
      const errores = []

      console.log(`\n📚 Procesando RBD ${rbd}, año ${año} (${niveles.length} niveles)...`)

      for (const nivelRow of niveles) {
        try {
          const { nivel, grado } = parseNivel(nivelRow.nivel || '', nivelRow.id_nivel)
          const nombreCurso = `${grado}º ${nivel === 'Media' ? 'Media' : 'Básico'} ${año}`

          // Buscar si el curso ya existe
          const cursosResponse = await strapiRequest('GET', `/api/cursos?filters[colegio][id][$eq]=${colegioId}&filters[nivel][$eq]=${nivel}&filters[grado][$eq]=${grado}&publicationState=preview`)
          const cursosExistentes = Array.isArray(cursosResponse.data) ? cursosResponse.data : []
          
          const cursoExistente = cursosExistentes.find((curso) => {
            const attrs = curso?.attributes || curso
            const cursoAño = attrs.año || attrs.ano
            return cursoAño === año
          })
          
          let cursoId

          if (cursoExistente) {
            // Actualizar curso existente
            cursoId = cursoExistente.id || cursoExistente.documentId
            
            const updateData = {
              data: {
                nombre_curso: nombreCurso,
                nivel,
                grado: String(grado),
                ...(nivelRow.asignatura && { asignatura: nivelRow.asignatura }),
                ...(nivelRow.cantidad_alumnos && { cantidad_alumnos: nivelRow.cantidad_alumnos }),
              },
            }

            await strapiRequest('PUT', `/api/cursos/${cursoId}`, updateData)
            cursosActualizados.push(cursoId)
            console.log(`  ✅ Actualizado: ${nombreCurso} (ID: ${cursoId})`)
          } else {
            // Crear nuevo curso
            // NOTA: NO incluir campo 'año' - Strapi lo rechaza con "Invalid key año"
            // El año ya está incluido en nombre_curso (ej: "1º Básico 2022")
            const createData = {
              data: {
                nombre_curso: nombreCurso,
                nivel,
                grado: String(grado),
                // año: año, // ❌ NO incluir - Strapi rechaza este campo
                activo: true,
                colegio: { connect: [colegioId] },
                ...(nivelRow.asignatura && { asignatura: nivelRow.asignatura }),
                ...(nivelRow.cantidad_alumnos && { cantidad_alumnos: nivelRow.cantidad_alumnos }),
              },
            }

            const createResponse = await strapiRequest('POST', '/api/cursos', createData)
            const nuevoCurso = Array.isArray(createResponse.data) ? createResponse.data[0] : createResponse.data
            cursoId = nuevoCurso?.id || nuevoCurso?.documentId

            if (cursoId) {
              cursosCreados.push(cursoId)
              console.log(`  ✅ Creado: ${nombreCurso} (ID: ${cursoId})`)
            } else {
              errores.push(`No se pudo obtener ID del curso creado: ${nombreCurso}`)
              console.log(`  ❌ Error: No se pudo obtener ID del curso creado: ${nombreCurso}`)
            }
          }
        } catch (error) {
          const errorMsg = `Error procesando nivel ${nivelRow.nivel} (ID: ${nivelRow.id_nivel}): ${error.message}`
          errores.push(errorMsg)
          console.log(`  ❌ Error: ${errorMsg}`)
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

      totalCursosCreados += cursosCreados.length
      totalCursosActualizados += cursosActualizados.length
      totalErrores += errores.length
    }
  }

  // Resumen final
  console.log(`\n\n📊 RESUMEN DE IMPORTACIÓN:`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`🏫 Colegios procesados: ${colegiosMap.size}`)
  console.log(`✅ Cursos creados: ${totalCursosCreados}`)
  console.log(`🔄 Cursos actualizados: ${totalCursosActualizados}`)
  console.log(`❌ Errores: ${totalErrores}`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

  if (totalErrores > 0) {
    console.log(`⚠️  Colegios con errores:`)
    resultados.filter(r => r.errores.length > 0).forEach(r => {
      console.log(`  - RBD ${r.rbd}, año ${r.año}: ${r.errores.length} error(es)`)
      r.errores.forEach(err => console.log(`    • ${err}`))
    })
  }
}

// Ejecutar
const filePath = process.argv[2] || 'D:\\almontes_dev\\A excel de colegios para importancion\\a\\colegios_2022_estructurado (1).xlsx'

if (!filePath) {
  console.error('❌ ERROR: Debes proporcionar la ruta del archivo')
  console.error('Uso: node scripts/importar-niveles-directo.js "ruta/al/archivo.xlsx"')
  process.exit(1)
}

importarArchivo(filePath)
  .then(() => {
    console.log('\n✅ Importación completada\n')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ ERROR en la importación:', error)
    console.error(error.stack)
    process.exit(1)
  })
