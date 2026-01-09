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
    // NO incluir: region, comuna, dependencia (esos son campos del colegio, no de la trayectoria)
    
    // Lista estricta de campos permitidos según la estructura real de persona-trayectorias
    const camposPermitidos = [
      'persona', 'colegio', 'cargo', 'anio', 'curso', 'asignatura', 
      'is_current', 'activo', 'fecha_inicio', 'fecha_fin', 'notas',
      'curso_asignatura', 'org_display_name', 'role_key', 'department',
      'colegio_region', 'correo', 'fecha_registro', 'ultimo_acceso'
    ]
    
    // Construir payload limpio: solo campos permitidos
    const payloadLimpio: any = { 
      data: {
        persona: { connect: [personaIdNum] },
        colegio: { connect: [colegioIdNum] },
      }
    }
    
    // Agregar solo campos permitidos que vengan en body.data
    if (body.data.cargo !== undefined) payloadLimpio.data.cargo = body.data.cargo || null
    if (body.data.anio !== undefined) payloadLimpio.data.anio = body.data.anio ? parseInt(String(body.data.anio)) : null
    if (body.data.curso?.connect && Array.isArray(body.data.curso.connect) && body.data.curso.connect.length > 0) {
      payloadLimpio.data.curso = { connect: [parseInt(String(body.data.curso.connect[0]))] }
    }
    if (body.data.asignatura?.connect && Array.isArray(body.data.asignatura.connect) && body.data.asignatura.connect.length > 0) {
      payloadLimpio.data.asignatura = { connect: [parseInt(String(body.data.asignatura.connect[0]))] }
    }
    if (body.data.is_current !== undefined) payloadLimpio.data.is_current = Boolean(body.data.is_current)
    if (body.data.activo !== undefined) payloadLimpio.data.activo = Boolean(body.data.activo)
    if (body.data.fecha_inicio !== undefined) payloadLimpio.data.fecha_inicio = body.data.fecha_inicio || null
    if (body.data.fecha_fin !== undefined) payloadLimpio.data.fecha_fin = body.data.fecha_fin || null
    if (body.data.notas !== undefined) payloadLimpio.data.notas = body.data.notas || null
    
    // Campos opcionales adicionales (solo si vienen en body.data)
    if (body.data.curso_asignatura !== undefined) payloadLimpio.data.curso_asignatura = body.data.curso_asignatura
    if (body.data.org_display_name !== undefined) payloadLimpio.data.org_display_name = body.data.org_display_name
    if (body.data.role_key !== undefined) payloadLimpio.data.role_key = body.data.role_key
    if (body.data.department !== undefined) payloadLimpio.data.department = body.data.department
    if (body.data.colegio_region !== undefined) payloadLimpio.data.colegio_region = body.data.colegio_region
    if (body.data.correo !== undefined) payloadLimpio.data.correo = body.data.correo
    if (body.data.fecha_registro !== undefined) payloadLimpio.data.fecha_registro = body.data.fecha_registro
    if (body.data.ultimo_acceso !== undefined) payloadLimpio.data.ultimo_acceso = body.data.ultimo_acceso
    
    // ⚠️ EXPLÍCITAMENTE NO incluir: region, comuna, dependencia, zona, etc.
    // Estos campos pertenecen al colegio, no a la trayectoria

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
