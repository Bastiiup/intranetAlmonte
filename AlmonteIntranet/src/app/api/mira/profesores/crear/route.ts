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

    // Verificar si ya existe un usuario con ese email
    // users-permissions devuelve array plano, no { data: [...] }
    try {
      const usersCheck = await strapiClient.get<any>(
        `/api/users?filters[email][$eq]=${encodeURIComponent(emailLimpio)}&pagination[pageSize]=1`
      )
      const usersExistentes = Array.isArray(usersCheck) ? usersCheck : Array.isArray(usersCheck?.data) ? usersCheck.data : []
      if (usersExistentes.length > 0) {
        return NextResponse.json(
          { success: false, error: `Ya existe un usuario con el email ${emailLimpio}` },
          { status: 409 }
        )
      }
    } catch (e: any) {
      console.warn('[API /mira/profesores/crear] Error al verificar email (puede ser normal):', e.message)
    }

    const passwordTemporal = body.password?.trim() || generarPassword(rutLimpio)

    console.log('[API /mira/profesores/crear] Creando usuario...', { email: emailLimpio })

    // PASO 1: Crear User en Strapi (users-permissions)
    // El endpoint /api/users de users-permissions espera payload PLANO (sin { data: {} })
    let userData: any
    try {
      userData = await strapiClient.post<any>('/api/users', {
        username: emailLimpio,
        email: emailLimpio,
        password: passwordTemporal,
        confirmed: true,
        blocked: false,
        role: 1,
      })
    } catch (userError: any) {
      console.error('[API /mira/profesores/crear] Error al crear usuario:', userError.message)
      return NextResponse.json(
        { success: false, error: userError.message || 'Error al crear usuario en Strapi' },
        { status: userError.status || 500 }
      )
    }

    const userId = userData?.id
    const userDocumentId = userData?.documentId
    console.log('[API /mira/profesores/crear] Usuario creado:', { userId, userDocumentId })

    if (!userId && !userDocumentId) {
      console.error('[API /mira/profesores/crear] Usuario creado pero sin ID:', userData)
      return NextResponse.json(
        { success: false, error: 'Usuario creado pero no se obtuvo ID. Contacta al administrador.' },
        { status: 500 }
      )
    }

    // PASO 2: Crear Persona vinculada al User
    const nombreCompleto = `${body.nombres.trim()} ${body.primer_apellido.trim()} ${body.segundo_apellido?.trim() || ''}`.trim()

    let personaData: any
    try {
      personaData = await strapiClient.post<any>('/api/personas', {
        data: {
          nombres: body.nombres.trim(),
          primer_apellido: body.primer_apellido.trim(),
          segundo_apellido: body.segundo_apellido?.trim() || null,
          nombre_completo: nombreCompleto,
          rut: rutLimpio,
          activo: true,
          origen: 'manual',
          usuario_login: userDocumentId || userId,
        },
      })
    } catch (personaError: any) {
      console.error('[API /mira/profesores/crear] Error al crear persona:', personaError.message)
      // Rollback: eliminar el usuario creado
      try {
        await strapiClient.delete(`/api/users/${userId}`)
        console.log('[API /mira/profesores/crear] Rollback: usuario eliminado')
      } catch (rollbackError: any) {
        console.error('[API /mira/profesores/crear] Error en rollback:', rollbackError.message)
      }
      return NextResponse.json(
        { success: false, error: personaError.message || 'Error al crear persona' },
        { status: personaError.status || 500 }
      )
    }

    const persona = personaData?.data || personaData
    const personaId = persona?.id
    const personaDocId = persona?.documentId

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
