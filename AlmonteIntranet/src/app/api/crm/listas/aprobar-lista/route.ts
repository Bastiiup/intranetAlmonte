/**
 * API Route para aprobar una lista completa
 * POST /api/crm/listas/aprobar-lista
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { listaId } = body

    if (!listaId) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID de lista es requerido',
        },
        { status: 400 }
      )
    }

    console.log('[Aprobar Lista] 🚀 Aprobando lista completa...', { listaId })

    // Obtener curso desde Strapi
    let curso: any = null

    try {
      const paramsDocId = new URLSearchParams({
        'filters[documentId][$eq]': String(listaId),
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
      console.warn('[Aprobar Lista] ⚠️ Error al buscar por documentId:', docIdError.message)
    }

    // Si no se encontró con documentId, intentar con id numérico
    if (!curso && /^\d+$/.test(String(listaId))) {
      try {
        const cursoResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
          `/api/cursos/${listaId}?publicationState=preview`
        )
        
        if (cursoResponse.data) {
          curso = Array.isArray(cursoResponse.data) ? cursoResponse.data[0] : cursoResponse.data
        }
      } catch (idError: any) {
        console.warn('[Aprobar Lista] ⚠️ Error al buscar por id numérico:', idError.message)
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

    const attrs = curso.attributes || curso
    const versiones = attrs.versiones_materiales || []
    const ultimaVersion = versiones.length > 0 
      ? versiones.sort((a: any, b: any) => {
          const fechaA = new Date(a.fecha_actualizacion || a.fecha_subida || 0).getTime()
          const fechaB = new Date(b.fecha_actualizacion || b.fecha_subida || 0).getTime()
          return fechaB - fechaA
        })[0]
      : null

    if (!ultimaVersion) {
      return NextResponse.json(
        {
          success: false,
          error: 'No hay versión de materiales disponible',
        },
        { status: 400 }
      )
    }

    const materiales = ultimaVersion.materiales || []
    
    if (materiales.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'La lista no tiene productos para aprobar',
        },
        { status: 400 }
      )
    }

    // Aprobar todos los productos
    const materialesAprobados = materiales.map((m: any) => ({
      ...m,
      aprobado: true,
      fecha_aprobacion: m.aprobado ? m.fecha_aprobacion : new Date().toISOString(),
    }))

    // Actualizar la última versión
    const versionesActualizadas = versiones.map((v: any) => {
      const isUltimaVersion = v.id === ultimaVersion.id || 
                             (v.fecha_subida === ultimaVersion.fecha_subida && 
                              v.fecha_actualizacion === ultimaVersion.fecha_actualizacion) ||
                             v === ultimaVersion
      
      if (isUltimaVersion) {
        return {
          ...v,
          materiales: materialesAprobados,
          fecha_actualizacion: new Date().toISOString(),
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

    // Actualizar versiones_materiales con los productos aprobados
    const updateData = {
      data: {
        versiones_materiales: versionesActualizadas,
      },
    }

    console.log('[Aprobar Lista] 💾 Guardando versiones en Strapi...')
    const response = await strapiClient.put<any>(`/api/cursos/${cursoDocumentId}`, updateData)

    if ((response as any)?.error) {
      throw new Error(`Strapi devolvió un error: ${JSON.stringify((response as any).error)}`)
    }

    console.log('[Aprobar Lista] ✅ Versiones guardadas exitosamente')

    // Intentar actualizar estado_revision a "revisado" (en un try-catch separado por si el campo no existe)
    try {
      console.log('[Aprobar Lista] 📝 Intentando actualizar estado_revision a "revisado"...')
      const estadoData = {
        data: {
          estado_revision: 'revisado',
          fecha_revision: new Date().toISOString(),
        },
      }
      await strapiClient.put<any>(`/api/cursos/${cursoDocumentId}`, estadoData)
      console.log('[Aprobar Lista] ✅ Estado de revisión actualizado')
    } catch (estadoError: any) {
      console.warn('[Aprobar Lista] ⚠️ No se pudo actualizar estado_revision (puede que el campo no exista en Strapi):', estadoError.message)
      // No lanzar el error, solo registrarlo
    }

    console.log('[Aprobar Lista] ✅ Lista aprobada exitosamente')

    return NextResponse.json({
      success: true,
      message: 'Lista aprobada exitosamente',
      data: {
        listaId,
        totalProductos: materialesAprobados.length,
        productosAprobados: materialesAprobados.length,
        listaAprobada: true,
      },
    }, { status: 200 })

  } catch (error: any) {
    console.error('[Aprobar Lista] ❌ Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al aprobar la lista',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
