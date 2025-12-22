/**
 * Hook para manejar el carrito del POS
 */

import { useState, useCallback, useMemo } from 'react'
import type { WooCommerceProduct, CartItem } from '@/lib/woocommerce/types'
import { calculateTotal, type Discount, type Tax } from '../utils/calculations'

export function usePosCart(
  discount: Discount | null = null,
  tax: Tax | null = null
) {
  const [cart, setCart] = useState<CartItem[]>([])

  // Agregar producto al carrito
  const addToCart = useCallback((product: WooCommerceProduct) => {
    if (product.stock_status !== 'instock') return

    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.product.id === product.id)

      if (existingItem) {
        // Verificar stock disponible
        const newQuantity = existingItem.quantity + 1
        if (product.stock_quantity !== null && newQuantity > product.stock_quantity) {
          return prevCart // No agregar si excede stock
        }

        return prevCart.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: newQuantity,
                subtotal: parseFloat(product.price) * newQuantity,
                total: parseFloat(product.price) * newQuantity,
              }
            : item
        )
      } else {
        const price = parseFloat(product.price) || 0
        return [
          ...prevCart,
          {
            product,
            quantity: 1,
            subtotal: price,
            total: price,
          },
        ]
      }
    })
  }, [])

  // Actualizar cantidad
  const updateQuantity = useCallback((productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }

    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.product.id === productId) {
          // Verificar stock disponible
          if (item.product.stock_quantity !== null && quantity > item.product.stock_quantity) {
            return item // No actualizar si excede stock
          }

          const price = parseFloat(item.product.price) || 0
          return {
            ...item,
            quantity,
            subtotal: price * quantity,
            total: price * quantity,
          }
        }
        return item
      })
    )
  }, [])

  // Remover producto
  const removeFromCart = useCallback((productId: number) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId))
  }, [])

  // Limpiar carrito
  const clearCart = useCallback(() => {
    setCart([])
  }, [])

  // Calcular totales
  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.total, 0)
    const calculated = calculateTotal(subtotal, discount, tax)
    
    return {
      ...calculated,
      itemCount: cart.reduce((sum, item) => sum + item.quantity, 0),
    }
  }, [cart, discount, tax])

  return {
    cart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    totals,
  }
}

