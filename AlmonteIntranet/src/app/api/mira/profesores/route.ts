import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

/** Extrae email principal del componente emails de una persona */
function getEmailFromPersona(attrs: any): string {
  const emails = attrs?.emails
  if (Array.isArray(emails)) {
    const principal = emails.find((e: any) => e?.principal === true)
    if (principal?.email) return String(principal.email).trim()
    if (emails[0]?.email) return String(emails[0].email).trim()
  }
  return ''
}

/** Formatea una trayectoria a texto corto: "Colegio X (Curso Y)" */
function formatTrayectoria(t: any): string {
  const attrs = t?.attributes ?? t
  const colegio = attrs?.colegio?.data?.attributes ?? attrs?.colegio?.data ?? attrs?.colegio ?? null
  const curso = attrs?.curso?.data?.attributes ?? attrs?.curso?.data ?? attrs?.curso ?? null
  const nombreColegio = colegio?.colegio_nombre ?? 'Sin colegio'
  const nombreCurso = curso?.nombre_curso ?? ([curso?.nivel, curso?.grado, curso?.letra].filter(Boolean).join(' ') || '—')
  return `${nombreColegio} (${nombreCurso})`
}

/** Construye resumen de carga académica desde trayectorias: por colegio agrupa cursos o lista "Colegio (N cursos)" */
function buildCargaAcademica(trayectoriasRaw: any[]): { summary: string; items: string[] } {
  const list = Array.isArray(trayectoriasRaw) ? trayectoriasRaw : []
  if (list.length === 0) return { summary: 'Sin asignar', items: [] }

  const items = list.map(formatTrayectoria).filter(Boolean)
  const byColegio = new Map<string, string[]>()
  for (const item of items) {
    const match = item.match(/^(.+?)\s*\((.+)\)$/)
    const colegio = match ? match[1].trim() : item
    const curso = match ? match[2].trim() : ''
    if (!byColegio.has(colegio)) byColegio.set(colegio, [])
    if (curso) byColegio.get(colegio)!.push(curso)
  }
  const parts: string[] = []
  byColegio.forEach((cursos, colegio) => {
    const unicos = [...new Set(cursos)]
    if (unicos.length === 1) {
      parts.push(`${colegio} (${unicos[0]})`)
    } else {
      parts.push(`${colegio} (${unicos.length} cursos)`)
    }
  })
  const summary = parts.join(' / ')
  return { summary, items }
}

/**
 * GET /api/mira/profesores
 * Lista profesores (personas). Soporta filtro por estado de verificación.
 * - status=Por Verificar: personas con status_nombres 'Por Verificar' (pendientes de aprobación).
 * - status=Aprobado: personas con status_nombres 'Aprobado'.
 * - Sin status: personas con usuario_login (comportamiento legacy); incluye status_nombres en respuesta.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') || '1'
    const pageSize = searchParams.get('pageSize') || '100'
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || '' // 'Por Verificar' | 'Aprobado'

    const params = new URLSearchParams({
      'pagination[page]': page,
      'pagination[pageSize]': pageSize,
      'sort[0]': 'createdAt:desc',
    })

    if (status) {
      params.set('filters[status_nombres][$eq]', status)
      params.set('populate[0]', 'emails')
      if (status === 'Aprobado') {
        params.set('populate[1]', 'trayectorias')
        params.set('populate[trayectorias][populate][0]', 'colegio')
        params.set('populate[trayectorias][populate][1]', 'curso')
        params.set('populate[trayectorias][populate][colegio][fields][0]', 'colegio_nombre')
        params.set('populate[trayectorias][populate][curso][fields][0]', 'nombre_curso')
        params.set('populate[trayectorias][populate][curso][fields][1]', 'nivel')
        params.set('populate[trayectorias][populate][curso][fields][2]', 'grado')
        params.set('populate[trayectorias][populate][curso][fields][3]', 'letra')
      }
    } else {
      params.set('populate[usuario_login][fields][0]', 'email')
      params.set('populate[usuario_login][fields][1]', 'username')
      params.set('populate[usuario_login][fields][2]', 'confirmed')
      params.set('populate[usuario_login][fields][3]', 'blocked')
      params.set('filters[usuario_login][id][$notNull]', 'true')
      params.set('sort[0]', 'nombre_completo:asc')
    }

    if (search) {
      params.set('filters[$or][0][nombre_completo][$containsi]', search)
      params.set('filters[$or][1][rut][$containsi]', search)
      params.set('filters[$or][2][nombres][$containsi]', search)
      params.set('filters[$or][3][primer_apellido][$containsi]', search)
    }

    const response = await strapiClient.get<any>(`/api/personas?${params.toString()}`)

    const personas = Array.isArray(response.data) ? response.data : response.data ? [response.data] : []
    const meta = response.meta || { pagination: { page: 1, pageSize: 25, pageCount: 1, total: personas.length } }

    const profesores = personas.map((p: any) => {
      const attrs = p.attributes || p
      const usuario = attrs.usuario_login?.data?.attributes || attrs.usuario_login?.data || attrs.usuario_login || null
      const emailFromUser = usuario?.email || ''
      const emailFromEmails = getEmailFromPersona(attrs)
      const email = emailFromUser || emailFromEmails || ''
      const trayectoriasData = attrs.trayectorias?.data ?? attrs.trayectorias ?? []
      const trayectoriasList = Array.isArray(trayectoriasData) ? trayectoriasData : []
      const { summary: carga_academica, items: carga_items } = buildCargaAcademica(trayectoriasList)
      return {
        id: p.id,
        documentId: p.documentId,
        nombres: attrs.nombres || '',
        primer_apellido: attrs.primer_apellido || '',
        segundo_apellido: attrs.segundo_apellido || '',
        nombre_completo: attrs.nombre_completo || `${attrs.nombres || ''} ${attrs.primer_apellido || ''}`.trim(),
        rut: attrs.rut || '',
        activo: attrs.activo !== false,
        email,
        username: usuario?.username || '',
        confirmed: usuario?.confirmed ?? false,
        blocked: usuario?.blocked ?? false,
        usuarioId: usuario?.id || attrs.usuario_login?.id || null,
        status_nombres: attrs.status_nombres ?? null,
        createdAt: attrs.createdAt ?? null,
        carga_academica,
        carga_items,
      }
    })

    return NextResponse.json({
      success: true,
      data: profesores,
      meta,
    })
  } catch (error: any) {
    console.error('[API /mira/profesores GET] Error:', error.message)
    return NextResponse.json(
      { success: false, error: error.message || 'Error al obtener profesores' },
      { status: error.status || 500 }
    )
  }
}
