/**
 * API Route para comparar productos reconocidos por Claude vs productos actuales
 * GET /api/crm/listas/[id]/comparacion
 * 
 * Compara los productos extraídos por Claude (última versión procesada)
 * con los productos actualmente guardados en la lista
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// ============================================
// INTERFACES
// ============================================

interface ProductoBase {
  id?: string | number
  nombre: string
  marca?: string | null
  cantidad?: number
  isbn?: string | null
  asignatura?: string | null
  precio?: number
  woocommerce_id?: number
  woocommerce_sku?: string
}

interface ProductoComparado {
  id: string | number
  nombre: string
  marca?: string | null
  cantidad: number
  isbn?: string | null
  asignatura?: string | null
  precio: number
  origen: 'claude' | 'actual'
  coincide?: boolean
}

interface Coincidencia {
  claude: ProductoBase
  actual: ProductoBase
  estado: 'coincide' | 'diferente_cantidad' | 'diferente_precio' | 'diferente_marca'
  diferencias?: string[]
}

interface ProductoNuevo extends ProductoBase {
  estado: 'nuevo'
  sugerencia: string
}

interface ProductoFaltante extends ProductoBase {
  estado: 'faltante'
  alerta: string
}

interface Estadisticas {
  totalClaude: number
  totalActual: number
  coincidencias: number
  coincidenciasExactas: number
  coincidenciasConDiferencias: number
  nuevos: number
  faltantes: number
  porcentajeCoincidencia: number
}

interface ResultadoComparacion {
  productosClaude: ProductoBase[]
  productosActuales: ProductoBase[]
  coincidencias: Coincidencia[]
  nuevos: ProductoNuevo[]
  faltantes: ProductoFaltante[]
  estadisticas: Estadisticas
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

/**
 * Normaliza un nombre de producto para comparación
 */
function normalizarNombre(nombre: string): string {
  return nombre
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/[^\w\s]/g, '') // Remover puntuación
    .replace(/\s+/g, ' ') // Normalizar espacios
}

/**
 * Calcula la similitud entre dos strings (Levenshtein simplificado)
 */
function calcularSimilitud(str1: string, str2: string): number {
  const s1 = normalizarNombre(str1)
  const s2 = normalizarNombre(str2)
  
  if (s1 === s2) return 1.0
  
  const maxLength = Math.max(s1.length, s2.length)
  if (maxLength === 0) return 0.0
  
  let matches = 0
  const minLength = Math.min(s1.length, s2.length)
  
  for (let i = 0; i < minLength; i++) {
    if (s1[i] === s2[i]) {
      matches++
    }
  }
  
  return matches / maxLength
}

/**
 * Busca un producto en un array por nombre similar
 */
function buscarProductoSimilar(
  producto: ProductoBase,
  lista: ProductoBase[],
  umbralSimilitud: number = 0.8
): ProductoBase | null {
  let mejorCoincidencia: ProductoBase | null = null
  let mejorSimilitud = 0
  
  for (const item of lista) {
    const similitud = calcularSimilitud(producto.nombre, item.nombre)
    
    if (similitud > mejorSimilitud && similitud >= umbralSimilitud) {
      mejorSimilitud = similitud
      mejorCoincidencia = item
    }
  }
  
  return mejorCoincidencia
}

/**
 * Compara dos productos y detecta diferencias
 */
function compararProductos(claude: ProductoBase, actual: ProductoBase): {
  estado: 'coincide' | 'diferente_cantidad' | 'diferente_precio' | 'diferente_marca'
  diferencias: string[]
} {
  const diferencias: string[] = []
  
  // Comparar cantidad
  if (claude.cantidad && actual.cantidad && claude.cantidad !== actual.cantidad) {
    diferencias.push(`Cantidad: Claude=${claude.cantidad}, Actual=${actual.cantidad}`)
  }
  
  // Comparar precio
  if (claude.precio && actual.precio && Math.abs(claude.precio - actual.precio) > 0.01) {
    diferencias.push(`Precio: Claude=$${claude.precio}, Actual=$${actual.precio}`)
  }
  
  // Comparar marca
  const marcaClaude = normalizarNombre(claude.marca || '')
  const marcaActual = normalizarNombre(actual.marca || '')
  if (marcaClaude && marcaActual && marcaClaude !== marcaActual) {
    diferencias.push(`Marca: Claude="${claude.marca}", Actual="${actual.marca}"`)
  }
  
  // Comparar ISBN
  if (claude.isbn && actual.isbn && claude.isbn !== actual.isbn) {
    diferencias.push(`ISBN: Claude="${claude.isbn}", Actual="${actual.isbn}"`)
  }
  
  // Determinar estado
  if (diferencias.length === 0) {
    return { estado: 'coincide', diferencias: [] }
  }
  
  // Priorizar tipo de diferencia
  if (diferencias.some(d => d.startsWith('Cantidad'))) {
    return { estado: 'diferente_cantidad', diferencias }
  }
  if (diferencias.some(d => d.startsWith('Precio'))) {
    return { estado: 'diferente_precio', diferencias }
  }
  if (diferencias.some(d => d.startsWith('Marca'))) {
    return { estado: 'diferente_marca', diferencias }
  }
  
  return { estado: 'coincide', diferencias }
}

/**
 * Realiza la comparación completa entre productos de Claude y actuales
 */
function compararListas(
  productosClaude: ProductoBase[],
  productosActuales: ProductoBase[]
): ResultadoComparacion {
  const coincidencias: Coincidencia[] = []
  const nuevos: ProductoNuevo[] = []
  const faltantes: ProductoFaltante[] = []
  const productosActualesCopia = [...productosActuales]
  
  // Iterar sobre productos de Claude
  for (const prodClaude of productosClaude) {
    const encontrado = buscarProductoSimilar(prodClaude, productosActualesCopia, 0.8)
    
    if (encontrado) {
      // Producto encontrado - comparar detalles
      const comparacion = compararProductos(prodClaude, encontrado)
      
      coincidencias.push({
        claude: prodClaude,
        actual: encontrado,
        estado: comparacion.estado,
        diferencias: comparacion.diferencias.length > 0 ? comparacion.diferencias : undefined
      })
      
      // Remover de la lista de actuales
      const index = productosActualesCopia.findIndex(p => p === encontrado)
      if (index !== -1) {
        productosActualesCopia.splice(index, 1)
      }
    } else {
      // Producto nuevo (Claude lo detectó pero no está en la lista actual)
      nuevos.push({
        ...prodClaude,
        estado: 'nuevo',
        sugerencia: 'Claude detectó este producto en el PDF, considere agregarlo a la lista'
      })
    }
  }
  
  // Productos que están en la lista actual pero Claude no los detectó
  for (const prodActual of productosActualesCopia) {
    faltantes.push({
      ...prodActual,
      estado: 'faltante',
      alerta: 'Este producto está en la lista actual pero Claude no lo detectó en el PDF'
    })
  }
  
  // Calcular estadísticas
  const coincidenciasExactas = coincidencias.filter(c => c.estado === 'coincide').length
  const coincidenciasConDiferencias = coincidencias.length - coincidenciasExactas
  const porcentajeCoincidencia = productosClaude.length > 0
    ? Math.round((coincidencias.length / productosClaude.length) * 100)
    : 0
  
  return {
    productosClaude,
    productosActuales,
    coincidencias,
    nuevos,
    faltantes,
    estadisticas: {
      totalClaude: productosClaude.length,
      totalActual: productosActuales.length,
      coincidencias: coincidencias.length,
      coincidenciasExactas,
      coincidenciasConDiferencias,
      nuevos: nuevos.length,
      faltantes: faltantes.length,
      porcentajeCoincidencia
    }
  }
}

/**
 * Obtiene productos reconocidos por Claude (última versión procesada)
 */
async function obtenerProductosClaude(cursoId: string): Promise<ProductoBase[]> {
  console.log('[Comparacion] Obteniendo productos de Claude...')
  
  let curso: any = null
  
  // Intentar obtener por documentId
  try {
    const paramsDocId = new URLSearchParams({
      'filters[documentId][$eq]': String(cursoId),
      'publicationState': 'preview',
    })
    const cursoResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>[]>>(
      `/api/cursos?${paramsDocId.toString()}`
    )
    
    if (cursoResponse.data && Array.isArray(cursoResponse.data) && cursoResponse.data.length > 0) {
      curso = cursoResponse.data[0]
    }
  } catch (error: any) {
    console.warn('[Comparacion] Error buscando por documentId:', error.message)
  }
  
  // Intentar por ID numérico
  if (!curso && /^\d+$/.test(String(cursoId))) {
    try {
      const cursoResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
        `/api/cursos/${cursoId}?publicationState=preview`
      )
      
      if (cursoResponse.data) {
        curso = Array.isArray(cursoResponse.data) ? cursoResponse.data[0] : cursoResponse.data
      }
    } catch (error: any) {
      console.warn('[Comparacion] Error buscando por ID:', error.message)
    }
  }
  
  if (!curso) {
    throw new Error('Curso no encontrado')
  }
  
  const attrs = curso.attributes || curso
  const versiones = attrs.versiones_materiales || []
  
  if (versiones.length === 0) {
    console.log('[Comparacion] No hay versiones de materiales')
    return []
  }
  
  // Obtener última versión procesada con IA
  const versionesConIA = versiones.filter((v: any) => v.procesado_con_ia === true)
  
  if (versionesConIA.length === 0) {
    console.log('[Comparacion] No hay versiones procesadas con IA')
    return []
  }
  
  const ultimaVersion = versionesConIA.sort((a: any, b: any) => {
    const fechaA = new Date(a.fecha_actualizacion || a.fecha_subida || 0).getTime()
    const fechaB = new Date(b.fecha_actualizacion || b.fecha_subida || 0).getTime()
    return fechaB - fechaA
  })[0]
  
  const productos = ultimaVersion.productos || ultimaVersion.materiales || []
  
  console.log('[Comparacion] Productos Claude encontrados:', productos.length)
  
  return productos.map((p: any) => ({
    id: p.id,
    nombre: p.nombre,
    marca: p.marca || null,
    cantidad: p.cantidad || 1,
    isbn: p.isbn || null,
    asignatura: p.asignatura || null,
    precio: p.precio || 0,
    woocommerce_id: p.woocommerce_id,
    woocommerce_sku: p.woocommerce_sku
  }))
}

/**
 * Obtiene productos actuales de la lista
 */
async function obtenerProductosActuales(cursoId: string): Promise<ProductoBase[]> {
  console.log('[Comparacion] Obteniendo productos actuales...')
  
  let curso: any = null
  
  // Intentar obtener por documentId
  try {
    const paramsDocId = new URLSearchParams({
      'filters[documentId][$eq]': String(cursoId),
      'publicationState': 'preview',
    })
    const cursoResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>[]>>(
      `/api/cursos?${paramsDocId.toString()}`
    )
    
    if (cursoResponse.data && Array.isArray(cursoResponse.data) && cursoResponse.data.length > 0) {
      curso = cursoResponse.data[0]
    }
  } catch (error: any) {
    console.warn('[Comparacion] Error buscando por documentId:', error.message)
  }
  
  // Intentar por ID numérico
  if (!curso && /^\d+$/.test(String(cursoId))) {
    try {
      const cursoResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
        `/api/cursos/${cursoId}?publicationState=preview`
      )
      
      if (cursoResponse.data) {
        curso = Array.isArray(cursoResponse.data) ? cursoResponse.data[0] : cursoResponse.data
      }
    } catch (error: any) {
      console.warn('[Comparacion] Error buscando por ID:', error.message)
    }
  }
  
  if (!curso) {
    throw new Error('Curso no encontrado')
  }
  
  const attrs = curso.attributes || curso
  const versiones = attrs.versiones_materiales || []
  
  if (versiones.length === 0) {
    console.log('[Comparacion] No hay versiones de materiales')
    return []
  }
  
  // Obtener versión actual (más reciente)
  const versionActual = versiones.sort((a: any, b: any) => {
    const fechaA = new Date(a.fecha_actualizacion || a.fecha_subida || 0).getTime()
    const fechaB = new Date(b.fecha_actualizacion || b.fecha_subida || 0).getTime()
    return fechaB - fechaA
  })[0]
  
  const productos = versionActual.productos || versionActual.materiales || []
  
  console.log('[Comparacion] Productos actuales encontrados:', productos.length)
  
  return productos
    .filter((p: any) => p.validado !== false) // Filtrar productos no validados si existe ese campo
    .map((p: any) => ({
      id: p.id,
      nombre: p.nombre,
      marca: p.marca || null,
      cantidad: p.cantidad || 1,
      isbn: p.isbn || null,
      asignatura: p.asignatura || null,
      precio: p.precio || 0,
      woocommerce_id: p.woocommerce_id,
      woocommerce_sku: p.woocommerce_sku
    }))
}

// ============================================
// GET HANDLER
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('[Comparacion] 🔍 Iniciando comparación de productos...')
    
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID de lista es requerido' },
        { status: 400 }
      )
    }
    
    console.log('[Comparacion] ID recibido:', id)
    
    // Obtener productos de Claude
    const productosClaude = await obtenerProductosClaude(id)
    
    // Obtener productos actuales
    const productosActuales = await obtenerProductosActuales(id)
    
    console.log('[Comparacion] Productos obtenidos:', {
      claude: productosClaude.length,
      actuales: productosActuales.length
    })
    
    // Realizar comparación
    const comparacion = compararListas(productosClaude, productosActuales)
    
    console.log('[Comparacion] ✅ Comparación completada:', comparacion.estadisticas)
    
    return NextResponse.json({
      success: true,
      data: comparacion,
      mensaje: `Comparación completada: ${comparacion.estadisticas.coincidencias} coincidencias, ${comparacion.estadisticas.nuevos} nuevos, ${comparacion.estadisticas.faltantes} faltantes`
    })
    
  } catch (error: any) {
    console.error('[Comparacion] ❌ Error al comparar productos:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Error al comparar productos',
      detalles: error.message || 'Error desconocido',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}
