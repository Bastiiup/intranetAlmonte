# Análisis: Cómo Funcionaría la Intranet con Cache de Next.js

## 📊 Estado Actual

Actualmente, la intranet está configurada para **desactivar completamente el cache**:

- ✅ **121 rutas API** con `export const dynamic = 'force-dynamic'`
- ✅ **52+ páginas** con `export const dynamic = 'force-dynamic'`
- ✅ **Todos los fetch** usando `cache: 'no-store'`

Esto significa que **cada request** hace una llamada completa a Strapi, sin ningún tipo de cache.

---

## 🚀 Cómo Funcionaría con Cache de Next.js

### 1. **Tipos de Cache en Next.js 16**

Next.js tiene varios niveles de cache que se pueden combinar:

#### A. **Request Memoization (Cache Automático)**
```typescript
// Next.js cachea automáticamente las llamadas fetch idénticas
// dentro del mismo render request
const productos = await fetch('/api/tienda/productos')
const categorias = await fetch('/api/tienda/categorias')
// Si ambas llaman a la misma URL, solo se ejecuta una vez
```

#### B. **Data Cache (Full Route Cache)**
```typescript
// Cachea la respuesta completa de fetch
const response = await fetch('/api/tienda/productos', {
  next: { revalidate: 3600 } // Cache por 1 hora
})
```

#### C. **Full Route Cache (Static Generation)**
```typescript
// Genera la página estáticamente en build time
export const revalidate = 3600 // Regenera cada hora
```

#### D. **Router Cache (Client-side)**
```typescript
// Cachea las rutas navegadas en el cliente
// Se mantiene durante la sesión del usuario
```

---

## 🎯 Escenarios de Implementación

### **Escenario 1: Cache Agresivo (Máximo Rendimiento)**

**Para datos que cambian poco:**
- Productos
- Categorías
- Colecciones
- Autores
- Obras

```typescript
// En las API Routes
export const revalidate = 3600 // 1 hora

// O en las páginas
export const revalidate = 3600

// En los fetch
const response = await fetch('/api/tienda/productos', {
  next: { revalidate: 3600 }
})
```

**Beneficios:**
- ⚡ **Rendimiento**: Páginas se cargan instantáneamente
- 💰 **Costo**: Menos llamadas a Strapi = menos carga del servidor
- 📈 **Escalabilidad**: Puede manejar más usuarios simultáneos

**Desventajas:**
- ⏱️ **Datos desactualizados**: Hasta 1 hora de delay
- 🔄 **Invalidación manual**: Necesitas revalidar cuando cambias datos

---

### **Escenario 2: Cache Moderado (Balanceado)**

**Para datos que cambian ocasionalmente:**
- Dashboard
- Pedidos (últimos 24 horas)
- Clientes

```typescript
// Cache más corto
export const revalidate = 300 // 5 minutos

// O usar ISR con revalidación on-demand
export const revalidate = false
```

**Con Revalidación On-Demand:**
```typescript
// Cuando actualizas un producto en Strapi, puedes invalidar el cache
import { revalidatePath } from 'next/cache'

// En un webhook de Strapi
export async function POST(request: Request) {
  const { event, model } = await request.json()
  
  if (event === 'entry.update' && model === 'libro') {
    revalidatePath('/tienda/productos')
    revalidatePath('/api/tienda/productos')
  }
}
```

---

### **Escenario 3: Cache Selectivo (Híbrido)**

**Mantener dinámico solo lo crítico:**
- Pedidos activos
- Chat en tiempo real
- Logs de usuario
- Autenticación

```typescript
// Solo estas rutas sin cache
export const dynamic = 'force-dynamic'

// Todo lo demás con cache
export const revalidate = 1800 // 30 minutos
```

---

## 📋 Implementación Recomendada por Tipo de Dato

### **1. Productos y Catálogo** (Cache Agresivo)

```typescript
// frontend-ubold/src/app/api/tienda/productos/route.ts
export const revalidate = 3600 // 1 hora

export async function GET(request: NextRequest) {
  // ... código existente
  // El fetch a Strapi se cachea automáticamente
}
```

```typescript
// frontend-ubold/src/app/tienda/productos/page.tsx
export const revalidate = 3600

export default async function ProductosPage() {
  const response = await fetch(`${baseUrl}/api/tienda/productos`, {
    next: { revalidate: 3600 } // Cache por 1 hora
  })
  // ...
}
```

### **2. Pedidos** (Cache Moderado + On-Demand)

```typescript
// frontend-ubold/src/app/api/tienda/pedidos/route.ts
export const revalidate = 300 // 5 minutos

// Y agregar revalidación cuando se crea/actualiza un pedido
export async function POST(request: NextRequest) {
  // ... crear pedido
  revalidatePath('/tienda/pedidos')
  revalidatePath('/api/tienda/pedidos')
}
```

### **3. Dashboard** (Cache Corto)

```typescript
// frontend-ubold/src/app/(admin)/(apps)/(dashboards)/dashboard/page.tsx
export const revalidate = 60 // 1 minuto

// Los datos del dashboard cambian frecuentemente
```

### **4. Chat y Logs** (Sin Cache)

```typescript
// Mantener como está
export const dynamic = 'force-dynamic'
```

---

## 🔄 Estrategia de Revalidación

### **Opción A: Time-Based Revalidation (ISR)**
```typescript
export const revalidate = 3600 // Regenera cada hora
```

### **Opción B: On-Demand Revalidation**
```typescript
// Webhook desde Strapi
export async function POST(request: Request) {
  const { event, model } = await request.json()
  
  // Revalidar según el tipo de cambio
  if (model === 'libro') {
    revalidatePath('/tienda/productos')
    revalidatePath('/api/tienda/productos')
  }
  
  if (model === 'pedido') {
    revalidatePath('/tienda/pedidos')
    revalidatePath('/api/tienda/pedidos')
  }
}
```

### **Opción C: Tag-Based Revalidation**
```typescript
// En el fetch
const response = await fetch('/api/tienda/productos', {
  next: { 
    revalidate: 3600,
    tags: ['productos'] 
  }
})

// Revalidar por tag
revalidateTag('productos')
```

---

## 📊 Comparación: Antes vs Después

### **Antes (Sin Cache)**
```
Usuario 1 → Request → API Route → Strapi → Response (2s)
Usuario 2 → Request → API Route → Strapi → Response (2s)
Usuario 3 → Request → API Route → Strapi → Response (2s)
```
**Total: 3 requests a Strapi, 6 segundos totales**

### **Después (Con Cache)**
```
Usuario 1 → Request → API Route → Strapi → Response (2s) → Cache
Usuario 2 → Request → API Route → Cache Hit → Response (0.01s)
Usuario 3 → Request → API Route → Cache Hit → Response (0.01s)
```
**Total: 1 request a Strapi, 2.02 segundos totales**

**Mejora: 3x menos carga, 300x más rápido para usuarios 2 y 3**

---

## ⚠️ Consideraciones Importantes

### **1. Datos Sensibles**
- **Autenticación**: Siempre dinámico
- **Datos de usuario**: Cache por usuario (usando cookies)
- **Permisos**: Verificar en cada request

### **2. Invalidación de Cache**
```typescript
// Cuando un admin actualiza un producto
// Necesitas invalidar el cache inmediatamente
revalidatePath('/tienda/productos')
revalidatePath('/api/tienda/productos')
```

### **3. Desarrollo vs Producción**
```typescript
// En desarrollo, desactivar cache para debugging
export const revalidate = process.env.NODE_ENV === 'production' ? 3600 : 0
```

### **4. Cache por Usuario**
```typescript
// Para datos personalizados, usar cookies
import { cookies } from 'next/headers'

export default async function Page() {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  
  // El cache será diferente por usuario
  const response = await fetch(`/api/user/${userId}/data`, {
    next: { revalidate: 300 }
  })
}
```

---

## 🛠️ Plan de Migración Gradual

### **Fase 1: Productos y Catálogo** (Bajo Riesgo)
1. Agregar `revalidate: 3600` a rutas de productos
2. Remover `dynamic = 'force-dynamic'`
3. Remover `cache: 'no-store'` de fetch
4. Probar en staging

### **Fase 2: Dashboard y Reportes** (Riesgo Medio)
1. Cache corto (1-5 minutos)
2. Implementar revalidación on-demand
3. Monitorear actualizaciones

### **Fase 3: Pedidos y Transacciones** (Alto Riesgo)
1. Cache muy corto (30 segundos - 1 minuto)
2. Revalidación inmediata en cambios
3. Mantener fallback dinámico

### **Fase 4: Optimización**
1. Analizar métricas de cache hit rate
2. Ajustar tiempos de revalidación
3. Implementar tags para invalidación granular

---

## 📈 Métricas a Monitorear

1. **Cache Hit Rate**: % de requests que usan cache
2. **Tiempo de Respuesta**: Antes vs después
3. **Carga en Strapi**: Requests por minuto
4. **Datos Desactualizados**: Quejas de usuarios
5. **Invalidaciones**: Frecuencia de revalidación

---

## 🎯 Recomendación Final

**Implementar cache híbrido:**

1. **Productos/Catálogo**: Cache de 1 hora con revalidación on-demand
2. **Pedidos**: Cache de 5 minutos con revalidación on-demand
3. **Dashboard**: Cache de 1 minuto
4. **Chat/Logs**: Sin cache (mantener dinámico)
5. **Autenticación**: Sin cache (mantener dinámico)

**Beneficios esperados:**
- ⚡ 50-90% reducción en tiempo de carga
- 💰 70-80% menos requests a Strapi
- 📈 Mejor experiencia de usuario
- 🔄 Datos actualizados cuando sea necesario

---

## 📝 Ejemplo de Código Completo

```typescript
// frontend-ubold/src/app/api/tienda/productos/route.ts
export const revalidate = 3600 // Cache por 1 hora

export async function GET(request: NextRequest) {
  try {
    const token = process.env.STRAPI_API_TOKEN
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token no configurado' },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const pageSize = searchParams.get('pagination[pageSize]') || '1000'
    const page = searchParams.get('pagination[page]') || '1'

    // Este fetch se cachea automáticamente por 1 hora
    const response = await strapiClient.get<any>(
      `/api/libros?populate=*&pagination[pageSize]=${pageSize}&pagination[page]=${page}`
    )

    return NextResponse.json({
      success: true,
      data: response.data,
      cached: true // Indicar que viene del cache
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// Para invalidar cuando se actualiza un producto
export async function POST(request: NextRequest) {
  // ... lógica de actualización
  revalidatePath('/api/tienda/productos')
  revalidatePath('/tienda/productos')
  return NextResponse.json({ success: true })
}
```

```typescript
// frontend-ubold/src/app/tienda/productos/page.tsx
export const revalidate = 3600 // Cache de la página por 1 hora

export default async function ProductosPage() {
  const headersList = await headers()
  const host = headersList.get('host') || 'localhost:3000'
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const baseUrl = `${protocol}://${host}`
  
  // Este fetch usa el cache de Next.js
  const response = await fetch(`${baseUrl}/api/tienda/productos`, {
    next: { revalidate: 3600 } // Cache por 1 hora
  })
  
  const data = await response.json()
  // ...
}
```

---

## 🔗 Referencias

- [Next.js Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching)
- [Caching in Next.js](https://nextjs.org/docs/app/building-your-application/caching)
- [Revalidating Data](https://nextjs.org/docs/app/building-your-application/data-fetching/revalidating)

