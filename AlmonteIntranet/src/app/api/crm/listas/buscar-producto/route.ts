/**
 * API Route para buscar un producto en todas las listas de todos los colegios
 * GET /api/crm/listas/buscar-producto?q=termino_busqueda
 * 
 * Devuelve:
 * - Lista de colegios y cursos donde aparece el producto
 * - Cantidad de estudiantes en cada curso
 * - Total de unidades necesarias
 * - Información detallada del producto (ISBN, autor, editorial, etc.)
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import { obtenerUltimaVersion } from '@/lib/utils/strapi'

export const dynamic = 'force-dynamic'

const DEBUG = true
const debugLog = (...args: any[]) => {
  if (DEBUG) {
    console.log('[API /api/crm/listas/buscar-producto]', ...args)
  }
}

interface ResultadoProducto {
  colegio: {
    id: string
    nombre: string
    rbd: string
    comuna?: string
    region?: string
  }
  curso: {
    id: string
    documentId: string
    nombre: string
    nivel: string
    grado: number
    año: number
    matriculados: number
  }
  producto: {
    nombre: string
    codigo?: string
    isbn?: string
    autor?: string
    editorial?: string
    marca?: string
    asignatura?: string
    descripcion?: string
    cantidad: number
    precio?: number
    woocommerce_id?: string | number
    encontrado_en_woocommerce?: boolean
    observaciones?: string
  }
  totalProductos: number
}

/**
 * GET /api/crm/listas/buscar-producto
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: 'Se requiere un término de búsqueda de al menos 2 caracteres',
        },
        { status: 400 }
      )
    }

    debugLog('Buscando producto:', query)

    // Obtener TODOS los cursos con sus versiones_materiales
    // IMPORTANTE: versiones_materiales es un campo JSON, NO una relación, por lo que NO se usa populate
    const filters: string[] = []
    filters.push('pagination[pageSize]=1000') // Límite alto para obtener todos
    filters.push('pagination[page]=1')
    filters.push('populate[colegio][populate][0]=comuna')
    filters.push('publicationState=preview')

    const queryString = filters.join('&')
    const finalQuery = `?${queryString}&_t=${Date.now()}`

    debugLog('Query a Strapi:', finalQuery)

    const response = await strapiClient.get<any>(`/api/cursos${finalQuery}`)

    if (!response || !response.data) {
      return NextResponse.json({
        success: true,
        data: [],
        totales: {
          colegiosUnicos: 0,
          cursosUnicos: 0,
          estudiantesTotal: 0,
          productosTotal: 0,
        },
      })
    }

    const cursos = Array.isArray(response.data) ? response.data : [response.data]
    debugLog('Total de cursos obtenidos:', cursos.length)

    // Buscar en los materiales de cada curso
    const resultados: ResultadoProducto[] = []
    
    // Normalizar query: quitar acentos, normalizar espacios, convertir a minúsculas
    const normalizar = (texto: string) => {
      return texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
        .replace(/\s+/g, ' ') // Normalizar espacios múltiples a uno solo
        .trim()
    }
    
    const queryNormalizada = normalizar(query)
    
    // Si la query tiene múltiples palabras, separar para buscar todas
    const palabrasBusqueda = queryNormalizada.split(' ').filter(p => p.length > 0)

    cursos.forEach((curso: any) => {
      const attrs = curso.attributes || curso
      const colegioData = attrs.colegio?.data || attrs.colegio
      
      if (!colegioData) return

      const colegioAttrs = colegioData.attributes || colegioData
      const comunaData = colegioAttrs?.comuna?.data || colegioAttrs?.comuna
      const comunaAttrs = comunaData?.attributes || comunaData

      const versiones = attrs.versiones_materiales || []
      
      // Solo buscar en la última versión (la más reciente)
      if (versiones.length === 0) return
      
      const ultimaVersion = obtenerUltimaVersion(versiones)
      const materiales = ultimaVersion?.materiales || []

      materiales.forEach((material: any) => {
        // Buscar en: nombre, ISBN, marca, asignatura, descripcion
        const nombre = normalizar(material.nombre || '')
        const isbn = normalizar(material.isbn || '')
        const marca = normalizar(material.marca || '')
        const asignatura = normalizar(material.asignatura || '')
        const descripcion = normalizar(material.descripcion || '')

        // Buscar la frase completa primero (más preciso)
        let coincide = 
          nombre.includes(queryNormalizada) ||
          isbn.includes(queryNormalizada) ||
          marca.includes(queryNormalizada) ||
          asignatura.includes(queryNormalizada) ||
          descripcion.includes(queryNormalizada)
        
        // Si no coincide la frase completa, buscar que todas las palabras estén presentes
        if (!coincide && palabrasBusqueda.length > 1) {
          coincide = palabrasBusqueda.every(palabra => 
            nombre.includes(palabra) ||
            isbn.includes(palabra) ||
            marca.includes(palabra) ||
            asignatura.includes(palabra) ||
            descripcion.includes(palabra)
          )
        }

        if (coincide) {
          const matriculados = attrs.matricula || 0 // Campo correcto según Strapi: "matricula"
          const cantidadPorAlumno = material.cantidad || 1
          const totalProductos = matriculados * cantidadPorAlumno

          resultados.push({
            colegio: {
              id: String(colegioData.id || colegioData.documentId || ''),
              nombre: colegioAttrs?.colegio_nombre || '',
              rbd: String(colegioAttrs?.rbd || ''),
              comuna: comunaAttrs?.comuna_nombre || '',
              region: colegioAttrs?.region || comunaAttrs?.region_nombre || '',
            },
            curso: {
              id: String(curso.id || curso.documentId || ''),
              documentId: curso.documentId || String(curso.id || ''),
              nombre: attrs.nombre_curso || '',
              nivel: attrs.nivel || '',
              grado: attrs.grado || 0,
              año: attrs.anio || attrs.año || new Date().getFullYear(),
              matriculados,
            },
            producto: {
              nombre: material.nombre || '',
              isbn: material.isbn || undefined,
              marca: material.marca || undefined,
              asignatura: material.asignatura || undefined,
              descripcion: material.descripcion || undefined,
              cantidad: cantidadPorAlumno,
              precio: material.precio || undefined,
              woocommerce_id: material.woocommerce_id || undefined,
              encontrado_en_woocommerce: material.encontrado_en_woocommerce || false,
            },
            totalProductos,
          })
        }
      })
    })

    debugLog('Resultados encontrados:', resultados.length)

    // Calcular totales
    const colegiosUnicos = new Set(resultados.map(r => r.colegio.id)).size
    const cursosUnicos = new Set(resultados.map(r => r.curso.id)).size
    const estudiantesTotal = resultados.reduce((sum: number, r) => sum + r.curso.matriculados, 0)
    const productosTotal = resultados.reduce((sum: number, r) => sum + r.totalProductos, 0)

    return NextResponse.json({
      success: true,
      data: resultados,
      totales: {
        colegiosUnicos,
        cursosUnicos,
        estudiantesTotal,
        productosTotal,
      },
      query,
    })
  } catch (error: any) {
    debugLog('Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al buscar producto',
      },
      { status: 500 }
    )
  }
}
