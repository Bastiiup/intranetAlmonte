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
    let found157: any = null
    if (Array.isArray(response.data)) {
      found157 = response.data.find((c: any) => {
        const id = c.id || c.documentId
        return id === 157 || String(id) === '157'
      }) || null
    }
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
        const usuario157Any = usuario157 as any
        const attrs = usuario157Any.attributes || usuario157Any
        console.error('✅ USUARIO 157 ENCONTRADO:', {
          id: usuario157Any.id,
          documentId: usuario157Any.documentId,
          email_login: attrs.email_login,
          activo: attrs.activo,
          publishedAt: usuario157Any.publishedAt,
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
    
    // FILTRADO DE DUPLICADOS: "El Portero Inteligente" - Eliminar usuarios duplicados por email
    // PRIORIDAD 1: Usuario con persona definida SIEMPRE gana sobre uno sin persona
    // PRIORIDAD 2: Si ambos tienen (o no tienen) persona, usar el ID más alto
    let cleanedData = response.data
    if (Array.isArray(response.data) && response.data.length > 0) {
      const usuariosUnicos = new Map<string, any>()
      const duplicatesFound: Array<{ 
        email: string
        ids: number[]
        kept: number
        reason: string
      }> = []
      
      // Función helper para verificar si un usuario tiene persona
      const hasPersona = (item: any): boolean => {
        const attrs = item.attributes || item
        // Verificar en múltiples lugares posibles
        return !!(
          item.persona ||
          attrs.persona ||
          attrs.persona?.data ||
          item.attributes?.persona?.data ||
          item.attributes?.persona
        )
      }
      
      // Iterar sobre todos los colaboradores que vienen de Strapi
      response.data.forEach((newItem: any) => {
        // Extraer email_login (puede estar en attributes o en el nivel superior)
        const attrs = newItem.attributes || newItem
        const email = attrs.email_login || newItem.email_login
        
        // Omitir usuarios sin email
        if (!email) {
          console.warn('[API /chat/colaboradores] ⚠️ Colaborador sin email_login, será omitido:', { 
            id: newItem.id,
            documentId: newItem.documentId 
          })
          return
        }
        
        // Obtener ID numérico (usar solo id, no documentId)
        const currentId = newItem.id
        
        // Validar que tenga ID válido
        if (!currentId || typeof currentId !== 'number') {
          console.warn('[API /chat/colaboradores] ⚠️ Colaborador sin ID numérico válido, será omitido:', { 
            email,
            id: newItem.id,
            documentId: newItem.documentId 
          })
          return
        }
        
        // Si el email no existe en el Map, agregarlo directamente
        if (!usuariosUnicos.has(email)) {
          usuariosUnicos.set(email, newItem)
        } else {
          // Si ya existe un usuario con este email, aplicar lógica de prioridad
          const existingItem = usuariosUnicos.get(email)
          const existingId = existingItem.id
          
          // Verificar si tienen persona
          const hasPersonaNew = hasPersona(newItem)
          const hasPersonaExisting = hasPersona(existingItem)
          
          let shouldReplace = false
          let reason = ''
          
          // CASO A: El nuevo tiene persona y el guardado no -> Reemplazar por el nuevo
          if (hasPersonaNew && !hasPersonaExisting) {
            shouldReplace = true
            reason = 'Nuevo tiene persona, existente no'
          }
          // CASO B: Ambos tienen (o no tienen) persona -> Usar el ID más alto
          else if (hasPersonaNew === hasPersonaExisting) {
            if (currentId > existingId) {
              shouldReplace = true
              reason = hasPersonaNew 
                ? 'Ambos tienen persona, nuevo ID es mayor' 
                : 'Ninguno tiene persona, nuevo ID es mayor'
            } else {
              reason = hasPersonaNew 
                ? 'Ambos tienen persona, existente ID es mayor' 
                : 'Ninguno tiene persona, existente ID es mayor'
            }
          }
          // CASO C: El guardado tiene persona y el nuevo no -> No hacer nada (quedarse con el guardado)
          else {
            reason = 'Existente tiene persona, nuevo no'
          }
          
          if (shouldReplace) {
            duplicatesFound.push({
              email,
              ids: [existingId, currentId],
              kept: currentId,
              reason,
            })
            usuariosUnicos.set(email, newItem)
          } else {
            duplicatesFound.push({
              email,
              ids: [existingId, currentId],
              kept: existingId,
              reason,
            })
            // No hacemos nada, ya tenemos el correcto en el Map
          }
        }
      })
      
      // Log detallado de duplicados encontrados y eliminados
      if (duplicatesFound.length > 0) {
        console.error('[API /chat/colaboradores] 🔍 DUPLICADOS ENCONTRADOS Y ELIMINADOS:')
        duplicatesFound.forEach((dup) => {
          console.error(`  📧 Email: ${dup.email}`)
          console.error(`     IDs encontrados: [${dup.ids.join(', ')}]`)
          console.error(`     ✅ Se mantiene ID: ${dup.kept}`)
          console.error(`     ❌ Se elimina ID: ${dup.ids.find(id => id !== dup.kept)}`)
          console.error(`     📋 Razón: ${dup.reason}`)
        })
      }
      
      // Convertir el Map a array para devolver la lista limpia
      cleanedData = Array.from(usuariosUnicos.values())
      
      console.log('[API /chat/colaboradores] ✅ Limpieza de duplicados completada:', {
        originalCount: response.data.length,
        cleanedCount: cleanedData.length,
        duplicatesRemoved: response.data.length - cleanedData.length,
        duplicatesFound: duplicatesFound.length,
      })
    }
    
    // Devolver respuesta con datos limpios
    return NextResponse.json(
      { ...response, data: cleanedData },
      { status: 200 }
    )
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

