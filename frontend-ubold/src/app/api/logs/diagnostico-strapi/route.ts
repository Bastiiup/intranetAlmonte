import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/logs/diagnostico-strapi
 * Endpoint para diagnosticar la estructura de logs en Strapi
 * Hace múltiples consultas a Strapi para entender cómo devuelve los datos
 */
export async function GET(request: NextRequest) {
  const diagnosticos: any[] = []
  
  const addDiagnostico = (titulo: string, datos: any) => {
    diagnosticos.push({
      titulo,
      datos,
      timestamp: new Date().toISOString(),
    })
  }

  try {
    // 1. Obtener los últimos 5 logs sin populate
    try {
      const logsSinPopulate = await strapiClient.get<any>(
        '/api/activity-logs?pagination[pageSize]=5&sort=fecha:desc'
      )
      addDiagnostico('1. Logs sin populate (últimos 5)', {
        total: Array.isArray(logsSinPopulate.data) ? logsSinPopulate.data.length : 0,
        estructura: logsSinPopulate.data?.[0] || logsSinPopulate.data || logsSinPopulate,
        tieneUsuario: !!logsSinPopulate.data?.[0]?.usuario || !!logsSinPopulate.data?.usuario,
        tipoUsuario: typeof (logsSinPopulate.data?.[0]?.usuario || logsSinPopulate.data?.usuario),
      })
    } catch (error: any) {
      addDiagnostico('1. Error al obtener logs sin populate', {
        error: error.message,
        status: error.status,
      })
    }

    // 2. Obtener logs con populate básico de usuario (sin persona)
    try {
      const logsConUsuarioBasico = await strapiClient.get<any>(
        '/api/activity-logs?populate[usuario][fields]=email_login,id,documentId&pagination[pageSize]=5&sort=fecha:desc'
      )
      addDiagnostico('2. Logs con populate básico de usuario (sin persona)', {
        total: Array.isArray(logsConUsuarioBasico.data) ? logsConUsuarioBasico.data.length : 0,
        primerLog: logsConUsuarioBasico.data?.[0] || logsConUsuarioBasico.data,
        estructuraUsuario: logsConUsuarioBasico.data?.[0]?.usuario || logsConUsuarioBasico.data?.usuario,
        tieneUsuario: !!(logsConUsuarioBasico.data?.[0]?.usuario || logsConUsuarioBasico.data?.usuario),
      })
    } catch (error: any) {
      addDiagnostico('2. Error al obtener logs con populate básico', {
        error: error.message,
        status: error.status,
      })
    }

    // 3. Obtener logs con populate completo (usuario + persona)
    try {
      const logsConUsuarioCompleto = await strapiClient.get<any>(
        '/api/activity-logs?populate[usuario][fields]=email_login,id,documentId&populate[usuario][populate][persona][fields]=nombres,primer_apellido,segundo_apellido,nombre_completo&pagination[pageSize]=5&sort=fecha:desc'
      )
      addDiagnostico('3. Logs con populate completo (usuario + persona)', {
        total: Array.isArray(logsConUsuarioCompleto.data) ? logsConUsuarioCompleto.data.length : 0,
        primerLog: logsConUsuarioCompleto.data?.[0] || logsConUsuarioCompleto.data,
        estructuraUsuario: logsConUsuarioCompleto.data?.[0]?.usuario || logsConUsuarioCompleto.data?.usuario,
        tieneUsuario: !!(logsConUsuarioCompleto.data?.[0]?.usuario || logsConUsuarioCompleto.data?.usuario),
      })
    } catch (error: any) {
      addDiagnostico('3. Error al obtener logs con populate completo', {
        error: error.message,
        status: error.status,
      })
    }

    // 4. Obtener un log específico que sabemos que tiene usuario (el más reciente)
    try {
      const todosLosLogs = await strapiClient.get<any>(
        '/api/activity-logs?pagination[pageSize]=100&sort=fecha:desc'
      )
      const logs = Array.isArray(todosLosLogs.data) ? todosLosLogs.data : [todosLosLogs.data].filter(Boolean)
      
      // Buscar un log que tenga usuario (no null)
      const logConUsuario = logs.find((log: any) => {
        const logData = log.attributes || log
        return logData.usuario !== null && logData.usuario !== undefined
      })

      if (logConUsuario) {
        const logId = logConUsuario.id || logConUsuario.documentId
        const logData = logConUsuario.attributes || logConUsuario
        
        // Consultar ese log específico con populate
        const logEspecifico = await strapiClient.get<any>(
          `/api/activity-logs/${logId}?populate[usuario][fields]=email_login,id,documentId&populate[usuario][populate][persona][fields]=nombres,primer_apellido,segundo_apellido,nombre_completo`
        )
        
        addDiagnostico('4. Log específico con usuario (ID: ' + logId + ')', {
          logId,
          estructuraCompleta: logEspecifico.data || logEspecifico,
          usuario: logEspecifico.data?.usuario || logEspecifico.usuario,
          tieneUsuario: !!(logEspecifico.data?.usuario || logEspecifico.usuario),
        })
      } else {
        addDiagnostico('4. No se encontró ningún log con usuario', {
          totalLogsRevisados: logs.length,
          mensaje: 'Todos los logs tienen usuario: null',
        })
      }
    } catch (error: any) {
      addDiagnostico('4. Error al obtener log específico', {
        error: error.message,
        status: error.status,
      })
    }

    // 5. Verificar la estructura de la colección activity-logs
    try {
      const estructura = await strapiClient.get<any>('/api/activity-logs?pagination[pageSize]=1')
      addDiagnostico('5. Estructura de la colección activity-logs', {
        tieneData: !!estructura.data,
        esArray: Array.isArray(estructura.data),
        keys: estructura.data ? Object.keys(estructura.data[0] || estructura.data || {}) : [],
        estructuraEjemplo: estructura.data?.[0] || estructura.data || estructura,
      })
    } catch (error: any) {
      addDiagnostico('5. Error al verificar estructura', {
        error: error.message,
        status: error.status,
      })
    }

    return NextResponse.json({
      success: true,
      diagnosticos,
      total: diagnosticos.length,
      message: 'Diagnóstico completo de Strapi activity-logs',
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      diagnosticos,
    }, { status: 500 })
  }
}

