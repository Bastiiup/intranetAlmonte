# Scripts de Utilidad

## test-strapi.js

Script de verificación de funcionalidades con Strapi. Prueba todas las conexiones y endpoints principales para verificar que todo está configurado correctamente.

### Uso

```bash
# Ejecución básica
npm run test:strapi

# Modo verbose (muestra más detalles)
npm run test:strapi:verbose

# Probar también operaciones CRUD (crear/eliminar)
npm run test:strapi:crud

# O directamente con Node
node scripts/test-strapi.js
node scripts/test-strapi.js --verbose
node scripts/test-strapi.js --test-crud
```

### Requisitos

El script necesita las siguientes variables de entorno (en `.env.local` o en el sistema):

```env
NEXT_PUBLIC_STRAPI_URL=https://strapi.moraleja.cl
STRAPI_API_TOKEN=tu_token_aqui
```

Si no encuentra `.env.local`, el script intentará usar las variables de entorno del sistema.

### Qué prueba

El script verifica los siguientes content types:

- ✅ Productos/Libros (`/api/libros`)
- ✅ Categorías (`/api/categorias`)
- ✅ Etiquetas (`/api/etiquetas`)
- ✅ Autores (`/api/autores`)
- ✅ Colecciones (`/api/colecciones`)
- ✅ Obras (`/api/obras`)
- ✅ Sellos (`/api/sellos`)
- ✅ Marcas (`/api/marcas`)
- ✅ Pedidos (`/api/wo-pedidos`)
- ✅ Clientes (`/api/wo-clientes`)
- ✅ Colegios (`/api/colegios`)
- ✅ Personas (`/api/personas`)
- ✅ Profesores (`/api/profesores`)

### Salida

El script muestra:
- ✅ Estado de cada endpoint (exitoso, fallido, sin permisos)
- 📊 Cantidad de registros encontrados
- ⏱️ Tiempo de respuesta
- 📈 Resumen con tasa de éxito
- 💡 Sugerencias si hay errores

### Ejemplo de salida

```
╔═══════════════════════════════════════════════════════════════════════╗
║     Script de Verificación de Funcionalidades Strapi                 ║
╚═══════════════════════════════════════════════════════════════════════╝

✓ Variables de entorno cargadas desde .env.local

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Test de Conexión Base
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

URL: https://strapi.moraleja.cl
Token: Configurado
Token Preview: abc123def456ghi789...

✓ Conexión a Strapi exitosa

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Test de Content Types
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Productos/Libros      [200] 150 registros (150 total) (245ms)
✓ Categorías            [200] 25 registros (25 total) (180ms)
✓ Etiquetas             [200] 42 registros (42 total) (156ms)
...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Resumen
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total:        13
✓ Exitosos:  12
⚠ Advertencias: 1
✗ Fallidos:   0

Tasa de éxito: 92.3%
```

## test-woocommerce-customer.js

Script de prueba para ver la estructura completa de clientes de WooCommerce. Útil para entender cómo enviar datos de clientes a la API.

### Uso

```bash
# Ejecución básica (obtiene el cliente más reciente)
npm run test:woo:customer
# o
node scripts/test-woocommerce-customer.js

# Obtener cliente por ID
node scripts/test-woocommerce-customer.js --id 123

# Obtener cliente por email
node scripts/test-woocommerce-customer.js --email cliente@ejemplo.com

# Usar plataforma Moraleja
node scripts/test-woocommerce-customer.js --platform moraleja
```

### Requisitos

El script necesita las siguientes variables de entorno (en `.env.local`):

```env
WOO_ESCOLAR_CONSUMER_KEY="ck_..."
WOO_ESCOLAR_CONSUMER_SECRET="cs_..."
WOO_ESCOLAR_URL="https://staging.escolar.cl"

WOO_MORALEJA_CONSUMER_KEY="ck_..."
WOO_MORALEJA_CONSUMER_SECRET="cs_..."
WOO_MORALEJA_URL="https://staging.moraleja.cl"
```

### Salida

El script muestra:
- ✅ Estructura completa del cliente
- 📊 Datos de facturación (billing)
- 📦 Datos de envío (shipping)
- 🏷️ Meta data del cliente
- 💾 JSON completo guardado en `woocommerce-customer-sample.json`

## test-woocommerce-order.js

Script de prueba para ver la estructura completa de pedidos de WooCommerce. Útil para entender cómo crear y actualizar pedidos.

### Uso

```bash
# Ejecución básica (obtiene el pedido más reciente)
npm run test:woo:order
# o
node scripts/test-woocommerce-order.js

# Obtener pedido por ID
node scripts/test-woocommerce-order.js --id 123

# Obtener pedido por número
node scripts/test-woocommerce-order.js --number 1234

# Usar plataforma Moraleja
node scripts/test-woocommerce-order.js --platform moraleja
```

### Requisitos

Mismas variables de entorno que `test-woocommerce-customer.js`.

### Salida

El script muestra:
- ✅ Información básica del pedido
- 📦 Items del pedido (line_items)
- 💰 Resumen de totales
- 📊 Datos de facturación y envío
- 🚚 Líneas de envío (shipping_lines)
- 💳 Líneas de impuestos (tax_lines)
- 🎫 Cupones aplicados (coupon_lines)
- 🏷️ Meta data del pedido
- 📋 **Estructura para crear pedido** (ejemplo de JSON)
- 💾 JSON completo guardado en `woocommerce-order-sample.json`

### Propósito

Este script es especialmente útil para:
- Entender la estructura completa de pedidos
- Identificar campos necesarios para crear pedidos
- Ver ejemplos reales de datos de pedidos
- Documentar la API de pedidos para desarrollo

Ver más detalles en [README-ORDERS.md](./README-ORDERS.md)
