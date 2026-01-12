/**
 * API Route para importar PDF de lista de útiles
 * POST /api/crm/cursos/import-pdf
 */

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Helper para logs condicionales
const DEBUG = process.env.NODE_ENV === 'development' || process.env.DEBUG_CRM === 'true'
const debugLog = (...args: any[]) => {
  if (DEBUG) {
    console.log(...args)
  }
}

/**
 * POST /api/crm/cursos/import-pdf
 * Recibe un archivo PDF y lo guarda (por ahora solo guarda, sin procesar)
 */
export async function POST(request: NextRequest) {
  try {
    debugLog('[API /crm/cursos/import-pdf POST] Recibiendo PDF')

    const formData = await request.formData()
    const pdfFile = formData.get('pdf') as File | null
    const cursoId = formData.get('cursoId') as string | null
    const colegioId = formData.get('colegioId') as string | null

    if (!pdfFile) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se recibió ningún archivo PDF',
        },
        { status: 400 }
      )
    }

    if (pdfFile.type !== 'application/pdf') {
      return NextResponse.json(
        {
          success: false,
          error: 'El archivo debe ser un PDF',
        },
        { status: 400 }
      )
    }

    // Validar tamaño del archivo (máximo 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (pdfFile.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: 'El archivo PDF es demasiado grande. Máximo 10MB',
        },
        { status: 400 }
      )
    }

    debugLog('[API /crm/cursos/import-pdf POST] PDF recibido:', {
      nombre: pdfFile.name,
      tamaño: pdfFile.size,
      tipo: pdfFile.type,
      cursoId,
      colegioId,
    })

    // Por ahora, solo confirmamos que el PDF se recibió correctamente
    // En el futuro, aquí se podría:
    // 1. Guardar el PDF en un storage (S3, local, etc.)
    // 2. Procesar el PDF para extraer materiales
    // 3. Crear una lista de útiles con los materiales extraídos
    // 4. Asignar la lista al curso

    // Convertir el archivo a buffer para poder guardarlo o procesarlo
    const arrayBuffer = await pdfFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Aquí podrías guardar el buffer en un storage o procesarlo
    // Por ahora, solo retornamos éxito

    return NextResponse.json({
      success: true,
      message: `PDF "${pdfFile.name}" recibido correctamente. El procesamiento se realizará próximamente.`,
      data: {
        nombre: pdfFile.name,
        tamaño: pdfFile.size,
        tipo: pdfFile.type,
        cursoId,
        colegioId,
      },
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/cursos/import-pdf POST] Error:', {
      message: error.message,
      stack: error.stack,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al procesar el PDF',
      },
      { status: 500 }
    )
  }
}
