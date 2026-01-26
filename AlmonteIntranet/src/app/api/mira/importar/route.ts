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
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]
    const data = XLSX.utils.sheet_to_json(worksheet) as any[]

    if (data.length === 0) {
      return NextResponse.json(
        { success: false, error: 'El archivo está vacío' },
        { status: 400 }
      )
    }

    const logs: LogEntry[] = []
    let successCount = 0
    let errorCount = 0
    let warningCount = 0

    logs.push({ type: 'info', message: `📊 Total de filas encontradas: ${data.length}` })
    logs.push({ type: 'info', message: '🚀 Iniciando procesamiento...' })

    // Procesar cada fila
    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      const rowNum = i + 1

      logs.push({ type: 'info', message: `⏳ Procesando fila ${rowNum}/${data.length}...` })

      try {
        // 1. Limpieza de datos
        const isbnRaw = row.isbn || row.ISBN || row.Isbn
        const codigoRaw = row.Códigos || row.codigos || row.CODIGOS || row['Código'] || row.codigo

        if (!isbnRaw || !codigoRaw) {
          logs.push({ type: 'warning', message: `⚠️ Fila ${rowNum}: Faltan datos (ISBN o Código)` })
          warningCount++
          continue
        }

        const isbn = String(isbnRaw).trim()
        const codigo = String(codigoRaw).trim()

        if (!isbn || !codigo) {
          logs.push({ type: 'warning', message: `⚠️ Fila ${rowNum}: ISBN o Código vacío después de limpiar` })
          warningCount++
          continue
        }

        // 2. Buscar libro-mira por ISBN
        try {
          const libroUrl = `${getStrapiUrl('/api/libros-mira')}?filters[libro][isbn_libro][$eq]=${encodeURIComponent(isbn)}&fields[0]=id`
          
          const libroResponse = await fetch(libroUrl, {
            headers: {
              'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
              'Content-Type': 'application/json',
            },
          })

          if (!libroResponse.ok) {
            throw new Error(`HTTP ${libroResponse.status}`)
          }

          const libroData = await libroResponse.json()

          if (!libroData.data || libroData.data.length === 0) {
            logs.push({ type: 'warning', message: `⚠️ Fila ${rowNum}: ISBN ${isbn} no encontrado en MIRA` })
            warningCount++
            continue
          }

          const libroMiraId = libroData.data[0].id

          // 3. Crear licencia
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
                logs.push({ type: 'error', message: `❌ Fila ${rowNum}: Código ${codigo} ya existe` })
                errorCount++
              } else {
                logs.push({ type: 'error', message: `❌ Fila ${rowNum}: Error al crear licencia - ${errorData.error?.message || 'Error desconocido'}` })
                errorCount++
              }
            } else {
              const libroNombre = row.Libro || 'N/A'
              logs.push({ type: 'success', message: `✅ Fila ${rowNum}: Licencia creada - ${libroNombre} (${codigo})` })
              successCount++
            }
          } catch (createError: any) {
            logs.push({ type: 'error', message: `❌ Fila ${rowNum}: Error al crear licencia - ${createError.message || 'Error desconocido'}` })
            errorCount++
          }
        } catch (libroError: any) {
          logs.push({ type: 'error', message: `❌ Fila ${rowNum}: Error al buscar libro - ${libroError.message || 'Error desconocido'}` })
          errorCount++
        }
      } catch (rowError: any) {
        logs.push({ type: 'error', message: `❌ Fila ${rowNum}: Error procesando fila - ${rowError.message || 'Error desconocido'}` })
        errorCount++
      }
    }

    // Resumen final
    logs.push({ type: 'info', message: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' })
    logs.push({ type: 'info', message: `📊 RESUMEN FINAL:` })
    logs.push({ type: 'info', message: `   Total procesados: ${data.length}` })
    logs.push({ type: 'success', message: `   ✅ Exitosos: ${successCount}` })
    logs.push({ type: 'warning', message: `   ⚠️ Advertencias: ${warningCount}` })
    logs.push({ type: 'error', message: `   ❌ Errores: ${errorCount}` })

    return NextResponse.json({
      success: true,
      logs,
      summary: {
        total: data.length,
        success: successCount,
        errors: errorCount,
        warnings: warningCount,
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
