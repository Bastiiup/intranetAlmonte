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
      tipoCursoId: typeof cursoId,
    })

    // Determinar si cursoId es un documentId (UUID) o un id numérico
    const isDocumentId = typeof cursoId === 'string' && !/^\d+$/.test(cursoId)
    
    let curso: any = null
    let cursoResponse: any = null
    let errorDetalle: string = ''

    // Obtener el curso actual para agregar la nueva versión
    // Manejar tanto documentId como id numérico
    try {
      if (isDocumentId) {
        // Si es documentId, usar filtro
        debugLog('[API /crm/cursos/import-pdf POST] Buscando curso por documentId:', cursoId)
        const params = new URLSearchParams({
          'filters[documentId][$eq]': cursoId,
          'publicationState': 'preview',
        })
        cursoResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
          `/api/cursos?${params.toString()}`
        )
        
        debugLog('[API /crm/cursos/import-pdf POST] Respuesta por documentId:', {
          tieneData: !!cursoResponse.data,
          esArray: Array.isArray(cursoResponse.data),
          length: Array.isArray(cursoResponse.data) ? cursoResponse.data.length : 'N/A',
        })
        
        if (cursoResponse.data && Array.isArray(cursoResponse.data) && cursoResponse.data.length > 0) {
          curso = cursoResponse.data[0]
        } else if (cursoResponse.data && !Array.isArray(cursoResponse.data)) {
          curso = cursoResponse.data
        } else {
          errorDetalle = `No se encontró curso con documentId: ${cursoId}`
        }
      } else {
        // Si es id numérico, usar ruta directa
        debugLog('[API /crm/cursos/import-pdf POST] Buscando curso por id numérico:', cursoId)
        try {
          cursoResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
            `/api/cursos/${cursoId}?publicationState=preview`
          )
          
          debugLog('[API /crm/cursos/import-pdf POST] Respuesta por id numérico:', {
            tieneData: !!cursoResponse.data,
            esArray: Array.isArray(cursoResponse.data),
          })
          
          if (cursoResponse.data) {
            curso = Array.isArray(cursoResponse.data) ? cursoResponse.data[0] : cursoResponse.data
          } else {
            errorDetalle = `No se encontró curso con id: ${cursoId}`
          }
        } catch (idError: any) {
          // Si falla con id numérico, intentar también con documentId por si acaso
          debugLog('[API /crm/cursos/import-pdf POST] Falló búsqueda por id, intentando por documentId...')
          const params = new URLSearchParams({
            'filters[documentId][$eq]': String(cursoId),
            'publicationState': 'preview',
          })
          cursoResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
            `/api/cursos?${params.toString()}`
          )
          
          if (cursoResponse.data && Array.isArray(cursoResponse.data) && cursoResponse.data.length > 0) {
            curso = cursoResponse.data[0]
          } else if (cursoResponse.data && !Array.isArray(cursoResponse.data)) {
            curso = cursoResponse.data
          } else {
            errorDetalle = `No se encontró curso con id/documentId: ${cursoId}. Error original: ${idError.message}`
          }
        }
      }
    } catch (error: any) {
      debugLog('[API /crm/cursos/import-pdf POST] Error al buscar curso:', {
        error: error.message,
        status: error.status,
        response: error.response?.data || error.data,
      })
      return NextResponse.json(
        {
          success: false,
          error: 'Error al buscar curso: ' + (error.message || 'Error desconocido'),
          detalles: errorDetalle || `cursoId recibido: ${cursoId} (tipo: ${typeof cursoId})`,
        },
        { status: 404 }
      )
    }

    if (!curso || typeof curso !== 'object') {
      debugLog('[API /crm/cursos/import-pdf POST] Curso no encontrado o formato inválido:', {
        curso: curso,
        cursoId,
        isDocumentId,
      })
      return NextResponse.json(
        {
          success: false,
          error: 'Curso no encontrado o formato inválido',
          detalles: errorDetalle || `cursoId recibido: ${cursoId} (tipo: ${typeof cursoId}, isDocumentId: ${isDocumentId})`,
        },
        { status: 404 }
      )
    }
    
    debugLog('[API /crm/cursos/import-pdf POST] ✅ Curso encontrado:', {
      id: curso.id,
      documentId: curso.documentId,
      nombre: curso.attributes?.nombre_curso || curso.attributes?.curso_nombre,
    })

    const attrs = (curso as any).attributes || curso

    debugLog('[API /crm/cursos/import-pdf POST] Atributos del curso:', {
      nombre_curso: attrs.nombre_curso,
      nivel: attrs.nivel,
      grado: attrs.grado,
      paralelo: attrs.paralelo,
      año: attrs.año,
      ano: attrs.ano,
      activo: attrs.activo,
      tieneVersiones: !!attrs.versiones_materiales,
    })

    // Subir el PDF a Strapi Media Library
    debugLog('[API /crm/cursos/import-pdf POST] Subiendo PDF a Strapi Media Library...')
    
    const pdfBuffer = await pdfFile.arrayBuffer()
    const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' })
    
    // Crear FormData para subir el archivo a Strapi
    const uploadFormData = new FormData()
    uploadFormData.append('files', pdfBlob, pdfFile.name)
    
    // Subir a Strapi Media Library
    const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || process.env.STRAPI_URL || 'https://strapi.moraleja.cl'
    const uploadUrl = `${strapiUrl}/api/upload`
    const uploadHeaders: HeadersInit = {
      'Authorization': `Bearer ${process.env.STRAPI_API_TOKEN || ''}`,
    }
    
    let pdfUrl: string | null = null
    let pdfId: number | null = null
    
    try {
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: uploadHeaders,
        body: uploadFormData,
      })
      
      if (uploadResponse.ok) {
        const uploadResult = await uploadResponse.json()
        if (uploadResult && uploadResult.length > 0) {
          const uploadedFile = uploadResult[0]
          pdfId = uploadedFile.id
          // Construir URL completa del PDF
          pdfUrl = uploadedFile.url ? `${strapiUrl}${uploadedFile.url}` : null
          debugLog('[API /crm/cursos/import-pdf POST] ✅ PDF subido a Strapi:', { pdfId, pdfUrl })
        }
      } else {
        const errorText = await uploadResponse.text()
        debugLog('[API /crm/cursos/import-pdf POST] ⚠️ Error al subir PDF a Strapi:', {
          status: uploadResponse.status,
          error: errorText,
        })
        // Continuar sin URL del PDF (solo guardamos metadata)
      }
    } catch (uploadError: any) {
      debugLog('[API /crm/cursos/import-pdf POST] ⚠️ Error al subir PDF a Strapi:', uploadError)
      // Continuar sin URL del PDF (solo guardamos metadata)
    }
    
    // Obtener versiones existentes (si existen) o crear array vacío
    // Guardamos las versiones en un campo personalizado o en materiales como estructura de versiones
    const versionesExistentes = attrs.versiones_materiales || []
    
    // Crear nueva versión con fecha/hora actual
    const nuevaVersion = {
      id: versionesExistentes.length + 1,
      nombre_archivo: pdfFile.name,
      fecha_subida: new Date().toISOString(),
      fecha_actualizacion: new Date().toISOString(),
      materiales: [], // Por ahora vacío, se procesará después
      // Guardar URL del PDF si se subió correctamente
      pdf_url: pdfUrl,
      pdf_id: pdfId,
      // Metadata del archivo
      metadata: {
        nombre: pdfFile.name,
        tamaño: pdfFile.size,
        tipo: pdfFile.type,
      },
    }

    // Agregar la nueva versión
    const versionesActualizadas = [...versionesExistentes, nuevaVersion]

    // Actualizar el curso con las nuevas versiones
    // IMPORTANTE: Solo incluir versiones_materiales y campos que existan y sean válidos
    // NO incluir campos que no existen o son inválidos para evitar errores de validación
    const updateData: any = {
      data: {
        versiones_materiales: versionesActualizadas,
      },
    }
    
    // Incluir campos del curso SOLO si existen y son válidos
    // NO incluir campos requeridos si no existen - Strapi mantendrá los valores existentes
    
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
    // IMPORTANTE: Si el año no existe o es inválido, NO incluirlo en el payload
    // Strapi mantendrá el valor existente del curso
    const añoValue = attrs.año !== undefined && attrs.año !== null && attrs.año !== '' ? attrs.año : 
                     (attrs.ano !== undefined && attrs.ano !== null && attrs.ano !== '' ? attrs.ano : null)
    
    if (añoValue !== null && añoValue !== undefined && añoValue !== '') {
      const añoNum = Number(añoValue)
      if (!isNaN(añoNum) && añoNum > 1900 && añoNum < 2100) {
        // Solo incluir si es un año válido
        updateData.data.año = añoNum
        debugLog('[API /crm/cursos/import-pdf POST] ✅ Año incluido:', añoNum)
      } else {
        debugLog('[API /crm/cursos/import-pdf POST] ⚠️ Año inválido, NO incluyendo en payload:', { añoValue, añoNum })
        // NO incluir año en el payload si es inválido
      }
    } else {
      debugLog('[API /crm/cursos/import-pdf POST] ⚠️ Año no encontrado o es null/undefined/vacío, NO incluyendo en payload')
      // NO incluir año si no existe - Strapi mantendrá el valor existente
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
