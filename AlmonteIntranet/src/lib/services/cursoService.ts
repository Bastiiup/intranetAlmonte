/**
 * Servicio para gestionar cursos
 * Separa la lógica de negocio de las rutas API
 */

import strapiClient from '@/lib/strapi/client'
import { getCursoWithPopulate } from '@/lib/strapi/populate-helpers'
import { prepareManyToOneRelation, cleanUndefinedNullFields } from '@/lib/strapi/relations'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'
import type { CursoData } from '@/lib/crm/types'
import type { UpdateCursoInput, CreateCursoInput } from '@/lib/crm/validations'
import { logger } from '@/lib/logging/logger'

export class CursoService {
  /**
   * Obtiene un curso con todos sus datos poblados
   * 
   * @param id - ID del curso (numérico o documentId)
   * @returns Curso con datos poblados o null si no existe
   */
  static async findById(id: string | number): Promise<CursoData | null> {
    try {
      logger.debug('[CursoService] Buscando curso', { id })
      
      const response = await getCursoWithPopulate<CursoData>(id)
      const cursoEntity = Array.isArray(response.data) ? response.data[0] : response.data
      
      if (!cursoEntity) {
        logger.warn('[CursoService] Curso no encontrado', { id })
        return null
      }
      
      // Extraer datos de StrapiEntity (puede venir en attributes o directamente)
      const curso = cursoEntity.attributes 
        ? { ...cursoEntity, ...cursoEntity.attributes, id: cursoEntity.id, documentId: cursoEntity.documentId }
        : cursoEntity
      
      logger.debug('[CursoService] Curso encontrado', { id })
      return curso as CursoData
    } catch (error: any) {
      if (error.status === 404) {
        logger.debug('[CursoService] Curso no encontrado (404)', { id })
        return null
      }
      logger.error('[CursoService] Error al buscar curso', { id, error })
      throw error
    }
  }

  /**
   * Actualiza un curso
   * 
   * @param id - ID del curso a actualizar
   * @param data - Datos a actualizar
   * @returns Curso actualizado
   */
  static async update(
    id: string | number,
    data: UpdateCursoInput
  ): Promise<CursoData> {
    try {
      logger.debug('[CursoService] Actualizando curso', { id, data })
      
      // Preparar datos para Strapi
      const cursoData: { data: Partial<CursoData> & { lista_utiles?: any; materiales?: any[] } } = {
        data: {},
      }

      // Actualizar campos solo si están presentes
      if (data.nombre_curso !== undefined) {
        cursoData.data.nombre_curso = data.nombre_curso.trim()
      }
      if (data.nivel !== undefined) {
        cursoData.data.nivel = data.nivel
      }
      if (data.grado !== undefined) {
        cursoData.data.grado = data.grado
      }
      if (data.paralelo !== undefined) {
        cursoData.data.paralelo = data.paralelo || null
      }
      if (data.activo !== undefined) {
        cursoData.data.activo = data.activo
      }

      // Actualizar relación lista_utiles usando helper
      const listaUtilesRelation = prepareManyToOneRelation(data.lista_utiles, 'lista_utiles')
      if (listaUtilesRelation) {
        Object.assign(cursoData.data, listaUtilesRelation)
      }

      // Actualizar materiales adicionales si se proporcionan
      if (data.materiales !== undefined) {
        if (Array.isArray(data.materiales) && data.materiales.length > 0) {
          cursoData.data.materiales = data.materiales.map((material) => ({
            material_nombre: material.material_nombre || '',
            tipo: material.tipo || 'util',
            cantidad: material.cantidad ? parseInt(String(material.cantidad)) : 1,
            obligatorio: material.obligatorio !== undefined ? material.obligatorio : true,
            ...(material.descripcion && { descripcion: material.descripcion }),
          }))
        } else {
          // Array vacío si no hay materiales
          cursoData.data.materiales = []
        }
      }
      
      // Limpiar campos undefined o null usando helper
      cursoData.data = cleanUndefinedNullFields(cursoData.data) as typeof cursoData.data

      const response = await strapiClient.put<StrapiResponse<StrapiEntity<CursoData>>>(
        `/api/cursos/${id}`,
        cursoData
      )

      const cursoEntity = Array.isArray(response.data) ? response.data[0] : response.data
      
      // Extraer datos de StrapiEntity (puede venir en attributes o directamente)
      const cursoActualizado = cursoEntity?.attributes 
        ? { ...cursoEntity, ...cursoEntity.attributes, id: cursoEntity.id, documentId: cursoEntity.documentId }
        : cursoEntity
      
      logger.success('[CursoService] Curso actualizado exitosamente', { id })
      return cursoActualizado as CursoData
    } catch (error: any) {
      logger.error('[CursoService] Error al actualizar curso', { id, error })
      throw error
    }
  }

  /**
   * Elimina un curso
   * 
   * @param id - ID del curso a eliminar
   */
  static async delete(id: string | number): Promise<void> {
    try {
      logger.debug('[CursoService] Eliminando curso', { id })
      
      await strapiClient.delete(`/api/cursos/${id}`)
      
      logger.success('[CursoService] Curso eliminado exitosamente', { id })
    } catch (error: any) {
      logger.error('[CursoService] Error al eliminar curso', { id, error })
      throw error
    }
  }

  /**
   * Crea un nuevo curso
   * 
   * @param data - Datos del curso a crear
   * @returns Curso creado
   */
  static async create(data: CreateCursoInput): Promise<CursoData> {
    try {
      logger.debug('[CursoService] Creando curso', { data })
      
      // Preparar datos para Strapi
      // Nota: activo puede ser undefined por el default de Zod, pero siempre lo convertimos a boolean
      const cursoData: { data: Partial<CursoData> & { lista_utiles?: any; materiales?: any[]; colegio?: any } } = {
        data: {
          nombre_curso: data.nombre_curso.trim(),
          nivel: data.nivel,
          grado: data.grado,
          paralelo: data.paralelo || null,
          activo: data.activo ?? true, // Garantizar boolean (por si acaso)
        },
      }

      // Agregar relación con colegio
      const colegioId = typeof data.colegio === 'number' 
        ? data.colegio 
        : parseInt(String(data.colegio))
      if (!isNaN(colegioId)) {
        cursoData.data.colegio = { connect: [colegioId] }
      }

      // Agregar relación lista_utiles usando helper
      const listaUtilesRelation = prepareManyToOneRelation(data.lista_utiles, 'lista_utiles')
      if (listaUtilesRelation) {
        Object.assign(cursoData.data, listaUtilesRelation)
      }

      // Agregar materiales si se proporcionan
      if (data.materiales && Array.isArray(data.materiales) && data.materiales.length > 0) {
        cursoData.data.materiales = data.materiales.map((material) => ({
          material_nombre: material.material_nombre || '',
          tipo: material.tipo || 'util',
          cantidad: material.cantidad ? parseInt(String(material.cantidad)) : 1,
          obligatorio: material.obligatorio !== undefined ? material.obligatorio : true,
          ...(material.descripcion && { descripcion: material.descripcion }),
        }))
      } else if (!data.lista_utiles) {
        // Si no hay lista_utiles ni materiales, enviar array vacío
        cursoData.data.materiales = []
      }
      
      // Limpiar campos undefined o null
      cursoData.data = cleanUndefinedNullFields(cursoData.data) as typeof cursoData.data

      const response = await strapiClient.post<StrapiResponse<StrapiEntity<CursoData>>>(
        '/api/cursos',
        cursoData
      )

      const cursoEntity = Array.isArray(response.data) ? response.data[0] : response.data
      
      // Extraer datos de StrapiEntity (puede venir en attributes o directamente)
      const cursoCreado = cursoEntity?.attributes 
        ? { ...cursoEntity, ...cursoEntity.attributes, id: cursoEntity.id, documentId: cursoEntity.documentId }
        : cursoEntity
      
      logger.success('[CursoService] Curso creado exitosamente', { 
        id: cursoCreado?.id || cursoCreado?.documentId 
      })
      return cursoCreado as CursoData
    } catch (error: any) {
      logger.error('[CursoService] Error al crear curso', { error })
      throw error
    }
  }
}

