import { NextRequest, NextResponse } from 'next/server'
import { getStrapiUrl, STRAPI_API_TOKEN } from '@/lib/strapi/config'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const BATCH_SIZE = 50
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

function randomSegment(length: number): string {
  let s = ''
  for (let i = 0; i < length; i++) {
    s += CHARS[Math.floor(Math.random() * CHARS.length)]
  }
  return s
}

function generarCodigoUnico(prefijo: string, existentes: Set<string>): string {
  const pre = prefijo ? `${prefijo.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')}-` : ''
  let codigo: string
  do {
    codigo = `${pre}${randomSegment(4)}-${randomSegment(4)}`
  } while (existentes.has(codigo))
  existentes.add(codigo)
  return codigo
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const libroMiraId = body.libroMiraId ?? body.libro_mira_id
    const cantidad = typeof body.cantidad === 'number' ? body.cantidad : parseInt(String(body.cantidad || 0), 10)
    const prefijo = typeof body.prefijo === 'string' ? body.prefijo : ''

    if (!libroMiraId) {
      return NextResponse.json(
        { success: false, error: 'Falta libroMiraId' },
        { status: 400 }
      )
    }
    if (!Number.isFinite(cantidad) || cantidad < 1 || cantidad > 10000) {
      return NextResponse.json(
        { success: false, error: 'Cantidad debe ser un número entre 1 y 10000' },
        { status: 400 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_MIRA_APP_URL || process.env.MIRA_APP_URL || 'https://app.mira.cl'
    const activarBase = `${baseUrl.replace(/\/$/, '')}/activar`

    // Opcional: obtener nombre del libro para el Excel
    let libroNombre = String(libroMiraId)
    try {
      const libroRes = await fetch(
        `${getStrapiUrl(`/api/libros-mira/${libroMiraId}`)}?fields[0]=id&populate[libro][fields][0]=nombre_libro`,
        {
          headers: {
            Authorization: `Bearer ${STRAPI_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      )
      if (libroRes.ok) {
        const libroJson = await libroRes.json()
        const data = libroJson.data || libroJson
        const attrs = data.attributes ?? data
        const libro = attrs.libro?.data ?? attrs.libro
        const nombre = libro?.attributes?.nombre_libro ?? libro?.nombre_libro
        if (nombre) libroNombre = nombre
      }
    } catch {
      // seguir con ID si falla
    }

    const codigosUnicos = new Set<string>()
    const codigos: string[] = []
    for (let i = 0; i < cantidad; i++) {
      codigos.push(generarCodigoUnico(prefijo, codigosUnicos))
    }

    const licenciasUrl = getStrapiUrl('/api/licencias-estudiantes')
    let creadas = 0
    let errores = 0

    for (let i = 0; i < codigos.length; i += BATCH_SIZE) {
      const batch = codigos.slice(i, i + BATCH_SIZE)
      const promises = batch.map(async (codigo) => {
        try {
          const payload = {
            data: {
              codigo_activacion: codigo,
              libro_mira: libroMiraId,
              activa: true,
            },
          }
          const res = await fetch(licenciasUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${STRAPI_API_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          })
          if (!res.ok) {
            const errText = await res.text()
            console.error('[generar] Error Strapi:', res.status, errText)
            return { ok: false }
          }
          return { ok: true }
        } catch (e) {
          console.error('[generar] Excepción creando licencia:', e)
          return { ok: false }
        }
      })
      const results = await Promise.all(promises)
      results.forEach((r) => (r.ok ? creadas++ : errores++))
    }

    if (creadas === 0) {
      return NextResponse.json(
        { success: false, error: 'No se pudo crear ninguna licencia en Strapi' },
        { status: 500 }
      )
    }

    const rows = codigos.map((codigo) => ({
      Libro_ID: libroNombre,
      Codigo: codigo,
      URL_QR: `${activarBase}?codigo=${encodeURIComponent(codigo)}`,
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, 'Licencias')
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    const filename = `licencias_generadas_${Date.now()}.xlsx`
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al generar licencias'
    console.error('[generar]', message)
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
