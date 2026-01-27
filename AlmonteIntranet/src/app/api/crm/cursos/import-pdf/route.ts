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
    const cursoDocumentId = formData.get('cursoDocumentId') as string | null
    const cursoIdNum = formData.get('cursoIdNum') as string | null
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

    if (!cursoId && !cursoDocumentId && !cursoIdNum) {
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
      cursoDocumentId,
      cursoIdNum,
      colegioId,
      tipoCursoId: typeof cursoId,
    })

    // Determinar qué ID usar (priorizar documentId si está disponible)
    const idParaBuscar = cursoDocumentId || cursoId || cursoIdNum
    const isDocumentId = idParaBuscar && typeof idParaBuscar === 'string' && !/^\d+$/.test(idParaBuscar)
    
    let curso: any = null
    let cursoResponse: any = null
    let errorDetalle: string = ''

    // Obtener el curso actual para agregar la nueva versión
    // Manejar tanto documentId como id numérico, con retry mechanism
    let intentos = 0
    const maxIntentos = 3
    const delayEntreIntentos = 1000 // 1 segundo
    
    while (intentos < maxIntentos && !curso) {
      intentos++
      debugLog(`[API /crm/cursos/import-pdf POST] Intento ${intentos}/${maxIntentos} de buscar curso`)
      
      // Si no es el primer intento, esperar un poco
      if (intentos > 1) {
        debugLog(`[API /crm/cursos/import-pdf POST] Esperando ${delayEntreIntentos}ms antes del siguiente intento...`)
        await new Promise(resolve => setTimeout(resolve, delayEntreIntentos))
      }
      
      try {
        // Intentar primero con documentId si está disponible
        if (cursoDocumentId) {
          debugLog('[API /crm/cursos/import-pdf POST] Buscando curso por documentId:', cursoDocumentId)
          const params = new URLSearchParams({
            'filters[documentId][$eq]': cursoDocumentId,
            'publicationState': 'preview',
          })
          cursoResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
            `/api/cursos?${params.toString()}`
          )
          
          if (cursoResponse.data && Array.isArray(cursoResponse.data) && cursoResponse.data.length > 0) {
            curso = cursoResponse.data[0]
            debugLog('[API /crm/cursos/import-pdf POST] ✅ Curso encontrado por documentId')
            break
          } else if (cursoResponse.data && !Array.isArray(cursoResponse.data)) {
            curso = cursoResponse.data
            debugLog('[API /crm/cursos/import-pdf POST] ✅ Curso encontrado por documentId (no array)')
            break
          }
        }
        
        // Si no se encontró con documentId, intentar con id numérico
        if (!curso && cursoIdNum) {
          debugLog('[API /crm/cursos/import-pdf POST] Buscando curso por id numérico:', cursoIdNum)
          try {
            cursoResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
              `/api/cursos/${cursoIdNum}?publicationState=preview`
            )
            
            if (cursoResponse.data) {
              curso = Array.isArray(cursoResponse.data) ? cursoResponse.data[0] : cursoResponse.data
              debugLog('[API /crm/cursos/import-pdf POST] ✅ Curso encontrado por id numérico')
              break
            }
          } catch (idError: any) {
            debugLog('[API /crm/cursos/import-pdf POST] ⚠️ Error al buscar por id numérico:', idError.message)
          }
        }
        
        // Si aún no se encontró, intentar con el cursoId principal
        if (!curso && cursoId && cursoId !== cursoDocumentId && cursoId !== cursoIdNum) {
          const isDocumentId = typeof cursoId === 'string' && !/^\d+$/.test(cursoId)
          
          if (isDocumentId) {
            debugLog('[API /crm/cursos/import-pdf POST] Buscando curso por cursoId (documentId):', cursoId)
            const params = new URLSearchParams({
              'filters[documentId][$eq]': cursoId,
              'publicationState': 'preview',
            })
            cursoResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
              `/api/cursos?${params.toString()}`
            )
            
            if (cursoResponse.data && Array.isArray(cursoResponse.data) && cursoResponse.data.length > 0) {
              curso = cursoResponse.data[0]
              debugLog('[API /crm/cursos/import-pdf POST] ✅ Curso encontrado por cursoId (documentId)')
              break
            }
          } else {
            debugLog('[API /crm/cursos/import-pdf POST] Buscando curso por cursoId (numérico):', cursoId)
            try {
              cursoResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
                `/api/cursos/${cursoId}?publicationState=preview`
              )
              
              if (cursoResponse.data) {
                curso = Array.isArray(cursoResponse.data) ? cursoResponse.data[0] : cursoResponse.data
                debugLog('[API /crm/cursos/import-pdf POST] ✅ Curso encontrado por cursoId (numérico)')
                break
              }
            } catch (idError: any) {
              debugLog('[API /crm/cursos/import-pdf POST] ⚠️ Error al buscar por cursoId:', idError.message)
            }
          }
        }
        
        // Si aún no se encontró después de todos los intentos, preparar mensaje de error
        if (!curso && intentos >= maxIntentos) {
          errorDetalle = `No se encontró curso después de ${maxIntentos} intentos. IDs probados: documentId=${cursoDocumentId || 'N/A'}, idNum=${cursoIdNum || 'N/A'}, cursoId=${cursoId || 'N/A'}`
        }
      } catch (error: any) {
        debugLog(`[API /crm/cursos/import-pdf POST] Error en intento ${intentos}:`, {
          error: error.message,
          status: error.status,
        })
        
        // Si es el último intento, retornar error
        if (intentos >= maxIntentos) {
          return NextResponse.json(
            {
              success: false,
              error: 'Error al buscar curso: ' + (error.message || 'Error desconocido'),
              detalles: errorDetalle || `cursoId recibido: ${cursoId} (tipo: ${typeof cursoId})`,
            },
            { status: 404 }
          )
        }
      }
    }

    if (!curso || typeof curso !== 'object') {
      debugLog('[API /crm/cursos/import-pdf POST] Curso no encontrado o formato inválido:', {
        curso: curso,
        cursoId,
        cursoDocumentId,
        cursoIdNum,
        idParaBuscar,
        isDocumentId,
        intentos,
      })
      return NextResponse.json(
        {
          success: false,
          error: 'Curso no encontrado o formato inválido',
          detalles: errorDetalle || `IDs probados: documentId=${cursoDocumentId || 'N/A'}, idNum=${cursoIdNum || 'N/A'}, cursoId=${cursoId || 'N/A'} (intentos: ${intentos})`,
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
    console.log('[API /crm/cursos/import-pdf POST] 📤 Iniciando subida de PDF a Strapi Media Library...', {
      nombreArchivo: pdfFile.name,
      tamaño: pdfFile.size,
      tipo: pdfFile.type,
      cursoId: cursoId || cursoDocumentId || cursoIdNum,
    })
    
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
    
    console.log('[API /crm/cursos/import-pdf POST] 📤 Enviando PDF a Strapi:', {
      url: uploadUrl,
      nombreArchivo: pdfFile.name,
      tamañoBytes: pdfFile.size,
      tamañoMB: (pdfFile.size / 1024 / 1024).toFixed(2),
      tieneToken: !!process.env.STRAPI_API_TOKEN,
    })
    
    let pdfUrl: string | null = null
    let pdfId: number | null = null
    
    try {
      const uploadStartTime = Date.now()
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: uploadHeaders,
        body: uploadFormData,
      })
      const uploadDuration = Date.now() - uploadStartTime
      
      console.log('[API /crm/cursos/import-pdf POST] 📥 Respuesta de Strapi /api/upload:', {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        duration: `${uploadDuration}ms`,
        contentType: uploadResponse.headers.get('content-type'),
      })
      
      if (uploadResponse.ok) {
        const uploadResult = await uploadResponse.json()
        console.log('[API /crm/cursos/import-pdf POST] 📦 Resultado de subida:', {
          esArray: Array.isArray(uploadResult),
          cantidad: Array.isArray(uploadResult) ? uploadResult.length : 1,
          tieneDatos: !!uploadResult,
        })
        
        if (uploadResult && uploadResult.length > 0) {
          const uploadedFile = uploadResult[0]
          pdfId = uploadedFile.id
          // Construir URL completa del PDF
          pdfUrl = uploadedFile.url ? `${strapiUrl}${uploadedFile.url}` : null
          
          console.log('[API /crm/cursos/import-pdf POST] ✅ PDF subido exitosamente a Strapi:', {
            pdfId,
            pdfUrl: pdfUrl ? pdfUrl.substring(0, 100) + '...' : null,
            nombreArchivo: uploadedFile.name || pdfFile.name,
            tamaño: uploadedFile.size,
            mime: uploadedFile.mime,
            duration: `${uploadDuration}ms`,
          })
        } else {
          console.warn('[API /crm/cursos/import-pdf POST] ⚠️ Respuesta de Strapi no contiene archivos:', uploadResult)
        }
      } else {
        const errorText = await uploadResponse.text()
        console.error('[API /crm/cursos/import-pdf POST] ❌ Error al subir PDF a Strapi:', {
          status: uploadResponse.status,
          statusText: uploadResponse.statusText,
          error: errorText.substring(0, 500),
          duration: `${uploadDuration}ms`,
        })
        // Continuar sin URL del PDF (solo guardamos metadata)
      }
    } catch (uploadError: any) {
      console.error('[API /crm/cursos/import-pdf POST] ❌ Excepción al subir PDF a Strapi:', {
        error: uploadError.message,
        stack: uploadError.stack,
        nombreArchivo: pdfFile.name,
      })
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

    // Determinar qué ID usar para actualizar (preferir documentId si está disponible)
    const cursoIdParaActualizar = curso.documentId || curso.id || cursoId
    
    debugLog('[API /crm/cursos/import-pdf POST] Actualizando curso con ID:', {
      cursoIdRecibido: cursoId,
      cursoIdParaActualizar: cursoIdParaActualizar,
      cursoDocumentId: curso.documentId,
      cursoIdNum: curso.id,
    })
    
    const updateResponse = await strapiClient.put<StrapiResponse<StrapiEntity<any>>>(
      `/api/cursos/${cursoIdParaActualizar}`,
      updateData
    )

    debugLog('[API /crm/cursos/import-pdf POST] ✅ Versión creada exitosamente')
    debugLog('[API /crm/cursos/import-pdf POST] Respuesta de actualización:', {
      tieneData: !!updateResponse.data,
      cursoActualizado: updateResponse.data,
    })

    // Verificar que la actualización fue exitosa
    if (updateResponse.data) {
      const cursoActualizado = Array.isArray(updateResponse.data) ? updateResponse.data[0] : updateResponse.data
      const attrsActualizados = cursoActualizado?.attributes || cursoActualizado
      const versionesActualizadas = attrsActualizados?.versiones_materiales || []
      
      debugLog('[API /crm/cursos/import-pdf POST] Verificando versiones guardadas:', {
        cantidadVersiones: versionesActualizadas.length,
        versiones: versionesActualizadas,
      })
      
      if (versionesActualizadas.length === 0) {
        console.warn('[API /crm/cursos/import-pdf POST] ⚠️ ADVERTENCIA: El curso se actualizó pero no se guardaron las versiones')
      }
    }

    return NextResponse.json({
      success: true,
      message: `PDF "${pdfFile.name}" subido correctamente como nueva versión.`,
      data: {
        version: nuevaVersion,
        cursoId: cursoIdParaActualizar,
        versionesCount: versionesActualizadas.length,
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
