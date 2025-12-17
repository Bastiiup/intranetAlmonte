# 🔌 Guía: Conectar con Strapi

Esta guía te ayudará a conectar tu aplicación Next.js con Strapi.

## 📋 Pasos para conectar

### 1. Configurar Variables de Entorno

#### En Desarrollo (Local)

Crea un archivo `.env.local` en la raíz del proyecto (`frontend-ubold/`):

```env
NEXT_PUBLIC_STRAPI_URL=https://strapi.moraleja.cl
STRAPI_API_TOKEN=tu_token_aqui
```

**⚠️ IMPORTANTE:** 
- `.env.local` NO debe subirse a Git (ya está en `.gitignore`)
- Reemplaza `tu_token_aqui` con el token real que obtuviste de Strapi

#### En Producción (Railway)

1. Ve a tu servicio en Railway
2. Settings → Variables
3. Agrega estas variables:
   - `NEXT_PUBLIC_STRAPI_URL` = `https://strapi.moraleja.cl`
   - `STRAPI_API_TOKEN` = (tu token de Strapi)

---

### 2. Obtener el API Token de Strapi

1. Ve al panel de administración de Strapi
2. Settings → API Tokens
3. Crea un nuevo token:
   - **Name:** `intranetAlmonte`
   - **Type:** `Custom` (o `Full access` si quieres todos los permisos)
   - **Permissions:** Selecciona los permisos necesarios para cada colección
4. **Copia el token** (solo se muestra una vez)

---

### 3. Verificar la Conexión

1. Inicia tu aplicación localmente: `npm run dev`
2. Ve a: `http://localhost:3000/tienda/test-strapi`
3. Esta página te mostrará:
   - Si las variables están configuradas
   - Si la conexión con Strapi funciona
   - Qué errores hay (si los hay)

---

### 4. Configurar CORS en Strapi

Para que Strapi acepte peticiones desde tu intranet:

1. En Strapi, ve a: **Settings → Middlewares**
2. Busca la configuración de **CORS**
3. Agrega estos orígenes permitidos:
   - Desarrollo: `http://localhost:3000`
   - Producción: `https://intranetAlmonte.moraleja.cl`

---

### 5. Habilitar Permisos en Strapi

Para cada colección que quieras usar:

1. Ve a: **Settings → Roles → Public** (o crea un rol "Intranet")
2. Para cada colección (ej: "pedidos", "productos"):
   - Habilita: `find` (leer lista)
   - Habilita: `findOne` (leer uno)
   - Habilita: `create`, `update`, `delete` (si necesitas escribir)

---

## 💻 Cómo usar el cliente Strapi

### Ejemplo básico: Obtener datos

```typescript
// En cualquier página (Server Component)
import strapiClient from '@/lib/strapi/client'

export default async function MiPagina() {
  // Obtener datos de Strapi
  const response = await strapiClient.get('/api/pedidos?populate=*')
  const pedidos = response.data // Array de pedidos
  
  return (
    <div>
      {pedidos.map((pedido: any) => (
        <div key={pedido.id}>
          Pedido #{pedido.id}
        </div>
      ))}
    </div>
  )
}
```

### Ejemplo: Crear un registro

```typescript
const nuevoPedido = await strapiClient.post('/api/pedidos', {
  data: {
    cliente: 'Juan Pérez',
    total: 150.00,
    estado: 'pendiente'
  }
})
```

### Ejemplo: Actualizar un registro

```typescript
await strapiClient.put(`/api/pedidos/${id}`, {
  data: {
    estado: 'completado'
  }
})
```

### Ejemplo: Eliminar un registro

```typescript
await strapiClient.delete(`/api/pedidos/${id}`)
```

---

## 🔍 Endpoints comunes de Strapi

### Obtener todos los registros
```
GET /api/pedidos?populate=*
```

### Obtener un registro específico
```
GET /api/pedidos/1?populate=*
```

### Filtrar
```
GET /api/pedidos?filters[estado][$eq]=pendiente&populate=*
```

### Paginación
```
GET /api/pedidos?pagination[page]=1&pagination[pageSize]=10
```

### Ordenar
```
GET /api/pedidos?sort=createdAt:desc
```

---

## 🐛 Solución de problemas

### Error: "Cannot find module '@/lib/strapi/client'"
- Verifica que el archivo existe en `src/lib/strapi/client.ts`
- Reinicia el servidor de desarrollo

### Error: "401 Unauthorized"
- Verifica que `STRAPI_API_TOKEN` esté configurado
- Verifica que el token sea válido en Strapi
- Verifica los permisos del token en Strapi

### Error: "CORS policy"
- Configura CORS en Strapi (paso 4)
- Verifica que el origen esté en la lista de permitidos

### Error: "404 Not Found"
- Verifica que la colección exista en Strapi
- Verifica que el nombre de la colección sea correcto (ej: `/api/pedidos` vs `/api/orders`)
- Verifica que los permisos estén habilitados

### No aparecen datos
- Verifica que haya registros en Strapi
- Verifica los permisos de la colección
- Revisa la consola del navegador para ver errores

---

## 📚 Recursos

- [Documentación de Strapi REST API](https://docs.strapi.io/dev-docs/api/rest)
- [Strapi Query Parameters](https://docs.strapi.io/dev-docs/api/rest/filters-locale-publication)
- Cliente Strapi: `src/lib/strapi/README.md`

---

## ✅ Checklist

- [ ] Variables de entorno configuradas (`.env.local` y Railway)
- [ ] API Token creado en Strapi
- [ ] CORS configurado en Strapi
- [ ] Permisos habilitados para las colecciones
- [ ] Página de test funciona (`/tienda/test-strapi`)
- [ ] Páginas conectadas con Strapi funcionando


