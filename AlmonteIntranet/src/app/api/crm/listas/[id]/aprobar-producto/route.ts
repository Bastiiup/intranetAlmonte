/**
 * API Route para aprobar un producto individual en una lista
 * POST /api/crm/listas/[id]/aprobar-producto
 */

import { NextRequest, NextResponse } from 'next/server'
import { getColaboradorFromCookies } from '@/lib/auth/cookies'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'
import { buscarProductoFlexible } from '@/lib/utils/productos'
import { obtenerFechaChileISO } from '@/lib/utils/dates'
import { normalizarCursoStrapi, obtenerUltimaVersion } from '@/lib/utils/strapi'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validación de permisos
    const colaborador = await getColaboradorFromCookies()
    if (!colaborador) {
      console.error('[Aprobar Producto] ❌ Usuario no autenticado')
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado. Debes iniciar sesión para aprobar productos.',
        },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { productoId, productoNombre, productoIndex, aprobado } = body

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID de lista es requerido',
        },
        { status: 400 }
      )
    }

    if (productoId === undefined || aprobado === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'productoId y aprobado son requeridos',
        },
        { status: 400 }
      )
    }

    console.log('[Aprobar Producto] 🔍 Buscando producto:', {
      productoId,
      productoNombre,
      productoIndex,
      aprobado
    })

    console.log('[Aprobar Producto] 🚀 Iniciando aprobación...', { id, productoId, aprobado })

    // Obtener curso desde Strapi
    let curso: any = null

    try {
      const paramsDocId = new URLSearchParams({
        'filters[documentId][$eq]': String(id),
        'publicationState': 'preview',
      })
      const cursoResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>[]>>(
        `/api/cursos?${paramsDocId.toString()}`
      )
      
      if (cursoResponse.data && Array.isArray(cursoResponse.data) && cursoResponse.data.length > 0) {
        curso = cursoResponse.data[0]
      } else if (cursoResponse.data && !Array.isArray(cursoResponse.data)) {
        curso = cursoResponse.data
      }
    } catch (docIdError: any) {
      console.warn('[Aprobar Producto] ⚠️ Error al buscar por documentId:', docIdError.message)
    }

    // Si no se encontró con documentId, intentar con id numérico
    if (!curso && /^\d+$/.test(String(id))) {
      try {
        const cursoResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
          `/api/cursos/${id}?publicationState=preview`
        )
        
        if (cursoResponse.data) {
          curso = Array.isArray(cursoResponse.data) ? cursoResponse.data[0] : cursoResponse.data
        }
      } catch (idError: any) {
        console.warn('[Aprobar Producto] ⚠️ Error al buscar por id numérico:', idError.message)
      }
    }

    if (!curso) {
      return NextResponse.json(
        {
          success: false,
          error: 'Lista no encontrada',
        },
        { status: 404 }
      )
    }

    // Normalizar curso de Strapi
    const cursoNormalizado = normalizarCursoStrapi(curso)
    if (!cursoNormalizado) {
      console.error('[Aprobar Producto] ❌ Error al normalizar curso')
      return NextResponse.json(
        {
          success: false,
          error: 'Error al procesar los datos del curso',
        },
        { status: 500 }
      )
    }

    const versiones = cursoNormalizado.versiones_materiales || []
    const ultimaVersion = obtenerUltimaVersion(versiones)

    if (!ultimaVersion) {
      return NextResponse.json(
        {
          success: false,
          error: 'No hay versión de materiales disponible',
        },
        { status: 400 }
      )
    }

    // Actualizar el producto específico en los materiales
    const materiales = ultimaVersion.materiales || []
    
    console.log('[Aprobar Producto] 📋 Materiales disponibles:', materiales.length)
    
    // Buscar producto usando función normalizada
    const material = buscarProductoFlexible(
      materiales,
      productoId,
      productoNombre,
      productoIndex
    )

    if (!material) {
      console.error('[Aprobar Producto] ❌ Producto no encontrado. Buscado:', {
        productoId,
        productoNombre,
        productoIndex,
        materialesCount: materiales.length,
        materialesIds: materiales.slice(0, 5).map((m: any, i: number) => ({ 
          index: i, 
          id: m.id, 
          nombre: m.nombre 
        }))
      })
      return NextResponse.json(
        {
          success: false,
          error: 'Producto no encontrado en la lista',
          detalles: `Buscado: ID=${productoId}, Nombre=${productoNombre}, Index=${productoIndex}. Total materiales: ${materiales.length}`,
        },
        { status: 404 }
      )
    }

    const materialIndex = materiales.indexOf(material)
    console.log('[Aprobar Producto] ✅ Producto encontrado:', {
      index: materialIndex,
      id: material.id,
      nombre: material.nombre
    })

    // Actualizar el estado de aprobación del producto
    materiales[materialIndex] = {
      ...material,
      aprobado: aprobado === true,
      fecha_aprobacion: aprobado ? obtenerFechaChileISO() : null,
    }

    // Actualizar la última versión con los materiales modificados
    const versionesActualizadas = versiones.map((v: any) => {
      const isUltimaVersion = v.id === ultimaVersion.id || 
                             (v.fecha_subida === ultimaVersion.fecha_subida && 
                              v.fecha_actualizacion === ultimaVersion.fecha_actualizacion) ||
                             v === ultimaVersion
      
      if (isUltimaVersion) {
        return {
          ...v,
          materiales: materiales,
          fecha_actualizacion: obtenerFechaChileISO(),
        }
      }
      return v
    })

    // Guardar en Strapi
    const cursoDocumentId = curso.documentId || curso.id
    if (!cursoDocumentId) {
      return NextResponse.json(
        {
          success: false,
          error: 'El curso no tiene documentId válido',
        },
        { status: 400 }
      )
    }

    // Verificar si todos los productos están aprobados
    const todosAprobados = materiales.every((m: any) => m.aprobado === true)
    const listaAprobada = todosAprobados && materiales.length > 0
    const estadoActual = cursoNormalizado.estado_revision

    // Preparar datos de actualización (combinar versiones y estado en una sola llamada)
    const updateData: any = {
      data: {
        versiones_materiales: versionesActualizadas,
      },
    }

    // Intentar incluir estado_revision si es necesario (puede fallar si el campo no existe)
    if (listaAprobada || (aprobado === false && estadoActual === 'revisado')) {
      if (listaAprobada) {
        updateData.data.estado_revision = 'revisado'
        updateData.data.fecha_revision = obtenerFechaChileISO()
        console.log('[Aprobar Producto] 📝 Incluyendo estado_revision: "revisado"')
      } else if (aprobado === false && estadoActual === 'revisado') {
        updateData.data.estado_revision = 'borrador'
        console.log('[Aprobar Producto] 📝 Incluyendo estado_revision: "borrador"')
      }
    }

    console.log('[Aprobar Producto] 💾 Guardando en Strapi...')
    
    try {
      const response = await strapiClient.put<any>(`/api/cursos/${cursoDocumentId}`, updateData)

      if ((response as any)?.error) {
        throw new Error(`Strapi devolvió un error: ${JSON.stringify((response as any).error)}`)
      }

      console.log('[Aprobar Producto] ✅ Datos guardados exitosamente')
    } catch (error: any) {
      // Si falla por estado_revision, intentar solo con versiones_materiales
      if (error.message?.includes('estado_revision') || error.message?.includes('Invalid key')) {
        console.warn('[Aprobar Producto] ⚠️ estado_revision no existe, guardando solo versiones_materiales')
        
        const updateDataSinEstado = {
          data: {
            versiones_materiales: versionesActualizadas,
          },
        }
        
        const response = await strapiClient.put<any>(`/api/cursos/${cursoDocumentId}`, updateDataSinEstado)
        
        if ((response as any)?.error) {
          throw new Error(`Strapi devolvió un error: ${JSON.stringify((response as any).error)}`)
        }
        
        console.log('[Aprobar Producto] ✅ Versiones guardadas (sin estado_revision)')
      } else {
        throw error
      }
    }

    console.log('[Aprobar Producto] ✅ Producto aprobado exitosamente')

    return NextResponse.json({
      success: true,
      message: aprobado ? 'Producto aprobado' : 'Aprobación removida',
      data: {
        productoId,
        aprobado,
        todosAprobados,
        listaAprobada,
        totalProductos: materiales.length,
        productosAprobados: materiales.filter((m: any) => m.aprobado === true).length,
      },
    }, { status: 200 })

  } catch (error: any) {
    console.error('[Aprobar Producto] ❌ Error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    })
    
    return NextResponse.json(
      {
        success: false,
        error: 'Error al aprobar el producto. Por favor, intenta nuevamente.',
        detalles: error instanceof Error ? error.message : 'Error desconocido',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
      },
      { status: 500 }
    )
  }
}
