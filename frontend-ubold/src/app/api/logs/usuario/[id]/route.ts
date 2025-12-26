import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/logs/usuario/[id]
 * Obtiene todos los logs de actividad de un usuario específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const usuarioId = parseInt(id)
    
    if (isNaN(usuarioId)) {
      return NextResponse.json({
        success: false,
        error: 'ID de usuario inválido',
        data: []
      }, { status: 400 })
    }

    console.log('[API /logs/usuario/[id]] Obteniendo logs para usuario:', usuarioId)

    // Obtener logs del usuario usando el endpoint personalizado de Strapi
    // Filtrar por usuario usando el ID
    const logsResponse = await strapiClient.get<any>(
      `/api/activity-logs/listar?page=1&pageSize=10000&filters[usuario][id][$eq]=${usuarioId}`
    )

    let logs: any[] = []
    
    if (logsResponse.data !== undefined) {
      if (Array.isArray(logsResponse.data)) {
        logs = logsResponse.data
      } else if (logsResponse.data) {
        logs = [logsResponse.data]
      }
    } else if (Array.isArray(logsResponse)) {
      logs = logsResponse
    } else {
      logs = [logsResponse]
    }

    // Si no hay filtro por usuario en el endpoint, filtrar manualmente
    if (logs.length > 0) {
      logs = logs.filter((log: any) => {
        const logData = log.attributes || log
        const usuario = logData.usuario
        
        if (!usuario) return false
        
        // Extraer ID del usuario
        let logUsuarioId: number | null = null
        if (usuario.data) {
          logUsuarioId = usuario.data.id || usuario.data.documentId || null
        } else if (usuario.id || usuario.documentId) {
          logUsuarioId = usuario.id || usuario.documentId
        } else if (typeof usuario === 'number') {
          logUsuarioId = usuario
        }
        
        return logUsuarioId === usuarioId
      })
    }

    // Ordenar por fecha más reciente primero
    logs.sort((a, b) => {
      const fechaA = (a.attributes || a).fecha || (a.attributes || a).createdAt || ''
      const fechaB = (b.attributes || b).fecha || (b.attributes || b).createdAt || ''
      return new Date(fechaB).getTime() - new Date(fechaA).getTime()
    })

    console.log('[API /logs/usuario/[id]] ✅ Logs encontrados:', logs.length)

    return NextResponse.json({
      success: true,
      data: logs,
      total: logs.length
    })

  } catch (error: any) {
    console.error('[API /logs/usuario/[id]] ❌ Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al obtener logs del usuario',
      data: []
    }, { status: error.status || 500 })
  }
}

