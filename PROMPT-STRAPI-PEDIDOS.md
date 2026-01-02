# PROMPT PARA LA IA DE STRAPI - PROBLEMA CON PEDIDOS

## CONTEXTO DEL PROBLEMA

**Situación actual:**
- ❌ Los pedidos creados/actualizados desde la Intranet NO se vinculan correctamente con Strapi
- ❌ Los cambios en pedidos NO se reflejan en WooCommerce
- ✅ La sincronización desde WooCommerce → Strapi funciona correctamente (usando `/api/tienda/pedidos/sync`)

**Conclusión:** El problema está en cómo Strapi maneja las actualizaciones desde la Intranet y cómo sincroniza con WooCommerce.

---

## FLUJO ACTUAL DE LA INTRANET

### 1. CREACIÓN DE PEDIDOS (POST `/api/tienda/pedidos`)

La Intranet envía a Strapi el siguiente payload:

```json
{
  "data": {
    "numero_pedido": "12345",
    "fecha_pedido": "2025-12-27T10:00:00.000Z",
    "estado": "pending",  // ✅ Ya en inglés (mapeado desde español)
    "total": 50000,
    "subtotal": 45000,
    "impuestos": 5000,
    "envio": 0,
    "descuento": 0,
    "moneda": "CLP",
    "origen": "web",  // ✅ Normalizado a valores válidos: web, checkout, rest-api, admin, mobile, directo, otro
    "cliente": "documentId_del_cliente",  // ⚠️ Puede ser documentId o relación
    "items": [
      {
        "item_id": 1,
        "producto_id": 123,  // ⚠️ ID del producto en WooCommerce
        "sku": "LIBRO-001",
        "nombre": "Nombre del libro",
        "cantidad": 2,
        "precio_unitario": 15000,
        "total": 30000,
        "metadata": {}
      }
    ],
    "billing": {
      "first_name": "Juan",
      "last_name": "Pérez",
      "email": "juan@example.com",
      "phone": "+56912345678",
      "address_1": "Calle 123",
      "city": "Santiago",
      "state": "RM",
      "postcode": "1234567",
      "country": "CL"
    },
    "shipping": {
      "first_name": "Juan",
      "last_name": "Pérez",
      "address_1": "Calle 123",
      "city": "Santiago",
      "state": "RM",
      "postcode": "1234567",
      "country": "CL"
    },
    "metodo_pago": "stripe",  // ✅ Normalizado: bacs, cheque, cod, paypal, stripe, transferencia, otro
    "metodo_pago_titulo": "Tarjeta de crédito",
    "nota_cliente": "Entregar en la mañana",
    "originPlatform": "woo_moraleja"  // ✅ Enumeration: woo_moraleja, woo_escolar, otros
  }
}
```

**Después de crear en Strapi, la Intranet:**
1. Obtiene el `documentId` del pedido creado
2. Crea el pedido en WooCommerce (si `originPlatform !== 'otros'`)
3. Actualiza Strapi con `wooId` y `externalIds`:

```json
{
  "data": {
    "numero_pedido": "12345",  // Actualizado con el número de WooCommerce si es diferente
    "wooId": 12345,  // ⚠️ ID del pedido en WooCommerce
    "externalIds": {
      "wooCommerce": {
        "id": 12345,
        "number": "12345",
        "data": { /* datos completos del pedido de WooCommerce */ }
      },
      "originPlatform": "woo_moraleja"
    }
  }
}
```

---

### 2. ACTUALIZACIÓN DE PEDIDOS (PUT `/api/tienda/pedidos/[id]`)

**Cuando se actualiza solo el estado desde el frontend:**

```json
{
  "data": {
    "estado": "pendiente"  // ⚠️ En español: pendiente, procesando, en_espera, completado, cancelado, reembolsado, fallido
  }
}
```

**La API de la Intranet:**
1. Mapea el estado de español a inglés: `pendiente` → `pending`
2. Actualiza en WooCommerce primero (si `wooId` es válido y `originPlatform !== 'otros'`)
3. Actualiza en Strapi con el estado en inglés

**Cuando se actualizan otros campos:**

```json
{
  "data": {
    "estado": "pendiente",  // Mapeado a "pending"
    "items": [...],  // ⚠️ Solo se envía si NO es solo actualización de estado
    "billing": {...},
    "shipping": {...},
    "metodo_pago": "stripe",  // Normalizado
    "origen": "web"  // Normalizado
  }
}
```

---

## PROBLEMAS IDENTIFICADOS

### PROBLEMA 1: Relaciones no se vinculan correctamente

**Síntoma:** Los pedidos se crean en Strapi pero las relaciones (cliente, items) no se vinculan.

**Preguntas para Strapi:**
1. ¿Cómo debe enviarse la relación `cliente`?
   - ¿Como `documentId`? (ej: `"cliente": "docId123"`)
   - ¿Como objeto con `connect`? (ej: `"cliente": { "connect": [{ "id": "docId123" }] }`)
   - ¿Como ID numérico? (ej: `"cliente": 123`)

2. ¿Cómo debe enviarse la relación `items`?
   - ¿Como array de objetos con `connect`?
   - ¿Como array de `documentId`s?
   - ¿Los items son una relación o un campo JSON?

3. ¿Qué estructura exacta espera Strapi para estas relaciones?

---

### PROBLEMA 2: Cambios no se reflejan en WooCommerce

**Síntoma:** Cuando se actualiza un pedido desde la Intranet, el cambio se guarda en Strapi pero NO se sincroniza con WooCommerce.

**Preguntas para Strapi:**
1. ¿Existe un hook `afterUpdate` en el modelo `wo-pedidos` que sincroniza con WooCommerce?
   - Si existe, ¿por qué no se ejecuta cuando se actualiza desde la API REST?
   - ¿Hay alguna condición que impide la sincronización?

2. ¿El hook se ejecuta solo cuando se actualiza desde Strapi Admin?
   - Si es así, ¿cómo hacer que también se ejecute desde la API REST?

3. ¿Qué campos debe tener el pedido para que se sincronice con WooCommerce?
   - ¿Es necesario que tenga `wooId`?
   - ¿Es necesario que tenga `originPlatform`?
   - ¿Hay algún campo que indique que debe sincronizarse?

4. ¿Hay algún log o error que indique por qué no se sincroniza?

---

### PROBLEMA 3: Estructura de datos en Strapi

**Preguntas sobre el schema:**

1. **Campo `estado`:**
   - ¿Qué valores acepta? (¿pending, processing, on-hold, completed, cancelled, refunded, failed, auto-draft, checkout-draft?)
   - ¿Es un Enumeration o un String?

2. **Campo `origen`:**
   - ¿Qué valores acepta? (¿web, checkout, rest-api, admin, mobile, directo, otro?)
   - ¿Es un Enumeration o un String?

3. **Campo `metodo_pago`:**
   - ¿Qué valores acepta? (¿bacs, cheque, cod, paypal, stripe, transferencia, otro?)
   - ¿Es un Enumeration o un String?

4. **Campo `originPlatform`:**
   - ¿Es un Enumeration con valores: woo_moraleja, woo_escolar, otros?
   - ¿Dónde se guarda exactamente? (¿en el objeto raíz o en `externalIds`?)

5. **Campos `wooId` y `rawWooData`:**
   - ¿Existen estos campos en el schema?
   - ¿O solo existen en `externalIds.wooCommerce`?

6. **Relación `cliente`:**
   - ¿Es una relación con el modelo `wo-clientes`?
   - ¿Qué tipo de relación es? (¿oneToOne, manyToOne, manyToMany?)

7. **Relación `items`:**
   - ¿Es una relación o un campo JSON?
   - Si es relación, ¿con qué modelo se relaciona?

---

## INFORMACIÓN ADICIONAL

### Endpoints de Strapi que usa la Intranet:

1. **GET `/api/wo-pedidos`** - Obtener todos los pedidos
2. **GET `/api/wo-pedidos/:documentId`** - Obtener un pedido específico
3. **POST `/api/wo-pedidos`** - Crear un pedido
4. **PUT `/api/wo-pedidos/:documentId`** - Actualizar un pedido
5. **DELETE `/api/wo-pedidos/:documentId`** - Eliminar un pedido

### Logs de la Intranet:

La Intranet registra logs detallados. Si necesitas ver qué se está enviando exactamente, puedes pedirle al usuario que:
1. Abra la consola del navegador (F12)
2. Busque logs que empiecen con `[API Pedidos POST]` o `[API Pedidos PUT]`
3. Comparta esos logs contigo

---

## TAREAS PARA STRAPI

1. **Verificar el schema del modelo `wo-pedidos`:**
   - Confirmar todos los campos y sus tipos
   - Confirmar todas las relaciones y cómo se deben enviar
   - Confirmar los valores válidos para Enumerations

2. **Verificar los hooks (lifecycles):**
   - ¿Existe `afterCreate` que sincroniza con WooCommerce?
   - ¿Existe `afterUpdate` que sincroniza con WooCommerce?
   - ¿Por qué no se ejecutan cuando se actualiza desde la API REST?

3. **Probar la creación/actualización desde la API REST:**
   - Crear un pedido usando POST `/api/wo-pedidos` con el payload que envía la Intranet
   - Verificar si se sincroniza con WooCommerce
   - Actualizar un pedido usando PUT `/api/wo-pedidos/:documentId`
   - Verificar si se sincroniza con WooCommerce

4. **Revisar logs de Strapi:**
   - Buscar errores relacionados con pedidos
   - Buscar logs de sincronización con WooCommerce

5. **Documentar:**
   - La estructura exacta que debe tener el payload para crear/actualizar pedidos
   - Cómo se deben enviar las relaciones
   - Qué condiciones deben cumplirse para que se sincronice con WooCommerce

---

## PREGUNTAS ESPECÍFICAS

Por favor, responde estas preguntas:

1. **¿Cómo debo enviar la relación `cliente` en el payload?**
   ```json
   // Opción A:
   "cliente": "documentId_del_cliente"
   
   // Opción B:
   "cliente": { "connect": [{ "id": "documentId_del_cliente" }] }
   
   // Opción C:
   "cliente": 123  // ID numérico
   ```

2. **¿Cómo debo enviar la relación `items` en el payload?**
   ```json
   // Opción A: Array de objetos
   "items": [{ "item_id": 1, "producto_id": 123, ... }]
   
   // Opción B: Array con connect
   "items": { "connect": [{ "id": "docId1" }, { "id": "docId2" }] }
   ```

3. **¿Existe un hook `afterUpdate` que sincroniza con WooCommerce?**
   - Si existe, ¿por qué no se ejecuta cuando se actualiza desde la API REST?
   - ¿Hay alguna forma de forzar su ejecución?

4. **¿Qué campos son obligatorios para que un pedido se sincronice con WooCommerce?**
   - ¿`wooId`?
   - ¿`originPlatform`?
   - ¿Algún otro campo?

5. **¿Puedes compartir el schema completo del modelo `wo-pedidos`?**
   - Incluyendo todos los campos, tipos, relaciones y validaciones

---

## RESULTADO ESPERADO

Después de resolver estos problemas, debería funcionar:

1. ✅ Crear pedidos desde la Intranet → Se crea en Strapi → Se sincroniza con WooCommerce
2. ✅ Actualizar pedidos desde la Intranet → Se actualiza en Strapi → Se sincroniza con WooCommerce
3. ✅ Las relaciones (cliente, items) se vinculan correctamente
4. ✅ Los cambios se reflejan en WooCommerce automáticamente

---

**Gracias por tu ayuda! 🙏**




