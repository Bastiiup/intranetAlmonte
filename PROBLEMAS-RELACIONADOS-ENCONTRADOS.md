# 🔍 Problemas Relacionados Encontrados

**Fecha:** Diciembre 2024  
**Rama:** `integracion-todas-ramas`

---

## 📋 Resumen

Este documento lista todos los problemas relacionados encontrados después de corregir el problema de categorías y etiquetas.

---

## ✅ Problemas Ya Corregidos

### 1. Enlaces Rotos en el Menú ✅
- **Problema:** Enlaces a `/products/categorias` y `/products/etiquetas` que no existen
- **Estado:** ✅ Corregido - Enlaces comentados en `data.ts`
- **Archivos:** `frontend-ubold/src/layouts/components/data.ts`

### 2. Validación de Rutas Reservadas ✅
- **Problema:** Rutas dinámicas capturaban palabras reservadas como IDs
- **Estado:** ✅ Corregido - Validación agregada en `productos/[id]/route.ts`
- **Archivos:** `frontend-ubold/src/app/api/tienda/productos/[id]/route.ts`

### 3. Cookies No Enviadas en Fetch ✅
- **Problema:** Fetch calls no incluían cookies automáticamente
- **Estado:** ✅ Parcialmente corregido - Agregado en `RelationSelector` y `products/[productId]/page.tsx`
- **Archivos:** 
  - `frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/add-product/components/RelationSelector.tsx`
  - `frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/products/[productId]/page.tsx`

---

## ⚠️ Problemas Potenciales Encontrados

### 1. Otros Endpoints con Rutas Dinámicas [id] Sin Validación

**Problema:** Otros endpoints con rutas dinámicas podrían tener el mismo problema si se accede con palabras reservadas.

**Endpoints afectados:**
- `/api/tienda/obras/[id]` - No tiene validación de palabras reservadas
- `/api/tienda/marca/[id]` - No tiene validación de palabras reservadas
- `/api/tienda/sello/[id]` - No tiene validación de palabras reservadas
- `/api/tienda/autores/[id]` - No tiene validación de palabras reservadas
- `/api/tienda/serie-coleccion/[id]` - No tiene validación de palabras reservadas

**Riesgo:** 🟡 MEDIO - Si alguien intenta acceder a `/api/tienda/obras/productos` podría causar confusión.

**Recomendación:**
```typescript
// Agregar validación similar en todos los endpoints [id]
const reservedWords = ['productos', 'categorias', 'etiquetas', 'pedidos', 'facturas']
if (reservedWords.includes(id.toLowerCase())) {
  return NextResponse.json({ error: 'Ruta no válida' }, { status: 404 })
}
```

---

### 2. Fetch Calls Sin `credentials: 'include'`

**Problema:** Varios fetch calls no incluyen `credentials: 'include'`, lo que puede causar problemas de autenticación.

**Archivos afectados:**
- `frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/products/solicitudes/components/ProductRequestsListing.tsx` (3 fetch calls)
- `frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/products/[productId]/components/ProductDisplay.tsx` (3 fetch calls)
- `frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/products/[productId]/components/ProductDetails.tsx` (1 fetch call)
- `frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/products/[productId]/components/ProductPricing.tsx` (2 fetch calls)

**Riesgo:** 🟡 MEDIO - Pueden fallar en producción si las cookies no se envían.

**Recomendación:**
```typescript
// Agregar credentials: 'include' a todos los fetch calls que requieren autenticación
const response = await fetch('/api/tienda/productos', {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
})
```

---

### 3. Rutas del Menú que Podrían No Existir

**Verificación necesaria:**

#### Rutas de Tienda:
- ✅ `/tienda/productos` - Existe
- ✅ `/tienda/productos/editar` - Existe
- ✅ `/tienda/pedidos` - Existe
- ✅ `/tienda/pedidos/editar` - Existe
- ❓ `/tienda/facturas` - Necesita verificación
- ❓ `/tienda/test-strapi` - Necesita verificación

#### Rutas de Ecommerce:
- ✅ `/products` - Existe
- ✅ `/products-grid` - Existe
- ✅ `/products/[productId]` - Existe
- ✅ `/add-product` - Existe
- ✅ `/products/solicitudes` - Existe
- ✅ `/atributos/*` - Existen (verificadas)

#### Rutas de CRM:
- ❓ `/crm/*` - Necesitan verificación (muchas rutas)

#### Rutas de Soporte:
- ❓ `/tickets-list` - Necesita verificación
- ❓ `/ticket-details` - Necesita verificación
- ❓ `/ticket-create` - Necesita verificación

**Riesgo:** 🟢 BAJO - Solo causan 404 si se accede, no errores críticos.

---

### 4. Inconsistencia en Nombres de Endpoints

**Problema:** Hay duplicación de endpoints con nombres similares:
- `/api/tienda/marca` y `/api/tienda/marcas` (ambos existen)
- `/api/tienda/sello` y `/api/tienda/sellos` (ambos existen)
- `/api/tienda/obras` existe pero no `/api/tienda/obra`

**Riesgo:** 🟢 BAJO - Puede causar confusión pero no errores.

**Recomendación:** Estandarizar nombres (usar plural o singular consistentemente).

---

### 5. Falta de Validación de Autenticación en Algunos Endpoints

**Problema:** Algunos endpoints de API no validan autenticación explícitamente, dependen solo del middleware.

**Endpoints que deberían validar:**
- `/api/tienda/debug-productos` - Endpoint de debug, podría necesitar protección
- `/api/tienda/test-env` - Endpoint de test, debería estar protegido en producción

**Riesgo:** 🟡 MEDIO - Información sensible podría estar expuesta.

**Recomendación:**
```typescript
// Agregar validación explícita en endpoints sensibles
const authToken = request.cookies.get('auth_token')?.value
if (!authToken) {
  return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
}
```

---

### 6. Fetch Calls en Server Components Sin Manejo de Errores

**Problema:** Algunos fetch calls en server components no manejan todos los casos de error.

**Archivos afectados:**
- `frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/products/page.tsx`
- `frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/products-grid/page.tsx`
- `frontend-ubold/src/app/tienda/productos/page.tsx`

**Riesgo:** 🟢 BAJO - Ya tienen try-catch básico, pero podrían mejorar.

---

### 7. Rutas de API con Nombres Inconsistentes

**Problema:** Algunas rutas usan singular y otras plural:
- `/api/tienda/marca` (singular)
- `/api/tienda/marcas` (plural)
- `/api/tienda/sello` (singular)
- `/api/tienda/sellos` (plural)
- `/api/tienda/obras` (plural)
- `/api/tienda/autores` (plural)

**Riesgo:** 🟢 BAJO - Solo causa confusión, no errores.

**Recomendación:** Estandarizar a plural para consistencia.

---

## 🎯 Prioridades de Corrección

### Prioridad ALTA 🔴
1. **Agregar `credentials: 'include'` a todos los fetch calls** que requieren autenticación
   - Afecta: ~10 archivos
   - Impacto: Errores de autenticación en producción

### Prioridad MEDIA 🟡
2. **Agregar validación de palabras reservadas** en otros endpoints [id]
   - Afecta: 5 endpoints
   - Impacto: Prevenir errores similares

3. **Verificar y proteger endpoints de debug/test** en producción
   - Afecta: 2 endpoints
   - Impacto: Seguridad

### Prioridad BAJA 🟢
4. **Estandarizar nombres de endpoints** (singular/plural)
   - Afecta: 3-4 endpoints
   - Impacto: Mejora de mantenibilidad

5. **Verificar rutas del menú** que no existen
   - Afecta: ~10 rutas
   - Impacto: Mejora UX

---

## 📝 Checklist de Acciones

### Inmediatas
- [ ] Agregar `credentials: 'include'` a fetch calls faltantes
- [ ] Agregar validación de palabras reservadas en endpoints [id]
- [ ] Proteger endpoints de debug/test en producción

### Corto Plazo
- [ ] Verificar todas las rutas del menú
- [ ] Estandarizar nombres de endpoints
- [ ] Mejorar manejo de errores en server components

### Largo Plazo
- [ ] Documentar todas las rutas de API
- [ ] Crear tests para validar rutas
- [ ] Implementar validación centralizada de autenticación

---

## 🔧 Scripts Útiles para Verificación

### Buscar fetch calls sin credentials
```bash
grep -r "fetch(" frontend-ubold/src --include="*.tsx" --include="*.ts" | grep -v "credentials"
```

### Buscar rutas del menú
```bash
grep -r "url:" frontend-ubold/src/layouts/components/data.ts
```

### Verificar existencia de páginas
```bash
find frontend-ubold/src/app -name "page.tsx" -type f
```

---

**Última actualización:** Diciembre 2024

