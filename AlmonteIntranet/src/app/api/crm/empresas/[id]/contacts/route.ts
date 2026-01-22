/**
 * API Route para obtener contactos asociados a una empresa específica
 * GET /api/crm/empresas/[id]/contacts
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

// Helper para logs condicionales de debugging
const DEBUG = process.env.NODE_ENV === 'development' || process.env.DEBUG_CRM === 'true'
const debugLog = (...args: any[]) => {
  if (DEBUG) {
    console.log(...args)
  }
}

interface PersonaAttributes {
  nombre_completo?: string
  nombres?: string
  primer_apellido?: string
  segundo_apellido?: string
  rut?: string
  nivel_confianza?: 'baja' | 'media' | 'alta'
  origen?: 'mineduc' | 'csv' | 'manual' | 'crm' | 'web' | 'otro'
  activo?: boolean
  createdAt?: string
  updatedAt?: string
  emails?: Array<{ email?: string; principal?: boolean }>
  telefonos?: Array<{ telefono_norm?: string; telefono_raw?: string; principal?: boolean }>
  imagen?: string | {
    url?: string
    media?: {
      data?: {
        attributes?: {
          url?: string
        }
      }
    }
  }
  tags?: Array<{ name?: string }>
  empresa_contactos?: Array<{
    id?: number
    documentId?: string
    cargo?: string
    empresa?: {
      id?: number
      documentId?: string
      empresa_nombre?: string
    }
  }>
}

/**
 * GET /api/crm/empresas/[id]/contacts
 * Obtiene los contactos asociados a una empresa específica
 * 
 * En Strapi, los contactos de empresas se relacionan a través de una relación manyToMany
 * o a través de un content-type intermedio similar a profesores (empresa_contactos)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: empresaId } = await params
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') || '1'
    const pageSize = searchParams.get('pageSize') || '50'

    debugLog('🔍 [API /crm/empresas/[id]/contacts GET] Buscando contactos para empresa:', empresaId)

    // Obtener el ID numérico de la empresa si es documentId
    const isDocumentId = typeof empresaId === 'string' && !/^\d+$/.test(empresaId)
    let empresaIdNum: number | string = empresaId

    if (isDocumentId) {
      try {
        const empresaResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
          `/api/empresas/${empresaId}?fields[0]=id`
        )
        const empresaData = Array.isArray(empresaResponse.data) ? empresaResponse.data[0] : empresaResponse.data
        if (empresaData && typeof empresaData === 'object' && 'id' in empresaData) {
          empresaIdNum = empresaData.id as number
          debugLog('✅ [API /crm/empresas/[id]/contacts GET] ID numérico de la empresa:', empresaIdNum)
        }
      } catch (error: any) {
        console.error('❌ [API /crm/empresas/[id]/contacts GET] Error obteniendo ID de la empresa:', error)
        return NextResponse.json(
          { success: false, error: 'Empresa no encontrada' },
          { status: 404 }
        )
      }
    }

    let contactos: any[] = []

    try {
      // Buscar contactos relacionados con esta empresa
      // Si existe un content-type empresa_contactos, buscar ahí primero
      const paramsObj = new URLSearchParams({
        [`filters[empresa][id][$eq]`]: empresaIdNum.toString(),
        'populate[persona]': 'true',
        'populate[persona][populate][emails]': 'true',
        'populate[persona][populate][telefonos]': 'true',
        'populate[persona][populate][imagen]': 'true',
      })

      try {
        const empresaContactosResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
          `/api/empresa-contactos?${paramsObj.toString()}`
        )

        if (empresaContactosResponse.data) {
          const empresaContactos = Array.isArray(empresaContactosResponse.data) 
            ? empresaContactosResponse.data 
            : [empresaContactosResponse.data]

          // Extraer las personas de las relaciones
          contactos = empresaContactos
            .map((ec: any) => {
              // Manejar diferentes estructuras de respuesta de Strapi
              const ecAttrs = ec.attributes || ec
              let persona = ecAttrs.persona?.data || ecAttrs.persona || ec.persona?.data || ec.persona
              
              // Si persona es un array, tomar el primero
              if (Array.isArray(persona) && persona.length > 0) {
                persona = persona[0]
              }
              
              if (persona) {
                // Extraer attributes si existen
                const personaAttrs = persona.attributes || persona
                return {
                  ...personaAttrs,
                  id: persona.id || personaAttrs.id,
                  documentId: persona.documentId || personaAttrs.documentId,
                  _cargo: ecAttrs.cargo || ec.cargo,
                }
              }
              return null
            })
            .filter(Boolean)

          debugLog('✅ [API /crm/empresas/[id]/contacts GET] Contactos encontrados a través de empresa-contactos:', contactos.length)
        }
      } catch (error: any) {
        // Si no existe empresa-contactos, intentar método alternativo
        debugLog('⚠️ [API /crm/empresas/[id]/contacts GET] No se encontró empresa-contactos, intentando método alternativo...')
        
        // Buscar personas que tengan relación directa con empresas
        const altParams = new URLSearchParams({
          [`filters[empresas][id][$eq]`]: empresaIdNum.toString(),
          'populate[emails]': 'true',
          'populate[telefonos]': 'true',
          'populate[imagen]': 'true',
        })

        const response = await strapiClient.get<StrapiResponse<StrapiEntity<PersonaAttributes>>>(
          `/api/personas?${altParams.toString()}`
        )

        if (response.data) {
          contactos = Array.isArray(response.data) ? response.data : [response.data]
          debugLog('📥 [API /crm/empresas/[id]/contacts GET] Respuesta Strapi (alternativa):', contactos.length, 'personas encontradas')
        }
      }
    } catch (error: any) {
      console.error('❌ [API /crm/empresas/[id]/contacts GET] Error en estrategia principal:', error)
    }

    if (!contactos || contactos.length === 0) {
      debugLog('⚠️ [API /crm/empresas/[id]/contacts GET] No se encontraron contactos')
      return NextResponse.json({
        success: true,
        data: [],
        meta: { pagination: { total: 0, page: 1, pageSize: 50 } },
      }, { status: 200 })
    }

    // Transformar contactos para el frontend
    const contactosFiltrados = contactos.map((contacto: any) => {
      const attrs = contacto.attributes || contacto
      
      return {
        id: contacto.id || contacto.documentId,
        documentId: contacto.documentId || contacto.id,
        nombre_completo: attrs.nombre_completo,
        nombres: attrs.nombres,
        primer_apellido: attrs.primer_apellido,
        segundo_apellido: attrs.segundo_apellido,
        rut: attrs.rut,
        nivel_confianza: attrs.nivel_confianza,
        origen: attrs.origen,
        activo: attrs.activo !== false,
        emails: attrs.emails || [],
        telefonos: attrs.telefonos || [],
        imagen: attrs.imagen,
        cargo: contacto._cargo || null,
        createdAt: attrs.createdAt,
        updatedAt: attrs.updatedAt,
      }
    })

    debugLog('✅ [API /crm/empresas/[id]/contacts GET] Contactos filtrados:', contactosFiltrados.length)

    return NextResponse.json({
      success: true,
      data: contactosFiltrados,
      meta: {
        pagination: {
          total: contactosFiltrados.length,
          page: parseInt(page),
          pageSize: parseInt(pageSize),
        },
      },
    }, { status: 200 })
  } catch (error: any) {
    console.error('❌ [API /crm/empresas/[id]/contacts GET] Error obteniendo contactos de la empresa:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: 'Error obteniendo contactos',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}





