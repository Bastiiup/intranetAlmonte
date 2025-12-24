# Instrucciones para Corregir el Hook afterUpdate en Strapi

## Problema
El hook `afterUpdate` de Strapi está fallando cuando se actualiza un pedido porque:
1. Intenta sincronizar con WooCommerce incluso cuando solo se actualiza el estado
2. Falla cuando los items no tienen `product_id` válido
3. El error hace que falle toda la transacción de actualización

## Solución

### Paso 1: Ubicar el archivo del hook
El archivo del hook debe estar en una de estas ubicaciones:
- **Strapi v4**: `src/api/wo-pedido/content-types/wo-pedido/lifecycles.js`
- **Strapi v5**: `src/api/wo-pedido/content-types/wo-pedido/lifecycles.ts`

### Paso 2: Reemplazar el contenido
1. Abre el archivo `lifecycles.js` o `lifecycles.ts` en tu proyecto de Strapi
2. Reemplaza el contenido con el código del archivo `strapi-lifecycle-fix.js` o `strapi-lifecycle-fix.ts` (según la versión de Strapi)
3. Guarda el archivo

### Paso 3: Reiniciar Strapi
Reinicia el servidor de Strapi para que los cambios surtan efecto.

## Cambios Implementados

1. **Verificación de solo actualización de estado**: Si solo se actualiza el campo `estado`, el hook omite la sincronización con WooCommerce
2. **Validación de items**: Verifica que los items tengan `product_id` válido antes de intentar sincronizar
3. **Manejo de errores mejorado**: Los errores se registran pero no hacen fallar la transacción
4. **Logs informativos**: Se agregan logs para facilitar el debugging

## Notas Importantes

- El hook ahora **NO falla** la actualización del pedido si hay problemas con la sincronización
- Los errores se registran en los logs pero no interrumpen la operación
- La sincronización solo se ejecuta si:
  - No es solo una actualización de estado
  - El pedido tiene `wooId` válido
  - El `originPlatform` no es "otros"
  - Los items tienen `product_id` válido (si hay items)





