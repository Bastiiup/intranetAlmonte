/**
 * API Route para obtener cursos que tienen PDFs (listas de útiles)
 * GET /api/crm/listas
 * 
 * Las "listas" son cursos que tienen versiones de materiales (PDFs) subidos
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
// También loggear siempre los diagnósticos importantes de RBD
const diagnosticLog = (...args: any[]) => {
  console.log(...args) // Siempre mostrar logs diagnósticos de RBD
}

/**
 * GET /api/crm/listas
 * Obtiene todos los cursos que tienen al menos una versión de materiales (PDF) subida
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const colegioId = searchParams.get('colegioId')
    const nivel = searchParams.get('nivel')
    const grado = searchParams.get('grado')
    const año = searchParams.get('año') || searchParams.get('ano')
    // Ignorar parámetro 't' que se usa para evitar caché
    const _ = searchParams.get('t')

    debugLog('[API /crm/listas GET] Obteniendo cursos con PDFs...')

    // Construir filtros
    const filters: string[] = []
    
    // Filtrar solo cursos que tienen versiones_materiales (PDFs)
    // En Strapi, necesitamos obtener todos los cursos y filtrar en el código
    // porque no hay un filtro directo para "tiene versiones_materiales"
    
    if (colegioId) {
      filters.push(`filters[colegio][id][$eq]=${colegioId}`)
    }
    if (nivel) {
      filters.push(`filters[nivel][$eq]=${encodeURIComponent(nivel)}`)
    }
    if (grado) {
      filters.push(`filters[grado][$eq]=${grado}`)
    }
    // NO filtrar por año en Strapi - causa error "Invalid key año"
    // Filtrar por año en el código después de obtener los datos
    // if (año) {
    //   filters.push(`filters[año][$eq]=${año}`)
    // }

    // Populate y fields necesarios - Mejorado para incluir más datos
    // IMPORTANTE: No usar fields específicos para colegio, dejar que Strapi devuelva todos los campos
    // Esto asegura que el RBD esté presente
    filters.push('populate[colegio][populate][comuna]=true')
    filters.push('populate[colegio][populate][direcciones]=true')
    filters.push('populate[colegio][populate][telefonos]=true')
    // NO usar fields específicos - dejar que Strapi devuelva todos los campos del colegio (incluyendo RBD)
    // filters.push('populate[colegio][fields][0]=colegio_nombre')
    // filters.push('populate[colegio][fields][1]=rbd')
    // filters.push('populate[colegio][fields][2]=region')
    // IMPORTANTE: NO usar fields específicos - dejar que Strapi devuelva todos los campos
    // Esto asegura que versiones_materiales (campo JSON) se devuelva automáticamente
    // Si usamos fields específicos, Strapi solo devuelve esos campos y puede omitir otros importantes
    filters.push('publicationState=preview')

    // NO incluir versiones_materiales en el queryString por defecto - causa error
    const queryString = filters.length > 0 ? `?${filters.join('&')}` : '?populate[colegio]=true&publicationState=preview'

    debugLog('[API /crm/listas GET] Query:', queryString)

    // Agregar timestamp para evitar caché en Strapi
    const cacheBuster = queryString.includes('?') ? `&_t=${Date.now()}` : `?_t=${Date.now()}`
    const finalQuery = `${queryString}${cacheBuster}`

    let response: any
    try {
      response = await strapiClient.get<StrapiResponse<StrapiEntity<any>[]>>(
        `/api/cursos${finalQuery}`
      )
    } catch (strapiError: any) {
      debugLog('[API /crm/listas GET] ❌ Error al obtener cursos de Strapi:', {
        error: strapiError.message,
        status: strapiError.status,
        response: strapiError.response?.data || strapiError.data,
      })
      return NextResponse.json(
        {
          success: false,
          error: `Error al obtener cursos de Strapi: ${strapiError.message || 'Error desconocido'}`,
          details: strapiError.response?.data || strapiError.data,
        },
        { status: strapiError.status || 500 }
      )
    }

    if (!response || !response.data) {
      debugLog('[API /crm/listas GET] ⚠️ Respuesta vacía de Strapi')
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
      }, { status: 200 })
    }

    const cursos = Array.isArray(response.data) ? response.data : [response.data]
    
    debugLog('[API /crm/listas GET] Total de cursos obtenidos de Strapi:', cursos.length)
    debugLog('[API /crm/listas GET] IDs de cursos obtenidos:', cursos.map((c: any) => c.id || c.documentId))
    
    // Debug: Ver estructura del primer curso para entender qué campos tiene
    if (cursos.length > 0) {
      const primerCurso = cursos[0]
      const attrs = primerCurso.attributes || primerCurso
      const versiones = attrs.versiones_materiales || []
      
      // 🔍 LOG DIAGNÓSTICO CRÍTICO: Siempre mostrar para el primer curso
      console.log('🖥️ SERVIDOR [API /crm/listas GET] 🔍 Estructura del primer curso:', {
        cursoId: primerCurso.id || primerCurso.documentId,
        nombre: attrs.nombre_curso || attrs.curso_nombre,
        tieneAttributes: !!primerCurso.attributes,
        keys: Object.keys(attrs).slice(0, 20),
        tieneVersionesMateriales: 'versiones_materiales' in attrs,
        versionesMateriales: attrs.versiones_materiales ? (Array.isArray(attrs.versiones_materiales) ? `${attrs.versiones_materiales.length} elementos` : `tipo: ${typeof attrs.versiones_materiales}`) : 'no existe',
        todasLasVersiones: versiones.map((v: any, i: number) => ({
          indice: i,
          id: v.id,
          nombre: v.nombre_archivo,
          pdf_id: v.pdf_id,
          pdf_url: v.pdf_url ? v.pdf_url.substring(0, 80) : null,
          tienePDF: !!(v.pdf_id || v.pdf_url),
        })),
      })
      diagnosticLog('[API /crm/listas GET] 🔍 Estructura del primer curso:', {
        cursoId: primerCurso.id || primerCurso.documentId,
        nombre: attrs.nombre_curso || attrs.curso_nombre,
        tieneAttributes: !!primerCurso.attributes,
        keys: Object.keys(attrs).slice(0, 20),
        tieneVersionesMateriales: 'versiones_materiales' in attrs,
        versionesMateriales: attrs.versiones_materiales ? (Array.isArray(attrs.versiones_materiales) ? `${attrs.versiones_materiales.length} elementos` : `tipo: ${typeof attrs.versiones_materiales}`) : 'no existe',
        todasLasVersiones: versiones.map((v: any, i: number) => ({
          indice: i,
          id: v.id,
          nombre: v.nombre_archivo,
          pdf_id: v.pdf_id,
          pdf_url: v.pdf_url ? v.pdf_url.substring(0, 80) : null,
          tienePDF: !!(v.pdf_id || v.pdf_url),
        })),
      })
    }

    // Filtrar solo los cursos que tienen al menos una versión de materiales (PDF)
    // También verificar que el curso tenga un ID válido (los eliminados pueden no tenerlo)
    const cursosConPDFs = cursos.filter((curso: any) => {
      // Verificar que el curso tenga un ID válido
      if (!curso.id && !curso.documentId) {
        debugLog('[API /crm/listas GET] Curso sin ID válido filtrado:', curso)
        return false
      }
      
      const attrs = curso.attributes || curso
      const versiones = attrs.versiones_materiales || []
      
      // Verificar si versiones_materiales es un array válido con elementos
      const tienePDFs = Array.isArray(versiones) && versiones.length > 0
      
      // Log detallado para debugging (solo primeros cursos para no saturar)
      if (cursos.length <= 10) {
        debugLog('[API /crm/listas GET] Curso analizado:', {
          id: curso.id || curso.documentId,
          nombre: attrs.nombre_curso || attrs.curso_nombre,
          tieneVersiones: 'versiones_materiales' in attrs,
          tipoVersiones: typeof attrs.versiones_materiales,
          esArray: Array.isArray(versiones),
          cantidad: Array.isArray(versiones) ? versiones.length : 'N/A',
          tienePDFs: tienePDFs,
        })
      }
      
      return tienePDFs
    })

    debugLog('[API /crm/listas GET] ✅ Cursos con PDFs encontrados:', cursosConPDFs.length)
    debugLog('[API /crm/listas GET] IDs de cursos con PDFs:', cursosConPDFs.map((c: any) => c.id || c.documentId))

    // Filtrar por año en el código si se proporciona (no en Strapi para evitar error "Invalid key año")
    let cursosFiltrados = cursosConPDFs
    if (año) {
      const añoNum = parseInt(año)
      if (!isNaN(añoNum)) {
        cursosFiltrados = cursosConPDFs.filter((curso: any) => {
          const attrs = curso.attributes || curso
          const cursoAño = attrs.año || attrs.ano
          return cursoAño === añoNum || cursoAño === año
        })
        debugLog('[API /crm/listas GET] Cursos filtrados por año:', añoNum, 'Total:', cursosFiltrados.length)
      }
    }

    // Transformar a formato de "lista" para el frontend
    const listas = cursosFiltrados.map((curso: any) => {
      const attrs = curso.attributes || curso
      const versiones = attrs.versiones_materiales || []
      
      // 🔍 LOG DIAGNÓSTICO CRÍTICO: Verificar versiones_materiales (siempre mostrar para primeros cursos)
      const cursoIndex = cursosFiltrados.findIndex((c: any) => (c.id || c.documentId) === (curso.id || curso.documentId))
      if (cursoIndex < 3) { // Mostrar para los primeros 3 cursos
        console.log(`🖥️ SERVIDOR [API /crm/listas GET] 🔍 Versiones para curso ${curso.id || curso.documentId} (${attrs.nombre_curso || attrs.curso_nombre}):`, {
          cantidad: versiones.length,
          esArray: Array.isArray(versiones),
          todasLasVersiones: versiones.map((v: any, i: number) => ({
            indice: i,
            id: v.id,
            nombre: v.nombre_archivo,
            tienePDF: !!(v.pdf_id || v.pdf_url),
            pdf_id: v.pdf_id,
            pdf_url: v.pdf_url ? v.pdf_url.substring(0, 60) + '...' : null,
          })),
        })
        diagnosticLog(`[API /crm/listas GET] 🔍 Versiones para curso ${curso.id || curso.documentId} (${attrs.nombre_curso || attrs.curso_nombre}):`, {
          cantidad: versiones.length,
          esArray: Array.isArray(versiones),
          todasLasVersiones: versiones.map((v: any, i: number) => ({
            indice: i,
            id: v.id,
            nombre: v.nombre_archivo,
            tienePDF: !!(v.pdf_id || v.pdf_url),
            pdf_id: v.pdf_id,
            pdf_url: v.pdf_url ? v.pdf_url.substring(0, 60) + '...' : null,
          })),
        })
      }
      
      // Buscar la última versión que tenga PDF (pdf_id o pdf_url)
      // Si no hay ninguna con PDF, usar la última versión por fecha
      let ultimaVersion = null
      if (versiones.length > 0) {
        // Primero buscar versiones con PDF, ordenadas por fecha descendente
        const versionesConPDF = versiones
          .filter((v: any) => v.pdf_id || v.pdf_url)
          .sort((a: any, b: any) => {
            const fechaA = new Date(a.fecha_actualizacion || a.fecha_subida || 0).getTime()
            const fechaB = new Date(b.fecha_actualizacion || b.fecha_subida || 0).getTime()
            return fechaB - fechaA
          })
        
        // Si hay versiones con PDF, usar la más reciente
        if (versionesConPDF.length > 0) {
          ultimaVersion = versionesConPDF[0]
        } else {
          // Si no hay versiones con PDF, usar la última versión por fecha
          ultimaVersion = versiones.sort((a: any, b: any) => {
            const fechaA = new Date(a.fecha_actualizacion || a.fecha_subida || 0).getTime()
            const fechaB = new Date(b.fecha_actualizacion || b.fecha_subida || 0).getTime()
            return fechaB - fechaA
          })[0]
        }
      }
      
      // 🔍 LOG DIAGNÓSTICO CRÍTICO: Verificar última versión (siempre mostrar para primeros cursos)
      if (ultimaVersion && cursoIndex < 5) {
        console.log(`🖥️ SERVIDOR [API /crm/listas GET] 📄 Última versión para curso ${curso.id || curso.documentId} (${attrs.nombre_curso || attrs.curso_nombre}):`, {
          nombre: ultimaVersion.nombre_archivo,
          pdf_id: ultimaVersion.pdf_id,
          pdf_url: ultimaVersion.pdf_url ? ultimaVersion.pdf_url.substring(0, 60) + '...' : null,
          tienePDF: !!(ultimaVersion.pdf_id || ultimaVersion.pdf_url),
          seAsignaraA: {
            pdf_id: ultimaVersion?.pdf_id || null,
            pdf_url: ultimaVersion?.pdf_url || null,
          },
          estructuraCompleta: JSON.stringify(ultimaVersion, null, 2),
        })
        diagnosticLog(`[API /crm/listas GET] 📄 Última versión para curso ${curso.id || curso.documentId} (${attrs.nombre_curso || attrs.curso_nombre}):`, {
          nombre: ultimaVersion.nombre_archivo,
          pdf_id: ultimaVersion.pdf_id,
          pdf_url: ultimaVersion.pdf_url ? ultimaVersion.pdf_url.substring(0, 60) + '...' : null,
          tienePDF: !!(ultimaVersion.pdf_id || ultimaVersion.pdf_url),
          seAsignaraA: {
            pdf_id: ultimaVersion?.pdf_id || null,
            pdf_url: ultimaVersion?.pdf_url || null,
          },
          estructuraCompleta: JSON.stringify(ultimaVersion, null, 2),
        })
      } else if (!ultimaVersion && cursoIndex < 5) {
        console.log(`🖥️ SERVIDOR [API /crm/listas GET] ⚠️ Curso ${curso.id || curso.documentId} (${attrs.nombre_curso || attrs.curso_nombre}) NO tiene versiones_materiales o está vacío`)
        diagnosticLog(`[API /crm/listas GET] ⚠️ Curso ${curso.id || curso.documentId} (${attrs.nombre_curso || attrs.curso_nombre}) NO tiene versiones_materiales o está vacío`)
      }
      
      // 🔍 LOG CRÍTICO: Verificar qué se está asignando a pdf_id y pdf_url
      if (cursoIndex < 5) {
        console.log(`🖥️ SERVIDOR [API /crm/listas GET] 🔍 Asignación de PDF para curso ${curso.id || curso.documentId}:`, {
          ultimaVersionExiste: !!ultimaVersion,
          pdf_idAsignado: ultimaVersion?.pdf_id || null,
          pdf_urlAsignado: ultimaVersion?.pdf_url ? ultimaVersion.pdf_url.substring(0, 60) + '...' : null,
          tienePDFFinal: !!(ultimaVersion?.pdf_id || ultimaVersion?.pdf_url),
        })
      }

      const colegioData = attrs.colegio?.data || attrs.colegio
      const colegioAttrs = colegioData?.attributes || colegioData
      
      // 🔍 LOG DIAGNÓSTICO: Datos del colegio
      const cursoId = curso.id || curso.documentId
      const cursoNombre = attrs.nombre_curso || attrs.curso_nombre || 'Sin nombre'
      diagnosticLog(`[API /crm/listas GET] 🔍 Curso ${cursoId} (${cursoNombre}):`, {
        tieneColegio: !!colegioData,
        colegioId: colegioData?.id || colegioData?.documentId,
        colegioKeys: colegioAttrs ? Object.keys(colegioAttrs).slice(0, 10) : [],
        rbdRaw: colegioAttrs?.rbd,
        rbdUpper: colegioAttrs?.RBD,
        colegioNombre: colegioAttrs?.colegio_nombre || colegioAttrs?.nombre,
      })
      
      // Obtener datos del colegio (dirección, comuna, región, teléfono)
      const comunaData = colegioAttrs?.comuna?.data || colegioAttrs?.comuna
      const comunaAttrs = comunaData?.attributes || comunaData
      const direcciones = colegioAttrs?.direcciones || []
      const direccionPrincipal = direcciones.find((d: any) => 
        d.tipo_direccion === 'Principal' || d.tipo_direccion === 'Colegio'
      ) || direcciones[0]
      
      // Construir dirección completa
      let direccionStr = ''
      if (direccionPrincipal) {
        const nombreCalle = direccionPrincipal.nombre_calle || ''
        const numeroCalle = direccionPrincipal.numero_calle || ''
        const complemento = direccionPrincipal.complemento_direccion || ''
        const partes = [nombreCalle, numeroCalle, complemento].filter(Boolean)
        direccionStr = partes.join(' ').trim()
      }
      
      const comunaNombre = comunaAttrs?.comuna_nombre || ''
      const regionNombre = colegioAttrs?.region || comunaAttrs?.region_nombre || ''
      
      // Obtener teléfono principal
      const telefonos = colegioAttrs?.telefonos || []
      const telefonoPrincipal = telefonos.find((t: any) => t.principal === true) || telefonos[0]
      const telefonoStr = telefonoPrincipal?.telefono_raw || telefonoPrincipal?.telefono_norm || ''
      
      // Obtener fechas
      const createdAt = curso.createdAt || attrs.createdAt || null
      const updatedAt = curso.updatedAt || attrs.updatedAt || null

      // Simplificar: usar solo el nombre del curso sin paralelo
      const nombreCompleto = (attrs.nombre_curso || attrs.curso_nombre || 'Sin nombre').trim()

      // Extraer RBD con múltiples variantes
      const rbdFinal = colegioAttrs?.rbd || colegioAttrs?.RBD || colegioAttrs?.rbd_numero || null
      
      // 🔍 LOG DIAGNÓSTICO: RBD extraído
      if (rbdFinal) {
        diagnosticLog(`[API /crm/listas GET] ✅ RBD encontrado para curso ${cursoId}:`, {
          rbd: rbdFinal,
          tipo: typeof rbdFinal,
          colegioNombre: colegioAttrs?.colegio_nombre || colegioAttrs?.nombre,
        })
      } else {
        diagnosticLog(`[API /crm/listas GET] ⚠️ RBD NO encontrado para curso ${cursoId}:`, {
          colegioNombre: colegioAttrs?.colegio_nombre || colegioAttrs?.nombre,
          colegioKeys: colegioAttrs ? Object.keys(colegioAttrs) : [],
          tieneColegio: !!colegioData,
        })
      }

      return {
        id: curso.id || curso.documentId,
        documentId: curso.documentId || String(curso.id || ''),
        nombre: nombreCompleto,
        nivel: attrs.nivel || 'Basica',
        grado: parseInt(attrs.grado) || 1,
        año: attrs.año || attrs.ano || new Date().getFullYear(),
        descripcion: `Curso: ${nombreCompleto}`,
        activo: attrs.activo !== false,
        pdf_id: ultimaVersion?.pdf_id || null,
        pdf_url: ultimaVersion?.pdf_url || null,
        pdf_nombre: ultimaVersion?.nombre_archivo || ultimaVersion?.metadata?.nombre || null,
        
        // 🔍 LOG CRÍTICO: Verificar valores finales asignados
        _debug_pdf: cursoIndex < 5 ? {
          ultimaVersionExiste: !!ultimaVersion,
          pdf_id: ultimaVersion?.pdf_id || null,
          pdf_url: ultimaVersion?.pdf_url ? ultimaVersion.pdf_url.substring(0, 60) + '...' : null,
          tienePDF: !!(ultimaVersion?.pdf_id || ultimaVersion?.pdf_url),
        } : undefined,
        colegio: colegioData ? {
          id: colegioData.id || colegioData.documentId,
          nombre: colegioAttrs?.colegio_nombre || colegioAttrs?.nombre || '',
          rbd: rbdFinal, // RBD extraído con múltiples variantes
          direccion: direccionStr,
          comuna: comunaNombre,
          region: regionNombre,
          telefono: telefonoStr,
        } : null,
        createdAt: createdAt,
        updatedAt: updatedAt,
        curso: {
          id: curso.id || curso.documentId,
          nombre: nombreCompleto,
        },
        versiones: versiones.length,
        versiones_materiales: versiones, // Incluir versiones_materiales completo para que el frontend pueda extraer PDFs
      }
    })

    // 🔍 LOG DIAGNÓSTICO: Resumen de listas con RBD
    const listasConRBD = listas.filter((l: any) => l.colegio?.rbd)
    const listasSinRBD = listas.filter((l: any) => !l.colegio?.rbd)
    diagnosticLog('[API /crm/listas GET] 📊 Resumen de listas:', {
      total: listas.length,
      conRBD: listasConRBD.length,
      sinRBD: listasSinRBD.length,
      rbdEjemplos: listasConRBD.slice(0, 5).map((l: any) => ({
        curso: l.nombre,
        colegio: l.colegio?.nombre,
        rbd: l.colegio?.rbd,
      })),
      sinRBDEjemplos: listasSinRBD.slice(0, 3).map((l: any) => ({
        curso: l.nombre,
        colegio: l.colegio?.nombre,
        tieneColegio: !!l.colegio,
      })),
    })

    return NextResponse.json({
      success: true,
      data: listas,
      count: listas.length,
    }, { status: 200 })
  } catch (error: any) {
    debugLog('[API /crm/listas GET] ❌ Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener listas',
      },
      { status: 500 }
    )
  }
}
