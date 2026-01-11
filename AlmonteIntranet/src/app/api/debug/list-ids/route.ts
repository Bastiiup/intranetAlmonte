/**
 * Endpoint para listar IDs de personas y trayectorias
 * GET /api/debug/list-ids
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo') || 'personas' // 'personas', 'colegios', 'trayectorias'

    const result: any = {
      success: true,
      tipo,
      timestamp: new Date().toISOString(),
      data: [],
      errors: [],
    }

    // Listar personas
    if (tipo === 'personas') {
      try {
        const response = await strapiClient.get<any>(
          '/api/personas?pagination[pageSize]=50&fields[0]=id&fields[1]=documentId&fields[2]=nombre_completo&fields[3]=rut&fields[4]=nombres&fields[5]=primer_apellido&sort[0]=updatedAt:desc'
        )
        
        const personas = Array.isArray(response.data) ? response.data : [response.data]
        
        result.data = personas.map((p: any) => ({
          id: p.id,
          documentId: p.documentId,
          nombre: p.attributes?.nombre_completo || p.nombre_completo || `${p.attributes?.nombres || p.nombres || ''} ${p.attributes?.primer_apellido || p.primer_apellido || ''}`.trim() || 'Sin nombre',
          rut: p.attributes?.rut || p.rut,
        }))
        
        result.total = response.meta?.pagination?.total || personas.length
      } catch (error: any) {
        result.errors.push({
          tipo: 'personas',
          error: error.message,
          status: error.status,
        })
      }
    }

    // Listar colegios
    if (tipo === 'colegios') {
      try {
        // Intentar sin fields primero para ver la estructura completa
        const response = await strapiClient.get<any>(
          '/api/colegios?pagination[pageSize]=100&sort[0]=updatedAt:desc'
        )
        
        console.log('[DEBUG] Respuesta de colegios:', {
          tieneData: !!response.data,
          esArray: Array.isArray(response.data),
          cantidad: Array.isArray(response.data) ? response.data.length : 1,
          meta: response.meta,
        })
        
        const colegios = Array.isArray(response.data) ? response.data : [response.data]
        
        result.data = colegios
          .filter((c: any) => {
            // Filtrar solo colegios válidos (con id o documentId)
            return c && (c.id || c.documentId)
          })
          .map((c: any) => {
            const attrs = c.attributes || c
            return {
              id: c.id,
              documentId: c.documentId,
              nombre: attrs.colegio_nombre || c.colegio_nombre || 'Sin nombre',
              rbd: attrs.rbd || c.rbd || null,
              dependencia: attrs.dependencia || c.dependencia || null,
              estado: attrs.estado || c.estado || null,
              region: attrs.region || c.region || null,
              estructuraCompleta: JSON.stringify(c, null, 2), // Para debug
            }
          })
        
        result.total = response.meta?.pagination?.total || colegios.length
        result.meta = response.meta
        result.estructuraEjemplo = colegios.length > 0 ? {
          primerColegio: colegios[0],
        } : null
      } catch (error: any) {
        console.error('[DEBUG] Error listando colegios:', error)
        result.errors.push({
          tipo: 'colegios',
          error: error.message,
          status: error.status,
          details: error.response?.data,
        })
      }
    }

    // Listar trayectorias - Intentar diferentes nombres de content type
    if (tipo === 'trayectorias') {
      const posiblesNombres = [
        'persona-trayectorias',
        'persona-trayectorias',
        'trayectorias',
        'persona_trayectorias',
        'persona-trayectoria',
      ]

      let encontrado = false
      
      for (const nombre of posiblesNombres) {
        try {
          console.log(`[DEBUG] Intentando listar trayectorias desde: /api/${nombre}`)
          
          // Primero intentar sin populate para ver si existe
          const testResponse = await strapiClient.get<any>(
            `/api/${nombre}?pagination[pageSize]=1`
          )
          
          console.log(`[DEBUG] ✅ /api/${nombre} existe!`)
          
          // Si existe, obtener con populate completo
          const response = await strapiClient.get<any>(
            `/api/${nombre}?pagination[pageSize]=100&populate[persona]=*&populate[colegio]=*&populate[curso]=*&populate[asignatura]=*&sort[0]=updatedAt:desc`
          )
          
          console.log(`[DEBUG] Trayectorias obtenidas:`, {
            cantidad: Array.isArray(response.data) ? response.data.length : 1,
            estructura: response.data && Array.isArray(response.data) && response.data.length > 0 
              ? Object.keys(response.data[0])
              : 'No hay datos',
          })
          
          const trayectorias = Array.isArray(response.data) ? response.data : [response.data]
          
          result.data = trayectorias.map((t: any) => {
            const attrs = t.attributes || t
            
            // Extraer persona de diferentes formatos
            let persona: any = null
            if (attrs.persona) {
              if (attrs.persona.data) {
                persona = Array.isArray(attrs.persona.data) ? attrs.persona.data[0] : attrs.persona.data
              } else {
                persona = attrs.persona
              }
            }
            
            // Extraer colegio de diferentes formatos
            let colegio: any = null
            if (attrs.colegio) {
              if (attrs.colegio.data) {
                colegio = Array.isArray(attrs.colegio.data) ? attrs.colegio.data[0] : attrs.colegio.data
              } else {
                colegio = attrs.colegio
              }
            }
            
            const personaAttrs = persona?.attributes || persona
            const colegioAttrs = colegio?.attributes || colegio
            
            return {
              id: t.id,
              documentId: t.documentId,
              cargo: attrs.cargo,
              anio: attrs.anio,
              is_current: attrs.is_current,
              activo: attrs.activo,
              fecha_inicio: attrs.fecha_inicio,
              fecha_fin: attrs.fecha_fin,
              persona: {
                id: persona?.id || personaAttrs?.id,
                documentId: persona?.documentId,
                nombre: personaAttrs?.nombre_completo || persona?.nombre_completo,
                rut: personaAttrs?.rut || persona?.rut,
              },
              colegio: {
                id: colegio?.id || colegioAttrs?.id,
                documentId: colegio?.documentId,
                nombre: colegioAttrs?.colegio_nombre || colegio?.colegio_nombre,
                rbd: colegioAttrs?.rbd || colegio?.rbd,
              },
              curso: attrs.curso ? {
                id: attrs.curso?.data?.id || attrs.curso?.id,
                nombre: attrs.curso?.data?.attributes?.nombre || attrs.curso?.attributes?.nombre || attrs.curso?.nombre,
              } : null,
              asignatura: attrs.asignatura ? {
                id: attrs.asignatura?.data?.id || attrs.asignatura?.id,
                nombre: attrs.asignatura?.data?.attributes?.nombre || attrs.asignatura?.attributes?.nombre || attrs.asignatura?.nombre,
              } : null,
              estructuraCompleta: JSON.stringify(t, null, 2), // Para debug completo
            }
          })
          
          result.total = response.meta?.pagination?.total || trayectorias.length
          result.contentTypeName = nombre
          result.meta = response.meta
          result.estructuraEjemplo = trayectorias.length > 0 ? {
            primeraTrayectoria: trayectorias[0],
          } : null
          encontrado = true
          break
        } catch (error: any) {
          console.log(`[DEBUG] /api/${nombre} no existe o error (${error.status}):`, error.message)
          // Continuar con el siguiente nombre
        }
      }

      if (!encontrado) {
        result.errors.push({
          tipo: 'trayectorias',
          error: 'No se encontró el content type de trayectorias. Intentados: ' + posiblesNombres.join(', '),
          sugerencia: 'Verifica en Strapi Admin el nombre exacto del content type',
        })
      }
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    console.error('[DEBUG] Error general:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.response?.data,
    }, { status: 500 })
  }
}
