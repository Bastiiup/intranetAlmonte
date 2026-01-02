# 🔄 PROMPT DE INTEGRACIÓN: Pedidos y Productos

## 📋 RESUMEN

Este documento contiene las instrucciones completas para integrar los cambios de la rama `mati-integracion` relacionados con **Pedidos** y **Productos** para que todo funcione al 100% sin problemas.

---

## 🎯 OBJETIVO

Integrar todos los cambios de pedidos y productos de la rama `mati-integracion` a la rama principal, asegurando que:
- ✅ Los pedidos se crean correctamente con items y totales
- ✅ Los productos se sincronizan bidireccionalmente con WooCommerce
- ✅ Las descripciones e imágenes aparecen en WooCommerce
- ✅ No hay errores de validación de Strapi

---

## 📦 CAMBIOS PRINCIPALES

### 1. **PEDIDOS (Orders)**
- ✅ Creación de pedidos con items y totales correctos
- ✅ Sincronización con WooCommerce
- ✅ Visualización de pedidos existentes
- ✅ Filtros y búsqueda mejorados

### 2. **PRODUCTOS (Products)**
- ✅ Formulario de agregar producto con tabs (estilo WordPress)
- ✅ Formulario de editar producto con tabs y pre-carga de datos
- ✅ Sincronización bidireccional con WooCommerce
- ✅ Envío de imágenes, descripciones y descripciones cortas
- ✅ Construcción de `raw_woo_data` con formato correcto

---

## 📁 ARCHIVOS MODIFICADOS

### **PEDIDOS**

#### Frontend:
- `frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/atributos/pedidos/components/AddPedidoForm.tsx`
  - Validación de items antes de enviar
  - Logging detallado para debug
  - Manejo de errores mejorado

- `frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/atributos/pedidos/components/PedidosListing.tsx`
  - Filtros mejorados
  - Búsqueda por nombre, número de pedido, fecha
  - Visualización de número de pedido en ID

- `frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/orders/components/OrdersStats.tsx`
  - Mapeo correcto de campos de Strapi
  - Estadísticas basadas en `estado` y `fecha_pedido`

- `frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/atributos/pedidos/page.tsx`
  - Mapeo de datos de Strapi a formato esperado

#### Backend:
- `frontend-ubold/src/app/api/tienda/pedidos/route.ts`
  - Validación de items
  - Cálculo correcto de totales
  - Logging detallado
  - Fix de TypeScript (tipos explícitos en reduce)

---

### **PRODUCTOS**

#### Frontend:

**Agregar Producto:**
- `frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/add-product/page.tsx`
  - Estructura con tabs (General, Inventario, Envío, etc.)
  - Selector de plataformas (Moraleja/Escolar)
  - Editor de texto rico (Quill) para descripciones
  - Construcción de `raw_woo_data` con formato correcto
  - Conversión de descripciones a HTML
  - Manejo de imágenes

**Editar Producto:**
- `frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/edit-product/[id]/page.tsx`
  - Misma estructura que agregar producto
  - Pre-carga de datos desde Strapi
  - Conversión de blocks de Strapi a HTML para Quill
  - Extracción de descripción corta desde `subtitulo_libro`
  - Construcción de `raw_woo_data` con formato correcto

**Componentes de Tabs:**
- `frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/add-product/components/ProductTabs.tsx`
- `frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/add-product/components/tabs/GeneralTab.tsx`
- `frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/add-product/components/tabs/InventarioTab.tsx`
- `frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/add-product/components/tabs/EnvioTab.tsx`
- `frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/add-product/components/tabs/VinculadosTab.tsx`
- `frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/add-product/components/tabs/AtributosTab.tsx`
- `frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/add-product/components/tabs/AvanzadoTab.tsx`
- `frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/add-product/components/PlatformSelector.tsx`

**Otros Componentes:**
- `frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/add-product/components/ProductImage.tsx`
- `frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/products/components/ProductsListing.tsx`
- `frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/products/[productId]/components/ProductDetails.tsx`

#### Backend:
- `frontend-ubold/src/app/api/tienda/productos/route.ts`
  - Creación de productos con `raw_woo_data`
  - Asignación automática de canales (Moraleja y Escolar)
  - Manejo de imágenes
  - Conversión de descripciones

- `frontend-ubold/src/app/api/tienda/productos/[id]/route.ts`
  - Actualización de productos
  - Conversión de HTML a blocks de Strapi
  - Manejo de `raw_woo_data`
  - Validación de campos permitidos

---

## 🔧 PASOS DE INTEGRACIÓN

### **PASO 1: Preparación**

```bash
# 1. Asegúrate de estar en la rama principal
git checkout main
# o
git checkout master

# 2. Actualiza la rama principal
git pull origin main
# o
git pull origin master

# 3. Crea una rama nueva para la integración
git checkout -b integracion-pedidos-productos
```

---

### **PASO 2: Merge de la rama mati-integracion**

```bash
# 1. Merge de la rama con los cambios
git merge mati-integracion

# 2. Si hay conflictos, resuélvelos manualmente
# (Ver sección de conflictos comunes más abajo)
```

---

### **PASO 3: Verificar dependencias**

```bash
# 1. Instalar/actualizar dependencias
cd frontend-ubold
npm install

# 2. Verificar que todas las dependencias estén instaladas
npm list react-quill
npm list react-bootstrap
```

**Dependencias necesarias:**
- `react-quill`: Editor de texto rico para descripciones
- `react-bootstrap`: Componentes de UI (Tabs, Cards, etc.)
- `@types/react-quill`: Tipos TypeScript para Quill

Si faltan, instálalas:
```bash
npm install react-quill react-bootstrap @types/react-quill
```

---

### **PASO 4: Verificar configuración de Strapi**

Asegúrate de que Strapi tenga configurado:

1. **Lifecycles para productos** (`api/libro/content-types/libro/lifecycles.js`):
   - `afterCreate`: Sincroniza con WooCommerce usando `raw_woo_data`
   - `afterUpdate`: Sincroniza cambios con WooCommerce

2. **Campos permitidos en el schema**:
   - `nombre_libro` ✅
   - `descripcion` (blocks) ✅
   - `subtitulo_libro` ✅
   - `isbn_libro` ✅
   - `precio` ✅
   - `precio_oferta` ✅
   - `stock_quantity` ✅
   - `portada_libro` ✅
   - `canales` ✅
   - `estado_publicacion` ✅

3. **Campos NO permitidos** (no incluir en schema):
   - ❌ `descripcion_corta` (se usa solo en `raw_woo_data`)
   - ❌ `raw_woo_data` (se envía pero Strapi lo rechaza, se construye en lifecycles)
   - ❌ `type`, `virtual`, `downloadable`, `reviews_allowed`
   - ❌ `sold_individually`, `manage_stock`, `stock_status`, `backorders`
   - ❌ `weight`, `length`, `width`, `height`, `shipping_class` (verificar si están permitidos)

---

### **PASO 5: Build y verificación**

```bash
# 1. Build del proyecto
cd frontend-ubold
npm run build

# 2. Verificar que no hay errores de TypeScript
# Si hay errores, revisa la sección de "Errores Comunes" más abajo

# 3. Si el build es exitoso, prueba en desarrollo
npm run dev
```

---

### **PASO 6: Pruebas funcionales**

#### **Pruebas de Pedidos:**

1. **Crear un pedido:**
   - Ir a `/atributos/pedidos`
   - Click en "Agregar Pedido"
   - Agregar items con productos
   - Verificar que el total se calcula correctamente
   - Guardar y verificar que aparece en la lista

2. **Verificar sincronización:**
   - Verificar en WooCommerce que el pedido se creó
   - Verificar que los items están correctos
   - Verificar que el total es correcto

#### **Pruebas de Productos:**

1. **Crear un producto:**
   - Ir a `/add-product`
   - Llenar todos los campos (nombre, precio, descripción, etc.)
   - Seleccionar plataformas (Moraleja/Escolar)
   - Subir una imagen
   - Guardar

2. **Verificar en WooCommerce:**
   - Verificar que el producto se creó
   - Verificar que la imagen aparece
   - Verificar que la descripción completa aparece
   - Verificar que la descripción corta aparece

3. **Editar un producto:**
   - Ir a `/products`
   - Click en un producto
   - Click en "Editar Producto Completo"
   - Verificar que los datos se cargan correctamente
   - Modificar descripción o precio
   - Guardar

4. **Verificar sincronización:**
   - Verificar en WooCommerce que los cambios se reflejaron
   - Verificar que las descripciones se actualizaron

---

## ⚠️ CONFLICTOS COMUNES Y SOLUCIONES

### **Conflicto 1: Archivos de configuración**

Si hay conflictos en archivos como `package.json` o `tsconfig.json`:

```bash
# Mantener ambas versiones y luego instalar dependencias
git checkout --theirs package.json
npm install
```

### **Conflicto 2: Archivos de componentes**

Si hay conflictos en componentes:

1. **Revisa ambos lados del conflicto**
2. **Mantén la versión de `mati-integracion` para:**
   - Componentes de productos (tabs, formularios)
   - Componentes de pedidos (formularios, listados)
3. **Mantén la versión de `main` para:**
   - Configuraciones generales
   - Estilos globales (si no afectan productos/pedidos)

### **Conflicto 3: Rutas API**

Si hay conflictos en rutas API:

1. **Mantén TODAS las rutas de `mati-integracion`:**
   - `/api/tienda/pedidos/route.ts`
   - `/api/tienda/productos/route.ts`
   - `/api/tienda/productos/[id]/route.ts`

2. **Si hay rutas nuevas en `main`, agrégalas también**

---

## 🐛 ERRORES COMUNES Y SOLUCIONES

### **Error 1: "Invalid key descripcion_corta"**

**Causa:** Se está enviando `descripcion_corta` directamente a Strapi.

**Solución:**
- ❌ NO enviar `descripcion_corta` en el payload directo
- ✅ Solo incluir en `raw_woo_data`
- ✅ Usar `subtitulo_libro` para Strapi

### **Error 2: "Invalid key raw_woo_data"**

**Causa:** Strapi rechaza `raw_woo_data` porque no está en el schema.

**Solución:**
- Esto es **NORMAL** y **ESPERADO**
- Strapi debe construir `raw_woo_data` en los lifecycles
- El código ya maneja esto correctamente

### **Error 3: "Type error: Parameter 'sum' implicitly has an 'any' type"**

**Causa:** Falta tipo explícito en función `reduce`.

**Solución:**
```typescript
// Cambiar de:
items.reduce((sum, item) => sum + item.total, 0)

// A:
items.reduce((sum: number, item: any) => sum + (item.total || 0), 0)
```

### **Error 4: "Cannot find name 'generarDescripcionCorta'"**

**Causa:** Falta la función helper.

**Solución:**
- Verificar que la función `generarDescripcionCorta` esté definida antes de usarse
- Está en `edit-product/[id]/page.tsx` y `add-product/page.tsx`

### **Error 5: Descripciones no aparecen en WooCommerce**

**Causa:** `raw_woo_data` no se está construyendo correctamente o Strapi no lo está usando.

**Solución:**
1. Verificar en consola del navegador que `raw_woo_data` se construye:
   ```
   [EditProduct] 📝 Descripción completa (HTML): <p>...</p>
   [EditProduct] 📝 Descripción corta (HTML): <p>...</p>
   ```

2. Verificar en logs del backend que se envía:
   ```
   [API PUT] ✅ raw_woo_data incluido en payload
   [API PUT] 📝 Descripción completa: <p>...</p>
   ```

3. Verificar en Strapi que los lifecycles usan `raw_woo_data`:
   - Revisar `api/libro/content-types/libro/lifecycles.js`
   - Debe usar `data.raw_woo_data.description` y `data.raw_woo_data.short_description`

---

## ✅ CHECKLIST DE VERIFICACIÓN

Después de la integración, verifica:

### **Pedidos:**
- [ ] Se pueden crear pedidos con items
- [ ] Los totales se calculan correctamente
- [ ] Los pedidos aparecen en la lista
- [ ] Los pedidos se sincronizan con WooCommerce
- [ ] Los filtros y búsqueda funcionan

### **Productos:**
- [ ] Se pueden crear productos con todos los campos
- [ ] Las imágenes se suben correctamente
- [ ] Las descripciones se guardan correctamente
- [ ] Los productos se sincronizan con WooCommerce
- [ ] Las imágenes aparecen en WooCommerce
- [ ] Las descripciones aparecen en WooCommerce
- [ ] Se pueden editar productos
- [ ] Los datos se cargan correctamente al editar
- [ ] Los cambios se sincronizan con WooCommerce

### **Técnico:**
- [ ] El build compila sin errores
- [ ] No hay errores de TypeScript
- [ ] No hay errores de validación de Strapi
- [ ] Los logs muestran información correcta
- [ ] No hay warnings críticos en consola

---

## 📝 NOTAS IMPORTANTES

### **Sobre `raw_woo_data`:**

1. **Se envía pero Strapi lo rechaza:** Esto es **NORMAL**
   - Strapi no tiene `raw_woo_data` en su schema
   - Se envía para que Strapi lo use en los lifecycles
   - Si Strapi lo rechaza, debe construirlo en los lifecycles

2. **Strapi debe construir `raw_woo_data` en lifecycles:**
   ```javascript
   // En afterCreate y afterUpdate
   if (data.raw_woo_data) {
     // Usar raw_woo_data directamente
     const wooProductData = { ...data.raw_woo_data }
     // Sincronizar con WooCommerce
   } else {
     // Construir raw_woo_data desde campos individuales
     const rawWooData = {
       description: convertirBlocksATexto(data.descripcion),
       short_description: data.subtitulo_libro || '',
       // ... otros campos
     }
   }
   ```

### **Sobre campos permitidos:**

- **SÍ se pueden enviar:**
  - `nombre_libro`, `descripcion`, `subtitulo_libro`
  - `isbn_libro`, `precio`, `precio_oferta`
  - `stock_quantity`, `portada_libro`
  - `canales`, `estado_publicacion`

- **NO se pueden enviar:**
  - `descripcion_corta` (solo en `raw_woo_data`)
  - `type`, `virtual`, `downloadable`
  - `sold_individually`, `manage_stock`, `stock_status`
  - `weight`, `length`, `width`, `height`, `shipping_class` (verificar)

---

## 🚀 DESPLIEGUE

Una vez que todo funciona correctamente:

```bash
# 1. Commit final
git add .
git commit -m "feat: Integración completa de pedidos y productos"

# 2. Push a la rama de integración
git push origin integracion-pedidos-productos

# 3. Crear Pull Request a main/master
# 4. Revisar y aprobar
# 5. Merge a main/master
```

---

## 📞 SOPORTE

Si encuentras problemas durante la integración:

1. **Revisa los logs:**
   - Consola del navegador (F12)
   - Logs del servidor Next.js
   - Logs de Strapi

2. **Verifica la documentación:**
   - `STRAPI-URGENTE-PRODUCTOS-WOOCOMMERCE.md`
   - `DOCUMENTACION-COMPLETA-PEDIDOS.md`

3. **Revisa los commits:**
   ```bash
   git log --oneline mati-integracion
   ```

---

## ✨ RESUMEN FINAL

**Archivos críticos a verificar:**
- ✅ `add-product/page.tsx` - Formulario de agregar
- ✅ `edit-product/[id]/page.tsx` - Formulario de editar
- ✅ `api/tienda/productos/route.ts` - API crear producto
- ✅ `api/tienda/productos/[id]/route.ts` - API actualizar producto
- ✅ `api/tienda/pedidos/route.ts` - API crear pedido
- ✅ Componentes de tabs y formularios

**Configuración crítica:**
- ✅ Strapi lifecycles para productos
- ✅ Dependencias npm instaladas
- ✅ Build sin errores

**Pruebas críticas:**
- ✅ Crear producto → Verificar en WooCommerce
- ✅ Editar producto → Verificar sincronización
- ✅ Crear pedido → Verificar items y totales

---

**¡Éxito con la integración! 🎉**

