# 🔍 GUÍA DE DEBUGGING - PEDIDOS NO SE SINCRONIZAN CON WOOCOMMERCE

## PROBLEMA
Los cambios que se hacen en la Intranet no se reflejan en WooCommerce.

## PASOS PARA DIAGNOSTICAR

### 1. Verificar que Strapi recibe los datos correctamente

**En la Intranet (consola del navegador F12):**
1. Abre la consola del navegador (F12)
2. Crea o actualiza un pedido
3. Busca estos logs:
   ```
   [API Pedidos POST] 📦 Payload que se envía a Strapi:
   [API Pedidos PUT] 📦 Payload que se envía a Strapi:
   ```
4. Verifica que:
   - ✅ `originPlatform` está presente y es `woo_moraleja` o `woo_escolar` (NO `otros`)
   - ✅ `items` tiene `producto_id` válido (número, no null)
   - ✅ `estado` está en inglés (`pending`, `processing`, etc.)

### 2. Verificar que Strapi guarda los datos correctamente

**En los logs de Railway (Strapi):**
1. Ve a Railway → Tu proyecto Strapi → Logs
2. Busca estos mensajes después de crear/actualizar:
   ```
   [API Pedidos POST] ✅ Pedido creado en Strapi:
   Origin Platform enviado: woo_moraleja
   Origin Platform en Strapi: woo_moraleja
   ```
3. **⚠️ PROBLEMA COMÚN:** Si `Origin Platform en Strapi` es diferente o `null`, los lifecycles NO se ejecutarán.

### 3. Verificar que los lifecycles se ejecutan

**En los logs de Railway (Strapi):**
Busca estos mensajes después de crear/actualizar:
```
[pedido] 🔍 afterCreate ejecutado
[pedido] Pedido ID: 123
[pedido] Número de pedido: 12345
[pedido] Origin Platform: woo_moraleja
[pedido] ✅ Iniciando sincronización a woo_moraleja...
```

**Si NO ves estos mensajes:**
- ❌ Los lifecycles NO se están ejecutando
- Posibles causas:
  1. `originPlatform` no se guardó correctamente en Strapi
  2. El lifecycle no está configurado correctamente
  3. Hay un error en el código del lifecycle que impide su ejecución

### 4. Verificar errores en la sincronización

**En los logs de Railway (Strapi):**
Busca errores después de los mensajes de lifecycle:
```
❌ [pedido.service] Error al crear pedido en WooCommerce
❌ [pedido] Error al sincronizar con WooCommerce
```

**Errores comunes:**
- `Configuración de WooCommerce no encontrada`
  - **Solución:** Verificar variables de entorno en Railway:
    - `WOO_MORALEJA_URL`
    - `WOO_MORALEJA_CONSUMER_KEY`
    - `WOO_MORALEJA_CONSUMER_SECRET`
    - `WOO_ESCOLAR_URL`
    - `WOO_ESCOLAR_CONSUMER_KEY`
    - `WOO_ESCOLAR_CONSUMER_SECRET`

- `401 Unauthorized` o `403 Forbidden`
  - **Solución:** Las credenciales (Consumer Key/Secret) son incorrectas
  - Verificar en WordPress → WooCommerce → Settings → Advanced → REST API

- `Product ID no válido`
  - **Solución:** El `producto_id` en los items no existe en WooCommerce
  - Verificar que los productos existan en WooCommerce antes de crear el pedido

### 5. Verificar directamente en Strapi Admin

1. Ve a Strapi Admin → Content Manager → wo-pedidos
2. Busca el pedido que creaste/actualizaste
3. Verifica:
   - ✅ `originPlatform` está configurado correctamente
   - ✅ `estado` está en inglés
   - ✅ Los `items` tienen `producto_id` válido
4. Edita el pedido manualmente desde Strapi Admin
5. Verifica si se sincroniza con WooCommerce
   - Si SÍ se sincroniza desde Strapi Admin pero NO desde la Intranet:
     - El problema está en cómo la Intranet envía los datos
   - Si NO se sincroniza ni desde Strapi Admin:
     - El problema está en los lifecycles de Strapi

## CHECKLIST DE VERIFICACIÓN

- [ ] `originPlatform` se envía correctamente desde la Intranet
- [ ] `originPlatform` se guarda correctamente en Strapi
- [ ] Los lifecycles (`afterCreate`/`afterUpdate`) se ejecutan
- [ ] No hay errores en los logs de Strapi
- [ ] Las variables de entorno de WooCommerce están configuradas
- [ ] Las credenciales de WooCommerce son correctas
- [ ] Los `producto_id` en los items existen en WooCommerce
- [ ] El pedido aparece en WooCommerce después de crear desde Strapi Admin

## SOLUCIONES COMUNES

### Problema: `originPlatform` no se guarda en Strapi

**Causa:** El campo puede estar en un lugar diferente del schema.

**Solución:** Verificar en Strapi Admin si el campo existe y cómo se llama exactamente.

### Problema: Los lifecycles no se ejecutan

**Causa:** El lifecycle puede tener una condición que impide su ejecución.

**Solución:** Revisar el código del lifecycle en Strapi y verificar las condiciones.

### Problema: Error 401/403 en WooCommerce

**Causa:** Credenciales incorrectas o expiradas.

**Solución:** 
1. Ir a WordPress → WooCommerce → Settings → Advanced → REST API
2. Crear nuevas credenciales
3. Actualizar en Railway las variables de entorno

### Problema: Product ID no válido

**Causa:** El `producto_id` no existe en WooCommerce.

**Solución:** 
1. Verificar que el producto exista en WooCommerce
2. Usar el ID correcto del producto
3. O crear el producto primero en WooCommerce

## INFORMACIÓN PARA COMPARTIR CON STRAPI

Si después de seguir estos pasos el problema persiste, comparte con el encargado de Strapi:

1. **Logs de la Intranet (consola del navegador):**
   - El payload completo que se envía a Strapi
   - La respuesta de Strapi

2. **Logs de Strapi (Railway):**
   - Los mensajes de lifecycle (`afterCreate`/`afterUpdate`)
   - Cualquier error relacionado con WooCommerce
   - El valor de `originPlatform` que se guarda en Strapi

3. **Datos del pedido:**
   - `documentId` del pedido
   - `originPlatform` enviado vs guardado
   - `estado` enviado vs guardado
   - `items` con sus `producto_id`

4. **Resultado esperado vs real:**
   - Qué debería pasar: El pedido debería aparecer/actualizarse en WooCommerce
   - Qué pasa realmente: El pedido no aparece/no se actualiza en WooCommerce




