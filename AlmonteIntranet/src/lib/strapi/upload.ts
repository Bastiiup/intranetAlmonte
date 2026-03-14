import { getStrapiUrl, STRAPI_API_TOKEN, STRAPI_API_URL } from '@/lib/strapi/config'

/**
 * Nomenclatura estricta para Excels de licencias (generador e importador).
 * [NombreLibro_o_ISBN]_[Cantidad]Licencias_[DD-MM-YYYY_HH-mm].xlsx
 */
export function buildLicenciasExcelFilename(
  nombreLibroOIsbn: string,
  cantidad: number
): string {
  const sanitized = (nombreLibroOIsbn || 'Licencias')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_\-]/g, '')
    .slice(0, 80)
  const now = new Date()
  const dd = String(now.getDate()).padStart(2, '0')
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yyyy = now.getFullYear()
  const hh = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  return `${sanitized}_${cantidad}Licencias_${dd}-${mm}-${yyyy}_${hh}-${min}.xlsx`
}

/**
 * Sube un buffer Excel a la Media Library de Strapi (POST /api/upload).
 * Devuelve la URL pública del archivo (absoluta).
 */
export async function uploadExcelToStrapi(
  buffer: Buffer,
  filename: string
): Promise<{ url: string; id?: number }> {
  const uploadUrl = getStrapiUrl('/api/upload')
  const form = new FormData()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  form.append('files', blob, filename)

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      // No setear Content-Type; fetch asigna multipart/form-data con boundary
    },
    body: form,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Strapi upload failed: ${res.status} ${text}`)
  }

  const data = await res.json()
  const raw = Array.isArray(data) ? data[0] : data?.data ?? data
  const url = raw?.url ?? raw?.attributes?.url
  if (!url || typeof url !== 'string') throw new Error('Strapi upload: no url in response')

  const absoluteUrl = url.startsWith('http') ? url : `${STRAPI_API_URL.replace(/\/$/, '')}${url.startsWith('/') ? '' : '/'}${url}`
  return { url: absoluteUrl, id: raw?.id ?? raw?.documentId }
}
