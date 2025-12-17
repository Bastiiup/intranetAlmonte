/**
 * Hook para manejar pedidos del POS
 */

import { useState, useCallback } from 'react'
import type { CartItem } from '@/lib/woocommerce/types'

export interface PaymentMethod {
  type: 'cash' | 'card' | 'transfer' | 'mixed'
  amount: number
  reference?: string
}

export interface OrderData {
  line_items: Array<{
    product_id: number
    quantity: number
  }>
  customer_id?: number
  payment_method: string
  payment_method_title: string
  set_paid: boolean
  status: string
  billing?: any
  shipping?: any
  customer_note?: string
}

export function usePosOrders() {
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [orderId, setOrderId] = useState<number | null>(null)

  // Procesar pedido
  const processOrder = useCallback(async (
    cart: CartItem[],
    customerId?: number,
    paymentMethod: PaymentMethod = { type: 'cash', amount: 0 },
    customerNote?: string
  ) => {
    if (cart.length === 0) {
      setError('El carrito está vacío')
      return null
    }

    setProcessing(true)
    setError(null)
    setSuccess(false)
    setOrderId(null)

    try {
      const orderData: OrderData = {
        payment_method: paymentMethod.type,
        payment_method_title: 
          paymentMethod.type === 'cash' ? 'Efectivo' :
          paymentMethod.type === 'card' ? 'Tarjeta' :
          paymentMethod.type === 'transfer' ? 'Transferencia' :
          'Pago Mixto',
        set_paid: true,
        status: 'completed',
        customer_id: customerId || 0,
        line_items: cart.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
        })),
        ...(customerNote && { customer_note: customerNote }),
      }

      const response = await fetch('/api/woocommerce/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
        setOrderId(data.data?.id || null)
        
        // Limpiar mensaje de éxito después de 5 segundos
        setTimeout(() => {
          setSuccess(false)
          setOrderId(null)
        }, 5000)

        return data.data
      } else {
        setError(data.error || 'Error al procesar el pedido')
        return null
      }
    } catch (err: any) {
      setError(err.message || 'Error al conectar con WooCommerce')
      return null
    } finally {
      setProcessing(false)
    }
  }, [])

  return {
    processing,
    error,
    success,
    orderId,
    processOrder,
    clearError: () => setError(null),
    clearSuccess: () => {
      setSuccess(false)
      setOrderId(null)
    },
  }
}

