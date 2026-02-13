/**
 * Utilidades para normalización de datos de Strapi v5
 */

/**
 * Normaliza una relación de Strapi (puede venir como data.attributes o data directo)
 */
function normalizarRelacionStrapi(relacion: any): any {
  if (!relacion) return null
  
  // Si viene como data.attributes (Strapi v5 relación completa)
  if (relacion.data?.attributes) {
    return {
      ...relacion.data.attributes,
      id: relacion.data.id,
      documentId: relacion.data.documentId,
    }
  }
  
  // Si viene como data directo (sin attributes)
  if (relacion.data) {
    return {
      ...relacion.data,
      id: relacion.data.id,
      documentId: relacion.data.documentId,
    }
  }
  
  // Si viene como attributes directo
  if (relacion.attributes) {
    return {
      ...relacion.attributes,
      id: relacion.id,
      documentId: relacion.documentId,
    }
  }
  
  // Si ya está normalizado
  return relacion
}

/**
 * Normaliza un curso/entidad de Strapi extrayendo datos de attributes si existe
 */
export function normalizarCursoStrapi<T = any>(curso: any): T | null {
  if (!curso) return null
  
  // Si tiene attributes (Strapi v5), extraer de ahí
  if (curso.attributes) {
    const normalizado: any = {
      ...curso.attributes,
      id: curso.id,
      documentId: curso.documentId,
      updatedAt: curso.updatedAt,
      createdAt: curso.createdAt,
    }
    
    // Normalizar relaciones comunes (colegio, etc.)
    if (curso.attributes.colegio) {
      normalizado.colegio = normalizarRelacionStrapi(curso.attributes.colegio)
    }
    
    return normalizado as T
  }
  
  // Si no tiene attributes pero tiene colegio como relación
  if (curso.colegio && !curso.colegio.nombre) {
    const colegioNormalizado = normalizarRelacionStrapi(curso.colegio)
    if (colegioNormalizado) {
      return {
        ...curso,
        colegio: colegioNormalizado,
      } as T
    }
  }
  
  // Si no tiene attributes, devolver tal cual
  return curso as T
}

/**
 * Normaliza un array de cursos/entidades de Strapi
 */
export function normalizarListaStrapi<T = any>(items: any[]): T[] {
  if (!Array.isArray(items)) return []
  
  return items
    .map(item => normalizarCursoStrapi<T>(item))
    .filter((item): item is T => item !== null)
}

/**
 * Extrae versiones_materiales de un curso normalizado
 */
export function extraerVersionesMateriales(curso: any): any[] {
  if (!curso) return []
  
  // Si está en attributes
  if (curso.versiones_materiales) {
    return Array.isArray(curso.versiones_materiales) 
      ? curso.versiones_materiales 
      : []
  }
  
  return []
}

/**
 * Obtiene la última versión de materiales ordenada por fecha
 */
export function obtenerUltimaVersion(versiones: any[]): any | null {
  if (!versiones || versiones.length === 0) return null
  
  return [...versiones].sort((a: any, b: any) => {
    const fechaA = new Date(a.fecha_actualizacion || a.fecha_subida || 0).getTime()
    const fechaB = new Date(b.fecha_actualizacion || b.fecha_subida || 0).getTime()
    return fechaB - fechaA
  })[0]
}
