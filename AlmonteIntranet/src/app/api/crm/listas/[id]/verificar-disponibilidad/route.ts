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

async function buscarEnStrapi(prod: { nombre?: string; isbn?: string }): Promise<{
  encontrado: boolean
  stock_quantity?: number
  precio?: number
  imagen?: string
  woocommerce_id?: number
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
          return {
            encontrado: true,
            stock_quantity: parseInt(attrs.stock_quantity || attrs.STOCK_QUANTITY || 0, 10) || undefined,
            precio: parseFloat(attrs.precio || attrs.precio_venta || 0) || undefined,
            imagen: imagenUrl,
            woocommerce_id: attrs.woocommerce_id || attrs.wooId,
          }
        }
      }
    }
  } catch (_e) {}
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

    const productosActualizados = []

    for (let i = 0; i < materiales.length; i++) {
      const m = materiales[i]
      const nombreBuscar = (m.nombre || '').trim()
      let encontrado = false
      let wooProduct: any = null

      try {
        const wooRes = await wooClient.get<any[]>('products', {
          search: nombreBuscar,
          per_page: 5,
          status: 'publish',
        })
        if (Array.isArray(wooRes) && wooRes.length > 0) {
          wooProduct = wooRes[0]
          encontrado = true
        }
      } catch (_e) {}

      if (!encontrado) {
        const strapiMatch = await buscarEnStrapi({ nombre: nombreBuscar, isbn: m.isbn })
        if (strapiMatch?.encontrado) {
          encontrado = true
          wooProduct = {
            stock_quantity: strapiMatch.stock_quantity ?? 0,
            price: String(strapiMatch.precio ?? 0),
            images: strapiMatch.imagen ? [{ src: strapiMatch.imagen }] : [],
            id: strapiMatch.woocommerce_id || 0,
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
    return NextResponse.json({
      success: true,
      productos: productosActualizados,
      resumen: {
        total: productosActualizados.length,
        disponibles,
        noDisponibles: productosActualizados.filter((p: any) => p.disponibilidad === 'no_disponible').length,
        noEncontrados: productosActualizados.filter((p: any) => p.disponibilidad === 'no_encontrado').length,
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
