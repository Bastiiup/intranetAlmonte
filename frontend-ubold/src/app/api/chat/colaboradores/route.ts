/**
 * API Route para obtener colaboradores desde Strapi
 * Obtiene todos los colaboradores con sus datos de Persona relacionados
 * 
 * IMPORTANTE: Este endpoint SOLO usa Intranet-colaboradores.
 * NO usa ni referencia Intranet-Chats (content type obsoleto).
 * Stream Chat maneja su propio historial, no necesitamos cruzar datos con tablas antiguas.
 */

import { NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

interface ColaboradorAttributes {
  email_login: string
  rol?: string
  activo: boolean
  persona?: {
    id: number
    rut?: string
    nombres?: string
    primer_apellido?: string
    segundo_apellido?: string
    nombre_completo?: string
    emails?: Array<{ email: string; tipo?: string }>
    telefonos?: Array<{ numero: string; tipo?: string }>
    imagen?: {
      url?: string
      [key: string]: any
    }
    [key: string]: any
  }
  [key: string]: any
}

export async function GET() {
  try {
    // CRÍTICO: Fetch EXCLUSIVO de Intranet-colaboradores
    // NO usar Intranet-Chats ni ninguna otra tabla antigua
    // Solicitud modificada: Sin filtro de activo y con publicationState=preview
    // Esto permite ver todos los colaboradores, incluso los que están en Draft o no tienen activo=true
    const response = await strapiClient.get<StrapiResponse<StrapiEntity<ColaboradorAttributes>>>(
      '/api/colaboradores?pagination[pageSize]=1000&publicationState=preview&sort=email_login:asc&populate[persona][fields]=rut,nombres,primer_apellido,segundo_apellido,nombre_completo&populate[persona][populate][emails]=*&populate[persona][populate][telefonos]=*&populate[persona][populate][imagen][populate]=*'
    )
    
    // Log detallado para debugging
    console.log('[API /chat/colaboradores] Respuesta de Strapi:', {
      hasData: !!response.data,
      isArray: Array.isArray(response.data),
      count: Array.isArray(response.data) ? response.data.length : response.data ? 1 : 0,
    })
    
    if (Array.isArray(response.data) && response.data.length > 0) {
      const firstColaborador = response.data[0] as any
      // Los datos pueden venir directamente o en attributes
      const colaboradorData = firstColaborador.attributes || firstColaborador
      console.log('[API /chat/colaboradores] Primer colaborador ejemplo:', {
        id: firstColaborador.id,
        documentId: firstColaborador.documentId,
        email_login: colaboradorData.email_login,
        persona: colaboradorData.persona ? {
          id: colaboradorData.persona.id,
          documentId: colaboradorData.persona.documentId,
          nombre_completo: colaboradorData.persona.nombre_completo,
          nombres: colaboradorData.persona.nombres,
          primer_apellido: colaboradorData.persona.primer_apellido,
        } : null,
      })
      
      // DEBUG CRÍTICO: Verificar estructura completa del primer colaborador
      console.error('[API /chat/colaboradores] 🔍 ESTRUCTURA COMPLETA PRIMER COLABORADOR:')
      console.error(JSON.stringify(firstColaborador, null, 2))
    }
    
    // DEBUG: Buscar explícitamente al usuario problemático
    const found157 = Array.isArray(response.data) && response.data.find((c: any) => {
      const id = c.id || c.documentId
      return id === 157 || String(id) === '157'
    })
    console.error('🕵️ BUSCANDO A TEST 2 (ID 157):', found157 ? '✅ ENCONTRADO' : '❌ NO ESTÁ EN LA RESPUESTA')
    if (found157) {
      const attrs = found157.attributes || found157
      console.error('Detalles del usuario 157:', {
        id: found157.id,
        documentId: found157.documentId,
        email_login: attrs.email_login,
        activo: attrs.activo,
        publishedAt: found157.publishedAt,
        tienePersona: !!attrs.persona,
      })
    }
    
    // DEBUG ESPECÍFICO: Buscar usuario 157 en la respuesta (log adicional detallado)
    if (Array.isArray(response.data)) {
      const usuario157 = response.data.find((col: any) => {
        const id = col.id || col.documentId
        return String(id) === '157' || id === 157
      })
      console.error('[API /chat/colaboradores] 🔍 BÚSQUEDA ESPECÍFICA USUARIO 157:')
      if (usuario157) {
        const attrs = usuario157.attributes || usuario157
        console.error('✅ USUARIO 157 ENCONTRADO:', {
          id: usuario157.id,
          documentId: usuario157.documentId,
          email_login: attrs.email_login,
          activo: attrs.activo,
          publishedAt: usuario157.publishedAt,
          tienePersona: !!attrs.persona,
        })
      } else {
        console.error('❌ USUARIO 157 NO ENCONTRADO en la respuesta de Strapi')
        console.error('Total de colaboradores recibidos:', response.data.length)
        console.error('IDs encontrados (primeros 10):', response.data.slice(0, 10).map((col: any) => ({
          id: col.id,
          documentId: col.documentId,
          email: (col.attributes || col).email_login,
          activo: (col.attributes || col).activo,
        })))
      }
    }
    
    return NextResponse.json(response, { status: 200 })
  } catch (error: any) {
    console.error('[API /chat/colaboradores] Error al obtener colaboradores:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      { error: error.message || 'Error al obtener colaboradores' },
      { status: error.status || 500 }
    )
  }
}

