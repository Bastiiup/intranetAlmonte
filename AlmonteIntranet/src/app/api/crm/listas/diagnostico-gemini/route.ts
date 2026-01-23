/**
 * API Route para diagnosticar la configuración de Gemini
 * GET /api/crm/listas/diagnostico-gemini
 * 
 * Verifica la API key, lista modelos disponibles y prueba cuáles funcionan
 */

import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY
    
    const diagnostico: any = {
      timestamp: new Date().toISOString(),
      apiKeyConfigurada: !!GEMINI_API_KEY,
      apiKeyLength: GEMINI_API_KEY?.length || 0,
      apiKeyPreview: GEMINI_API_KEY ? `${GEMINI_API_KEY.substring(0, 10)}...${GEMINI_API_KEY.substring(GEMINI_API_KEY.length - 4)}` : 'No configurada',
      modelosDesdeAPI: [],
      modelosProbados: [],
      modelosFuncionales: [],
      errores: [],
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'GEMINI_API_KEY no está configurada',
        diagnostico,
        sugerencia: 'Configura GEMINI_API_KEY en Railway o .env.local'
      }, { status: 400 })
    }

    // 1. Listar modelos desde la API
    try {
      console.log('[Diagnóstico Gemini] 🔍 Listando modelos desde API v1...')
      const modelsResponseV1 = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${GEMINI_API_KEY}`)
      
      if (modelsResponseV1.ok) {
        const modelsData = await modelsResponseV1.json()
        diagnostico.modelosDesdeAPI = (modelsData.models || [])
          .map((m: any) => ({
            name: m.name?.replace('models/', '') || '',
            displayName: m.displayName || '',
            supportedGenerationMethods: m.supportedGenerationMethods || [],
            description: m.description || '',
          }))
          .filter((m: any) => m.name && m.name.includes('gemini'))
        
        console.log('[Diagnóstico Gemini] ✅ Modelos encontrados:', diagnostico.modelosDesdeAPI.length)
      } else {
        const errorText = await modelsResponseV1.text()
        diagnostico.errores.push({
          paso: 'Listar modelos desde API v1',
          status: modelsResponseV1.status,
          statusText: modelsResponseV1.statusText,
          error: errorText.substring(0, 500),
        })
        console.error('[Diagnóstico Gemini] ❌ Error al listar modelos v1:', modelsResponseV1.status, errorText)
      }
    } catch (apiError: any) {
      diagnostico.errores.push({
        paso: 'Listar modelos desde API v1',
        error: apiError.message,
        stack: apiError.stack,
      })
      console.error('[Diagnóstico Gemini] ❌ Excepción al listar modelos:', apiError.message)
    }

    // 2. Intentar con API v1beta
    try {
      console.log('[Diagnóstico Gemini] 🔍 Listando modelos desde API v1beta...')
      const modelsResponseV1Beta = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`)
      
      if (modelsResponseV1Beta.ok) {
        const modelsData = await modelsResponseV1Beta.json()
        const modelosV1Beta = (modelsData.models || [])
          .map((m: any) => ({
            name: m.name?.replace('models/', '') || '',
            displayName: m.displayName || '',
            supportedGenerationMethods: m.supportedGenerationMethods || [],
            description: m.description || '',
          }))
          .filter((m: any) => m.name && m.name.includes('gemini'))
        
        // Combinar con modelos de v1 (sin duplicados)
        const nombresExistentes = new Set(diagnostico.modelosDesdeAPI.map((m: any) => m.name))
        modelosV1Beta.forEach((m: any) => {
          if (!nombresExistentes.has(m.name)) {
            diagnostico.modelosDesdeAPI.push(m)
          }
        })
        
        console.log('[Diagnóstico Gemini] ✅ Modelos v1beta encontrados:', modelosV1Beta.length)
      } else {
        const errorText = await modelsResponseV1Beta.text()
        diagnostico.errores.push({
          paso: 'Listar modelos desde API v1beta',
          status: modelsResponseV1Beta.status,
          statusText: modelsResponseV1Beta.statusText,
          error: errorText.substring(0, 500),
        })
        console.error('[Diagnóstico Gemini] ❌ Error al listar modelos v1beta:', modelsResponseV1Beta.status, errorText)
      }
    } catch (apiError: any) {
      diagnostico.errores.push({
        paso: 'Listar modelos desde API v1beta',
        error: apiError.message,
        stack: apiError.stack,
      })
      console.error('[Diagnóstico Gemini] ❌ Excepción al listar modelos v1beta:', apiError.message)
    }

    // 3. Probar modelos con el SDK
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    
    // Modelos a probar (priorizar los más comunes)
    const modelosAPruebar = [
      'gemini-1.5-flash',
      'gemini-1.5-flash-001',
      'gemini-1.5-pro',
      'gemini-1.5-pro-001',
      'gemini-pro',
      'gemini-1.0-pro',
      'gemini-1.0-pro-001',
      ...diagnostico.modelosDesdeAPI
        .map((m: any) => m.name)
        .filter((name: string) => name && (name.includes('flash') || name.includes('pro')))
        .slice(0, 5), // Limitar a 5 modelos adicionales
    ].filter((v, i, a) => a.indexOf(v) === i) // Eliminar duplicados

    console.log('[Diagnóstico Gemini] 🔄 Probando modelos:', modelosAPruebar)

    for (const modeloNombre of modelosAPruebar.slice(0, 10)) { // Limitar a 10 modelos
      try {
        console.log(`[Diagnóstico Gemini] 🔍 Probando modelo: ${modeloNombre}`)
        const model = genAI.getGenerativeModel({ model: modeloNombre })
        
        const result = await Promise.race([
          model.generateContent('Responde solo con: OK'),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout después de 10 segundos')), 10000)
          )
        ]) as any
        
        const response = await result.response
        const text = response.text()
        
        diagnostico.modelosProbados.push({
          modelo: modeloNombre,
          disponible: true,
          funcional: true,
          respuesta: text?.trim() || '',
        })
        
        diagnostico.modelosFuncionales.push(modeloNombre)
        console.log(`[Diagnóstico Gemini] ✅ Modelo ${modeloNombre} funciona`)
        
        // Si encontramos uno que funciona, podemos parar aquí
        break
      } catch (error: any) {
        const errorMsg = error.message || String(error)
        diagnostico.modelosProbados.push({
          modelo: modeloNombre,
          disponible: false,
          funcional: false,
          error: errorMsg,
          es404: errorMsg.includes('404') || errorMsg.includes('not found') || errorMsg.includes('is not found'),
          esQuota: errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('Quota'),
        })
        console.log(`[Diagnóstico Gemini] ❌ Modelo ${modeloNombre} no funciona:`, errorMsg)
      }
    }

    // 4. Generar recomendación
    let recomendacion = ''
    if (diagnostico.modelosFuncionales.length > 0) {
      recomendacion = `✅ Usa el modelo: ${diagnostico.modelosFuncionales[0]}`
    } else if (diagnostico.modelosDesdeAPI.length > 0) {
      recomendacion = `⚠️ Se encontraron ${diagnostico.modelosDesdeAPI.length} modelos en la API pero ninguno funciona con el SDK. Puede ser un problema de permisos o versión del SDK.`
    } else if (diagnostico.errores.some((e: any) => e.status === 403 || e.status === 401)) {
      recomendacion = `❌ Error de autenticación. Verifica que la API key sea válida y tenga permisos.`
    } else if (diagnostico.errores.some((e: any) => e.status === 404)) {
      recomendacion = `❌ La API no está habilitada. Ve a https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com y habilítala.`
    } else {
      recomendacion = `❌ No se pudo conectar con la API de Gemini. Verifica la API key y que la API esté habilitada.`
    }

    return NextResponse.json({
      success: diagnostico.modelosFuncionales.length > 0,
      diagnostico,
      recomendacion,
      modeloRecomendado: diagnostico.modelosFuncionales[0] || null,
    }, { status: 200 })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Error desconocido',
      stack: error.stack,
    }, { status: 500 })
  }
}
