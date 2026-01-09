/**
 * API Route para gestionar trayectorias de personas
 * POST /api/persona-trayectorias
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

/**
 * POST /api/persona-trayectorias
 * Crea una nueva trayectoria
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log('[API /persona-trayectorias POST] 📥 Request recibido:', JSON.stringify(body, null, 2))
    
    // ⚠️ DEBUG: Verificar si hay campos no permitidos en body.data
    if (body.data) {
      const camposNoPermitidos = Object.keys(body.data).filter(key => 
        !['persona', 'colegio', 'cargo', 'anio', 'curso', 'asignatura', 'is_current', 'activo', 
          'fecha_inicio', 'fecha_fin', 'notas', 'curso_asignatura', 'org_display_name', 
          'role_key', 'department', 'colegio_region', 'correo', 'fecha_registro', 'ultimo_acceso'].includes(key)
      )
      if (camposNoPermitidos.length > 0) {
        console.warn('[API /persona-trayectorias POST] ⚠️ Campos no permitidos detectados:', camposNoPermitidos)
      }
    }

    // Validaciones
    if (!body.data) {
      console.error('[API /persona-trayectorias POST] ❌ No hay data en el body')
      return NextResponse.json(
        {
          success: false,
          error: 'Datos de trayectoria requeridos',
        },
        { status: 400 }
      )
    }

    // Validar persona
    let personaIdNum: number | null = null
    if (body.data.persona) {
      if (body.data.persona.connect && Array.isArray(body.data.persona.connect) && body.data.persona.connect.length > 0) {
        personaIdNum = parseInt(String(body.data.persona.connect[0]))
      } else if (typeof body.data.persona === 'number') {
        personaIdNum = body.data.persona
      } else if (typeof body.data.persona === 'string') {
        personaIdNum = parseInt(body.data.persona)
      }
    }

    if (!personaIdNum || personaIdNum === 0 || isNaN(personaIdNum)) {
      console.error('[API /persona-trayectorias POST] ❌ ID de persona inválido:', body.data.persona)
      return NextResponse.json(
        {
          success: false,
          error: 'ID de persona inválido o faltante',
          details: { persona: body.data.persona },
        },
        { status: 400 }
      )
    }

    // Validar colegio
    let colegioIdNum: number | null = null
    if (body.data.colegio) {
      if (body.data.colegio.connect && Array.isArray(body.data.colegio.connect) && body.data.colegio.connect.length > 0) {
        colegioIdNum = parseInt(String(body.data.colegio.connect[0]))
      } else if (typeof body.data.colegio === 'number') {
        colegioIdNum = body.data.colegio
      } else if (typeof body.data.colegio === 'string') {
        colegioIdNum = parseInt(body.data.colegio)
      }
    }

    if (!colegioIdNum || colegioIdNum === 0 || isNaN(colegioIdNum)) {
      console.error('[API /persona-trayectorias POST] ❌ ID de colegio inválido:', body.data.colegio)
      return NextResponse.json(
        {
          success: false,
          error: 'ID de colegio inválido o faltante',
          details: { colegio: body.data.colegio },
        },
        { status: 400 }
      )
    }

    console.log('[API /persona-trayectorias POST] ✅ IDs validados:', {
      personaId: personaIdNum,
      colegioId: colegioIdNum,
      cargo: body.data.cargo,
    })

    // Construir payload para Strapi
    // ⚠️ IMPORTANTE: Solo incluir campos que existen en el content type persona-trayectorias
    // NO incluir: region, colegio_region, comuna, etc. (esos son campos del colegio, no de la trayectoria)
    const strapiPayload = {
      data: {
        persona: { connect: [personaIdNum] },
        colegio: { connect: [colegioIdNum] },
        cargo: body.data.cargo || null,
        anio: body.data.anio ? parseInt(String(body.data.anio)) : null,
        curso: body.data.curso?.connect && Array.isArray(body.data.curso.connect) && body.data.curso.connect.length > 0
          ? { connect: [parseInt(String(body.data.curso.connect[0]))] }
          : null,
        asignatura: body.data.asignatura?.connect && Array.isArray(body.data.asignatura.connect) && body.data.asignatura.connect.length > 0
          ? { connect: [parseInt(String(body.data.asignatura.connect[0]))] }
          : null,
        is_current: body.data.is_current !== undefined ? Boolean(body.data.is_current) : true,
        activo: body.data.activo !== undefined ? Boolean(body.data.activo) : true,
        fecha_inicio: body.data.fecha_inicio || null,
        fecha_fin: body.data.fecha_fin || null,
        notas: body.data.notas || null,
        // ⚠️ NO incluir campos que no existen en persona-trayectorias:
        // - region (es del colegio)
        // - colegio_region (puede existir pero no lo enviamos si no viene en body.data)
        // - comuna (es del colegio)
      },
    }

    // Filtrar campos undefined/null innecesarios y campos no permitidos
    const camposPermitidos = [
      'persona', 'colegio', 'cargo', 'anio', 'curso', 'asignatura', 
      'is_current', 'activo', 'fecha_inicio', 'fecha_fin', 'notas',
      'curso_asignatura', 'org_display_name', 'role_key', 'department',
      'colegio_region', 'correo', 'fecha_registro', 'ultimo_acceso'
    ]
    
    // Limpiar el payload: solo incluir campos permitidos y que tengan valor
    const payloadLimpio: any = { data: {} }
    for (const key of Object.keys(strapiPayload.data)) {
      if (camposPermitidos.includes(key) && strapiPayload.data[key as keyof typeof strapiPayload.data] !== undefined) {
        payloadLimpio.data[key] = strapiPayload.data[key as keyof typeof strapiPayload.data]
      }
    }
    
    // Asegurar que persona y colegio siempre estén presentes
    payloadLimpio.data.persona = strapiPayload.data.persona
    payloadLimpio.data.colegio = strapiPayload.data.colegio

    console.log('[API /persona-trayectorias POST] 📤 Enviando a Strapi (payload limpio):', JSON.stringify(payloadLimpio, null, 2))

    // ⚠️ IMPORTANTE: El content type en Strapi es "persona-trayectorias"
    const response = await strapiClient.post<StrapiResponse<StrapiEntity<any>>>(
      '/api/persona-trayectorias',
      payloadLimpio
    )

    // Extraer ID de la respuesta (puede ser array o objeto)
    const trayectoriaData = Array.isArray(response.data) ? response.data[0] : response.data
    const trayectoriaId = trayectoriaData?.id || (trayectoriaData as any)?.documentId
    
    console.log('[API /persona-trayectorias POST] ✅ Trayectoria creada exitosamente:', {
      id: trayectoriaId,
    })

    return NextResponse.json({
      success: true,
      data: response.data,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /persona-trayectorias POST] ❌ Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
      response: error.response?.data,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al crear trayectoria',
        details: error.details || error.response?.data || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}
