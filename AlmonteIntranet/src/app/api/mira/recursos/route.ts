import { NextRequest, NextResponse } from 'next/server'
import { getStrapiUrl, STRAPI_API_TOKEN } from '@/lib/strapi/config'

export const dynamic = 'force-dynamic'

/**
 * GET /api/mira/recursos
 * Lista recursos-mira desde Strapi con filtros avanzados y paginación.
 *
 * Query params:
 *   page          (default 1)
 *   pageSize      (default 50, max 100)
 *   search        búsqueda general en nombre / titulo_personalizado
 *   seccion       filtro exacto por sección (enum)
 *   capitulo      contiene en numero_capitulo
 *   sub_seccion   contiene en sub_seccion
 *   ejercicio     contiene en numero_ejercicio
 *   titulo        contiene en titulo_personalizado
 *   sinLibro      "true" → solo recursos sin libro_mira asignado
 *   conLibro      "true" → solo recursos con libro_mira asignado
 *   sort          campo:orden (default createdAt:desc)
 */
export async function GET(request: NextRequest) {
  if (!STRAPI_API_TOKEN) {
    return NextResponse.json(
      { error: 'Strapi no configurado: falta STRAPI_API_TOKEN' },
      { status: 503 }
    )
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, Number(searchParams.get('page') || '1'))
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') || '50')))
  const search = (searchParams.get('search') || '').trim()
  const seccion = (searchParams.get('seccion') || '').trim()
  const capitulo = (searchParams.get('capitulo') || '').trim()
  const subSeccion = (searchParams.get('sub_seccion') || '').trim()
  const ejercicio = (searchParams.get('ejercicio') || '').trim()
  const titulo = (searchParams.get('titulo') || '').trim()
  const sinLibro = searchParams.get('sinLibro') === 'true'
  const conLibro = searchParams.get('conLibro') === 'true'
  const sort = searchParams.get('sort') || 'createdAt:desc'

  // Construir query params para Strapi
  const params = new URLSearchParams()

  // Paginación
  params.set('pagination[page]', String(page))
  params.set('pagination[pageSize]', String(pageSize))

  // Ordenar
  params.set('sort', sort)

  // Populate libro_mira para saber si ya está asignado
  params.set('populate[libro_mira][fields][0]', 'id')
  params.set('populate[libro_mira][populate][libro][fields][0]', 'nombre_libro')

  // Filtro de campos seleccionados
  params.set('fields[0]', 'nombre')
  params.set('fields[1]', 'video_id')
  params.set('fields[2]', 'tipo')
  params.set('fields[3]', 'seccion')
  params.set('fields[4]', 'numero_capitulo')
  params.set('fields[5]', 'sub_seccion')
  params.set('fields[6]', 'numero_ejercicio')
  params.set('fields[7]', 'titulo_personalizado')
  params.set('fields[8]', 'duracion_segundos')
  params.set('fields[9]', 'orden')
  params.set('fields[10]', 'createdAt')

  let filterIdx = 0

  // Búsqueda general (nombre O titulo_personalizado)
  if (search) {
    params.set(`filters[$or][0][nombre][$containsi]`, search)
    params.set(`filters[$or][1][titulo_personalizado][$containsi]`, search)
  }

  // Filtro por sección exacta
  if (seccion) {
    const key = search ? `filters[$and][${filterIdx}][seccion][$eq]` : `filters[seccion][$eq]`
    params.set(key, seccion)
    if (search) filterIdx++
  }

  // Filtro por capítulo (contiene)
  if (capitulo) {
    const key = search
      ? `filters[$and][${filterIdx}][numero_capitulo][$containsi]`
      : `filters[numero_capitulo][$containsi]`
    params.set(key, capitulo)
    if (search) filterIdx++
  }

  // Filtro por sub_seccion (contiene)
  if (subSeccion) {
    const key = search
      ? `filters[$and][${filterIdx}][sub_seccion][$containsi]`
      : `filters[sub_seccion][$containsi]`
    params.set(key, subSeccion)
    if (search) filterIdx++
  }

  // Filtro por ejercicio (contiene)
  if (ejercicio) {
    const key = search
      ? `filters[$and][${filterIdx}][numero_ejercicio][$containsi]`
      : `filters[numero_ejercicio][$containsi]`
    params.set(key, ejercicio)
    if (search) filterIdx++
  }

  // Filtro por titulo_personalizado (contiene) — solo si no hay búsqueda general
  if (titulo && !search) {
    params.set(`filters[titulo_personalizado][$containsi]`, titulo)
  }

  // Filtro: sin libro asignado
  if (sinLibro) {
    const key = search
      ? `filters[$and][${filterIdx}][libro_mira][$null]`
      : `filters[libro_mira][$null]`
    params.set(key, 'true')
    if (search) filterIdx++
  }

  // Filtro: con libro asignado
  if (conLibro) {
    const key = search
      ? `filters[$and][${filterIdx}][libro_mira][$notNull]`
      : `filters[libro_mira][$notNull]`
    params.set(key, 'true')
    if (search) filterIdx++
  }

  const url = `${getStrapiUrl('api/recursos-mira')}?${params.toString()}`

  const headers: HeadersInit = {
    Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    Accept: 'application/json',
  }

  try {
    const res = await fetch(url, { method: 'GET', headers })
    const text = await res.text()
    if (!res.ok) {
      let errMsg = text
      try {
        const j = JSON.parse(text) as { error?: { message?: string } }
        errMsg = j.error?.message ?? text
      } catch { /* usar text */ }
      return NextResponse.json({ error: errMsg || res.statusText }, { status: res.status })
    }
    const json = text ? JSON.parse(text) : {}
    return NextResponse.json(json)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error al listar recursos MIRA'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
