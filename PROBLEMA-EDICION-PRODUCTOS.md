# Problema: Edición de Productos en Strapi desde Next.js

## Contexto del Proyecto

- **Framework**: Next.js 16.0.10 (App Router)
- **Backend CMS**: Strapi (versión 4 o 5)
- **Deployment**: Railway
- **Rama Git**: `matiRama`
- **Estructura**: Monorepo con `frontend-ubold/` como subdirectorio

## Estructura de Datos en Strapi

### Colección: `libros`
- **Endpoint**: `/api/libros`
- **Estructura del producto** (según debug):
```json
{
  "id": 1,
  "documentId": "uzz2rgdspv57xvs7mgoy1aon",
  "nombre_libro": "hola",
  "descripcion": null,
  "portada_libro": null,
  "isbn_libro": "B5454545",
  "createdAt": "2025-12-12T14:17:39.077Z",
  "updatedAt": "2025-12-12T15:06:26.011Z",
  // ... otros campos
}
```

**Nota importante**: Los datos vienen **directamente** en el objeto, NO dentro de `attributes`. Esto es diferente a algunas versiones de Strapi que anidan los datos en `attributes`.

## Problema Actual

### Síntomas:
1. **Al editar nombre**: Error "Producto con ID 1 no encontrado en Strapi"
2. **Al editar descripción**: Error "Producto con ID 1 no encontrado en Strapi"
3. **Al editar imagen**: El botón de guardar no funciona (no responde al click)

### Debug Info que aparece:
```json
{
  "idOriginal": "1",
  "idNumericoUsado": 1,
  "endpoint": "/api/libros/1"
}
```

## Flujo Actual de Edición

### Frontend (`ProductDetails.tsx` y `ProductDisplay.tsx`):
1. Usuario hace click en el lápiz para editar
2. Usuario modifica el valor
3. Usuario hace click en guardar (✓)
4. Se envía petición `PUT` a `/api/tienda/productos/${productId}`
5. El `productId` es `producto.id?.toString() || producto.documentId`

### Backend (`/api/tienda/productos/[id]/route.ts`):
1. Recibe el `id` del parámetro de la URL
2. Intenta obtener el producto directamente: `GET /api/libros/${id}`
3. Si falla, busca en lista completa: `GET /api/libros?populate=*&pagination[pageSize]=1000`
4. Busca el producto por `id` o `documentId`
5. Extrae el `id` numérico del producto encontrado
6. Envía `PUT /api/libros/${productoId}` con formato `{ data: { campo: valor } }`

## Código Relevante

### API Route PUT Handler:
```typescript
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params // id viene de la URL: /products/1
  
  // Estrategia 1: Intentar obtener directamente por ID
  if (!isNaN(parseInt(id))) {
    try {
      const directResponse = await strapiClient.get<any>(`/api/libros/${id}?populate=*`)
      const producto = directResponse.data || directResponse
      
      if (producto && producto.id) {
        productoActual = producto
        productoId = producto.id
        // ✅ Encontrado
      }
    } catch (directError) {
      // Continuar a búsqueda en lista
    }
  }
  
  // Estrategia 2: Buscar en lista completa
  if (!productoActual) {
    const allProducts = await strapiClient.get<any>(
      `/api/libros?populate=*&pagination[pageSize]=1000`
    )
    
    // Procesar estructura de respuesta
    let productos: any[] = []
    if (Array.isArray(allProducts)) {
      productos = allProducts
    } else if (Array.isArray(allProducts.data)) {
      productos = allProducts.data
    }
    
    // Buscar producto
    const productoEncontrado = productos.find((p: any) => {
      const pId = p.id
      const pDocId = p.documentId
      const idStr = id.toString()
      const idNum = parseInt(idStr)
      
      return (
        pId?.toString() === idStr ||
        pDocId?.toString() === idStr ||
        (!isNaN(idNum) && pId === idNum)
      )
    })
    
    if (!productoEncontrado) {
      // ❌ ERROR: No encontrado
      return NextResponse.json({
        success: false,
        error: `Producto con ID "${id}" no encontrado`,
        debug: {
          idBuscado: id,
          totalProductos: productos.length,
          idsDisponibles: productos.slice(0, 10).map((p: any) => ({
            id: p.id,
            documentId: p.documentId,
            nombre: p.nombre_libro
          }))
        }
      }, { status: 404 })
    }
    
    productoActual = productoEncontrado
    productoId = productoEncontrado.id
  }
  
  // Preparar datos para Strapi
  const updateData = {
    data: {
      nombre_libro: body.nombre_libro, // si viene en body
      descripcion: body.descripcion,   // si viene en body
      portada_libro: body.portada_libro // si viene en body (number ID)
    }
  }
  
  // Enviar actualización
  const response = await strapiClient.put<any>(
    `/api/libros/${productoId}`,
    updateData
  )
  
  return NextResponse.json({
    success: true,
    data: response.data || response
  })
}
```

### Cliente Strapi (`lib/strapi/client.ts`):
```typescript
const strapiClient = {
  async get<T>(path: string): Promise<T> {
    const url = getStrapiUrl(path) // https://strapi.moraleja.cl + path
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${STRAPI_API_TOKEN}`
      }
    })
    return handleResponse<T>(response) // Retorna response.json()
  },
  
  async put<T>(path: string, data?: unknown): Promise<T> {
    const url = getStrapiUrl(path)
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${STRAPI_API_TOKEN}`
      },
      body: data ? JSON.stringify(data) : undefined
    })
    return handleResponse<T>(response)
  }
}
```

## Lo que Hemos Intentado

1. ✅ Simplificar la lógica de búsqueda de productos
2. ✅ Intentar obtener producto directamente por ID primero
3. ✅ Buscar en lista completa como fallback
4. ✅ Manejar diferentes estructuras de respuesta de Strapi
5. ✅ Agregar logs detallados en cada paso
6. ✅ Validar que el ID numérico existe antes de hacer PUT

## Preguntas para Resolver

1. **¿Por qué no encuentra el producto con ID 1?**
   - El producto existe (se puede ver en la página de detalles)
   - El ID es correcto (1)
   - El endpoint es correcto (`/api/libros/1`)
   - Pero la búsqueda falla

2. **¿El problema está en:**
   - La búsqueda del producto?
   - El formato del payload para Strapi?
   - Los permisos del token de Strapi?
   - La estructura de datos que retorna Strapi?

3. **¿Por qué el botón de imagen no funciona?**
   - El código parece correcto
   - ¿Está deshabilitado por alguna condición?
   - ¿Hay un error que no se está mostrando?

## Logs que Aparecen

Cuando se intenta editar, en la consola del navegador aparecen logs como:
```
[ProductDetails] ===== INICIANDO GUARDADO DE NOMBRE =====
[ProductDetails] Datos del producto: { id: 1, documentId: "...", productId: "1" }
[ProductDetails] Enviando petición PUT: { url: "/api/tienda/productos/1", body: {...} }
[API /tienda/productos/[id] PUT] ===== INICIANDO PUT =====
[API /tienda/productos/[id] PUT] Intentando obtener producto directamente por ID: 1
[API /tienda/productos/[id] PUT] ⚠️ No se pudo obtener por ID directo, buscando en lista
[API /tienda/productos/[id] PUT] ❌ Producto no encontrado: { idBuscado: "1", totalProductos: X }
```

## Archivos Clave

- `src/app/api/tienda/productos/[id]/route.ts` - API route para GET y PUT
- `src/app/(admin)/(apps)/(ecommerce)/products/[productId]/components/ProductDetails.tsx` - Componente de edición de nombre/descripción
- `src/app/(admin)/(apps)/(ecommerce)/products/[productId]/components/ProductDisplay.tsx` - Componente de edición de imagen
- `src/lib/strapi/client.ts` - Cliente HTTP para Strapi

## Variables de Entorno

- `STRAPI_API_TOKEN` - Token de autenticación para Strapi
- `NEXT_PUBLIC_STRAPI_URL` - URL base de Strapi (https://strapi.moraleja.cl)

## Información Adicional

- El producto se puede **ver** correctamente (GET funciona)
- El problema es solo con **editar** (PUT no funciona)
- El error dice "no encontrado" pero el producto existe
- El ID usado es correcto (1)
- El endpoint es correcto (`/api/libros/1`)

