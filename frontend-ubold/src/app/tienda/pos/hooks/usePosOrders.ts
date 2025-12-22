/**
 * Hook para manejar pedidos del POS
 */

import { useState, useCallback } from 'react'
import type { CartItem } from '@/lib/woocommerce/types'
import { buildWooCommerceAddress, createAddressMetaData, type DetailedAddress } from '@/lib/woocommerce/address-utils'

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
    customerNote?: string,
    deliveryType: 'shipping' | 'pickup' = 'pickup'
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
      // Obtener datos del cliente si existe (se pasará desde el componente)
      const customerData = (paymentMethod as any).customerData

      // Obtener dirección detallada del cliente (puede venir en billing o en meta_data)
      const billingDetailed: DetailedAddress = customerData?.billing ? {
        calle: customerData.billing.calle || customerData.meta_data?.find((m: any) => m.key === '_billing_calle')?.value,
        numero: customerData.billing.numero || customerData.meta_data?.find((m: any) => m.key === '_billing_numero')?.value,
        dpto: customerData.billing.dpto || customerData.meta_data?.find((m: any) => m.key === '_billing_dpto')?.value,
        block: customerData.billing.block || customerData.meta_data?.find((m: any) => m.key === '_billing_block')?.value,
        condominio: customerData.billing.condominio || customerData.meta_data?.find((m: any) => m.key === '_billing_condominio')?.value,
        address_1: customerData.billing.address_1 || '',
        address_2: customerData.billing.address_2 || '',
        city: customerData.billing.city || '',
        state: customerData.billing.state || '',
        postcode: customerData.billing.postcode || '',
        country: customerData.billing.country || 'CL',
      } : {}

      const shippingDetailed: DetailedAddress = customerData?.shipping ? {
        calle: customerData.shipping.calle || customerData.meta_data?.find((m: any) => m.key === '_shipping_calle')?.value,
        numero: customerData.shipping.numero || customerData.meta_data?.find((m: any) => m.key === '_shipping_numero')?.value,
        dpto: customerData.shipping.dpto || customerData.meta_data?.find((m: any) => m.key === '_shipping_dpto')?.value,
        block: customerData.shipping.block || customerData.meta_data?.find((m: any) => m.key === '_shipping_block')?.value,
        condominio: customerData.shipping.condominio || customerData.meta_data?.find((m: any) => m.key === '_shipping_condominio')?.value,
        address_1: customerData.shipping.address_1 || '',
        address_2: customerData.shipping.address_2 || '',
        city: customerData.shipping.city || '',
        state: customerData.shipping.state || '',
        postcode: customerData.shipping.postcode || '',
        country: customerData.shipping.country || 'CL',
      } : billingDetailed

      // Construir address_1 y address_2 desde campos detallados
      const billingAddress = buildWooCommerceAddress(billingDetailed)
      const shippingAddress = buildWooCommerceAddress(shippingDetailed)

      // Preparar datos de billing completos
      const billingData = {
        first_name: customerData?.first_name || 'Cliente',
        last_name: customerData?.last_name || 'POS',
        company: customerData?.billing?.company || '',
        address_1: billingAddress.address_1,
        address_2: billingAddress.address_2,
        city: billingDetailed.city || '',
        state: billingDetailed.state || '',
        postcode: billingDetailed.postcode || '',
        country: billingDetailed.country || 'CL',
        email: customerData?.email || 'pos@escolar.cl',
        phone: customerData?.billing?.phone || '',
      }

      // Preparar datos de shipping completos
      const shippingData = {
        first_name: customerData?.shipping?.first_name || customerData?.first_name || 'Cliente',
        last_name: customerData?.shipping?.last_name || customerData?.last_name || 'POS',
        company: customerData?.shipping?.company || '',
        address_1: shippingAddress.address_1,
        address_2: shippingAddress.address_2,
        city: shippingDetailed.city || billingDetailed.city || '',
        state: shippingDetailed.state || billingDetailed.state || '',
        postcode: shippingDetailed.postcode || billingDetailed.postcode || '',
        country: shippingDetailed.country || billingDetailed.country || 'CL',
      }

      // Crear meta_data para direcciones detalladas
      const addressMetaData = [
        ...createAddressMetaData('billing', billingDetailed),
        ...createAddressMetaData('shipping', shippingDetailed),
      ]

      // Si es retiro en tienda, limpiar dirección de envío
      const finalShippingData = deliveryType === 'pickup' 
        ? {
            first_name: '',
            last_name: '',
            company: '',
            address_1: '',
            address_2: '',
            city: '',
            state: '',
            postcode: '',
            country: 'CL',
          }
        : shippingData

      const orderData: any = {
        payment_method: paymentMethod.type,
        payment_method_title: 
          paymentMethod.type === 'cash' ? 'Efectivo' :
          paymentMethod.type === 'card' ? 'Tarjeta' :
          paymentMethod.type === 'transfer' ? 'Transferencia' :
          'Pago Mixto',
        set_paid: true,
        status: 'completed',
        customer_id: customerId || 0,
        billing: billingData,
        shipping: finalShippingData,
        line_items: cart.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
        })),
        ...(customerNote && { customer_note: customerNote }),
        // Agregar meta_data con direcciones detalladas y tipo de entrega
        meta_data: [
          ...(addressMetaData.length > 0 ? addressMetaData : []),
          {
            key: '_delivery_type',
            value: deliveryType,
          },
        ],
      }

      // Usar el endpoint de tienda/pedidos que sincroniza con WooCommerce y Strapi
      const response = await fetch('/api/tienda/pedidos', {
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

