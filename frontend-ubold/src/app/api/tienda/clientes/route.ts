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
    
    // Usar populate=* para obtener todas las relaciones, incluyendo Persona con teléfonos
    const response = await strapiClient.get<StrapiResponse<StrapiEntity<WOClienteAttributes>>>(
      `${endpointUsed}?populate[persona][populate][telefonos]=*&populate[persona][populate][emails]=*&populate=*&pagination[pageSize]=1000&sort=nombre:asc`
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

    // Buscar email de tipo "Personal" o tomar el primero disponible
    const emailPrincipal = personaData.emails.find((e: any) => e.tipo === 'Personal') || personaData.emails[0]
    if (!emailPrincipal?.email || !emailPrincipal.email.trim()) {
      return NextResponse.json({
        success: false,
        error: 'El correo electrónico es obligatorio'
      }, { status: 400 })
    }

    // Validar que el RUT no exista ya en Persona (si se proporciona)
    if (personaData.rut && personaData.rut.trim()) {
      try {
        const rutLimpio = personaData.rut.trim().replace(/[.-]/g, '').toUpperCase()
        const rutFormateado = rutLimpio.length >= 2 
          ? `${rutLimpio.slice(0, -1)}-${rutLimpio.slice(-1)}`
          : personaData.rut.trim()
        
        console.log('[API Clientes POST] 🔍 Verificando si el RUT ya existe:', rutFormateado)
        
        // Buscar Persona por RUT (buscar tanto con guión como sin guión para mayor compatibilidad)
        const rutParaBuscar = rutFormateado.replace(/-/g, '')
        const searchResponse = await strapiClient.get<any>(
          `/api/personas?filters[rut][$contains]=${encodeURIComponent(rutParaBuscar)}&pagination[pageSize]=100`
        )
        
        const personasExistentes = searchResponse.data && Array.isArray(searchResponse.data) 
          ? searchResponse.data 
          : (searchResponse.data ? [searchResponse.data] : [])
        
        // Verificar si alguna persona tiene exactamente el mismo RUT (comparando con y sin guión)
        const rutExiste = personasExistentes.some((persona: any) => {
          const personaAttrs = persona.attributes || persona
          const personaRut = personaAttrs.rut || persona.rut
          if (!personaRut) return false
          
          // Comparar RUTs normalizados (sin puntos, guiones, espacios, en mayúsculas)
          const rutPersonaNormalizado = personaRut.toString().replace(/[.-]/g, '').replace(/\s/g, '').toUpperCase()
          const rutIngresadoNormalizado = rutParaBuscar.replace(/[.-]/g, '').replace(/\s/g, '').toUpperCase()
          
          return rutPersonaNormalizado === rutIngresadoNormalizado
        })
        
        if (rutExiste) {
          console.log('[API Clientes POST] ❌ RUT ya existe en Persona:', rutFormateado)
          return NextResponse.json({
            success: false,
            error: `El RUT ${rutFormateado} ya está registrado. Cada cliente debe tener un RUT único.`
          }, { status: 400 })
        }
        
        console.log('[API Clientes POST] ✅ RUT no existe, puede proceder con la creación')
      } catch (rutCheckError: any) {
        console.error('[API Clientes POST] ⚠️ Error al verificar RUT:', rutCheckError.message)
        // No bloquear la creación si hay un error al verificar el RUT, pero loguear el error
        // En producción, podrías querer bloquear, pero por ahora permitimos continuar
      }
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
          tipo: e.tipo || 'Personal', // Valores válidos: "Personal", "Laboral", "Institucional"
        })),
        genero: personaData.genero || null,
        // NOTA: Los telefonos se omiten del POST inicial porque Strapi rechaza el campo
        // Se pueden agregar después con un PUT si es necesario
      },
    }
    
    // Guardar telefonos para agregarlos después si es necesario
    const telefonosParaAgregar = personaData.telefonos && Array.isArray(personaData.telefonos) && personaData.telefonos.length > 0
      ? personaData.telefonos
      : null
    
    if (telefonosParaAgregar) {
      console.log('[API Clientes POST] ℹ️ Teléfonos detectados pero se omitirán del POST inicial (Strapi rechaza el campo)')
    }

    const personaResponse = await strapiClient.post('/api/personas', personaCreateData) as any
    // En Strapi v4, usar documentId (string) para relaciones, no el id numérico
    const personaDocumentId = personaResponse.data?.documentId || personaResponse.data?.id?.toString() || personaResponse.documentId || personaResponse.id?.toString()
    const personaId = personaResponse.data?.id || personaResponse.data?.documentId || personaResponse.id || personaResponse.documentId // Mantener para logging
    console.log('[API Clientes POST] ✅ Persona creada en Strapi:', { id: personaId, documentId: personaDocumentId })
    
    // Si hay telefonos, intentar agregarlos después con un PUT
    if (telefonosParaAgregar && personaDocumentId) {
      try {
        console.log('[API Clientes POST] 📞 Intentando agregar telefonos después de crear la persona...')
        // Formatear telefonos según el schema de Strapi (telefono_raw, telefono_norm, tipo, principal, etc.)
        // NOTA: tipo debe ser uno de: "Personal", "Laboral", "Institucional" (igual que emails)
        const telefonosFormateados = telefonosParaAgregar.map((t: any) => {
          const telefonoValue = (t.numero || t.telefono || t.telefono_raw || t.telefono_norm || t.value || '').trim()
          // Validar que tipo sea uno de los valores permitidos, sino usar null
          let tipoValido = null
          if (t.tipo && ['Personal', 'Laboral', 'Institucional'].includes(t.tipo)) {
            tipoValido = t.tipo
          }
          
          // Usar telefono_raw y telefono_norm (ambos con el mismo valor por ahora)
          // El usuario puede normalizar después si lo necesita
          return {
            telefono_raw: telefonoValue,
            telefono_norm: telefonoValue, // Por ahora usar el mismo valor, se puede normalizar después
            tipo: tipoValido, // Solo valores válidos: "Personal", "Laboral", "Institucional" o null
            principal: t.principal !== undefined ? t.principal : true, // Por defecto true para el primer teléfono
            status: t.status !== undefined ? t.status : true, // Por defecto true (vigente)
          }
        })
        
        const updateData = {
          data: {
            telefonos: telefonosFormateados,
          },
        }
        
        await strapiClient.put(`/api/personas/${personaDocumentId}`, updateData)
        console.log('[API Clientes POST] ✅ Teléfonos agregados exitosamente')
      } catch (telefonoError: any) {
        console.error('[API Clientes POST] ❌ Error al agregar telefonos:', telefonoError.message)
        if (telefonoError.response?.data) {
          console.error('[API Clientes POST] ❌ Detalles del error:', JSON.stringify(telefonoError.response.data, null, 2))
        }
        console.warn('[API Clientes POST] ⚠️ La persona se creó correctamente pero sin telefonos')
        // No fallar si los telefonos no se pueden agregar
      }
    }

    // 2. Enviar cliente a ambos WordPress primero
    console.log('[API Clientes POST] 🌐 Enviando cliente a WordPress...')
    const nombresWordPress = personaData.nombres?.trim() || personaData.nombre_completo.trim()
    const apellidoWordPress = personaData.primer_apellido?.trim() || ''
    
    // Determinar a qué plataformas enviar basado en las plataformas seleccionadas
    // Si no se especifican, enviar a ambas por defecto
    const plataformasSeleccionadas = body.data.canales || []
    const enviarAMoraleja = plataformasSeleccionadas.length === 0 || plataformasSeleccionadas.includes('woo_moraleja') || plataformasSeleccionadas.some((c: any) => 
      typeof c === 'string' && (c.toLowerCase().includes('moraleja') || c.toLowerCase().includes('woo_moraleja'))
    )
    const enviarAEscolar = plataformasSeleccionadas.length === 0 || plataformasSeleccionadas.includes('woo_escolar') || plataformasSeleccionadas.some((c: any) => 
      typeof c === 'string' && (c.toLowerCase().includes('escolar') || c.toLowerCase().includes('woo_escolar'))
    )
    
    console.log('[API Clientes POST] 🎯 Plataformas seleccionadas:', {
      plataformasSeleccionadas,
      enviarAMoraleja,
      enviarAEscolar,
    })
    
    let wordPressResults: any = null
    try {
      // Enviar a ambos WordPress siempre (la función maneja ambos)
      wordPressResults = await enviarClienteABothWordPress({
        email: emailPrincipal.email.trim(),
        first_name: nombresWordPress,
        last_name: apellidoWordPress,
      })
      console.log('[API Clientes POST] ✅ Cliente enviado a WordPress:', {
        escolar: wordPressResults.escolar.success,
        moraleja: wordPressResults.moraleja.success,
      })
      // Log detallado de la estructura completa para diagnóstico
      console.log('[API Clientes POST] 📊 Estructura completa de wordPressResults:', JSON.stringify({
        escolar: {
          success: wordPressResults.escolar?.success,
          hasData: !!wordPressResults.escolar?.data,
          dataId: wordPressResults.escolar?.data?.id,
          error: wordPressResults.escolar?.error,
          fullData: wordPressResults.escolar?.data,
        },
        moraleja: {
          success: wordPressResults.moraleja?.success,
          hasData: !!wordPressResults.moraleja?.data,
          dataId: wordPressResults.moraleja?.data?.id,
          error: wordPressResults.moraleja?.error,
          fullData: wordPressResults.moraleja?.data,
        },
      }, null, 2))
    } catch (wpError: any) {
      console.error('[API Clientes POST] ⚠️ Error al enviar a WordPress:', wpError.message)
      // Si falla completamente, aún podemos crear las entradas WO-Clientes sin los IDs de WordPress
      wordPressResults = {
        escolar: { success: false, error: wpError.message },
        moraleja: { success: false, error: wpError.message },
      }
    }

    // 3. Crear WO-Clientes en Strapi - DOS entradas (una por plataforma seleccionada)
    console.log('[API Clientes POST] 📦 Creando WO-Clientes en Strapi...')
    const nombreCliente = personaData.nombre_completo.trim()
    const woClientesCreados: any[] = []
    
    // Crear entrada para Moraleja si se seleccionó
    if (enviarAMoraleja) {
      try {
        const woClienteMoralejaData: any = {
          data: {
            nombre: nombreCliente,
            correo_electronico: emailPrincipal.email.trim(),
            pedidos: body.data.pedidos ? parseInt(body.data.pedidos) || 0 : 0,
            gasto_total: body.data.gasto_total ? parseFloat(body.data.gasto_total) || 0 : 0,
            fecha_registro: body.data.fecha_registro || new Date().toISOString(),
            persona: personaDocumentId, // Usar documentId para la relación (Strapi v4 requiere string)
            originPlatform: 'woo_moraleja', // Campo para identificar la plataforma
          },
        }
        
        if (body.data.ultima_actividad) {
          woClienteMoralejaData.data.ultima_actividad = body.data.ultima_actividad
        }
        
        // Si tenemos el ID de WooCommerce de Moraleja, guardarlo
        // NOTA: woocommerce_id puede no existir en el schema de WO-Clientes, omitir si da error
        // Verificar múltiples posibles estructuras de respuesta
        const moralejaId = wordPressResults?.moraleja?.data?.id || 
                          wordPressResults?.moraleja?.id ||
                          (wordPressResults?.moraleja?.data && typeof wordPressResults.moraleja.data === 'object' && 'id' in wordPressResults.moraleja.data ? wordPressResults.moraleja.data.id : null)
        
        if (wordPressResults?.moraleja?.success && moralejaId) {
          // Comentar woocommerce_id si no existe en el schema de WO-Clientes
          // woClienteMoralejaData.data.woocommerce_id = moralejaId
          console.log('[API Clientes POST] 📌 ID de WooCommerce Moraleja obtenido:', moralejaId, '(no se guardará en Strapi si el campo no existe)')
        } else {
          console.log('[API Clientes POST] ⚠️ No se pudo obtener ID de WooCommerce Moraleja', {
            success: wordPressResults?.moraleja?.success,
            hasData: !!wordPressResults?.moraleja?.data,
            dataId: wordPressResults?.moraleja?.data?.id,
            moralejaId,
            error: wordPressResults?.moraleja?.error,
          })
        }
        
        const woClienteMoralejaResponse = await strapiClient.post('/api/wo-clientes', woClienteMoralejaData) as any
        woClientesCreados.push({
          platform: 'woo_moraleja',
          response: woClienteMoralejaResponse,
        })
        console.log('[API Clientes POST] ✅ Cliente creado en WO-Clientes (Moraleja):', woClienteMoralejaResponse.data?.id || woClienteMoralejaResponse.id || woClienteMoralejaResponse.data?.documentId)
      } catch (error: any) {
        console.error('[API Clientes POST] ❌ Error al crear WO-Clientes (Moraleja):', error.message)
      }
    }
    
    // Crear entrada para Escolar si se seleccionó
    if (enviarAEscolar) {
      try {
        console.log('[API Clientes POST] 📝 Iniciando creación de WO-Clientes (Escolar)...')
        const woClienteEscolarData: any = {
          data: {
            nombre: nombreCliente,
            correo_electronico: emailPrincipal.email.trim(),
            pedidos: body.data.pedidos ? parseInt(body.data.pedidos) || 0 : 0,
            gasto_total: body.data.gasto_total ? parseFloat(body.data.gasto_total) || 0 : 0,
            fecha_registro: body.data.fecha_registro || new Date().toISOString(),
            persona: personaDocumentId, // Usar documentId para la relación (Strapi v4 requiere string)
            originPlatform: 'woo_escolar', // Campo para identificar la plataforma
          },
        }
        
        if (body.data.ultima_actividad) {
          woClienteEscolarData.data.ultima_actividad = body.data.ultima_actividad
        }
        
        // Si tenemos el ID de WooCommerce de Escolar, guardarlo
        // NOTA: woocommerce_id puede no existir en el schema de WO-Clientes, omitir si da error
        // Verificar múltiples posibles estructuras de respuesta
        const escolarId = wordPressResults?.escolar?.data?.id || 
                         wordPressResults?.escolar?.id ||
                         (wordPressResults?.escolar?.data && typeof wordPressResults.escolar.data === 'object' && 'id' in wordPressResults.escolar.data ? wordPressResults.escolar.data.id : null)
        
        if (wordPressResults?.escolar?.success && escolarId) {
          // Comentar woocommerce_id si no existe en el schema de WO-Clientes
          // woClienteEscolarData.data.woocommerce_id = escolarId
          console.log('[API Clientes POST] 📌 ID de WooCommerce Escolar obtenido:', escolarId, '(no se guardará en Strapi si el campo no existe)')
        } else {
          console.log('[API Clientes POST] ⚠️ No se pudo obtener ID de WooCommerce Escolar', {
            success: wordPressResults?.escolar?.success,
            hasData: !!wordPressResults?.escolar?.data,
            dataId: wordPressResults?.escolar?.data?.id,
            escolarId,
            error: wordPressResults?.escolar?.error,
          })
        }
        
        console.log('[API Clientes POST] 📤 Enviando datos a Strapi para WO-Clientes (Escolar):', JSON.stringify(woClienteEscolarData, null, 2))
        const woClienteEscolarResponse = await strapiClient.post('/api/wo-clientes', woClienteEscolarData) as any
        woClientesCreados.push({
          platform: 'woo_escolar',
          response: woClienteEscolarResponse,
        })
        console.log('[API Clientes POST] ✅ Cliente creado en WO-Clientes (Escolar):', {
          id: woClienteEscolarResponse.data?.id || woClienteEscolarResponse.id,
          documentId: woClienteEscolarResponse.data?.documentId || woClienteEscolarResponse.documentId,
          nombre: woClienteEscolarResponse.data?.attributes?.nombre || woClienteEscolarResponse.data?.nombre,
          originPlatform: woClienteEscolarResponse.data?.attributes?.originPlatform || woClienteEscolarResponse.data?.originPlatform,
          woocommerce_id: woClienteEscolarResponse.data?.attributes?.woocommerce_id || woClienteEscolarResponse.data?.woocommerce_id,
        })
      } catch (error: any) {
        console.error('[API Clientes POST] ❌ Error al crear WO-Clientes (Escolar):', error.message)
        if (error.response?.data) {
          console.error('[API Clientes POST] ❌ Detalles del error de Strapi:', JSON.stringify(error.response.data, null, 2))
        }
        // No lanzar el error para que continúe con Moraleja si es necesario
      }
    } else {
      console.log('[API Clientes POST] ⏭️ Saltando creación de WO-Clientes (Escolar) - no seleccionado')
    }
    
    if (woClientesCreados.length === 0) {
      console.warn('[API Clientes POST] ⚠️ No se crearon entradas WO-Clientes (ninguna plataforma seleccionada o error)')
    }
    
    return NextResponse.json({
      success: true,
      data: woClientesCreados.length > 0 ? woClientesCreados.map(c => c.response) : null,
      persona: personaResponse,
      wordpress: wordPressResults,
      message: `Cliente creado exitosamente. Entradas WO-Clientes creadas: ${woClientesCreados.length} (${woClientesCreados.map(c => c.platform).join(', ') || 'ninguna'})`
    })
  } catch (error: any) {
    console.error('[API Clientes POST] ❌ Error:', error.message)
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al crear el cliente'
    }, { status: 500 })
  }
}

