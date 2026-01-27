/**
 * API Route para obtener colegios con conteo de listas por año
 * GET /api/crm/listas/por-colegio
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

const DEBUG = process.env.NODE_ENV === 'development' || process.env.DEBUG_CRM === 'true'
const debugLog = (...args: any[]) => {
  if (DEBUG) {
    console.log(...args)
  }
}

/**
 * GET /api/crm/listas/por-colegio
 * Obtiene todos los colegios con conteo de listas por año
 */
export async function GET(request: NextRequest) {
  try {
    debugLog('[API /crm/listas/por-colegio GET] Obteniendo colegios con conteo de listas...')

    // Obtener todos los cursos con versiones de materiales
    const filters: string[] = []
    filters.push('populate[colegio][populate][comuna]=true')
    filters.push('populate[colegio][populate][direcciones]=true')
    filters.push('publicationState=preview')

    const queryString = filters.length > 0 ? `?${filters.join('&')}` : '?populate[colegio]=true&publicationState=preview'
    const cacheBuster = queryString.includes('?') ? `&_t=${Date.now()}` : `?_t=${Date.now()}`
    const finalQuery = `${queryString}${cacheBuster}`

    const response = await strapiClient.get<StrapiResponse<StrapiEntity<any>[]>>(
      `/api/cursos${finalQuery}`
    )

    const cursos = Array.isArray(response.data) ? response.data : (response.data ? [response.data] : [])

    debugLog('[API /crm/listas/por-colegio GET] Total cursos encontrados:', cursos.length)

    // Agrupar cursos por colegio
    const colegiosMap = new Map<string | number, {
      colegio: any
      cursos: any[]
      listasPorAño: {
        2024: number
        2025: number
        2026: number
        2027: number
        [key: number]: number
      }
    }>()

    cursos.forEach((curso: any) => {
      const attrs = (curso as any)?.attributes || curso
      const versiones = attrs.versiones_materiales || []
      
      // Verificar si tiene versiones con PDFs o materiales
      const tieneContenido = versiones.some((v: any) => 
        (v.pdf_id || v.pdf_url) || (v.materiales && Array.isArray(v.materiales) && v.materiales.length > 0)
      )

      if (!tieneContenido) return

      const colegioData = attrs.colegio?.data || attrs.colegio
      const colegioAttrs = (colegioData as any)?.attributes || colegioData
      
      // Obtener ID del colegio (usar RBD si está disponible, sino ID)
      const colegioId = colegioAttrs?.rbd || colegioData?.rbd || colegioData?.id || curso.id
      if (!colegioId) return

      // Obtener año del curso
      const año = attrs.año || attrs.ano || new Date().getFullYear()

      if (!colegiosMap.has(colegioId)) {
        // Obtener representante - puede estar en diferentes lugares
        const representante = colegioAttrs?.representante || 
                             colegioData?.representante || 
                             colegioAttrs?.representante_comercial ||
                             colegioData?.representante_comercial || ''

        colegiosMap.set(colegioId, {
          colegio: {
            id: colegioData?.id || colegioData?.documentId,
            documentId: colegioData?.documentId || colegioData?.id,
            nombre: colegioAttrs?.colegio_nombre || colegioAttrs?.nombre || colegioData?.colegio_nombre || colegioData?.nombre || 'Sin nombre',
            rbd: colegioAttrs?.rbd || colegioData?.rbd || '',
            direccion: (() => {
              // Intentar obtener dirección de diferentes fuentes
              // 1. Campo direccion directo
              if (colegioAttrs?.direccion) return colegioAttrs.direccion
              if (colegioData?.direccion) return colegioData.direccion
              
              // 2. Construir desde array de direcciones
              const direcciones = colegioAttrs?.direcciones || colegioData?.direcciones
              if (direcciones && Array.isArray(direcciones) && direcciones.length > 0) {
                const primeraDireccion = direcciones[0]
                const attrsDir = (primeraDireccion as any)?.attributes || primeraDireccion
                
                // Construir dirección completa desde campos
                const partes: string[] = []
                if (attrsDir?.nombre_calle) partes.push(attrsDir.nombre_calle)
                if (attrsDir?.numero_calle) partes.push(attrsDir.numero_calle)
                if (attrsDir?.complemento_direccion) partes.push(attrsDir.complemento_direccion)
                
                if (partes.length > 0) {
                  return partes.join(' ')
                }
                
                // Si tiene campo direccion en el objeto
                if (attrsDir?.direccion) return attrsDir.direccion
              }
              
              return ''
            })(),
            region: colegioAttrs?.region || colegioData?.region || '',
            comuna: colegioAttrs?.comuna?.comuna_nombre || 
                   (typeof colegioAttrs?.comuna === 'string' ? colegioAttrs.comuna : '') ||
                   colegioData?.comuna?.comuna_nombre || 
                   (typeof colegioData?.comuna === 'string' ? colegioData.comuna : '') || '',
            representante: representante,
            ultimaActualizacion: '',
          },
          cursos: [],
          listasPorAño: {
            2024: 0,
            2025: 0,
            2026: 0,
            2027: 0,
          }
        })
      }

      const colegioInfo = colegiosMap.get(colegioId)!
      
      // Obtener fecha de actualización del curso
      const updatedAt = attrs.updatedAt || curso.updatedAt || attrs.createdAt || curso.createdAt
      
      // Guardar el curso completo con toda su información
      colegioInfo.cursos.push({
        ...curso,
        _año: año,
        _grado: attrs.grado || 1,
        _nivel: attrs.nivel || 'Basica',
        _updatedAt: updatedAt,
      })
      
      // Actualizar fecha de última actualización del colegio (la más reciente)
      if (updatedAt) {
        const fechaCurso = new Date(updatedAt).getTime()
        const fechaActual = colegioInfo.colegio.ultimaActualizacion 
          ? new Date(colegioInfo.colegio.ultimaActualizacion).getTime()
          : 0
        
        if (fechaCurso > fechaActual) {
          colegioInfo.colegio.ultimaActualizacion = updatedAt
        }
      }

      // Contar listas por año (cada curso cuenta como una lista)
      if (año >= 2024 && año <= 2027) {
        if (!colegioInfo.listasPorAño[año]) {
          colegioInfo.listasPorAño[año] = 0
        }
        colegioInfo.listasPorAño[año]++
      }
    })

    // Convertir a array
    const colegiosConListas = Array.from(colegiosMap.values()).map((info) => ({
      ...info.colegio,
      listas2024: info.listasPorAño[2024] || 0,
      listas2025: info.listasPorAño[2025] || 0,
      listas2026: info.listasPorAño[2026] || 0,
      listas2027: info.listasPorAño[2027] || 0,
      totalListas: Object.values(info.listasPorAño).reduce((sum, count) => sum + count, 0),
      cursos: info.cursos,
    }))

    debugLog('[API /crm/listas/por-colegio GET] Colegios con listas:', colegiosConListas.length)

    return NextResponse.json({
      success: true,
      data: colegiosConListas,
      total: colegiosConListas.length,
    }, { status: 200 })
  } catch (error: any) {
    debugLog('[API /crm/listas/por-colegio GET] ❌ Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener colegios con listas',
      },
      { status: 500 }
    )
  }
}
