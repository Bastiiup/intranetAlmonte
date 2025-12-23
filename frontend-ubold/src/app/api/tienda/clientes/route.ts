/**
 * API Route para obtener clientes desde Strapi (WO-Clientes)
 * Esto evita exponer el token de Strapi en el cliente
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'
import { parseNombreCompleto, enviarClienteABothWordPress } from '@/lib/clientes/utils'

export const dynamic = 'force-dynamic'

interface WOClienteAttributes {
  nombre?: string
  NOMBRE?: string  // Puede venir en mayúsculas desde Strapi
  correo_electronico: string
  ultima_actividad?: string
  fecha_registro?: string
  pedidos?: number
  gasto_total?: number
  // Nota: telefono y direccion no existen en el schema de WO-Clientes
  createdAt?: string
  updatedAt?: string
}

export async function GET() {
  try {
    // Verificar que el token esté configurado
    const token = process.env.STRAPI_API_TOKEN
    if (!token) {
      console.error('[API /tienda/clientes] STRAPI_API_TOKEN no está configurado')
      return NextResponse.json(
        { 
          success: false,
          error: 'STRAPI_API_TOKEN no está configurado. Verifica las variables de entorno.',
          data: [],
          meta: {},
        },
        { status: 500 }
      )
    }

    // Endpoint de WO-Clientes
    const endpointUsed = '/api/wo-clientes'
    
    console.log('[API /tienda/clientes] Intentando obtener clientes:', {
      endpoint: endpointUsed,
      tieneToken: !!token,
    })
    
    // Usar populate=* para obtener todas las relaciones
    const response = await strapiClient.get<StrapiResponse<StrapiEntity<WOClienteAttributes>>>(
      `${endpointUsed}?populate=*&pagination[pageSize]=1000&sort=nombre:asc`
    )
    
    // Log detallado para debugging
    console.log('[API /tienda/clientes] Respuesta de Strapi exitosa:', {
      endpoint: endpointUsed,
      hasData: !!response.data,
      isArray: Array.isArray(response.data),
      count: Array.isArray(response.data) ? response.data.length : response.data ? 1 : 0,
    })
    
    // Log del primer cliente para verificar estructura
    if (response.data && (Array.isArray(response.data) ? response.data[0] : response.data)) {
      const primerCliente = Array.isArray(response.data) ? response.data[0] : response.data
      console.log('[API /tienda/clientes] Primer cliente estructura:', {
        id: primerCliente.id,
        tieneAttributes: !!primerCliente.attributes,
        keysAttributes: primerCliente.attributes ? Object.keys(primerCliente.attributes).slice(0, 10) : [],
      })
    }
    
    return NextResponse.json({
      success: true,
      data: response.data || [],
      meta: response.meta || {},
      endpoint: endpointUsed,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /tienda/clientes] Error al obtener clientes:', {
      message: error.message,
      status: error.status,
      details: error.details,
      stack: error.stack,
      url: process.env.NEXT_PUBLIC_STRAPI_URL,
      tieneToken: !!process.env.STRAPI_API_TOKEN,
    })
    
    // Si es un error 502, puede ser un problema de conexión con Strapi
    if (error.status === 502) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Error 502: No se pudo conectar con Strapi. Verifica que el servidor de Strapi esté disponible y que las variables de entorno estén configuradas correctamente.',
          data: [],
          meta: {},
        },
        { status: 502 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Error al obtener clientes',
        data: [],
        meta: {},
      },
      { status: error.status || 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[API Clientes POST] 📝 Creando cliente:', body)

    // Validar datos de Persona (obligatorios)
    const personaData = body.data?.persona
    if (!personaData?.nombre_completo || !personaData.nombre_completo.trim()) {
      return NextResponse.json({
        success: false,
        error: 'El nombre completo de la persona es obligatorio'
      }, { status: 400 })
    }

    if (!personaData?.emails || !Array.isArray(personaData.emails) || personaData.emails.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'El correo electrónico es obligatorio'
      }, { status: 400 })
    }

    const emailPrincipal = personaData.emails.find((e: any) => e.tipo === 'principal') || personaData.emails[0]
    if (!emailPrincipal?.email || !emailPrincipal.email.trim()) {
      return NextResponse.json({
        success: false,
        error: 'El correo electrónico es obligatorio'
      }, { status: 400 })
    }

    // 1. Crear Persona primero (Strapi)
    console.log('[API Clientes POST] 📚 Creando Persona en Strapi...')
    const personaCreateData: any = {
      data: {
        rut: personaData.rut?.trim() || null,
        nombres: personaData.nombres?.trim() || null,
        primer_apellido: personaData.primer_apellido?.trim() || null,
        segundo_apellido: personaData.segundo_apellido?.trim() || null,
        nombre_completo: personaData.nombre_completo.trim(),
        emails: personaData.emails.map((e: any) => ({
          email: e.email.trim(),
          tipo: e.tipo || 'principal',
        })),
        telefonos: personaData.telefonos && Array.isArray(personaData.telefonos) && personaData.telefonos.length > 0
          ? personaData.telefonos.map((t: any) => ({
              telefono: (t.telefono || t.numero || '').trim(),
              tipo: t.tipo || 'principal',
            }))
          : [],
      },
    }

    const personaResponse = await strapiClient.post('/api/personas', personaCreateData) as any
    const personaId = personaResponse.data?.id || personaResponse.data?.documentId || personaResponse.id || personaResponse.documentId
    console.log('[API Clientes POST] ✅ Persona creada en Strapi:', personaId)

    // 2. Crear WO-Clientes con relación a Persona
    console.log('[API Clientes POST] 📦 Creando WO-Clientes en Strapi...')
    
    // Construir nombre para WO-Clientes desde Persona
    const nombreCliente = personaData.nombre_completo.trim()
    
    const woClienteData: any = {
      data: {
        nombre: nombreCliente,
        correo_electronico: emailPrincipal.email.trim(),
        pedidos: body.data.pedidos ? parseInt(body.data.pedidos) || 0 : 0,
        gasto_total: body.data.gasto_total ? parseFloat(body.data.gasto_total) || 0 : 0,
        fecha_registro: body.data.fecha_registro || new Date().toISOString(),
        persona: personaId, // Relación con Persona
      },
    }
    
    if (body.data.ultima_actividad) {
      woClienteData.data.ultima_actividad = body.data.ultima_actividad
    }

    const woClienteResponse = await strapiClient.post('/api/wo-clientes', woClienteData) as any
    console.log('[API Clientes POST] ✅ Cliente creado en WO-Clientes:', woClienteResponse.id || woClienteResponse.documentId || woClienteResponse.data?.id || woClienteResponse.data?.documentId)
    
    // 3. Enviar a ambos WordPress
    let wordPressResults: any = null
    try {
      // Usar nombres de Persona para WordPress
      const nombresWordPress = personaData.nombres?.trim() || personaData.nombre_completo.trim()
      const apellidoWordPress = personaData.primer_apellido?.trim() || ''
      
      wordPressResults = await enviarClienteABothWordPress({
        email: emailPrincipal.email.trim(),
        first_name: nombresWordPress,
        last_name: apellidoWordPress,
      })
      console.log('[API Clientes POST] ✅ Cliente enviado a WordPress:', {
        escolar: wordPressResults.escolar.success,
        moraleja: wordPressResults.moraleja.success,
      })
    } catch (wpError: any) {
      console.error('[API Clientes POST] ⚠️ Error al enviar a WordPress (no crítico):', wpError.message)
      // No fallar si WordPress falla
    }
    
    return NextResponse.json({
      success: true,
      data: woClienteResponse,
      persona: personaResponse,
      wordpress: wordPressResults || null,
    })
  } catch (error: any) {
    console.error('[API Clientes POST] ❌ Error:', error.message)
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al crear el cliente'
    }, { status: 500 })
  }
}

