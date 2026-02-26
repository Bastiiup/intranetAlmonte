/**
 * Cliente para la API de Trampolín QR (Bana/mor.cl).
 * Todas las operaciones se hacen directo en Bana; la intranet no persiste nada.
 */

const getBaseUrl = (): string => {
  const url = process.env.TRAMPOLIN_QR_API_URL?.replace(/\/$/, '')
  if (!url) throw new Error('TRAMPOLIN_QR_API_URL no configurada')
  return url
}

export type RedirectBana = {
  id: string
  campaña: string
  slug: string
  destino: string
  descripcion: string | null
}

/** Formato que usa la UI de la intranet (compatible con trampolin) */
export type RedirectForUI = {
  id: string
  campaña: string
  slug: string
  urlDestino: string
  nombre: string
  descripcion: string
  visitas: number
}

function mapFromBana(r: RedirectBana): RedirectForUI {
  return {
    id: r.id,
    campaña: r.campaña,
    slug: r.slug,
    urlDestino: r.destino,
    nombre: r.slug,
    descripcion: r.descripcion ?? '',
    visitas: 0,
  }
}

export async function listRedirectsBana(): Promise<RedirectForUI[]> {
  const base = getBaseUrl()
  const res = await fetch(`${base}/api/redirects`)
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText))
  const data = (await res.json()) as RedirectBana[]
  return data.map(mapFromBana)
}

export async function createRedirectBana(payload: {
  campaña: string
  slug: string
  destino: string
  descripcion?: string | null
}): Promise<RedirectForUI> {
  const base = getBaseUrl()
  const res = await fetch(`${base}/api/redirects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      campaña: payload.campaña.trim(),
      slug: payload.slug.trim().replace(/[^a-zA-Z0-9_-]/g, ''),
      destino: payload.destino.trim(),
      descripcion: payload.descripcion?.trim() ?? null,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err.detail ?? err.error ?? res.statusText) as string)
  }
  const data = (await res.json()) as RedirectBana
  return mapFromBana(data)
}

export async function getRedirectBana(id: string): Promise<RedirectBana | null> {
  const base = getBaseUrl()
  const res = await fetch(`${base}/api/redirects/${encodeURIComponent(id)}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText))
  return (await res.json()) as RedirectBana
}

export async function updateRedirectBana(
  id: string,
  payload: { destino: string; descripcion?: string | null }
): Promise<RedirectForUI> {
  const base = getBaseUrl()
  const existing = await getRedirectBana(id)
  if (!existing) throw new Error('No encontrado')
  const res = await fetch(`${base}/api/redirects/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      campaña: existing.campaña,
      slug: existing.slug,
      destino: payload.destino.trim(),
      descripcion: payload.descripcion?.trim() ?? null,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err.detail ?? err.error ?? res.statusText) as string)
  }
  const data = (await res.json()) as RedirectBana
  return mapFromBana(data)
}

export async function deleteRedirectBana(id: string): Promise<void> {
  const base = getBaseUrl()
  const res = await fetch(`${base}/api/redirects/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (res.status === 404) return
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText))
}
