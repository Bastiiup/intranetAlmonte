import { NextRequest, NextResponse } from 'next/server'
// @ts-ignore - xlsx puede no tener tipos completos
import * as XLSX from 'xlsx'

const DEBUG = process.env.NODE_ENV === 'development' || process.env.DEBUG_CRM === 'true'
const debugLog = (...args: any[]) => {
  if (DEBUG) {
    console.log(...args)
  }
}

interface MaterialRow {
  Material: string
  Tipo: string
  Cantidad: number | string
  Obligatorio: string | boolean
  Descripcion?: string
}

interface ParsedMaterial {
  material_nombre: string
  tipo: 'util' | 'libro' | 'cuaderno' | 'otro'
  cantidad: number
  obligatorio: boolean
  descripcion?: string
}

/**
 * POST /api/crm/listas-utiles/import-excel
 * Procesa un archivo Excel y extrae materiales
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
      'application/vnd.ms-excel.sheet.macroEnabled.12', // .xlsm
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

    // Validar tamaño (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: 'El archivo es demasiado grande. Tamaño máximo: 5MB',
        },
        { status: 400 }
      )
    }

    debugLog('[API /crm/listas-utiles/import-excel] Procesando archivo:', {
      nombre: file.name,
      tipo: file.type,
      tamaño: file.size,
    })

    // Leer archivo como buffer
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })

    // Obtener la primera hoja
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]

    if (!worksheet) {
      return NextResponse.json(
        {
          success: false,
          error: 'El archivo Excel no contiene hojas válidas',
        },
        { status: 400 }
      )
    }

    // Convertir a JSON
    const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })

    if (rawData.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: 'El archivo debe contener al menos una fila de datos (además del encabezado)',
        },
        { status: 400 }
      )
    }

    // Detectar encabezados (primera fila)
    const headers = rawData[0].map((h: any) => String(h || '').trim())
    debugLog('[API /crm/listas-utiles/import-excel] Headers detectados:', headers)

    // Mapear headers a campos (case-insensitive)
    const headerMap: Record<string, string> = {}
    const headerLower = headers.map((h: string) => h.toLowerCase())

    const materialIndex = headerLower.findIndex((h) =>
      ['material', 'material_nombre', 'nombre', 'item', 'producto'].includes(h)
    )
    const tipoIndex = headerLower.findIndex((h) =>
      ['tipo', 'categoria', 'category', 'clase'].includes(h)
    )
    const cantidadIndex = headerLower.findIndex((h) =>
      ['cantidad', 'qty', 'quantity', 'cant', 'numero'].includes(h)
    )
    const obligatorioIndex = headerLower.findIndex((h) =>
      ['obligatorio', 'requerido', 'required', 'necesario'].includes(h)
    )
    const descripcionIndex = headerLower.findIndex((h) =>
      ['descripcion', 'descripción', 'description', 'notas', 'comentario'].includes(h)
    )

    if (materialIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se encontró la columna "Material" en el archivo. Asegúrate de que el archivo tenga una columna con ese nombre.',
        },
        { status: 400 }
      )
    }

    // Procesar filas de datos
    const materiales: ParsedMaterial[] = []
    const errores: string[] = []

    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i]
      const materialNombre = String(row[materialIndex] || '').trim()

      // Saltar filas vacías
      if (!materialNombre) {
        continue
      }

      // Normalizar tipo
      let tipo: 'util' | 'libro' | 'cuaderno' | 'otro' = 'util'
      if (tipoIndex !== -1) {
        const tipoRaw = String(row[tipoIndex] || '').trim().toLowerCase()
        if (tipoRaw.includes('libro') || tipoRaw.includes('book')) {
          tipo = 'libro'
        } else if (tipoRaw.includes('cuaderno') || tipoRaw.includes('notebook')) {
          tipo = 'cuaderno'
        } else if (tipoRaw.includes('otro') || tipoRaw.includes('other')) {
          tipo = 'otro'
        } else {
          tipo = 'util'
        }
      }

      // Cantidad
      let cantidad = 1
      if (cantidadIndex !== -1) {
        const cantidadRaw = row[cantidadIndex]
        if (cantidadRaw !== null && cantidadRaw !== undefined && cantidadRaw !== '') {
          const cantidadNum = parseInt(String(cantidadRaw))
          if (!isNaN(cantidadNum) && cantidadNum > 0) {
            cantidad = cantidadNum
          }
        }
      }

      // Obligatorio
      let obligatorio = true
      if (obligatorioIndex !== -1) {
        const obligatorioRaw = String(row[obligatorioIndex] || '').trim().toLowerCase()
        if (
          ['no', 'n', 'false', 'falso', 'opcional', 'optional'].includes(obligatorioRaw) ||
          obligatorioRaw === '0'
        ) {
          obligatorio = false
        }
      }

      // Descripción
      const descripcion =
        descripcionIndex !== -1 ? String(row[descripcionIndex] || '').trim() : undefined

      materiales.push({
        material_nombre: materialNombre,
        tipo,
        cantidad,
        obligatorio,
        descripcion: descripcion || undefined,
      })
    }

    if (materiales.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se encontraron materiales válidos en el archivo',
        },
        { status: 400 }
      )
    }

    debugLog('[API /crm/listas-utiles/import-excel] ✅ Materiales parseados:', materiales.length)

    return NextResponse.json({
      success: true,
      data: {
        materiales,
        total: materiales.length,
        errores: errores.length > 0 ? errores : undefined,
      },
    })
  } catch (error: any) {
    debugLog('[API /crm/listas-utiles/import-excel] ❌ Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al procesar el archivo Excel',
        details: DEBUG ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
