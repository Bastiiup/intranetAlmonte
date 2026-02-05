/**
 * Hook para manejar la carga y gestión de productos
 * Extrae la lógica de carga de productos del componente principal
 */

import { useState, useEffect, useCallback } from 'react'
import type { ProductoIdentificado, ListaData, CoordenadasProducto } from '../types'

interface UseProductosParams {
  lista: ListaData | null
  listaIdFromUrl: string
  versionSeleccionada: number | null
  mostrarTodosLosProductos: boolean
}

export function useProductos({ 
  lista, 
  listaIdFromUrl, 
  versionSeleccionada,
  mostrarTodosLosProductos 
}: UseProductosParams) {
  const [productos, setProductos] = useState<ProductoIdentificado[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cargarProductos = useCallback(async (forzarRecarga: boolean = false) => {
    if (!lista) {
      console.log('[useProductos] No hay lista disponible')
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log('[useProductos] Cargando productos...', {
        listaId: lista.id,
        forzarRecarga,
        versionSeleccionada,
        mostrarTodosLosProductos
      })

      // Si forzarRecarga, obtener datos frescos desde la API
      let listaActual = lista
      if (forzarRecarga) {
        console.log('[useProductos] Recargando datos desde la API...')
        try {
          const response = await fetch(`/api/crm/listas/${listaIdFromUrl}`, { 
            cache: 'no-store' 
          })
          const data = await response.json()
          
          if (response.ok && data.success && data.data) {
            // Normalizar datos de Strapi
            if (data.data.attributes) {
              listaActual = {
                ...data.data.attributes,
                id: data.data.id,
                documentId: data.data.documentId,
              } as ListaData
            } else {
              listaActual = data.data as ListaData
            }
            console.log('[useProductos] Datos recargados, versiones:', listaActual.versiones_materiales?.length || 0)
          }
        } catch (apiError) {
          console.error('[useProductos] Error al recargar desde API:', apiError)
          // Continuar con lista actual si falla
        }
      }

      // Determinar qué versión usar
      let versionActual: any = null
      
      // Extraer array de materiales de una versión (Strapi/IA puede usar "materiales" o "productos")
      const getMaterialesDeVersion = (version: any): any[] => {
        if (!version) return []
        const arr = version.materiales ?? version.productos
        return Array.isArray(arr) ? arr : []
      }

      if (mostrarTodosLosProductos && listaActual.versiones_materiales) {
        // Combinar todos los productos de todas las versiones
        const todosLosProductos: any[] = []
        listaActual.versiones_materiales.forEach((version: any) => {
          todosLosProductos.push(...getMaterialesDeVersion(version))
        })
        versionActual = { materiales: todosLosProductos }
      } else if (versionSeleccionada !== null && listaActual.versiones_materiales) {
        versionActual = listaActual.versiones_materiales[versionSeleccionada]
      } else if (listaActual.versiones_materiales && listaActual.versiones_materiales.length > 0) {
        // Usar la última versión (más reciente)
        const versionesOrdenadas = [...listaActual.versiones_materiales].sort((a: any, b: any) => {
          const fechaA = new Date(a.fecha_actualizacion || a.fecha_subida || 0).getTime()
          const fechaB = new Date(b.fecha_actualizacion || b.fecha_subida || 0).getTime()
          return fechaB - fechaA
        })
        versionActual = versionesOrdenadas[0]
      }

      const materiales = versionActual ? getMaterialesDeVersion(versionActual) : []
      if (materiales.length === 0) {
        console.log('[useProductos] No hay materiales en la versión seleccionada', {
          versionActual: !!versionActual,
          keys: versionActual ? Object.keys(versionActual) : []
        })
        setProductos([])
        setLoading(false)
        return
      }

      // Normalizar para que el resto del código use siempre .materiales
      const versionConMateriales = { ...versionActual, materiales }

      console.log('[useProductos] Materiales encontrados:', {
        cantidad: materiales.length,
        version: versionSeleccionada,
        mostrarTodos: mostrarTodosLosProductos
      })

      // Transformar materiales a ProductoIdentificado
      const productosTransformados: ProductoIdentificado[] = versionConMateriales.materiales.map((material: any, index: number) => {
        const nombreProducto = 
          material.nombre || 
          material.nombre_producto || 
          material.descripcion || 
          `Producto ${index + 1}`

        // Normalizar coordenadas si existen
        let coordenadas: CoordenadasProducto | undefined = undefined
        if (material.coordenadas) {
          coordenadas = {
            pagina: parseInt(String(material.coordenadas.pagina)) || 1,
            posicion_x: material.coordenadas.posicion_x !== undefined 
              ? parseFloat(String(material.coordenadas.posicion_x)) 
              : undefined,
            posicion_y: material.coordenadas.posicion_y !== undefined 
              ? parseFloat(String(material.coordenadas.posicion_y)) 
              : undefined,
            region: material.coordenadas.region || undefined,
            ancho: material.coordenadas.ancho !== undefined 
              ? parseFloat(String(material.coordenadas.ancho)) 
              : undefined,
            alto: material.coordenadas.alto !== undefined 
              ? parseFloat(String(material.coordenadas.alto)) 
              : undefined,
          }
        } else if (material.pagina !== undefined) {
          coordenadas = {
            pagina: parseInt(String(material.pagina)) || 1,
          }
        }

        return {
          id: material.id || `producto-${index + 1}`,
          validado: material.aprobado !== undefined ? material.aprobado : (material.validado || false),
          orden: material.orden !== undefined ? Number(material.orden) : index + 1,
          categoria: material.categoria || material.tipo || undefined,
          imagen: material.imagen || material.imagen_url || material.image || material.image_url || undefined,
          isbn: material.isbn || material.sku || material.woocommerce_sku || undefined,
          nombre: nombreProducto,
          marca: material.marca || material.editorial || undefined,
          cantidad: material.cantidad || 1,
          comprar: material.comprar !== false,
          disponibilidad: material.disponibilidad === 'no_disponible' ? 'no_disponible' : 
                         material.disponibilidad === 'no_encontrado' ? 'no_encontrado' : 'disponible',
          precio: parseFloat(material.precio || 0),
          precio_woocommerce: material.precio_woocommerce ? parseFloat(material.precio_woocommerce) : undefined,
          asignatura: material.asignatura || material.materia || undefined,
          woocommerce_id: material.woocommerce_id || undefined,
          woocommerce_sku: material.woocommerce_sku || undefined,
          stock_quantity: material.stock_quantity || undefined,
          encontrado_en_woocommerce: material.encontrado_en_woocommerce !== undefined ? material.encontrado_en_woocommerce : undefined,
          coordenadas: coordenadas,
        }
      })

      // Log detallado de productos con coordenadas
      const productosConCoordenadas = productosTransformados.filter(p => p.coordenadas)
      console.log('[useProductos] 📊 RESUMEN DE COORDENADAS:', {
        totalProductos: productosTransformados.length,
        productosConCoordenadas: productosConCoordenadas.length,
        productosSinCoordenadas: productosTransformados.length - productosConCoordenadas.length,
        productosConCoordenadasDetalle: productosConCoordenadas.slice(0, 5).map(p => ({
          nombre: p.nombre,
          coordenadas: p.coordenadas,
          tienePosicionX: p.coordenadas?.posicion_x !== undefined,
          tienePosicionY: p.coordenadas?.posicion_y !== undefined,
        }))
      })

      setProductos(productosTransformados)
    } catch (err: any) {
      console.error('[useProductos] Error al cargar productos:', err)
      setError(err.message || 'Error al cargar productos')
    } finally {
      setLoading(false)
    }
  }, [lista, listaIdFromUrl, versionSeleccionada, mostrarTodosLosProductos])

  // Cargar productos cuando cambia la lista o las versiones
  useEffect(() => {
    if (lista) {
      cargarProductos(false)
    }
  }, [lista?.id, lista?.versiones_materiales?.length, versionSeleccionada, mostrarTodosLosProductos, cargarProductos])

  return {
    productos,
    setProductos,
    loading,
    error,
    cargarProductos
  }
}
