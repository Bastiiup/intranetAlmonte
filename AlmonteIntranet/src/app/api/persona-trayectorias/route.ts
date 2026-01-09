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
      const camposProhibidosList = [
        'region', 'comuna', 'dependencia', 'zona', 'colegio_nombre', 'rbd',
        'telefonos', 'emails', 'direcciones', 'website', 'estado'
      ]
      
      const camposNoPermitidos = Object.keys(body.data).filter(key => !camposPermitidosList.includes(key))
      const camposProhibidosEnBody = Object.keys(body.data).filter(key => camposProhibidosList.includes(key))
      
      if (camposNoPermitidos.length > 0) {
        console.warn('[API /persona-trayectorias POST] ⚠️ Campos no permitidos detectados en body.data:', camposNoPermitidos)
        console.warn('[API /persona-trayectorias POST] ⚠️ Valores de campos no permitidos:', 
          camposNoPermitidos.reduce((acc, key) => ({ ...acc, [key]: body.data[key] }), {})
        )
      }
      
      if (camposProhibidosEnBody.length > 0) {
        console.error('[API /persona-trayectorias POST] ❌ ERROR CRÍTICO: Campos PROHIBIDOS detectados en body.data:', camposProhibidosEnBody)
        console.error('[API /persona-trayectorias POST] ❌ Valores de campos prohibidos:', 
          camposProhibidosEnBody.reduce((acc, key) => ({ ...acc, [key]: body.data[key] }), {})
        )
        // Eliminar campos prohibidos inmediatamente
        camposProhibidosEnBody.forEach(campo => {
          delete body.data[campo]
          console.log(`[API /persona-trayectorias POST] 🗑️ Eliminado campo prohibido de body.data: ${campo}`)
        })
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
    // ⚠️ IMPORTANTE: Para relaciones manyToOne en Strapi v4, usar { connect: [id] }
    // Esto evita que Strapi intente hacer populate automático y rechace campos extras
    const payloadLimpio: any = { 
      data: {
        // Para manyToOne, usar connect con array (formato estándar de Strapi v4)
        // ⚠️ CRÍTICO: Usar connect evita que Strapi intente incluir campos del objeto relacionado
        persona: { connect: [personaIdNum] },
        colegio: { connect: [colegioIdNum] },
      }
    }
    
    console.log('[API /persona-trayectorias POST] 🔍 Formato de relaciones:', {
      persona: payloadLimpio.data.persona,
      colegio: payloadLimpio.data.colegio,
      tipoPersona: typeof payloadLimpio.data.persona,
      tipoColegio: typeof payloadLimpio.data.colegio,
    })
    
    console.log('[API /persona-trayectorias POST] 🔍 IDs para connect:', {
      personaIdNum,
      colegioIdNum,
      tipoPersona: typeof personaIdNum,
      tipoColegio: typeof colegioIdNum,
    })
    
    // Agregar solo campos permitidos que vengan en body.data
    // ⚠️ IMPORTANTE: Iterar solo sobre campos permitidos, NO sobre todo body.data
    // ⚠️ CRÍTICO: NO copiar ningún campo que no esté explícitamente en camposPermitidos
    for (const campo of camposPermitidos) {
      if (campo === 'persona' || campo === 'colegio') continue // Ya los agregamos arriba
      
      // Solo procesar si el campo existe en body.data Y está en la lista de permitidos
      if (body.data[campo] !== undefined && camposPermitidos.has(campo)) {
        // Verificar que NO sea un campo prohibido (doble verificación)
        if (camposProhibidos.has(campo)) {
          console.warn(`[API /persona-trayectorias POST] ⚠️ Campo ${campo} está en permitidos pero también en prohibidos, omitiendo`)
          continue
        }
        
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
    
    // ⚠️ VERIFICACIÓN ADICIONAL: Eliminar cualquier campo que no esté en camposPermitidos
    const camposEnPayloadLimpio = Object.keys(payloadLimpio.data)
    const camposNoPermitidosEnPayload = camposEnPayloadLimpio.filter(c => !camposPermitidos.has(c) || camposProhibidos.has(c))
    if (camposNoPermitidosEnPayload.length > 0) {
      console.error('[API /persona-trayectorias POST] ❌ ERROR: Campos no permitidos en payloadLimpio:', camposNoPermitidosEnPayload)
      camposNoPermitidosEnPayload.forEach(campo => {
        delete payloadLimpio.data[campo]
        console.log(`[API /persona-trayectorias POST] 🗑️ Eliminado campo no permitido: ${campo}`)
      })
    }
    
    // ⚠️ VERIFICACIÓN FINAL: Asegurar que NO hay campos prohibidos
    const camposEnPayload = Object.keys(payloadLimpio.data)
    const camposProhibidosEncontrados = camposEnPayload.filter(c => camposProhibidos.has(c))
    if (camposProhibidosEncontrados.length > 0) {
      console.error('[API /persona-trayectorias POST] ❌ ERROR CRÍTICO: Campos prohibidos en payload:', camposProhibidosEncontrados)
      // Eliminar campos prohibidos
      camposProhibidosEncontrados.forEach(campo => delete payloadLimpio.data[campo])
    }
    
    // ⚠️ VERIFICACIÓN EXTRA: Crear un objeto completamente nuevo solo con campos permitidos
    // ⚠️ CRÍTICO: Construir desde cero, NO copiar de payloadLimpio
    const payloadFinal: any = {
      data: {
        persona: payloadLimpio.data.persona,
        colegio: payloadLimpio.data.colegio,
      }
    }
    
    // Agregar solo campos que están en la lista de permitidos Y que existen en payloadLimpio
    // ⚠️ IMPORTANTE: Verificar explícitamente que el campo NO esté en prohibidos
    for (const campo of camposPermitidos) {
      if (campo === 'persona' || campo === 'colegio') continue
      
      // Solo agregar si:
      // 1. Existe en payloadLimpio
      // 2. Está en camposPermitidos
      // 3. NO está en camposProhibidos
      if (payloadLimpio.data[campo] !== undefined && 
          camposPermitidos.has(campo) && 
          !camposProhibidos.has(campo)) {
        payloadFinal.data[campo] = payloadLimpio.data[campo]
      }
    }
    
    // ⚠️ VERIFICACIÓN FINAL ABSOLUTA: Eliminar cualquier campo que no debería estar
    const camposFinalesAntes = Object.keys(payloadFinal.data)
    const camposProhibidosEnFinal = camposFinalesAntes.filter(c => camposProhibidos.has(c))
    if (camposProhibidosEnFinal.length > 0) {
      console.error('[API /persona-trayectorias POST] ❌ ERROR CRÍTICO: Campos prohibidos en payloadFinal:', camposProhibidosEnFinal)
      camposProhibidosEnFinal.forEach(campo => {
        delete payloadFinal.data[campo]
        console.log(`[API /persona-trayectorias POST] 🗑️ Eliminado campo prohibido de payloadFinal: ${campo}`)
      })
    }
    
    // Verificar una vez más que no hay campos prohibidos
    const camposFinales = Object.keys(payloadFinal.data)
    const camposProhibidosFinales = camposFinales.filter(c => camposProhibidos.has(c))
    if (camposProhibidosFinales.length > 0) {
      console.error('[API /persona-trayectorias POST] ❌ ERROR: Aún hay campos prohibidos después de limpiar:', camposProhibidosFinales)
      camposProhibidosFinales.forEach(campo => delete payloadFinal.data[campo])
    }

    // ⚠️ VERIFICACIÓN FINAL ABSOLUTA: Eliminar explícitamente campos prohibidos
    if ('region' in payloadFinal.data) {
      console.error('[API /persona-trayectorias POST] ❌ ERROR: region encontrado en payloadFinal, eliminando')
      delete payloadFinal.data.region
    }
    if ('comuna' in payloadFinal.data) {
      console.error('[API /persona-trayectorias POST] ❌ ERROR: comuna encontrado en payloadFinal, eliminando')
      delete payloadFinal.data.comuna
    }
    if ('dependencia' in payloadFinal.data) {
      console.error('[API /persona-trayectorias POST] ❌ ERROR: dependencia encontrado en payloadFinal, eliminando')
      delete payloadFinal.data.dependencia
    }
    
    console.log('[API /persona-trayectorias POST] 📤 Enviando a Strapi (payload final):', JSON.stringify(payloadFinal, null, 2))
    console.log('[API /persona-trayectorias POST] 📋 Campos finales en payload.data:', Object.keys(payloadFinal.data))
    console.log('[API /persona-trayectorias POST] ✅ Verificación - region en payload:', 'region' in payloadFinal.data)
    console.log('[API /persona-trayectorias POST] ✅ Verificación - comuna en payload:', 'comuna' in payloadFinal.data)
    console.log('[API /persona-trayectorias POST] ✅ Verificación - dependencia en payload:', 'dependencia' in payloadFinal.data)
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
    // ⚠️ VERIFICACIÓN FINAL: Crear un objeto completamente nuevo desde cero
    // NO usar JSON.parse(JSON.stringify()) porque puede preservar propiedades no enumerables
    const payloadParaEnviar: any = {
      data: {}
    }
    
    // Agregar SOLO los campos que están explícitamente permitidos
    if (payloadFinal.data.persona) {
      payloadParaEnviar.data.persona = payloadFinal.data.persona
    }
    if (payloadFinal.data.colegio) {
      payloadParaEnviar.data.colegio = payloadFinal.data.colegio
    }
    if (payloadFinal.data.cargo !== undefined) {
      payloadParaEnviar.data.cargo = payloadFinal.data.cargo
    }
    if (payloadFinal.data.is_current !== undefined) {
      payloadParaEnviar.data.is_current = payloadFinal.data.is_current
    }
    if (payloadFinal.data.activo !== undefined) {
      payloadParaEnviar.data.activo = payloadFinal.data.activo
    }
    if (payloadFinal.data.anio !== undefined) {
      payloadParaEnviar.data.anio = payloadFinal.data.anio
    }
    if (payloadFinal.data.curso) {
      payloadParaEnviar.data.curso = payloadFinal.data.curso
    }
    if (payloadFinal.data.asignatura) {
      payloadParaEnviar.data.asignatura = payloadFinal.data.asignatura
    }
    if (payloadFinal.data.fecha_inicio) {
      payloadParaEnviar.data.fecha_inicio = payloadFinal.data.fecha_inicio
    }
    if (payloadFinal.data.fecha_fin) {
      payloadParaEnviar.data.fecha_fin = payloadFinal.data.fecha_fin
    }
    if (payloadFinal.data.notas) {
      payloadParaEnviar.data.notas = payloadFinal.data.notas
    }
    
    // ⚠️ VERIFICACIÓN ABSOLUTA: Verificar que NO hay campos prohibidos
    const camposEnPayloadFinal = Object.keys(payloadParaEnviar.data)
    const camposProhibidosEnPayloadFinal = camposEnPayloadFinal.filter(c => camposProhibidos.has(c))
    if (camposProhibidosEnPayloadFinal.length > 0) {
      console.error('[API /persona-trayectorias POST] ❌ ERROR CRÍTICO: Campos prohibidos en payloadParaEnviar:', camposProhibidosEnPayloadFinal)
      camposProhibidosEnPayloadFinal.forEach(campo => delete payloadParaEnviar.data[campo])
    }
    
    // Verificar explícitamente que NO existe 'region'
    if ('region' in payloadParaEnviar.data) {
      console.error('[API /persona-trayectorias POST] ❌ ERROR CRÍTICO: region encontrado en payloadParaEnviar.data')
      delete payloadParaEnviar.data.region
    }
    
    // Verificar que el objeto no tiene propiedades ocultas
    const stringPayload = JSON.stringify(payloadParaEnviar)
    const parsedPayload = JSON.parse(stringPayload)
    
    // Verificar una vez más después de parsear
    if ('region' in parsedPayload.data) {
      console.error('[API /persona-trayectorias POST] ❌ ERROR CRÍTICO: region encontrado después de JSON.parse')
      delete parsedPayload.data.region
    }
    
    // ⚠️ VERIFICACIÓN FINAL ABSOLUTA: Convertir a string y parsear de nuevo para asegurar limpieza
    const payloadString = JSON.stringify(parsedPayload)
    const payloadFinalLimpio = JSON.parse(payloadString)
    
    // Eliminar explícitamente cualquier campo prohibido que pueda haber quedado
    const camposProhibidosFinal = ['region', 'comuna', 'dependencia', 'zona', 'colegio_nombre', 'rbd', 'telefonos', 'emails', 'direcciones', 'website', 'estado']
    camposProhibidosFinal.forEach(campo => {
      if (campo in payloadFinalLimpio.data) {
        console.error(`[API /persona-trayectorias POST] ❌ ERROR: ${campo} encontrado en payloadFinalLimpio, eliminando`)
        delete payloadFinalLimpio.data[campo]
      }
    })
    
    console.log('[API /persona-trayectorias POST] 📤 Payload FINAL para enviar a Strapi:', JSON.stringify(payloadFinalLimpio, null, 2))
    console.log('[API /persona-trayectorias POST] 📋 Campos en payloadFinalLimpio.data:', Object.keys(payloadFinalLimpio.data))
    console.log('[API /persona-trayectorias POST] ✅ Verificación final - tiene region:', 'region' in payloadFinalLimpio.data)
    console.log('[API /persona-trayectorias POST] ✅ Verificación final - tiene comuna:', 'comuna' in payloadFinalLimpio.data)
    console.log('[API /persona-trayectorias POST] ✅ Verificación final - tiene dependencia:', 'dependencia' in payloadFinalLimpio.data)
    console.log('[API /persona-trayectorias POST] ✅ Payload como string (para verificar):', payloadString)
    
    const response = await strapiClient.post<StrapiResponse<StrapiEntity<any>>>(
      '/api/persona-trayectorias',
      payloadFinalLimpio
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
