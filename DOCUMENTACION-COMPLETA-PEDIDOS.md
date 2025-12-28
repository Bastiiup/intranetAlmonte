# 📚 DOCUMENTACIÓN COMPLETA - SISTEMA DE PEDIDOS

## ✅ 1. CONTENT TYPE DE STRAPI

**Content Type:** `api::pedido.pedido`  
**Endpoint REST:** `/api/wo-pedidos`

### Nota Importante:
- El Content Type interno de Strapi es `api::pedido.pedido`
- El endpoint REST que usa la Intranet es `/api/wo-pedidos` (basado en el nombre del Content Type)
- Ambos se refieren al mismo modelo de datos

---

## ✅ 2. LISTAR PEDIDOS (GET)

### Endpoint
```
GET /api/tienda/pedidos
```

### Parámetros de Query
- `includeHidden` (opcional): `true` para incluir pedidos ocultos (drafts)

### Implementación Actual
```typescript
// frontend-ubold/src/app/api/tienda/pedidos/route.ts

// Con filtros y populate optimizado
GET /api/wo-pedidos?populate[cliente][fields][0]=nombre&populate[items][fields][0]=nombre&populate[items][fields][1]=cantidad&populate[items][fields][2]=precio_unitario&pagination[pageSize]=5000&publicationState=live
```

### Características
- ✅ **Filtros:** Soporta filtros por `documentId`, `numero_pedido`, `wooId`
- ✅ **Populate:** Popula relaciones `cliente` e `items` con campos específicos (optimizado)
- ✅ **Paginación:** Soporta paginación con `pagination[pageSize]`
- ✅ **Publication State:** Soporta `live` (publicados) y `preview` (incluye drafts)

### Ejemplo de Respuesta
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "documentId": "abc123",
      "attributes": {
        "numero_pedido": "12345",
        "estado": "pending",
        "total": 50000,
        "originPlatform": "woo_moraleja",
        "cliente": {
          "data": {
            "id": 1,
            "attributes": {
              "nombre": "Juan Pérez"
            }
          }
        },
        "items": [
          {
            "nombre": "Libro 1",
            "cantidad": 2,
            "precio_unitario": 15000
          }
        ]
      }
    }
  ]
}
```

---

## ✅ 3. CREAR PEDIDOS (POST)

### Endpoint
```
POST /api/tienda/pedidos
```

### Estructura del Payload

```json
{
  "data": {
    "numero_pedido": "12345",                    // ✅ REQUERIDO
    "fecha_pedido": "2025-12-27T10:00:00.000Z", // Opcional (default: ahora)
    "estado": "pending",                         // Opcional (default: "pending")
    "total": 50000,                              // Opcional
    "subtotal": 45000,                           // Opcional
    "impuestos": 5000,                           // Opcional
    "envio": 0,                                  // Opcional
    "descuento": 0,                              // Opcional
    "moneda": "CLP",                             // Opcional (default: "CLP")
    "origen": "web",                             // Opcional (normalizado)
    "cliente": "documentId_del_cliente",         // Opcional
    "items": [                                   // Opcional
      {
        "item_id": 1,
        "producto_id": 123,
        "sku": "LIBRO-001",
        "nombre": "Nombre del libro",
        "cantidad": 2,
        "precio_unitario": 15000,
        "total": 30000,
        "metadata": {}
      }
    ],
    "billing": {                                 // Opcional
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
    "shipping": {                                // Opcional
      "first_name": "Juan",
      "last_name": "Pérez",
      "address_1": "Calle 123",
      "city": "Santiago",
      "state": "RM",
      "postcode": "1234567",
      "country": "CL"
    },
    "metodo_pago": "stripe",                     // Opcional (normalizado)
    "metodo_pago_titulo": "Tarjeta de crédito", // Opcional
    "nota_cliente": "Entregar en la mañana",    // Opcional
    "originPlatform": "woo_moraleja"             // ✅ REQUERIDO (woo_moraleja, woo_escolar, otros)
  }
}
```

### Validaciones
- ✅ `numero_pedido` es obligatorio
- ✅ `originPlatform` debe ser uno de: `woo_moraleja`, `woo_escolar`, `otros`
- ✅ `estado` se mapea automáticamente de español a inglés si es necesario
- ✅ `origen` se normaliza a valores válidos
- ✅ `metodo_pago` se normaliza a valores válidos

### Flujo de Creación
1. **Validar campos obligatorios** (`numero_pedido`, `originPlatform`)
2. **Preparar items** (validar estructura)
3. **Normalizar valores** (estado, origen, metodo_pago)
4. **Crear en Strapi** mediante `POST /api/wo-pedidos`
5. **Strapi ejecuta lifecycle `afterCreate`** que sincroniza con WooCommerce automáticamente
6. **Retornar respuesta** con el pedido creado

### Ejemplo de Respuesta
```json
{
  "success": true,
  "data": {
    "strapi": {
      "id": 1,
      "documentId": "abc123",
      "attributes": {
        "numero_pedido": "12345",
        "estado": "pending",
        "originPlatform": "woo_moraleja"
      }
    }
  },
  "message": "Pedido creado exitosamente en Strapi. Strapi sincronizará automáticamente con WooCommerce (woo_moraleja) mediante el lifecycle afterCreate."
}
```

---

## ✅ 4. ACTUALIZAR PEDIDOS (PUT)

### Endpoint
```
PUT /api/tienda/pedidos/[id]
```

### Parámetros
- `id`: Puede ser `documentId`, `numero_pedido`, o `wooId`

### Estructura del Payload

```json
{
  "data": {
    "estado": "processing",        // Opcional (se mapea de español a inglés)
    "numero_pedido": "12345",       // Opcional
    "total": 50000,                  // Opcional
    "items": [...],                  // Opcional (solo si NO es solo actualización de estado)
    "billing": {...},                // Opcional
    "shipping": {...},               // Opcional
    "metodo_pago": "stripe",         // Opcional (normalizado)
    "originPlatform": "woo_moraleja" // Opcional
  }
}
```

### Características Especiales
- ✅ **Actualización parcial:** Solo se actualizan los campos enviados
- ✅ **Mapeo de estado:** El estado se mapea automáticamente de español a inglés
- ✅ **Normalización:** `origen` y `metodo_pago` se normalizan automáticamente
- ✅ **Corrección automática:** Si solo se actualiza el estado, se corrigen valores inválidos en otros campos
- ✅ **Items condicionales:** Si solo se actualiza el estado, NO se envían items para evitar errores en el hook `afterUpdate` de Strapi

### Flujo de Actualización
1. **Obtener pedido existente** de Strapi para obtener `documentId`, `wooId`, `originPlatform`
2. **Validar `originPlatform`** si se proporciona
3. **Preparar datos** (mapear estado, normalizar valores)
4. **Corregir valores inválidos** si solo se actualiza el estado
5. **Actualizar en Strapi** mediante `PUT /api/wo-pedidos/{documentId}`
6. **Strapi ejecuta lifecycle `afterUpdate`** que sincroniza con WooCommerce automáticamente
7. **Retornar respuesta** con el pedido actualizado

### Ejemplo de Respuesta
```json
{
  "success": true,
  "data": {
    "strapi": {
      "id": 1,
      "documentId": "abc123",
      "attributes": {
        "numero_pedido": "12345",
        "estado": "processing",
        "originPlatform": "woo_moraleja"
      }
    }
  },
  "message": "Pedido actualizado exitosamente en Strapi. Strapi sincronizará automáticamente con WooCommerce (woo_moraleja) mediante el lifecycle afterUpdate."
}
```

---

## ✅ 5. ELIMINAR PEDIDOS (DELETE)

### Endpoint
```
DELETE /api/tienda/pedidos/[id]
```

### Parámetros
- `id`: Puede ser `documentId`, `numero_pedido`, o `wooId`

### Flujo de Eliminación
1. **Obtener pedido existente** de Strapi para obtener `documentId`, `wooId`, `originPlatform`
2. **Eliminar en WooCommerce** (si `wooId` existe y `originPlatform !== 'otros'`)
3. **Eliminar en Strapi** mediante `DELETE /api/wo-pedidos/{documentId}`
4. **Retornar respuesta** de éxito

### Ejemplo de Respuesta
```json
{
  "success": true,
  "message": "Pedido eliminado exitosamente en WooCommerce y Strapi",
  "data": {
    "deleted": true
  }
}
```

---

## ✅ 6. ESTRUCTURA DE DATOS

### Campos del Modelo `wo-pedidos`

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `numero_pedido` | String | ✅ Sí | Número único del pedido |
| `fecha_pedido` | DateTime | ❌ No | Fecha de creación del pedido |
| `estado` | Enumeration | ❌ No | Estado del pedido (ver sección 6) |
| `total` | Decimal | ❌ No | Total del pedido |
| `subtotal` | Decimal | ❌ No | Subtotal del pedido |
| `impuestos` | Decimal | ❌ No | Impuestos del pedido |
| `envio` | Decimal | ❌ No | Costo de envío |
| `descuento` | Decimal | ❌ No | Descuento aplicado |
| `moneda` | String | ❌ No | Código de moneda (default: "CLP") |
| `origen` | Enumeration | ❌ No | Origen del pedido (ver sección 6) |
| `cliente` | Relation | ❌ No | Relación con `wo-clientes` |
| `items` | JSON | ❌ No | Array de items del pedido |
| `billing` | JSON | ❌ No | Información de facturación |
| `shipping` | JSON | ❌ No | Información de envío |
| `metodo_pago` | Enumeration | ❌ No | Método de pago (ver sección 6) |
| `metodo_pago_titulo` | String | ❌ No | Título del método de pago |
| `nota_cliente` | Text | ❌ No | Nota del cliente |
| `originPlatform` | Enumeration | ✅ Sí | Plataforma de origen (ver sección 7) |
| `wooId` | Integer | ❌ No | ID del pedido en WooCommerce |
| `externalIds` | JSON | ❌ No | IDs externos y metadata |

### Relaciones

#### Cliente
- **Tipo:** `manyToOne` o `oneToOne` con `wo-clientes`
- **Cómo enviar:** Como `documentId` string o relación con `connect`

#### Items
- **Tipo:** Campo JSON (no es relación)
- **Estructura:**
```json
[
  {
    "item_id": 1,
    "producto_id": 123,
    "sku": "LIBRO-001",
    "nombre": "Nombre del libro",
    "cantidad": 2,
    "precio_unitario": 15000,
    "total": 30000,
    "metadata": {}
  }
]
```

---

## ✅ 7. ESTADOS VÁLIDOS

### Estados Aceptados por Strapi (en inglés)
- `auto-draft`
- `pending`
- `processing`
- `on-hold`
- `completed`
- `cancelled`
- `refunded`
- `failed`
- `checkout-draft`

### Mapeo de Estados (Español → Inglés)

| Español (Frontend) | Inglés (Strapi/WooCommerce) |
|-------------------|----------------------------|
| `pendiente` | `pending` |
| `procesando` | `processing` |
| `en_espera` / `en espera` | `on-hold` |
| `completado` | `completed` |
| `cancelado` | `cancelled` |
| `reembolsado` | `refunded` |
| `fallido` | `failed` |

### Función de Mapeo
```typescript
// frontend-ubold/src/app/api/tienda/pedidos/route.ts
function mapWooStatus(strapiStatus: string): string {
  // Mapea automáticamente de español a inglés
  // Si ya está en inglés válido, lo devuelve tal cual
}
```

---

## ✅ 8. PLATAFORMAS VÁLIDAS

### Valores Aceptados
- `woo_moraleja` - WooCommerce Moraleja
- `woo_escolar` - WooCommerce Escolar
- `otros` - Otros orígenes (NO se sincroniza con WooCommerce)

### Validación
```typescript
const validPlatforms = ['woo_moraleja', 'woo_escolar', 'otros']
if (!validPlatforms.includes(originPlatform)) {
  return error
}
```

### Comportamiento por Plataforma
- **`woo_moraleja` / `woo_escolar`:** Strapi sincroniza automáticamente con WooCommerce mediante lifecycles
- **`otros`:** NO se sincroniza con WooCommerce

---

## ✅ 9. FLUJO RECOMENDADO

### Crear un Pedido

```
1. Frontend → POST /api/tienda/pedidos
   └─ Payload: { data: { numero_pedido, originPlatform, ... } }

2. Intranet API → Validar campos obligatorios
   └─ Validar: numero_pedido, originPlatform

3. Intranet API → Normalizar valores
   └─ Mapear estado (español → inglés)
   └─ Normalizar origen, metodo_pago

4. Intranet API → POST /api/wo-pedidos (Strapi)
   └─ Crear pedido en Strapi

5. Strapi → Ejecutar lifecycle afterCreate
   └─ Si originPlatform !== 'otros':
      └─ Sincronizar con WooCommerce automáticamente
      └─ Actualizar wooId y externalIds en Strapi

6. Intranet API → Retornar respuesta
   └─ { success: true, data: { strapi: {...} } }
```

### Actualizar un Pedido

```
1. Frontend → PUT /api/tienda/pedidos/[id]
   └─ Payload: { data: { estado: "procesando", ... } }

2. Intranet API → Obtener pedido existente
   └─ GET /api/wo-pedidos/{documentId}
   └─ Extraer: documentId, wooId, originPlatform

3. Intranet API → Preparar datos
   └─ Mapear estado (español → inglés)
   └─ Normalizar valores
   └─ Corregir valores inválidos si solo se actualiza estado

4. Intranet API → PUT /api/wo-pedidos/{documentId} (Strapi)
   └─ Actualizar pedido en Strapi

5. Strapi → Ejecutar lifecycle afterUpdate
   └─ Si originPlatform !== 'otros' y wooId existe:
      └─ Actualizar pedido en WooCommerce automáticamente

6. Intranet API → Retornar respuesta
   └─ { success: true, data: { strapi: {...} } }
```

### Eliminar un Pedido

```
1. Frontend → DELETE /api/tienda/pedidos/[id]

2. Intranet API → Obtener pedido existente
   └─ GET /api/wo-pedidos/{documentId}
   └─ Extraer: documentId, wooId, originPlatform

3. Intranet API → Eliminar en WooCommerce (si aplica)
   └─ DELETE /wp-json/wc/v3/orders/{wooId}
   └─ Solo si wooId existe y originPlatform !== 'otros'

4. Intranet API → DELETE /api/wo-pedidos/{documentId} (Strapi)
   └─ Eliminar pedido en Strapi

5. Intranet API → Retornar respuesta
   └─ { success: true, message: "Pedido eliminado..." }
```

---

## ✅ 10. MANEJO DE ERRORES

### Errores Comunes y Soluciones

#### Error 400: Bad Request
**Causa:** Campos inválidos o faltantes
```json
{
  "success": false,
  "error": "El número de pedido es obligatorio"
}
```

#### Error 404: Not Found
**Causa:** Pedido no encontrado
```json
{
  "success": false,
  "error": "Pedido no encontrado"
}
```

#### Error 500: Internal Server Error
**Causa:** Error en Strapi o WooCommerce
```json
{
  "success": false,
  "error": "Error al crear el pedido",
  "details": { ... }
}
```

### Logging Detallado

La Intranet registra logs detallados para debugging:

```typescript
// Logs de creación
console.log('[API Pedidos POST] 📦 Payload que se envía a Strapi:')
console.log('[API Pedidos POST] ✅ Pedido creado en Strapi:')
console.log('[API Pedidos POST] Origin Platform enviado:', originPlatform)
console.log('[API Pedidos POST] Origin Platform en Strapi:', originPlatformEnStrapi)

// Logs de actualización
console.log('[API Pedidos PUT] 📦 Payload que se envía a Strapi:')
console.log('[API Pedidos PUT] ✅ Pedido actualizado en Strapi:')
console.log('[API Pedidos PUT] Estado actualizado:', estado)

// Logs de errores
console.error('[API Pedidos POST] ❌ ERROR al crear en Strapi:')
console.error('[API Pedidos PUT] ❌ ERROR al actualizar en Strapi:')
```

---

## ✅ 11. BUENAS PRÁCTICAS

### ✅ Implementadas

1. **Validación de Campos Obligatorios**
   - ✅ `numero_pedido` es obligatorio
   - ✅ `originPlatform` es obligatorio y validado

2. **Normalización de Valores**
   - ✅ Estados se mapean automáticamente (español → inglés)
   - ✅ `origen` se normaliza a valores válidos
   - ✅ `metodo_pago` se normaliza a valores válidos

3. **Manejo de Relaciones**
   - ✅ `cliente` se envía como `documentId` o relación
   - ✅ `items` se envía como array JSON (no relación)

4. **Sincronización Automática**
   - ✅ Strapi maneja la sincronización con WooCommerce mediante lifecycles
   - ✅ La Intranet NO actualiza directamente en WooCommerce (excepto DELETE)

5. **Logging Detallado**
   - ✅ Logs de payloads enviados a Strapi
   - ✅ Logs de respuestas de Strapi
   - ✅ Logs de errores con detalles

6. **Manejo de Errores**
   - ✅ Errores se capturan y se retornan con mensajes claros
   - ✅ Errores de Strapi se propagan con detalles

7. **Optimización de Queries**
   - ✅ Populate selectivo (solo campos necesarios)
   - ✅ Paginación para listas grandes
   - ✅ Filtros eficientes

8. **Actualización Parcial**
   - ✅ Solo se actualizan los campos enviados
   - ✅ No se sobrescriben campos no enviados

9. **Corrección Automática**
   - ✅ Si solo se actualiza el estado, se corrigen valores inválidos en otros campos
   - ✅ Evita errores de validación en Strapi

10. **Documentación**
    - ✅ Código comentado
    - ✅ Logs descriptivos
    - ✅ Manejo de casos edge

---

## 🔍 VERIFICACIÓN Y TESTING

### Checklist de Verificación

- [x] ✅ Content Type correcto: `/api/wo-pedidos`
- [x] ✅ Listar pedidos con filtros, populate, paginación
- [x] ✅ Crear pedidos con estructura completa + `originPlatform`
- [x] ✅ Actualizar pedidos (parcial y completo)
- [x] ✅ Eliminar pedidos (con sincronización WooCommerce)
- [x] ✅ Estructura de datos correcta (campos, tipos, relaciones)
- [x] ✅ Estados válidos (mapeo español → inglés)
- [x] ✅ Plataformas válidas (woo_moraleja, woo_escolar, otros)
- [x] ✅ Flujo recomendado implementado
- [x] ✅ Manejo de errores completo
- [x] ✅ Buenas prácticas implementadas

---

## 📝 NOTAS IMPORTANTES

1. **Sincronización Automática:** Strapi se encarga de sincronizar con WooCommerce mediante lifecycles (`afterCreate`, `afterUpdate`). La Intranet NO debe actualizar directamente en WooCommerce (excepto DELETE).

2. **Origin Platform:** Es CRÍTICO que `originPlatform` se guarde correctamente en Strapi. Si no se guarda o es `null`, los lifecycles NO se ejecutarán.

3. **Estados:** Los estados deben estar en inglés para Strapi. La Intranet mapea automáticamente de español a inglés.

4. **Items:** Los items NO son una relación, son un campo JSON. Se envían como array de objetos.

5. **Cliente:** La relación con cliente puede enviarse como `documentId` string o como relación con `connect`.

---

## 🚀 PRÓXIMOS PASOS

Si hay problemas con la sincronización:

1. **Verificar logs de Strapi** (Railway - Proyecto Strapi):
   - Buscar: `[pedido] 🔍 afterCreate ejecutado`
   - Buscar: `[pedido] 🔍 afterUpdate ejecutado`
   - Buscar errores relacionados con WooCommerce

2. **Verificar logs de Intranet** (Railway - Proyecto Intranet):
   - Buscar: `[API Pedidos POST]` o `[API Pedidos PUT]`
   - Verificar: `Origin Platform enviado` vs `Origin Platform en Strapi`

3. **Verificar en Strapi Admin:**
   - ¿El pedido se crea/actualiza correctamente?
   - ¿El campo `originPlatform` tiene el valor correcto?
   - ¿Existe `wooId` después de la sincronización?

---

**Última actualización:** 2025-01-27  
**Versión:** 1.0.0

