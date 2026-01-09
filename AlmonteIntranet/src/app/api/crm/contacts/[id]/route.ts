import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

interface PersonaAttributes {
  nombre_completo?: string
  nombres?: string
  primer_apellido?: string
  segundo_apellido?: string
  rut?: string
  genero?: string
  cumpleagno?: string
  activo?: boolean
  nivel_confianza?: 'baja' | 'media' | 'alta'
  origen?: 'mineduc' | 'csv' | 'manual' | 'crm' | 'web' | 'otro'
  emails?: Array<{ email?: string; principal?: boolean }>
  telefonos?: Array<{ telefono_norm?: string; telefono_raw?: string; principal?: boolean }>
}

/**
 * GET /api/crm/contacts/[id]
 * Obtiene un contacto específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const paramsObj = new URLSearchParams({
      'populate[emails]': 'true',
      'populate[telefonos]': 'true',
      'populate[imagen]': 'true',
      'populate[tags]': 'true',
      // Populate completo de trayectorias con TODAS sus relaciones
      // ⚠️ IMPORTANTE: No usar fields para colegio, necesitamos todos los campos incluyendo id
      'populate[trayectorias][populate][colegio][populate][comuna]': 'true',
      // ⚠️ Populate de curso y asignatura (SON RELACIONES)
      'populate[trayectorias][populate][curso]': 'true',
      'populate[trayectorias][populate][asignatura]': 'true',
      'populate[trayectorias][populate][curso_asignatura]': 'true',
    })

    const response = await strapiClient.get<StrapiResponse<StrapiEntity<PersonaAttributes>>>(
      `/api/personas/${id}?${paramsObj.toString()}`
    )

    return NextResponse.json({
      success: true,
      data: response.data,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/contacts/[id] GET] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener contacto',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * PUT /api/crm/contacts/[id]
 * Actualiza un contacto
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Obtener el ID numérico de la persona si tenemos documentId
    let personaIdNum: number | string = id
    const isDocumentId = typeof id === 'string' && !/^\d+$/.test(id)
    
    if (isDocumentId) {
      try {
        // Intentar obtener la persona para obtener su ID numérico
        const personaResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
          `/api/personas/${id}?fields=id`
        )
        // Verificar si data es un objeto único (no array) y tiene id
        const personaData = Array.isArray(personaResponse.data) ? personaResponse.data[0] : personaResponse.data
        if (personaData && typeof personaData === 'object' && 'id' in personaData) {
          personaIdNum = personaData.id as number
        }
      } catch (err) {
        // Si falla, intentar buscar por documentId
        try {
          const personaFilterResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>[]>>(
            `/api/personas?filters[documentId][$eq]=${id}&fields=id`
          )
          if (personaFilterResponse.data && Array.isArray(personaFilterResponse.data) && personaFilterResponse.data.length > 0) {
            const firstPersona = personaFilterResponse.data[0]
            if (firstPersona && typeof firstPersona === 'object' && 'id' in firstPersona) {
              personaIdNum = firstPersona.id as number
            }
          }
        } catch (filterErr) {
          console.error('[API /crm/contacts/[id] PUT] Error al obtener ID numérico de persona:', filterErr)
          // Continuar con el id original si no se puede obtener el numérico
        }
      }
    }
    
    const body = await request.json()

    // Validaciones básicas
    if (!body.nombres || !body.nombres.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'El nombre es obligatorio',
        },
        { status: 400 }
      )
    }

    // Preparar datos para Strapi
    const personaData: any = {
      data: {
        nombres: body.nombres.trim(),
        ...(body.primer_apellido && { primer_apellido: body.primer_apellido.trim() }),
        ...(body.segundo_apellido && { segundo_apellido: body.segundo_apellido.trim() }),
        ...(body.rut && { rut: body.rut.trim() }),
        ...(body.genero && { genero: body.genero }),
        ...(body.cumpleagno && { cumpleagno: body.cumpleagno }),
        ...(body.activo !== undefined && { activo: body.activo }),
        ...(body.nivel_confianza && { nivel_confianza: body.nivel_confianza }),
        ...(body.origen && { origen: body.origen }),
      },
    }

    // Agregar emails si existen
    if (body.emails && Array.isArray(body.emails) && body.emails.length > 0) {
      personaData.data.emails = body.emails.map((emailItem: any, index: number) => {
        // Manejar tanto string como objeto
        const emailValue = typeof emailItem === 'string' ? emailItem : emailItem.email || ''
        return {
          email: typeof emailValue === 'string' ? emailValue.trim() : String(emailValue).trim(),
          principal: typeof emailItem === 'object' && emailItem.principal !== undefined ? emailItem.principal : index === 0,
        }
      })
    }

    // Agregar telefonos si existen
    if (body.telefonos && Array.isArray(body.telefonos) && body.telefonos.length > 0) {
      personaData.data.telefonos = body.telefonos.map((telefonoItem: any, index: number) => {
        // Manejar tanto string como objeto
        const telefonoValue = typeof telefonoItem === 'string' 
          ? telefonoItem 
          : telefonoItem.telefono_raw || telefonoItem.telefono || telefonoItem.numero || ''
        return {
          telefono_raw: typeof telefonoValue === 'string' ? telefonoValue.trim() : String(telefonoValue).trim(),
          principal: typeof telefonoItem === 'object' && telefonoItem.principal !== undefined ? telefonoItem.principal : index === 0,
        }
      })
    }

    const response = await strapiClient.put<StrapiResponse<StrapiEntity<PersonaAttributes>>>(
      `/api/personas/${id}`,
      personaData
    )

    // Si se proporcionó una trayectoria, actualizarla o crearla
    if (body.trayectoria) {
      try {
        // Buscar trayectorias existentes de esta persona usando ID numérico
        const trayectoriasResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
          // ⚠️ IMPORTANTE: El content type en Strapi es "persona-trayectorias"
          `/api/persona-trayectorias?filters[persona][id][$eq]=${personaIdNum}&filters[is_current][$eq]=true`
        )
        
        const trayectoriasExistentes = Array.isArray(trayectoriasResponse.data) 
          ? trayectoriasResponse.data 
          : (trayectoriasResponse.data && typeof trayectoriasResponse.data === 'object' && 'data' in trayectoriasResponse.data && Array.isArray((trayectoriasResponse.data as any).data))
          ? (trayectoriasResponse.data as any).data
          : []

        // Validar colegioId
        let colegioIdNum: number | null = null
        
        if (body.trayectoria.colegio === null || body.trayectoria.colegio === undefined) {
          console.warn('⚠️ [API /crm/contacts/[id] PUT] colegio es null/undefined, omitiendo trayectoria')
        } else {
          // Manejar formato { connect: [id] } o ID directo
          if (body.trayectoria.colegio && typeof body.trayectoria.colegio === 'object' && 'connect' in body.trayectoria.colegio) {
            // Formato { connect: [id] }
            const connectArray = body.trayectoria.colegio.connect
            if (Array.isArray(connectArray) && connectArray.length > 0) {
              colegioIdNum = parseInt(String(connectArray[0]))
            }
          } else if (typeof body.trayectoria.colegio === 'number') {
            // ID directo como número
            colegioIdNum = body.trayectoria.colegio
          } else {
            // Intentar parsear como string
            colegioIdNum = parseInt(String(body.trayectoria.colegio))
          }
          
          if (!colegioIdNum || colegioIdNum === 0 || isNaN(colegioIdNum)) {
            console.warn('⚠️ [API /crm/contacts/[id] PUT] ID de colegio inválido, omitiendo trayectoria:', {
              colegioId: body.trayectoria.colegio,
              colegioIdNum,
              tipo: typeof body.trayectoria.colegio,
            })
          }
        }
        
        if (colegioIdNum && colegioIdNum > 0 && !isNaN(colegioIdNum)) {
          if (trayectoriasExistentes.length > 0) {
            // Actualizar la trayectoria actual
            const trayectoriaActual = trayectoriasExistentes[0]
            const trayectoriaId = trayectoriaActual.documentId || trayectoriaActual.id
            
            const trayectoriaUpdateData = {
              data: {
                colegio: { connect: [colegioIdNum] },
                cargo: body.trayectoria.cargo || null,
                is_current: body.trayectoria.is_current !== undefined ? body.trayectoria.is_current : true,
              },
            }
            // ⚠️ IMPORTANTE: El content type en Strapi es "persona-trayectorias"
            await strapiClient.put(`/api/persona-trayectorias/${trayectoriaId}`, trayectoriaUpdateData)
            console.log('✅ [API /crm/contacts/[id] PUT] Trayectoria actualizada')
          } else {
            // Crear nueva trayectoria
            const trayectoriaData = {
              data: {
                persona: { connect: [typeof personaIdNum === 'number' ? personaIdNum : parseInt(String(personaIdNum))] },
                colegio: { connect: [colegioIdNum] },
                cargo: body.trayectoria.cargo || null,
                is_current: body.trayectoria.is_current !== undefined ? body.trayectoria.is_current : true,
              },
            }
            // ⚠️ IMPORTANTE: El content type en Strapi es "persona-trayectorias"
            await strapiClient.post('/api/persona-trayectorias', trayectoriaData)
            console.log('✅ [API /crm/contacts/[id] PUT] Trayectoria creada')
          }
        }
      } catch (trayectoriaError: any) {
        console.error('[API /crm/contacts/[id] PUT] Error al actualizar/crear trayectoria:', trayectoriaError)
        // No fallar si la trayectoria no se puede crear/actualizar, solo loguear
      }
    }

    // Revalidar para sincronización bidireccional
    revalidatePath('/crm/personas')
    revalidatePath(`/crm/personas/${id}`)
    revalidatePath('/crm/personas/[id]', 'page')
    revalidatePath('/crm/contacts')
    revalidateTag('personas', 'max')
    revalidateTag('contacts', 'max')

    return NextResponse.json({
      success: true,
      data: response.data,
      message: 'Contacto actualizado exitosamente',
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/contacts/[id] PUT] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al actualizar contacto',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * DELETE /api/crm/contacts/[id]
 * Elimina un contacto permanentemente
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    try {
      await strapiClient.delete(`/api/personas/${id}`)

      // Revalidar para sincronización bidireccional
      revalidatePath('/crm/personas')
      revalidatePath(`/crm/personas/${id}`)
      revalidatePath('/crm/personas/[id]', 'page')
      revalidatePath('/crm/contacts')
      revalidateTag('personas', 'max')
      revalidateTag('contacts', 'max')

      return NextResponse.json({
        success: true,
        message: 'Contacto eliminado permanentemente',
      }, { status: 200 })
    } catch (deleteError: any) {
      // Si el error es por respuesta vacía pero el status fue 200/204, considerar éxito
      if (deleteError.status === 200 || deleteError.status === 204) {
        return NextResponse.json({
          success: true,
          message: 'Contacto eliminado permanentemente',
        }, { status: 200 })
      }
      throw deleteError
    }
  } catch (error: any) {
    console.error('[API /crm/contacts/[id] DELETE] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al eliminar contacto',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

