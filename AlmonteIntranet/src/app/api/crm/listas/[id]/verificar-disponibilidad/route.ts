/**
 * POST /api/crm/listas/[id]/verificar-disponibilidad
 * Verifica la disponibilidad de los productos en WooCommerce y Strapi
 * sin reprocesar el PDF. Actualiza y guarda los resultados.
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import { createWooCommerceClient } from '@/lib/woocommerce/client'
import { getColaboradorFromCookies } from '@/lib/auth/cookies'
import { obtenerUltimaVersion } from '@/lib/utils/strapi'

export const dynamic = 'force-dynamic'

function normalizarBusqueda(texto: string): string {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Encuentra el mejor producto coincidente en los resultados de WooCommerce
 * Compara el nombre buscado con cada resultado y devuelve el que mejor coincida
 */
function encontrarMejorCoincidencia(
  nombreBuscado: string,
  productosWooCommerce: any[]
): any | null {
  if (!nombreBuscado || productosWooCommerce.length === 0) return null

  const nombreNormBuscado = normalizarBusqueda(nombreBuscado)
  // Filtrar palabras comunes que no son significativas (artículos, preposiciones, etc.)
  const palabrasComunes = new Set(['de', 'la', 'el', 'los', 'las', 'del', 'al', 'en', 'con', 'por', 'para', 'un', 'una', 'unos', 'unas'])
  const palabrasBuscadas = nombreNormBuscado
    .split(/\s+/)
    .filter(p => p.length >= 2 && !palabrasComunes.has(p))

  let mejorMatch: any | null = null
  let mejorPuntuacion = 0

  for (const producto of productosWooCommerce) {
    const nombreProducto = (producto.name || '').trim()
    if (!nombreProducto) continue

    const nombreNormProducto = normalizarBusqueda(nombreProducto)
    const palabrasProducto = nombreNormProducto
      .split(/\s+/)
      .filter(p => p.length >= 2 && !palabrasComunes.has(p))
    
    // Puntuación de coincidencia:
    // - 100 puntos: Coincidencia exacta (después de normalizar)
    // - 80 puntos: El nombre buscado está completamente contenido en el nombre del producto
    // - 60 puntos: El nombre del producto está completamente contenido en el nombre buscado
    // - 50 puntos: Todas las palabras significativas del nombre buscado están en el producto
    // - 40 puntos: Al menos 2 palabras significativas coinciden Y hay más de 2 palabras en total

    let puntuacion = 0

    // Coincidencia exacta
    if (nombreNormBuscado === nombreNormProducto) {
      puntuacion = 100
    }
    // El nombre buscado está contenido en el producto (ej: "Caja de Tempera" en "Caja de Tempera 500ml")
    else if (nombreNormProducto.includes(nombreNormBuscado)) {
      puntuacion = 80
    }
    // El nombre del producto está contenido en el buscado (menos común pero posible)
    else if (nombreNormBuscado.includes(nombreNormProducto)) {
      puntuacion = 60
    }
    // Verificar coincidencia por palabras significativas
    else if (palabrasBuscadas.length > 0) {
      // Contar cuántas palabras significativas del nombre buscado están en el producto
      const palabrasCoincidentes = palabrasBuscadas.filter(palabra => 
        nombreNormProducto.includes(palabra)
      )
      
      // Si TODAS las palabras significativas coinciden, es una excelente coincidencia
      if (palabrasCoincidentes.length === palabrasBuscadas.length && palabrasBuscadas.length >= 2) {
        puntuacion = 50
      }
      // Si al menos 2 palabras significativas coinciden Y hay más de 2 palabras en total
      else if (palabrasCoincidentes.length >= 2 && palabrasBuscadas.length > 2) {
        // Solo aceptar si la mayoría de las palabras coinciden (al menos 70%)
        const porcentajeCoincidencia = (palabrasCoincidentes.length / palabrasBuscadas.length) * 100
        if (porcentajeCoincidencia >= 70) {
          puntuacion = 40
        }
      }
      // Si solo hay 1-2 palabras significativas y todas coinciden
      else if (palabrasBuscadas.length <= 2 && palabrasCoincidentes.length === palabrasBuscadas.length) {
        // Solo aceptar si la palabra es suficientemente larga (evitar coincidencias como "caja" sola)
        if (palabrasBuscadas.every(p => p.length >= 4)) {
          puntuacion = 40
        }
      }
    }

    // Solo considerar coincidencias con puntuación >= 40 (coincidencia razonable)
    if (puntuacion >= 40 && puntuacion > mejorPuntuacion) {
      mejorPuntuacion = puntuacion
      mejorMatch = producto
    }
  }

  return mejorMatch
}

async function buscarEnStrapi(prod: { nombre?: string; isbn?: string }): Promise<{
  encontrado: boolean
  stock_quantity?: number
  precio?: number
  imagen?: string
  woocommerce_id?: number
  estado_publicacion?: string
} | null> {
  const nombreBuscar = (prod.nombre || '').trim()
  const isbnBuscar = (prod.isbn || '').replace(/[-\s]/g, '').trim()
  if (!nombreBuscar || nombreBuscar.length < 2) return null

  const nombreNorm = normalizarBusqueda(nombreBuscar)
  const palabras = nombreNorm.split(/\s+/).filter(p => p.length >= 2)
  const searchTerms = [nombreBuscar]
  if (palabras.length > 1) {
    searchTerms.push(palabras.slice(0, 2).join(' '))
    if (palabras[0].length >= 4) searchTerms.push(palabras[0])
  }

  try {
    for (const term of searchTerms) {
      const params = new URLSearchParams()
      params.set('pagination[pageSize]', '100')
      params.set('populate', '*')
      // ⚠️ IMPORTANTE: Usar 'preview' para incluir productos con estado "Pendiente"
      // Esto permite buscar productos que aún no están publicados pero que existen en Strapi
      params.set('publicationState', 'preview')
      if (isbnBuscar && isbnBuscar.length >= 10) {
        params.set('filters[isbn_libro][$containsi]', isbnBuscar)
      } else {
        params.set('filters[nombre_libro][$containsi]', term)
      }
      const res = await strapiClient.get<any>(`/api/libros?${params}`)
      const items = Array.isArray(res?.data) ? res.data : res?.data ? [res.data] : []

      for (const item of items) {
        const attrs = item.attributes || item
        const nombre = (attrs.nombre_libro || attrs.nombreLibro || attrs.NOMBRE_LIBRO || '').trim()
        const isbn = (attrs.isbn_libro || attrs.isbnLibro || attrs.ISBN_LIBRO || '').toString().replace(/[-\s]/g, '')
        const nombreNormItem = normalizarBusqueda(nombre)
        const estadoPublicacion = attrs.estado_publicacion || 'Sin estado'

        let coincide = false
        if (isbnBuscar && isbn && isbn.includes(isbnBuscar)) coincide = true
        else if (nombreNormItem.includes(nombreNorm) || nombreNorm.includes(nombreNormItem)) coincide = true
        else if (palabras.length >= 2) {
          const encontradas = palabras.filter(p => nombreNormItem.includes(p)).length
          coincide = encontradas >= Math.min(palabras.length, 2)
        }

        if (coincide) {
          const imagen = attrs.portada_libro?.data?.attributes?.url || attrs.portada_libro?.url
          const imagenUrl = imagen
            ? (imagen.startsWith('http') ? imagen : `${process.env.NEXT_PUBLIC_STRAPI_URL || 'https://strapi.moraleja.cl'}${imagen}`)
            : undefined
          
          console.log(`[buscarEnStrapi] ✅ Producto encontrado: "${nombre}" (Estado: ${estadoPublicacion})`)
          
          return {
            encontrado: true,
            stock_quantity: parseInt(attrs.stock_quantity || attrs.STOCK_QUANTITY || 0, 10) || undefined,
            precio: parseFloat(attrs.precio || attrs.precio_venta || 0) || undefined,
            imagen: imagenUrl,
            woocommerce_id: attrs.woocommerce_id || attrs.wooId,
            estado_publicacion: estadoPublicacion,
          }
        }
      }
    }
  } catch (error: any) {
    console.error('[buscarEnStrapi] Error al buscar en Strapi:', error.message)
  }
  return null
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const colaborador = await getColaboradorFromCookies()
    if (!colaborador) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID de lista requerido' }, { status: 400 })
    }

    const wooClient = createWooCommerceClient('woo_escolar')

    let curso: any = null
    const paramsDocId = new URLSearchParams({
      'filters[documentId][$eq]': String(id),
      'populate[colegio]': 'true',
      'publicationState': 'preview',
    })
    const cursoRes = await strapiClient.get<any>(`/api/cursos?${paramsDocId}`)
    const cursos = Array.isArray(cursoRes?.data) ? cursoRes.data : cursoRes?.data ? [cursoRes.data] : []
    if (cursos.length > 0) curso = cursos[0]
    else {
      const byId = new URLSearchParams({ 'filters[id][$eq]': String(id), 'populate[colegio]': 'true', 'publicationState': 'preview' })
      const res2 = await strapiClient.get<any>(`/api/cursos?${byId}`)
      const arr = Array.isArray(res2?.data) ? res2.data : res2?.data ? [res2.data] : []
      if (arr.length > 0) curso = arr[0]
    }

    if (!curso) {
      return NextResponse.json({ success: false, error: 'Curso/lista no encontrado' }, { status: 404 })
    }

    const versiones = (curso.attributes || curso).versiones_materiales || []
    const ultima = obtenerUltimaVersion(versiones)
    const materiales = ultima?.materiales || []
    if (materiales.length === 0) {
      return NextResponse.json({ success: true, productos: [], mensaje: 'No hay productos para verificar' })
    }

    // ⚠️ IMPORTANTE: Solo validar los productos que ya están en el PDF
    // NO agregar productos nuevos, solo actualizar información de disponibilidad
    console.log(`[verificar-disponibilidad] 📋 Validando ${materiales.length} productos del PDF (sin agregar nuevos)`)

    const productosActualizados = []
    const productosProcesados = new Set<string>() // Para detectar duplicados

    for (let i = 0; i < materiales.length; i++) {
      const m = materiales[i]
      const nombreBuscar = (m.nombre || '').trim()
      
      // Validar que el producto tenga nombre válido
      if (!nombreBuscar || nombreBuscar.length < 2) {
        console.warn(`[verificar-disponibilidad] ⚠️ Producto ${i + 1} sin nombre válido, omitiendo`)
        productosActualizados.push(m) // Mantener el producto original sin cambios
        continue
      }

      // Detectar duplicados (mismo nombre normalizado)
      const nombreNormalizado = normalizarBusqueda(nombreBuscar)
      if (productosProcesados.has(nombreNormalizado)) {
        console.warn(`[verificar-disponibilidad] ⚠️ Producto duplicado detectado: "${nombreBuscar}" (índice ${i + 1}), omitiendo verificación`)
        productosActualizados.push(m) // Mantener el producto original sin cambios
        continue
      }
      productosProcesados.add(nombreNormalizado)

      let encontrado = false
      let wooProduct: any = null

      // ⚠️ ESTRATEGIA DE BÚSQUEDA MEJORADA:
      // 1. Buscar en Strapi (productos) - fuente de verdad principal
      // 2. Buscar en WooCommerce Escolar - información actualizada de stock y disponibilidad
      // 3. Combinar información de ambas fuentes (priorizar Strapi para datos base, WooCommerce para stock actualizado)

      let strapiMatch: any = null
      let wooMatch: any = null

      // PASO 1: Buscar en Strapi (productos) - incluye productos con estado "Pendiente"
      // ⚠️ IMPORTANTE: Busca TODOS los productos, incluso los que están en estado "Pendiente"
      // porque aunque no estén publicados, existen en Strapi y pueden ser aprobados después
      strapiMatch = await buscarEnStrapi({ nombre: nombreBuscar, isbn: m.isbn })
      if (strapiMatch?.encontrado) {
        const estadoInfo = strapiMatch.estado_publicacion ? ` (Estado: ${strapiMatch.estado_publicacion})` : ''
        console.log(`[verificar-disponibilidad] ✅ Producto "${nombreBuscar}" encontrado en Strapi${estadoInfo} (stock: ${strapiMatch.stock_quantity ?? 0})`)
      }

      // PASO 2: Buscar en WooCommerce Escolar (siempre buscar para tener info actualizada)
      try {
        const wooRes = await wooClient.get<any[]>('products', {
          search: nombreBuscar,
          per_page: 10,
          status: 'publish',
        })
        if (Array.isArray(wooRes) && wooRes.length > 0) {
          // Encontrar el mejor match
          const mejorCoincidencia = encontrarMejorCoincidencia(nombreBuscar, wooRes)
          if (mejorCoincidencia) {
            wooMatch = mejorCoincidencia
            console.log(`[verificar-disponibilidad] ✅ Producto "${nombreBuscar}" encontrado en WooCommerce Escolar: "${mejorCoincidencia.name}" (stock: ${mejorCoincidencia.stock_quantity ?? 0})`)
          } else {
            console.log(`[verificar-disponibilidad] ⚠️ No se encontró coincidencia válida para "${nombreBuscar}" en WooCommerce Escolar (${wooRes.length} resultados descartados)`)
          }
        }
      } catch (error: any) {
        console.error(`[verificar-disponibilidad] Error al buscar "${nombreBuscar}" en WooCommerce Escolar:`, error.message)
      }

      // PASO 3: Combinar información de ambas fuentes
      if (strapiMatch?.encontrado || wooMatch) {
        encontrado = true
        
        // Priorizar información de WooCommerce para stock (más actualizado)
        // Pero usar información de Strapi para datos base (precio, imagen, etc.)
        if (wooMatch) {
          // Si encontramos en WooCommerce, usar esa información (más actualizada)
          wooProduct = {
            ...wooMatch,
            // Si también encontramos en Strapi, combinar información
            price: strapiMatch?.precio ? String(strapiMatch.precio) : wooMatch.price,
            images: strapiMatch?.imagen 
              ? [{ src: strapiMatch.imagen }] 
              : wooMatch.images || [],
          }
          console.log(`[verificar-disponibilidad] 📊 Combinando datos: Strapi=${!!strapiMatch?.encontrado}, WooCommerce=${!!wooMatch}`)
        } else if (strapiMatch?.encontrado) {
          // Solo encontrado en Strapi
          wooProduct = {
            stock_quantity: strapiMatch.stock_quantity ?? 0,
            price: String(strapiMatch.precio ?? 0),
            images: strapiMatch.imagen ? [{ src: strapiMatch.imagen }] : [],
            id: strapiMatch.woocommerce_id || 0,
            name: nombreBuscar,
          }
        }
      }

      const stock = wooProduct?.stock_quantity ?? 0
      const disponibilidad = !encontrado ? 'no_encontrado' : stock > 0 ? 'disponible' : 'no_disponible'

      const actualizado = {
        ...m,
        disponibilidad,
        encontrado_en_woocommerce: encontrado,
        precio: wooProduct ? parseFloat(wooProduct.price) : m.precio,
        stock_quantity: wooProduct?.stock_quantity ?? m.stock_quantity,
        imagen: wooProduct?.images?.[0]?.src || m.imagen,
        woocommerce_id: wooProduct?.id || m.woocommerce_id,
      }
      materiales[i] = actualizado
      productosActualizados.push(actualizado)
    }

    const versionIndex = versiones.findIndex((v: any) => v === ultima)
    if (versionIndex >= 0) {
      versiones[versionIndex] = { ...ultima, materiales, fecha_actualizacion: new Date().toISOString() }
      const cursoDocId = curso.documentId || curso.id || id
      await strapiClient.put(`/api/cursos/${cursoDocId}`, {
        data: {
          versiones_materiales: versiones,
        },
      })
    }

    const disponibles = productosActualizados.filter((p: any) => p.disponibilidad === 'disponible').length
    const noDisponibles = productosActualizados.filter((p: any) => p.disponibilidad === 'no_disponible').length
    const noEncontrados = productosActualizados.filter((p: any) => p.disponibilidad === 'no_encontrado').length
    
    console.log(`[verificar-disponibilidad] ✅ Validación completada: ${productosActualizados.length} productos validados (${disponibles} disponibles, ${noDisponibles} sin stock, ${noEncontrados} no encontrados)`)
    console.log(`[verificar-disponibilidad] 📊 Total productos procesados: ${productosProcesados.size} únicos (${materiales.length - productosProcesados.size} duplicados omitidos)`)
    
    return NextResponse.json({
      success: true,
      productos: productosActualizados,
      resumen: {
        total: productosActualizados.length,
        disponibles,
        noDisponibles,
        noEncontrados,
        productosUnicos: productosProcesados.size,
        duplicadosOmitidos: materiales.length - productosProcesados.size,
      },
    })
  } catch (error: any) {
    console.error('[verificar-disponibilidad]', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Error al verificar disponibilidad' },
      { status: 500 }
    )
  }
}
