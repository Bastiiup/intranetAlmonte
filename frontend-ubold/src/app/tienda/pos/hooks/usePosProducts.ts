/**
 * Hook para manejar productos del POS
 */

import { useState, useEffect, useCallback } from 'react'
import type { WooCommerceProduct } from '@/lib/woocommerce/types'
import { searchProductByBarcode } from '../utils/barcode'

export function usePosProducts() {
  const [products, setProducts] = useState<WooCommerceProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')

  // Cargar productos con paginación automática para obtener todos
  const loadProducts = useCallback(async (search: string = '', category: string = '') => {
    setLoading(true)
    setError(null)
    
    try {
      let allProducts: WooCommerceProduct[] = []
      let page = 1
      let hasMore = true
      const perPage = 100 // WooCommerce permite hasta 100 por página

      // Si hay búsqueda, solo cargar una página (búsqueda ya filtra)
      if (search) {
        const params = new URLSearchParams({
          per_page: perPage.toString(),
          stock_status: 'instock',
          search: search,
        })

        if (category) {
          params.append('category', category)
        }

        const response = await fetch(`/api/woocommerce/products?${params}`)
        const data = await response.json()

        if (data.success) {
          setProducts(data.data || [])
        } else {
          setError(data.error || 'Error al cargar productos')
          setProducts([])
        }
        setLoading(false)
        return
      }

      // Sin búsqueda: cargar todos los productos con paginación
      while (hasMore) {
        const params = new URLSearchParams({
          per_page: perPage.toString(),
          page: page.toString(),
          stock_status: 'instock',
        })

        if (category) {
          params.append('category', category)
        }

        const response = await fetch(`/api/woocommerce/products?${params}`)
        const data = await response.json()

        if (data.success && data.data) {
          const pageProducts = Array.isArray(data.data) ? data.data : [data.data]
          
          if (pageProducts.length > 0) {
            allProducts = [...allProducts, ...pageProducts]
            // Si recibimos menos productos que per_page, es la última página
            hasMore = pageProducts.length === perPage
            page++
          } else {
            hasMore = false
          }
        } else {
          setError(data.error || 'Error al cargar productos')
          hasMore = false
        }
      }

      setProducts(allProducts)
      console.log(`[POS] Productos cargados: ${allProducts.length} productos`)
    } catch (err: any) {
      setError(err.message || 'Error al conectar con WooCommerce')
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Buscar por código de barras
  const searchByBarcode = useCallback(async (barcode: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const product = await searchProductByBarcode(barcode)
      
      if (product) {
        // Si encontramos el producto, actualizar la lista
        setProducts([product])
        return product
      } else {
        setError('Producto no encontrado')
        return null
      }
    } catch (err: any) {
      setError(err.message || 'Error al buscar producto')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  // Cargar productos cuando cambia el término de búsqueda
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadProducts(searchTerm, selectedCategory)
    }, 300) // Debounce de 300ms

    return () => clearTimeout(timeoutId)
  }, [searchTerm, selectedCategory, loadProducts])

  // Cargar productos iniciales
  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  return {
    products,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    searchByBarcode,
    reloadProducts: () => loadProducts(searchTerm, selectedCategory),
  }
}

