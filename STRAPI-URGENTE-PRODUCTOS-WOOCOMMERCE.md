# 🚨 URGENTE: Sincronización de Productos con WooCommerce

## ❌ PROBLEMA ACTUAL

Los productos creados desde la Intranet llegan a Strapi pero **NO se sincronizan correctamente** con WooCommerce. Los siguientes campos no aparecen en WordPress:

- ❌ **Descripción del producto** (`description`)
- ❌ **Descripción corta** (`short_description`)
- ❌ **Precio rebajado** (`sale_price`)
- ❌ **Peso y dimensiones** (`weight`, `dimensions`)
- ❌ **Clase de envío** (`shipping_class`)

---

## ✅ SOLUCIÓN: Usar `rawWooData`

La Intranet ahora envía un campo **`rawWooData`** que contiene **TODOS** los datos del producto en el formato exacto que WooCommerce espera.

### 📦 ESTRUCTURA DE `rawWooData`

```javascript
{
  rawWooData: {
    name: "Nombre del producto",
    type: "simple",
    status: "publish",
    featured: false,
    catalog_visibility: "visible",
    description: "Descripción completa del producto",  // ✅ INCLUIDO
    short_description: "Descripción corta",            // ✅ INCLUIDO
    sku: "ISBN-123456",
    regular_price: "45990.00",                        // ✅ INCLUIDO
    sale_price: "39990.00",                           // ✅ INCLUIDO (si hay oferta)
    manage_stock: true,
    stock_quantity: 10,
    stock_status: "instock",
    backorders: "no",
    sold_individually: false,
    weight: "0.5",                                     // ✅ INCLUIDO
    dimensions: {
      length: "20",                                    // ✅ INCLUIDO
      width: "15",                                     // ✅ INCLUIDO
      height: "2",                                     // ✅ INCLUIDO
    },
    shipping_class: "standard",                        // ✅ INCLUIDO
    virtual: false,
    downloadable: false,
    reviews_allowed: true,
    menu_order: 0,
    purchase_note: "",
  }
}
```

---

## 🔧 IMPLEMENTACIÓN EN STRAPI

### Paso 1: Modificar el Lifecycle `afterCreate` del Content Type `api::libro.libro`

```javascript
// src/api/libro/content-types/libro/lifecycles.js

module.exports = {
  async afterCreate(event) {
    const { result } = event;
    const data = result.attributes || result;

    // ⚠️ CRÍTICO: Verificar que tiene rawWooData
    if (!data.rawWooData) {
      console.warn('[libro lifecycle] ⚠️ Producto sin rawWooData, no se sincronizará con WooCommerce');
      return;
    }

    // ⚠️ CRÍTICO: Verificar que tiene canales asignados
    if (!data.canales || data.canales.length === 0) {
      console.warn('[libro lifecycle] ⚠️ Producto sin canales, no se sincronizará con WooCommerce');
      return;
    }

    // ⚠️ CRÍTICO: Verificar que estado_publicacion es "Publicado"
    if (data.estado_publicacion !== 'Publicado') {
      console.log('[libro lifecycle] ⏸️ Producto con estado:', data.estado_publicacion, '- No se sincroniza');
      return;
    }

    console.log('[libro lifecycle] ✅ Producto listo para sincronizar con WooCommerce');
    console.log('[libro lifecycle] 📦 rawWooData:', JSON.stringify(data.rawWooData, null, 2));

    // Sincronizar con cada canal asignado
    for (const canalId of data.canales) {
      try {
        // Obtener información del canal
        const canal = await strapi.entityService.findOne('api::canal.canal', canalId, {
          populate: '*',
        });

        if (!canal) {
          console.warn(`[libro lifecycle] ⚠️ Canal ${canalId} no encontrado`);
          continue;
        }

        const canalAttrs = canal.attributes || canal;
        const platform = canalAttrs.key || canalAttrs.nombre?.toLowerCase();

        // Determinar qué WooCommerce usar
        let wooCommerceClient;
        if (platform === 'moraleja' || platform === 'woo_moraleja') {
          wooCommerceClient = createWooCommerceClient('moraleja');
        } else if (platform === 'escolar' || platform === 'woo_escolar') {
          wooCommerceClient = createWooCommerceClient('escolar');
        } else {
          console.warn(`[libro lifecycle] ⚠️ Canal desconocido: ${platform}`);
          continue;
        }

        // ⚠️ CRÍTICO: Usar rawWooData directamente (ya está en formato WooCommerce)
        const wooProductData = {
          ...data.rawWooData,
          // Agregar imagen si existe
          images: data.portada_libro ? [
            {
              src: data.portada_libro.url || data.portada_libro,
              alt: data.nombre_libro,
            }
          ] : [],
        };

        console.log(`[libro lifecycle] 📤 Sincronizando con ${platform}...`);
        console.log(`[libro lifecycle] 📦 Datos WooCommerce:`, JSON.stringify(wooProductData, null, 2));

        // Crear producto en WooCommerce
        const wooProduct = await wooCommerceClient.post('products', wooProductData);

        console.log(`[libro lifecycle] ✅ Producto creado en WooCommerce ${platform}:`, {
          id: wooProduct.id,
          name: wooProduct.name,
        });

        // Actualizar el producto en Strapi con el ID de WooCommerce
        await strapi.entityService.update('api::libro.libro', result.documentId, {
          data: {
            woocommerce_id: wooProduct.id,
            // Guardar también en externalIds para referencia
            externalIds: {
              ...(data.externalIds || {}),
              wooCommerce: {
                [platform]: {
                  id: wooProduct.id,
                  url: wooProduct.permalink,
                },
              },
            },
          },
        });

        console.log(`[libro lifecycle] ✅ Producto actualizado con woocommerce_id: ${wooProduct.id}`);

      } catch (error) {
        console.error(`[libro lifecycle] ❌ Error al sincronizar con canal ${canalId}:`, error.message);
        // Continuar con el siguiente canal
      }
    }
  },
};
```

---

## ✅ CHECKLIST DE VALIDACIÓN

Antes de sincronizar, verificar:

- [ ] `rawWooData` existe y no está vacío
- [ ] `rawWooData.description` está presente (descripción completa)
- [ ] `rawWooData.short_description` está presente (descripción corta)
- [ ] `rawWooData.regular_price` está presente y es > 0
- [ ] `rawWooData.sale_price` está presente si hay oferta
- [ ] `rawWooData.weight` está presente si se especificó
- [ ] `rawWooData.dimensions` está presente si se especificaron
- [ ] `canales` tiene al menos un canal asignado
- [ ] `estado_publicacion` es "Publicado"

---

## 🔍 DEBUGGING

Si los productos no se sincronizan, revisar los logs de Strapi:

```bash
# Buscar estos mensajes en los logs:
[libro lifecycle] ✅ Producto listo para sincronizar
[libro lifecycle] 📦 rawWooData: {...}
[libro lifecycle] 📤 Sincronizando con...
[libro lifecycle] ✅ Producto creado en WooCommerce
```

Si ves:
- `⚠️ Producto sin rawWooData` → El payload no incluye rawWooData
- `⚠️ Producto sin canales` → No se asignaron canales
- `⏸️ Producto con estado: Pendiente` → El estado no es "Publicado"

---

## 📝 NOTAS IMPORTANTES

1. **`rawWooData` es la fuente de verdad**: Usa este campo directamente, NO reconstruyas los datos desde otros campos
2. **Todos los campos están incluidos**: `rawWooData` contiene TODO lo necesario para WooCommerce
3. **Formato correcto**: Los precios están como strings con 2 decimales (ej: "45990.00")
4. **Dimensiones**: Están en el formato que WooCommerce espera (objeto con length, width, height)

---

## 🚨 ACCIÓN REQUERIDA

1. **Implementar el código del lifecycle** usando `rawWooData`
2. **Probar creando un producto** desde la Intranet
3. **Verificar en WooCommerce** que aparecen:
   - ✅ Descripción completa
   - ✅ Descripción corta
   - ✅ Precio rebajado (si se especificó)
   - ✅ Peso y dimensiones
   - ✅ Clase de envío

Una vez implementado, **TODOS** los campos se sincronizarán correctamente con WooCommerce.

