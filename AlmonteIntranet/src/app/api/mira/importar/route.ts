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
    
    // Procesar TODAS las hojas del Excel
    let totalFilas = 0
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

        logs.push({ type: 'info', message: `[PROCESANDO] Procesando fila ${rowNum}/${data.length}...` })

        try {
          // 1. Limpieza de datos
          const isbnRaw = row.isbn || row.ISBN || row.Isbn
          const codigoRaw = row.Códigos || row.codigos || row.CODIGOS || row['Código'] || row.codigo

          if (!isbnRaw || !codigoRaw) {
            logs.push({ type: 'warning', message: `[ADVERTENCIA] Fila ${rowNum}: Faltan datos (ISBN o Codigo)` })
            warningCount++
            continue
          }

          const isbn = String(isbnRaw).trim()
          const codigo = String(codigoRaw).trim()

          if (!isbn || !codigo) {
            logs.push({ type: 'warning', message: `[ADVERTENCIA] Fila ${rowNum}: ISBN o Codigo vacio despues de limpiar` })
            warningCount++
            continue
          }

          // 2. Buscar libro-mira por ISBN
          // Primero buscar el libro por ISBN, luego buscar el libro-mira relacionado
          try {
            // Paso 2a: Buscar el libro por ISBN
            const libroUrl = `${getStrapiUrl('/api/libros')}?filters[isbn_libro][$eq]=${encodeURIComponent(isbn)}&fields[0]=id&fields[1]=nombre_libro`
            
            const libroResponse = await fetch(libroUrl, {
              headers: {
                'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
                'Content-Type': 'application/json',
              },
            })

            if (!libroResponse.ok) {
              throw new Error(`HTTP ${libroResponse.status} al buscar libro`)
            }

            const libroData = await libroResponse.json()

            if (!libroData.data || libroData.data.length === 0) {
              librosNoEncontrados.add(isbn)
              logs.push({ type: 'warning', message: `[ADVERTENCIA] Fila ${rowNum}: Libro con ISBN ${isbn} no existe en Strapi` })
              warningCount++
              continue // NO crear licencia si no existe el libro
            }

            const libroId = libroData.data[0].id
            const libroNombre = libroData.data[0].attributes?.nombre_libro || row.Libro || 'N/A'

            // Paso 2b: Buscar el libro-mira relacionado con este libro
            const libroMiraUrl = `${getStrapiUrl('/api/libros-mira')}?filters[libro][id][$eq]=${libroId}&fields[0]=id`
            
            const libroMiraResponse = await fetch(libroMiraUrl, {
              headers: {
                'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
                'Content-Type': 'application/json',
              },
            })

            if (!libroMiraResponse.ok) {
              throw new Error(`HTTP ${libroMiraResponse.status} al buscar libro-mira`)
            }

            const libroMiraData = await libroMiraResponse.json()

            if (!libroMiraData.data || libroMiraData.data.length === 0) {
              librosNoEncontrados.add(isbn)
              logs.push({ type: 'warning', message: `[ADVERTENCIA] Fila ${rowNum}: Libro "${libroNombre}" (ISBN: ${isbn}) no esta activado en MIRA` })
              warningCount++
              continue // NO crear licencia si no existe el libro-mira
            }

            const libroMiraId = libroMiraData.data[0].id

            // 3. Crear licencia SOLO si existe el libro-mira
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
                    codigo_activacion: codigo,
                    libro_mira: libroMiraId,
                    activa: true,
                    fecha_vencimiento: '2026-12-31',
                  },
                }),
              })

              if (!licenciaResponse.ok) {
                const errorData = await licenciaResponse.json().catch(() => ({ error: { message: 'Error desconocido' } }))
                if (licenciaResponse.status === 400 || errorData.error?.message?.includes('unique') || errorData.error?.message?.includes('duplicate')) {
                  logs.push({ type: 'error', message: `[ERROR] Fila ${rowNum}: Codigo ${codigo} ya existe` })
                  errorCount++
                } else {
                  logs.push({ type: 'error', message: `[ERROR] Fila ${rowNum}: Error al crear licencia - ${errorData.error?.message || 'Error desconocido'}` })
                  errorCount++
                }
              } else {
                logs.push({ type: 'success', message: `[OK] Fila ${rowNum}: Licencia creada - ${libroNombre} (${codigo})` })
                successCount++
              }
            } catch (createError: any) {
              logs.push({ type: 'error', message: `[ERROR] Fila ${rowNum}: Error al crear licencia - ${createError.message || 'Error desconocido'}` })
              errorCount++
            }
          } catch (libroError: any) {
            logs.push({ type: 'error', message: `[ERROR] Fila ${rowNum}: Error al buscar libro - ${libroError.message || 'Error desconocido'}` })
            errorCount++
          }
        } catch (rowError: any) {
          logs.push({ type: 'error', message: `[ERROR] Fila ${rowNum}: Error procesando fila - ${rowError.message || 'Error desconocido'}` })
          errorCount++
        }
      }
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
