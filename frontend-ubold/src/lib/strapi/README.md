# Cliente Strapi

Cliente HTTP para conectarse con la API de Strapi desde Next.js.

## Configuración

### 1. Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto con:

```env
NEXT_PUBLIC_STRAPI_URL=https://strapi.moraleja.cl
STRAPI_API_TOKEN=tu_token_aqui
```

### 2. Obtener el API Token

1. Ve a Strapi Admin Panel
2. Settings → API Tokens
3. Crea un nuevo token con los permisos necesarios
4. Copia el token y úsalo en `.env.local`

### 3. Configurar en Railway

En Railway, agrega las mismas variables en Settings → Variables:
- `NEXT_PUBLIC_STRAPI_URL` = `https://strapi.moraleja.cl`
- `STRAPI_API_TOKEN` = (tu token)

## Uso

### Ejemplo básico

```typescript
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

// Obtener una lista de productos
const response = await strapiClient.get<StrapiResponse<StrapiEntity<Product>>>(
  '/api/productos?populate=*'
)

// Extraer los datos
const productos = response.data
```

### En un Server Component (Next.js 13+)

```typescript
// app/productos/page.tsx
import strapiClient from '@/lib/strapi/client'

export default async function ProductosPage() {
  const productos = await strapiClient.get('/api/productos?populate=*')
  
  return (
    <div>
      {productos.data.map((producto) => (
        <div key={producto.id}>{producto.attributes.nombre}</div>
      ))}
    </div>
  )
}
```

### En un Route Handler (API Route)

```typescript
// app/api/productos/route.ts
import strapiClient from '@/lib/strapi/client'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const productos = await strapiClient.get('/api/productos?populate=*')
    return NextResponse.json(productos)
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener productos' }, { status: 500 })
  }
}
```

### Crear un nuevo registro

```typescript
const nuevoProducto = await strapiClient.post('/api/productos', {
  data: {
    nombre: 'Libro nuevo',
    precio: 100,
    descripcion: 'Descripción del libro'
  }
})
```

### Actualizar un registro

```typescript
const productoActualizado = await strapiClient.put(`/api/productos/${id}`, {
  data: {
    precio: 150
  }
})
```

### Eliminar un registro

```typescript
await strapiClient.delete(`/api/productos/${id}`)
```

## Métodos disponibles

- `strapiClient.get<T>(path, options?)` - GET request
- `strapiClient.post<T>(path, data?, options?)` - POST request
- `strapiClient.put<T>(path, data?, options?)` - PUT request
- `strapiClient.delete<T>(path, options?)` - DELETE request

## CORS

Asegúrate de que Strapi tenga configurado CORS para permitir peticiones desde:
- Desarrollo: `http://localhost:3000`
- Producción: `https://intranetAlmonte.moraleja.cl`


