# Configuración de WooCommerce POS

Este documento explica cómo configurar el sistema POS (Punto de Venta) que se conecta con WooCommerce en `https://staging.escolar.cl/`.

## 📋 Requisitos Previos

1. Credenciales de API REST de WooCommerce:
   - Consumer Key (`ck_...`)
   - Consumer Secret (`cs_...`)

## 🔧 Configuración de Variables de Entorno

### Desarrollo Local

Crea un archivo `.env.local` en la raíz del proyecto `frontend-ubold/` con las siguientes variables:

```env
# WooCommerce Configuration
NEXT_PUBLIC_WOOCOMMERCE_URL=https://staging.escolar.cl
WOOCOMMERCE_CONSUMER_KEY=ck_1d061e57ecfe47aa3661816f1b97858de8732014
WOOCOMMERCE_CONSUMER_SECRET=cs_b9b0ef71cccd554b66ce4545a739b175393d6d38
```

### Producción (Railway)

1. Ve a tu proyecto en Railway
2. Abre la pestaña "Variables"
3. Agrega las siguientes variables:

```
NEXT_PUBLIC_WOOCOMMERCE_URL = https://staging.escolar.cl
WOOCOMMERCE_CONSUMER_KEY = ck_1d061e57ecfe47aa3661816f1b97858de8732014
WOOCOMMERCE_CONSUMER_SECRET = cs_b9b0ef71cccd554b66ce4545a739b175393d6d38
```

## 🚀 Funcionalidades del POS

### Características Principales

1. **Lista de Productos**
   - Muestra productos disponibles en WooCommerce
   - Solo muestra productos con stock disponible (`instock`)
   - Búsqueda en tiempo real
   - Vista de tarjetas con imágenes

2. **Carrito de Compras**
   - Agregar productos con un clic
   - Ajustar cantidades
   - Remover productos
   - Calcular totales automáticamente

3. **Procesamiento de Pedidos**
   - Crear pedidos directamente en WooCommerce
   - Los pedidos se marcan como "Completados" automáticamente
   - Método de pago: "Punto de Venta"

## 📁 Estructura de Archivos

```
frontend-ubold/
├── src/
│   ├── lib/
│   │   └── woocommerce/
│   │       ├── config.ts          # Configuración de WooCommerce
│   │       ├── client.ts           # Cliente HTTP para API REST
│   │       ├── types.ts            # Tipos TypeScript
│   │       └── index.ts            # Exportaciones
│   ├── app/
│   │   ├── api/
│   │   │   └── woocommerce/
│   │   │       ├── products/       # API route para productos
│   │   │       └── orders/         # API route para pedidos
│   │   └── tienda/
│   │       └── pos/
│   │           ├── page.tsx        # Página principal del POS
│   │           └── components/
│   │               └── PosInterface.tsx  # Componente principal
```

## 🔐 Seguridad

- Las credenciales de WooCommerce **NO** se exponen al cliente
- Todas las peticiones a WooCommerce se hacen desde el servidor (API routes)
- Las credenciales solo están disponibles en variables de entorno del servidor

## 🐛 Solución de Problemas

### Error: "WooCommerce API credentials are not configured"

**Solución:** Verifica que las variables de entorno estén configuradas correctamente.

### Error: "HTTP error! status: 401"

**Solución:** Las credenciales de API son incorrectas o han sido revocadas. Genera nuevas credenciales en WooCommerce.

### Error: "HTTP error! status: 403"

**Solución:** Verifica que los permisos de la API key sean "Lectura/Escritura" (Read/Write).

### Los productos no se cargan

**Solución:** 
1. Verifica que haya productos publicados en WooCommerce
2. Verifica que los productos tengan stock disponible
3. Revisa la consola del navegador para ver errores específicos

## 📝 Notas

- El POS solo muestra productos con `stock_status = 'instock'`
- Los pedidos se crean con estado "completed" automáticamente
- El método de pago se establece como "pos" (Punto de Venta)
- Los pedidos se marcan como pagados automáticamente (`set_paid: true`)

## 🔗 Referencias

- [WooCommerce REST API Documentation](https://woocommerce.github.io/woocommerce-rest-api-docs/)
- [WooCommerce POS GitHub](https://github.com/wcpos/woocommerce-pos)


