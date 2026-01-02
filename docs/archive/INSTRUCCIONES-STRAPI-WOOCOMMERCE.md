# Instrucciones para Cursor - Proyecto Strapi

## Objetivo
Configurar Strapi para sincronizar productos y pedidos con WooCommerce, guardando el `woocommerce_id` para hacer match entre ambos sistemas.

---

## 1. AGREGAR CAMPO `woocommerce_id` AL ESQUEMA DE PRODUCTOS (`libros`)

### Instrucción para Cursor:
```
Agrega un campo llamado "woocommerce_id" de tipo Text (string) al Content Type "libros" en Strapi. 
Este campo debe ser opcional y se usará para guardar el ID del producto en WooCommerce.
```

### Pasos específicos:
1. Ir a Content-Type Builder en Strapi
2. Seleccionar el Content Type `libros`
3. Agregar nuevo campo:
   - **Nombre**: `woocommerce_id`
   - **Tipo**: Text
   - **Configuración**: Opcional (no requerido)
   - **Validación**: Puede ser string o número (WooCommerce devuelve números pero los guardaremos como string)

---

## 2. CREAR O ACTUALIZAR ENDPOINT PARA RECIBIR PRODUCTOS DESDE NEXT.JS

### Instrucción para Cursor:
```
Crea o actualiza el endpoint POST /api/libros en Strapi para que:
1. Reciba datos del producto desde Next.js (incluyendo woocommerce_id)
2. Guarde el woocommerce_id cuando se cree o actualice un producto
3. Si el producto ya existe (por ISBN o woocommerce_id), actualizarlo en lugar de crear uno nuevo
```

### Estructura de datos que recibirá:
```json
{
  "data": {
    "nombre_libro": "Nombre del libro",
    "isbn_libro": "978-3-16-148410-0",
    "descripcion": "Descripción...",
    "subtitulo_libro": "Subtítulo",
    "woocommerce_id": "123",  // ID del producto en WooCommerce
    "portada_libro": 456,  // ID de imagen en Strapi
    // ... otros campos de relaciones
  }
}
```

### Lógica requerida:
- Si viene `woocommerce_id`, buscar si ya existe un producto con ese `woocommerce_id`
- Si existe, actualizar ese producto
- Si no existe, crear uno nuevo
- Siempre guardar el `woocommerce_id` recibido

---

## 3. CREAR CONTENT TYPE PARA PEDIDOS (`pedidos` o `wo-pedidos`)

### Instrucción para Cursor:
```
Crea un Content Type llamado "pedidos" (o "wo-pedidos") en Strapi con los siguientes campos:

Campos básicos:
- woocommerce_id (Text) - ID del pedido en WooCommerce
- numero_pedido (Text) - Número del pedido
- estado (Enumeration) - Estado del pedido (pending, processing, completed, cancelled, etc.)
- fecha_creacion (DateTime) - Fecha de creación
- fecha_modificacion (DateTime) - Fecha de última modificación
- total (Number, Decimal) - Total del pedido
- moneda (Text) - Moneda (ej: "CLP")
- metodo_pago (Text) - Método de pago
- metodo_envio (Text) - Método de envío

Relaciones:
- productos (Relation, Many-to-Many) - Relación con productos (libros) usando woocommerce_id
- cliente (Relation, Many-to-One) - Relación con cliente (si existe Content Type de clientes)

Campos de dirección (Billing):
- billing_nombre (Text)
- billing_apellido (Text)
- billing_email (Email)
- billing_telefono (Text)
- billing_direccion (Text)
- billing_ciudad (Text)
- billing_comuna (Text)
- billing_codigo_postal (Text)
- billing_pais (Text)

Campos de dirección (Shipping):
- shipping_nombre (Text)
- shipping_apellido (Text)
- shipping_direccion (Text)
- shipping_ciudad (Text)
- shipping_comuna (Text)
- shipping_codigo_postal (Text)
- shipping_pais (Text)

Campos adicionales:
- notas_cliente (Text, Long text) - Notas del cliente
- notas_privadas (Text, Long text) - Notas privadas del administrador
```

---

## 4. CREAR ENDPOINT PARA RECIBIR PEDIDOS DESDE WOOCOMMERCE

### Instrucción para Cursor:
```
Crea un endpoint POST /api/pedidos (o /api/wo-pedidos) en Strapi que:

1. Reciba datos del pedido desde Next.js (que viene de WooCommerce)
2. Busque o cree el pedido en Strapi usando woocommerce_id
3. Haga match de los productos del pedido con productos en Strapi usando woocommerce_id
4. Relacione los productos encontrados con el pedido
5. Guarde toda la información del pedido (direcciones, totales, etc.)
```

### Estructura de datos que recibirá:
```json
{
  "data": {
    "woocommerce_id": "789",
    "numero_pedido": "12345",
    "estado": "completed",
    "fecha_creacion": "2024-01-15T10:30:00Z",
    "total": 25000.00,
    "moneda": "CLP",
    "metodo_pago": "cash",
    "metodo_envio": "shipping",
    "billing_nombre": "Juan",
    "billing_apellido": "Pérez",
    "billing_email": "juan@example.com",
    "billing_telefono": "+56912345678",
    "billing_direccion": "Av. Principal 123",
    "billing_ciudad": "Santiago",
    "billing_comuna": "Providencia",
    "billing_codigo_postal": "7500000",
    "billing_pais": "CL",
    "shipping_nombre": "Juan",
    "shipping_apellido": "Pérez",
    "shipping_direccion": "Av. Principal 123",
    "shipping_ciudad": "Santiago",
    "shipping_comuna": "Providencia",
    "shipping_codigo_postal": "7500000",
    "shipping_pais": "CL",
    "notas_cliente": "Entregar en horario de oficina",
    "productos": [
      {
        "woocommerce_id": "123",  // ID del producto en WooCommerce
        "cantidad": 2,
        "precio": 12500.00,
        "subtotal": 25000.00
      }
    ]
  }
}
```

### Lógica requerida para el match de productos:
```javascript
// Pseudocódigo de la lógica
1. Recibir array de productos con woocommerce_id
2. Para cada producto:
   a. Buscar en Strapi producto con woocommerce_id = producto.woocommerce_id
   b. Si se encuentra, relacionarlo con el pedido
   c. Si NO se encuentra, registrar un warning/log pero continuar
3. Guardar el pedido con todas las relaciones
```

---

## 5. CREAR WEBHOOK O ENDPOINT PARA SINCRONIZACIÓN AUTOMÁTICA (OPCIONAL)

### Instrucción para Cursor:
```
Crea un endpoint POST /api/webhooks/woocommerce/pedidos que:
1. Reciba webhooks de WooCommerce cuando se crea/actualiza un pedido
2. Procese el pedido usando la misma lógica del endpoint anterior
3. Valide que la petición viene de WooCommerce (usando un token secreto)
```

### Seguridad:
- Validar token secreto en headers
- Validar que la petición viene de la IP de WooCommerce (si es posible)
- Loggear todas las peticiones recibidas

---

## 6. ACTUALIZAR ENDPOINT DE PRODUCTOS PARA BUSCAR POR `woocommerce_id`

### Instrucción para Cursor:
```
Actualiza el endpoint GET /api/libros para que:
1. Permita buscar productos por woocommerce_id usando query parameter
2. Ejemplo: GET /api/libros?filters[woocommerce_id][$eq]=123
3. Esto permitirá que Next.js busque productos en Strapi usando el ID de WooCommerce
```

---

## RESUMEN DE CAMBIOS NECESARIOS EN STRAPI

1. ✅ Agregar campo `woocommerce_id` (Text) al Content Type `libros`
2. ✅ Actualizar endpoint POST `/api/libros` para guardar `woocommerce_id`
3. ✅ Crear Content Type `pedidos` con todos los campos necesarios
4. ✅ Crear endpoint POST `/api/pedidos` para recibir pedidos y hacer match de productos
5. ✅ Actualizar endpoint GET `/api/libros` para permitir búsqueda por `woocommerce_id`
6. ⚠️ (Opcional) Crear webhook para sincronización automática

---

## FLUJO COMPLETO

### Creación de Producto:
1. Next.js crea producto en WooCommerce → recibe `woocommerce_id`
2. Next.js envía producto a Strapi incluyendo `woocommerce_id`
3. Strapi guarda producto con `woocommerce_id` para match futuro

### Recepción de Pedido:
1. WooCommerce crea/actualiza pedido
2. Next.js recibe pedido de WooCommerce
3. Next.js envía pedido a Strapi con `woocommerce_id` de cada producto
4. Strapi busca productos en `libros` usando `woocommerce_id`
5. Strapi relaciona productos encontrados con el pedido
6. Strapi guarda pedido completo con todas las relaciones

---

## NOTAS IMPORTANTES

- El campo `woocommerce_id` debe ser único o al menos indexado para búsquedas rápidas
- Si un producto no se encuentra en Strapi durante el match, registrar warning pero no fallar
- Considerar crear índices en Strapi para `woocommerce_id` para mejorar rendimiento
- Validar siempre que los datos recibidos sean correctos antes de guardar
