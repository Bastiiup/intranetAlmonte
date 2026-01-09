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
      const camposPermitidosList = [
        'persona', 'colegio', 'cargo', 'anio', 'curso', 'asignatura', 'is_current', 'activo', 
        'fecha_inicio', 'fecha_fin', 'notas', 'curso_asignatura', 'org_display_name', 
        'role_key', 'department', 'colegio_region', 'correo', 'fecha_registro', 'ultimo_acceso'
      ]
      const camposNoPermitidos = Object.keys(body.data).filter(key => !camposPermitidosList.includes(key))
      if (camposNoPermitidos.length > 0) {
        console.warn('[API /persona-trayectorias POST] ⚠️ Campos no permitidos detectados en body.data:', camposNoPermitidos)
        console.warn('[API /persona-trayectorias POST] ⚠️ Valores de campos no permitidos:', 
          camposNoPermitidos.reduce((acc, key) => ({ ...acc, [key]: body.data[key] }), {})
        )
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
    // NO incluir: region, comuna, dependencia, zona (esos son campos del colegio, no de la trayectoria)
    
    // Lista estricta de campos permitidos según la estructura real de persona-trayectorias
    const camposPermitidos = new Set([
      'persona', 'colegio', 'cargo', 'anio', 'curso', 'asignatura', 
      'is_current', 'activo', 'fecha_inicio', 'fecha_fin', 'notas',
      'curso_asignatura', 'org_display_name', 'role_key', 'department',
      'colegio_region', 'correo', 'fecha_registro', 'ultimo_acceso'
    ])
    
    // Lista de campos EXPLÍCITAMENTE PROHIBIDOS (campos del colegio, no de la trayectoria)
    const camposProhibidos = new Set([
      'region', 'comuna', 'dependencia', 'zona', 'colegio_nombre', 'rbd',
      'telefonos', 'emails', 'direcciones', 'website', 'estado'
    ])
    
    // Construir payload limpio: solo campos permitidos
    // ⚠️ IMPORTANTE: Para relaciones manyToOne en Strapi v4, podemos usar:
    // Opción 1: { connect: [id] } - para relaciones manyToOne
    // Opción 2: id directamente - si Strapi lo acepta
    // Probaremos con connect primero, si falla intentaremos con ID directo
    const payloadLimpio: any = { 
      data: {
        // Para manyToOne, usar connect con array
        persona: { connect: [personaIdNum] },
        colegio: { connect: [colegioIdNum] },
      }
    }
    
    console.log('[API /persona-trayectorias POST] 🔍 IDs para connect:', {
      personaIdNum,
      colegioIdNum,
      tipoPersona: typeof personaIdNum,
      tipoColegio: typeof colegioIdNum,
    })
    
    // Agregar solo campos permitidos que vengan en body.data
    // ⚠️ IMPORTANTE: Iterar solo sobre campos permitidos, NO sobre todo body.data
    for (const campo of camposPermitidos) {
      if (campo === 'persona' || campo === 'colegio') continue // Ya los agregamos arriba
      
      if (body.data[campo] !== undefined) {
        if (campo === 'anio' && body.data[campo] !== null) {
          payloadLimpio.data[campo] = parseInt(String(body.data[campo]))
        } else if (campo === 'curso' && body.data[campo]?.connect && Array.isArray(body.data[campo].connect) && body.data[campo].connect.length > 0) {
          payloadLimpio.data[campo] = { connect: [parseInt(String(body.data[campo].connect[0]))] }
        } else if (campo === 'asignatura' && body.data[campo]?.connect && Array.isArray(body.data[campo].connect) && body.data[campo].connect.length > 0) {
          payloadLimpio.data[campo] = { connect: [parseInt(String(body.data[campo].connect[0]))] }
        } else if (campo === 'is_current' || campo === 'activo') {
          payloadLimpio.data[campo] = Boolean(body.data[campo])
        } else {
          payloadLimpio.data[campo] = body.data[campo] || null
        }
      }
    }
    
    // ⚠️ VERIFICACIÓN FINAL: Asegurar que NO hay campos prohibidos
    const camposEnPayload = Object.keys(payloadLimpio.data)
    const camposProhibidosEncontrados = camposEnPayload.filter(c => camposProhibidos.has(c))
    if (camposProhibidosEncontrados.length > 0) {
      console.error('[API /persona-trayectorias POST] ❌ ERROR CRÍTICO: Campos prohibidos en payload:', camposProhibidosEncontrados)
      // Eliminar campos prohibidos
      camposProhibidosEncontrados.forEach(campo => delete payloadLimpio.data[campo])
    }

    console.log('[API /persona-trayectorias POST] 📤 Enviando a Strapi (payload limpio):', JSON.stringify(payloadLimpio, null, 2))
    console.log('[API /persona-trayectorias POST] 📋 Campos en payload.data:', Object.keys(payloadLimpio.data))
    console.log('[API /persona-trayectorias POST] 📋 Valores de payload.data:', {
      persona: payloadLimpio.data.persona,
      colegio: payloadLimpio.data.colegio,
      cargo: payloadLimpio.data.cargo,
      is_current: payloadLimpio.data.is_current,
      activo: payloadLimpio.data.activo,
      otrosCampos: Object.keys(payloadLimpio.data).filter(k => !['persona', 'colegio', 'cargo', 'is_current', 'activo'].includes(k)),
    })

    // ⚠️ IMPORTANTE: El content type en Strapi es "persona-trayectorias"
    const response = await strapiClient.post<StrapiResponse<StrapiEntity<any>>>(
      '/api/persona-trayectorias',
      payloadLimpio
    )
    
    console.log('[API /persona-trayectorias POST] ✅ Respuesta exitosa de Strapi:', {
      tieneData: !!response.data,
      esArray: Array.isArray(response.data),
      primerElemento: Array.isArray(response.data) ? response.data[0] : response.data,
    })

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
    console.error('[API /persona-trayectorias POST] ❌ Error completo:', {
      message: error.message,
      status: error.status,
      details: error.details,
      response: error.response?.data,
      errorCompleto: JSON.stringify(error.response?.data || error, null, 2),
    })
    
    // Si el error es de validación de Strapi, mostrar detalles específicos
    if (error.response?.data?.error) {
      const strapiError = error.response.data.error
      console.error('[API /persona-trayectorias POST] ❌ Error de Strapi:', {
        status: strapiError.status,
        name: strapiError.name,
        message: strapiError.message,
        details: strapiError.details,
      })
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al crear trayectoria',
        details: error.details || error.response?.data || {},
        status: error.status || 500,
        strapiError: error.response?.data?.error || null,
      },
      { status: error.status || 500 }
    )
  }
}
