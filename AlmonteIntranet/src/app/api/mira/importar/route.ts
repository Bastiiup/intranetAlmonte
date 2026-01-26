import { NextRequest, NextResponse } from 'next/server'
import { getStrapiUrl, STRAPI_API_TOKEN } from '@/lib/strapi/config'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutos para importaciones grandes

interface LogEntry {
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log('[IMPORTAR] ===== INICIO IMPORTACION MASIVA =====')
  console.log('[IMPORTAR] Timestamp:', new Date().toISOString())
  
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      console.error('[IMPORTAR] ERROR: No se proporciono archivo')
      return NextResponse.json(
        { success: false, error: 'No se proporcionó ningún archivo' },
        { status: 400 }
      )
    }

    console.log('[IMPORTAR] Archivo recibido:', file.name, 'Tamaño:', file.size, 'bytes')
    
    // Leer el archivo
    console.log('[IMPORTAR] Leyendo archivo Excel...')
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    
    const logs: LogEntry[] = []
    let successCount = 0
    let errorCount = 0
    let warningCount = 0
    const librosNoEncontrados = new Set<string>() // Para rastrear ISBNs no encontrados

    console.log('[IMPORTAR] Hojas encontradas:', workbook.SheetNames.length, workbook.SheetNames)
    logs.push({ type: 'info', message: `[LIBROS] Total de hojas encontradas: ${workbook.SheetNames.length}` })
    
    // PASO 0: Pre-cargar todos los libros-mira en memoria (CACHÉ)
    logs.push({ type: 'info', message: '[CACHE] Iniciando carga de catalogo de libros-mira desde Strapi...' })
    const mapaLibros = new Map<string, { libroMiraId: number; libroNombre: string }>()
    
    try {
      let page = 1
      let hasMore = true
      let totalLibrosCargados = 0
      const startTime = Date.now()
      
      while (hasMore) {
        logs.push({ type: 'info', message: `[CACHE] Cargando pagina ${page} de libros-mira...` })
        
        // Usar populate completo para la relación libro
        const librosMiraUrl = `${getStrapiUrl('/api/libros-mira')}?fields[0]=id&populate[libro][fields][0]=isbn_libro&populate[libro][fields][1]=nombre_libro&pagination[page]=${page}&pagination[pageSize]=100`
        
        console.log(`[IMPORTAR] URL de libros-mira:`, librosMiraUrl)
        
        const librosMiraResponse = await fetch(librosMiraUrl, {
          headers: {
            'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
        })
        
        if (!librosMiraResponse.ok) {
          const errorText = await librosMiraResponse.text()
          console.error(`[IMPORTAR] Error HTTP ${librosMiraResponse.status}:`, errorText)
          throw new Error(`HTTP ${librosMiraResponse.status} al cargar catalogo de libros-mira`)
        }
        
        const librosMiraData = await librosMiraResponse.json()
        
        console.log(`[IMPORTAR] Respuesta de libros-mira (pagina ${page}):`, JSON.stringify(librosMiraData, null, 2).substring(0, 1000))
        
        if (!librosMiraData.data || librosMiraData.data.length === 0) {
          console.log(`[IMPORTAR] No hay mas datos en pagina ${page}`)
          hasMore = false
          break
        }
        
        // Procesar cada libro-mira y agregarlo al mapa
        let librosAgregados = 0
        for (const libroMira of librosMiraData.data) {
          console.log(`[IMPORTAR] Procesando libro-mira ID ${libroMira.id}:`, JSON.stringify(libroMira, null, 2).substring(0, 500))
          
          // Intentar diferentes formas de acceder a la relación libro
          const libro = libroMira.attributes?.libro?.data || libroMira.libro?.data || libroMira.attributes?.libro || libroMira.libro
          
          console.log(`[IMPORTAR] Libro extraido para libro-mira ${libroMira.id}:`, JSON.stringify(libro, null, 2).substring(0, 500))
          
          if (libro) {
            // Intentar diferentes formas de acceder al ISBN
            const isbnRaw = libro.attributes?.isbn_libro || libro.isbn_libro || (typeof libro === 'object' && 'isbn_libro' in libro ? libro.isbn_libro : null)
            const nombreRaw = libro.attributes?.nombre_libro || libro.nombre_libro || (typeof libro === 'object' && 'nombre_libro' in libro ? libro.nombre_libro : 'N/A')
            
            console.log(`[IMPORTAR] ISBN raw:`, isbnRaw, 'Nombre raw:', nombreRaw)
            
            if (isbnRaw) {
              const isbnNormalizado = String(isbnRaw).trim().replace(/\s+/g, '')
              if (isbnNormalizado) {
                mapaLibros.set(isbnNormalizado, {
                  libroMiraId: libroMira.id,
                  libroNombre: nombreRaw || 'N/A',
                })
                librosAgregados++
                console.log(`[IMPORTAR] ISBN "${isbnNormalizado}" agregado al mapa para libro-mira ${libroMira.id}`)
              } else {
                console.warn(`[IMPORTAR] ISBN vacio despues de normalizar para libro-mira ${libroMira.id}`)
              }
            } else {
              console.warn(`[IMPORTAR] No se encontro ISBN para libro-mira ${libroMira.id}. Estructura del libro:`, JSON.stringify(libro, null, 2))
            }
          } else {
            console.warn(`[IMPORTAR] No se encontro relacion libro para libro-mira ${libroMira.id}`)
          }
        }
        
        totalLibrosCargados += librosMiraData.data.length
        console.log(`[IMPORTAR] Pagina ${page}: ${librosMiraData.data.length} libros-mira procesados, ${librosAgregados} ISBNs agregados al mapa. Total en mapa: ${mapaLibros.size}`)
        logs.push({ type: 'info', message: `[CACHE] Pagina ${page}: ${librosMiraData.data.length} libros-mira procesados, ${librosAgregados} ISBNs agregados al mapa` })
        
        // Verificar si hay más páginas
        const pagination = librosMiraData.meta?.pagination
        if (pagination && page < pagination.pageCount) {
          page++
        } else {
          hasMore = false
        }
      }
      
      const loadTime = ((Date.now() - startTime) / 1000).toFixed(2)
      logs.push({ type: 'success', message: `[CACHE] Catalogo cargado exitosamente: ${totalLibrosCargados} libros-mira en memoria (${mapaLibros.size} ISBNs unicos) en ${loadTime}s` })
    } catch (cacheError: any) {
      logs.push({ type: 'error', message: `[ERROR] Error al cargar catalogo: ${cacheError.message || 'Error desconocido'}` })
      return NextResponse.json(
        {
          success: false,
          error: `Error al cargar catalogo de libros: ${cacheError.message || 'Error desconocido'}`,
          logs,
        },
        { status: 500 }
      )
    }
    
    // PASO 1: Procesar TODAS las hojas del Excel y preparar datos para creación en lotes
    let totalFilas = 0
    const licenciasParaCrear: Array<{ isbn: string; codigo: string; libroMiraId: number; libroNombre: string; rowNum: number; sheetName: string }> = []
    
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName]
      const data = XLSX.utils.sheet_to_json(worksheet) as any[]
      
      if (data.length === 0) {
        logs.push({ type: 'info', message: `[HOJA] Hoja "${sheetName}": Vacia, saltando...` })
        continue
      }
      
      logs.push({ type: 'info', message: `[HOJA] Procesando hoja "${sheetName}": ${data.length} filas` })
      totalFilas += data.length

      // Mostrar las columnas encontradas en la primera fila para debugging
      if (data.length > 0) {
        const firstRow = data[0]
        const columnas = Object.keys(firstRow)
        console.log(`[IMPORTAR] Hoja "${sheetName}": Columnas encontradas:`, columnas)
        logs.push({ type: 'info', message: `[DEBUG] Columnas en hoja "${sheetName}": ${columnas.join(', ')}` })
        logs.push({ type: 'info', message: `[DEBUG] Primera fila de ejemplo: ${JSON.stringify(firstRow)}` })
      }

      // Procesar cada fila de esta hoja
      for (let i = 0; i < data.length; i++) {
        const row = data[i]
        const rowNum = i + 1

        try {
          console.log(`[IMPORTAR] Procesando fila ${rowNum} de hoja "${sheetName}":`, JSON.stringify(row))
          
          // 1. Limpieza de datos - Intentar múltiples variantes de nombres de columnas
          const isbnRaw = row.isbn || row.ISBN || row.Isbn || row['isbn'] || row['ISBN']
          const codigoRaw = row.Códigos || row.codigos || row.CODIGOS || row['Códigos'] || row['Código'] || row.codigo || row.Codigo || row.CODIGO

          console.log(`[IMPORTAR] Fila ${rowNum}: ISBN raw =`, isbnRaw, 'Codigo raw =', codigoRaw)

          if (!isbnRaw || !codigoRaw) {
            const mensaje = `[ADVERTENCIA] Fila ${rowNum} (${sheetName}): Faltan datos - ISBN: ${isbnRaw ? 'OK' : 'FALTA'}, Codigo: ${codigoRaw ? 'OK' : 'FALTA'}`
            console.warn(`[IMPORTAR] ${mensaje}`)
            logs.push({ type: 'warning', message: mensaje })
            warningCount++
            continue
          }

          const isbn = String(isbnRaw).trim().replace(/\s+/g, '') // Eliminar espacios
          const codigo = String(codigoRaw).trim()

          console.log(`[IMPORTAR] Fila ${rowNum}: ISBN normalizado = "${isbn}", Codigo normalizado = "${codigo}"`)

          if (!isbn || !codigo) {
            const mensaje = `[ADVERTENCIA] Fila ${rowNum} (${sheetName}): ISBN o Codigo vacio despues de limpiar - ISBN: "${isbn}", Codigo: "${codigo}"`
            console.warn(`[IMPORTAR] ${mensaje}`)
            logs.push({ type: 'warning', message: mensaje })
            warningCount++
            continue
          }

          // 2. Buscar libro-mira en el mapa (CACHÉ) - SIN hacer fetch
          console.log(`[IMPORTAR] Fila ${rowNum}: Buscando ISBN "${isbn}" en mapa (tamano: ${mapaLibros.size})`)
          const libroInfo = mapaLibros.get(isbn)
          
          if (!libroInfo) {
            // Intentar buscar sin espacios adicionales
            const isbnAlternativo = isbn.replace(/-/g, '').replace(/\./g, '')
            const libroInfoAlt = mapaLibros.get(isbnAlternativo)
            
            if (libroInfoAlt) {
              console.log(`[IMPORTAR] Fila ${rowNum}: ISBN encontrado con formato alternativo`)
              librosNoEncontrados.add(isbn)
              logs.push({ type: 'warning', message: `[ADVERTENCIA] Fila ${rowNum} (${sheetName}): ISBN "${isbn}" no encontrado, pero formato alternativo "${isbnAlternativo}" existe` })
              warningCount++
              continue
            }
            
            console.warn(`[IMPORTAR] Fila ${rowNum}: ISBN "${isbn}" NO encontrado en mapa. ISBNs disponibles (primeros 5):`, Array.from(mapaLibros.keys()).slice(0, 5))
            librosNoEncontrados.add(isbn)
            logs.push({ type: 'warning', message: `[ADVERTENCIA] Fila ${rowNum} (${sheetName}): Libro con ISBN "${isbn}" no esta activado en MIRA` })
            warningCount++
            continue // NO crear licencia si no existe el libro-mira
          }

          console.log(`[IMPORTAR] Fila ${rowNum}: Libro encontrado - ID: ${libroInfo.libroMiraId}, Nombre: ${libroInfo.libroNombre}`)

          // Agregar a la cola de creación en lotes
          licenciasParaCrear.push({
            isbn,
            codigo,
            libroMiraId: libroInfo.libroMiraId,
            libroNombre: libroInfo.libroNombre,
            rowNum,
            sheetName,
          })
          console.log(`[IMPORTAR] Fila ${rowNum}: Agregada a cola de creacion (total: ${licenciasParaCrear.length})`)
        } catch (rowError: any) {
          console.error(`[IMPORTAR] ERROR en fila ${rowNum} (${sheetName}):`, rowError)
          logs.push({ type: 'error', message: `[ERROR] Fila ${rowNum} (${sheetName}): Error procesando fila - ${rowError.message || 'Error desconocido'}` })
          errorCount++
        }
      }
    }
    
    console.log(`[IMPORTAR] Preparadas ${licenciasParaCrear.length} licencias para crear de ${totalFilas} filas procesadas`)
    logs.push({ type: 'info', message: `[PROCESO] Preparadas ${licenciasParaCrear.length} licencias para crear de ${totalFilas} filas procesadas` })
    
    // PASO 2: Crear licencias en lotes con Promise.all (concurrencia controlada)
    const BATCH_SIZE = 20 // Procesar 20 licencias a la vez
    console.log(`[IMPORTAR] Iniciando creacion de licencias en lotes de ${BATCH_SIZE}`)
    logs.push({ type: 'info', message: `[LOTES] Creando licencias en lotes de ${BATCH_SIZE}...` })
    
    for (let i = 0; i < licenciasParaCrear.length; i += BATCH_SIZE) {
      const batch = licenciasParaCrear.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(licenciasParaCrear.length / BATCH_SIZE)
      
      console.log(`[IMPORTAR] Procesando lote ${batchNum}/${totalBatches} con ${batch.length} licencias`)
      logs.push({ type: 'info', message: `[LOTE] Procesando lote ${batchNum}/${totalBatches} (${batch.length} licencias)...` })
      
      // Crear todas las licencias del lote en paralelo
      const promises = batch.map(async (licencia) => {
        try {
          console.log(`[IMPORTAR] Creando licencia: codigo="${licencia.codigo}", libroMiraId=${licencia.libroMiraId}, ISBN=${licencia.isbn}`)
          const licenciaUrl = getStrapiUrl('/api/licencias-estudiantes')
          
          const payload = {
            data: {
              codigo_activacion: licencia.codigo,
              libro_mira: licencia.libroMiraId,
              activa: true,
              fecha_vencimiento: '2026-12-31',
            },
          }
          
          console.log(`[IMPORTAR] Payload para licencia:`, JSON.stringify(payload))
          
          const licenciaResponse = await fetch(licenciaUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          })

          console.log(`[IMPORTAR] Respuesta de Strapi para codigo "${licencia.codigo}":`, licenciaResponse.status, licenciaResponse.statusText)

          if (!licenciaResponse.ok) {
            const errorData = await licenciaResponse.json().catch(() => ({ error: { message: 'Error desconocido' } }))
            console.error(`[IMPORTAR] ERROR al crear licencia "${licencia.codigo}":`, errorData)
            
            if (licenciaResponse.status === 400 || errorData.error?.message?.includes('unique') || errorData.error?.message?.includes('duplicate')) {
              logs.push({ type: 'error', message: `[ERROR] Fila ${licencia.rowNum} (${licencia.sheetName}): Codigo ${licencia.codigo} ya existe` })
              errorCount++
              return { success: false, reason: 'duplicate' }
            } else {
              logs.push({ type: 'error', message: `[ERROR] Fila ${licencia.rowNum} (${licencia.sheetName}): Error al crear licencia - ${errorData.error?.message || 'Error desconocido'}` })
              errorCount++
              return { success: false, reason: 'error' }
            }
          } else {
            const responseData = await licenciaResponse.json().catch(() => ({}))
            console.log(`[IMPORTAR] Licencia creada exitosamente:`, responseData)
            logs.push({ type: 'success', message: `[OK] Fila ${licencia.rowNum} (${licencia.sheetName}): Licencia creada - ${licencia.libroNombre} (${licencia.codigo})` })
            successCount++
            return { success: true }
          }
        } catch (createError: any) {
          console.error(`[IMPORTAR] EXCEPCION al crear licencia "${licencia.codigo}":`, createError)
          logs.push({ type: 'error', message: `[ERROR] Fila ${licencia.rowNum} (${licencia.sheetName}): Error al crear licencia - ${createError.message || 'Error desconocido'}` })
          errorCount++
          return { success: false, reason: 'exception' }
        }
      })
      
      // Esperar a que todas las promesas del lote se completen
      const results = await Promise.all(promises)
      console.log(`[IMPORTAR] Lote ${batchNum} completado. Resultados:`, results)
    }

    // Resumen final
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`[IMPORTAR] ===== FIN IMPORTACION =====`)
    console.log(`[IMPORTAR] Tiempo total: ${totalTime}s`)
    console.log(`[IMPORTAR] Total procesados: ${totalFilas}`)
    console.log(`[IMPORTAR] Exitosos: ${successCount}`)
    console.log(`[IMPORTAR] Errores: ${errorCount}`)
    console.log(`[IMPORTAR] Advertencias: ${warningCount}`)
    console.log(`[IMPORTAR] Libros no encontrados: ${librosNoEncontrados.size}`)
    
    logs.push({ type: 'info', message: '==========================================' })
    logs.push({ type: 'info', message: `[RESUMEN] RESUMEN FINAL (Tiempo: ${totalTime}s):` })
    logs.push({ type: 'info', message: `   Total procesados: ${totalFilas}` })
    logs.push({ type: 'success', message: `   [OK] Exitosos: ${successCount}` })
    logs.push({ type: 'warning', message: `   [ADVERTENCIA] Advertencias: ${warningCount}` })
    logs.push({ type: 'error', message: `   [ERROR] Errores: ${errorCount}` })

    // Mostrar libros no encontrados
    if (librosNoEncontrados.size > 0) {
      logs.push({ type: 'info', message: '==========================================' })
      logs.push({ type: 'warning', message: `[LIBROS] LIBROS NO ENCONTRADOS EN MIRA (${librosNoEncontrados.size} ISBN unico(s)):` })
      Array.from(librosNoEncontrados).forEach((isbn) => {
        logs.push({ type: 'warning', message: `   [ADVERTENCIA] ISBN: ${isbn}` })
      })
      logs.push({ type: 'info', message: '[INFO] Estos libros no estan activados en MIRA. Activarlos primero antes de importar sus licencias.' })
    }

    return NextResponse.json({
      success: true,
      logs,
      summary: {
        total: totalFilas,
        success: successCount,
        errors: errorCount,
        warnings: warningCount,
        librosNoEncontrados: Array.from(librosNoEncontrados),
      },
    })
  } catch (error: any) {
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2)
    console.error('[IMPORTAR] ===== ERROR FATAL =====')
    console.error('[IMPORTAR] Error:', error)
    console.error('[IMPORTAR] Stack:', error.stack)
    console.error('[IMPORTAR] Tiempo hasta error:', totalTime + 's')
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al procesar archivo',
      },
      { status: 500 }
    )
  }
}
