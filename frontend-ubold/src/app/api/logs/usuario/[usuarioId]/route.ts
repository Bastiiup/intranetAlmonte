import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/logs/usuario/[usuarioId]
 * Obtiene todos los logs de actividades de un usuario específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ usuarioId: string }> }
) {
  try {
    const { usuarioId } = await params
    const usuarioIdNum = parseInt(usuarioId)
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '100')
    const sort = searchParams.get('sort') || 'fecha:desc'

    console.log('[API /logs/usuario/[usuarioId]] Obteniendo logs del usuario:', { usuarioId, usuarioIdNum, page, pageSize, sort })

    // Construir query de Strapi
    const sortField = sort.split(':')[0] || 'fecha'
    const sortOrder = sort.split(':')[1] || 'desc'
    
    let response: any
    let usuarioInfo: any = null
    
    // Si el ID es negativo, es un usuario anónimo - buscar por IP
    if (usuarioIdNum < 0) {
      // Primero obtener la lista de usuarios para encontrar la IP asociada a este ID negativo
      const usuariosResponse = await strapiClient.get<any>(
        `/api/activity-logs?populate[usuario][populate]=*&pagination[pageSize]=10000&sort=fecha:desc`
      )
      
      let usuariosLogs: any[] = []
      if (Array.isArray(usuariosResponse)) {
        usuariosLogs = usuariosResponse
      } else if (usuariosResponse.data && Array.isArray(usuariosResponse.data)) {
        usuariosLogs = usuariosResponse.data
      }
      
      // Encontrar la IP asociada a este ID negativo
      const usuariosMap = new Map<number, string>()
      usuariosLogs.forEach((log: any) => {
        const logData = log.attributes || log
        if (!logData.usuario && logData.ip_address) {
          const ipHash = logData.ip_address.split('').reduce((acc: number, char: string) => {
            return ((acc << 5) - acc) + char.charCodeAt(0)
          }, 0)
          const anonId = -Math.abs(ipHash)
          if (!usuariosMap.has(anonId)) {
            usuariosMap.set(anonId, logData.ip_address)
          }
        }
      })
      
      const ipAddress = usuariosMap.get(usuarioIdNum)
      
      if (!ipAddress) {
        console.log('[API /logs/usuario/[usuarioId]] ⚠️ No se encontró IP para usuario anónimo:', usuarioId)
        return NextResponse.json({
          success: true,
          data: [],
          pagination: { page: 1, pageSize, pageCount: 0, total: 0 },
          usuarioId,
          usuarioInfo: {
            id: usuarioIdNum,
            nombre: 'Usuario Anónimo',
            email: 'N/A',
          },
        })
      }
      
      console.log('[API /logs/usuario/[usuarioId]] 🔍 Usuario anónimo, buscando por IP:', ipAddress)
      
      // Buscar logs sin usuario y con esta IP
      // Obtener todos los logs y filtrar por IP en el código (ya que Strapi puede no soportar bien filtros null)
      const allLogsResponse = await strapiClient.get<any>(
        `/api/activity-logs?pagination[pageSize]=10000&sort=${sortField}:${sortOrder}`
      )
      
      // Extraer logs de la respuesta
      const logsParaFiltrar: any[] = Array.isArray(allLogsResponse) 
        ? allLogsResponse 
        : (allLogsResponse.data && Array.isArray(allLogsResponse.data)) 
          ? allLogsResponse.data 
          : []
      
      // Filtrar logs sin usuario y con la IP correcta
      const filteredLogs = logsParaFiltrar.filter((log: any) => {
        const logData = log.attributes || log
        return !logData.usuario && logData.ip_address === ipAddress
      })
      
      // Aplicar paginación manual
      const startIndex = (page - 1) * pageSize
      const endIndex = startIndex + pageSize
      const items = filteredLogs.slice(startIndex, endIndex)
      const pagination = {
        page,
        pageSize,
        pageCount: Math.ceil(filteredLogs.length / pageSize),
        total: filteredLogs.length,
      }
      
      console.log('[API /logs/usuario/[usuarioId]] ✅ Logs filtrados:', items.length, 'de', filteredLogs.length)
      
      return NextResponse.json({
        success: true,
        data: items,
        pagination,
        usuarioId,
        usuarioInfo: {
          id: usuarioIdNum,
          nombre: `Usuario Anónimo (${ipAddress})`,
          email: 'N/A',
        },
      })
    } else {
      // Usuario normal - buscar por ID de usuario
      // Populate específico para traer email_login del colaborador
      response = await strapiClient.get<any>(
        `/api/activity-logs?filters[usuario][id][$eq]=${usuarioId}&populate[usuario][fields]=email_login&populate[usuario][populate][persona][fields]=nombres,primer_apellido,segundo_apellido,nombre_completo&pagination[page]=${page}&pagination[pageSize]=${pageSize}&sort=${sortField}:${sortOrder}`
      )
    }

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

    console.log('[API /logs/usuario/[usuarioId]] ✅ Logs obtenidos:', items.length)

    // Si no hay usuarioInfo pero hay items, intentar obtenerlo del primer log
    if (!usuarioInfo && items.length > 0) {
      const firstLog = items[0]
      const logData = firstLog.attributes || firstLog
      const usuario = logData.usuario
      
      if (usuario) {
        if (usuario.data) {
          const colaboradorData = usuario.data
          const colaboradorAttrs = colaboradorData.attributes || colaboradorData
          const persona = colaboradorAttrs.persona
          let nombre = colaboradorAttrs.email_login || 'Sin nombre'
          
          if (persona) {
            const personaData = persona.data || persona
            const personaAttrs = personaData?.attributes || personaData || persona
            nombre = personaAttrs.nombre_completo || 
                     personaAttrs.nombres || 
                     `${(personaAttrs.primer_apellido || '')} ${(personaAttrs.segundo_apellido || '')}`.trim() ||
                     nombre
          }
          
          usuarioInfo = {
            id: colaboradorData.id || colaboradorData.documentId || usuarioIdNum,
            nombre,
            email: colaboradorAttrs.email_login || 'N/A',
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: items,
      pagination: pagination || { page, pageSize, pageCount: 0, total: items.length },
      usuarioId,
      usuarioInfo,
    })
  } catch (error: any) {
    console.error('[API /logs/usuario/[usuarioId]] ❌ Error:', error.message)
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener logs del usuario',
        data: [],
      },
      { status: error.status || 500 }
    )
  }
}
