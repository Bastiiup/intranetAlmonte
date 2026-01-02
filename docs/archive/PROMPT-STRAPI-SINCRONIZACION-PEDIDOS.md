# 🔄 PROMPT PARA STRAPI: Sincronización de Pedidos con WooCommerce

## 📋 PROBLEMA ACTUAL

Los pedidos creados desde la Intranet se guardan correctamente en Strapi, pero cuando se sincronizan con WooCommerce:
- ❌ No aparecen los productos (line_items)
- ❌ No aparece el precio total
- ❌ No aparecen los detalles del pedido

## ✅ DATOS QUE ENVÍA LA INTRANET

La Intranet envía a Strapi los siguientes datos en el campo `rawWooData` (formato WooCommerce puro):

```json
{
  "data": {
    "numero_pedido": "12345",
    "fecha_pedido": "2025-12-28T20:28:00Z",
    "fecha_creacion": "2025-12-28T20:28:00Z",
    "estado": "completed",
    "total": "2799.01",
    "subtotal": "2690.01",
    "impuestos": "19",
    "envio": "100",
    "descuento": "10",
    "originPlatform": "woo_escolar", // o "woo_moraleja"
    "rawWooData": {
      "payment_method": "bacs",
      "payment_method_title": "Transferencia bancaria directa",
      "set_paid": true,
      "status": "completed",
      "customer_id": 0,
      "billing": {
        "first_name": "Cliente",
        "last_name": "Invitado",
        "email": "",
        "address_1": "",
        "city": "",
        "state": "",
        "postcode": "",
        "country": "CL"
      },
      "shipping": {
        "first_name": "Cliente",
        "last_name": "Invitado",
        "address_1": "",
        "city": "",
        "state": "",
        "postcode": "",
        "country": "CL"
      },
      "line_items": [
        {
          "product_id": 9091,
          "quantity": 1,
          "price": "989.56"
        },
        {
          "product_id": 9089,
          "quantity": 1,
          "price": "761.67"
        }
      ],
      "customer_note": "Nota del cliente",
      "total": "2799.01",
      "subtotal": "2690.01",
      "shipping_total": "100",
      "total_tax": "19",
      "discount_total": "10"
    },
    "items": [
      {
        "producto_id": 9091,
        "product_id": 9091,
        "nombre": "Goodbye Again",
        "cantidad": 1,
        "quantity": 1,
        "precio_unitario": 989.56,
        "price": "989.56",
        "total": 989.56
      }
    ]
  }
}
```

## 🎯 LO QUE NECESITA HACER EL LIFECYCLE HOOK `afterCreate`

El lifecycle hook `afterCreate` en Strapi debe:

1. **Verificar `originPlatform`**: Solo sincronizar si es `woo_moraleja` o `woo_escolar`
2. **Usar `rawWooData`**: Si existe `rawWooData`, usarlo directamente para crear el pedido en WooCommerce
3. **Mapear `line_items`**: Convertir los items de Strapi a `line_items` de WooCommerce:
   ```javascript
   line_items: pedido.rawWooData?.line_items || pedido.items.map(item => ({
     product_id: item.product_id || item.producto_id,
     quantity: item.quantity || item.cantidad,
     price: item.price || item.precio_unitario?.toString()
   }))
   ```
4. **Incluir todos los totales**: Asegurar que se envíen:
   - `total`
   - `subtotal`
   - `shipping_total` (envio)
   - `total_tax` (impuestos)
   - `discount_total` (descuento)
5. **Incluir billing y shipping**: Enviar información completa de facturación y envío
6. **Guardar `woocommerce_id`**: Después de crear en WooCommerce, actualizar el pedido en Strapi con el `woocommerce_id` retornado

## 📝 EJEMPLO DE CÓDIGO PARA EL LIFECYCLE HOOK

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
  
  try {
    // Obtener cliente de WooCommerce según la plataforma
    const wooCommerceClient = getWooCommerceClient(pedido.originPlatform)
    
    // Preparar datos para WooCommerce
    const wooOrderData = pedido.rawWooData || {
      payment_method: pedido.metodo_pago || 'bacs',
      payment_method_title: pedido.metodo_pago_titulo || 'Transferencia bancaria directa',
      set_paid: pedido.estado === 'completed',
      status: pedido.estado || 'pending',
      customer_id: 0,
      billing: pedido.billing || {
        first_name: 'Cliente',
        last_name: 'Invitado',
        email: '',
        address_1: '',
        city: '',
        state: '',
        postcode: '',
        country: 'CL',
      },
      shipping: pedido.shipping || {
        first_name: 'Cliente',
        last_name: 'Invitado',
        address_1: '',
        city: '',
        state: '',
        postcode: '',
        country: 'CL',
      },
      line_items: (pedido.items || []).map(item => ({
        product_id: item.product_id || item.producto_id,
        quantity: item.quantity || item.cantidad,
        ...(item.price && { price: item.price }),
      })),
      customer_note: pedido.nota_cliente || '',
      total: pedido.total?.toString(),
      subtotal: pedido.subtotal?.toString(),
      shipping_total: pedido.envio?.toString() || '0',
      total_tax: pedido.impuestos?.toString() || '0',
      discount_total: pedido.descuento?.toString() || '0',
    }
    
    console.log('[pedido] 📤 Enviando a WooCommerce:', JSON.stringify(wooOrderData, null, 2))
    
    // Crear pedido en WooCommerce
    const wooOrder = await wooCommerceClient.post('orders', wooOrderData)
    
    console.log('[pedido] ✅ Pedido creado en WooCommerce:', {
      id: wooOrder.id,
      number: wooOrder.number,
      status: wooOrder.status,
      total: wooOrder.total
    })
    
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
    throw error
  }
}
```

## ⚠️ PUNTOS CRÍTICOS

1. **`rawWooData` tiene prioridad**: Si existe, usarlo directamente
2. **`line_items` es obligatorio**: WooCommerce requiere al menos un producto
3. **Totales deben ser strings**: WooCommerce espera totales como strings
4. **`product_id` debe existir**: Cada item debe tener un `product_id` válido de WooCommerce
5. **Billing/Shipping completos**: Aunque sean mínimos, deben estar presentes

## 🔍 VERIFICACIÓN

Después de implementar, verificar en los logs de Strapi:
- ✅ `[pedido] 🔍 afterCreate ejecutado`
- ✅ `[pedido] 📤 Enviando a WooCommerce`
- ✅ `[pedido] ✅ Pedido creado en WooCommerce`
- ✅ `[pedido] ✅ Pedido actualizado en Strapi con woocommerce_id`

Si hay errores, buscar:
- ❌ Errores de autenticación con WooCommerce
- ❌ Errores de productos no encontrados
- ❌ Errores de formato de datos

