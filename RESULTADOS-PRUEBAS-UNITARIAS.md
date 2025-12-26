# 📊 Resultados de Pruebas Unitarias

**Fecha:** 26 de Diciembre, 2025  
**Comando ejecutado:** `npm test`

## ✅ Resumen General

- **Test Suites:** 7 fallidos, 16 pasados, **23 total**
- **Tests:** 27 fallidos, 186 pasados, **213 total**
- **Tiempo de ejecución:** 6.033 segundos
- **Tasa de éxito:** 87.3% (186/213)

---

## ❌ Suites de Pruebas Fallidas (7)

### 1. `src/app/api/tienda/categorias/__tests__/route.integration.test.ts`
**Errores:** 3 pruebas fallidas
- `POST` no es una función exportada
- Problema: Los tests intentan importar `POST` directamente pero no está exportado correctamente

**Errores específicos:**
- ❌ debe crear categoría en Strapi primero, luego en WooCommerce con slug=documentId
- ❌ debe eliminar de Strapi si falla WooCommerce
- ❌ debe retornar error si falta el nombre

---

### 2. `src/app/api/tienda/etiquetas/__tests__/route.integration.test.ts`
**Errores:** 3 pruebas fallidas
- Mismo problema que categorías: `POST` no es una función exportada

**Errores específicos:**
- ❌ debe crear etiqueta en Strapi primero, luego en WooCommerce con slug=documentId
- ❌ debe eliminar de Strapi si falla WooCommerce
- ❌ debe retornar error si falta el nombre

---

### 3. `src/app/api/chat/mensajes/__tests__/route.integration.test.ts`
**Errores:** 7 pruebas fallidas
- Problema: Tests esperan código 200/400/500 pero reciben 401 (No autorizado)
- Causa: Falta mockear la autenticación en los tests

**Errores específicos:**
- ❌ GET: debe retornar mensajes cuando los parámetros son válidos (esperado: 200, recibido: 401)
- ❌ GET: debe retornar error 400 cuando la validación falla (esperado: 400, recibido: 401)
- ❌ GET: debe manejar errores correctamente (esperado: 500, recibido: 401)
- ❌ GET: debe retornar array vacío cuando el error es 404 (esperado: 200, recibido: 401)
- ❌ POST: debe enviar un mensaje cuando los parámetros son válidos (esperado: 201, recibido: 401)
- ❌ POST: debe retornar error 400 cuando la validación falla (esperado: 400, recibido: 401)
- ❌ POST: debe manejar errores correctamente (esperado: 500, recibido: 401)

---

### 4. `src/app/api/tienda/categorias/[id]/__tests__/route.integration.test.ts`
**Errores:** 4 pruebas fallidas
- Problema: Los mocks de WooCommerce no se están llamando como se espera
- Los tests esperan que se llame a `mockWooCommerceClient.put/get/delete` pero no se están ejecutando

**Errores específicos:**
- ❌ PUT: debe actualizar categoría buscando por woocommerce_id en Strapi
- ❌ PUT: debe buscar por slug (documentId) si no hay woocommerce_id
- ❌ DELETE: debe eliminar categoría buscando por woocommerce_id
- ❌ DELETE: debe buscar por slug (documentId) si no hay woocommerce_id

---

### 5. `src/app/api/tienda/etiquetas/[id]/__tests__/route.integration.test.ts`
**Errores:** 4 pruebas fallidas
- Mismo problema que categorías: mocks de WooCommerce no se ejecutan

**Errores específicos:**
- ❌ PUT: debe actualizar etiqueta buscando por woocommerce_id en Strapi
- ❌ PUT: debe buscar por slug (documentId) si no hay woocommerce_id
- ❌ DELETE: debe eliminar etiqueta buscando por woocommerce_id
- ❌ DELETE: debe buscar por slug (documentId) si no hay woocommerce_id

---

### 6. `src/app/api/tienda/pedidos/__tests__/route.integration.test.ts`
**Errores:** 5 pruebas fallidas
- Problema: Los mocks de Strapi no retornan los datos esperados
- Problema: Validaciones de negocio han cambiado (ahora requiere `numero_pedido`)

**Errores específicos:**
- ❌ GET: debe obtener todas los pedidos desde Strapi (esperado: array con 2 items, recibido: array vacío)
- ❌ GET: debe retornar array vacío si hay error (esperado: 500, recibido: 200)
- ❌ POST: debe crear pedido solo en WooCommerce (esperado: 200, recibido: 400)
- ❌ POST: debe retornar error si faltan line_items (esperado: "al menos un producto", recibido: "El número de pedido es obligatorio")
- ❌ POST: debe propagar error si WooCommerce falla (esperado: 500, recibido: 400)

---

### 7. `src/app/(admin)/(apps)/(ecommerce)/orders/components/__tests__/OrdersList.unit.test.tsx`
**Errores:** 1 prueba fallida
- Problema: Múltiples elementos con el mismo texto "100" (número de pedido y monto)
- Solución: Usar selector más específico o `getAllByText` en lugar de `getByText`

**Error específico:**
- ❌ debe mostrar los montos de los pedidos (encontrados múltiples elementos con texto "100")

---

## ✅ Suites de Pruebas Pasadas (16)

1. ✅ `src/lib/woocommerce/__tests__/address-utils.unit.test.ts`
2. ✅ `src/lib/api/chat/__tests__/validators.unit.test.ts`
3. ✅ `src/lib/api/__tests__/utils.unit.test.ts`
4. ✅ `src/lib/shipit/__tests__/utils.unit.test.ts`
5. ✅ `src/lib/shipit/__tests__/config.unit.test.ts`
6. ✅ `src/lib/shipit/__tests__/communes.unit.test.ts`
7. ✅ `src/lib/openfactura/__tests__/client.unit.test.ts`
8. ✅ `src/lib/api/chat/__tests__/services.unit.test.ts`
9. ✅ `src/app/api/woocommerce/orders/[id]/__tests__/route.integration.test.ts`
10. ✅ `src/app/api/woocommerce/customers/[id]/__tests__/route.integration.test.ts`
11. ✅ `src/app/(admin)/(apps)/(ecommerce)/orders/[orderId]/components/__tests__/ShippingAddress.unit.test.tsx`
12. ✅ `src/app/(admin)/(apps)/(ecommerce)/orders/[orderId]/components/__tests__/ShippingActivity.unit.test.tsx`
13. ✅ `src/app/(admin)/(apps)/(ecommerce)/orders/[orderId]/components/__tests__/OrderSummary.unit.test.tsx`
14. ✅ `src/app/(admin)/(apps)/(ecommerce)/orders/[orderId]/components/__tests__/CustomerDetails.unit.test.tsx`
15. ✅ `src/app/(admin)/(apps)/(ecommerce)/orders/[orderId]/components/__tests__/BillingDetails.unit.test.tsx`
16. ✅ `src/app/(admin)/(apps)/(ecommerce)/add-product/components/__tests__/RelationSelector.unit.test.tsx`

---

## 🔧 Recomendaciones de Corrección

### Prioridad ALTA 🔴

1. **Corregir exportaciones de funciones POST en rutas de API**
   - Verificar que `POST` esté exportado correctamente en:
     - `src/app/api/tienda/categorias/route.ts`
     - `src/app/api/tienda/etiquetas/route.ts`

2. **Agregar mocks de autenticación en tests de chat**
   - Mockear `requireAuth` o agregar cookies de autenticación en:
     - `src/app/api/chat/mensajes/__tests__/route.integration.test.ts`

### Prioridad MEDIA 🟡

3. **Corregir mocks de WooCommerce en tests de integración**
   - Asegurar que los mocks se ejecuten correctamente en:
     - `src/app/api/tienda/categorias/[id]/__tests__/route.integration.test.ts`
     - `src/app/api/tienda/etiquetas/[id]/__tests__/route.integration.test.ts`

4. **Actualizar tests de pedidos según nueva validación**
   - Los tests deben reflejar que ahora se requiere `numero_pedido`:
     - `src/app/api/tienda/pedidos/__tests__/route.integration.test.ts`

### Prioridad BAJA 🟢

5. **Corregir test de componente OrdersList**
   - Usar selector más específico para evitar ambigüedad:
     - `src/app/(admin)/(apps)/(ecommerce)/orders/components/__tests__/OrdersList.unit.test.tsx`

---

## 📈 Estadísticas

- **Tasa de éxito:** 87.3%
- **Pruebas unitarias:** Mayoría pasando ✅
- **Pruebas de integración:** Algunas necesitan corrección de mocks
- **Pruebas de componentes:** 1 fallida por selector ambiguo

---

## 🎯 Conclusión

El proyecto tiene una buena cobertura de pruebas con una tasa de éxito del 87.3%. Los errores principales son:

1. **Problemas de configuración de tests:** Mocks no configurados correctamente
2. **Cambios en la API:** Validaciones que han cambiado y no se reflejan en los tests
3. **Selectores ambiguos:** Tests de componentes que necesitan selectores más específicos

La mayoría de los errores son fáciles de corregir y no indican problemas críticos en el código de producción.

