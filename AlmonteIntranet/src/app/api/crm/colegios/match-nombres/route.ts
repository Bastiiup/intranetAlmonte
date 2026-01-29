/**
 * API Route para hacer match de nombres de colegios con RBDs
 * POST /api/crm/colegios/match-nombres
 * 
 * Recibe un archivo Excel/CSV con RBD y nombre de colegio
 * Hace match con los colegios existentes en Strapi y actualiza los nombres
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutos
export const runtime = 'nodejs'

const DEBUG = process.env.NODE_ENV === 'development' || process.env.DEBUG_CRM === 'true'
const debugLog = (...args: any[]) => {
  if (DEBUG) {
    console.log(...args)
  }
}

interface ColegioMatchRow {
  rbd: string | number
  nombre?: string
  colegio_nombre?: string
  nombre_colegio?: string
}

/**
 * POST /api/crm/colegios/match-nombres
 * Procesa un archivo Excel/CSV con RBD y nombres de colegios
 * Hace match con colegios existentes y actualiza los nombres
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

    debugLog('[API /crm/colegios/match-nombres] Procesando archivo:', {
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

    debugLog('[API /crm/colegios/match-nombres] 📄 Archivo leído:', {
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
    const colegiosData: ColegioMatchRow[] = rawData.map((row: any) => {
      // RBD: soportar RBD, rbd
      const rbdValue = row.rbd || row.RBD || row.Rbd
      const rbd = rbdValue ? String(rbdValue).trim() : undefined

      // Nombre: soportar nombre, NOMBRE, colegio_nombre, COLEGIO_NOMBRE, nombre_colegio, NOMBRE_COLEGIO
      const nombreValue = row.nombre || row.NOMBRE || row.colegio_nombre || row.COLEGIO_NOMBRE || 
                         row.nombre_colegio || row.NOMBRE_COLEGIO || row.Nombre || row.Colegio
      const nombre = nombreValue ? String(nombreValue).trim() : undefined

      return {
        rbd: rbd,
        nombre: nombre,
        colegio_nombre: nombre,
        nombre_colegio: nombre,
      }
    }).filter((row) => row.rbd && row.nombre) // Solo incluir filas con RBD y nombre válidos

    debugLog('[API /crm/colegios/match-nombres] 📊 Datos normalizados:', {
      totalFilas: rawData.length,
      filasValidas: colegiosData.length,
      filasFiltradas: rawData.length - colegiosData.length,
      ejemplos: colegiosData.slice(0, 5),
    })

    if (colegiosData.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se encontraron filas válidas con RBD y nombre de colegio',
        },
        { status: 400 }
      )
    }

    // Obtener todos los colegios de Strapi para hacer match
    debugLog('[API /crm/colegios/match-nombres] 🔍 Obteniendo colegios de Strapi...')
    const colegiosStrapiResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>[]>>(
      '/api/colegios?pagination[limit]=10000&publicationState=preview'
    )

    const colegiosStrapi = Array.isArray(colegiosStrapiResponse.data)
      ? colegiosStrapiResponse.data
      : (colegiosStrapiResponse.data ? [colegiosStrapiResponse.data] : [])

    // Crear un mapa de RBD -> Colegio para búsqueda rápida
    const colegiosMap = new Map<string, StrapiEntity<any>>()
    colegiosStrapi.forEach((colegio) => {
      const attrs = (colegio as any)?.attributes || colegio
      const rbd = attrs?.rbd || colegio?.rbd
      if (rbd) {
        colegiosMap.set(String(rbd), colegio)
      }
    })

    debugLog('[API /crm/colegios/match-nombres] 📊 Colegios en Strapi:', {
      total: colegiosStrapi.length,
      conRBD: colegiosMap.size,
    })

    // Procesar matches y actualizaciones
    const resultados: any[] = []
    let actualizados = 0
    let noEncontrados = 0
    let sinCambios = 0
    let errores = 0

    // Procesar en batches de 10 para no sobrecargar Strapi
    const BATCH_SIZE = 10
    for (let i = 0; i < colegiosData.length; i += BATCH_SIZE) {
      const batch = colegiosData.slice(i, i + BATCH_SIZE)
      
      await Promise.all(
        batch.map(async (colegioData) => {
          const rbd = String(colegioData.rbd)
          const nombreNuevo = colegioData.nombre || colegioData.colegio_nombre || colegioData.nombre_colegio

          if (!nombreNuevo) {
            resultados.push({
              rbd,
              estado: 'error',
              mensaje: 'Nombre de colegio no válido',
            })
            errores++
            return
          }

          const colegioExistente = colegiosMap.get(rbd)

          if (!colegioExistente) {
            resultados.push({
              rbd,
              nombre: nombreNuevo,
              estado: 'no_encontrado',
              mensaje: `Colegio con RBD ${rbd} no encontrado en Strapi`,
            })
            noEncontrados++
            return
          }

          const attrs = (colegioExistente as any)?.attributes || colegioExistente
          const nombreActual = attrs?.colegio_nombre || colegioExistente?.colegio_nombre || ''

          // Si el nombre ya es el mismo, no actualizar
          if (nombreActual.trim() === nombreNuevo.trim()) {
            resultados.push({
              rbd,
              nombre: nombreNuevo,
              estado: 'sin_cambios',
              mensaje: 'El nombre ya está actualizado',
            })
            sinCambios++
            return
          }

          // Actualizar el nombre del colegio
          try {
            const colegioId = colegioExistente.id || colegioExistente.documentId
            const updateData = {
              data: {
                colegio_nombre: nombreNuevo.trim(),
              },
            }

            await strapiClient.put<StrapiResponse<StrapiEntity<any>>>(
              `/api/colegios/${colegioId}`,
              updateData
            )

            resultados.push({
              rbd,
              nombre: nombreNuevo,
              nombreAnterior: nombreActual,
              estado: 'actualizado',
              mensaje: `Nombre actualizado de "${nombreActual}" a "${nombreNuevo}"`,
            })
            actualizados++
          } catch (error: any) {
            debugLog(`[API /crm/colegios/match-nombres] ❌ Error al actualizar colegio RBD ${rbd}:`, error.message)
            resultados.push({
              rbd,
              nombre: nombreNuevo,
              estado: 'error',
              mensaje: `Error al actualizar: ${error.message || 'Error desconocido'}`,
            })
            errores++
          }
        })
      )

      // Log de progreso cada batch
      if ((i + BATCH_SIZE) % 100 === 0 || i + BATCH_SIZE >= colegiosData.length) {
        debugLog(`[API /crm/colegios/match-nombres] 📊 Progreso: ${Math.min(i + BATCH_SIZE, colegiosData.length)}/${colegiosData.length}`)
      }
    }

    const resumen = {
      total: colegiosData.length,
      actualizados,
      noEncontrados,
      sinCambios,
      errores,
    }

    debugLog('[API /crm/colegios/match-nombres] ✅ Proceso completado:', resumen)

    return NextResponse.json(
      {
        success: true,
        data: {
          resumen,
          resultados,
        },
        message: `Proceso completado: ${actualizados} actualizados, ${noEncontrados} no encontrados, ${sinCambios} sin cambios, ${errores} errores`,
      },
      { status: 200 }
    )
  } catch (error: any) {
    debugLog('[API /crm/colegios/match-nombres] ❌ Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al procesar el archivo',
        details: error.stack,
      },
      { status: 500 }
    )
  }
}
