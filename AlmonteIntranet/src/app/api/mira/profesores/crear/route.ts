import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import { getStrapiUrl, STRAPI_API_TOKEN } from '@/lib/strapi/config'

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
 * Crea un User + Persona vinculados (secuencia atómica)
 */
export async function POST(request: NextRequest) {
  try {
    const body: CrearProfesorBody = await request.json()

    // Validaciones
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

    // Verificar si ya existe una persona con ese RUT
    const rutLimpio = body.rut.trim()
    const personaExistente = await strapiClient.get<any>(
      `/api/personas?filters[rut][$eq]=${encodeURIComponent(rutLimpio)}&pagination[pageSize]=1`
    )
    if (personaExistente.data && Array.isArray(personaExistente.data) && personaExistente.data.length > 0) {
      return NextResponse.json(
        { success: false, error: `Ya existe una persona con RUT ${rutLimpio}` },
        { status: 409 }
      )
    }

    // Verificar si ya existe un usuario con ese email
    const userExistente = await strapiClient.get<any>(
      `/api/users?filters[email][$eq]=${encodeURIComponent(body.email.trim())}&pagination[pageSize]=1`
    )
    if (userExistente && Array.isArray(userExistente) && userExistente.length > 0) {
      return NextResponse.json(
        { success: false, error: `Ya existe un usuario con el email ${body.email.trim()}` },
        { status: 409 }
      )
    }

    // Generar contraseña temporal: RUT sin dígito verificador o "MIRA2026"
    const passwordTemporal = body.password?.trim() || generarPassword(rutLimpio)

    console.log('[API /mira/profesores/crear] Creando usuario...', { email: body.email.trim() })

    // PASO 1: Crear User en Strapi (users-permissions)
    const userPayload = {
      username: body.email.trim(),
      email: body.email.trim(),
      password: passwordTemporal,
      confirmed: true,
      blocked: false,
      role: 1, // Rol "Authenticated" por defecto
    }

    const userResponse = await fetch(getStrapiUrl('/api/users'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
      },
      body: JSON.stringify(userPayload),
    })

    if (!userResponse.ok) {
      const userError = await userResponse.json().catch(() => ({}))
      console.error('[API /mira/profesores/crear] Error al crear usuario:', userError)
      const errorMsg = userError.error?.message || userError.message || 'Error al crear usuario en Strapi'
      return NextResponse.json({ success: false, error: errorMsg }, { status: userResponse.status })
    }

    const userData = await userResponse.json()
    const userId = userData.id
    const userDocumentId = userData.documentId

    console.log('[API /mira/profesores/crear] Usuario creado:', { userId, userDocumentId })

    // PASO 2: Crear Persona vinculada al User
    const nombreCompleto = `${body.nombres.trim()} ${body.primer_apellido.trim()} ${body.segundo_apellido?.trim() || ''}`.trim()

    const personaPayload = {
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
    }

    console.log('[API /mira/profesores/crear] Creando persona...', { rut: rutLimpio, usuario_login: userDocumentId || userId })

    let personaResponse: any
    try {
      personaResponse = await strapiClient.post('/api/personas', personaPayload)
    } catch (personaError: any) {
      console.error('[API /mira/profesores/crear] Error al crear persona:', personaError.message)
      // Rollback: eliminar el usuario creado
      try {
        await fetch(getStrapiUrl(`/api/users/${userId}`), {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${STRAPI_API_TOKEN}` },
        })
        console.log('[API /mira/profesores/crear] Rollback: usuario eliminado')
      } catch (rollbackError: any) {
        console.error('[API /mira/profesores/crear] Error en rollback:', rollbackError.message)
      }
      return NextResponse.json(
        { success: false, error: personaError.message || 'Error al crear persona' },
        { status: personaError.status || 500 }
      )
    }

    const personaData = personaResponse.data?.attributes || personaResponse.data || personaResponse
    const personaId = personaResponse.data?.id || personaResponse.id

    console.log('[API /mira/profesores/crear] Profesor creado exitosamente:', {
      personaId,
      userId,
      rut: rutLimpio,
      email: body.email.trim(),
    })

    return NextResponse.json({
      success: true,
      data: {
        persona: {
          id: personaId,
          documentId: personaResponse.data?.documentId || personaResponse.documentId,
          nombres: body.nombres.trim(),
          primer_apellido: body.primer_apellido.trim(),
          segundo_apellido: body.segundo_apellido?.trim() || null,
          nombre_completo: nombreCompleto,
          rut: rutLimpio,
        },
        usuario: {
          id: userId,
          documentId: userDocumentId,
          email: body.email.trim(),
          username: body.email.trim(),
        },
        password_temporal: passwordTemporal,
      },
      message: `Profesor creado exitosamente. Contraseña temporal: ${passwordTemporal}`,
    })
  } catch (error: any) {
    console.error('[API /mira/profesores/crear] Error:', error.message)
    return NextResponse.json(
      { success: false, error: error.message || 'Error al crear profesor' },
      { status: error.status || 500 }
    )
  }
}

/**
 * Genera contraseña temporal a partir del RUT
 * Extrae solo los dígitos numéricos (sin dígito verificador)
 */
function generarPassword(rut: string): string {
  const soloNumeros = rut.replace(/[^0-9]/g, '')
  if (soloNumeros.length > 1) {
    return `MIRA${soloNumeros.slice(0, -1)}`
  }
  return 'MIRA2026'
}
