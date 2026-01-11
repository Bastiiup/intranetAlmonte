/**
 * Servicio para manejo de Personas en Strapi
 * Centraliza la lógica de búsqueda, creación y actualización de personas
 */

import strapiClient from '@/lib/strapi/client'
import { getStrapiId, normalizePersona, buildNombreCompleto, extractStrapiData } from '@/lib/strapi/helpers'

export interface PersonaInput {
  rut: string
  nombres?: string | null
  primer_apellido?: string | null
  segundo_apellido?: string | null
  genero?: string | null
  cumpleagno?: string | null
}

export class PersonaService {
  /**
   * Busca una persona por RUT
   * @param rut - RUT de la persona a buscar
   * @returns Persona encontrada o null si no existe
   */
  static async findByRut(rut: string): Promise<any | null> {
    try {
      const response = await strapiClient.get<any>(
        `/api/personas?filters[rut][$eq]=${encodeURIComponent(rut.trim())}&pagination[pageSize]=1`
      )
      
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        return normalizePersona(response.data[0])
      }
      return null
    } catch (error: any) {
      // Si es 404, la persona no existe (no es un error)
      if (error.status === 404) return null
      // Otros errores se propagan
      throw error
    }
  }
  
  /**
   * Actualiza una persona existente
   * @param personaId - ID de la persona (documentId o id numérico)
   * @param input - Datos a actualizar
   */
  static async update(personaId: string | number, input: Partial<PersonaInput>): Promise<void> {
    const updateData: any = {
      data: {},
    }
    
    if (input.nombres !== undefined) {
      updateData.data.nombres = input.nombres?.trim() || null
    }
    if (input.primer_apellido !== undefined) {
      updateData.data.primer_apellido = input.primer_apellido?.trim() || null
    }
    if (input.segundo_apellido !== undefined) {
      updateData.data.segundo_apellido = input.segundo_apellido?.trim() || null
    }
    if (input.genero !== undefined) {
      updateData.data.genero = input.genero || null
    }
    if (input.cumpleagno !== undefined) {
      updateData.data.cumpleagno = input.cumpleagno || null
    }
    
    // Construir nombre_completo si hay nombres
    if (input.nombres !== undefined || input.primer_apellido !== undefined || input.segundo_apellido !== undefined) {
      const nombreCompleto = buildNombreCompleto(
        input.nombres,
        input.primer_apellido,
        input.segundo_apellido
      )
      updateData.data.nombre_completo = nombreCompleto
    }
    
    // Solo actualizar si hay campos para actualizar
    if (Object.keys(updateData.data).length > 0) {
      await strapiClient.put(`/api/personas/${personaId}`, updateData)
    }
  }
  
  /**
   * Crea una nueva persona
   * @param input - Datos de la persona a crear
   * @returns ID de la persona creada (documentId preferido, o id como fallback)
   */
  static async create(input: PersonaInput): Promise<string | number> {
    const nombreCompleto = buildNombreCompleto(
      input.nombres,
      input.primer_apellido,
      input.segundo_apellido
    )
    
    const createData = {
      data: {
        rut: input.rut.trim(),
        nombres: input.nombres?.trim() || null,
        primer_apellido: input.primer_apellido?.trim() || null,
        segundo_apellido: input.segundo_apellido?.trim() || null,
        nombre_completo: nombreCompleto,
        genero: input.genero || null,
        cumpleagno: input.cumpleagno || null,
        origen: 'manual',
        activo: true,
      },
    }
    
    const response = await strapiClient.post<any>('/api/personas', createData)
    const personaCreada = extractStrapiData(response)
    
    const personaId = getStrapiId(personaCreada)
    if (!personaId) {
      throw new Error('No se pudo obtener el ID de la persona creada. Respuesta: ' + JSON.stringify(response))
    }
    
    return personaId
  }
  
  /**
   * Crea o actualiza una persona
   * Si la persona existe (por RUT), la actualiza. Si no existe, la crea.
   * @param input - Datos de la persona
   * @returns ID de la persona (documentId preferido, o id como fallback)
   */
  static async createOrUpdate(input: PersonaInput): Promise<string | number> {
    // Buscar primero por RUT
    const personaExistente = await this.findByRut(input.rut)
    
    if (personaExistente) {
      // Persona existe, actualizar si hay cambios
      const personaId = getStrapiId(personaExistente)
      if (!personaId) {
        throw new Error('Persona encontrada pero no tiene ID válido')
      }
      
      // Actualizar solo si hay datos nuevos
      const tieneCambios = 
        (input.nombres && input.nombres.trim() !== personaExistente.nombres) ||
        (input.primer_apellido && input.primer_apellido.trim() !== personaExistente.primer_apellido) ||
        (input.segundo_apellido && input.segundo_apellido.trim() !== personaExistente.segundo_apellido) ||
        (input.genero && input.genero !== personaExistente.genero) ||
        (input.cumpleagno && input.cumpleagno !== personaExistente.cumpleagno)
      
      if (tieneCambios) {
        await this.update(personaId, input)
      }
      
      return personaId
    }
    
    // Persona no existe, crear nueva
    try {
      return await this.create(input)
    } catch (createError: any) {
      // Si el error es que el RUT ya existe (race condition), buscar nuevamente
      if (
        createError.status === 400 &&
        (createError.message?.includes('unique') || createError.details?.errors?.some((e: any) => e.path?.[0] === 'rut'))
      ) {
        // Buscar nuevamente la persona (puede que se haya creado entre tanto)
        const personaRecienCreada = await this.findByRut(input.rut)
        if (personaRecienCreada) {
          const personaId = getStrapiId(personaRecienCreada)
          if (personaId) {
            // Intentar actualizar con los datos nuevos
            try {
              await this.update(personaId, input)
            } catch (updateError) {
              // Si falla la actualización, no es crítico, ya tenemos el ID
              console.warn('[PersonaService] Error al actualizar persona después de creación duplicada:', updateError)
            }
            return personaId
          }
        }
        throw new Error('RUT duplicado pero no se pudo encontrar la persona existente')
      }
      
      // Otro tipo de error, propagarlo
      throw createError
    }
  }
}

/**
 * Funciones exportadas directamente para compatibilidad con código existente
 * Wrappers alrededor de los métodos estáticos de PersonaService
 */

/**
 * Busca una persona por ID (documentId o numérico) o RUT
 * @param id - ID de la persona (documentId o numérico)
 * @param rut - RUT de la persona
 * @returns Persona encontrada o null
 */
export async function getPersonaByIdOrRut(
  id: string | number | null | undefined,
  rut: string | null | undefined
): Promise<any | null> {
  // Si tenemos ID, buscar por ID primero
  if (id) {
    try {
      const response = await strapiClient.get<any>(`/api/personas/${id}?populate[imagen][populate]=*&populate[portada][populate]=*&populate[emails]=*&populate[telefonos]=*`)
      const persona = normalizePersona(extractStrapiData(response))
      if (persona) return persona
    } catch (error: any) {
      if (error.status !== 404) {
        console.warn(`[PersonaService] Error al buscar persona por ID ${id}:`, error.message)
      }
    }
  }

  // Si tenemos RUT, buscar por RUT
  if (rut) {
    const persona = await PersonaService.findByRut(rut)
    if (persona) return persona
  }

  return null
}

/**
 * Crea una nueva persona
 * @param personaData - Datos de la persona a crear
 * @returns Persona creada
 */
export async function createPersona(personaData: any): Promise<any> {
  const personaId = await PersonaService.create({
    rut: personaData.rut,
    nombres: personaData.nombres,
    primer_apellido: personaData.primer_apellido,
    segundo_apellido: personaData.segundo_apellido,
    genero: personaData.genero,
    cumpleagno: personaData.cumpleagno,
  })

  // Obtener la persona creada para retornarla
  const persona = await getPersonaByIdOrRut(personaId, personaData.rut)
  if (!persona) {
    throw new Error('Persona creada pero no se pudo obtener')
  }
  return persona
}

/**
 * Actualiza una persona existente
 * @param id - ID de la persona (documentId o numérico)
 * @param rut - RUT de la persona (opcional, para búsqueda)
 * @param updateData - Datos a actualizar
 * @param imagenId - ID de imagen a actualizar (opcional)
 * @param portadaId - ID de portada a actualizar (opcional)
 * @returns Persona actualizada
 */
export async function updatePersona(
  id: string | number | null | undefined,
  rut: string | null | undefined,
  updateData: any,
  imagenId?: string | number | null,
  portadaId?: string | number | null
): Promise<any> {
  // Obtener persona existente
  let persona = await getPersonaByIdOrRut(id, rut)
  if (!persona) {
    throw new Error(`Persona no encontrada para actualizar con ID: ${id} o RUT: ${rut}`)
  }

  const { getStrapiId } = await import('@/lib/strapi/helpers')
  const personaId = getStrapiId(persona)
  if (!personaId) {
    throw new Error('No se pudo obtener un ID válido para la persona a actualizar')
  }

  // Preparar datos de actualización
  const dataToUpdate: any = { ...updateData }

  // Construir nombre_completo si hay cambios en nombres/apellidos
  if (updateData.nombres !== undefined || updateData.primer_apellido !== undefined || updateData.segundo_apellido !== undefined) {
    const nombres = updateData.nombres?.trim() || persona.nombres || ''
    const primerApellido = updateData.primer_apellido?.trim() || persona.primer_apellido || ''
    const segundoApellido = updateData.segundo_apellido?.trim() || persona.segundo_apellido || ''
    dataToUpdate.nombre_completo = `${nombres} ${primerApellido} ${segundoApellido}`.trim() || null
  }

  // Manejar actualización de imagen (componente contacto.imagen)
  if (imagenId !== undefined) {
    if (imagenId === null) {
      dataToUpdate.imagen = null // Eliminar imagen
    } else {
      // Obtener la estructura actual del componente imagen para preservar otros campos
      let currentImagenComponent: any = persona.imagen || null
      dataToUpdate.imagen = {
        imagen: [imagenId], // Array de IDs de archivos
        ...(currentImagenComponent && {
          tipo: currentImagenComponent.tipo,
          formato: currentImagenComponent.formato,
          estado: currentImagenComponent.estado,
          vigente_hasta: currentImagenComponent.vigente_hasta,
          status: currentImagenComponent.status !== undefined ? currentImagenComponent.status : true,
        }),
      }
    }
  }

  // Manejar actualización de portada (componente contacto.portada)
  if (portadaId !== undefined) {
    if (portadaId === null) {
      dataToUpdate.portada = null // Eliminar portada
    } else {
      let currentPortadaComponent: any = persona.portada || null
      dataToUpdate.portada = {
        imagen: [portadaId], // Array de IDs de archivos
        ...(currentPortadaComponent && {
          tipo: currentPortadaComponent.tipo,
          formato: currentPortadaComponent.formato,
          estado: currentPortadaComponent.estado,
          vigente_hasta: currentPortadaComponent.vigente_hasta,
          status: currentPortadaComponent.status !== undefined ? currentPortadaComponent.status : true,
        }),
      }
    }
  }

  // Actualizar usando PersonaService si solo son campos básicos, sino usar strapiClient directamente
  if (imagenId === undefined && portadaId === undefined) {
    // Solo campos básicos, usar PersonaService
    await PersonaService.update(personaId, dataToUpdate)
  } else {
    // Tiene imagen/portada, usar strapiClient directamente
    await strapiClient.put(`/api/personas/${personaId}`, { data: dataToUpdate })
  }

  // Obtener persona actualizada
  persona = await getPersonaByIdOrRut(personaId, rut)
  if (!persona) {
    throw new Error('Persona actualizada pero no se pudo obtener')
  }
  return persona
}

