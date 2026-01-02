# 🔧 SOLUCIÓN: Sincronización de Pedidos con WooCommerce

## ❌ PROBLEMA ACTUAL

Los pedidos creados desde la Intranet:
- ✅ Se guardan correctamente en Strapi
- ✅ Tienen todos los datos (productos, precios, totales)
- ❌ **NO se sincronizan correctamente con WooCommerce**
- ❌ En WordPress no aparecen los productos
- ❌ En WordPress no aparece el precio total
- ❌ En WordPress no aparecen los detalles

## 🔍 CAUSA RAÍZ

El problema está en el **lifecycle hook `afterCreate` de Strapi**. Aunque la Intranet envía todos los datos correctamente (incluyendo `rawWooData` con formato WooCommerce), el lifecycle hook de Strapi probablemente:

1. **No está usando `rawWooData`** para crear el pedido en WooCommerce
2. **No está mapeando correctamente los `line_items`**
3. **No está enviando los totales** (`total`, `subtotal`, `shipping_total`, `total_tax`, `discount_total`)

## ✅ LO QUE LA INTRANET ESTÁ ENVIANDO

La Intranet envía a Strapi:

```json
{
  "data": {
    "numero_pedido": "12345",
    "estado": "completed",
    "total": 2799.01,
    "subtotal": 2690.01,
    "impuestos": 19,
    "envio": 100,
    "descuento": 10,
    "originPlatform": "woo_escolar",
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
    ],
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
          "price": "989.56"
        }
      ],
      "total": "2799.01",
      "subtotal": "2690.01",
      "shipping_total": "100",
      "total_tax": "19",
      "discount_total": "10"
    }
  }
}
```

## 🎯 SOLUCIÓN REQUERIDA EN STRAPI

El lifecycle hook `afterCreate` en Strapi **DEBE**:

### 1. Usar `rawWooData` si existe

```javascript
const wooOrderData = pedido.rawWooData || {
  // Fallback si no existe rawWooData
}
```

### 2. Asegurar que `line_items` tenga la estructura correcta

```javascript
line_items: pedido.rawWooData?.line_items || pedido.items.map(item => ({
  product_id: item.product_id || item.producto_id, // ⚠️ CRÍTICO
  quantity: item.quantity || item.cantidad,         // ⚠️ CRÍTICO
  price: item.price || item.precio_unitario?.toString() // Opcional pero recomendado
}))
```

### 3. Incluir TODOS los totales

```javascript
{
  total: pedido.rawWooData?.total || pedido.total?.toString(),
  subtotal: pedido.rawWooData?.subtotal || pedido.subtotal?.toString(),
  shipping_total: pedido.rawWooData?.shipping_total || pedido.envio?.toString() || '0',
  total_tax: pedido.rawWooData?.total_tax || pedido.impuestos?.toString() || '0',
  discount_total: pedido.rawWooData?.discount_total || pedido.descuento?.toString() || '0',
}
```

### 4. Incluir billing y shipping completos

```javascript
{
  billing: pedido.rawWooData?.billing || pedido.billing || { ... },
  shipping: pedido.rawWooData?.shipping || pedido.shipping || { ... }
}
```

## 📋 CHECKLIST PARA STRAPI

- [ ] Verificar que el Content Type `pedido` tenga el campo `rawWooData` (tipo JSON)
- [ ] Verificar que el lifecycle hook `afterCreate` se ejecute cuando se crea un pedido
- [ ] Verificar que el lifecycle hook use `rawWooData` si existe
- [ ] Verificar que `line_items` tenga `product_id` y `quantity`
- [ ] Verificar que se envíen todos los totales a WooCommerce
- [ ] Verificar que se guarde el `woocommerce_id` después de crear en WooCommerce

## 🔍 CÓMO VERIFICAR

### En los logs de Strapi (Railway), buscar:

1. **Cuando se crea un pedido:**
   ```
   [pedido] 🔍 afterCreate ejecutado
   [pedido] 📦 originPlatform: woo_escolar
   [pedido] 📤 Enviando a WooCommerce: { ... }
   ```

2. **Si hay errores:**
   ```
   [pedido] ❌ Error al sincronizar con WooCommerce: ...
   ```

3. **Si se sincroniza correctamente:**
   ```
   [pedido] ✅ Pedido creado en WooCommerce: { id: 12345, ... }
   [pedido] ✅ Pedido actualizado en Strapi con woocommerce_id: 12345
   ```

### En los logs de la Intranet (Railway), buscar:

1. **Cuando se crea un pedido:**
   ```
   [API Pedidos POST] 📦 Payload que se envía a Strapi: { ... }
   [API Pedidos POST] 🔍 rawWooData para sincronización: { ... }
   [API Pedidos POST] ✅ Pedido creado en Strapi
   rawWooData guardado: true
   ```

2. **Si hay problemas:**
   ```
   [API Pedidos POST] ⚠️ ADVERTENCIA: rawWooData no tiene line_items!
   [API Pedidos POST] ❌ ERROR CRÍTICO: rawWooData NO se guardó en Strapi!
   ```

## 🚨 ACCIÓN INMEDIATA REQUERIDA

**El equipo de Strapi debe:**

1. **Revisar el archivo `PROMPT-STRAPI-SINCRONIZACION-PEDIDOS.md`** que contiene el código completo del lifecycle hook
2. **Implementar el lifecycle hook `afterCreate`** usando `rawWooData`
3. **Verificar que el campo `rawWooData` existe** en el Content Type `pedido`
4. **Probar creando un pedido** desde la Intranet y verificar que se sincroniza correctamente con WooCommerce

## 📞 INFORMACIÓN PARA EL EQUIPO DE STRAPI

- **Archivo de referencia:** `PROMPT-STRAPI-SINCRONIZACION-PEDIDOS.md`
- **Content Type:** `api::pedido.pedido`
- **Campo crítico:** `rawWooData` (tipo JSON)
- **Lifecycle hook:** `afterCreate`
- **Plataformas:** `woo_moraleja` y `woo_escolar`

