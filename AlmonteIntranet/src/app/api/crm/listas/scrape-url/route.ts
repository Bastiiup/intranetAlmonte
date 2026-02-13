/**
 * GET /api/crm/listas/scrape-url?url=...
 * Escrapea una URL y devuelve enlaces a PDFs (o Drive) asociados a nombres de curso.
 * Soporta: páginas con enlaces .pdf (incluso dentro de <a><img/></a>), Google Drive, más tiempo de espera.
 */

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

interface ScrapedLink {
  label: string
  href: string
  courseName?: string
}

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

function resolveUrl(base: string, href: string): string {
  if (href.startsWith('http://') || href.startsWith('https://')) return href
  try {
    return new URL(href, base).toString()
  } catch {
    return href
  }
}

/** Intenta derivar nombre de curso desde el nombre del archivo (ej. lista-1-basico.pdf → 1° Básico) */
function labelFromFilename(filename: string): string {
  if (!filename) return ''
  const sinExtension = filename.replace(/\.pdf$/i, '').replace(/\?.*$/, '')
  const lower = sinExtension.toLowerCase()
  if (/prekinder\s*[-]?\s*kinder|prekinder-kinder/i.test(sinExtension)) return 'Prekinder - Kinder'
  const pre = /prekinder|pre-kinder/i.exec(sinExtension)
  if (pre) return 'Prekinder'
  if (/\bkinder\b/i.test(sinExtension)) return 'Kinder'
  const basico = /(\d+)[°º_\-\s]*(?:basico|básico)s?/i.exec(sinExtension)
  if (basico) return `${basico[1]}° Básico`
  const medio = /(\d+)[°º_\-\s]*medio/i.exec(sinExtension)
  if (medio) return `${medio[1]}° Medio`
  const romano = /([ivxlcdm]+)[_\-\s]*medio/i.exec(lower)
  if (romano) {
    const r: Record<string, string> = { i: 'I', ii: 'II', iii: 'III', iv: 'IV' }
    return `${r[romano[1]] || romano[1].toUpperCase()}° Medio`
  }
  return sinExtension.replace(/[_-]+/g, ' ').trim() || ''
}

/** Clave de orden: Prekinder/Kinder=0, 1°-8° Básico=1..8, 1°-4° Medio=9..12, resto=100+index */
function getSortKey(href: string, index: number): number {
  const filename = href.split('/').pop()?.replace(/\?.*$/, '').toLowerCase() || ''
  const sinExt = filename.replace(/\.pdf$/i, '')
  if (/prekinder|kinder/.test(sinExt) && !/\d+.*medio/.test(sinExt)) return 0
  const basico = /(\d+)[°º_\-\s]*(?:basico|básico)/i.exec(sinExt)
  if (basico) {
    const n = parseInt(basico[1], 10)
    if (n >= 1 && n <= 8) return n
  }
  const medio = /(\d+)[°º_\-\s]*medio/i.exec(sinExt)
  if (medio) {
    const n = parseInt(medio[1], 10)
    if (n >= 1 && n <= 4) return 8 + n
  }
  return 100 + index
}

/** Indica si el href es un PDF o un enlace descargable (Drive, etc.) */
function isPdfOrDownloadLink(href: string): boolean {
  const h = href.toLowerCase().trim()
  if (h.endsWith('.pdf')) return true
  if (h.includes('.pdf') || h.includes('.pdf?') || h.includes('.pdf#')) return true
  if (h.includes('drive.google.com/file') || h.includes('drive.google.com/open')) return true
  if (h.includes('docs.google.com/document') || h.includes('docs.google.com/spreadsheets')) return true
  if (h.includes('export=download') || h.includes('uc?export=download')) return true
  if (h.includes('/file/d/') || h.includes('/open?id=')) return true
  if (/\/[^/]*pdf[^/]*$/i.test(h) || h.includes('/pdf/')) return true
  return false
}

/** Extrae etiqueta de curso desde un fragmento de HTML (busca texto que parezca nombre de curso) */
function findLabelInContext(htmlFragment: string): string | null {
  const maxLen = 800
  const fragment = htmlFragment.slice(-maxLen)
  const stripHtml = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const courseLike = /(?:Prekinder\s*[-–]?\s*Kinder|Prekinder|Kinder|Playgroup|\d+[º°]?\s*b[aá]sico[s]?|\d+[º°]?\s*medio[s]?|Enseñanza\s+Media|I{1,3}V?\s*[º°]?\s*medio)/i
  const textBlocks: string[] = []
  const blockRegex = />([^<]{2,120})</g
  let block: RegExpExecArray | null
  while ((block = blockRegex.exec(fragment)) !== null) {
    const t = stripHtml(block[1])
    if (t.length >= 2 && t.length <= 80 && courseLike.test(t)) textBlocks.push(t)
  }
  if (textBlocks.length > 0) return textBlocks[textBlocks.length - 1]
  const generic = />([^<]{3,70})</g
  const genericBlocks: string[] = []
  while ((block = generic.exec(fragment)) !== null) {
    const t = stripHtml(block[1])
    if (t.length >= 3 && !/^[\d\s\-\.\/]+$/.test(t) && !t.startsWith('http') && !/^https?:/i.test(t)) genericBlocks.push(t)
  }
  if (genericBlocks.length > 0) return genericBlocks[genericBlocks.length - 1]
  return null
}

/** Obtiene enlaces desde HTML de una página normal */
function scrapePdfLinksFromHtml(html: string, baseUrl: string): ScrapedLink[] {
  const results: ScrapedLink[] = []
  const seen = new Set<string>()

  const linkRegex = /<a\s[^>]*?href\s*=\s*["']([^"']+)["'][^>]*>/gi
  let match: RegExpExecArray | null
  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1].trim()
    if (!isPdfOrDownloadLink(href)) continue
    const fullHref = resolveUrl(baseUrl, href)
    if (!fullHref.startsWith('http')) continue
    if (seen.has(fullHref)) continue
    seen.add(fullHref)
    let label: string
    if (isDriveOrCloudUrl(fullHref)) {
      const tagEnd = match.index + match[0].length
      const closeA = html.indexOf('</a>', tagEnd)
      const innerHtml = closeA !== -1 ? html.slice(tagEnd, closeA) : ''
      const labelFromPage = stripHtmlToText(innerHtml)
      label =
        labelFromPage && !isGenericLinkText(labelFromPage)
          ? labelFromPage
          : `Archivo ${results.length + 1}`
    } else {
      const preceding = html.substring(Math.max(0, match.index - 800), match.index)
      const filename = fullHref.split('/').pop()?.replace(/\?.*$/, '') || ''
      label = labelFromFilename(filename) || findLabelInContext(preceding) || filename || 'PDF'
    }
    results.push({
      label: label.trim(),
      href: fullHref,
      courseName: label.trim(),
    })
  }

  return results
}

/** Resuelve enlace de Google Drive a descarga directa cuando sea posible */
function resolveGoogleDriveUrl(sharedUrl: string): string {
  const idMatch = sharedUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || sharedUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (idMatch) {
    return `https://drive.google.com/uc?export=download&id=${idMatch[1]}`
  }
  return sharedUrl
}

/** Detecta si la URL es de Google Drive (archivo o carpeta) */
function isGoogleDriveUrl(url: string): boolean {
  return /drive\.google\.com/i.test(url) || /docs\.google\.com/i.test(url)
}

/** Detecta si el enlace es de Drive u otra nube (no usar nombre de archivo de la URL; usar "Archivo N") */
function isDriveOrCloudUrl(href: string): boolean {
  const h = href.toLowerCase()
  return /drive\.google\.com|docs\.google\.com|dropbox\.com|onedrive\.|sharepoint\.|icloud\.com/i.test(h)
}

/** Extrae el texto visible de un fragmento HTML (quita etiquetas, normaliza espacios) */
function stripHtmlToText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .trim()
}

/** Indica si el texto del enlace es genérico y no sirve como etiqueta (view, ver, etc.) */
function isGenericLinkText(text: string): boolean {
  const t = text.toLowerCase().trim()
  return !t || t === 'view' || t === 'ver' || t === 'ver documento' || t === 'see' || t === 'abrir' || t.length < 2
}

/** Escrapea una página de Google Drive: extrae nombres de la página y los asocia a cada URL de Drive */
async function scrapeGoogleDrivePage(pageUrl: string): Promise<ScrapedLink[]> {
  const res = await fetch(pageUrl, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(20000),
    redirect: 'follow',
  })
  if (!res.ok) return []
  const html = await res.text()
  const results: ScrapedLink[] = []
  const seen = new Set<string>()

  // Buscar cada <a href="...drive.../file/d/ID/..."> ... </a> y usar el texto del enlace como etiqueta
  const driveLinkRegex = /<a\s[^>]*?href\s*=\s*["'](https?:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)\/[^"']*)["'][^>]*>/gi
  let match: RegExpExecArray | null
  while ((match = driveLinkRegex.exec(html)) !== null) {
    const fileId = match[2]
    const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`
    if (seen.has(directUrl)) continue
    seen.add(directUrl)

    const tagEnd = match.index + match[0].length
    const closeA = html.indexOf('</a>', tagEnd)
    const innerHtml = closeA !== -1 ? html.slice(tagEnd, closeA) : ''
    const labelFromPage = stripHtmlToText(innerHtml)
    const label =
      labelFromPage && !isGenericLinkText(labelFromPage)
        ? labelFromPage
        : `Archivo ${results.length + 1}`

    results.push({ label, href: directUrl, courseName: label })
  }

  // Si no encontramos enlaces con etiquetas (p. ej. página con solo IDs), buscar solo IDs y usar "Archivo N"
  if (results.length === 0) {
    const driveFileRegex = /(?:drive\.google\.com\/file\/d\/|drive\.google\.com\/open\?id=)([a-zA-Z0-9_-]+)/gi
    let m: RegExpExecArray | null
    let idx = 0
    while ((m = driveFileRegex.exec(html)) !== null) {
      const fileId = m[1]
      const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`
      if (seen.has(directUrl)) continue
      seen.add(directUrl)
      idx++
      results.push({
        label: `Archivo ${idx}`,
        href: directUrl,
        courseName: `Archivo ${idx}`,
      })
    }
  }

  if (results.length === 0) {
    const pdfInHtml = html.match(/href\s*=\s*["']([^"']*\.pdf[^"']*)["']/gi)
    if (pdfInHtml) {
      let fallbackIdx = 0
      for (const tag of pdfInHtml) {
        const hrefMatch = tag.match(/href\s*=\s*["']([^"']+)["']/i)
        const href = hrefMatch ? hrefMatch[1].trim() : ''
        if (href && !seen.has(href)) {
          seen.add(href)
          fallbackIdx++
          const resolved = resolveUrl(pageUrl, href)
          const label = isDriveOrCloudUrl(resolved) ? `Archivo ${fallbackIdx}` : (href.split('/').pop() || 'PDF')
          results.push({
            label,
            href: resolved,
            courseName: label,
          })
        }
      }
    }
  }

  return results
}

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url')
    if (!url || !url.startsWith('http')) {
      return NextResponse.json(
        { success: false, error: 'URL inválida o no proporcionada' },
        { status: 400 }
      )
    }

    const isDrive = isGoogleDriveUrl(url)

    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(isDrive ? 25000 : 20000),
      redirect: 'follow',
    })

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: `No se pudo cargar la página (${res.status})` },
        { status: 502 }
      )
    }

    const html = await res.text()
    const baseUrl = new URL(url).origin + new URL(url).pathname.replace(/\/[^/]*$/, '/')

    let results: ScrapedLink[] = []

    if (isDrive) {
      results = await scrapeGoogleDrivePage(url)
      if (results.length === 0) {
        const idMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
        if (idMatch) {
          const directUrl = resolveGoogleDriveUrl(url)
          results = [{ label: 'Archivo', href: directUrl, courseName: 'Archivo' }]
        }
      }
    }

    if (results.length === 0) {
      results = scrapePdfLinksFromHtml(html, baseUrl)
    }

    if (results.length === 0) {
      const anyPdfHref = /href\s*=\s*["']([^"']*\.pdf[^"']*)["']/gi
      let m: RegExpExecArray | null
      const fallback: ScrapedLink[] = []
      while ((m = anyPdfHref.exec(html)) !== null) {
        const fullHref = resolveUrl(baseUrl, m[1].trim())
        if (fullHref.startsWith('http')) {
          let label: string
          if (isDriveOrCloudUrl(fullHref)) {
            label = `Archivo ${fallback.length + 1}`
          } else {
            const filename = m[1].split('/').pop()?.replace(/\?.*$/, '') || ''
            const preceding = html.substring(Math.max(0, m.index - 500), m.index)
            label = labelFromFilename(filename) || findLabelInContext(preceding) || 'PDF'
          }
          fallback.push({ label: label.trim(), href: fullHref, courseName: label.trim() })
        }
      }
      if (fallback.length > 0) results = fallback
    }

    for (const r of results) {
      if (r.label === 'PDF' || r.label.length < 2) {
        const fromUrl = labelFromFilename(r.href.split('/').pop() || '')
        if (fromUrl) r.label = fromUrl
        r.courseName = r.label
      }
    }

    results = results
      .map((r, i) => ({ r, key: getSortKey(r.href, i) }))
      .sort((a, b) => a.key - b.key)
      .map((x) => x.r)

    return NextResponse.json({
      success: true,
      data: results,
      count: results.length,
    })
  } catch (err: any) {
    console.error('[scrape-url] Error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Error al escrapear la URL' },
      { status: 500 }
    )
  }
}
