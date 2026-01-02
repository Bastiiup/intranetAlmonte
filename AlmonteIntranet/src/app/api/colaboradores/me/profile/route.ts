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
 */
async function getAuthColaborador() {
  try {
    const cookieStore = await cookies()
    const colaboradorStr = cookieStore.get('auth_colaborador')?.value

    if (!colaboradorStr) {
      return null
    }

    return JSON.parse(colaboradorStr)
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
    // PRIORIDAD: Obtener datos completos del colaborador desde Strapi para tener la estructura correcta
    let personaId: string | null = null
    let personaDocumentId: string | null = null
    let personaRut: string | null = null

    // Primero intentar usar datos de cookie directamente (más rápido y confiable)
    if (colaborador.persona?.documentId) {
      personaDocumentId = colaborador.persona.documentId
      personaId = colaborador.persona.id?.toString() || null
      personaRut = colaborador.persona.rut
      console.log('[API /colaboradores/me/profile] Usando datos de persona desde cookie:', {
        personaDocumentId,
        personaId,
        personaRut,
      })
    } else if (colaborador.persona?.id) {
      personaId = String(colaborador.persona.id)
      personaRut = colaborador.persona.rut
      console.log('[API /colaboradores/me/profile] Usando ID de persona desde cookie:', personaId)
    }

    // Si no tenemos datos de persona en cookie, intentar obtener desde Strapi
    // OPTIMIZACIÓN: Si tenemos documentId, usarlo directamente. Si no, buscar por email_login (más confiable que ID numérico)
    if (!personaDocumentId && !personaId) {
      try {
        let colaboradorResponse: any
        
        // Si tenemos documentId, usarlo directamente (más confiable)
        if (colaborador.documentId) {
          console.log('[API /colaboradores/me/profile] Obteniendo colaborador por documentId:', colaborador.documentId)
          colaboradorResponse = await strapiClient.get<any>(
            `/api/colaboradores/${colaborador.documentId}?populate[persona][fields]=rut,nombres,primer_apellido,segundo_apellido,nombre_completo,genero,cumpleagno,bio,job_title,telefono_principal,direccion,redes_sociales,skills&populate[persona][populate][imagen][populate]=*&populate[persona][populate][telefonos]=*&populate[persona][populate][emails]=*`
          )
        } 
        // Si no hay documentId pero hay email_login, buscar por email (más confiable que ID numérico)
        else if (colaborador.email_login) {
          console.log('[API /colaboradores/me/profile] Obteniendo colaborador por email_login:', colaborador.email_login)
          colaboradorResponse = await strapiClient.get<any>(
            `/api/colaboradores?filters[email_login][$eq]=${encodeURIComponent(colaborador.email_login)}&populate[persona][fields]=rut,nombres,primer_apellido,segundo_apellido,nombre_completo,genero,cumpleagno,bio,job_title,telefono_principal,direccion,redes_sociales,skills&populate[persona][populate][imagen][populate]=*&populate[persona][populate][telefonos]=*&populate[persona][populate][emails]=*`
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
            `/api/colaboradores/${colaboradorId}?populate[persona][fields]=rut,nombres,primer_apellido,segundo_apellido,nombre_completo,genero,cumpleagno,bio,job_title,telefono_principal,direccion,redes_sociales,skills&populate[persona][populate][imagen][populate]=*&populate[persona][populate][telefonos]=*&populate[persona][populate][emails]=*`
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
          personaRut = persona.attributes?.rut || persona.rut || colaborador.persona?.rut
          
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
        
        // Si es 404 y ya intentamos con email_login, no hay más opciones
        // El error ya fue manejado arriba con la búsqueda por email_login
        
        // Si aún no tenemos datos de persona, usar datos de cookie como último recurso
        if (!personaDocumentId && !personaId) {
          if (colaborador.persona?.documentId) {
            personaDocumentId = colaborador.persona.documentId
          } else if (colaborador.persona?.id) {
            personaId = String(colaborador.persona.id)
          }
          personaRut = colaborador.persona?.rut
          console.log('[API /colaboradores/me/profile] Usando datos de cookie como fallback')
        }
      }
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
    if (personaIdFinal && Object.keys(personaUpdateData.data).length > 0) {
      try {
        // Intentar primero con documentId si está disponible
        const idParaActualizar = personaDocumentId || personaIdFinal
        
        console.log('[API /colaboradores/me/profile] Intentando actualizar persona con ID:', idParaActualizar)
        
        // Actualizar persona (sin imagen por ahora, ya que es un componente)
        await strapiClient.put(`/api/personas/${idParaActualizar}`, personaUpdateData)
        console.log('[API /colaboradores/me/profile] ✅ Persona actualizada exitosamente')
        
        // Si hay imagen para actualizar, intentar actualizarla por separado
        // El componente contacto.imagen requiere una estructura específica
        if (imagenIdParaActualizar) {
          console.log('[API /colaboradores/me/profile] Intentando actualizar componente imagen con ID:', imagenIdParaActualizar)
          
          // Intentar diferentes estructuras para el componente imagen
          const estructurasImagen = [
            // Estructura 1: { file: id }
            { file: imagenIdParaActualizar },
            // Estructura 2: { file: { id: id } }
            { file: { id: imagenIdParaActualizar } },
            // Estructura 3: Solo el ID (puede funcionar si Strapi lo acepta)
            imagenIdParaActualizar,
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
      } catch (personaError: any) {
        console.error('[API /colaboradores/me/profile] Error al actualizar persona:', {
          error: personaError.message,
          status: personaError.status,
          personaIdFinal,
          personaDocumentId,
        })
        
        // Si falla con el ID directo y tenemos RUT, intentar buscar por RUT
        if (personaError.status === 404 && personaRut) {
          try {
            console.log('[API /colaboradores/me/profile] Intentando buscar persona por RUT:', personaRut)
            const personaSearchResponse = await strapiClient.get<any>(
              `/api/personas?filters[rut][$eq]=${encodeURIComponent(personaRut)}&pagination[pageSize]=1`
            )
            
            if (personaSearchResponse.data && Array.isArray(personaSearchResponse.data) && personaSearchResponse.data.length > 0) {
              const personaEncontrada = personaSearchResponse.data[0]
              const personaIdAlternativo = personaEncontrada.documentId || personaEncontrada.id?.toString()
              
              console.log('[API /colaboradores/me/profile] Persona encontrada por RUT, actualizando con ID:', personaIdAlternativo)
              await strapiClient.put(`/api/personas/${personaIdAlternativo}`, personaUpdateData)
              console.log('[API /colaboradores/me/profile] ✅ Persona actualizada usando RUT como fallback')
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
            `/api/colaboradores?filters[usuario][id][$eq]=${user.id}&populate[persona][populate][imagen][populate]=*&populate[persona][populate][telefonos]=*&populate[persona][populate][emails]=*`
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
          `/api/colaboradores/${colaboradorFromCookie.documentId}?populate[persona][fields]=rut,nombres,primer_apellido,segundo_apellido,nombre_completo,genero,cumpleagno,bio,job_title,telefono_principal,direccion,redes_sociales,skills&populate[persona][populate][imagen][populate]=*&populate[persona][populate][telefonos]=*&populate[persona][populate][emails]=*`
        )
      }
      // Prioridad 2: Si no hay documentId pero hay email_login, buscar por email (más confiable)
      else if (colaboradorFromCookie?.email_login) {
        console.log('[API /colaboradores/me/profile GET] Obteniendo por email_login:', colaboradorFromCookie.email_login)
        response = await strapiClient.get<any>(
          `/api/colaboradores?filters[email_login][$eq]=${encodeURIComponent(colaboradorFromCookie.email_login)}&populate[persona][fields]=rut,nombres,primer_apellido,segundo_apellido,nombre_completo,genero,cumpleagno,bio,job_title,telefono_principal,direccion,redes_sociales,skills&populate[persona][populate][imagen][populate]=*&populate[persona][populate][telefonos]=*&populate[persona][populate][emails]=*`
        )
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          response.data = response.data[0]
        }
      }
      // Prioridad 3: Último recurso - intentar con ID numérico (puede fallar)
      else if (colaboradorId) {
        console.log('[API /colaboradores/me/profile GET] Obteniendo por ID numérico (puede fallar):', colaboradorId)
        response = await strapiClient.get<StrapiResponse<StrapiEntity<ColaboradorAttributes>>>(
          `/api/colaboradores/${colaboradorId}?populate[persona][fields]=rut,nombres,primer_apellido,segundo_apellido,nombre_completo,genero,cumpleagno,bio,job_title,telefono_principal,direccion,redes_sociales,skills&populate[persona][populate][imagen][populate]=*&populate[persona][populate][telefonos]=*&populate[persona][populate][emails]=*`
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
          console.log('[API /colaboradores/me/profile GET] Usando datos de cookie como fallback')
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

    // Extraer datos del perfil
    // Normalizar estructura de persona
    const personaAttrs = persona?.attributes || persona || {}
    
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
        imagen: personaAttrs.imagen || persona.imagen,
        telefonos: personaAttrs.telefonos || persona.telefonos,
        emails: personaAttrs.emails || persona.emails,
        direccion: personaAttrs.direccion || persona.direccion,
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

