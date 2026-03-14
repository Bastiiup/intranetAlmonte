import { NextRequest, NextResponse } from 'next/server'
import { getStrapiUrl, STRAPI_API_TOKEN } from '@/lib/strapi/config'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const BATCH_SIZE = 50
// Alfabeto restringido: sin 0 ni O para evitar confusiones visuales
const CHARS = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789'

function randomSegment(length: number): string {
  let s = ''
  for (let i = 0; i < length; i++) {
    s += CHARS[Math.floor(Math.random() * CHARS.length)]
  }
  return s
}

/** Formato: 16 caracteres en 4 bloques de 4 separados por espacio. [PREFIJO] [4] [4] [4] o [4] [4] [4] [4] */
function generarCodigoUnico(prefijo4: string | null, existentes: Set<string>): string {
  let codigo: string
  do {
    if (prefijo4 && prefijo4.length === 4) {
      codigo = `${prefijo4} ${randomSegment(4)} ${randomSegment(4)} ${randomSegment(4)}`
    } else {
      codigo = `${randomSegment(4)} ${randomSegment(4)} ${randomSegment(4)} ${randomSegment(4)}`
    }
  } while (existentes.has(codigo))
  existentes.add(codigo)
  return codigo
}

/** Normaliza prefijo: solo caracteres permitados, exactamente 4 caracteres. */
function normalizarPrefijo(prefijo: string): string | null {
  const cleaned = prefijo
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .split('')
    .filter((c) => CHARS.includes(c))
    .join('')
  if (cleaned.length !== 4) return null
  return cleaned
}

/** Verifica en Strapi qué códigos ya existen; devuelve Set de códigos existentes. */
async function codigosExistentesEnStrapi(codigos: string[]): Promise<Set<string>> {
  if (codigos.length === 0) return new Set()
  const baseUrl = getStrapiUrl('/api/licencias-estudiantes')
  const existentes = new Set<string>()
  // Strapi $in: filters[codigo_activacion][$in][0]=...&[1]=...
  const params = new URLSearchParams()
  codigos.forEach((c, i) => {
    params.set(`filters[codigo_activacion][$in][${i}]`, c)
  })
  params.set('pagination[pageSize]', String(codigos.length))
  params.set('fields[0]', 'codigo_activacion')
  const url = `${baseUrl}?${params.toString()}`
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) return existentes
  const json = await res.json().catch(() => ({}))
  const data = json.data ?? json
  const list = Array.isArray(data) ? data : []
  list.forEach((item: any) => {
    const code = item?.attributes?.codigo_activacion ?? item?.codigo_activacion
    if (typeof code === 'string') existentes.add(code)
  })
  return existentes
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const libroMiraId = body.libroMiraId ?? body.libro_mira_id
    const cantidad = typeof body.cantidad === 'number' ? body.cantidad : parseInt(String(body.cantidad || 0), 10)
    const prefijoRaw = typeof body.prefijo === 'string' ? body.prefijo.trim() : ''

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
    // Prefijo: vacío o exactamente 4 caracteres del alfabeto restringido
    const prefijo4 = prefijoRaw ? normalizarPrefijo(prefijoRaw) : null
    if (prefijoRaw && !prefijo4) {
      return NextResponse.json(
        { success: false, error: 'El prefijo debe tener exactamente 4 caracteres (A-Z sin O, 1-9 sin 0)' },
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
      codigos.push(generarCodigoUnico(prefijo4, codigosUnicos))
    }

    const licenciasUrl = getStrapiUrl('/api/licencias-estudiantes')
    let creadas = 0
    let errores = 0

    for (let i = 0; i < codigos.length; i += BATCH_SIZE) {
      let batch = codigos.slice(i, i + BATCH_SIZE)
      const maxIntentos = 10
      let intento = 0
      while (intento < maxIntentos) {
        const existentes = await codigosExistentesEnStrapi(batch)
        if (existentes.size === 0) break
        // Reemplazar los que colisionan por códigos nuevos
        batch = batch.map((c) => {
          if (existentes.has(c)) return generarCodigoUnico(prefijo4, codigosUnicos)
          return c
        })
        intento++
      }
      // Sincronizar codigos con el batch final (para el Excel)
      for (let k = 0; k < batch.length; k++) codigos[i + k] = batch[k]

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
