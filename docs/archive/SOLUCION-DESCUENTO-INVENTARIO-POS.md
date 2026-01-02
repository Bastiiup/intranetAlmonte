# Solución: Descuento de Inventario en Pedidos POS

## ❌ Problema

Los pedidos creados desde el POS no estaban descontando automáticamente el inventario en WooCommerce, aunque anteriormente funcionaba correctamente.

## 🔍 Causa Raíz

En WooCommerce, el stock se descuenta automáticamente **solo** cuando:
1. El pedido tiene status `processing` o `completed`
2. El producto tiene `manage_stock: true` configurado
3. El producto tiene `stock_quantity` configurado

El problema era que el status del pedido podía estar como `pending` por defecto, lo que **NO permite** el descuento automático de stock.

## ✅ Solución Implementada

### Cambios en `frontend-ubold/src/app/api/tienda/pedidos/route.ts`

1. **Forzar status 'completed' para pedidos POS:**
   ```typescript
   // Si el origen es POS, forzar status 'completed' para descuento de stock
   const statusFinal = (body.data.origen === 'pos' || body.data.origen === 'POS') ? 'completed' : estadoWoo
   const setPaidFinal = statusFinal === 'completed' || statusFinal === 'processing' || ...
   ```

2. **Asegurar que rawWooData tenga el status correcto:**
   ```typescript
   const rawWooData = {
     status: statusFinal, // ✅ Usar status que permita descuento de stock
     set_paid: setPaidFinal,
     // ... otros campos
   }
   ```

3. **Asegurar que el estado en Strapi también sea 'completed':**
   ```typescript
   estado: (body.data.origen === 'pos' || body.data.origen === 'POS') ? 'completed' : ...
   ```

## 📋 Verificaciones Necesarias

### 1. Verificar Configuración de Productos en WooCommerce

Asegúrate de que los productos tengan:
- ✅ `manage_stock: true` (Controlar inventario activado)
- ✅ `stock_quantity` configurado (Cantidad de existencias)
- ✅ `stock_status: "instock"` (Estado de stock)

### 2. Verificar Lifecycle Hook de Strapi

El lifecycle hook `afterCreate` en Strapi debe:
- ✅ Usar `rawWooData` directamente si existe
- ✅ Asegurar que el status sea `completed` o `processing` al crear el pedido en WooCommerce
- ✅ No cambiar el status después de crear el pedido

### Ejemplo de código para el lifecycle hook:

```javascript
async function afterCreate(event) {
  const { result } = event
  const pedido = result
  
  // Solo sincronizar si originPlatform es válido
  if (!pedido.originPlatform || 
      (pedido.originPlatform !== 'woo_moraleja' && pedido.originPlatform !== 'woo_escolar')) {
    return
  }
  
  try {
    const wooCommerceClient = getWooCommerceClient(pedido.originPlatform)
    
    // ⚠️ CRÍTICO: Usar rawWooData si existe
    let wooOrderData
    if (pedido.rawWooData) {
      wooOrderData = pedido.rawWooData
      
      // ⚠️ IMPORTANTE: Asegurar que el status permita descuento de stock
      // Si el origen es POS, forzar 'completed'
      if (pedido.origen === 'pos' || pedido.origen === 'POS') {
        wooOrderData.status = 'completed'
        wooOrderData.set_paid = true
      }
      
      // Si el status es 'pending', cambiarlo a 'processing' para descuento de stock
      if (wooOrderData.status === 'pending') {
        wooOrderData.status = 'processing'
      }
    } else {
      // Construir desde pedido si no hay rawWooData
      wooOrderData = {
        // ... construir desde pedido
        status: pedido.estado === 'completado' ? 'completed' : 'processing',
        set_paid: pedido.estado === 'completado',
      }
    }
    
    // Crear pedido en WooCommerce
    const order = await wooCommerceClient.post('orders', wooOrderData)
    
    console.log('[pedido] ✅ Pedido creado en WooCommerce:', order.id)
    console.log('[pedido] 📦 Status:', wooOrderData.status, '- Stock se descontará automáticamente')
    
  } catch (error) {
    console.error('[pedido] ❌ Error al sincronizar con WooCommerce:', error)
  }
}
```

## 🧪 Pruebas

1. **Crear un pedido desde el POS:**
   - Agregar productos al carrito
   - Procesar el pedido
   - Verificar que el status sea `completed` en WooCommerce

2. **Verificar descuento de stock:**
   - Antes del pedido: Anotar `stock_quantity` del producto
   - Crear pedido desde POS
   - Después del pedido: Verificar que `stock_quantity` se haya reducido

3. **Verificar logs:**
   - Revisar logs de la API: `[API Pedidos POST] 📦 Status del pedido para WooCommerce`
   - Revisar logs de Strapi: `[pedido] ✅ Pedido creado en WooCommerce`
   - Verificar que el status sea `completed`

## 📝 Notas Importantes

- **Status que permiten descuento de stock:**
  - ✅ `completed` - Descuenta stock
  - ✅ `processing` - Descuenta stock
  - ❌ `pending` - NO descuenta stock
  - ❌ `on-hold` - NO descuenta stock

- **El descuento de stock es automático en WooCommerce** cuando:
  - El pedido tiene status `processing` o `completed`
  - El producto tiene `manage_stock: true`
  - El producto tiene `stock_quantity` configurado

- **No es necesario actualizar manualmente el stock** - WooCommerce lo hace automáticamente al crear el pedido con el status correcto.

## 🔗 Referencias

- [WooCommerce Order Statuses](https://woocommerce.com/document/managing-orders/#order-statuses)
- [WooCommerce Inventory Management](https://woocommerce.com/document/managing-products/#inventory-management)

