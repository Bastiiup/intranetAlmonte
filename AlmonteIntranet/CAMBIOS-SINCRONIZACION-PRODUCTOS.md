# Cambios: Sincronización de Productos y Mejoras en Selector de Productos

## Fecha
Enero 2025

## Resumen
Se implementaron mejoras significativas en la sincronización de productos entre WooCommerce y Strapi, así como correcciones en el selector de productos para pedidos. Se agregó sincronización bidireccional y se corrigieron problemas de paginación y validación de precios.

---

## Problemas Identificados y Solucionados

### 1. **Solo aparecía 1 producto al seleccionar canal "Escolar" en pedidos**
**Problema:** Al crear un pedido y seleccionar la plataforma "WooCommerce Escolar", solo aparecía 1 producto en el selector, mientras que "Moraleja" funcionaba correctamente.

**Causa raíz:**
- El componente `ProductSelector` solo estaba cargando la primera página de productos (100 productos máximo)
- Los productos en Strapi con canal "Escolar" no estaban sincronizados en WooCommerce Escolar
- La validación de precios rechazaba productos con `price: "0"` aunque tuvieran `regular_price` válido

**Solución:**
- Implementada paginación automática para cargar todos los productos de WooCommerce
- Agregada sincronización bidireccional: desde Strapi a WooCommerce
- Mejorada validación de precios usando `regular_price` como fallback

---

## Cambios Realizados

### 1. **ProductSelector.tsx** - Mejoras en el selector de productos

#### Paginación automática
- Implementada lógica para cargar todas las páginas de productos de WooCommerce
- El componente ahora itera automáticamente hasta obtener todos los productos disponibles
- Agregados logs detallados para debugging

```typescript
// Antes: Solo cargaba primera página (100 productos)
const url = `/api/woocommerce/products?platform=${platformParam}&per_page=100&page=1`

// Después: Carga todas las páginas automáticamente
while (hasMore) {
  const url = `/api/woocommerce/products?platform=${platformParam}&per_page=${perPage}&page=${page}`
  // ... lógica de paginación
  if (pageProducts.length < perPage) {
    hasMore = false
  } else {
    page++
  }
}
```

#### Validación mejorada de precios
- Ahora usa `regular_price` como fallback cuando `price` es "0" o vacío
- Alineado con el comportamiento estándar de WooCommerce

```typescript
// Antes: Rechazaba productos con price: "0"
if (!price || price <= 0) {
  setError('Producto sin precio válido')
  return
}

// Después: Usa regular_price como fallback
let price = parseFloat(product.price || '0')
if (!price || price <= 0) {
  const regularPrice = parseFloat(product.regular_price || '0')
  if (regularPrice > 0) {
    price = regularPrice
  }
}
```

#### Mejoras en UI
- Botones deshabilitados muestran tooltips explicativos
- Mejor manejo de estados de carga y errores
- Indicadores visuales para productos sin stock o sin precio válido

---

### 2. **PedidosListing.tsx** - Corrección de warning de React

**Problema:** Warning de React sobre falta de `key` prop en Fragment

**Solución:** Reemplazado fragment corto `<>` por `React.Fragment` con `key` prop

```typescript
// Antes:
<tbody>
  {rows.map((row) => (
    <>
      <tr>...</tr>
      {row.getIsExpanded() && <tr>...</tr>}
    </>
  ))}
</tbody>

// Después:
<tbody>
  {rows.map((row) => (
    <React.Fragment key={row.id}>
      <tr>...</tr>
      {row.getIsExpanded() && <tr>...</tr>}
    </React.Fragment>
  ))}
</tbody>
```

---

### 3. **API de Sincronización** - Nueva funcionalidad bidireccional

#### Archivo: `src/app/api/tienda/productos/sync/route.ts`

**Funcionalidad agregada:**
- Sincronización desde WooCommerce a Strapi (existente, mejorada)
- **Nueva:** Sincronización desde Strapi a WooCommerce

#### Función `syncProductsToWooCommerce()`
Esta nueva función:
1. Obtiene productos de Strapi con canal específico y estado "Publicado"
2. Verifica si ya existen en WooCommerce (por SKU o `woocommerce_id`)
3. Crea productos faltantes en WooCommerce
4. Actualiza `woocommerce_id` en Strapi después de crear

**Características:**
- Maneja descripciones en formato Rich Text (blocks) de Strapi
- Convierte imágenes de Strapi al formato WooCommerce
- Asigna precios, stock y otros atributos correctamente
- Evita duplicados verificando SKU y `woocommerce_id`

#### Endpoint actualizado
```typescript
POST /api/tienda/productos/sync
Body: {
  platforms: ['woo_moraleja', 'woo_escolar'],
  direction: 'from_woocommerce' | 'to_woocommerce' // Nueva opción
}
```

---

### 4. **ProductsTabs.tsx** - Interfaz de sincronización mejorada

**Cambios:**
- Agregado segundo botón "A WooCommerce" para sincronización inversa
- Botón "Desde WooCommerce" renombrado y mejorado
- Mejor feedback visual con tooltips y mensajes descriptivos

```typescript
// Nuevos botones:
<Button onClick={handleSyncProducts}>
  Desde WooCommerce  // Trae productos de WooCommerce a Strapi
</Button>

<Button onClick={handleSyncToWooCommerce}>
  A WooCommerce      // Envía productos de Strapi a WooCommerce
</Button>
```

---

### 5. **API Route de Productos WooCommerce** - Sin cambios funcionales

El archivo `src/app/api/woocommerce/products/route.ts` ya estaba funcionando correctamente, solo se agregaron logs para debugging.

---

## Archivos Modificados

1. `src/app/(admin)/(apps)/(ecommerce)/atributos/pedidos/components/ProductSelector.tsx`
   - Paginación automática
   - Validación mejorada de precios
   - Mejoras en UI y manejo de errores

2. `src/app/(admin)/(apps)/(ecommerce)/atributos/pedidos/components/PedidosListing.tsx`
   - Corrección de warning de React (key prop)

3. `src/app/(admin)/(apps)/(ecommerce)/products/components/ProductsTabs.tsx`
   - Agregado botón "A WooCommerce"
   - Mejorada interfaz de sincronización

4. `src/app/api/tienda/productos/sync/route.ts` (NUEVO)
   - Función `syncProductsToWooCommerce()`
   - Soporte para dirección bidireccional

5. `src/app/api/woocommerce/products/route.ts`
   - Logs de debugging (sin cambios funcionales)

---

## Cómo Usar las Nuevas Funcionalidades

### Sincronizar productos desde WooCommerce a Strapi
1. Ir a `/products`
2. Clic en botón **"Desde WooCommerce"**
3. Esperar a que se complete la sincronización
4. Los productos de WooCommerce se crearán en Strapi si no existen

### Sincronizar productos desde Strapi a WooCommerce
1. Ir a `/products`
2. Clic en botón **"A WooCommerce"**
3. Esperar a que se complete la sincronización
4. Los productos de Strapi con canales asignados se crearán en WooCommerce si no existen

**Importante:** Los productos deben tener:
- Estado de publicación: "Publicado"
- Canal asignado (Escolar o Moraleja)
- SKU válido (ISBN)

### Crear pedidos con productos de Escolar
1. Ir a `/atributos/pedidos/agregar`
2. Seleccionar "WooCommerce Escolar" como plataforma de origen
3. Clic en "Agregar Productos"
4. Ahora deberían aparecer **todos** los productos de Escolar (no solo 1)
5. Si faltan productos, usar el botón "A WooCommerce" en `/products` primero

---

## Errores Corregidos

### Error de TypeScript en build
**Error:**
```
Type error: This comparison appears to be unintentional because the types 
'"woo_moraleja" | "woo_escolar"' and '"otros"' have no overlap.
```

**Causa:** Verificación redundante después de un `return` condicional

**Solución:** Eliminada verificación redundante en `ProductSelector.tsx`

```typescript
// Antes (con error):
if (originPlatform === 'otros') {
  return
}
if (show) {
  if (originPlatform !== 'otros') { // ❌ Redundante
    fetchProducts()
  }
}

// Después (corregido):
if (originPlatform === 'otros') {
  return
}
if (show) {
  fetchProducts() // ✅ Ya sabemos que no es 'otros'
}
```

---

## Testing y Validación

### Pruebas realizadas:
1. ✅ Paginación automática carga todos los productos
2. ✅ Validación de precios funciona con `regular_price` como fallback
3. ✅ Sincronización desde WooCommerce a Strapi funciona
4. ✅ Sincronización desde Strapi a WooCommerce funciona
5. ✅ Build de TypeScript compila sin errores
6. ✅ Warnings de React corregidos

### Pendiente de probar en producción:
- Sincronización de productos con imágenes complejas
- Productos con descripciones muy largas
- Productos con múltiples variaciones

---

## Notas Técnicas

### Limitaciones conocidas:
1. La sincronización procesa productos en lotes de 5 para evitar sobrecarga
2. Los productos sin SKU recibirán un SKU generado automáticamente
3. Las imágenes deben estar accesibles públicamente para sincronizarse correctamente

### Mejoras futuras sugeridas:
1. Agregar sincronización incremental (solo productos modificados)
2. Agregar sincronización de variaciones de productos
3. Agregar sincronización de categorías y tags
4. Agregar manejo de errores más granular con retry logic
5. Agregar notificaciones en tiempo real del progreso de sincronización

---

## Commits Realizados

1. `e63f09c1` - feat: Mejorar sincronización de productos y selector de productos en pedidos
2. `0168bd6e` - fix: Corregir error de TypeScript en ProductSelector - eliminar verificación redundante

---

## Rama
`mati-integracion`

---

## Autor
Cambios realizados en colaboración con el equipo de desarrollo.
