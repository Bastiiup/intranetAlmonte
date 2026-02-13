# Guía de Integración - Rama `mati-integracion`

## 📋 Resumen Ejecutivo

Esta rama contiene mejoras críticas en la sincronización de productos entre WooCommerce y Strapi, así como correcciones importantes en el flujo de creación de pedidos. Los cambios son **backward compatible** y no requieren migraciones de base de datos.

**Rama:** `mati-integracion`  
**Commits:** 3 commits nuevos  
**Archivos modificados:** 6 archivos  
**Archivos nuevos:** 1 archivo

---

## 🎯 Objetivo de los Cambios

Resolver problemas críticos en:
1. **Selector de productos en pedidos:** Solo mostraba 1 producto al seleccionar canal "Escolar"
2. **Sincronización de productos:** Faltaba sincronización bidireccional (Strapi → WooCommerce)
3. **Validación de precios:** Productos con `price: "0"` pero `regular_price` válido eran rechazados
4. **Limpieza de estado:** Productos no se limpiaban al cambiar de plataforma en pedidos
5. **Extracción de PDF con IA:** Nueva funcionalidad para extraer productos de PDFs de listas de útiles usando Google Gemini AI

---

## 📦 Cambios Incluidos

### Commit 1: `e63f09c1` - feat: Mejorar sincronización de productos y selector de productos en pedidos

**Archivos modificados:**
- `src/app/(admin)/(apps)/(ecommerce)/atributos/pedidos/components/ProductSelector.tsx`
- `src/app/(admin)/(apps)/(ecommerce)/atributos/pedidos/components/PedidosListing.tsx`
- `src/app/(admin)/(apps)/(ecommerce)/products/components/ProductsTabs.tsx`
- `src/app/api/woocommerce/products/route.ts`
- `src/app/api/tienda/productos/sync/route.ts` (NUEVO)

**Cambios principales:**
- ✅ Paginación automática en ProductSelector (carga todos los productos, no solo 100)
- ✅ Validación mejorada de precios (usa `regular_price` como fallback)
- ✅ Sincronización bidireccional: WooCommerce ↔ Strapi
- ✅ Nuevo botón "A WooCommerce" en página de productos
- ✅ Corrección de warning de React (key prop en Fragment)

### Commit 2: `0168bd6e` - fix: Corregir error de TypeScript en ProductSelector

**Archivos modificados:**
- `src/app/(admin)/(apps)/(ecommerce)/atributos/pedidos/components/ProductSelector.tsx`

**Cambios principales:**
- ✅ Eliminada verificación redundante que causaba error de TypeScript en build

### Commit 3: `fada5029` - fix: Limpiar productos seleccionados al cambiar plataforma en pedidos

**Archivos modificados:**
- `src/app/(admin)/(apps)/(ecommerce)/atributos/pedidos/components/AddPedidoForm.tsx`

**Cambios principales:**
- ✅ Limpieza automática de productos seleccionados al cambiar plataforma
- ✅ Previene conflictos al mezclar productos de diferentes plataformas

### Commit 4: `[NUEVO]` - feat: Extracción de productos desde PDF con Gemini AI

**Archivos nuevos:**
- `src/app/(admin)/(apps)/crm/listas/[id]/validacion/page.tsx`
- `src/app/(admin)/(apps)/crm/listas/[id]/validacion/components/ValidacionLista.tsx`
- `src/app/api/crm/listas/[id]/route.ts`
- `src/app/api/crm/listas/[id]/procesar-pdf/route.ts`
- `src/app/api/crm/listas/test-gemini/route.ts`
- `DOCUMENTACION-EXTRACCION-PDF-ACTUAL.md`
- `GEMINI-AI-CONFIG.md`

**Archivos modificados:**
- `src/app/(admin)/(apps)/crm/listas/components/ListasListing.tsx` (navegación al hacer clic en curso)

**Cambios principales:**
- ✅ Nueva página de validación de listas (`/crm/listas/[id]/validacion`)
- ✅ Visualizador de PDF integrado con `react-pdf`
- ✅ Extracción automática de productos desde PDF usando Google Gemini AI
- ✅ Validación automática de productos contra WooCommerce Escolar
- ✅ Enriquecimiento de productos con datos de WooCommerce (precio, stock, imagen)
- ✅ Interfaz dividida: productos a la izquierda, PDF a la derecha
- ✅ Endpoint de prueba para verificar modelos disponibles de Gemini

---

## 🔍 Revisión de Código

### Puntos Críticos a Revisar

#### 1. **ProductSelector.tsx - Paginación Automática**
```typescript
// Líneas 52-127: Nueva lógica de paginación
while (hasMore) {
  const url = `/api/woocommerce/products?platform=${platformParam}&per_page=${perPage}&page=${page}`
  // ... carga todas las páginas
}
```
**Verificar:** Que no cause problemas de rendimiento con muchos productos (1000+)

#### 2. **sync/route.ts - Nueva Función `syncProductsToWooCommerce()`**
```typescript
// Líneas 219-380: Sincronización desde Strapi a WooCommerce
async function syncProductsToWooCommerce(platform: 'woo_moraleja' | 'woo_escolar')
```
**Verificar:** 
- Manejo de errores en creación de productos
- Conversión correcta de Rich Text blocks a HTML
- Manejo de imágenes desde Strapi

#### 3. **AddPedidoForm.tsx - Limpieza de Estado**
```typescript
// Líneas 1348-1357: Limpieza al cambiar plataforma
if (previousPlatform !== value) {
  setSelectedProducts([])
}
```
**Verificar:** Que no cause pérdida de datos no intencional

---

## 🧪 Checklist de Pruebas

### Antes de Integrar

- [ ] **Build exitoso:** `npm run build` compila sin errores
- [ ] **TypeScript:** No hay errores de tipos
- [ ] **Linter:** No hay warnings críticos

### Pruebas Funcionales

#### 1. Selector de Productos en Pedidos
- [ ] Ir a `/atributos/pedidos/agregar`
- [ ] Seleccionar "WooCommerce Escolar"
- [ ] Clic en "Agregar Productos"
- [ ] **Verificar:** Aparecen TODOS los productos de Escolar (no solo 1)
- [ ] Seleccionar algunos productos
- [ ] Cambiar a "WooCommerce Moraleja"
- [ ] **Verificar:** Los productos seleccionados se limpian automáticamente
- [ ] Seleccionar productos de Moraleja
- [ ] **Verificar:** Se pueden agregar correctamente

#### 2. Validación de Precios
- [ ] Buscar un producto con `price: "0"` pero `regular_price: "5000"`
- [ ] Intentar agregarlo al pedido
- [ ] **Verificar:** Se agrega correctamente usando `regular_price`

#### 3. Sincronización desde WooCommerce a Strapi
- [ ] Ir a `/products`
- [ ] Clic en botón "Desde WooCommerce"
- [ ] **Verificar:** Se muestran productos encontrados, creados y omitidos
- [ ] **Verificar:** Los productos nuevos aparecen en la lista

#### 4. Sincronización desde Strapi a WooCommerce
- [ ] Ir a `/products`
- [ ] Verificar que hay productos con canal "Escolar" y estado "Publicado"
- [ ] Clic en botón "A WooCommerce"
- [ ] **Verificar:** Se crean productos en WooCommerce Escolar
- [ ] **Verificar:** Los productos aparecen en el selector de pedidos

#### 5. PedidosListing - Warning de React
- [ ] Ir a `/atributos/pedidos`
- [ ] Abrir consola del navegador (F12)
- [ ] **Verificar:** No hay warnings sobre "key" prop en Fragment

#### 6. Extracción de PDF con IA
- [ ] Ir a `/crm/listas`
- [ ] Hacer clic en el nombre de un curso que tenga PDF
- [ ] **Verificar:** Se navega a `/crm/listas/[id]/validacion`
- [ ] **Verificar:** El PDF se muestra correctamente en el lado derecho
- [ ] **Verificar:** Si hay productos, se muestran en la tabla del lado izquierdo
- [ ] Hacer clic en "Procesar con IA"
- [ ] **Verificar:** Se muestra spinner de carga
- [ ] **Verificar:** Después del procesamiento, los productos aparecen en la tabla
- [ ] **Verificar:** Los productos encontrados en WooCommerce muestran precio, stock y disponibilidad
- [ ] **Verificar:** Los productos no encontrados muestran badge "No Encontrado"
- [ ] Hacer clic en "Recargar" para verificar que los datos persisten

---

## 🔄 Proceso de Integración

### Opción 1: Merge Directo (Recomendado si no hay conflictos)

```bash
# Desde la rama main
git checkout main
git pull origin main

# Integrar rama mati-integracion
git merge mati-integracion

# Resolver conflictos si los hay (ver sección de conflictos)
# Luego hacer push
git push origin main
```

### Opción 2: Rebase (Si prefieres historial lineal)

```bash
# Desde la rama main
git checkout main
git pull origin main

# Rebase de mati-integracion
git checkout mati-integracion
git rebase main

# Resolver conflictos si los hay
# Luego merge a main
git checkout main
git merge mati-integracion
git push origin main
```

### Opción 3: Pull Request (Recomendado para revisión)

1. Crear Pull Request desde `mati-integracion` a `main`
2. Revisar cambios en GitHub/GitLab
3. Ejecutar pruebas automatizadas si existen
4. Revisar código
5. Aprobar y mergear

---

## ⚠️ Posibles Conflictos

### Archivos que podrían tener conflictos:

1. **`src/app/api/tienda/productos/sync/route.ts`** (NUEVO)
   - **Probabilidad:** Baja (archivo nuevo)
   - **Resolución:** Si existe, mantener ambas versiones o mergear manualmente

2. **`src/app/(admin)/(apps)/(ecommerce)/products/components/ProductsTabs.tsx`**
   - **Probabilidad:** Media
   - **Resolución:** Mergear cambios de botones de sincronización

3. **`src/app/(admin)/(apps)/(ecommerce)/atributos/pedidos/components/ProductSelector.tsx`**
   - **Probabilidad:** Media
   - **Resolución:** Mergear lógica de paginación y validación de precios

4. **`src/app/(admin)/(apps)/crm/listas/components/ListasListing.tsx`**
   - **Probabilidad:** Media
   - **Resolución:** Mergear cambios de navegación (link en nombre del curso)

### Cómo Resolver Conflictos:

```bash
# Si hay conflictos durante merge
git status  # Ver archivos con conflictos

# Editar archivos manualmente buscando marcadores:
# <<<<<<< HEAD
# (código de main)
# =======
# (código de mati-integracion)
# >>>>>>> mati-integracion

# Después de resolver:
git add <archivo-resuelto>
git commit  # Completar el merge
```

---

## 📝 Notas Post-Integración

### Después de Integrar

1. **Probar en desarrollo:**
   ```bash
   npm run dev
   # Probar todas las funcionalidades del checklist
   ```

2. **Verificar build de producción:**
   ```bash
   npm run build
   # Asegurarse de que compila correctamente
   ```

3. **Actualizar documentación si es necesario:**
   - El archivo `CAMBIOS-SINCRONIZACION-PRODUCTOS.md` contiene documentación completa
   - Considerar agregar a documentación principal del proyecto

4. **Comunicar cambios al equipo:**
   - Nuevos botones en `/products`
   - Cambios en flujo de creación de pedidos
   - Nueva funcionalidad de sincronización bidireccional

---

## 🐛 Problemas Conocidos y Limitaciones

### Limitaciones Actuales:

1. **Rendimiento con muchos productos:**
   - La paginación automática puede ser lenta si hay 1000+ productos
   - **Solución futura:** Implementar carga lazy o virtualización

2. **Sincronización de imágenes:**
   - Las imágenes deben estar accesibles públicamente
   - URLs relativas de Strapi pueden no funcionar

3. **Productos sin SKU:**
   - Se generan SKUs automáticos que pueden causar duplicados
   - **Recomendación:** Asegurar que todos los productos tengan SKU único

### Mejoras Futuras Sugeridas:

1. Sincronización incremental (solo productos modificados)
2. Sincronización de variaciones de productos
3. Manejo de errores más granular con retry logic
4. Notificaciones en tiempo real del progreso de sincronización

---

## 📞 Contacto y Soporte

Si encuentras problemas durante la integración:

1. **Revisar logs:**
   - Consola del navegador (F12) para errores frontend
   - Logs del servidor para errores backend

2. **Verificar variables de entorno:**
   - Credenciales de WooCommerce (Escolar y Moraleja)
   - URL de Strapi
   - Variables de autenticación
   - `GEMINI_API_KEY` (requerida para extracción de PDF)

3. **Consultar documentación:**
   - `CAMBIOS-SINCRONIZACION-PRODUCTOS.md` para detalles técnicos de sincronización
   - `DOCUMENTACION-EXTRACCION-PDF-ACTUAL.md` para detalles de extracción de PDF
   - `GEMINI-AI-CONFIG.md` para configuración de Gemini AI
   - Código comentado en los archivos modificados

4. **Probar modelos de Gemini:**
   - Visitar `http://localhost:3000/api/crm/listas/test-gemini`
   - Verificar qué modelos están disponibles
   - Si ningún modelo funciona, verificar API key en Google AI Studio

---

## ✅ Checklist Final de Integración

- [ ] Código revisado y aprobado
- [ ] Build exitoso (`npm run build`)
- [ ] Todas las pruebas funcionales pasadas
- [ ] Sin errores de TypeScript
- [ ] Sin warnings críticos de React
- [ ] Conflictos resueltos (si los hubo)
- [ ] Merge completado a `main`
- [ ] Probado en entorno de desarrollo
- [ ] Documentación actualizada
- [ ] Equipo notificado de los cambios

---

## 📊 Estadísticas de Cambios

- **Líneas agregadas:** ~3,500+
- **Líneas eliminadas:** ~89
- **Archivos modificados:** 7
- **Archivos nuevos:** 8 (sync/route.ts, validación de PDF, API routes, documentación)
- **Tiempo estimado de revisión:** 60-90 minutos
- **Tiempo estimado de pruebas:** 40-60 minutos

### Desglose por Funcionalidad:
- **Sincronización de productos:** ~1,074 líneas
- **Extracción de PDF con IA:** ~2,400 líneas
- **Documentación:** ~500 líneas

---

## 🎉 Beneficios de la Integración

1. ✅ **Mejor UX:** Los usuarios pueden ver todos los productos al crear pedidos
2. ✅ **Sincronización completa:** Productos se sincronizan en ambas direcciones
3. ✅ **Menos errores:** Validación mejorada de precios previene problemas
4. ✅ **Código más limpio:** Warnings de React corregidos
5. ✅ **Mejor mantenibilidad:** Código documentado y estructurado
6. ✅ **Automatización:** Extracción automática de productos desde PDFs con IA
7. ✅ **Validación inteligente:** Validación automática contra WooCommerce Escolar
8. ✅ **Ahorro de tiempo:** No es necesario ingresar productos manualmente desde PDFs

---

## 🔑 Variables de Entorno Requeridas

Agregar en `.env.local`:

```env
# Gemini AI (requerida para extracción de PDF)
GEMINI_API_KEY=tu_api_key_aqui

# WooCommerce (ya existentes)
NEXT_PUBLIC_WOOCOMMERCE_URL=...
WOOCOMMERCE_CONSUMER_KEY=...
WOOCOMMERCE_CONSUMER_SECRET=...

# Strapi (ya existentes)
NEXT_PUBLIC_STRAPI_URL=...
STRAPI_API_TOKEN=...
```

**Nota:** La API key de Gemini está hardcodeada como fallback, pero se recomienda usar la variable de entorno.

---

**Última actualización:** Enero 2025  
**Autor de los cambios:** Mati  
**Rama:** `mati-integracion`
