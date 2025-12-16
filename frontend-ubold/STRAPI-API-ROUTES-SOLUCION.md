# Solución: Usar API Routes como Proxy (Igual que el Chat)

## 🎯 Problema

Las páginas de productos y pedidos estaban llamando directamente a Strapi usando `strapiClient`, lo que requería configurar permisos del rol "Public" en Strapi, algo que puede ser complicado o no estar disponible.

## ✅ Solución

Usar **API Routes de Next.js como proxy**, exactamente igual que funciona el chat. Esto tiene varias ventajas:

1. **El token se maneja solo en el servidor** - No se expone al cliente
2. **No requiere configurar el rol Public** - El API Token funciona directamente
3. **Manejo de errores mejorado** - Podemos hacer múltiples intentos con diferentes endpoints
4. **Más seguro** - El cliente nunca ve el token de Strapi

## 📁 Archivos Creados

### 1. `/api/tienda/productos/route.ts`
API Route que actúa como proxy para obtener productos desde Strapi.

```typescript
// El cliente hace: fetch('/api/tienda/productos')
// Esta ruta usa strapiClient internamente con el token
// Retorna los productos sin exponer el token
```

### 2. `/api/tienda/pedidos/route.ts`
API Route que actúa como proxy para obtener pedidos desde Strapi.

```typescript
// El cliente hace: fetch('/api/tienda/pedidos')
// Esta ruta usa strapiClient internamente con el token
// Retorna los pedidos sin exponer el token
```

## 🔄 Cambios en las Páginas

### Antes (Llamada directa a Strapi):
```typescript
// ❌ Esto requería permisos del rol Public
const response = await strapiClient.get('/api/product-libro-edicion?populate=*')
```

### Ahora (Usando API Route):
```typescript
// ✅ Esto funciona con solo el API Token
const response = await fetch(`${baseUrl}/api/tienda/productos`)
const data = await response.json()
```

## 🔑 Cómo Funciona

1. **El cliente (página)** hace `fetch` a `/api/tienda/productos`
2. **La API Route** recibe la petición en el servidor
3. **La API Route** usa `strapiClient` con el `STRAPI_API_TOKEN` (solo disponible en servidor)
4. **La API Route** hace la petición a Strapi con el token en el header `Authorization: Bearer ${token}`
5. **Strapi** valida el token y retorna los datos
6. **La API Route** retorna los datos al cliente (sin exponer el token)

## 🚀 Ventajas

- ✅ **No requiere configurar el rol Public** - Solo necesitas el API Token
- ✅ **Más seguro** - El token nunca se expone al cliente
- ✅ **Mismo patrón que el chat** - Consistencia en el código
- ✅ **Manejo de errores mejorado** - Puedes hacer múltiples intentos con diferentes endpoints
- ✅ **Fácil de debuggear** - Los logs están en el servidor

## 📝 Configuración Necesaria

Solo necesitas tener configurado el `STRAPI_API_TOKEN` en las variables de entorno:

```env
STRAPI_API_TOKEN=tu_token_aqui
NEXT_PUBLIC_STRAPI_URL=https://strapi.moraleja.cl
```

**No necesitas:**
- ❌ Crear el rol "Public"
- ❌ Configurar permisos del rol Public
- ❌ Habilitar CORS en Strapi (aunque puede ayudar)

## 🔍 Debugging

Si algo no funciona, revisa los logs del servidor (Railway logs):

```
[API /tienda/productos] Respuesta de Strapi: { endpoint: '/api/product-libro-edicion', ... }
[API /tienda/pedidos] Respuesta de Strapi: { endpoint: '/api/ecommerce-pedidos', ... }
```

Los errores también se loguean en el servidor, no en el cliente.

## 🎉 Resultado

Ahora productos y pedidos funcionan **exactamente igual que el chat**:
- El chat usa `/api/chat/clientes` y `/api/chat/mensajes`
- Los productos usan `/api/tienda/productos`
- Los pedidos usan `/api/tienda/pedidos`

Todos usan el mismo patrón: **API Routes como proxy** 🚀

