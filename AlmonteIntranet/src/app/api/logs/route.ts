import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/logs
 * Obtiene los logs de actividades del sistema
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '100')
    const sort = searchParams.get('sort') || 'fecha:desc'

    console.log('[API /logs] Obteniendo logs:', { page, pageSize, sort })

    // Construir query de Strapi
    // El Content Type "Log de Actividades" en Strapi se convierte a "activity-logs" en la API
    // Usar populate selectivo para usuario (relación con Colaboradores)
    const sortField = sort.split(':')[0] || 'fecha'
    const sortOrder = sort.split(':')[1] || 'desc'
    
    const response = await strapiClient.get<any>(
      `/api/activity-logs?populate[usuario][populate]=*&pagination[page]=${page}&pagination[pageSize]=${pageSize}&sort=${sortField}:${sortOrder}`
    )

    let items: any[] = []
    let pagination: any = {}

    if (Array.isArray(response)) {
      items = response
    } else if (response.data) {
      if (Array.isArray(response.data)) {
        items = response.data
      } else {
        items = [response.data]
      }
      pagination = response.pagination || {}
    } else {
      items = [response]
    }

    // Log de depuración: ver estructura del primer log
    if (items.length > 0) {
      console.log('[API /logs] 🔍 Estructura del primer log:', JSON.stringify(items[0], null, 2).substring(0, 500))
    }

    console.log('[API /logs] ✅ Logs obtenidos:', items.length)

    return NextResponse.json({
      success: true,
      data: items,
      pagination,
    })
  } catch (error: any) {
    console.error('[API /logs] ❌ Error:', error.message)
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener logs',
        data: [],
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * POST /api/logs
 * Crea un nuevo log de actividad (para posts del timeline)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accion, entidad, descripcion, metadata } = body
    
    if (!descripcion || !descripcion.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'La descripción es requerida',
        },
        { status: 400 }
      )
    }
    
    // Obtener usuario autenticado desde cookies del servidor
    // Buscar en múltiples nombres de cookie para compatibilidad
    const cookieStore = await cookies()
    const cookieNames = ['auth_colaborador', 'colaboradorData', 'colaborador']
    
    let colaborador: any = null
    for (const cookieName of cookieNames) {
      const colaboradorStr = cookieStore.get(cookieName)?.value
      if (colaboradorStr) {
        try {
          colaborador = JSON.parse(colaboradorStr)
          // Asegurar que tenga id y documentId
          if (colaborador && !colaborador.documentId && colaborador.id) {
            colaborador.documentId = colaborador.id
          }
          break
        } catch (parseError) {
          console.warn(`[API /logs POST] Error al parsear cookie ${cookieName}:`, parseError)
          continue
        }
      }
    }
    
    if (!colaborador || (!colaborador.id && !colaborador.documentId)) {
      console.error('[API /logs POST] ❌ Usuario no autenticado - no se encontró colaborador en cookies')
      return NextResponse.json(
        {
          success: false,
          error: 'Usuario no autenticado',
        },
        { status: 401 }
      )
    }
    
    // Usar documentId si está disponible (Strapi v5 prefiere documentId para relaciones)
    // Si no, usar id como fallback
    const usuarioId = colaborador.documentId || colaborador.id
    
    // Obtener IP y User-Agent
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    // Preparar datos del log
    const logData: any = {
      accion: accion || 'publicar',
      entidad: entidad || 'timeline',
      descripcion: descripcion.trim(),
      usuario: usuarioId, // Usar documentId o id
      fecha: new Date().toISOString(),
      ip_address: ipAddress,
      user_agent: userAgent,
    }
    
    console.log('[API /logs POST] 📝 Creando log con usuario:', {
      colaboradorId: colaborador.id,
      colaboradorDocumentId: colaborador.documentId,
      usuarioIdEnviado: usuarioId,
      tipoUsuarioId: typeof usuarioId,
    })
    
    // Agregar metadata si existe
    if (metadata) {
      logData.metadata = typeof metadata === 'string' ? metadata : JSON.stringify(metadata)
    }
    
    // Crear log en Strapi
    const response = await strapiClient.post<any>(
      '/api/activity-logs',
      { data: logData }
    )
    
    console.log('[API /logs POST] ✅ Log creado exitosamente:', {
      logId: response?.data?.id || response?.id,
      accion: logData.accion,
      entidad: logData.entidad,
    })
    
    return NextResponse.json({
      success: true,
      data: response?.data || response,
    }, { status: 201 })
  } catch (error: any) {
    console.error('[API /logs POST] ❌ Error:', error.message)
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al crear el log',
      },
      { status: error.status || 500 }
    )
  }
}

