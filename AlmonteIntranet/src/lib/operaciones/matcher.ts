/**
 * Lógica de matching entre pedidos de WeareCloud y JumpSeller
 * 
 * Determina si dos pedidos corresponden al mismo pedido real
 */

import type { WeareCloudOrder, JumpSellerOrder, SincronizedOrder } from './types'

/**
 * Calcula la confianza del match entre un pedido de WeareCloud y uno de JumpSeller
 */
export function matchOrders(
  wearecloudOrder: WeareCloudOrder,
  jumpsellerOrder: JumpSellerOrder
): { confidence: 'high' | 'medium' | 'low'; reason: string } {
  let score = 0
  const reasons: string[] = []

  // Match por número de pedido (máxima confianza)
  // Comparar order_number o pedido_ecommerce con order_number de JumpSeller
  const wcOrderNum = wearecloudOrder.order_number || wearecloudOrder.pedido_ecommerce || ''
  const jsOrderNum = jumpsellerOrder.order_number || String(jumpsellerOrder.id || '')
  
  if (wcOrderNum && jsOrderNum && wcOrderNum === jsOrderNum) {
    score += 50
    reasons.push('Número de pedido coincide')
  } else if (wcOrderNum && jsOrderNum && wcOrderNum.includes(jsOrderNum) || jsOrderNum.includes(wcOrderNum)) {
    score += 30
    reasons.push('Número de pedido similar')
  }

  // Match por email del cliente
  const wcEmail = wearecloudOrder.customer?.email?.toLowerCase() || ''
  const jsEmail = jumpsellerOrder.customer?.email?.toLowerCase() || ''
  if (wcEmail && jsEmail && wcEmail === jsEmail) {
    score += 30
    reasons.push('Email del cliente coincide')
  }

  // Match por fecha (dentro de un rango de tiempo razonable)
  if (wearecloudOrder.created_at && jumpsellerOrder.created_at) {
    try {
      const wcDate = new Date(wearecloudOrder.created_at)
      const jsDate = new Date(jumpsellerOrder.created_at)
      const timeDiff = Math.abs(wcDate.getTime() - jsDate.getTime())
      const daysDiff = timeDiff / (1000 * 60 * 60 * 24)
      
      if (daysDiff <= 1) {
        score += 10
        reasons.push('Fechas cercanas (dentro de 1 día)')
      } else if (daysDiff <= 7) {
        score += 5
        reasons.push('Fechas cercanas (dentro de 7 días)')
      }
    } catch (e) {
      // Ignorar errores de fecha
    }
  }

  // Match por total (con tolerancia)
  if (wearecloudOrder.total && jumpsellerOrder.total) {
    try {
      const wcTotal = parseFloat(String(wearecloudOrder.total).replace(/[^0-9.-]/g, ''))
      const jsTotal = parseFloat(String(jumpsellerOrder.total).replace(/[^0-9.-]/g, ''))
      if (!isNaN(wcTotal) && !isNaN(jsTotal)) {
        const totalDiff = Math.abs(wcTotal - jsTotal)
        const totalTolerance = wcTotal * 0.05 // 5% de tolerancia
        
        if (totalDiff <= totalTolerance) {
          score += 10
          reasons.push('Total coincide (dentro de tolerancia)')
        }
      }
    } catch (e) {
      // Ignorar errores de total
    }
  }

  // Determinar confianza
  let confidence: 'high' | 'medium' | 'low'
  if (score >= 50) {
    confidence = 'high'
  } else if (score >= 30) {
    confidence = 'medium'
  } else {
    confidence = 'low'
  }

  return {
    confidence,
    reason: reasons.join(', ') || 'Sin coincidencias significativas'
  }
}

/**
 * Busca el mejor match para un pedido de WeareCloud en una lista de pedidos de JumpSeller
 */
export function findBestMatch(
  wearecloudOrder: WeareCloudOrder,
  jumpsellerOrders: JumpSellerOrder[]
): { order: JumpSellerOrder; confidence: 'high' | 'medium' | 'low'; reason: string } | null {
  let bestMatch: { order: JumpSellerOrder; confidence: 'high' | 'medium' | 'low'; reason: string } | null = null
  let bestScore = 0

  for (const jsOrder of jumpsellerOrders) {
    const match = matchOrders(wearecloudOrder, jsOrder)
    const score = match.confidence === 'high' ? 3 : match.confidence === 'medium' ? 2 : 1

    if (score > bestScore) {
      bestScore = score
      bestMatch = {
        order: jsOrder,
        confidence: match.confidence,
        reason: match.reason
      }
    }
  }

  return bestMatch
}

/**
 * Crea un objeto de pedido sincronizado
 */
export function createSincronizedOrder(
  wearecloudOrder?: WeareCloudOrder,
  jumpsellerOrder?: JumpSellerOrder,
  matchInfo?: { confidence: 'high' | 'medium' | 'low'; reason: string }
): SincronizedOrder {
  const id = jumpsellerOrder?.id?.toString() || wearecloudOrder?.id || `temp-${Date.now()}`
  
  return {
    id,
    wearecloud_order: wearecloudOrder,
    jumpseller_order: jumpsellerOrder,
    match_confidence: matchInfo?.confidence || 'low',
    match_reason: matchInfo?.reason,
    last_synced_at: new Date().toISOString(),
    sync_status: wearecloudOrder && jumpsellerOrder ? 'synced' : 'pending',
    sync_errors: []
  }
}

