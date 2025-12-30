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
    
    // DEBUG: Buscar todos los registros de Matias ANTES de la desduplicación
    if (Array.isArray(response.data)) {
      const matiasRegistros = response.data.filter((col: any) => {
        const attrs = col.attributes || col
        const email = attrs.email_login || col.email_login
        return email === 'matiintranet@gmail.com'
      })
      
      // Buscar específicamente los IDs 93, 96, 115 en TODA la respuesta
      const id93 = response.data.find((col: any) => col.id === 93)
      const id96 = response.data.find((col: any) => col.id === 96)
      const id115 = response.data.find((col: any) => col.id === 115)
      
      console.error('[API /chat/colaboradores] 🚨 MATIAS - REGISTROS ENCONTRADOS ANTES DE DESDUPLICACIÓN:')
      console.error(`  ⚠️ Total de registros de Matias (por email): ${matiasRegistros.length}`)
      
      if (matiasRegistros.length > 0) {
        matiasRegistros.forEach((col: any, index: number) => {
          const attrs = col.attributes || col
          const hasPersona = !!attrs.persona || !!attrs.persona?.data
          console.error(`  📋 Registro ${index + 1} (por email):`)
          console.error(`     🔑 ID: ${col.id}`)
          console.error(`     📄 documentId: ${col.documentId}`)
          console.error(`     👤 Tiene persona: ${hasPersona}`)
          console.error(`     📧 Email: ${attrs.email_login || col.email_login}`)
        })
      } else {
        console.error(`  ❌ NO SE ENCONTRÓ NINGÚN REGISTRO DE MATIAS POR EMAIL`)
      }
      
      console.error(`  🔍 BÚSQUEDA ESPECÍFICA POR ID:`)
      console.error(`     ID 93: ${id93 ? '✅ ENCONTRADO' : '❌ NO ESTÁ EN LA RESPUESTA'}`)
      if (id93) {
        const attrs93 = id93.attributes || id93
        console.error(`        Email: ${attrs93.email_login || id93.email_login}`)
        console.error(`        DocumentId: ${id93.documentId}`)
      }
      console.error(`     ID 96: ${id96 ? '✅ ENCONTRADO' : '❌ NO ESTÁ EN LA RESPUESTA'}`)
      if (id96) {
        const attrs96 = id96.attributes || id96
        console.error(`        Email: ${attrs96.email_login || id96.email_login}`)
        console.error(`        DocumentId: ${id96.documentId}`)
      }
      console.error(`     ID 115: ${id115 ? '✅ ENCONTRADO' : '❌ NO ESTÁ EN LA RESPUESTA'}`)
      if (id115) {
        const attrs115 = id115.attributes || id115
        console.error(`        Email: ${attrs115.email_login || id115.email_login}`)
        console.error(`        DocumentId: ${id115.documentId}`)
      }
      
      console.error(`  ⚠️ CONCLUSIÓN: Si el ID 96 no está en la respuesta, significa que:`)
      console.error(`     - Está en estado DRAFT y no está publicado`)
      console.error(`     - Fue eliminado (soft delete)`)
      console.error(`     - Hay un filtro en Strapi que lo excluye`)
      console.error(`     - La query no lo está trayendo por alguna razón`)
      console.error(`  ✅ DEBE QUEDAR SOLO 1 REGISTRO CON ID 96`)
    }
    
    // FILTRADO DE DUPLICADOS: "Martillo" - Prioridad ABSOLUTA a colaboradores con persona
    // REGLA DE ORO: El que tiene la relación persona SIEMPRE GANA, sin importar el ID
    let cleanedData = response.data
    if (Array.isArray(response.data) && response.data.length > 0) {
      const uniqueColaboradores = new Map<string, any>()
      const duplicatesFound: Array<{ 
        email: string
        ids: number[]
        kept: number
        reason: string
      }> = []
      
      // Iterar sobre todos los colaboradores que vienen de Strapi
      response.data.forEach((col: any) => {
        const attrs = col.attributes || col
        const email = attrs.email_login || col.email_login
        
        // Omitir usuarios sin email
        if (!email) {
          console.warn('[API /chat/colaboradores] ⚠️ Colaborador sin email_login, será omitido:', { 
            id: col.id,
            documentId: col.documentId 
          })
          return
        }
        
        // Validar que tenga ID válido
        if (!col.id || typeof col.id !== 'number') {
          console.warn('[API /chat/colaboradores] ⚠️ Colaborador sin ID numérico válido, será omitido:', { 
            email,
            id: col.id,
            documentId: col.documentId 
          })
          return
        }
        
        // Verificar si existe relación real con persona
        const hasPersona = !!attrs.persona || !!attrs.persona?.data
        
        // Si es el primero que vemos con este email, lo guardamos
        if (!uniqueColaboradores.has(email)) {
          // Log especial para Matias cuando se guarda por primera vez
          if (email === 'matiintranet@gmail.com') {
            console.error('[API /chat/colaboradores] 🚨 MATIAS - PRIMER REGISTRO GUARDADO:')
            console.error('  🔑 ID:', col.id)
            console.error('  👤 Tiene persona:', hasPersona)
          }
          uniqueColaboradores.set(email, col)
        } else {
          const existing = uniqueColaboradores.get(email)
          const existingAttrs = existing.attributes || existing
          const existingHasPersona = !!existingAttrs.persona || !!existingAttrs.persona?.data
          
          // Log especial para Matias durante la desduplicación
          const nombreCompleto = attrs.persona?.nombre_completo || attrs.persona?.data?.nombre_completo || ''
          const isMatias = email === 'matiintranet@gmail.com' || (nombreCompleto.toLowerCase().includes('matias') && nombreCompleto.toLowerCase().includes('riquelme'))
          const existingNombre = existingAttrs.persona?.nombre_completo || existingAttrs.persona?.data?.nombre_completo || ''
          const existingIsMatias = email === 'matiintranet@gmail.com' || (existingNombre.toLowerCase().includes('matias') && existingNombre.toLowerCase().includes('riquelme'))
          
          if (isMatias || existingIsMatias) {
            console.error('[API /chat/colaboradores] 🚨 MATIAS RIQUELME MEDINA - DESDUPLICACIÓN:')
            console.error('  📧 Email:', email)
            console.error('  🔑 ID existente:', existing.id, '(tipo:', typeof existing.id, ')')
            console.error('  🔑 ID nuevo:', col.id, '(tipo:', typeof col.id, ')')
            console.error('  👤 Existente tiene persona:', existingHasPersona)
            console.error('  👤 Nuevo tiene persona:', hasPersona)
            console.error('  📊 Comparación:', Number(col.id), '<', Number(existing.id), '=', Number(col.id) < Number(existing.id))
          }
          
          // REGLA DE ORO:
          // 1. Si el nuevo tiene persona y el guardado NO -> REEMPLAZAR INMEDIATAMENTE
          if (hasPersona && !existingHasPersona) {
            if (isMatias || existingIsMatias) {
              console.error('  ✅ DECISIÓN: Nuevo tiene persona, existente no - REEMPLAZAR con nuevo')
            }
            duplicatesFound.push({
              email,
              ids: [existing.id, col.id],
              kept: col.id,
              reason: 'Nuevo tiene persona, existente no - REEMPLAZADO',
            })
            uniqueColaboradores.set(email, col)
          }
          // 2. Si ambos tienen persona -> Usar el ID MÁS BAJO (el más antiguo/el correcto)
          // Si ninguno tiene persona -> Usar el ID más alto (el más reciente)
          else if (hasPersona === existingHasPersona) {
            if (hasPersona) {
              // AMBOS TIENEN PERSONA: Usar el ID más bajo (el correcto/antiguo)
              if (Number(col.id) < Number(existing.id)) {
                if (isMatias || existingIsMatias) {
                  console.error(`  ✅ DECISIÓN: Ambos tienen persona, nuevo ID (${col.id}) es MENOR que existente (${existing.id}) - REEMPLAZAR`)
                  console.error(`  ⚠️ DEBE SER 96, nuevo es ${col.id}, existente es ${existing.id}`)
                }
                duplicatesFound.push({
                  email,
                  ids: [existing.id, col.id],
                  kept: col.id,
                  reason: 'Ambos tienen persona, nuevo ID es MENOR (correcto)',
                })
                uniqueColaboradores.set(email, col)
              } else {
                if (isMatias || existingIsMatias) {
                  console.error(`  ✅ DECISIÓN: Ambos tienen persona, existente ID (${existing.id}) es MENOR que nuevo (${col.id}) - MANTENER`)
                  console.error(`  ⚠️ DEBE SER 96, existente es ${existing.id}, nuevo es ${col.id}`)
                }
                duplicatesFound.push({
                  email,
                  ids: [existing.id, col.id],
                  kept: existing.id,
                  reason: 'Ambos tienen persona, existente ID es MENOR (correcto)',
                })
              }
            } else {
              // NINGUNO TIENE PERSONA: Usar el ID más alto (el más reciente)
              if (Number(col.id) > Number(existing.id)) {
                duplicatesFound.push({
                  email,
                  ids: [existing.id, col.id],
                  kept: col.id,
                  reason: 'Ninguno tiene persona, nuevo ID es mayor',
                })
                uniqueColaboradores.set(email, col)
              } else {
                duplicatesFound.push({
                  email,
                  ids: [existing.id, col.id],
                  kept: existing.id,
                  reason: 'Ninguno tiene persona, existente ID es mayor',
                })
              }
            }
          }
          // 3. Si el guardado tiene persona y el nuevo no -> IGNORAR EL NUEVO (aunque tenga ID mayor)
          else {
            duplicatesFound.push({
              email,
              ids: [existing.id, col.id],
              kept: existing.id,
              reason: 'Existente tiene persona, nuevo no - IGNORADO',
            })
            // No hacer nada, ya tenemos el correcto en el Map
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
      cleanedData = Array.from(uniqueColaboradores.values())
      
      // CRÍTICO: Asegurar que cada colaborador tenga el ID correcto del content-type Intranet-colaboradores
      // Log detallado de IDs que se están retornando
      console.error('[API /chat/colaboradores] 🔍 IDs QUE SE RETORNAN AL FRONTEND:')
      cleanedData.forEach((col: any) => {
        const attrs = col.attributes || col
        const email = attrs.email_login || col.email_login
        const id = col.id // ID del content-type Intranet-colaboradores
        const documentId = col.documentId
        const personaId = attrs.persona?.id || attrs.persona?.data?.id
        const hasPersona = !!attrs.persona || !!attrs.persona?.data
        const nombreCompleto = attrs.persona?.nombre_completo || attrs.persona?.data?.nombre_completo || ''
        
        // Log especial para Matias Riquelme Medina
        if (email === 'matiintranet@gmail.com' || (nombreCompleto.toLowerCase().includes('matias') && nombreCompleto.toLowerCase().includes('riquelme'))) {
          console.error(`  🚨 MATIAS RIQUELME MEDINA DETECTADO EN RESPUESTA FINAL:`)
          console.error(`     📧 Email: ${email}`)
          console.error(`     🔑 ID del content-type Intranet-colaboradores: ${id}`)
          console.error(`     📄 documentId: ${documentId}`)
          console.error(`     👤 persona.id: ${personaId}`)
          console.error(`     ✅ ID que se retorna: ${id}`)
          console.error(`     ⚠️ DEBE SER 96, NO 115, NO 93`)
          if (id !== 96) {
            console.error(`     ❌ ERROR: Se está retornando ID ${id} en lugar de 96`)
          } else {
            console.error(`     ✅ CORRECTO: Se está retornando ID 96`)
          }
        }
        
        console.error(`  📧 Email: ${email} - ID: ${id} - documentId: ${documentId} - personaId: ${personaId} - Tiene persona: ${hasPersona}`)
      })
      
      console.log('[API /chat/colaboradores] ✅ Limpieza de duplicados completada:', {
        originalCount: response.data.length,
        cleanedCount: cleanedData.length,
        duplicatesRemoved: response.data.length - cleanedData.length,
        duplicatesFound: duplicatesFound.length,
      })
    }
    
    // Devolver respuesta con datos limpios
    // CRÍTICO: Asegurar que cada item tenga el ID correcto del content-type Intranet-colaboradores
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

