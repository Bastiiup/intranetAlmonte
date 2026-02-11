/**
 * POST /api/crm/listas/descargar-asignar-pdf
 * Descarga un PDF desde una URL, crea o encuentra el curso por nombre, y asigna el PDF.
 * Usa la misma lógica que Carga Masiva PDFs por Colegio.
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120

const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || process.env.STRAPI_URL || 'https://strapi.moraleja.cl'

/**
 * Normaliza el nombre del curso tal como viene del PDF/página y le agrega el año del formulario.
 * Ej: "1º Básicos" → "1° Básico - 2026", "Playgroup 2026" → "Playgroup - 2026", "I° Medio 2026" → "I° Medio - 2026"
 */
function buildNombreCursoFromLabel(label: string, año: number): string {
  let s = label.replace(/\s+/g, ' ').trim()
  // Quitar año al final si ya viene (2026, 2027, etc.) para no duplicar
  s = s.replace(/\s*\d{4}\s*$/, '').trim()
  // Normalizar símbolo de grado: º → °
  s = s.replace(/º/g, '°')
  // Normalizar plurales comunes en listas: Básicos → Básico, Medios → Medio
  s = s.replace(/\bBásicos\b/gi, 'Básico').replace(/\bMedios\b/gi, 'Medio')
  if (!s) s = 'Curso'
  return `${s} - ${año}`
}

function parseLabelToCurso(label: string, año: number): { nombre_curso: string; nivel: string; grado: number } {
  const s = label.replace(/\s+/g, ' ').trim()
  const numerosRomanos: Record<string, number> = {
    i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10,
  }
  let nivel = 'Basica'
  let grado = 0

  // nombre_curso siempre: mismo texto que indica el PDF + " - " + año
  const nombre_curso = buildNombreCursoFromLabel(label, año)

  if (/\bplaygroup\b/i.test(s)) return { nombre_curso, nivel: 'Basica', grado: 0 }
  if (/\bprekinder\b/i.test(s)) return { nombre_curso, nivel: 'Basica', grado: 0 }
  if (/\bkinder\b/i.test(s)) return { nombre_curso, nivel: 'Basica', grado: 0 }

  const romano = s.match(/\b([ivxlcdm]+)\s*[º°]?\s*medio\b/i)
  if (romano && numerosRomanos[romano[1].toLowerCase()]) {
    grado = numerosRomanos[romano[1].toLowerCase()]
    nivel = 'Media'
    return { nombre_curso, nivel, grado }
  }

  const numBasico = s.match(/(\d+)\s*[º°]?\s*b[aá]sico/i)
  if (numBasico) {
    grado = parseInt(numBasico[1], 10)
    nivel = 'Basica'
    return { nombre_curso, nivel, grado }
  }

  const numMedio = s.match(/(\d+)\s*[º°]?\s*medio/i)
  if (numMedio) {
    grado = parseInt(numMedio[1], 10)
    nivel = 'Media'
    return { nombre_curso, nivel, grado }
  }

  const numSolo = s.match(/(\d+)/)
  if (numSolo) {
    grado = parseInt(numSolo[1], 10)
    if (grado >= 1 && grado <= 12) {
      nivel = grado <= 8 ? 'Basica' : 'Media'
      return { nombre_curso, nivel, grado }
    }
  }

  return { nombre_curso, nivel, grado: 1 }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pdfUrl, colegioId, año, label } = body

    if (!pdfUrl || typeof pdfUrl !== 'string') {
      return NextResponse.json({ success: false, error: 'pdfUrl es requerido' }, { status: 400 })
    }
    if (!colegioId) {
      return NextResponse.json({ success: false, error: 'colegioId es requerido' }, { status: 400 })
    }
    const añoNum = año != null ? Number(año) : new Date().getFullYear()
    const labelStr = (label || 'Curso').trim()

    // 1) Descargar PDF
    const pdfRes = await fetch(pdfUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ListasUtilesBot/1.0)' },
      signal: AbortSignal.timeout(30000),
    })
    if (!pdfRes.ok) {
      return NextResponse.json(
        { success: false, error: `No se pudo descargar el PDF (${pdfRes.status})` },
        { status: 502 }
      )
    }
    const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer())
    const contentType = pdfRes.headers.get('content-type') || 'application/pdf'
    if (!contentType.toLowerCase().includes('pdf')) {
      return NextResponse.json({ success: false, error: 'La URL no devuelve un PDF' }, { status: 400 })
    }

    const nombreArchivo = (labelStr.replace(/[^\w\s°ºáéíóúñ-]/gi, '_').replace(/\s+/g, '_') || 'lista').substring(0, 80) + '.pdf'

    // 2) Parsear label → nombre_curso, nivel, grado
    const { nombre_curso, nivel, grado } = parseLabelToCurso(labelStr, añoNum)

    // 3) Obtener ID numérico del colegio si es documentId
    let colegioIdNum: number = typeof colegioId === 'number' ? colegioId : parseInt(String(colegioId), 10)
    if (isNaN(colegioIdNum) || String(colegioId).length > 10) {
      const colegioRes = await strapiClient.get<any>(`/api/colegios/${colegioId}?fields=id,documentId&publicationState=preview`)
      const co = Array.isArray(colegioRes.data) ? colegioRes.data[0] : colegioRes.data
      colegioIdNum = co?.id ?? co?.attributes?.id
      if (!colegioIdNum) {
        return NextResponse.json({ success: false, error: 'Colegio no encontrado' }, { status: 404 })
      }
    }

    // 4) Buscar curso existente
    const cursosRes = await strapiClient.get<any>(
      `/api/cursos?filters[colegio][id][$eq]=${colegioIdNum}&filters[anio][$eq]=${añoNum}&pagination[pageSize]=100&publicationState=preview`
    )
    const cursosList = Array.isArray(cursosRes.data) ? cursosRes.data : [cursosRes.data].filter(Boolean)
    const attrs = (c: any) => c?.attributes || c
    let curso = cursosList.find((c: any) => {
      const a = attrs(c)
      return (
        (a?.nombre_curso === nombre_curso || a?.nombre_curso?.includes(nombre_curso)) &&
        String(a?.grado) === String(grado) &&
        (a?.nivel === nivel || a?.nivel === nivel)
      )
    })

    let cursoId: string | number

    if (curso) {
      cursoId = curso.documentId || curso.id
    } else {
      // 5) Crear curso vía Strapi
      const createPayload = {
        data: {
          nombre_curso,
          colegio: { connect: [colegioIdNum] },
          nivel,
          grado: String(grado),
          anio: añoNum,
          activo: true,
        },
      }
      const createRes = await strapiClient.post<StrapiResponse<StrapiEntity<any>>>('/api/cursos', createPayload)
      const cursoCreado = Array.isArray(createRes.data) ? createRes.data[0] : createRes.data
      if (!cursoCreado) {
        return NextResponse.json({ success: false, error: 'Error al crear el curso' }, { status: 500 })
      }
      cursoId = cursoCreado.documentId || cursoCreado.id
    }

    // 6) Subir PDF a Strapi
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' })
    const form = new FormData()
    form.append('files', blob, nombreArchivo)

    const uploadRes = await fetch(`${strapiUrl}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.STRAPI_API_TOKEN || ''}` },
      body: form,
    })

    let pdfId: number | null = null
    let pdfUrlStrapi: string | null = null
    if (uploadRes.ok) {
      const uploadJson = await uploadRes.json()
      const file = Array.isArray(uploadJson) ? uploadJson[0] : uploadJson
      if (file) {
        pdfId = file.id ?? file.documentId
        pdfUrlStrapi = file.url ? `${strapiUrl}${file.url}` : null
      }
    }

    // 7) Obtener curso actual y agregar versión
    const cursoGet = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
      `/api/cursos/${cursoId}?publicationState=preview`
    )
    const cursoData = Array.isArray(cursoGet.data) ? cursoGet.data[0] : cursoGet.data
    const curAttrs = cursoData?.attributes || cursoData || {}
    const versionesExistentes = curAttrs.versiones_materiales || []

    const nuevaVersion = {
      id: versionesExistentes.length + 1,
      nombre_archivo: nombreArchivo,
      fecha_subida: new Date().toISOString(),
      fecha_actualizacion: new Date().toISOString(),
      materiales: [],
      pdf_url: pdfUrlStrapi,
      pdf_id: pdfId,
      metadata: { nombre: nombreArchivo, url_origen: pdfUrl },
    }
    const versionesActualizadas = [...versionesExistentes, nuevaVersion]

    await strapiClient.put(`/api/cursos/${cursoId}`, {
      data: { versiones_materiales: versionesActualizadas },
    })

    return NextResponse.json({
      success: true,
      data: {
        cursoId,
        nombre_curso,
        label: labelStr,
        pdfId,
        versionesCount: versionesActualizadas.length,
      },
    })
  } catch (err: any) {
    console.error('[descargar-asignar-pdf]', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Error al descargar o asignar el PDF' },
      { status: 500 }
    )
  }
}
