/**
 * API Route para probar modelos de Gemini disponibles
 * GET /api/crm/listas/test-gemini
 */

import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyAhX5ME_MGEwIaMsvO0Ab7SnkA38BuEJi0'

// Modelos principales (fallbacks si la API no retorna modelos)
const MODELOS_PRINCIPALES = [
  'gemini-2.5-flash',      // Primero: más rápido y disponible
  'gemini-2.5-flash-lite', // Segundo: versión lite
  'gemini-1.5-flash',      // Fallback antiguo
  'gemini-1.5-pro',        // Fallback antiguo
]

export async function GET(request: NextRequest) {
  try {
    // Primero intentar listar modelos disponibles usando la API REST
    let modelosDesdeAPI: string[] = []
    let modelosDisponiblesAPI: any[] = []
    
    try {
      console.log('[Test Gemini] 📋 Listando modelos disponibles desde API REST...')
      
      // Intentar con v1 primero
      const responseV1 = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${GEMINI_API_KEY}`)
      if (responseV1.ok) {
        const dataV1 = await responseV1.json()
        modelosDisponiblesAPI = dataV1.models || []
        modelosDesdeAPI = modelosDisponiblesAPI
          .map((m: any) => m.name?.replace('models/', '') || '')
          .filter((name: string) => name && name.includes('gemini'))
        console.log('[Test Gemini] ✅ Modelos encontrados desde API v1:', modelosDesdeAPI)
      } else {
        // Intentar con v1beta como fallback
        console.log('[Test Gemini] ⚠️ API v1 falló, intentando v1beta...')
        const responseV1Beta = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`)
        if (responseV1Beta.ok) {
          const dataV1Beta = await responseV1Beta.json()
          modelosDisponiblesAPI = dataV1Beta.models || []
          modelosDesdeAPI = modelosDisponiblesAPI
            .map((m: any) => m.name?.replace('models/', '') || '')
            .filter((name: string) => name && name.includes('gemini'))
          console.log('[Test Gemini] ✅ Modelos encontrados desde API v1beta:', modelosDesdeAPI)
        }
      }
    } catch (apiError: any) {
      console.warn('[Test Gemini] ⚠️ No se pudo listar modelos desde API:', apiError.message)
    }
    
    // Combinar modelos desde API con modelos principales
    const modelosParaProbar = [
      ...modelosDesdeAPI,
      ...MODELOS_PRINCIPALES.filter(m => !modelosDesdeAPI.includes(m))
    ]
    
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    const resultados: Array<{ modelo: string; disponible: boolean; error?: string }> = []
    
    // Probar todos los modelos
    for (const modeloNombre of modelosParaProbar) {
      try {
        console.log(`[Test Gemini] 🔍 Probando modelo: ${modeloNombre}`)
        const model = genAI.getGenerativeModel({ model: modeloNombre })
        
        // Intentar una prueba simple de generación de texto
        const result = await model.generateContent('Responde solo con: OK')
        const response = await result.response
        const text = response.text()
        
        if (text && text.trim().length > 0) {
          resultados.push({ modelo: modeloNombre, disponible: true })
          console.log(`[Test Gemini] ✅ Modelo ${modeloNombre} disponible y funcional`)
        } else {
          resultados.push({ 
            modelo: modeloNombre, 
            disponible: false, 
            error: 'El modelo respondió pero sin contenido' 
          })
        }
      } catch (error: any) {
        resultados.push({ 
          modelo: modeloNombre, 
          disponible: false, 
          error: error.message || 'Error desconocido' 
        })
        console.log(`[Test Gemini] ❌ Modelo ${modeloNombre} no disponible:`, error.message)
      }
    }
    
    const modelosDisponibles = resultados.filter(r => r.disponible)
    
    // Si no hay modelos disponibles, intentar usar la API REST directamente
    if (modelosDisponibles.length === 0 && modelosDisponiblesAPI.length > 0) {
      console.log('[Test Gemini] 🔄 Intentando usar API REST directamente...')
      
      // Probar el primer modelo de la lista usando API REST
      const primerModelo = modelosDisponiblesAPI[0]
      const nombreModelo = primerModelo.name?.replace('models/', '') || ''
      
      try {
        const testResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/${nombreModelo}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: 'Responde solo con: OK'
                }]
              }]
            })
          }
        )
        
        if (testResponse.ok) {
          const testData = await testResponse.json()
          if (testData.candidates && testData.candidates.length > 0) {
            resultados.push({ modelo: nombreModelo, disponible: true })
            console.log(`[Test Gemini] ✅ Modelo ${nombreModelo} funciona con API REST directa`)
          }
        }
      } catch (restError: any) {
        console.warn(`[Test Gemini] ⚠️ Error con API REST directa:`, restError.message)
      }
    }
    
    const modelosDisponiblesFinal = resultados.filter(r => r.disponible)
    
    return NextResponse.json({
      success: true,
      modelosDisponibles: modelosDisponiblesFinal.map(r => r.modelo),
      todosLosResultados: resultados,
      modelosDesdeAPI: modelosDesdeAPI,
      totalModelosAPI: modelosDisponiblesAPI.length,
      recomendacion: modelosDisponiblesFinal.length > 0 
        ? `Usar modelo: ${modelosDisponiblesFinal[0].modelo}`
        : `Ningún modelo disponible. Se encontraron ${modelosDisponiblesAPI.length} modelos en la API pero no funcionan con el SDK. Puede que necesites usar la API REST directamente o verificar permisos en Google Cloud Console: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com`,
    }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al probar modelos',
      },
      { status: 500 }
    )
  }
}
