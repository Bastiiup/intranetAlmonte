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

/** Formatea una trayectoria a texto corto para badge: "Asignatura - Curso" o "Colegio (Curso)" */
function formatTrayectoria(t: any): string {
  const attrs = t?.attributes ?? t
  const colegio = attrs?.colegio?.data?.attributes ?? attrs?.colegio?.data ?? attrs?.colegio ?? null
  const curso = attrs?.curso?.data?.attributes ?? attrs?.curso?.data ?? attrs?.curso ?? null
  const asignatura = attrs?.asignatura?.data?.attributes ?? attrs?.asignatura?.data ?? attrs?.asignatura ?? null
  const nombreAsig = asignatura?.nombre?.trim() || ''
  const nombreCurso = curso?.nombre_curso?.trim() || [curso?.nivel, curso?.grado, curso?.letra].filter(Boolean).join(' ').trim() || '—'
  if (nombreAsig) return `${nombreAsig} — ${nombreCurso}`
  const nombreColegio = colegio?.colegio_nombre ?? 'Sin colegio'
  return `${nombreColegio} (${nombreCurso})`
}

/** Construye resumen de carga académica desde trayectorias; items son badges tipo "Asignatura — Curso" o "Colegio (Curso)" */
function buildCargaAcademica(trayectoriasRaw: any[]): { summary: string; items: string[] } {
  const list = Array.isArray(trayectoriasRaw) ? trayectoriasRaw : []
  if (list.length === 0) return { summary: 'Sin asignar', items: [] }

  const items = list.map(formatTrayectoria).filter(Boolean)
  const byColegio = new Map<string, string[]>()
  for (const item of items) {
    const match = item.match(/^(.+?)\s*[(\u2014—–-]\s*(.+)$/) || item.match(/^(.+?)\s*\((.+)\)$/)
    const colegio = match ? match[1].trim() : item
    const resto = match ? match[2].trim() : ''
    if (!byColegio.has(colegio)) byColegio.set(colegio, [])
    if (resto) byColegio.get(colegio)!.push(resto)
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
 * - status=Aprobado: personas con status_nombres 'Aprobado' o 'Verificado' (activos).
 * - Sin status: personas con usuario_login (comportamiento legacy); incluye status_nombres en respuesta.
 */
export async function GET(request: NextRequest) {
  const LOG = '[mira/profesores]'
  console.log(`${LOG} 0. GET recibido: ${request.url}`)
  try {
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') || '1'
    const pageSize = searchParams.get('pageSize') || '100'
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || '' // 'Por Verificar' | 'Aprobado'

    console.log(`${LOG} 1. Params recibidos: page=${page}, pageSize=${pageSize}, search="${search}", status="${status}"`)

    const params = new URLSearchParams({
      'pagination[page]': page,
      'pagination[pageSize]': pageSize,
      'sort[0]': 'createdAt:desc',
    })

    if (status) {
      // Profesores activos: Aprobado o Verificado (legacy). Excluir solo estudiantes (tipo_entidad=Estudiante)
      if (status === 'Aprobado') {
        params.set('filters[$or][0][status_nombres][$eq]', 'Aprobado')
        params.set('filters[$or][1][status_nombres][$eq]', 'Verificado')
        console.log(`${LOG} 2. Filtro status: Aprobado o Verificado (profesores activos)`)
      } else {
        params.set('filters[status_nombres][$eq]', status)
        console.log(`${LOG} 2. Filtro status: ${status}`)
      }
      // Solo Pendientes: profesores tienen usuario_login (registro-profesor); estudiantes no (registro-estudiante)
      if (status === 'Por Verificar') {
        params.set('filters[usuario_login][id][$notNull]', 'true')
      }
      params.set('publicationState', 'preview')
      params.set('populate[emails]', 'true')
      params.set('populate[usuario_login]', 'true')
      if (status === 'Aprobado') {
        params.set('populate[trayectorias][populate][colegio]', 'true')
        params.set('populate[trayectorias][populate][curso]', 'true')
        params.set('populate[trayectorias][populate][asignatura]', 'true')
      }
      console.log(`${LOG} 3. Filtros: publicationState=preview, populate emails+usuario_login${status === 'Aprobado' ? '+trayectorias' : ''}`)
    } else {
      params.set('populate[usuario_login][fields][0]', 'email')
      params.set('populate[usuario_login][fields][1]', 'username')
      params.set('populate[usuario_login][fields][2]', 'confirmed')
      params.set('populate[usuario_login][fields][3]', 'blocked')
      params.set('filters[usuario_login][id][$notNull]', 'true')
      params.set('sort[0]', 'nombre_completo:asc')
    }

    if (search) {
      if (status === 'Aprobado') {
        params.delete('filters[$or][0][status_nombres][$eq]')
        params.delete('filters[$or][1][status_nombres][$eq]')
        params.set('filters[$and][0][$or][0][status_nombres][$eq]', 'Aprobado')
        params.set('filters[$and][0][$or][1][status_nombres][$eq]', 'Verificado')
        params.set('filters[$and][1][$or][0][nombre_completo][$containsi]', search)
        params.set('filters[$and][1][$or][1][rut][$containsi]', search)
        params.set('filters[$and][1][$or][2][nombres][$containsi]', search)
        params.set('filters[$and][1][$or][3][primer_apellido][$containsi]', search)
      } else {
        params.set('filters[$or][0][nombre_completo][$containsi]', search)
        params.set('filters[$or][1][rut][$containsi]', search)
        params.set('filters[$or][2][nombres][$containsi]', search)
        params.set('filters[$or][3][primer_apellido][$containsi]', search)
      }
    }

    const url = `/api/personas?${params.toString()}`
    console.log(`${LOG} 4. URL Strapi: ${url}`)
    const response = await strapiClient.get<any>(url)

    const personas = Array.isArray(response.data) ? response.data : response.data ? [response.data] : []
    const meta = response.meta || { pagination: { page: 1, pageSize: 25, pageCount: 1, total: personas.length } }

    console.log(`${LOG} 5. Respuesta Strapi: ${personas.length} personas, meta=`, JSON.stringify(meta))
    personas.forEach((p: any, i: number) => {
      const a = p.attributes || p
      console.log(`${LOG} 5.${i + 1} Persona id=${p.id} docId=${p.documentId} nombre="${a.nombre_completo || a.nombres}" status="${a.status_nombres}" tipo_entidad="${a.tipo_entidad}" usuario_login=${a.usuario_login ? 'Sí' : 'No'}`)
    })

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

    console.log(`${LOG} 6. Devolviendo ${profesores.length} profesores`)
    return NextResponse.json({
      success: true,
      data: profesores,
      meta,
    })
  } catch (error: any) {
    console.error(`${LOG} ERROR:`, error?.message, error?.stack)
    return NextResponse.json(
      { success: false, error: error.message || 'Error al obtener profesores' },
      { status: error.status || 500 }
    )
  }
}
