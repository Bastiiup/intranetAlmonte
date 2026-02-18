import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

const CARGOS_VALIDOS = [
  'Profesor Jefe',
  'Docente de Aula',
  'Jefe de Departamento',
  'Coordinador Académico',
  'Director',
  'Subdirector',
  'Inspector General',
  'Orientador',
  'Otro',
]

/**
 * GET /api/mira/profesores/asignar?persona_id=xxx
 * Lista trayectorias (carga académica) de un profesor
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const personaId = searchParams.get('persona_id')

    if (!personaId) {
      return NextResponse.json({ success: false, error: 'persona_id es requerido' }, { status: 400 })
    }

    const isDocumentId = !/^\d+$/.test(personaId)
    const filterKey = isDocumentId
      ? 'filters[persona][documentId][$eq]'
      : 'filters[persona][id][$eq]'

    const params = new URLSearchParams({
      [filterKey]: personaId,
      'populate[colegio][fields][0]': 'colegio_nombre',
      'populate[colegio][fields][1]': 'rbd',
      'populate[curso][fields][0]': 'nombre_curso',
      'populate[curso][fields][1]': 'nivel',
      'populate[curso][fields][2]': 'grado',
      'populate[curso][fields][3]': 'letra',
      'populate[asignatura][fields][0]': 'nombre',
      'populate[persona][fields][0]': 'nombre_completo',
      'sort[0]': 'anio:desc',
      'sort[1]': 'createdAt:desc',
      'pagination[pageSize]': '50',
      'publicationState': 'preview',
    })

    const response = await strapiClient.get<any>(`/api/persona-trayectorias?${params.toString()}`)
    const items = Array.isArray(response.data) ? response.data : []

    const trayectorias = items.map((t: any) => {
      const attrs = t.attributes || t
      const colegio = attrs.colegio?.data?.attributes || attrs.colegio?.data || attrs.colegio || null
      const curso = attrs.curso?.data?.attributes || attrs.curso?.data || attrs.curso || null
      const asignatura = attrs.asignatura?.data?.attributes || attrs.asignatura?.data || attrs.asignatura || null

      return {
        id: t.id,
        documentId: t.documentId,
        cargo: attrs.cargo || '',
        anio: attrs.anio || null,
        fecha_inicio: attrs.fecha_inicio || null,
        fecha_fin: attrs.fecha_fin || null,
        is_current: attrs.is_current ?? false,
        notas: attrs.notas || '',
        colegio: colegio ? {
          id: attrs.colegio?.data?.id || attrs.colegio?.id || null,
          documentId: attrs.colegio?.data?.documentId || attrs.colegio?.documentId || null,
          nombre: colegio.colegio_nombre || 'Sin nombre',
          rbd: colegio.rbd || null,
        } : null,
        curso: curso ? {
          id: attrs.curso?.data?.id || attrs.curso?.id || null,
          documentId: attrs.curso?.data?.documentId || attrs.curso?.documentId || null,
          nombre: curso.nombre_curso || '',
          nivel: curso.nivel || '',
          grado: curso.grado || '',
          letra: curso.letra || '',
        } : null,
        asignatura: asignatura ? {
          id: attrs.asignatura?.data?.id || attrs.asignatura?.id || null,
          documentId: attrs.asignatura?.data?.documentId || attrs.asignatura?.documentId || null,
          nombre: asignatura.nombre || '',
        } : null,
      }
    })

    return NextResponse.json({ success: true, data: trayectorias, cargos: CARGOS_VALIDOS })
  } catch (error: any) {
    console.error('[API /mira/profesores/asignar GET] Error:', error.message)
    return NextResponse.json(
      { success: false, error: error.message || 'Error al obtener trayectorias' },
      { status: error.status || 500 }
    )
  }
}

/**
 * POST /api/mira/profesores/asignar
 * Crea una persona-trayectoria (carga académica)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { persona_id, colegio_id, curso_id, asignatura_id, cargo, anio, notas } = body

    if (!persona_id) {
      return NextResponse.json({ success: false, error: 'persona_id es requerido' }, { status: 400 })
    }
    if (!colegio_id) {
      return NextResponse.json({ success: false, error: 'Debes seleccionar un colegio' }, { status: 400 })
    }
    if (!cargo?.trim()) {
      return NextResponse.json({ success: false, error: 'Debes seleccionar un cargo' }, { status: 400 })
    }

    const anioFinal = anio || new Date().getFullYear()

    // Verificar duplicados: misma persona + colegio + curso + cargo + año
    const dupParams = new URLSearchParams({
      'filters[persona][documentId][$eq]': String(persona_id),
      'filters[colegio][documentId][$eq]': String(colegio_id),
      'filters[cargo][$eq]': cargo.trim(),
      'filters[anio][$eq]': String(anioFinal),
      'pagination[pageSize]': '1',
      'publicationState': 'preview',
    })
    if (curso_id) {
      dupParams.set('filters[curso][documentId][$eq]', String(curso_id))
    }

    const dupCheck = await strapiClient.get<any>(`/api/persona-trayectorias?${dupParams.toString()}`)
    const duplicados = Array.isArray(dupCheck.data) ? dupCheck.data : []

    if (duplicados.length > 0) {
      return NextResponse.json(
        { success: false, error: `Ya existe una asignación con ese cargo para el año ${anioFinal} en ese colegio/curso` },
        { status: 409 }
      )
    }

    const payload: any = {
      data: {
        persona: persona_id,
        colegio: colegio_id,
        cargo: cargo.trim(),
        anio: anioFinal,
        is_current: true,
        fecha_inicio: new Date().toISOString().split('T')[0],
      },
    }

    if (curso_id) payload.data.curso = curso_id
    if (asignatura_id) payload.data.asignatura = asignatura_id
    if (notas?.trim()) payload.data.notas = notas.trim()

    console.log('[API /mira/profesores/asignar POST] Creando trayectoria:', payload)

    const response = await strapiClient.post<any>('/api/persona-trayectorias', payload)

    console.log('[API /mira/profesores/asignar POST] Trayectoria creada:', response?.data?.id || (response as any)?.id)

    return NextResponse.json({
      success: true,
      data: response?.data || response,
      message: 'Carga académica asignada correctamente',
    })
  } catch (error: any) {
    console.error('[API /mira/profesores/asignar POST] Error:', error.message)
    return NextResponse.json(
      { success: false, error: error.message || 'Error al asignar carga académica' },
      { status: error.status || 500 }
    )
  }
}

/**
 * DELETE /api/mira/profesores/asignar?id=xxx
 * Elimina una trayectoria
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const trayectoriaId = searchParams.get('id')

    if (!trayectoriaId) {
      return NextResponse.json({ success: false, error: 'id es requerido' }, { status: 400 })
    }

    await strapiClient.delete(`/api/persona-trayectorias/${trayectoriaId}`)

    return NextResponse.json({ success: true, message: 'Asignación eliminada correctamente' })
  } catch (error: any) {
    console.error('[API /mira/profesores/asignar DELETE] Error:', error.message)
    return NextResponse.json(
      { success: false, error: error.message || 'Error al eliminar asignación' },
      { status: error.status || 500 }
    )
  }
}
