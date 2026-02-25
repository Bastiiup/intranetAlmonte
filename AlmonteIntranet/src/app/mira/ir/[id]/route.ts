import { NextResponse } from 'next/server'
import { getTrampolin, incrementVisitas } from '@/lib/mira-trampolin-store'

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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const entry = await getTrampolin(id)
    if (entry) await incrementVisitas(id)
    const url = entry?.urlDestino?.trim() || 'about:blank'
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
