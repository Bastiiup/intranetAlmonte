import { NextResponse } from 'next/server'
import { listTrampolines } from '@/lib/mira-trampolin-store'

export const dynamic = 'force-dynamic'

function escapeUrlForHtml(url: string): string {
  return url
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildRedirectHtml(urlDestino: string): string {
  const safe = escapeUrlForHtml(urlDestino)
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta id="url-destino" content="${safe}">
  <title>Redirigiendo...</title>
  <script>location.replace(document.getElementById('url-destino').getAttribute('content'));</script>
</head>
<body>
  <p>Redirigiendo...</p>
</body>
</html>
`
}

/** /mira/ir sin id: usa el primer trampolín (compatibilidad con un solo QR). */
export async function GET() {
  try {
    const list = await listTrampolines()
    const first = list[0]
    const url = first?.urlDestino?.trim() || 'about:blank'
    const html = buildRedirectHtml(url)
    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch {
    const html = buildRedirectHtml('about:blank')
    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
}
