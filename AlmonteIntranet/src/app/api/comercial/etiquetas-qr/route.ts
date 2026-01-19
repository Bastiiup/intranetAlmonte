/**
 * API Route para obtener PDFs de etiquetas QR
 * GET /api/comercial/etiquetas-qr
 * 
 * Obtiene todos los PDFs con filtros opcionales desde Strapi
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity, EtiquetaPDF, EtiquetaPDFAttributes } from '@/lib/strapi/types'
import { STRAPI_API_URL } from '@/lib/strapi/config'

export const dynamic = 'force-dynamic'

/**
 * GET /api/comercial/etiquetas-qr
 * Obtiene todos los PDFs con filtros opcionales
 * 
 * Query params:
 * - search: Búsqueda general en múltiples campos
 * - año_escolar: Filtrar por año escolar
 * - estado: Filtrar por estado (generado, impreso, archivado)
 * - page: Número de página (default: 1)
 * - pageSize: Tamaño de página (default: 50)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const añoEscolar = searchParams.get('año_escolar')
    const estado = searchParams.get('estado')
    const page = parseInt(searchParams.get('page') || '1')
    // Aumentar pageSize por defecto para obtener más registros
    const pageSize = parseInt(searchParams.get('pageSize') || '100')

    // Construir parámetros de query para Strapi v4
    const params = new URLSearchParams({
      'pagination[page]': page.toString(),
      'pagination[pageSize]': pageSize.toString(),
      'sort[0]': 'fecha_generacion:desc',
    })

    // Populate para relaciones (Strapi v4 syntax)
    // Usar 'true' para poblar completamente las relaciones
    params.append('populate[apoderado]', 'true')
    params.append('populate[alumno]', 'true')
    params.append('populate[archivo_pdf]', 'true')

    // Construir filtros
    if (search) {
      const searchEncoded = encodeURIComponent(search)
      // Si es numérico, buscar en numero_orden (filtrar en cliente para coincidencia parcial)
      if (!/^\d+$/.test(search)) {
        // Buscar en hash_qr, colegio_nombre (solo para búsquedas de texto)
        params.append('filters[$or][0][hash_qr][$containsi]', searchEncoded)
        params.append('filters[$or][1][colegio_nombre][$containsi]', searchEncoded)
      }
    }

    // Filtro por año escolar
    if (añoEscolar) {
      params.append('filters[año_escolar][$eq]', añoEscolar)
    }

    // Filtro por estado
    if (estado && ['generado', 'impreso', 'archivado'].includes(estado)) {
      params.append('filters[estado][$eq]', estado)
    }

    // Si es búsqueda numérica, obtener más registros para filtrar en cliente
    const isNumericSearch = search && /^\d+$/.test(search)
    if (isNumericSearch) {
      params.set('pagination[pageSize]', Math.max(pageSize, 500).toString())
    }

    const path = `/api/etiquetas-pdf?${params.toString()}`

    console.log('[API /comercial/etiquetas-qr] 🔍 Consultando Strapi:', path)

    const response = await strapiClient.get<StrapiResponse<StrapiEntity<EtiquetaPDFAttributes>>>(
      path
    )

    console.log('[API /comercial/etiquetas-qr] 📥 Respuesta de Strapi:', {
      tieneData: !!response.data,
      esArray: Array.isArray(response.data),
      cantidad: Array.isArray(response.data) ? response.data.length : response.data ? 1 : 0,
      tieneMeta: !!response.meta,
      meta: response.meta,
      estructura: {
        keys: Object.keys(response),
        tipoData: typeof response.data,
        esArrayData: Array.isArray(response.data),
      }
    })

    // Transformar datos de Strapi v4 (con attributes)
    // En Strapi v4, la respuesta tiene estructura { data: [...], meta: {...} }
    let pdfsData: StrapiEntity<EtiquetaPDFAttributes>[] = []
    
    if (response && response.data) {
      if (Array.isArray(response.data)) {
        pdfsData = response.data
      } else if (response.data && typeof response.data === 'object') {
        // Si es un objeto único, convertirlo a array
        pdfsData = [response.data]
      }
    } else if (Array.isArray(response)) {
      // Si la respuesta es directamente un array (caso inesperado)
      pdfsData = response
    }

    console.log('[API /comercial/etiquetas-qr] 📊 PDFs extraídos:', {
      cantidad: pdfsData.length,
      primerosIds: pdfsData.slice(0, 3).map(p => p.id || p.documentId)
    })

    // Filtrar en cliente si es búsqueda numérica (para coincidencias parciales)
    let filteredPDFs = pdfsData
    if (isNumericSearch && search) {
      filteredPDFs = pdfsData.filter((pdf: StrapiEntity<EtiquetaPDFAttributes>) => {
        const attrs = pdf.attributes || pdf
        const numeroOrden = attrs.numero_orden?.toString() || ''
        return numeroOrden.includes(search)
      })
    }

    // Transformar a formato plano para el frontend
    const pdfs = filteredPDFs.map((pdf: StrapiEntity<EtiquetaPDFAttributes>) => {
      // Manejar diferentes estructuras de respuesta de Strapi
      const attrs = pdf.attributes || pdf

      // Obtener nombres de apoderado y alumno
      const apoderadoData = attrs.apoderado?.data || attrs.apoderado
      const apoderadoAttrs = apoderadoData?.attributes || apoderadoData
      const apoderadoNombre = apoderadoAttrs
        ? `${apoderadoAttrs.nombres || ''} ${apoderadoAttrs.primer_apellido || ''} ${apoderadoAttrs.segundo_apellido || ''}`.trim()
        : 'N/A'

      const alumnoData = attrs.alumno?.data || attrs.alumno
      const alumnoAttrs = alumnoData?.attributes || alumnoData
      const alumnoNombre = alumnoAttrs
        ? `${alumnoAttrs.nombres || ''} ${alumnoAttrs.primer_apellido || ''} ${alumnoAttrs.segundo_apellido || ''}`.trim()
        : 'N/A'

      // Obtener URL y ID del PDF
      // Strapi puede devolver archivo_pdf de diferentes formas:
      // 1. { data: { id, attributes: { url, ... } } }
      // 2. { data: { url, ... } } (sin attributes)
      // 3. { url, ... } (directo)
      const archivoPdf = attrs.archivo_pdf
      let pdfUrl: string | undefined
      let pdfId: number | string | undefined
      
      if (archivoPdf) {
        // Manejar diferentes estructuras de Strapi
        let url: string | undefined
        let fileId: number | string | undefined
        
        // Caso 1: { data: { id, attributes: { url, ... } } }
        if (archivoPdf.data && typeof archivoPdf.data === 'object' && 'attributes' in archivoPdf.data) {
          const data = archivoPdf.data as { id?: number | string; attributes?: { url?: string; [key: string]: any } }
          fileId = data.id
          url = data.attributes?.url
        }
        // Caso 2: { data: { url, ... } } (sin attributes)
        else if (archivoPdf.data && typeof archivoPdf.data === 'object' && 'url' in archivoPdf.data) {
          const data = archivoPdf.data as { id?: number | string; url?: string; [key: string]: any }
          fileId = data.id
          url = data.url
        }
        // Caso 3: { url, ... } (directo)
        else if (typeof archivoPdf === 'object' && 'url' in archivoPdf) {
          fileId = (archivoPdf as any).id
          url = (archivoPdf as any).url
        }
        
        pdfId = fileId || (archivoPdf as any).id
        
        if (url) {
          // Si la URL ya es completa (http/https), usarla directamente
          if (url.startsWith('http://') || url.startsWith('https://')) {
            pdfUrl = url
          } else {
            // Construir URL completa con la base de Strapi
            const baseUrl = STRAPI_API_URL.replace(/\/$/, '')
            const cleanUrl = url.startsWith('/') ? url : `/${url}`
            pdfUrl = `${baseUrl}${cleanUrl}`
          }
        }
      }

      // Log para debugging (solo en desarrollo)
      if (process.env.NODE_ENV !== 'production' && pdfsData.indexOf(pdf) < 2) {
        const archivoPdfAny = archivoPdf as any
        console.log('[API /comercial/etiquetas-qr] 📄 Procesando PDF:', {
          id: pdf.id,
          tieneArchivoPdf: !!archivoPdf,
          estructuraArchivoPdf: archivoPdf ? {
            tieneData: !!archivoPdfAny.data,
            tieneAttributes: !!(archivoPdfAny.data?.attributes || archivoPdfAny.attributes),
            keys: Object.keys(archivoPdfAny),
          } : null,
          pdfUrl,
        })
      }

      return {
        id: pdf.id || pdf.documentId,
        documentId: pdf.documentId || String(pdf.id || ''),
        numeroOrden: attrs.numero_orden?.toString() || '',
        apoderado: apoderadoNombre,
        alumno: alumnoNombre,
        colegio: attrs.colegio_nombre || '',
        año: attrs.año_escolar || new Date().getFullYear(),
        fecha: attrs.fecha_generacion || new Date().toISOString(),
        estado: (attrs.estado || 'generado') as 'generado' | 'impreso' | 'archivado',
        pdfUrl,
        pdfId, // ID del archivo para usar con el endpoint proxy
      }
    })

    console.log('[API /comercial/etiquetas-qr] ✅ PDFs transformados:', {
      cantidad: pdfs.length,
      primeros: pdfs.slice(0, 2).map(p => ({
        id: p.id,
        numeroOrden: p.numeroOrden,
        tienePdfUrl: !!p.pdfUrl
      }))
    })

    return NextResponse.json(
      {
        success: true,
        data: pdfs,
        meta: response.meta,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (error: any) {
    console.error('[API /comercial/etiquetas-qr] ❌ Error:', {
      message: error.message,
      status: error.status,
      stack: error.stack,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener PDFs',
        message: error.message || 'Error desconocido',
        details: process.env.NODE_ENV !== 'production' ? error.details : undefined,
      },
      { status: error.status || 500 }
    )
  }
}
