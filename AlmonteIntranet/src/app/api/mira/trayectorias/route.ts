import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/mira/trayectorias
 * Lista trayectorias (persona-trayectorias) con persona, colegio y curso poblados.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') || '1'
    const pageSize = searchParams.get('pageSize') || '100'

    const params = new URLSearchParams({
      'pagination[page]': page,
      'pagination[pageSize]': pageSize,
      'sort[0]': 'anio:desc',
      'sort[1]': 'createdAt:desc',
      'populate[persona][fields][0]': 'nombre_completo',
      'populate[persona][fields][1]': 'rut',
      'populate[colegio][fields][0]': 'colegio_nombre',
      'populate[colegio][fields][1]': 'rbd',
      'populate[curso][fields][0]': 'nombre_curso',
      'populate[curso][fields][1]': 'nivel',
      'populate[curso][fields][2]': 'grado',
      'populate[curso][fields][3]': 'letra',
      'publicationState': 'preview',
    })

    const response = await strapiClient.get<any>(`/api/persona-trayectorias?${params.toString()}`)

    const items = Array.isArray(response.data) ? response.data : response.data ? [response.data] : []
    const meta = response.meta || {
      pagination: { page: Number(page), pageSize: Number(pageSize), pageCount: 1, total: items.length },
    }

    const trayectorias = items.map((t: any) => {
      const attrs = t.attributes || t

      const personaRel = attrs.persona?.data ?? attrs.persona ?? null
      const personaAttrs = personaRel?.attributes ?? personaRel ?? {}

      const colegioRel = attrs.colegio?.data ?? attrs.colegio ?? null
      const colegioAttrs = colegioRel?.attributes ?? colegioRel ?? {}

      const cursoRel = attrs.curso?.data ?? attrs.curso ?? null
      const cursoAttrs = cursoRel?.attributes ?? cursoRel ?? {}

      const persona = personaRel
        ? {
            id: personaRel.id,
            documentId: personaRel.documentId ?? String(personaRel.id),
            nombre_completo:
              personaAttrs.nombre_completo ||
              `${personaAttrs.nombres || ''} ${personaAttrs.primer_apellido || ''}`.trim() ||
              'Sin nombre',
            rut: personaAttrs.rut || '',
          }
        : null

      const colegio = colegioRel
        ? {
            id: colegioRel.id,
            documentId: colegioRel.documentId ?? String(colegioRel.id),
            colegio_nombre: colegioAttrs.colegio_nombre || 'Sin colegio',
            rbd: colegioAttrs.rbd || null,
          }
        : null

      const curso = cursoRel
        ? {
            id: cursoRel.id,
            documentId: cursoRel.documentId ?? String(cursoRel.id),
            nombre_curso: cursoAttrs.nombre_curso || '',
            nivel: cursoAttrs.nivel || '',
            grado: cursoAttrs.grado || '',
            letra: cursoAttrs.letra || '',
          }
        : null

      return {
        id: t.id,
        documentId: t.documentId,
        cargo: attrs.cargo || '',
        anio: attrs.anio || null,
        is_current: attrs.is_current ?? false,
        persona,
        colegio,
        curso,
      }
    })

    return NextResponse.json({ success: true, data: trayectorias, meta })
  } catch (error: any) {
    console.error('[API /mira/trayectorias GET] Error:', error.message)
    return NextResponse.json(
      { success: false, error: error.message || 'Error al obtener trayectorias' },
      { status: error.status || 500 }
    )
  }
}

/**
 * POST /api/mira/trayectorias
 * Crea una persona-trayectoria básica (asignación profesor-colegio-curso).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { persona, colegio, curso, cargo, anio, is_current } = body || {}

    if (!persona) {
      return NextResponse.json({ success: false, error: 'Debes seleccionar un profesor' }, { status: 400 })
    }
    if (!colegio) {
      return NextResponse.json({ success: false, error: 'Debes seleccionar un colegio' }, { status: 400 })
    }
    if (!curso) {
      return NextResponse.json({ success: false, error: 'Debes seleccionar un curso' }, { status: 400 })
    }
    if (!cargo || typeof cargo !== 'string' || !cargo.trim()) {
      return NextResponse.json({ success: false, error: 'El cargo es obligatorio' }, { status: 400 })
    }

    const yearNum =
      typeof anio === 'number'
        ? anio
        : parseInt(String(anio || new Date().getFullYear()), 10)

    const payload = {
      data: {
        persona,
        colegio,
        curso,
        cargo: String(cargo).trim(),
        anio: yearNum,
        is_current: typeof is_current === 'boolean' ? is_current : true,
        fecha_inicio: new Date().toISOString().split('T')[0],
      },
    }

    const created = await strapiClient.post<any>('/api/persona-trayectorias', payload)
    const t = created?.data || created
    const attrs = t?.attributes || t || {}

    const personaRel = attrs.persona?.data ?? attrs.persona ?? null
    const personaAttrs = personaRel?.attributes ?? personaRel ?? {}

    const colegioRel = attrs.colegio?.data ?? attrs.colegio ?? null
    const colegioAttrs = colegioRel?.attributes ?? colegioRel ?? {}

    const cursoRel = attrs.curso?.data ?? attrs.curso ?? null
    const cursoAttrs = cursoRel?.attributes ?? cursoRel ?? {}

    const personaOut = personaRel
      ? {
          id: personaRel.id,
          documentId: personaRel.documentId ?? String(personaRel.id),
          nombre_completo:
            personaAttrs.nombre_completo ||
            `${personaAttrs.nombres || ''} ${personaAttrs.primer_apellido || ''}`.trim() ||
            'Sin nombre',
          rut: personaAttrs.rut || '',
        }
      : null

    const colegioOut = colegioRel
      ? {
          id: colegioRel.id,
          documentId: colegioRel.documentId ?? String(colegioRel.id),
          colegio_nombre: colegioAttrs.colegio_nombre || 'Sin colegio',
          rbd: colegioAttrs.rbd || null,
        }
      : null

    const cursoOut = cursoRel
      ? {
          id: cursoRel.id,
          documentId: cursoRel.documentId ?? String(cursoRel.id),
          nombre_curso: cursoAttrs.nombre_curso || '',
          nivel: cursoAttrs.nivel || '',
          grado: cursoAttrs.grado || '',
          letra: cursoAttrs.letra || '',
        }
      : null

    return NextResponse.json({
      success: true,
      data: {
        id: t?.id,
        documentId: t?.documentId ?? String(t?.id),
        cargo: attrs.cargo || '',
        anio: attrs.anio || null,
        is_current: attrs.is_current ?? true,
        persona: personaOut,
        colegio: colegioOut,
        curso: cursoOut,
      },
    })
  } catch (error: any) {
    console.error('[API /mira/trayectorias POST] Error:', error.message)
    return NextResponse.json(
      { success: false, error: error.message || 'Error al crear trayectoria' },
      { status: error.status || 500 }
    )
  }
}

