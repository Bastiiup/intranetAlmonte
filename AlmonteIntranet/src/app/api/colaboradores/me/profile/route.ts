/**
 * API Route para actualizar el perfil del colaborador autenticado
 * PUT /api/colaboradores/me/profile
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import { getStreamClient } from '@/lib/stream/client'
import { cookies } from 'next/headers'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

interface ColaboradorAttributes {
  email_login: string
  rol?: string
  activo: boolean
  persona?: any
  usuario?: any
}

/**
 * Obtiene el colaborador autenticado desde las cookies
 * Busca en múltiples nombres de cookie para compatibilidad:
 * 1. auth_colaborador (nombre estándar)
 * 2. colaboradorData (usado por login y logging)
 * 3. colaborador (compatibilidad)
 */
async function getAuthColaborador() {
  try {
    const cookieStore = await cookies()
    
    // Buscar en orden de prioridad: auth_colaborador, colaboradorData, colaborador
    const cookieNames = ['auth_colaborador', 'colaboradorData', 'colaborador']
    
    for (const cookieName of cookieNames) {
      const colaboradorStr = cookieStore.get(cookieName)?.value
      if (colaboradorStr) {
        try {
          const colaborador = JSON.parse(colaboradorStr)
          // Asegurar que tenga id y documentId si están disponibles
          if (colaborador && !colaborador.documentId && colaborador.id) {
            colaborador.documentId = colaborador.id
          }
          return colaborador
        } catch (parseError) {
          console.warn(`[API /colaboradores/me/profile] Error al parsear cookie ${cookieName}:`, parseError)
          continue
        }
      }
    }

    return null
  } catch (error) {
    console.error('[API /colaboradores/me/profile] Error al obtener colaborador de cookies:', error)
    return null
  }
}

/**
 * PUT /api/colaboradores/me/profile
 * Actualiza el perfil del colaborador autenticado
 */
export async function PUT(request: NextRequest) {
  try {
    // Verificar autenticación
    const colaborador = await getAuthColaborador()
    if (!colaborador) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Obtener colaboradorId (puede ser id o documentId)
    const colaboradorId = colaborador.documentId || colaborador.id
    const body = await request.json()

    console.log('[API /colaboradores/me/profile] Actualizando perfil:', { 
      colaboradorId, 
      colaboradorIdType: colaborador.documentId ? 'documentId' : 'id',
      body 
    })

    // Obtener persona actual para tener su ID/documentId
    // PRIORIDAD: Primero obtener colaborador completo, luego usar RUT si es necesario
    let personaId: string | null = null
    let personaDocumentId: string | null = null
    let personaRut: string | null = null

    // Primero intentar con datos de cookie (más rápido)
    if (colaborador.persona?.documentId) {
      personaDocumentId = colaborador.persona.documentId
      personaId = colaborador.persona.id?.toString() || null
      personaRut = colaborador.persona.rut || null
      console.log('[API /colaboradores/me/profile] Usando datos de persona desde cookie:', {
        personaDocumentId,
        personaId,
        personaRut,
      })
    } else if (colaborador.persona?.id) {
      personaId = String(colaborador.persona.id)
      personaRut = colaborador.persona.rut || null
      console.log('[API /colaboradores/me/profile] Usando ID de persona desde cookie:', personaId)
    }

    // Si no tenemos datos de persona en cookie, obtener desde Strapi por colaborador
    if (!personaDocumentId && !personaId) {
      try {
        let colaboradorResponse: any
        
        // Si tenemos documentId, usarlo directamente (más confiable)
        if (colaborador.documentId) {
          console.log('[API /colaboradores/me/profile] Obteniendo colaborador por documentId:', colaborador.documentId)
          colaboradorResponse = await strapiClient.get<any>(
            `/api/colaboradores/${colaborador.documentId}?populate[persona][fields]=rut,nombres,primer_apellido,segundo_apellido,nombre_completo,genero,cumpleagno,bio,job_title,telefono_principal,direccion,redes_sociales,skills&populate[persona][populate][telefonos]=*&populate[persona][populate][emails]=*`
          )
        } 
        // Si no hay documentId pero hay email_login, buscar por email (más confiable que ID numérico)
        else if (colaborador.email_login) {
          console.log('[API /colaboradores/me/profile] Obteniendo colaborador por email_login:', colaborador.email_login)
          colaboradorResponse = await strapiClient.get<any>(
            `/api/colaboradores?filters[email_login][$eq]=${encodeURIComponent(colaborador.email_login)}&populate[persona][fields]=rut,nombres,primer_apellido,segundo_apellido,nombre_completo,genero,cumpleagno,bio,job_title,telefono_principal,direccion,redes_sociales,skills&populate[persona][populate][telefonos]=*&populate[persona][populate][emails]=*`
          )
          // Si es búsqueda por filtro, la respuesta viene en array
          if (colaboradorResponse.data && Array.isArray(colaboradorResponse.data) && colaboradorResponse.data.length > 0) {
            colaboradorResponse.data = colaboradorResponse.data[0]
          }
        }
        // Último recurso: intentar con ID numérico (puede fallar)
        else if (colaboradorId) {
          console.log('[API /colaboradores/me/profile] Obteniendo colaborador por ID numérico (puede fallar):', colaboradorId)
          colaboradorResponse = await strapiClient.get<any>(
            `/api/colaboradores/${colaboradorId}?populate[persona][fields]=rut,nombres,primer_apellido,segundo_apellido,nombre_completo,genero,cumpleagno,bio,job_title,telefono_principal,direccion,redes_sociales,skills&populate[persona][populate][telefonos]=*&populate[persona][populate][emails]=*`
          )
        } else {
          throw new Error('No hay documentId, email_login ni ID disponible')
        }
        
        let colaboradorData = colaboradorResponse.data
        if (Array.isArray(colaboradorData)) {
          colaboradorData = colaboradorData[0]
        }
        colaboradorData = colaboradorData?.attributes || colaboradorData
        
        // Si la búsqueda fue por email y no encontramos nada, lanzar error
        if (!colaboradorData && colaborador.email_login) {
          throw new Error(`Colaborador no encontrado con email: ${colaborador.email_login}`)
        }
        
        // Extraer persona con todas sus variantes posibles
        const persona = colaboradorData?.persona?.data || colaboradorData?.persona
        
        if (persona) {
          // Priorizar documentId (más confiable en Strapi v4/v5)
          personaDocumentId = persona.documentId || persona.id?.toString()
          personaId = persona.id?.toString() || persona.documentId
          if (!personaRut) personaRut = persona.attributes?.rut || persona.rut || colaborador.persona?.rut
          
          console.log('[API /colaboradores/me/profile] Persona obtenida desde Strapi:', {
            personaDocumentId,
            personaId,
            personaRut,
          })
        }
      } catch (error: any) {
        console.error('[API /colaboradores/me/profile] Error al obtener colaborador desde Strapi:', {
          error: error.message,
          status: error.status,
          colaboradorId,
        })
        
        // Si aún no tenemos datos de persona, usar datos de cookie como último recurso
        if (!personaDocumentId && !personaId) {
          if (colaborador.persona?.documentId) {
            personaDocumentId = colaborador.persona.documentId
          } else if (colaborador.persona?.id) {
            personaId = String(colaborador.persona.id)
          }
          if (!personaRut) personaRut = colaborador.persona?.rut
          console.log('[API /colaboradores/me/profile] Usando datos de cookie como fallback')
        }
      }
    }

    // Si tenemos RUT pero no ID, intentar buscar persona por RUT (método alternativo)
    if (personaRut && !personaDocumentId && !personaId) {
      try {
        const rutString = String(personaRut).trim()
        console.log('[API /colaboradores/me/profile] 🔍 Buscando persona por RUT (método alternativo):', rutString)
        
        const personaSearchResponse = await strapiClient.get<any>(
          `/api/personas?filters[rut][$eq]=${encodeURIComponent(rutString)}&populate[imagen][populate]=*&pagination[pageSize]=1`
        )
        
        if (personaSearchResponse.data && Array.isArray(personaSearchResponse.data) && personaSearchResponse.data.length > 0) {
          const personaEncontrada = personaSearchResponse.data[0]
          personaDocumentId = personaEncontrada.documentId || personaEncontrada.id?.toString() || null
          personaId = personaEncontrada.id?.toString() || personaEncontrada.documentId || null
          
          console.log('[API /colaboradores/me/profile] ✅ Persona encontrada por RUT:', {
            personaDocumentId,
            personaId,
            personaRut: rutString,
          })
        } else {
          console.warn('[API /colaboradores/me/profile] ⚠️ No se encontró persona por RUT')
        }
      } catch (rutError: any) {
        console.warn('[API /colaboradores/me/profile] Error al buscar persona por RUT:', {
          error: rutError.message,
          status: rutError.status,
        })
      }
    }

    // Validar que tenemos al menos un ID o RUT
    if (!personaDocumentId && !personaId && !personaRut) {
      return NextResponse.json(
        { success: false, error: 'No se pudo obtener información de la persona. Se requiere ID o RUT.' },
        { status: 400 }
      )
    }

    // Usar documentId preferentemente, si no está disponible usar id
    const personaIdFinal = personaDocumentId || personaId

    // Preparar datos de actualización de persona
    const personaUpdateData: any = {
      data: {},
    }

    // Actualizar campos básicos de persona
    if (body.nombres !== undefined) personaUpdateData.data.nombres = body.nombres?.trim() || null
    if (body.primer_apellido !== undefined) personaUpdateData.data.primer_apellido = body.primer_apellido?.trim() || null
    if (body.segundo_apellido !== undefined) personaUpdateData.data.segundo_apellido = body.segundo_apellido?.trim() || null
    if (body.genero !== undefined) personaUpdateData.data.genero = body.genero || null
    if (body.cumpleagno !== undefined) personaUpdateData.data.cumpleagno = body.cumpleagno || null
    if (body.bio !== undefined) personaUpdateData.data.bio = body.bio?.trim() || null
    if (body.job_title !== undefined) personaUpdateData.data.job_title = body.job_title?.trim() || null

    // Construir nombre_completo si hay nombres
    if (body.nombres || body.primer_apellido || body.segundo_apellido) {
      const nombres = body.nombres?.trim() || ''
      const primerApellido = body.primer_apellido?.trim() || ''
      const segundoApellido = body.segundo_apellido?.trim() || ''
      personaUpdateData.data.nombre_completo = `${nombres} ${primerApellido} ${segundoApellido}`.trim() || null
    }

    // Actualizar imagen si se proporcionó un ID
    // NOTA: El campo 'imagen' en Persona es un componente (contacto.imagen), no una relación Media directa
    // Por ahora, guardamos el ID de imagen para actualizarlo por separado después
    let imagenIdParaActualizar: number | null = null
    if (body.imagen_id) {
      imagenIdParaActualizar = body.imagen_id
      // No incluimos imagen en personaUpdateData por ahora para evitar errores de validación
      // Se actualizará por separado si es necesario
    }

    // Actualizar portada si se proporcionó un ID
    // Similar a imagen, la portada puede ser un componente o relación Media
    let portadaIdParaActualizar: number | null = null
    if (body.portada_id) {
      portadaIdParaActualizar = body.portada_id
    }

    // Actualizar dirección (si existe el campo en Strapi)
    // Intentar actualizar solo si el objeto tiene al menos un campo
    if (body.direccion && typeof body.direccion === 'object') {
      const direccionData: any = {}
      if (body.direccion.line1 !== undefined) direccionData.line1 = body.direccion.line1
      if (body.direccion.line2 !== undefined) direccionData.line2 = body.direccion.line2
      if (body.direccion.city !== undefined) direccionData.city = body.direccion.city
      if (body.direccion.state !== undefined) direccionData.state = body.direccion.state
      if (body.direccion.zipcode !== undefined) direccionData.zipcode = body.direccion.zipcode
      if (body.direccion.country !== undefined) direccionData.country = body.direccion.country
      
      if (Object.keys(direccionData).length > 0) {
        personaUpdateData.data.direccion = direccionData
      }
    }

    // Actualizar redes sociales (guardar en JSON o componente según estructura)
    if (body.redes_sociales && typeof body.redes_sociales === 'object') {
      const redesData: any = {}
      if (body.redes_sociales.facebook !== undefined) redesData.facebook = body.redes_sociales.facebook
      if (body.redes_sociales.twitter !== undefined) redesData.twitter = body.redes_sociales.twitter
      if (body.redes_sociales.instagram !== undefined) redesData.instagram = body.redes_sociales.instagram
      if (body.redes_sociales.linkedin !== undefined) redesData.linkedin = body.redes_sociales.linkedin
      if (body.redes_sociales.github !== undefined) redesData.github = body.redes_sociales.github
      if (body.redes_sociales.skype !== undefined) redesData.skype = body.redes_sociales.skype
      
      if (Object.keys(redesData).length > 0) {
        personaUpdateData.data.redes_sociales = redesData
      }
    }

    // Actualizar skills (guardar como JSON o array)
    if (body.skills !== undefined) {
      if (Array.isArray(body.skills)) {
        personaUpdateData.data.skills = body.skills
      } else if (typeof body.skills === 'string') {
        // Si viene como string separado por comas, convertirlo a array
        personaUpdateData.data.skills = body.skills.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0)
      }
    }

    // Actualizar teléfono si se proporcionó
    if (body.telefono !== undefined) {
      // Si persona tiene componente telefonos, actualizar el primero o crear uno nuevo
      // Por ahora, guardamos en un campo JSON temporal o actualizamos el componente
      personaUpdateData.data.telefono_principal = body.telefono?.trim() || null
    }

    // Actualizar email si se proporcionó (solo si es diferente del email_login)
    if (body.email !== undefined && body.email !== colaborador.email_login) {
      personaUpdateData.data.email_principal = body.email?.trim() || null
    }

    // Actualizar persona en Strapi
    // IMPORTANTE: aunque no haya campos básicos para actualizar, igual debemos permitir actualizar
    // imagen/portada cuando venga imagen_id / portada_id.
    // PRIORIDAD: Si tenemos RUT pero no ID, buscar por RUT primero
    if (Object.keys(personaUpdateData.data).length > 0 || imagenIdParaActualizar || portadaIdParaActualizar) {
      try {
        let idParaActualizar: string | null = null
        
        // Si tenemos RUT pero no ID, buscar por RUT primero (más confiable)
        if (personaRut && !personaIdFinal) {
          try {
            const rutString = String(personaRut).trim()
            console.log('[API /colaboradores/me/profile] Buscando persona por RUT para actualizar:', rutString)
            
            const personaSearchResponse = await strapiClient.get<any>(
              `/api/personas?filters[rut][$eq]=${encodeURIComponent(rutString)}&pagination[pageSize]=1`
            )
            
            if (personaSearchResponse.data && Array.isArray(personaSearchResponse.data) && personaSearchResponse.data.length > 0) {
              const personaEncontrada = personaSearchResponse.data[0]
              idParaActualizar = personaEncontrada.documentId || personaEncontrada.id?.toString() || null
              console.log('[API /colaboradores/me/profile] ✅ Persona encontrada por RUT para actualizar:', idParaActualizar)
            }
          } catch (rutSearchError: any) {
            console.warn('[API /colaboradores/me/profile] Error al buscar persona por RUT para actualizar:', rutSearchError.message)
          }
        }
        
        // Si no encontramos por RUT, usar el ID que tenemos
        if (!idParaActualizar) {
          idParaActualizar = personaDocumentId || personaIdFinal
        }
        
        if (!idParaActualizar) {
          throw new Error('No se pudo obtener ID de persona para actualizar. Se requiere RUT o ID válido.')
        }
        
        console.log('[API /colaboradores/me/profile] Intentando actualizar persona con ID:', idParaActualizar)
        
        // Actualizar persona (sin imagen/portada por ahora, ya que son componentes)
        if (Object.keys(personaUpdateData.data).length > 0) {
          await strapiClient.put(`/api/personas/${idParaActualizar}`, personaUpdateData)
          console.log('[API /colaboradores/me/profile] ✅ Persona actualizada exitosamente')
        } else {
          console.log('[API /colaboradores/me/profile] ℹ️ Sin campos básicos para actualizar; se actualizará solo imagen/portada si corresponde')
        }
        
        // Si hay imagen para actualizar, intentar actualizarla por separado
        // El componente contacto.imagen tiene estructura: { imagen: [array], tipo, formato, estado, vigente_hasta, status }
        // Donde 'imagen' es Multiple Media (array de IDs de archivos)
        if (imagenIdParaActualizar && idParaActualizar) {
          console.log('[API /colaboradores/me/profile] Intentando actualizar componente imagen con ID:', imagenIdParaActualizar)
          
          // Obtener la estructura actual del componente imagen para preservar otros campos
          let estructuraActual: any = null
          try {
            const personaActual = await strapiClient.get<any>(
              `/api/personas/${idParaActualizar}?populate[imagen][populate]=*`
            )
            const personaData = personaActual.data?.attributes || personaActual.data
            estructuraActual = personaData?.imagen || null
          } catch (error) {
            console.warn('[API /colaboradores/me/profile] No se pudo obtener estructura actual de imagen')
          }
          
          // Intentar diferentes estructuras para el componente imagen
          const estructurasImagen = [
            // Estructura 1: Array de IDs (Multiple Media)
            {
              imagen: [imagenIdParaActualizar],
              ...(estructuraActual && {
                tipo: estructuraActual.tipo,
                formato: estructuraActual.formato,
                estado: estructuraActual.estado,
                vigente_hasta: estructuraActual.vigente_hasta,
                status: estructuraActual.status !== undefined ? estructuraActual.status : true,
              }),
            },
            // Estructura 2: Solo el array de imagen (sin otros campos)
            {
              imagen: [imagenIdParaActualizar],
            },
            // Estructura 3: Array directo (si Strapi lo acepta)
            [imagenIdParaActualizar],
            // Estructura 4: Objeto con imagen como objeto
            {
              imagen: { id: imagenIdParaActualizar },
            },
          ]
          
          let imagenActualizada = false
          for (const estructura of estructurasImagen) {
            try {
              console.log('[API /colaboradores/me/profile] Intentando estructura:', JSON.stringify(estructura))
              await strapiClient.put(`/api/personas/${idParaActualizar}`, {
                data: {
                  imagen: estructura
                }
              })
              console.log('[API /colaboradores/me/profile] ✅ Imagen actualizada exitosamente con estructura:', JSON.stringify(estructura))
              imagenActualizada = true
              break
            } catch (imagenError: any) {
              console.warn('[API /colaboradores/me/profile] Estructura falló:', {
                estructura: JSON.stringify(estructura),
                error: imagenError.message,
                status: imagenError.status,
              })
              // Continuar con la siguiente estructura
            }
          }
          
          if (!imagenActualizada) {
            console.warn('[API /colaboradores/me/profile] ⚠️ No se pudo actualizar imagen con ninguna estructura. Puede requerir configuración manual en Strapi Admin.')
            // No fallar el proceso completo si la imagen no se puede actualizar
          }
        }

        // Si hay portada para actualizar, intentar actualizarla por separado
        // Similar a imagen, puede ser un componente o relación Media
        if (portadaIdParaActualizar && idParaActualizar) {
          console.log('[API /colaboradores/me/profile] Intentando actualizar componente portada con ID:', portadaIdParaActualizar)
          
          // Obtener la estructura actual del componente portada para preservar otros campos
          let estructuraActualPortada: any = null
          try {
            const personaActual = await strapiClient.get<any>(
              `/api/personas/${idParaActualizar}?populate[portada][populate]=*`
            )
            const personaData = personaActual.data?.attributes || personaActual.data
            estructuraActualPortada = personaData?.portada || null
          } catch (error) {
            console.warn('[API /colaboradores/me/profile] No se pudo obtener estructura actual de portada')
          }
          
          // Intentar diferentes estructuras para el componente portada
          const estructurasPortada = [
            // Estructura 1: Array de IDs (Multiple Media)
            {
              imagen: [portadaIdParaActualizar],
              ...(estructuraActualPortada && {
                tipo: estructuraActualPortada.tipo,
                formato: estructuraActualPortada.formato,
                estado: estructuraActualPortada.estado,
                vigente_hasta: estructuraActualPortada.vigente_hasta,
                status: estructuraActualPortada.status !== undefined ? estructuraActualPortada.status : true,
              }),
            },
            // Estructura 2: Solo el array de imagen (sin otros campos)
            {
              imagen: [portadaIdParaActualizar],
            },
            // Estructura 3: Array directo (si Strapi lo acepta)
            [portadaIdParaActualizar],
            // Estructura 4: Objeto con imagen como objeto
            {
              imagen: { id: portadaIdParaActualizar },
            },
          ]
          
          let portadaActualizada = false
          for (const estructura of estructurasPortada) {
            try {
              console.log('[API /colaboradores/me/profile] Intentando estructura portada:', JSON.stringify(estructura))
              await strapiClient.put(`/api/personas/${idParaActualizar}`, {
                data: {
                  portada: estructura
                }
              })
              console.log('[API /colaboradores/me/profile] ✅ Portada actualizada exitosamente con estructura:', JSON.stringify(estructura))
              portadaActualizada = true
              break
            } catch (portadaError: any) {
              console.warn('[API /colaboradores/me/profile] Estructura portada falló:', {
                estructura: JSON.stringify(estructura),
                error: portadaError.message,
                status: portadaError.status,
              })
              // Continuar con la siguiente estructura
            }
          }
          
          if (!portadaActualizada) {
            console.warn('[API /colaboradores/me/profile] ⚠️ No se pudo actualizar portada con ninguna estructura. Puede requerir configuración manual en Strapi Admin.')
            // No fallar el proceso completo si la portada no se puede actualizar
          }
        }
      } catch (personaError: any) {
        console.error('[API /colaboradores/me/profile] Error al actualizar persona:', {
          error: personaError.message,
          status: personaError.status,
          personaIdFinal,
          personaDocumentId,
          personaRut,
        })
        
        // Si falla con el ID directo y tenemos RUT, intentar buscar por RUT (fallback adicional)
        if (personaError.status === 404 && personaRut) {
          try {
            const rutString = String(personaRut).trim()
            console.log('[API /colaboradores/me/profile] Intentando buscar persona por RUT (fallback):', rutString)
            const personaSearchResponse = await strapiClient.get<any>(
              `/api/personas?filters[rut][$eq]=${encodeURIComponent(rutString)}&pagination[pageSize]=1`
            )
            
            if (personaSearchResponse.data && Array.isArray(personaSearchResponse.data) && personaSearchResponse.data.length > 0) {
              const personaEncontrada = personaSearchResponse.data[0]
              const personaIdAlternativo = personaEncontrada.documentId || personaEncontrada.id?.toString()
              
              console.log('[API /colaboradores/me/profile] Persona encontrada por RUT, actualizando con ID:', personaIdAlternativo)
              if (Object.keys(personaUpdateData.data).length > 0) {
                await strapiClient.put(`/api/personas/${personaIdAlternativo}`, personaUpdateData)
                console.log('[API /colaboradores/me/profile] ✅ Persona actualizada usando RUT como fallback')
              } else {
                console.log('[API /colaboradores/me/profile] ℹ️ Fallback por RUT: sin campos básicos para actualizar (solo imagen/portada), omitiendo updateData')
              }
            } else {
              console.warn('[API /colaboradores/me/profile] No se encontró persona por RUT')
            }
          } catch (rutError: any) {
            console.error('[API /colaboradores/me/profile] Error al buscar/actualizar persona por RUT:', rutError)
            // Continuar aunque falle la actualización de persona (no crítico)
          }
        } else {
          // Continuar aunque falle la actualización de persona (no crítico)
          console.warn('[API /colaboradores/me/profile] Continuando sin actualizar persona')
        }
      }
    }

    // Actualizar colaborador (email_login, password)
    const colaboradorUpdateData: any = {
      data: {},
    }

    if (body.email_login !== undefined && body.email_login !== colaborador.email_login) {
      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(body.email_login.trim())) {
        return NextResponse.json(
          { success: false, error: 'El email no tiene un formato válido' },
          { status: 400 }
        )
      }
      colaboradorUpdateData.data.email_login = body.email_login.trim()
    }

    if (body.password !== undefined && body.password.trim().length > 0) {
      if (body.password.trim().length < 6) {
        return NextResponse.json(
          { success: false, error: 'La contraseña debe tener al menos 6 caracteres' },
          { status: 400 }
        )
      }
      colaboradorUpdateData.data.password = body.password.trim()
    }

    // Actualizar colaborador si hay cambios
    if (Object.keys(colaboradorUpdateData.data).length > 0) {
      // Usar documentId preferentemente para actualizar
      const idParaActualizarColaborador = colaborador.documentId || colaboradorId
      try {
        await strapiClient.put(`/api/colaboradores/${idParaActualizarColaborador}`, colaboradorUpdateData)
        console.log('[API /colaboradores/me/profile] ✅ Colaborador actualizado')
      } catch (colaboradorError: any) {
        // Si falla con documentId, intentar con id
        if (colaboradorError.status === 404 && colaborador.documentId && colaborador.id) {
          console.log('[API /colaboradores/me/profile] Intentando actualizar colaborador con id numérico:', colaborador.id)
          await strapiClient.put(`/api/colaboradores/${colaborador.id}`, colaboradorUpdateData)
          console.log('[API /colaboradores/me/profile] ✅ Colaborador actualizado con id numérico')
        } else {
          throw colaboradorError
        }
      }
    }

    // Actualizar usuario en Stream Chat si cambió nombre o imagen
    if (personaIdFinal && (body.nombres !== undefined || body.primer_apellido !== undefined || body.imagen_id !== undefined)) {
      try {
        // Obtener datos actualizados de persona usando el ID correcto
        const idParaObtener = personaDocumentId || personaIdFinal
        const personaResponse = await strapiClient.get<any>(
          `/api/personas/${idParaObtener}?populate[imagen][populate]=*`
        )
        const personaData = personaResponse.data?.attributes || personaResponse.data

        const nombre = personaData?.nombre_completo ||
                      `${personaData?.nombres || ''} ${personaData?.primer_apellido || ''}`.trim() ||
                      colaborador.email_login ||
                      'Usuario'

        // Obtener avatar
        let avatar: string | undefined = undefined
        if (personaData?.imagen) {
          if (personaData.imagen.url) {
            avatar = `${process.env.NEXT_PUBLIC_STRAPI_URL || ''}${personaData.imagen.url}`
          } else if (personaData.imagen.data?.attributes?.url) {
            avatar = `${process.env.NEXT_PUBLIC_STRAPI_URL || ''}${personaData.imagen.data.attributes.url}`
          }
        }

        // Obtener RUT para identificar usuario en Stream
        const rut = personaData?.rut || colaborador.persona?.rut
        if (rut) {
          const streamClient = getStreamClient()
          await streamClient.upsertUser({
            id: String(rut),
            name: nombre,
            image: avatar,
          })
          console.log('[API /colaboradores/me/profile] ✅ Usuario actualizado en Stream Chat')
        }
      } catch (streamError: any) {
        console.error('[API /colaboradores/me/profile] Error al actualizar Stream Chat:', streamError)
        // No fallar si Stream Chat falla
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /colaboradores/me/profile] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al actualizar perfil',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * GET /api/colaboradores/me/profile
 * Obtiene el perfil completo del colaborador autenticado
 */
export async function GET(request: NextRequest) {
  try {
    // Obtener el token del header Authorization (mismo método que /api/colaboradores/me)
    const authHeader = request.headers.get('authorization')
    let token: string | null = null
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.replace('Bearer ', '')
    }

    // Obtener colaborador de cookies primero (más confiable)
    let colaboradorId: string | number | null = null
    let colaboradorFromCookie: any = await getAuthColaborador()
    
    if (colaboradorFromCookie) {
      colaboradorId = colaboradorFromCookie.documentId || colaboradorFromCookie.id
      console.log('[API /colaboradores/me/profile GET] Colaborador desde cookie:', {
        id: colaboradorId,
        email: colaboradorFromCookie.email_login,
      })
    }

    // Si hay token y no tenemos colaboradorId, intentar obtener desde Strapi
    if (token && !colaboradorId) {
      try {
        const userResponse = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (userResponse.ok) {
          const user = await userResponse.json()
          
          // Buscar colaborador por usuario
          const colaboradorResponse = await strapiClient.get<any>(
            `/api/colaboradores?filters[usuario][id][$eq]=${user.id}&populate[persona][populate][telefonos]=*&populate[persona][populate][emails]=*&populate[persona][populate][imagen][populate]=*&populate[persona][populate][portada][populate]=*`
          )

          if (colaboradorResponse.data && Array.isArray(colaboradorResponse.data) && colaboradorResponse.data.length > 0) {
            const colaboradorRaw = colaboradorResponse.data[0]
            colaboradorId = colaboradorRaw.documentId || colaboradorRaw.id
            console.log('[API /colaboradores/me/profile GET] Colaborador obtenido desde Strapi por token')
          }
        } else if (userResponse.status === 401) {
          console.warn('[API /colaboradores/me/profile GET] Token JWT inválido o expirado (401), usando datos de cookie')
          // Si el token es inválido, usar datos de cookie si están disponibles
          if (!colaboradorFromCookie) {
            return NextResponse.json(
              { success: false, error: 'Token inválido y no hay datos de sesión' },
              { status: 401 }
            )
          }
        }
      } catch (tokenError: any) {
        console.error('[API /colaboradores/me/profile GET] Error al obtener usuario desde token:', tokenError)
        // Continuar con datos de cookie si están disponibles
      }
    }

    if (!colaboradorId && !colaboradorFromCookie) {
      return NextResponse.json(
        { success: false, error: 'No autenticado o colaborador no encontrado' },
        { status: 401 }
      )
    }

    // Obtener datos completos del colaborador
    // OPTIMIZACIÓN: Usar documentId o email_login directamente (más confiable que ID numérico)
    let response: any
    try {
      // Prioridad 1: Si tenemos documentId, usarlo directamente
      if (colaboradorFromCookie?.documentId) {
        console.log('[API /colaboradores/me/profile GET] Obteniendo por documentId:', colaboradorFromCookie.documentId)
        response = await strapiClient.get<StrapiResponse<StrapiEntity<ColaboradorAttributes>>>(
          `/api/colaboradores/${colaboradorFromCookie.documentId}?populate[persona][fields]=rut,nombres,primer_apellido,segundo_apellido,nombre_completo,genero,cumpleagno,bio,job_title,telefono_principal,direccion,redes_sociales,skills&populate[persona][populate][telefonos]=*&populate[persona][populate][emails]=*&populate[persona][populate][imagen][populate]=*&populate[persona][populate][portada][populate]=*`
        )
      }
      // Prioridad 2: Si no hay documentId pero hay email_login, buscar por email (más confiable)
      else if (colaboradorFromCookie?.email_login) {
        console.log('[API /colaboradores/me/profile GET] Obteniendo por email_login:', colaboradorFromCookie.email_login)
        response = await strapiClient.get<any>(
          `/api/colaboradores?filters[email_login][$eq]=${encodeURIComponent(colaboradorFromCookie.email_login)}&populate[persona][fields]=rut,nombres,primer_apellido,segundo_apellido,nombre_completo,genero,cumpleagno,bio,job_title,telefono_principal,direccion,redes_sociales,skills&populate[persona][populate][telefonos]=*&populate[persona][populate][emails]=*&populate[persona][populate][imagen][populate]=*&populate[persona][populate][portada][populate]=*`
        )
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          response.data = response.data[0]
        }
      }
      // Prioridad 3: Último recurso - intentar con ID numérico (puede fallar)
      else if (colaboradorId) {
        console.log('[API /colaboradores/me/profile GET] Obteniendo por ID numérico (puede fallar):', colaboradorId)
        response = await strapiClient.get<StrapiResponse<StrapiEntity<ColaboradorAttributes>>>(
          `/api/colaboradores/${colaboradorId}?populate[persona][fields]=rut,nombres,primer_apellido,segundo_apellido,nombre_completo,genero,cumpleagno,bio,job_title,telefono_principal,direccion,redes_sociales,skills&populate[persona][populate][telefonos]=*&populate[persona][populate][emails]=*&populate[persona][populate][imagen][populate]=*&populate[persona][populate][portada][populate]=*`
        )
      } else {
        // Si no hay ninguna opción, usar datos de cookie directamente
        console.log('[API /colaboradores/me/profile GET] Usando datos de cookie directamente (sin consultar Strapi)')
        return NextResponse.json({
          success: true,
          data: {
            colaborador: {
              id: colaboradorFromCookie.id || colaboradorFromCookie.documentId,
              email_login: colaboradorFromCookie.email_login,
              rol: colaboradorFromCookie.rol,
              activo: colaboradorFromCookie.activo !== false,
            },
            persona: colaboradorFromCookie.persona || null,
          },
        }, { status: 200 })
      }
      } catch (strapiError: any) {
        console.error('[API /colaboradores/me/profile GET] Error al obtener desde Strapi:', {
          error: strapiError.message,
          status: strapiError.status,
        })
        
        // Si falla, usar datos de cookie directamente como fallback
        if (colaboradorFromCookie) {
          console.log('[API /colaboradores/me/profile GET] Usando datos de cookie como fallback (Strapi falló)')
          
          // Intentar obtener imagen de la persona directamente si tenemos RUT o ID
          let personaData = colaboradorFromCookie.persona || null
          let imagenNormalizada: any = null
          
          if (personaData) {
            const personaRut = personaData.rut
            const personaId = personaData.documentId || personaData.id
            
            // Si no tenemos imagen populada, intentar obtenerla directamente
            if (!personaData.imagen || !personaData.imagen.imagen) {
              try {
                let personaQuery = ''
                if (personaId) {
                  personaQuery = `/api/personas/${personaId}?populate[imagen][populate][imagen][populate]=*&populate[portada][populate][imagen][populate]=*`
                } else if (personaRut) {
                  personaQuery = `/api/personas?filters[rut][$eq]=${encodeURIComponent(String(personaRut))}&populate[imagen][populate][imagen][populate]=*&populate[portada][populate][imagen][populate]=*&pagination[pageSize]=1`
                }
                
                if (personaQuery) {
                  console.log('[API /colaboradores/me/profile GET] Consultando persona directamente desde fallback:', personaQuery)
                  const personaResponse = await strapiClient.get<any>(personaQuery)
                  const personaResponseData = Array.isArray(personaResponse.data) ? personaResponse.data[0] : personaResponse.data
                  const personaResponseAttrs = personaResponseData?.attributes || personaResponseData || {}
                  
                  // Actualizar personaData con datos frescos de Strapi
                  personaData = { ...personaData, ...personaResponseAttrs }
                  
                  // Normalizar imagen
                  const imagenRaw = personaResponseAttrs.imagen
                  if (imagenRaw?.imagen && Array.isArray(imagenRaw.imagen) && imagenRaw.imagen.length > 0) {
                    const primeraImagen = imagenRaw.imagen[0]
                    imagenNormalizada = {
                      url: primeraImagen.url || null,
                      alternativeText: primeraImagen.alternativeText || null,
                      width: primeraImagen.width || null,
                      height: primeraImagen.height || null,
                    }
                  }
                }
              } catch (error: any) {
                console.warn('[API /colaboradores/me/profile GET] Error al obtener imagen en fallback:', error.message)
              }
            } else {
              // Si ya tenemos imagen en cookie, normalizarla
              const imagenRaw = personaData.imagen
              if (imagenRaw?.imagen && Array.isArray(imagenRaw.imagen) && imagenRaw.imagen.length > 0) {
                const primeraImagen = imagenRaw.imagen[0]
                imagenNormalizada = {
                  url: primeraImagen.url || null,
                  alternativeText: primeraImagen.alternativeText || null,
                  width: primeraImagen.width || null,
                  height: primeraImagen.height || null,
                }
              }
            }
            
            // Actualizar personaData con imagen normalizada
            if (imagenNormalizada) {
              personaData = { ...personaData, imagen: imagenNormalizada }
            }
          }
          
          return NextResponse.json({
            success: true,
            data: {
              colaborador: {
                id: colaboradorFromCookie.id || colaboradorFromCookie.documentId,
                email_login: colaboradorFromCookie.email_login,
                rol: colaboradorFromCookie.rol,
                activo: colaboradorFromCookie.activo !== false,
              },
              persona: personaData,
            },
          }, { status: 200 })
        }
        
        throw strapiError
      }

    // Manejar diferentes estructuras de respuesta de Strapi
    let colaboradorRaw = response.data
    if (Array.isArray(colaboradorRaw) && colaboradorRaw.length > 0) {
      colaboradorRaw = colaboradorRaw[0]
    }
    
    const colaboradorRawAny = colaboradorRaw as any
    const colaboradorAttrs = colaboradorRawAny.attributes || colaboradorRawAny
    
    // Extraer persona (puede venir en diferentes formatos)
    let persona = colaboradorAttrs.persona?.data || colaboradorAttrs.persona
    if (persona?.attributes) {
      persona = { ...persona, ...persona.attributes }
    }

    console.log('[API /colaboradores/me/profile GET] Estructura completa de persona:', JSON.stringify(persona, null, 2))

    // Extraer datos del perfil
    // Normalizar estructura de persona
    const personaAttrs = persona?.attributes || persona || {}
    
    console.log('[API /colaboradores/me/profile GET] personaAttrs:', JSON.stringify(personaAttrs, null, 2))
    
    // Si no tenemos imagen populada, intentar obtenerla directamente de la persona
    let imagenRaw = personaAttrs.imagen || persona?.imagen
    if (!imagenRaw || (imagenRaw && !imagenRaw.imagen && !imagenRaw.url && !imagenRaw.data)) {
      // Intentar obtener la persona directamente con populate de imagen
      const personaId = personaAttrs.id || persona?.id || personaAttrs.documentId || persona?.documentId
      const personaRut = personaAttrs.rut || persona?.rut
      
      if (personaId || personaRut) {
        try {
          let personaQuery = ''
          if (personaId) {
            // Populate el componente imagen y dentro de él, el campo imagen (Multiple Media)
            personaQuery = `/api/personas/${personaId}?populate[imagen][populate][imagen][populate]=*&populate[portada][populate][imagen][populate]=*`
          } else if (personaRut) {
            // Populate el componente imagen y dentro de él, el campo imagen (Multiple Media)
            personaQuery = `/api/personas?filters[rut][$eq]=${encodeURIComponent(String(personaRut))}&populate[imagen][populate][imagen][populate]=*&populate[portada][populate][imagen][populate]=*&pagination[pageSize]=1`
          }
          
          if (personaQuery) {
            console.log('[API /colaboradores/me/profile GET] Consultando persona directamente para obtener imagen:', personaQuery)
            const personaResponse = await strapiClient.get<any>(personaQuery)
            const personaData = Array.isArray(personaResponse.data) ? personaResponse.data[0] : personaResponse.data
            const personaDataAttrs = personaData?.attributes || personaData || {}
            imagenRaw = personaDataAttrs.imagen || null
            console.log('[API /colaboradores/me/profile GET] Imagen obtenida de consulta directa:', JSON.stringify(imagenRaw, null, 2))
          }
        } catch (error: any) {
          console.warn('[API /colaboradores/me/profile GET] Error al obtener imagen directamente:', error.message)
        }
      }
    }
    
    // Normalizar imagen del componente contacto.imagen
    // El componente tiene estructura: { imagen: { data: [...] }, tipo, formato, ... }
    // O puede ser: { imagen: [...] } directamente
    // imagenRaw ya está declarado arriba, no redeclarar
    let imagenNormalizada: any = null
    
    console.log('[API /colaboradores/me/profile GET] Estructura de imagen raw:', JSON.stringify(imagenRaw, null, 2))
    
    if (imagenRaw) {
      // Si imagen es un componente con campo imagen (Multiple Media)
      // ESTRUCTURA REAL: { id, tipo, formato, estado, vigente_hasta, status, imagen: [array de objetos] }
      if (imagenRaw.imagen) {
        const imagenData = imagenRaw.imagen
        // Si es array directo (ESTRUCTURA REAL DE STRAPI)
        if (Array.isArray(imagenData) && imagenData.length > 0) {
          const primeraImagen = imagenData[0]
          // La URL viene directamente en el objeto, no en attributes
          imagenNormalizada = {
            url: primeraImagen.url || null,
            alternativeText: primeraImagen.alternativeText || null,
            width: primeraImagen.width || null,
            height: primeraImagen.height || null,
            name: primeraImagen.name || null,
            formats: primeraImagen.formats || null,
          }
          console.log('[API /colaboradores/me/profile GET] ✅ Imagen normalizada desde array:', imagenNormalizada)
        }
        // Si tiene data (estructura Strapi estándar alternativa)
        else if (imagenData.data) {
          const dataArray = Array.isArray(imagenData.data) ? imagenData.data : [imagenData.data]
          if (dataArray.length > 0) {
            const primeraImagen = dataArray[0]
            imagenNormalizada = {
              url: primeraImagen.attributes?.url || primeraImagen.url || null,
              alternativeText: primeraImagen.attributes?.alternativeText || primeraImagen.alternativeText || null,
              width: primeraImagen.attributes?.width || primeraImagen.width || null,
              height: primeraImagen.attributes?.height || primeraImagen.height || null,
            }
          }
        }
        // Si es objeto directo con url
        else if (imagenData.url) {
          imagenNormalizada = {
            url: imagenData.url,
            alternativeText: imagenData.alternativeText || null,
            width: imagenData.width || null,
            height: imagenData.height || null,
          }
        }
      }
      // Si imagen tiene url directa (estructura simple)
      else if (imagenRaw.url) {
        imagenNormalizada = {
          url: imagenRaw.url,
          alternativeText: imagenRaw.alternativeText || null,
          width: imagenRaw.width || null,
          height: imagenRaw.height || null,
        }
      }
      // Si imagen tiene data (estructura Strapi estándar sin componente)
      else if (imagenRaw.data) {
        const dataArray = Array.isArray(imagenRaw.data) ? imagenRaw.data : [imagenRaw.data]
        if (dataArray.length > 0) {
          const primeraImagen = dataArray[0]
          imagenNormalizada = {
            url: primeraImagen.attributes?.url || primeraImagen.url || null,
            alternativeText: primeraImagen.attributes?.alternativeText || primeraImagen.alternativeText || null,
            width: primeraImagen.attributes?.width || primeraImagen.width || null,
            height: primeraImagen.attributes?.height || primeraImagen.height || null,
          }
        }
      }
    }
    
    console.log('[API /colaboradores/me/profile GET] Imagen normalizada:', JSON.stringify(imagenNormalizada, null, 2))
    
    if (!imagenNormalizada && imagenRaw) {
      console.warn('[API /colaboradores/me/profile GET] ⚠️ imagenRaw existe pero no se pudo normalizar:', JSON.stringify(imagenRaw, null, 2))
    } else if (!imagenRaw) {
      console.warn('[API /colaboradores/me/profile GET] ⚠️ imagenRaw es null/undefined. personaAttrs:', JSON.stringify(personaAttrs, null, 2))
    }
    
    // Normalizar portada (similar a imagen)
    let portadaRaw = personaAttrs.portada || persona?.portada
    if (!portadaRaw || (portadaRaw && !portadaRaw.imagen && !portadaRaw.url && !portadaRaw.data)) {
      // Intentar obtener la persona directamente con populate de portada
      const personaId = personaAttrs.id || persona?.id || personaAttrs.documentId || persona?.documentId
      const personaRut = personaAttrs.rut || persona?.rut
      
      if (personaId || personaRut) {
        try {
          let personaQuery = ''
          if (personaId) {
            personaQuery = `/api/personas/${personaId}?populate[portada][populate][imagen][populate]=*`
          } else if (personaRut) {
            personaQuery = `/api/personas?filters[rut][$eq]=${encodeURIComponent(String(personaRut))}&populate[portada][populate][imagen][populate]=*&pagination[pageSize]=1`
          }
          
          if (personaQuery) {
            console.log('[API /colaboradores/me/profile GET] Consultando persona directamente para obtener portada:', personaQuery)
            const personaResponse = await strapiClient.get<any>(personaQuery)
            const personaData = Array.isArray(personaResponse.data) ? personaResponse.data[0] : personaResponse.data
            const personaDataAttrs = personaData?.attributes || personaData || {}
            portadaRaw = personaDataAttrs.portada || null
            console.log('[API /colaboradores/me/profile GET] Portada obtenida de consulta directa:', JSON.stringify(portadaRaw, null, 2))
          }
        } catch (error: any) {
          console.warn('[API /colaboradores/me/profile GET] Error al obtener portada directamente:', error.message)
        }
      }
    }
    
    let portadaNormalizada: any = null
    if (portadaRaw) {
      // Similar a imagen, puede venir en diferentes estructuras
      if (portadaRaw.imagen) {
        const portadaData = portadaRaw.imagen
        if (Array.isArray(portadaData) && portadaData.length > 0) {
          const primeraPortada = portadaData[0]
          portadaNormalizada = {
            url: primeraPortada.url || null,
            alternativeText: primeraPortada.alternativeText || null,
            width: primeraPortada.width || null,
            height: primeraPortada.height || null,
          }
        } else if (portadaData.data) {
          const dataArray = Array.isArray(portadaData.data) ? portadaData.data : [portadaData.data]
          if (dataArray.length > 0) {
            const primeraPortada = dataArray[0]
            portadaNormalizada = {
              url: primeraPortada.attributes?.url || primeraPortada.url || null,
              alternativeText: primeraPortada.attributes?.alternativeText || primeraPortada.alternativeText || null,
              width: primeraPortada.attributes?.width || primeraPortada.width || null,
              height: primeraPortada.attributes?.height || primeraPortada.height || null,
            }
          }
        } else if (portadaData.url) {
          portadaNormalizada = {
            url: portadaData.url,
            alternativeText: portadaData.alternativeText || null,
            width: portadaData.width || null,
            height: portadaData.height || null,
          }
        }
      } else if (portadaRaw.url) {
        portadaNormalizada = {
          url: portadaRaw.url,
          alternativeText: portadaRaw.alternativeText || null,
          width: portadaRaw.width || null,
          height: portadaRaw.height || null,
        }
      } else if (portadaRaw.data) {
        const dataArray = Array.isArray(portadaRaw.data) ? portadaRaw.data : [portadaRaw.data]
        if (dataArray.length > 0) {
          const primeraPortada = dataArray[0]
          portadaNormalizada = {
            url: primeraPortada.attributes?.url || primeraPortada.url || null,
            alternativeText: primeraPortada.attributes?.alternativeText || primeraPortada.alternativeText || null,
            width: primeraPortada.attributes?.width || primeraPortada.width || null,
            height: primeraPortada.attributes?.height || primeraPortada.height || null,
          }
        }
      }
    }
    
    console.log('[API /colaboradores/me/profile GET] Portada normalizada:', JSON.stringify(portadaNormalizada, null, 2))
    
    // Normalizar dirección (puede venir como JSON string o objeto)
    let direccionNormalizada: any = null
    const direccionRaw = personaAttrs.direccion || persona?.direccion
    
    if (direccionRaw) {
      if (typeof direccionRaw === 'string') {
        try {
          direccionNormalizada = JSON.parse(direccionRaw)
        } catch {
          direccionNormalizada = null
        }
      } else if (typeof direccionRaw === 'object') {
        direccionNormalizada = direccionRaw
      }
    }
    
    // Asegurar que el cliente siempre reciba algún valor utilizable para imagen/portada:
    // - Preferir versión normalizada { url, ... } (simple)
    // - Si no, enviar el componente raw (contacto.imagen) para que el frontend pueda extraer la URL
    const imagenParaCliente = imagenNormalizada || imagenRaw || personaAttrs.imagen || persona?.imagen || null
    const portadaParaCliente = portadaNormalizada || portadaRaw || personaAttrs.portada || persona?.portada || null

    const profileData = {
      colaborador: {
        id: colaboradorRawAny.id || colaboradorRawAny.documentId,
        email_login: colaboradorAttrs.email_login || colaboradorRawAny.email_login,
        rol: colaboradorAttrs.rol || colaboradorRawAny.rol,
        activo: colaboradorAttrs.activo !== undefined ? colaboradorAttrs.activo : colaboradorRawAny.activo,
      },
      persona: persona ? {
        id: persona.id || persona.documentId,
        rut: personaAttrs.rut || persona.rut,
        nombres: personaAttrs.nombres || persona.nombres,
        primer_apellido: personaAttrs.primer_apellido || persona.primer_apellido,
        segundo_apellido: personaAttrs.segundo_apellido || persona.segundo_apellido,
        nombre_completo: personaAttrs.nombre_completo || persona.nombre_completo,
        genero: personaAttrs.genero || persona.genero,
        cumpleagno: personaAttrs.cumpleagno || persona.cumpleagno,
        bio: personaAttrs.bio || persona.bio,
        job_title: personaAttrs.job_title || persona.job_title,
        telefono_principal: personaAttrs.telefono_principal || persona.telefono_principal,
        imagen: imagenParaCliente,
        portada: portadaParaCliente,
        telefonos: personaAttrs.telefonos || persona.telefonos,
        emails: personaAttrs.emails || persona.emails,
        direccion: direccionNormalizada,
        redes_sociales: personaAttrs.redes_sociales || persona.redes_sociales,
        skills: personaAttrs.skills || persona.skills,
      } : null,
    }
    
    console.log('[API /colaboradores/me/profile GET] ✅ Perfil obtenido exitosamente:', {
      colaboradorId: profileData.colaborador.id,
      tienePersona: !!profileData.persona,
    })

    return NextResponse.json({
      success: true,
      data: profileData,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /colaboradores/me/profile GET] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener perfil',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

