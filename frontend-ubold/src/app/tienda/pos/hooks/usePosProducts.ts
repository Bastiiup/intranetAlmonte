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

  // Cargar productos
  const loadProducts = useCallback(async (search: string = '', category: string = '') => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams({
        per_page: '100',
        stock_status: 'instock',
      })

      if (search) {
        params.append('search', search)
      }

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

