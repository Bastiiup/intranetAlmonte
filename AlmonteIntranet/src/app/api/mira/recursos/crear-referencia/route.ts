import { NextRequest, NextResponse } from 'next/server'
import { getStrapiUrl, STRAPI_API_TOKEN } from '@/lib/strapi/config'

export const dynamic = 'force-dynamic'

const SECCIONES = ['Teorico', 'Ensayo', 'Ejercitacion', 'Solucionario', 'Clase_Grabada', 'Otro'] as const

type CrearReferenciaBody = {
  nombre: string
  video_id: string
  tipo?: string
  proveedor?: string
  numero_capitulo?: string
  seccion?: string
  orden?: number
  contenido?: string
}

/**
 * POST /api/mira/recursos/crear-referencia
 * Crea un recurso-mira en Strapi sin libro_mira (clasificación previa a asignar a libro).
 * Usado tras subir el video a Bunny para registrar en Strapi con capítulo y sección.
 */
export async function POST(request: NextRequest) {
  if (!STRAPI_API_TOKEN) {
    return NextResponse.json(
      { error: 'Strapi no configurado: falta STRAPI_API_TOKEN' },
      { status: 503 }
    )
  }

  let body: CrearReferenciaBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo JSON inválido' }, { status: 400 })
  }

  const {
    nombre,
    video_id,
    tipo = 'video',
    proveedor = 'bunny_stream',
    numero_capitulo = '',
    seccion = 'Teorico',
    orden = 0,
    contenido = '',
  } = body

  if (!nombre || !video_id) {
    return NextResponse.json(
      { error: 'Se requieren nombre y video_id' },
      { status: 400 }
    )
  }

  const seccionValida = SECCIONES.includes(seccion as (typeof SECCIONES)[number])
    ? seccion
    : 'Teorico'

  const payload = {
    data: {
      nombre,
      video_id,
      tipo,
      proveedor,
      orden,
      ...(numero_capitulo !== undefined && numero_capitulo !== '' && { numero_capitulo: String(numero_capitulo).trim() }),
      ...(seccionValida && { seccion: seccionValida }),
      ...(contenido && { contenido: contenido.trim() }),
      // libro_mira no se envía; se asigna en la pestaña "Asignar a libro"
    },
  }

  const url = getStrapiUrl('api/recursos-mira')
  const headers: HeadersInit = {
    Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    'Content-Type': 'application/json',
  }

  try {
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) })
    const text = await res.text()
    if (!res.ok) {
      let errMsg = text
      try {
        const j = JSON.parse(text) as { error?: { message?: string } }
        errMsg = j.error?.message ?? text
      } catch {
        // usar text
      }
      return NextResponse.json({ error: errMsg || res.statusText }, { status: res.status })
    }
    const data = text ? JSON.parse(text) : {}
    return NextResponse.json({ success: true, data })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error al crear recurso en Strapi'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
