import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

interface CrearProfesorBody {
  nombres: string
  primer_apellido: string
  segundo_apellido?: string
  rut: string
  email: string
  password?: string
}

/**
 * POST /api/mira/profesores/crear
 * Crea un User (users-permissions) + Persona vinculados (secuencia atómica).
 *
 * users-permissions espera payload plano (sin wrapper { data: {} }).
 * persona espera payload con wrapper { data: { ... } }.
 */
export async function POST(request: NextRequest) {
  try {
    const body: CrearProfesorBody = await request.json()

    if (!body.nombres?.trim()) {
      return NextResponse.json({ success: false, error: 'El nombre es obligatorio' }, { status: 400 })
    }
    if (!body.primer_apellido?.trim()) {
      return NextResponse.json({ success: false, error: 'El apellido paterno es obligatorio' }, { status: 400 })
    }
    if (!body.rut?.trim()) {
      return NextResponse.json({ success: false, error: 'El RUT es obligatorio' }, { status: 400 })
    }
    if (!body.email?.trim()) {
      return NextResponse.json({ success: false, error: 'El email es obligatorio' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email.trim())) {
      return NextResponse.json({ success: false, error: 'El email no tiene un formato válido' }, { status: 400 })
    }

    const rutLimpio = body.rut.trim()
    const emailLimpio = body.email.trim().toLowerCase()

    // Verificar si ya existe una persona con ese RUT
    try {
      const personaCheck = await strapiClient.get<any>(
        `/api/personas?filters[rut][$eq]=${encodeURIComponent(rutLimpio)}&pagination[pageSize]=1`
      )
      const personasExistentes = Array.isArray(personaCheck.data) ? personaCheck.data : []
      if (personasExistentes.length > 0) {
        return NextResponse.json(
          { success: false, error: `Ya existe una persona con RUT ${rutLimpio}` },
          { status: 409 }
        )
      }
    } catch (e: any) {
      console.warn('[API /mira/profesores/crear] Error al verificar RUT:', e.message)
    }

    const passwordTemporal = body.password?.trim() || generarPassword(rutLimpio)
    const nombreCompleto = `${body.nombres.trim()} ${body.primer_apellido.trim()} ${body.segundo_apellido?.trim() || ''}`.trim()

    // Usar el endpoint atómico de Strapi (mismo que registro público) para evitar
    // GET/POST /api/users (filters[email] inválido y column username puede no existir).
    console.log('[API /mira/profesores/crear] Creando vía Strapi /registro-profesor', { email: emailLimpio })
    let strapiResponse: any
    try {
      strapiResponse = await strapiClient.post<any>('/api/registro-profesor', {
        nombres: body.nombres.trim(),
        primer_apellido: body.primer_apellido.trim(),
        segundo_apellido: (body.segundo_apellido || '').trim(),
        rut: rutLimpio,
        email: emailLimpio,
        password: passwordTemporal,
      })
    } catch (e: any) {
      console.error('[API /mira/profesores/crear] Error al crear vía register-profesor:', e.message, e.status)
      const msg = e.message || e.error?.message || 'Error al crear profesor en Strapi'
      const status = e.status || 500
      return NextResponse.json(
        { success: false, error: msg },
        { status: status >= 400 && status < 600 ? status : 500 }
      )
    }

    const user = strapiResponse?.user
    const userId = user?.id
    const userDocumentId = user?.documentId
    if (!userId) {
      console.error('[API /mira/profesores/crear] Strapi no devolvió user.id:', strapiResponse)
      return NextResponse.json(
        { success: false, error: 'Strapi no devolvió datos del usuario creado.' },
        { status: 500 }
      )
    }

    // Obtener la persona creada por Strapi (por RUT)
    let personaId: number | string | undefined
    let personaDocId: string | undefined
    try {
      const personaRes = await strapiClient.get<any>(
        `/api/personas?filters[rut][$eq]=${encodeURIComponent(rutLimpio)}&pagination[pageSize]=1`
      )
      const list = Array.isArray(personaRes?.data) ? personaRes.data : []
      const primera = list[0]
      if (primera) {
        personaId = primera.id ?? primera.documentId
        personaDocId = primera.documentId ?? primera.id
      }
    } catch (e: any) {
      console.warn('[API /mira/profesores/crear] No se pudo obtener persona por RUT:', e.message)
    }

    console.log('[API /mira/profesores/crear] Profesor creado exitosamente:', {
      personaId, personaDocId, userId, userDocumentId, rut: rutLimpio, email: emailLimpio,
    })

    return NextResponse.json({
      success: true,
      data: {
        persona: {
          id: personaId,
          documentId: personaDocId,
          nombres: body.nombres.trim(),
          primer_apellido: body.primer_apellido.trim(),
          segundo_apellido: body.segundo_apellido?.trim() || null,
          nombre_completo: nombreCompleto,
          rut: rutLimpio,
        },
        usuario: {
          id: userId,
          documentId: userDocumentId,
          email: emailLimpio,
          username: emailLimpio,
        },
        password_temporal: passwordTemporal,
      },
      message: `Profesor creado exitosamente. Contraseña temporal: ${passwordTemporal}`,
    })
  } catch (error: any) {
    console.error('[API /mira/profesores/crear] Error general:', error.message)
    return NextResponse.json(
      { success: false, error: error.message || 'Error al crear profesor' },
      { status: error.status || 500 }
    )
  }
}

function generarPassword(rut: string): string {
  const soloNumeros = rut.replace(/[^0-9]/g, '')
  if (soloNumeros.length > 1) {
    return `MIRA${soloNumeros.slice(0, -1)}`
  }
  return 'MIRA2026'
}
