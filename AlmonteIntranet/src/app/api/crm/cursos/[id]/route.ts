/**
 * API Route para gestionar un curso específico
 * GET, PUT, DELETE /api/crm/cursos/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

// Helper para logs condicionales
const DEBUG = process.env.NODE_ENV === 'development' || process.env.DEBUG_CRM === 'true'
const debugLog = (...args: any[]) => {
  if (DEBUG) {
    console.log(...args)
  }
}

/**
 * GET /api/crm/cursos/[id]
 * Obtiene un curso específico con sus materiales
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Obtener el ID fuera del try para que esté disponible en el catch
  let id: string
  try {
    const resolvedParams = await params
    id = resolvedParams.id
  } catch (paramsError: any) {
    // Si falla obtener params, usar un valor por defecto
    id = 'unknown'
    console.error('[API /crm/cursos/[id] GET] Error obteniendo params:', paramsError)
  }
  
  try {
    debugLog('[API /crm/cursos/[id] GET] Buscando curso con ID:', id, 'Tipo:', typeof id)
    
    // IMPORTANTE: Verificar si el ID es numérico o documentId
    // Strapi puede usar diferentes formatos de ID dependiendo de la configuración
    // Intentar primero con el ID tal como viene, luego probar otros formatos si falla
    
    // Estrategia simplificada: primero obtener el curso básico, luego poblar relaciones si es necesario
    // NO intentar populate anidado desde el principio porque causa error 500 en Strapi
    let response: any
    
    // Paso 1: Intentar obtener curso con populate básico (sin populate anidado)
    // IMPORTANTE: Como cursos tiene draftAndPublish: true, necesitamos publicationState=preview
    // para incluir cursos en estado "Draft"
    try {
      const paramsObj = new URLSearchParams({
        'populate[materiales]': 'true',
        'populate[colegio]': 'true',
        'populate[lista_utiles]': 'true', // Solo el ID de lista_utiles, sin materiales anidados
        'fields[0]': 'nombre_curso', // Incluir nombre_curso explícitamente
        'fields[1]': 'año', // Incluir año explícitamente
        'fields[2]': 'nivel', // Incluir nivel explícitamente
        'fields[3]': 'grado', // Incluir grado explícitamente
        'fields[4]': 'paralelo', // Incluir paralelo explícitamente
        'fields[5]': 'versiones_materiales', // Incluir explícitamente versiones_materiales
        'publicationState': 'preview', // Incluir drafts y publicados
      })
      response = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
        `/api/cursos/${id}?${paramsObj.toString()}`
      )
      debugLog('[API /crm/cursos/[id] GET] ✅ Curso obtenido con populate básico y publicationState=preview')
    } catch (error: any) {
      // Si falla con 404, puede ser que el curso no exista o esté en draft sin publicationState
      // Intentar primero sin publicationState (solo publicados)
      if (error.status === 404) {
        debugLog('[API /crm/cursos/[id] GET] ⚠️ Error 404 con publicationState=preview, intentando solo publicados')
        try {
          const paramsObj = new URLSearchParams({
            'populate[materiales]': 'true',
            'populate[colegio]': 'true',
            'populate[lista_utiles]': 'true',
            // Sin publicationState = solo publicados
          })
          response = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
            `/api/cursos/${id}?${paramsObj.toString()}`
          )
          debugLog('[API /crm/cursos/[id] GET] ✅ Curso obtenido (solo publicados)')
        } catch (secondError: any) {
          // Si también falla, intentar sin lista_utiles
          if (secondError.status === 500 || secondError.status === 400) {
            debugLog('[API /crm/cursos/[id] GET] ⚠️ Error también sin publicationState, intentando sin lista_utiles')
            try {
              const paramsObj = new URLSearchParams({
                'populate[materiales]': 'true',
                'populate[colegio]': 'true',
                'publicationState': 'preview',
              })
              response = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
                `/api/cursos/${id}?${paramsObj.toString()}`
              )
              debugLog('[API /crm/cursos/[id] GET] ✅ Curso obtenido sin lista_utiles')
            } catch (thirdError: any) {
              // Si también falla, intentar solo campos básicos
              debugLog('[API /crm/cursos/[id] GET] ⚠️ Error también sin lista_utiles, intentando solo campos básicos')
              response = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
                `/api/cursos/${id}?publicationState=preview`
              )
              debugLog('[API /crm/cursos/[id] GET] ✅ Curso obtenido solo con campos básicos')
            }
          } else {
            // Si es otro tipo de error, propagarlo
            throw secondError
          }
        }
      } else if (error.status === 500 || error.status === 400) {
        // Si es error 500/400, intentar sin lista_utiles
        debugLog('[API /crm/cursos/[id] GET] ⚠️ Error 500/400 con populate básico, intentando sin lista_utiles')
        try {
          const paramsObj = new URLSearchParams({
            'populate[materiales]': 'true',
            'populate[colegio]': 'true',
            'publicationState': 'preview',
          })
          response = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
            `/api/cursos/${id}?${paramsObj.toString()}`
          )
          debugLog('[API /crm/cursos/[id] GET] ✅ Curso obtenido sin lista_utiles')
        } catch (secondError: any) {
          // Si también falla, intentar solo campos básicos
          debugLog('[API /crm/cursos/[id] GET] ⚠️ Error también sin lista_utiles, intentando solo campos básicos')
          response = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
            `/api/cursos/${id}?publicationState=preview`
          )
          debugLog('[API /crm/cursos/[id] GET] ✅ Curso obtenido solo con campos básicos')
        }
      } else {
        // Si es otro tipo de error, propagarlo
        throw error
      }
    }
    
    // Paso 2: Si tenemos lista_utiles pero sin materiales, intentar obtenerlos por separado
    if (response?.data?.lista_utiles?.data?.id || response?.data?.lista_utiles?.id) {
      const listaUtilesId = response.data.lista_utiles.data?.id || response.data.lista_utiles.id
      try {
        debugLog('[API /crm/cursos/[id] GET] Obteniendo materiales de lista_utiles por separado:', listaUtilesId)
        const listaResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
          `/api/listas-utiles/${listaUtilesId}?populate[materiales]=true`
        )
        // Agregar los materiales a la respuesta
        // Strapi devuelve los datos en response.data.attributes o response.data directamente
        const listaData = listaResponse?.data as any
        const materiales = listaData?.attributes?.materiales || listaData?.materiales || null
        
        if (materiales) {
          if (response.data.lista_utiles.data) {
            response.data.lista_utiles.data.attributes = response.data.lista_utiles.data.attributes || {}
            response.data.lista_utiles.data.attributes.materiales = materiales
          } else if (response.data.lista_utiles.attributes) {
            response.data.lista_utiles.attributes.materiales = materiales
          } else {
            response.data.lista_utiles.materiales = materiales
          }
          debugLog('[API /crm/cursos/[id] GET] ✅ Materiales de lista_utiles agregados')
        }
      } catch (listaError: any) {
        // Si falla obtener materiales de lista_utiles, no es crítico, continuar sin ellos
        debugLog('[API /crm/cursos/[id] GET] ⚠️ No se pudieron obtener materiales de lista_utiles (no crítico):', listaError.message)
      }
    }

    // Verificar que la respuesta tenga datos
    if (!response.data) {
      debugLog('[API /crm/cursos/[id] GET] ⚠️ Respuesta sin datos para ID:', id)
      return NextResponse.json(
        {
          success: false,
          error: `Curso con ID ${id} no encontrado`,
          status: 404,
        },
        { status: 404 }
      )
    }

    // Verificar que realmente tenemos datos
    if (!response || !response.data) {
      debugLog('[API /crm/cursos/[id] GET] ⚠️ Respuesta sin datos para ID:', id)
      return NextResponse.json(
        {
          success: false,
          error: `Curso con ID ${id} no encontrado`,
          status: 404,
        },
        { status: 404 }
      )
    }

    debugLog('[API /crm/cursos/[id] GET] ✅ Curso encontrado:', {
      hasData: !!response.data,
      id: response.data?.id || response.data?.documentId,
      nombre: (response.data as any)?.attributes?.nombre_curso || (response.data as any)?.nombre_curso,
    })

    return NextResponse.json({
      success: true,
      data: response.data,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/cursos/[id] GET] Error:', {
      message: error.message,
      status: error.status,
      id,
    })
    
    // Si es un error 404, devolver mensaje más claro
    if (error.status === 404 || error.message?.includes('Not Found') || error.message?.includes('not found')) {
      return NextResponse.json(
        {
          success: false,
          error: `Curso con ID ${id} no encontrado`,
          status: 404,
        },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener curso',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * PUT /api/crm/cursos/[id]
 * Actualiza un curso
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    debugLog('[API /crm/cursos/[id] PUT] Actualizando curso:', id)

    // Validaciones
    if (body.nombre_curso !== undefined && !body.nombre_curso?.trim()) {
      return NextResponse.json(
        { success: false, error: 'El nombre del curso no puede estar vacío' },
        { status: 400 }
      )
    }

    // Preparar datos para Strapi
    const cursoData: any = {
      data: {},
    }

    // Actualizar campos solo si están presentes
    if (body.nombre_curso !== undefined) {
      cursoData.data.nombre_curso = body.nombre_curso.trim()
    }
    if (body.nivel !== undefined) {
      cursoData.data.nivel = body.nivel
    }
    if (body.grado !== undefined) {
      cursoData.data.grado = body.grado
    }
    if (body.paralelo !== undefined) {
      cursoData.data.paralelo = body.paralelo || null
    }
    if (body.año !== undefined || body.ano !== undefined) {
      cursoData.data.año = body.año || body.ano || new Date().getFullYear()
    }
    if (body.activo !== undefined) {
      cursoData.data.activo = body.activo
    }

    // Actualizar relación lista_utiles
    if (body.lista_utiles !== undefined) {
      if (body.lista_utiles === null || body.lista_utiles === '') {
        // Desconectar lista_utiles
        cursoData.data.lista_utiles = { disconnect: true }
      } else {
        const listaUtilesId = typeof body.lista_utiles === 'number' 
          ? body.lista_utiles 
          : parseInt(String(body.lista_utiles))
        if (!isNaN(listaUtilesId)) {
          cursoData.data.lista_utiles = { connect: [listaUtilesId] }
        }
      }
    }

    // Actualizar versiones_materiales si se proporcionan (para importación completa)
    if (body.versiones_materiales !== undefined) {
      if (Array.isArray(body.versiones_materiales)) {
        cursoData.data.versiones_materiales = body.versiones_materiales
        
        // 🔍 LOG: Verificar que las versiones tengan PDFs
        const versionesConPDF = body.versiones_materiales.filter((v: any) => v.pdf_url && v.pdf_id)
        const versionesSinPDF = body.versiones_materiales.filter((v: any) => !v.pdf_url || !v.pdf_id)
        
        debugLog('[API /crm/cursos/[id] PUT] Actualizando versiones_materiales:', {
          total: body.versiones_materiales.length,
          conPDF: versionesConPDF.length,
          sinPDF: versionesSinPDF.length,
          versionesConPDF: versionesConPDF.map((v: any) => ({ nombre: v.nombre_archivo, pdfUrl: v.pdf_url, pdfId: v.pdf_id })),
        })
        
        // 🔍 LOG: Verificar estructura completa
        console.log('[API /crm/cursos/[id] PUT] 📦 Versiones recibidas:', JSON.stringify(body.versiones_materiales, null, 2))
        console.log('[API /crm/cursos/[id] PUT] 📦 Payload completo a enviar a Strapi:', JSON.stringify(cursoData, null, 2))
      } else {
        // Si es null o undefined, mantener el valor actual (no actualizar)
        debugLog('[API /crm/cursos/[id] PUT] versiones_materiales no es un array, ignorando')
      }
    }

    // Actualizar materiales adicionales si se proporcionan
    if (body.materiales !== undefined) {
      if (Array.isArray(body.materiales) && body.materiales.length > 0) {
        cursoData.data.materiales = body.materiales.map((material: any) => ({
          material_nombre: material.material_nombre || '',
          tipo: material.tipo || 'util',
          cantidad: material.cantidad ? parseInt(String(material.cantidad)) : 1,
          obligatorio: material.obligatorio !== undefined ? material.obligatorio : true,
          ...(material.descripcion && { descripcion: material.descripcion }),
        }))
      } else {
        // Array vacío si no hay materiales
        cursoData.data.materiales = []
      }
    }
    
    // Limpiar campos undefined o null
    Object.keys(cursoData.data).forEach(key => {
      if (cursoData.data[key] === undefined || cursoData.data[key] === null) {
        delete cursoData.data[key]
      }
    })

    // 🔍 LOG CRÍTICO: Verificar payload antes de enviar
    console.log('[API /crm/cursos/[id] PUT] 📤 Enviando a Strapi:', {
      cursoId: id,
      tieneVersionesMateriales: !!cursoData.data.versiones_materiales,
      cantidadVersiones: cursoData.data.versiones_materiales?.length || 0,
      payloadCompleto: JSON.stringify(cursoData, null, 2),
    })
    
    const response = await strapiClient.put<StrapiResponse<StrapiEntity<any>>>(
      `/api/cursos/${id}`,
      cursoData
    )
    
    // 🔍 LOG CRÍTICO: Verificar respuesta de Strapi
    const responseData = Array.isArray(response.data) ? response.data[0] : response.data
    const responseAttrs = (responseData as any)?.attributes || responseData
    const versionesEnRespuesta = responseAttrs?.versiones_materiales || []
    
    console.log('[API /crm/cursos/[id] PUT] 📥 Respuesta de Strapi:', {
      tieneData: !!response.data,
      versionesEnRespuesta: versionesEnRespuesta.length || 0,
      versionesCompletas: JSON.stringify(versionesEnRespuesta, null, 2),
    })

    debugLog('[API /crm/cursos/[id] PUT] Curso actualizado exitosamente')
    
    // 🔍 LOG: Verificar que las versiones se guardaron correctamente en la respuesta
    const cursoActualizado = Array.isArray(response.data) ? response.data[0] : response.data
    const attrsActualizados = cursoActualizado?.attributes || cursoActualizado
    const versionesGuardadas = attrsActualizados?.versiones_materiales || []
    const versionesConPDFGuardadas = versionesGuardadas.filter((v: any) => v.pdf_url && v.pdf_id)
    
    console.log('[API /crm/cursos/[id] PUT] ✅ Verificación después de actualizar (en respuesta):', {
      totalVersiones: versionesGuardadas.length,
      versionesConPDFCount: versionesConPDFGuardadas.length,
      versionesConPDFDetalle: versionesConPDFGuardadas.map((v: any) => ({ 
        nombre: v.nombre_archivo, 
        pdfUrl: v.pdf_url, 
        pdfId: v.pdf_id 
      })),
      todasLasVersiones: JSON.stringify(versionesGuardadas, null, 2),
    })
    
    // 🔍 VERIFICACIÓN CRÍTICA: Obtener el curso nuevamente desde Strapi para confirmar que se guardó
    try {
      console.log('[API /crm/cursos/[id] PUT] 🔍 Verificando guardado: Obteniendo curso desde Strapi...')
      const verifyResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
        `/api/cursos/${id}?publicationState=preview`
      )
      const cursoVerificado = Array.isArray(verifyResponse.data) ? verifyResponse.data[0] : verifyResponse.data
      const attrsVerificados = (cursoVerificado as any)?.attributes || cursoVerificado
      const versionesVerificadas = attrsVerificados?.versiones_materiales || []
      const versionesConPDFVerificadas = versionesVerificadas.filter((v: any) => v.pdf_url && v.pdf_id)
      
      console.log('[API /crm/cursos/[id] PUT] ✅ VERIFICACIÓN FINAL - Curso obtenido desde Strapi:', {
        cursoId: id,
        totalVersiones: versionesVerificadas.length,
        versionesConPDFCount: versionesConPDFVerificadas.length,
        versionesConPDFDetalle: versionesConPDFVerificadas.map((v: any) => ({ 
          nombre: v.nombre_archivo, 
          pdfUrl: v.pdf_url ? v.pdf_url.substring(0, 80) + '...' : null, 
          pdfId: v.pdf_id 
        })),
        todasLasVersiones: JSON.stringify(versionesVerificadas, null, 2),
      })
    } catch (verifyError: any) {
      console.error('[API /crm/cursos/[id] PUT] ⚠️ Error al verificar guardado:', verifyError.message)
    }

    return NextResponse.json({
      success: true,
      data: response.data,
      message: 'Curso actualizado exitosamente',
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/cursos/[id] PUT] Error:', {
      message: error.message,
      status: error.status,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al actualizar curso',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * DELETE /api/crm/cursos/[id]
 * Elimina un curso
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    debugLog('[API /crm/cursos/[id] DELETE] Eliminando curso:', id)

    await strapiClient.delete(`/api/cursos/${id}`)

    return NextResponse.json({
      success: true,
      message: 'Curso eliminado exitosamente',
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/cursos/[id] DELETE] Error:', {
      message: error.message,
      status: error.status,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al eliminar curso',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}
