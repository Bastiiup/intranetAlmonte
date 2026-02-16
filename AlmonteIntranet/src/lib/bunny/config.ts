/**
 * Configuración de Bunny.net Stream (solo servidor).
 * Las claves no deben exponerse al cliente; usar rutas API como proxy.
 */

const BUNNY_LIBRARY_ID = process.env.BUNNY_LIBRARY_ID || process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID || ''
const BUNNY_API_KEY = process.env.BUNNY_API_KEY || ''

export const getBunnyLibraryId = (): string => BUNNY_LIBRARY_ID
export const getBunnyApiKey = (): string => BUNNY_API_KEY

export const BUNNY_VIDEO_BASE = 'https://video.bunnycdn.com'

export function getBunnyVideosUrl(path = '', searchParams?: URLSearchParams): string {
  const base = `${BUNNY_VIDEO_BASE}/library/${getBunnyLibraryId()}/videos`
  const url = path ? `${base}/${path}` : base
  if (searchParams?.toString()) return `${url}?${searchParams.toString()}`
  return url
}
