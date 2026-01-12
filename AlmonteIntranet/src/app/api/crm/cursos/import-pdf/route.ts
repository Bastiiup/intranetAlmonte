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
 * Recibe un archivo PDF y crea una nueva versión de materiales para el curso
 */
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

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

    if (!cursoId) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID del curso es requerido',
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

    // Obtener el curso actual para agregar la nueva versión
    // Incluir todos los campos necesarios para preservarlos al actualizar
    const cursoResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
      `/api/cursos/${cursoId}?fields=nombre_curso,nivel,grado,paralelo,año,activo,versiones_materiales&publicationState=preview`
    )

    if (!cursoResponse.data) {
      return NextResponse.json(
        {
          success: false,
          error: 'Curso no encontrado',
        },
        { status: 404 }
      )
    }

    // Asegurar que curso es un objeto, no un array
    const curso = Array.isArray(cursoResponse.data) ? cursoResponse.data[0] : cursoResponse.data
    
    if (!curso || typeof curso !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: 'Curso no encontrado o formato inválido',
        },
        { status: 404 }
      )
    }

    const attrs = (curso as any).attributes || curso

    // Obtener versiones existentes (si existen) o crear array vacío
    // Guardamos las versiones en un campo personalizado o en materiales como estructura de versiones
    // Por ahora, crearemos una nueva "versión" guardando los materiales con metadata
    const versionesExistentes = attrs.versiones_materiales || []
    
    // Crear nueva versión con fecha/hora actual
    const nuevaVersion = {
      id: versionesExistentes.length + 1,
      nombre_archivo: pdfFile.name,
      fecha_subida: new Date().toISOString(),
      fecha_actualizacion: new Date().toISOString(),
      materiales: [], // Por ahora vacío, se procesará después
      // Por ahora, guardamos el PDF como metadata
      metadata: {
        nombre: pdfFile.name,
        tamaño: pdfFile.size,
        tipo: pdfFile.type,
      },
    }

    // Agregar la nueva versión
    const versionesActualizadas = [...versionesExistentes, nuevaVersion]

    // Actualizar el curso con las nuevas versiones
    // IMPORTANTE: Incluir todos los campos requeridos para evitar que se pierdan o causen errores de validación
    const updateData: any = {
      data: {
        versiones_materiales: versionesActualizadas,
      },
    }
    
    // Incluir campos requeridos del curso para evitar errores de validación y pérdida de datos
    // IMPORTANTE: Incluir todos los campos que existen en el curso para no perderlos
    
    // Nombre del curso (probar diferentes variantes)
    if (attrs.nombre_curso) {
      updateData.data.nombre_curso = String(attrs.nombre_curso).trim()
    } else if (attrs.curso_nombre) {
      updateData.data.nombre_curso = String(attrs.curso_nombre).trim()
    } else if (attrs.titulo) {
      updateData.data.nombre_curso = String(attrs.titulo).trim()
    } else if (attrs.nombre) {
      updateData.data.nombre_curso = String(attrs.nombre).trim()
    }
    
    // Nivel: normalizar a "Basica" o "Media" (sin tilde, como espera Strapi)
    if (attrs.nivel) {
      const nivelStr = String(attrs.nivel).trim()
      // Normalizar diferentes variantes de "Básica" a "Basica"
      const nivelLower = nivelStr.toLowerCase()
      const nivelNormalizado = nivelLower === 'básico' || nivelLower === 'básica' || nivelLower === 'basica' ? 'Basica' : 
                               nivelLower === 'media' ? 'Media' : 
                               nivelStr
      updateData.data.nivel = nivelNormalizado
      debugLog('[API /crm/cursos/import-pdf POST] Nivel normalizado:', { original: nivelStr, normalizado: nivelNormalizado })
    }
    
    // Grado (asegurar que sea string)
    if (attrs.grado !== undefined && attrs.grado !== null && attrs.grado !== '') {
      updateData.data.grado = String(attrs.grado).trim()
    }
    
    // Paralelo (opcional, solo si existe)
    if (attrs.paralelo !== undefined && attrs.paralelo !== null && attrs.paralelo !== '') {
      updateData.data.paralelo = String(attrs.paralelo).trim()
    }
    
    // Año: asegurar que sea un número válido
    const añoValue = attrs.año !== undefined ? attrs.año : (attrs.ano !== undefined ? attrs.ano : null)
    if (añoValue !== null && añoValue !== undefined) {
      const añoNum = Number(añoValue)
      if (!isNaN(añoNum) && añoNum > 1900 && añoNum < 2100) { // Validar que sea un año razonable
        updateData.data.año = añoNum
        debugLog('[API /crm/cursos/import-pdf POST] Año incluido:', añoNum)
      } else {
        debugLog('[API /crm/cursos/import-pdf POST] ⚠️ Año inválido, omitiendo:', añoValue)
      }
    }
    
    // Estado activo (default a true si no está definido)
    if (attrs.activo !== undefined) {
      updateData.data.activo = attrs.activo !== false
    } else {
      updateData.data.activo = true
    }
    
    debugLog('[API /crm/cursos/import-pdf POST] Datos a actualizar:', {
      versiones_materiales: versionesActualizadas.length,
      nombre_curso: updateData.data.nombre_curso,
      nivel: updateData.data.nivel,
      grado: updateData.data.grado,
      año: updateData.data.año,
      activo: updateData.data.activo,
    })

    await strapiClient.put<StrapiResponse<StrapiEntity<any>>>(
      `/api/cursos/${cursoId}`,
      updateData
    )

    debugLog('[API /crm/cursos/import-pdf POST] Versión creada exitosamente')

    return NextResponse.json({
      success: true,
      message: `PDF "${pdfFile.name}" subido correctamente como nueva versión.`,
      data: {
        version: nuevaVersion,
        cursoId,
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
