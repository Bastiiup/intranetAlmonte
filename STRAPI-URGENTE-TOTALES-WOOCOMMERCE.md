# 🚨 URGENTE: Totales no aparecen en WooCommerce

## ❌ PROBLEMA ACTUAL

Los pedidos creados desde la Intranet:
- ✅ Tienen items correctos
- ✅ Tienen precios correctos en los items
- ❌ **NO muestran el total en WooCommerce ($0)**

## 🔍 CAUSA RAÍZ

El lifecycle hook `afterCreate` de Strapi **NO está usando `rawWooData`** o no está enviando los totales correctamente a WooCommerce.

## ✅ SOLUCIÓN: USAR `rawWooData` DIRECTAMENTE

La Intranet envía `rawWooData` con **TODOS los datos en formato WooCommerce puro**. El lifecycle hook debe usar esto directamente.

### Estructura de `rawWooData` que envía la Intranet:

```json
{
  "rawWooData": {
    "payment_method": "bacs",
    "payment_method_title": "Transferencia bancaria directa",
    "set_paid": true,
    "status": "completed",
    "customer_id": 0,
    "billing": { ... },
    "shipping": { ... },
    "line_items": [
      {
        "product_id": 9091,
        "quantity": 1,
        "price": "989.56",
        "subtotal": "989.56"
      }
    ],
    "total": "2799.01",        // ⚠️ CRÍTICO
    "subtotal": "2690.01",     // ⚠️ CRÍTICO
    "shipping_total": "100.00", // ⚠️ CRÍTICO
    "total_tax": "19.00",      // ⚠️ CRÍTICO
    "discount_total": "10.00"  // ⚠️ CRÍTICO
  }
}
```

## 🎯 CÓDIGO PARA EL LIFECYCLE HOOK `afterCreate`

```javascript
async function afterCreate(event) {
  const { result } = event
  const pedido = result
  
  // Solo sincronizar si originPlatform es válido
  if (!pedido.originPlatform || 
      (pedido.originPlatform !== 'woo_moraleja' && pedido.originPlatform !== 'woo_escolar')) {
    console.log('[pedido] ⏭️ Saltando sincronización - originPlatform:', pedido.originPlatform)
    return
  }
  
  console.log('[pedido] 🔍 afterCreate ejecutado para pedido:', pedido.numero_pedido)
  console.log('[pedido] 📦 originPlatform:', pedido.originPlatform)
  console.log('[pedido] 💰 rawWooData disponible:', !!pedido.rawWooData)
  
  try {
    // Obtener cliente de WooCommerce según la plataforma
    const wooCommerceClient = getWooCommerceClient(pedido.originPlatform)
    
    // ⚠️ CRÍTICO: Usar rawWooData si existe (tiene prioridad absoluta)
    let wooOrderData
    
    if (pedido.rawWooData) {
      console.log('[pedido] ✅ Usando rawWooData directamente')
      wooOrderData = pedido.rawWooData
      
      // Verificar que tiene totales
      console.log('[pedido] 💰 Totales en rawWooData:', {
        total: wooOrderData.total,
        subtotal: wooOrderData.subtotal,
        shipping_total: wooOrderData.shipping_total,
        total_tax: wooOrderData.total_tax,
        discount_total: wooOrderData.discount_total
      })
      
      // Verificar que tiene line_items
      console.log('[pedido] 📦 Line items en rawWooData:', {
        count: wooOrderData.line_items?.length || 0,
        items: wooOrderData.line_items
      })
      
    } else {
      console.log('[pedido] ⚠️ No hay rawWooData, construyendo desde pedido...')
      // Fallback: construir desde pedido (menos confiable)
      wooOrderData = {
        payment_method: pedido.metodo_pago || 'bacs',
        payment_method_title: pedido.metodo_pago_titulo || 'Transferencia bancaria directa',
        set_paid: pedido.estado === 'completed',
        status: pedido.estado || 'pending',
        customer_id: 0,
        billing: pedido.billing || { ... },
        shipping: pedido.shipping || { ... },
        line_items: (pedido.items || []).map(item => ({
          product_id: item.product_id || item.producto_id,
          quantity: item.quantity || item.cantidad,
          price: item.price || item.precio_unitario?.toString(),
        })),
        customer_note: pedido.nota_cliente || '',
        total: pedido.total?.toString(),
        subtotal: pedido.subtotal?.toString(),
        shipping_total: pedido.envio?.toString() || '0.00',
        total_tax: pedido.impuestos?.toString() || '0.00',
        discount_total: pedido.descuento?.toString() || '0.00',
      }
    }
    
    // ⚠️ VALIDACIÓN CRÍTICA: Verificar que tiene totales válidos
    if (!wooOrderData.total || parseFloat(wooOrderData.total) <= 0) {
      console.error('[pedido] ❌ ERROR: rawWooData no tiene total válido:', wooOrderData.total)
      throw new Error(`El pedido no tiene un total válido. Total: ${wooOrderData.total}`)
    }
    
    // ⚠️ VALIDACIÓN CRÍTICA: Verificar que tiene line_items
    if (!wooOrderData.line_items || wooOrderData.line_items.length === 0) {
      console.error('[pedido] ❌ ERROR: rawWooData no tiene line_items')
      throw new Error('El pedido no tiene productos (line_items vacío)')
    }
    
    console.log('[pedido] 📤 Enviando a WooCommerce:', JSON.stringify(wooOrderData, null, 2))
    
    // Crear pedido en WooCommerce
    const wooOrder = await wooCommerceClient.post('orders', wooOrderData)
    
    console.log('[pedido] ✅ Pedido creado en WooCommerce:', {
      id: wooOrder.id,
      number: wooOrder.number,
      status: wooOrder.status,
      total: wooOrder.total,        // ⚠️ Verificar que no sea "0"
      subtotal: wooOrder.subtotal,
      shipping_total: wooOrder.shipping_total,
      total_tax: wooOrder.total_tax,
      line_items_count: wooOrder.line_items?.length || 0
    })
    
    // ⚠️ VALIDACIÓN: Verificar que el total en WooCommerce NO sea 0
    if (parseFloat(wooOrder.total || '0') === 0) {
      console.error('[pedido] ❌ ERROR CRÍTICO: El pedido se creó en WooCommerce con total $0!')
      console.error('[pedido] Datos enviados:', JSON.stringify(wooOrderData, null, 2))
      throw new Error('El pedido se creó en WooCommerce con total $0. Revisa los logs.')
    }
    
    // Actualizar pedido en Strapi con woocommerce_id
    await strapi.entityService.update('api::pedido.pedido', pedido.documentId, {
      data: {
        woocommerce_id: wooOrder.id,
        externalIds: {
          ...(pedido.externalIds || {}),
          wooCommerce: {
            id: wooOrder.id,
            number: wooOrder.number,
            key: wooOrder.order_key,
          }
        }
      }
    })
    
    console.log('[pedido] ✅ Pedido actualizado en Strapi con woocommerce_id:', wooOrder.id)
    
  } catch (error) {
    console.error('[pedido] ❌ Error al sincronizar con WooCommerce:', error)
    console.error('[pedido] Datos del pedido:', {
      numero_pedido: pedido.numero_pedido,
      total: pedido.total,
      subtotal: pedido.subtotal,
      items_count: pedido.items?.length || 0,
      rawWooData: pedido.rawWooData ? 'existe' : 'no existe'
    })
    throw error
  }
}
```

## ⚠️ PUNTOS CRÍTICOS

1. **`rawWooData` tiene PRIORIDAD ABSOLUTA**: Si existe, usarlo directamente
2. **Validar totales ANTES de enviar**: Si `total` es 0 o undefined, NO enviar
3. **Validar line_items**: Si está vacío, NO enviar
4. **Verificar después de crear**: Si WooCommerce retorna total $0, hay un error
5. **Formato de totales**: WooCommerce espera strings con formato decimal (ej: "2799.01")

## 🔍 DEBUGGING

En los logs de Strapi, buscar:

### ✅ Si funciona correctamente:
```
[pedido] ✅ Usando rawWooData directamente
[pedido] 💰 Totales en rawWooData: { total: "2799.01", ... }
[pedido] 📦 Line items en rawWooData: { count: 3, ... }
[pedido] ✅ Pedido creado en WooCommerce: { total: "2799.01", ... }
```

### ❌ Si hay problemas:
```
[pedido] ❌ ERROR: rawWooData no tiene total válido: undefined
[pedido] ❌ ERROR: rawWooData no tiene line_items
[pedido] ❌ ERROR CRÍTICO: El pedido se creó en WooCommerce con total $0!
```

## 📋 CHECKLIST

- [ ] El lifecycle hook `afterCreate` verifica que `rawWooData` existe
- [ ] Si `rawWooData` existe, se usa directamente (sin modificar)
- [ ] Se validan los totales antes de enviar a WooCommerce
- [ ] Se validan los `line_items` antes de enviar
- [ ] Se verifica que el total en WooCommerce NO sea $0 después de crear
- [ ] Los logs muestran los totales que se están enviando

## 🚨 ACCIÓN INMEDIATA

1. **Revisar el lifecycle hook `afterCreate`** en Strapi
2. **Asegurar que usa `rawWooData` directamente** si existe
3. **Agregar validaciones** para totales y line_items
4. **Probar creando un pedido** desde la Intranet
5. **Verificar en WooCommerce** que el total sea correcto






