/**
 * API Route para obtener productos desde Strapi
 * Esto evita exponer el token de Strapi en el cliente
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'
import { logActivity, createLogDescription } from '@/lib/logging'

export const dynamic = 'force-dynamic'

/**
 * Valida que un documentId exista en Strapi antes de usarlo en una relación
 * @param documentId El documentId a validar
 * @param collectionType El tipo de colección (ej: 'etiquetas', 'marcas', 'canales')
 * @returns true si existe, false si no
 */
async function validateDocumentId(documentId: string, collectionType: string): Promise<boolean> {
  try {
    // Intentar obtener el documento desde Strapi
    const response: any = await strapiClient.get(`/api/${collectionType}/${documentId}`)
    return !!(response && (response.data || response.id || response.documentId))
  } catch (error: any) {
    // Si es 404, el documento no existe
    if (error.status === 404) {
      console.warn(`[API POST] ⚠️ DocumentId "${documentId}" no existe en colección "${collectionType}"`)
      return false
    }
    // Otros errores (403, 500, etc.) - asumir que existe pero no podemos verificarlo
    console.warn(`[API POST] ⚠️ No se pudo validar documentId "${documentId}" en "${collectionType}": ${error.status || error.message}`)
    return true // Asumir que existe para no bloquear la creación
  }
}

/**
 * Valida y filtra un array de documentIds, removiendo los que no existen
 * @param documentIds Array de documentIds a validar
 * @param collectionType El tipo de colección
 * @returns Array de documentIds válidos
 */
async function validateAndFilterDocumentIds(documentIds: string[], collectionType: string): Promise<string[]> {
  if (!documentIds || documentIds.length === 0) {
    return []
  }

  console.log(`[API POST] 🔍 Validando ${documentIds.length} documentIds para "${collectionType}"...`)
  
  const validations = await Promise.all(
    documentIds.map(async (docId) => {
      const isValid = await validateDocumentId(docId, collectionType)
      return { docId, isValid }
    })
  )

  const validIds = validations
    .filter(v => v.isValid)
    .map(v => v.docId)

  const invalidIds = validations
    .filter(v => !v.isValid)
    .map(v => v.docId)

  if (invalidIds.length > 0) {
    console.warn(`[API POST] ⚠️ Se removieron ${invalidIds.length} documentIds inválidos de "${collectionType}":`, invalidIds)
  }

  if (validIds.length !== documentIds.length) {
    console.log(`[API POST] ✅ DocumentIds válidos para "${collectionType}": ${validIds.length}/${documentIds.length}`)
  }

  return validIds
}

export async function GET(request: NextRequest) {
  try {
    // Verificar que el token esté configurado
    const token = process.env.STRAPI_API_TOKEN
    if (!token) {
      console.error('[API /tienda/productos] STRAPI_API_TOKEN no está configurado')
      return NextResponse.json(
        { 
          success: false,
          error: 'STRAPI_API_TOKEN no está configurado. Verifica las variables de entorno.',
          data: [],
          meta: {},
        },
        { status: 500 }
      )
    }

    // Obtener parámetros de query string
    const { searchParams } = new URL(request.url)
    const pageSize = searchParams.get('pagination[pageSize]') || '1000'
    const page = searchParams.get('pagination[page]') || '1'

    // Endpoint correcto confirmado: /api/libros (verificado en test-strapi)
    const endpointUsed = '/api/libros'
    const queryString = `populate=*&pagination[pageSize]=${pageSize}&pagination[page]=${page}`
    const url = `${process.env.NEXT_PUBLIC_STRAPI_URL || 'https://strapi.moraleja.cl'}${endpointUsed}?${queryString}`
    
    console.log('[API /tienda/productos] Intentando obtener productos:', {
      endpoint: endpointUsed,
      page,
      pageSize,
      url: url.replace(/Bearer\s+\w+/, 'Bearer [TOKEN]'), // Ocultar token en logs
      tieneToken: !!token,
    })
    
    // Usar populate=* que funciona correctamente
    // Solo especificar campos que realmente existen en Strapi (en minúsculas)
    const response = await strapiClient.get<any>(
      `${endpointUsed}?${queryString}`
    )
    
    // Log detallado para debugging
    console.log('[API /tienda/productos] ==========================================')
    console.log('[API /tienda/productos] Respuesta de Strapi recibida')
    console.log('[API /tienda/productos] Tipo de respuesta:', typeof response)
    console.log('[API /tienda/productos] Tiene data?:', !!response.data)
    console.log('[API /tienda/productos] Data es array?:', Array.isArray(response.data))
    console.log('[API /tienda/productos] Total productos:', Array.isArray(response.data) ? response.data.length : response.data ? 1 : 0)
    console.log('[API /tienda/productos] Meta paginación:', JSON.stringify(response.meta?.pagination || {}, null, 2))
    
    // Log de todos los IDs de productos para verificar que se están obteniendo
    if (response.data && Array.isArray(response.data)) {
      const ids = response.data.map((p: any) => {
        const attrs = p.attributes || p
        return {
          id: p.id || attrs.id,
          documentId: p.documentId || attrs.documentId,
          nombre: attrs.nombre_libro || attrs.NOMBRE_LIBRO || 'Sin nombre',
          estado: attrs.estado_publicacion || attrs.ESTADO_PUBLICACION || 'Sin estado',
          createdAt: attrs.createdAt || p.createdAt || 'Sin fecha',
        }
      })
      console.log('[API /tienda/productos] IDs de productos obtenidos:', ids.slice(0, 10)) // Primeros 10
      if (ids.length > 10) {
        console.log(`[API /tienda/productos] ... y ${ids.length - 10} más`)
      }
    }
    
    // Log del primer producto para verificar estructura completa
    if (response.data && (Array.isArray(response.data) ? response.data[0] : response.data)) {
      const primerProducto = Array.isArray(response.data) ? response.data[0] : response.data
      const attrs = primerProducto.attributes || primerProducto
      console.log('[API /tienda/productos] Primer producto estructura:', {
        id: primerProducto.id,
        documentId: primerProducto.documentId,
        tieneAttributes: !!primerProducto.attributes,
        nombre: attrs.nombre_libro || attrs.NOMBRE_LIBRO || 'Sin nombre',
        estado: attrs.estado_publicacion || attrs.ESTADO_PUBLICACION || 'Sin estado',
        keysAttributes: attrs ? Object.keys(attrs).slice(0, 10) : [],
      })
    }
    console.log('[API /tienda/productos] ==========================================')
    
    // No registrar log de visualización - solo se registran ediciones y eliminaciones
    return NextResponse.json({
      success: true,
      data: response.data || [],
      meta: response.meta || {},
      endpoint: endpointUsed,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /tienda/productos] Error al obtener productos:', {
      message: error.message,
      status: error.status,
      details: error.details,
      stack: error.stack,
      url: process.env.NEXT_PUBLIC_STRAPI_URL,
      tieneToken: !!process.env.STRAPI_API_TOKEN,
    })
    
    // Si es un error 502, puede ser un problema de conexión con Strapi
    if (error.status === 502) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Error 502: No se pudo conectar con Strapi. Verifica que el servidor de Strapi esté disponible y que las variables de entorno estén configuradas correctamente.',
          data: [],
          meta: {},
        },
        { status: 502 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Error al obtener productos',
        data: [],
        meta: {},
      },
      { status: error.status || 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  
  // Variable para almacenar los datos que se enviarán (para diagnóstico de errores)
  let strapiProductDataForError: any = null
  
  try {
    console.log('[API POST] 📝 Creando producto:', body)

    // Validar nombre_libro obligatorio
    if (!body.nombre_libro || body.nombre_libro.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'El nombre del libro es obligatorio'
      }, { status: 400 })
    }

    // CRÍTICO: Generar ISBN único automáticamente si no viene
    const isbn = body.isbn_libro && body.isbn_libro.trim() !== '' 
      ? body.isbn_libro.trim() 
      : `AUTO-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    console.log('[API POST] 📚 ISBN a usar:', isbn)

    // IMPORTANTE: Al crear, siempre se guarda con estado_publicacion = "Pendiente" (con mayúscula inicial como requiere el schema de Strapi)
    // El estado solo se puede cambiar desde la página de Solicitudes
    // Solo se publica en WordPress si estado_publicacion === "Publicado" (se maneja en lifecycles de Strapi)
    const estadoPublicacion = 'Pendiente'
    
    console.log('[API POST] 📚 Estado de publicación:', estadoPublicacion, '(siempre Pendiente al crear)')
    console.log('[API POST] ⏸️ No se crea en WooCommerce al crear - se sincronizará cuando estado_publicacion = "Publicado"')

    // Crear SOLO en Strapi (NO en WooCommerce al crear)
    console.log('[API POST] 📚 Creando producto en Strapi...')
    
    const strapiProductData: any = {
      data: {
        nombre_libro: body.nombre_libro.trim(),
        isbn_libro: isbn,
        descripcion: body.descripcion?.trim() || '',
        subtitulo_libro: body.subtitulo_libro?.trim() || '',
        estado_publicacion: estadoPublicacion, // Siempre "Pendiente" al crear (con mayúscula inicial como requiere Strapi)
        // NO incluir precio aquí - Strapi no tiene campo precio directo, usa relación precios
        // NO incluir stock_quantity aquí - Strapi no tiene campo stock_quantity directo, usa relación stocks
      }
    }

    // Agregar imagen si existe - usar ID de Strapi si está disponible
    if (body.portada_libro_id) {
      strapiProductData.data.portada_libro = body.portada_libro_id
    } else if (body.portada_libro && (typeof body.portada_libro === 'number' || /^\d+$/.test(String(body.portada_libro)))) {
      strapiProductData.data.portada_libro = typeof body.portada_libro === 'number' ? body.portada_libro : parseInt(body.portada_libro, 10)
    }

    // === RELACIONES SIMPLES (documentId) ===
    // Validar que los documentIds no estén vacíos o sean null
    if (body.obra && body.obra !== null && body.obra !== '') {
      strapiProductData.data.obra = body.obra
      console.log('[API POST] 📚 Obra asignada:', body.obra)
    }
    if (body.autor_relacion && body.autor_relacion !== null && body.autor_relacion !== '') {
      strapiProductData.data.autor_relacion = body.autor_relacion
      console.log('[API POST] 👤 Autor asignado:', body.autor_relacion)
    }
    if (body.editorial && body.editorial !== null && body.editorial !== '') {
      strapiProductData.data.editorial = body.editorial
      console.log('[API POST] 📖 Editorial asignada:', body.editorial)
    }
    if (body.sello && body.sello !== null && body.sello !== '') {
      strapiProductData.data.sello = body.sello
      console.log('[API POST] 🏷️ Sello asignado:', body.sello)
    }
    if (body.coleccion && body.coleccion !== null && body.coleccion !== '') {
      strapiProductData.data.coleccion = body.coleccion
      console.log('[API POST] 📚 Colección asignada:', body.coleccion)
    }

    // === RELACIONES MÚLTIPLES (array de documentIds) ===
    // CRÍTICO: Los canales son necesarios para sincronizar con WordPress
    // Validar que los arrays no contengan valores null o vacíos Y que los documentIds existan
    if (body.canales && Array.isArray(body.canales) && body.canales.length > 0) {
      const canalesFiltrados = body.canales.filter((c: any) => c !== null && c !== '' && c !== undefined && String(c).trim() !== '')
      if (canalesFiltrados.length > 0) {
        // Validar que los documentIds existan en Strapi
        const canalesValidos = await validateAndFilterDocumentIds(canalesFiltrados.map(String), 'canales')
        if (canalesValidos.length > 0) {
          strapiProductData.data.canales = canalesValidos
          console.log('[API POST] 📡 Canales asignados (validados):', canalesValidos)
        } else {
          console.warn('[API POST] ⚠️ Canales proporcionados pero ninguno es válido en Strapi')
        }
      } else {
        console.warn('[API POST] ⚠️ Canales proporcionados pero todos son inválidos (null/vacíos)')
      }
    } else {
      console.warn('[API POST] ⚠️ No se asignaron canales. El producto no se sincronizará con WordPress hasta que se asignen canales.')
    }
    
    if (body.marcas && Array.isArray(body.marcas) && body.marcas.length > 0) {
      const marcasFiltradas = body.marcas.filter((m: any) => m !== null && m !== '' && m !== undefined && String(m).trim() !== '')
      if (marcasFiltradas.length > 0) {
        const marcasValidas = await validateAndFilterDocumentIds(marcasFiltradas.map(String), 'marcas')
        if (marcasValidas.length > 0) {
          strapiProductData.data.marcas = marcasValidas
          console.log('[API POST] 🏷️ Marcas asignadas (validadas):', marcasValidas)
        }
      }
    }
    // Etiquetas son opcionales - solo agregar si se proporcionan y son válidas
    if (body.etiquetas && Array.isArray(body.etiquetas) && body.etiquetas.length > 0) {
      const etiquetasFiltradas = body.etiquetas.filter((e: any) => e !== null && e !== '' && e !== undefined && String(e).trim() !== '')
      if (etiquetasFiltradas.length > 0) {
        // El endpoint correcto en Strapi es '/api/etiquetas' (confirmado en otros archivos del código)
        const etiquetasValidas = await validateAndFilterDocumentIds(etiquetasFiltradas.map(String), 'etiquetas')
        if (etiquetasValidas.length > 0) {
          strapiProductData.data.etiquetas = etiquetasValidas
          console.log('[API POST] 🏷️ Etiquetas asignadas (validadas):', etiquetasValidas)
        } else {
          console.log('[API POST] ℹ️ Etiquetas proporcionadas pero ninguna es válida, se omite el campo')
        }
      }
    } else {
      console.log('[API POST] ℹ️ No se proporcionaron etiquetas (campo opcional)')
    }
    if (body.categorias_producto && Array.isArray(body.categorias_producto) && body.categorias_producto.length > 0) {
      const categoriasFiltradas = body.categorias_producto.filter((c: any) => c !== null && c !== '' && c !== undefined && String(c).trim() !== '')
      if (categoriasFiltradas.length > 0) {
        const categoriasValidas = await validateAndFilterDocumentIds(categoriasFiltradas.map(String), 'categorias-productos')
        if (categoriasValidas.length > 0) {
          strapiProductData.data.categorias_producto = categoriasValidas
          console.log('[API POST] 📂 Categorías asignadas (validadas):', categoriasValidas)
        }
      }
    }
    
    // Log del body completo para debug
    console.log('[API POST] 🔍 Body completo recibido:', JSON.stringify(body, null, 2))
    console.log('[API POST] 🔍 Datos a enviar a Strapi:', JSON.stringify(strapiProductData, null, 2))
    
    // Guardar para diagnóstico de errores
    strapiProductDataForError = strapiProductData

    // === CAMPOS NUMÉRICOS ===
    if (body.numero_edicion !== undefined && body.numero_edicion !== '') {
      strapiProductData.data.numero_edicion = parseInt(body.numero_edicion)
    }
    if (body.agno_edicion !== undefined && body.agno_edicion !== '') {
      strapiProductData.data.agno_edicion = parseInt(body.agno_edicion)
    }

    // === ENUMERACIONES ===
    if (body.idioma && body.idioma !== '') {
      strapiProductData.data.idioma = body.idioma
    }
    if (body.tipo_libro && body.tipo_libro !== '') {
      strapiProductData.data.tipo_libro = body.tipo_libro
    }
    if (body.estado_edicion && body.estado_edicion !== '') {
      strapiProductData.data.estado_edicion = body.estado_edicion
    }

    // === CAMPOS WOOCOMMERCE ===
    if (body.precio !== undefined) {
      strapiProductData.data.precio = parseFloat(body.precio) || 0
    }
    if (body.precio_regular !== undefined) {
      strapiProductData.data.precio_regular = parseFloat(body.precio_regular) || 0
    }
    if (body.precio_oferta !== undefined) {
      strapiProductData.data.precio_oferta = parseFloat(body.precio_oferta) || 0
    }
    if (body.stock_quantity !== undefined) {
      strapiProductData.data.stock_quantity = parseInt(body.stock_quantity) || 0
    }
    if (body.manage_stock !== undefined) {
      strapiProductData.data.manage_stock = body.manage_stock
    }
    if (body.stock_status) {
      strapiProductData.data.stock_status = body.stock_status
    }
    if (body.weight !== undefined && body.weight !== '') {
      strapiProductData.data.weight = parseFloat(body.weight) || 0
    }
    if (body.length !== undefined && body.length !== '') {
      strapiProductData.data.length = parseFloat(body.length) || 0
    }
    if (body.width !== undefined && body.width !== '') {
      strapiProductData.data.width = parseFloat(body.width) || 0
    }
    if (body.height !== undefined && body.height !== '') {
      strapiProductData.data.height = parseFloat(body.height) || 0
    }
    if (body.featured !== undefined) {
      strapiProductData.data.featured = body.featured
    }

    // Log detallado ANTES de enviar para identificar relaciones problemáticas
    console.log('[API POST] 🔍 RELACIONES A ENVIAR:')
    console.log('  - obra:', strapiProductData.data.obra || 'NO HAY')
    console.log('  - autor_relacion:', strapiProductData.data.autor_relacion || 'NO HAY')
    console.log('  - editorial:', strapiProductData.data.editorial || 'NO HAY')
    console.log('  - sello:', strapiProductData.data.sello || 'NO HAY')
    console.log('  - coleccion:', strapiProductData.data.coleccion || 'NO HAY')
    console.log('  - canales:', strapiProductData.data.canales || 'NO HAY')
    console.log('  - marcas:', strapiProductData.data.marcas || 'NO HAY')
    console.log('  - etiquetas:', strapiProductData.data.etiquetas || 'NO HAY')
    console.log('  - categorias_producto:', strapiProductData.data.categorias_producto || 'NO HAY')
    
    // CRÍTICO: Si hay un error de "locale null", puede ser que el documentId no existe o tiene problema de i18n
    // Intentar crear sin relaciones problemáticas si falla
    console.log('[API POST] 📤 Enviando a Strapi...')
    
    // Usar Promise.race con timeout para evitar que se quede colgado
    const strapiPromise = strapiClient.post<any>('/api/libros', strapiProductData)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout: Strapi tardó más de 20 segundos')), 20000)
    )
    
    const strapiProduct = await Promise.race([strapiPromise, timeoutPromise]) as any
    console.log('[API POST] ==========================================')
    console.log('[API POST] ✅ PRODUCTO CREADO EXITOSAMENTE EN STRAPI')
    const attrs = strapiProduct.data?.attributes || strapiProduct.attributes || {}
    console.log('[API POST] ID:', strapiProduct.data?.id || strapiProduct.id)
    console.log('[API POST] DocumentId:', strapiProduct.data?.documentId || strapiProduct.documentId)
    console.log('[API POST] Nombre:', attrs.nombre_libro || attrs.NOMBRE_LIBRO || 'Sin nombre')
    console.log('[API POST] Estado:', attrs.estado_publicacion || attrs.ESTADO_PUBLICACION || 'Sin estado')
    console.log('[API POST] Canales:', attrs.canales?.data?.length || attrs.canales?.length || 0, 'canales asignados')
    console.log('[API POST] Estructura completa (primeros 2000 chars):', JSON.stringify(strapiProduct, null, 2).substring(0, 2000))
    console.log('[API POST] ==========================================')
    console.log('[API POST] Estado: ⏸️ Solo guardado en Strapi (pendiente), no se publica en WordPress')
    console.log('[API POST] Para publicar en WordPress:')
    console.log('[API POST]   1. Ir a la página de Solicitudes')
    console.log('[API POST]   2. Cambiar estado_publicacion a "Publicado"')
    console.log('[API POST]   3. Asegurarse de que el producto tenga canales asignados (necesarios para sincronizar)')
    console.log('[API POST]   4. Los lifecycles de Strapi sincronizarán automáticamente con WordPress')

    // Registrar log de creación
    const productoId = strapiProduct?.data?.documentId || strapiProduct?.data?.id || strapiProduct?.documentId || strapiProduct?.id
    logActivity(request, {
      accion: 'crear',
      entidad: 'producto',
      entidadId: productoId,
      descripcion: createLogDescription('crear', 'producto', isbn, `Producto "${body.nombre_libro}" (ISBN: ${isbn})`),
      datosNuevos: { nombre: body.nombre_libro, isbn, precio: body.precio },
      metadata: { strapiId: strapiProduct?.data?.documentId || strapiProduct?.data?.id },
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      data: {
        strapi: strapiProduct?.data || null,
      },
      message: 'Producto creado en Strapi con estado "pendiente". Para publicar en WordPress, cambia el estado desde Solicitudes.'
    })

  } catch (error: any) {
    console.error('[API POST] ❌ ERROR al crear producto:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    
    // Si el error es de "locale null" o "document not found", identificar qué relación está causando el problema
    if (error.message && (error.message.includes('locale') || error.message.includes('not found'))) {
      const documentIdMatch = error.message.match(/id "([^"]+)"/)
      if (documentIdMatch) {
        const problematicId = documentIdMatch[1]
        console.error('[API POST] 🔍 ==========================================')
        console.error('[API POST] 🔍 DocumentId problemático encontrado:', problematicId)
        console.error('[API POST] 🔍 Verificar en Strapi si este documentId existe:')
        console.error('[API POST] 🔍 ==========================================')
        
        // Identificar qué relación tiene ese ID
        const relaciones: Record<string, any> = {
          obra: strapiProductDataForError?.data?.obra,
          autor_relacion: strapiProductDataForError?.data?.autor_relacion,
          editorial: strapiProductDataForError?.data?.editorial,
          sello: strapiProductDataForError?.data?.sello,
          coleccion: strapiProductDataForError?.data?.coleccion,
          canales: strapiProductDataForError?.data?.canales,
          marcas: strapiProductDataForError?.data?.marcas,
          etiquetas: strapiProductDataForError?.data?.etiquetas,
          categorias_producto: strapiProductDataForError?.data?.categorias_producto,
        }
        
        const relacionesProblematicas: string[] = []
        for (const [campo, valor] of Object.entries(relaciones)) {
          if (Array.isArray(valor)) {
            if (valor.includes(problematicId)) {
              relacionesProblematicas.push(`${campo} (array)`)
              console.error(`[API POST] ⚠️ El documentId "${problematicId}" está en el campo "${campo}" (array)`)
            }
          } else if (valor === problematicId) {
            relacionesProblematicas.push(campo)
            console.error(`[API POST] ⚠️ El documentId "${problematicId}" está en el campo "${campo}"`)
          }
        }
        
        if (relacionesProblematicas.length > 0) {
          console.error(`[API POST] 🔍 Campos problemáticos: ${relacionesProblematicas.join(', ')}`)
          console.error(`[API POST] 💡 SOLUCIÓN: Elimina o corrige estos campos antes de crear el producto`)
        } else {
          console.error(`[API POST] ⚠️ No se pudo identificar qué campo tiene el documentId problemático`)
          console.error(`[API POST] 🔍 Revisa todos los campos de relaciones en el body`)
        }
        console.error('[API POST] 🔍 ==========================================')
      }
    }
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al crear el producto en Strapi',
      details: error.details,
      message: error.message?.includes('locale') 
        ? 'Error: Uno de los documentIds de las relaciones no existe o tiene problema de locale en Strapi. Revisa los logs del servidor para identificar cuál.'
        : undefined
    }, { status: error.status || 500 })
  }
}
