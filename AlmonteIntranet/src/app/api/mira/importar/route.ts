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
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No se proporcionó ningún archivo' },
        { status: 400 }
      )
    }

    // Leer el archivo
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    
    const logs: LogEntry[] = []
    let successCount = 0
    let errorCount = 0
    let warningCount = 0
    const librosNoEncontrados = new Set<string>() // Para rastrear ISBNs no encontrados

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
        
        const librosMiraUrl = `${getStrapiUrl('/api/libros-mira')}?fields[0]=id&populate[libro][fields][0]=isbn_libro&populate[libro][fields][1]=nombre_libro&pagination[page]=${page}&pagination[pageSize]=100`
        
        const librosMiraResponse = await fetch(librosMiraUrl, {
          headers: {
            'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
        })
        
        if (!librosMiraResponse.ok) {
          throw new Error(`HTTP ${librosMiraResponse.status} al cargar catalogo de libros-mira`)
        }
        
        const librosMiraData = await librosMiraResponse.json()
        
        if (!librosMiraData.data || librosMiraData.data.length === 0) {
          hasMore = false
          break
        }
        
        // Procesar cada libro-mira y agregarlo al mapa
        let librosAgregados = 0
        for (const libroMira of librosMiraData.data) {
          const libro = libroMira.attributes?.libro?.data
          if (libro && libro.attributes?.isbn_libro) {
            const isbnNormalizado = String(libro.attributes.isbn_libro).trim()
            if (isbnNormalizado) {
              mapaLibros.set(isbnNormalizado, {
                libroMiraId: libroMira.id,
                libroNombre: libro.attributes.nombre_libro || 'N/A',
              })
              librosAgregados++
            }
          }
        }
        
        totalLibrosCargados += librosMiraData.data.length
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

      // Procesar cada fila de esta hoja
      for (let i = 0; i < data.length; i++) {
        const row = data[i]
        const rowNum = i + 1

        try {
          // 1. Limpieza de datos
          const isbnRaw = row.isbn || row.ISBN || row.Isbn
          const codigoRaw = row.Códigos || row.codigos || row.CODIGOS || row['Código'] || row.codigo

          if (!isbnRaw || !codigoRaw) {
            logs.push({ type: 'warning', message: `[ADVERTENCIA] Fila ${rowNum} (${sheetName}): Faltan datos (ISBN o Codigo)` })
            warningCount++
            continue
          }

          const isbn = String(isbnRaw).trim()
          const codigo = String(codigoRaw).trim()

          if (!isbn || !codigo) {
            logs.push({ type: 'warning', message: `[ADVERTENCIA] Fila ${rowNum} (${sheetName}): ISBN o Codigo vacio despues de limpiar` })
            warningCount++
            continue
          }

          // 2. Buscar libro-mira en el mapa (CACHÉ) - SIN hacer fetch
          const libroInfo = mapaLibros.get(isbn)
          
          if (!libroInfo) {
            librosNoEncontrados.add(isbn)
            logs.push({ type: 'warning', message: `[ADVERTENCIA] Fila ${rowNum} (${sheetName}): Libro con ISBN ${isbn} no esta activado en MIRA` })
            warningCount++
            continue // NO crear licencia si no existe el libro-mira
          }

          // Agregar a la cola de creación en lotes
          licenciasParaCrear.push({
            isbn,
            codigo,
            libroMiraId: libroInfo.libroMiraId,
            libroNombre: libroInfo.libroNombre,
            rowNum,
            sheetName,
          })
        } catch (rowError: any) {
          logs.push({ type: 'error', message: `[ERROR] Fila ${rowNum} (${sheetName}): Error procesando fila - ${rowError.message || 'Error desconocido'}` })
          errorCount++
        }
      }
    }
    
    logs.push({ type: 'info', message: `[PROCESO] Preparadas ${licenciasParaCrear.length} licencias para crear de ${totalFilas} filas procesadas` })
    
    // PASO 2: Crear licencias en lotes con Promise.all (concurrencia controlada)
    const BATCH_SIZE = 20 // Procesar 20 licencias a la vez
    logs.push({ type: 'info', message: `[LOTES] Creando licencias en lotes de ${BATCH_SIZE}...` })
    
    for (let i = 0; i < licenciasParaCrear.length; i += BATCH_SIZE) {
      const batch = licenciasParaCrear.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(licenciasParaCrear.length / BATCH_SIZE)
      
      logs.push({ type: 'info', message: `[LOTE] Procesando lote ${batchNum}/${totalBatches} (${batch.length} licencias)...` })
      
      // Crear todas las licencias del lote en paralelo
      const promises = batch.map(async (licencia) => {
        try {
          const licenciaUrl = getStrapiUrl('/api/licencias-estudiantes')
          const licenciaResponse = await fetch(licenciaUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              data: {
                codigo_activacion: licencia.codigo,
                libro_mira: licencia.libroMiraId,
                activa: true,
                fecha_vencimiento: '2026-12-31',
              },
            }),
          })

          if (!licenciaResponse.ok) {
            const errorData = await licenciaResponse.json().catch(() => ({ error: { message: 'Error desconocido' } }))
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
            logs.push({ type: 'success', message: `[OK] Fila ${licencia.rowNum} (${licencia.sheetName}): Licencia creada - ${licencia.libroNombre} (${licencia.codigo})` })
            successCount++
            return { success: true }
          }
        } catch (createError: any) {
          logs.push({ type: 'error', message: `[ERROR] Fila ${licencia.rowNum} (${licencia.sheetName}): Error al crear licencia - ${createError.message || 'Error desconocido'}` })
          errorCount++
          return { success: false, reason: 'exception' }
        }
      })
      
      // Esperar a que todas las promesas del lote se completen
      await Promise.all(promises)
    }

    // Resumen final
    logs.push({ type: 'info', message: '==========================================' })
    logs.push({ type: 'info', message: `[RESUMEN] RESUMEN FINAL:` })
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
    console.error('[API /api/mira/importar] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al procesar archivo',
      },
      { status: 500 }
    )
  }
}
