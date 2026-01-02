/**
 * Utilidades para cálculos del POS
 */

export interface Discount {
  type: 'percentage' | 'fixed' | 'coupon'
  value: number
  couponCode?: string
}

export interface Tax {
  rate: number
  name: string
}

/**
 * Calcula el descuento aplicado
 */
export function calculateDiscount(subtotal: number, discount: Discount | null): number {
  if (!discount) return 0

  if (discount.type === 'percentage') {
    return (subtotal * discount.value) / 100
  } else if (discount.type === 'fixed') {
    return Math.min(discount.value, subtotal) // No puede ser mayor que el subtotal
  } else if (discount.type === 'coupon') {
    return discount.value
  }

  return 0
}

/**
 * Calcula el total con descuentos e impuestos
 */
export function calculateTotal(
  subtotal: number,
  discount: Discount | null = null,
  tax: Tax | null = null
): {
  subtotal: number
  discount: number
  tax: number
  total: number
} {
  const discountAmount = calculateDiscount(subtotal, discount)
  const afterDiscount = subtotal - discountAmount
  const taxAmount = tax ? (afterDiscount * tax.rate) / 100 : 0
  const total = afterDiscount + taxAmount

  return {
    subtotal,
    discount: discountAmount,
    tax: taxAmount,
    total: Math.max(0, total), // No puede ser negativo
  }
}

/**
 * Calcula el cambio a devolver
 */
export function calculateChange(total: number, paymentAmount: number): number {
  return Math.max(0, paymentAmount - total)
}

/**
 * Formatea un número como moneda chilena
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Formatea un número como moneda sin símbolo
 */
export function formatCurrencyNumber(amount: number): string {
  return amount.toLocaleString('es-CL')
}

