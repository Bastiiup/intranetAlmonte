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
        const response = await strapiClient.get<any>(
          '/api/colegios?pagination[pageSize]=50&fields[0]=id&fields[1]=documentId&fields[2]=colegio_nombre&fields[3]=rbd&sort[0]=updatedAt:desc'
        )
        
        const colegios = Array.isArray(response.data) ? response.data : [response.data]
        
        result.data = colegios.map((c: any) => ({
          id: c.id,
          documentId: c.documentId,
          nombre: c.attributes?.colegio_nombre || c.colegio_nombre || 'Sin nombre',
          rbd: c.attributes?.rbd || c.rbd,
        }))
        
        result.total = response.meta?.pagination?.total || colegios.length
      } catch (error: any) {
        result.errors.push({
          tipo: 'colegios',
          error: error.message,
          status: error.status,
        })
      }
    }

    // Listar trayectorias - Intentar diferentes nombres de content type
    if (tipo === 'trayectorias') {
      const posiblesNombres = [
        'profesores',
        'persona-trayectorias',
        'trayectorias',
        'persona_trayectorias',
      ]

      let encontrado = false
      
      for (const nombre of posiblesNombres) {
        try {
          console.log(`[DEBUG] Intentando listar trayectorias desde: /api/${nombre}`)
          const response = await strapiClient.get<any>(
            `/api/${nombre}?pagination[pageSize]=50&populate[persona][fields][0]=id&populate[persona][fields][1]=nombre_completo&populate[colegio][fields][0]=id&populate[colegio][fields][1]=colegio_nombre&sort[0]=updatedAt:desc`
          )
          
          const trayectorias = Array.isArray(response.data) ? response.data : [response.data]
          
          result.data = trayectorias.map((t: any) => {
            const attrs = t.attributes || t
            const persona = attrs.persona?.data || attrs.persona
            const colegio = attrs.colegio?.data || attrs.colegio
            
            return {
              id: t.id,
              documentId: t.documentId,
              cargo: attrs.cargo,
              is_current: attrs.is_current,
              activo: attrs.activo,
              persona: {
                id: persona?.id || persona?.attributes?.id,
                documentId: persona?.documentId,
                nombre: persona?.attributes?.nombre_completo || persona?.nombre_completo,
              },
              colegio: {
                id: colegio?.id || colegio?.attributes?.id,
                documentId: colegio?.documentId,
                nombre: colegio?.attributes?.colegio_nombre || colegio?.colegio_nombre,
              },
            }
          })
          
          result.total = response.meta?.pagination?.total || trayectorias.length
          result.contentTypeName = nombre
          encontrado = true
          break
        } catch (error: any) {
          console.log(`[DEBUG] /api/${nombre} no existe (${error.status})`)
          // Continuar con el siguiente nombre
        }
      }

      if (!encontrado) {
        result.errors.push({
          tipo: 'trayectorias',
          error: 'No se encontró el content type de trayectorias. Intentados: ' + posiblesNombres.join(', '),
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
