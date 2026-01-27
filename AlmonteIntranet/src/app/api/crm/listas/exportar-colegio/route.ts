/**
 * API Route para exportar listas de un colegio específico a Excel
 * GET /api/crm/listas/exportar-colegio?colegioId=xxx
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
 * GET /api/crm/listas/exportar-colegio
 * Obtiene todas las listas de un colegio con sus productos para exportación
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const colegioIdParam = searchParams.get('colegioId')

    if (!colegioIdParam) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID de colegio es requerido',
        },
        { status: 400 }
      )
    }
    
    // Asegurar que colegioId sea numérico (Strapi requiere id numérico para relaciones)
    const colegioId = parseInt(colegioIdParam)
    if (isNaN(colegioId) || colegioId <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'colegioId debe ser un número válido',
        },
        { status: 400 }
      )
    }

    debugLog('[API /crm/listas/exportar-colegio] Obteniendo listas para colegio:', colegioIdParam, '→ Convertido a numérico:', colegioId)

    // Obtener el colegio primero para tener su nombre
    // Usar directamente el ID numérico (como en /api/crm/listas)
    let colegio: any = null
    
    try {
      // Obtener colegio por ID numérico directamente
      const colegioResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
        `/api/colegios/${colegioId}?publicationState=preview`
      )
      colegio = Array.isArray(colegioResponse.data) ? colegioResponse.data[0] : colegioResponse.data
      debugLog('[API /crm/listas/exportar-colegio] ✅ Colegio obtenido:', colegio?.id || colegio?.documentId)
    } catch (err: any) {
      debugLog('[API /crm/listas/exportar-colegio] ❌ Error al obtener colegio por ID numérico:', err.message)
      // Continuar sin colegio - se mostrará "Colegio Desconocido"
    }
    
    debugLog('[API /crm/listas/exportar-colegio] 🔍 Información del colegio obtenido directamente:', {
      colegioId: colegioId,
      tieneColegio: !!colegio,
      colegioKeys: colegio ? Object.keys(colegio).slice(0, 10) : [],
      colegioAttributes: colegio?.attributes ? Object.keys(colegio.attributes).slice(0, 10) : [],
    })

    // Obtener todos los cursos del colegio con sus versiones de materiales
    // Usar id numérico para el filtro (como en /api/crm/listas)
    const filters: string[] = []
    
    // Usar id numérico para el filtro (Strapi requiere id numérico para relaciones)
    // El colegioId ya debería ser numérico según /api/crm/colegios/list
    filters.push(`filters[colegio][id][$eq]=${colegioId}`)
    
    filters.push('publicationState=preview')
    filters.push('populate[colegio]=true')
    // NO usar populate[versiones_materiales] - es un campo JSON, no una relación
    // Strapi devolverá versiones_materiales automáticamente si existe

    const queryString = filters.join('&')
    debugLog('[API /crm/listas/exportar-colegio] Query:', queryString)

    const response = await strapiClient.get<StrapiResponse<StrapiEntity<any>[]>>(
      `/api/cursos?${queryString}`
    )

    const cursos = Array.isArray(response.data) ? response.data : (response.data ? [response.data] : [])

    debugLog('[API /crm/listas/exportar-colegio] Total cursos encontrados:', cursos.length)
    
    // Debug: Ver estructura del primer curso
    if (cursos.length > 0) {
      const primerCurso = Array.isArray(cursos) ? cursos[0] : cursos
      const attrs = (primerCurso as any)?.attributes || primerCurso
      debugLog('[API /crm/listas/exportar-colegio] 🔍 Estructura del primer curso:', {
        tieneAttributes: !!(primerCurso as any)?.attributes,
        keys: Object.keys(attrs).slice(0, 15),
        tieneVersionesMateriales: 'versiones_materiales' in attrs,
        versionesMateriales: attrs.versiones_materiales ? (Array.isArray(attrs.versiones_materiales) ? `${attrs.versiones_materiales.length} elementos` : `tipo: ${typeof attrs.versiones_materiales}`) : 'no existe',
        nombre: attrs.nombre_curso || attrs.curso_nombre,
      })
    }

    // Filtrar solo cursos que tienen versiones de materiales
    const cursosConMateriales = cursos.filter((curso: any) => {
      const attrs = curso.attributes || curso
      const versiones = attrs.versiones_materiales || []
      
      // Log detallado para primeros cursos
      if (cursos.length <= 5) {
        debugLog('[API /crm/listas/exportar-colegio] Curso analizado:', {
          id: curso.id || curso.documentId,
          nombre: attrs.nombre_curso || attrs.curso_nombre,
          tieneVersiones: 'versiones_materiales' in attrs,
          tipoVersiones: typeof attrs.versiones_materiales,
          esArray: Array.isArray(versiones),
          cantidadVersiones: Array.isArray(versiones) ? versiones.length : 'N/A',
          versiones: Array.isArray(versiones) && versiones.length > 0 ? versiones.map((v: any) => ({
            tieneMateriales: !!(v.materiales && Array.isArray(v.materiales)),
            cantidadMateriales: v.materiales && Array.isArray(v.materiales) ? v.materiales.length : 0,
          })) : 'sin versiones',
        })
      }
      
      // Verificar que tenga versiones y que al menos una versión tenga materiales
      const tieneVersiones = Array.isArray(versiones) && versiones.length > 0
      const tieneMateriales = tieneVersiones && versiones.some((v: any) => v.materiales && Array.isArray(v.materiales) && v.materiales.length > 0)
      
      return tieneMateriales
    })

    debugLog('[API /crm/listas/exportar-colegio] Cursos con materiales:', cursosConMateriales.length)

    // Obtener el nombre del colegio desde los cursos (ya tienen populate[colegio])
    // Esto es más confiable que obtenerlo por separado
    let colegioNombreDesdeCurso = 'Colegio Desconocido'
    let colegioRBDDesdeCurso = ''
    
    if (cursosConMateriales.length > 0) {
      const primerCurso = cursosConMateriales[0]
      const attrsPrimerCurso = (primerCurso as any)?.attributes || primerCurso
      const colegioData = attrsPrimerCurso.colegio?.data || attrsPrimerCurso.colegio
      const colegioAttrs = (colegioData as any)?.attributes || colegioData
      
      // Intentar múltiples formas de obtener el nombre (según estructura de Strapi)
      colegioNombreDesdeCurso = 
        colegioAttrs?.colegio_nombre || 
        colegioData?.colegio_nombre || 
        colegioAttrs?.nombre ||
        colegioData?.nombre ||
        'Colegio Desconocido'
      
      // Intentar múltiples formas de obtener el RBD (puede ser número o string)
      const rbdValue = colegioAttrs?.rbd ?? colegioData?.rbd
      colegioRBDDesdeCurso = rbdValue !== null && rbdValue !== undefined 
        ? String(rbdValue).trim() 
        : ''
      
      debugLog('[API /crm/listas/exportar-colegio] 🔍 Colegio desde curso:', {
        colegioNombre: colegioNombreDesdeCurso,
        colegioRBD: colegioRBDDesdeCurso,
        tieneColegioData: !!colegioData,
        tieneColegioAttrs: !!colegioAttrs,
        colegioDataKeys: colegioData ? Object.keys(colegioData).slice(0, 10) : [],
        colegioAttrsKeys: colegioAttrs ? Object.keys(colegioAttrs).slice(0, 10) : [],
        estructuraCompleta: {
          attrsPrimerCurso: {
            tieneColegio: 'colegio' in attrsPrimerCurso,
            colegioType: typeof attrsPrimerCurso.colegio,
            colegioKeys: attrsPrimerCurso.colegio ? Object.keys(attrsPrimerCurso.colegio).slice(0, 10) : [],
          },
        },
      })
    }
    
    // Usar el nombre del colegio obtenido directamente o desde los cursos (priorizar desde cursos)
    const colegioNombre = colegioNombreDesdeCurso !== 'Colegio Desconocido' 
      ? colegioNombreDesdeCurso 
      : (colegio?.attributes?.colegio_nombre || colegio?.colegio_nombre || 'Colegio Desconocido')
    
    // Obtener RBD (puede ser número o string, convertir a string)
    const rbdFromDirect = colegio?.attributes?.rbd ?? colegio?.rbd
    const colegioRBD = colegioRBDDesdeCurso || (rbdFromDirect !== null && rbdFromDirect !== undefined ? String(rbdFromDirect).trim() : '')
    
    debugLog('[API /crm/listas/exportar-colegio] 🔍 RBD final:', {
      colegioRBDDesdeCurso,
      rbdFromDirect,
      colegioRBD,
    })

    // Transformar datos para exportación
    const listasParaExportar = cursosConMateriales.map((curso: any) => {
      const attrs = curso.attributes || curso
      const versiones = attrs.versiones_materiales || []
      
      // Obtener la última versión (más reciente)
      const ultimaVersion = versiones.length > 0 
        ? versiones.sort((a: any, b: any) => {
            const fechaA = new Date(a.fecha_actualizacion || a.fecha_subida || 0).getTime()
            const fechaB = new Date(b.fecha_actualizacion || b.fecha_subida || 0).getTime()
            return fechaB - fechaA
          })[0]
        : null

      const nombreCompleto = (attrs.nombre_curso || attrs.curso_nombre || 'Sin nombre').trim()
      const paralelo = attrs.paralelo || ''
      const nivel = attrs.nivel || 'Basica'
      const grado = attrs.grado || 1
      const año = attrs.año || attrs.ano || new Date().getFullYear()

      // Obtener todos los productos de todas las versiones
      const todosLosProductos: any[] = []
      versiones.forEach((version: any, index: number) => {
        const materiales = version.materiales || []
        const versionNombre = version.nombre_lista || version.tipo_lista || `Versión ${index + 1}`
        const fechaVersion = version.fecha_actualizacion || version.fecha_subida || ''
        
        materiales.forEach((material: any) => {
          todosLosProductos.push({
            ...material,
            version_nombre: versionNombre,
            fecha_version: fechaVersion,
          })
        })
      })

      return {
        curso_id: curso.id || curso.documentId,
        curso_nombre: nombreCompleto,
        paralelo: paralelo,
        nivel: nivel,
        grado: grado,
        año: año,
        versiones_count: versiones.length,
        productos: todosLosProductos,
        productos_count: todosLosProductos.length,
      }
    })

    // Preparar datos para Excel
    const datosExcel: any[] = []
    
    listasParaExportar.forEach((lista) => {
      if (lista.productos.length === 0) return

      lista.productos.forEach((producto: any) => {
        datosExcel.push({
          Colegio: colegioNombre,
          RBD: colegioRBD || '',
          Curso: lista.curso_nombre,
          Paralelo: lista.paralelo || '',
          Nivel: lista.nivel,
          Grado: lista.grado,
          Año: lista.año,
          Versión: producto.version_nombre || '',
          Fecha_Versión: producto.fecha_version ? new Date(producto.fecha_version).toLocaleDateString('es-CL') : '',
          Producto: producto.nombre || '',
          ISBN: producto.isbn || producto.woocommerce_sku || '',
          Marca: producto.marca || '',
          Cantidad: producto.cantidad || 1,
          Precio: producto.precio || producto.precio_woocommerce || 0,
          Precio_WooCommerce: producto.precio_woocommerce || '',
          Asignatura: producto.asignatura || '',
          Descripción: producto.descripcion || '',
          Comprar: producto.comprar ? 'Sí' : 'No',
          Disponibilidad: producto.disponibilidad === 'disponible' ? 'Disponible' : 
                          producto.disponibilidad === 'no_disponible' ? 'No Disponible' : 
                          producto.encontrado_en_woocommerce === false ? 'No Encontrado' : '',
          Stock: producto.stock_quantity || '',
          Validado: producto.validado ? 'Sí' : 'No',
        })
      })
    })

    debugLog('[API /crm/listas/exportar-colegio] Datos preparados para Excel:', datosExcel.length, 'filas')

    return NextResponse.json({
      success: true,
      data: {
        colegio: {
          id: colegioId,
          nombre: colegioNombre,
          rbd: colegioRBD,
        },
        listas: listasParaExportar,
        datosExcel: datosExcel,
        totalListas: listasParaExportar.length,
        totalProductos: datosExcel.length,
      },
    }, { status: 200 })
  } catch (error: any) {
    debugLog('[API /crm/listas/exportar-colegio] ❌ Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener listas para exportación',
      },
      { status: 500 }
    )
  }
}
