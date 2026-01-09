# Contexto de Cambios - Rama Bastian-Intranet

## Resumen
Este documento describe todos los cambios realizados después de clonar la rama base. Es importante mantener estos cambios cuando se mezclen las ramas.

---

## 🔧 CAMBIOS EN INTRANET (Frontend)

### 1. **Corrección de Edición de Obras**
**Archivo:** `src/app/api/tienda/obras/[id]/route.ts`
- **Problema:** Al editar una obra, daba error 404 porque se usaba el `id` numérico en lugar del `documentId` (string) que requiere Strapi para content types con draft/publish.
- **Solución:** 
  - Se obtiene primero la obra de Strapi para conseguir su `documentId`
  - Se usa `documentId` en el endpoint PUT: `/api/obras/${obraDocumentId}`
  - Se mapean correctamente los campos `codigo_obra` y `nombre_obra` según el schema de Strapi
  - Se implementa búsqueda alternativa si falla la búsqueda inicial por ID

### 2. **Corrección de Edición de Marcas**
**Archivo:** `src/app/api/tienda/marca/[id]/route.ts`
- **Problema:** Mismo problema que obras - error 404 al editar porque se usaba `id` en lugar de `documentId`.
- **Solución:** 
  - Misma lógica que obras: obtener `documentId` primero y usarlo en el PUT
  - Mapear correctamente `nombre_marca` a `name` en el body

### 3. **Corrección de Estado de Publicación en Productos**
**Archivos:** 
- `src/app/api/tienda/productos/route.ts` (POST)
- `src/app/api/tienda/productos/[id]/route.ts` (PUT)
- `src/app/(admin)/(apps)/(ecommerce)/products/solicitudes/components/ProductRequestsListing.tsx`

- **Problema:** Strapi requiere valores con mayúscula inicial: "Publicado", "Pendiente", "Borrador" (no "publicado", "pendiente", "borrador").
- **Solución:**
  - En POST: se envía siempre `"Pendiente"` con mayúscula inicial al crear
  - En PUT: se normaliza el estado recibido (convierte a minúscula y luego a mayúscula inicial)
  - En ProductRequestsListing: se envía `"Publicado"`, `"Pendiente"`, `"Borrador"` con mayúscula inicial

### 4. **Guardado de Canales y Relaciones en POST de Productos**
**Archivo:** `src/app/api/tienda/productos/route.ts`
- **Problema CRÍTICO:** Los canales no se estaban guardando al crear productos, por lo que no se sincronizaban con WordPress.
- **Solución:**
  - Se agregó guardado de `canales` (array de documentIds) - **CRÍTICO para sincronización con WordPress**
  - Se agregó guardado de relaciones simples: `obra`, `autor_relacion`, `editorial`, `sello`, `coleccion`
  - Se agregó guardado de relaciones múltiples: `marcas`, `etiquetas`, `categorias_producto`
  - Se agregó guardado de campos numéricos: `numero_edicion`, `agno_edicion`
  - Se agregó guardado de enumeraciones: `idioma`, `tipo_libro`, `estado_edicion`
  - Se agregó guardado de campos WooCommerce: `precio`, `precio_regular`, `precio_oferta`, `stock_quantity`, `manage_stock`, `stock_status`, `weight`, `length`, `width`, `height`, `featured`
  - Se agregaron logs informativos cuando se asignan canales

### 5. **Eliminación de Productos**
**Archivo:** `src/app/api/tienda/productos/[id]/route.ts`
- **Funcionalidad:** Se implementó el método DELETE para productos
- **Lógica:** 
  - Se obtiene el producto primero para verificar `estado_publicacion`
  - Se usa `documentId` para eliminar
  - El lifecycle de Strapi se encarga de eliminar de WooCommerce si `estado_publicacion === "publicado"`

### 6. **Corrección de Campos en ObraDetails**
**Archivo:** `src/app/(admin)/(apps)/(ecommerce)/products/atributos/obras/[obraId]/components/ObraDetails.tsx`
- **Cambio:** Se corrigieron los nombres de campos del formulario para que coincidan con el schema de Strapi:
  - `codigo_obra` (no `codigo`)
  - `nombre_obra` (no `nombre`)

### 7. **Correcciones de Build Errors (Colaboradores)**
**Archivos:**
- `src/app/(admin)/(apps)/colaboradores/components/AddColaboradorForm.tsx`
- `src/app/(admin)/(apps)/colaboradores/components/EditColaboradorForm.tsx`
- `src/app/(admin)/(apps)/colaboradores/components/EditColaboradorModal.tsx`
- `src/app/(admin)/(apps)/colaboradores/components/ColaboradoresListing.tsx`
- `src/app/(admin)/(apps)/colaboradores/[id]/page.tsx`
- `src/app/(admin)/(apps)/colaboradores/agregar/page.tsx`

- **Problemas y Soluciones:**
  1. **Iconos:** `TbSave` y `TbX` no existen en `react-icons/tb`
     - **Solución:** Reemplazados por `LuSave` y `LuX` de `react-icons/lu`
  
  2. **FormSelect:** No existe en `react-bootstrap`
     - **Solución:** Reemplazado por `FormControl as="select"`
  
  3. **PageBreadcrumb:** No acepta prop `items`
     - **Solución:** Reemplazado por `subtitle` prop
  
  4. **DeleteConfirmationModal:** Props incorrectas
     - **Solución:** Cambiado de `title`/`message`/`loading` a `selectedCount`/`itemName`/`modalTitle`/`children`
  
  5. **TypeScript:** `ColaboradorType` no tenía `attributes`
     - **Solución:** Agregado `attributes?: any` a la interfaz

### 8. **Eliminación en ProductsListing**
**Archivo:** `src/app/(admin)/(apps)/(ecommerce)/products/components/ProductsListing.tsx`
- **Cambio:** Se implementó `handleDelete` para llamar al endpoint DELETE de productos
- **Nota:** Se removió prop `loading` de `DeleteConfirmationModal` porque no existe

---

## 🔧 CAMBIOS EN STRAPI (Backend)

### 1. **Mejora de Manejo de Canales en syncToWooCommerce**
**Archivo:** `src/api/libro/services/libro.ts`
- **Cambios:**
  - Se agregó intento de populate profundo si el populate simple no encuentra canales
  - Se mejoraron los logs para mostrar más detalles sobre canales encontrados
  - Se mejoró el mensaje de advertencia cuando no hay canales asignados

### 2. **Corrección de Comparación de estado_publicacion en Lifecycles**
**Archivo:** `src/api/libro/content-types/libro/lifecycles.ts`
- **Problema:** Los lifecycles comparaban `estado_publicacion === 'publicado'` (minúscula), pero Strapi almacena con mayúscula inicial: `"Publicado"`.
- **Solución:**
  - En `afterCreate` y `afterUpdate`: Se normaliza a minúscula antes de comparar: `estadoPublicacionLower === 'publicado'`
  - Se mantiene el valor original con mayúscula inicial para enviarlo a Strapi
  - Se agregó manejo correcto de `estado_publicacion` con inicial mayúscula

### 3. **Lifecycle afterDelete para Productos/Libros**
**Archivo:** `src/api/libro/content-types/libro/lifecycles.ts`
- **Funcionalidad:** Se agregó `afterDelete` lifecycle hook
- **Lógica:**
  - Verifica si existe `result` antes de procesar
  - Verifica si hay otros libros con el mismo `documentId` (draft/publish) y omite si es así
  - Elimina de WooCommerce solo si `estado_publicacion === "publicado"`
  - Busca en todas las instancias de WordPress configuradas

---

## 📋 PUNTOS CRÍTICOS A RECORDAR

1. **documentId vs id:**
   - Para content types con draft/publish habilitado en Strapi, siempre usar `documentId` (string) para operaciones PUT/DELETE
   - El `id` numérico solo sirve para búsquedas, no para updates/deletes

2. **estado_publicacion:**
   - Strapi requiere valores con mayúscula inicial: `"Publicado"`, `"Pendiente"`, `"Borrador"`
   - Los lifecycles deben normalizar a minúscula para comparar: `estadoPublicacion.toLowerCase() === 'publicado'`

3. **Canales:**
   - Los canales son **OBLIGATORIOS** para sincronizar productos con WordPress
   - Sin canales asignados, el producto NO se sincronizará aunque esté en estado "Publicado"
   - El POST de productos DEBE guardar los canales en `strapiProductData.data.canales`

4. **Build Errors Comunes:**
   - No usar `TbSave`/`TbX` - usar `LuSave`/`LuX`
   - No usar `FormSelect` - usar `FormControl as="select"`
   - `PageBreadcrumb` no tiene prop `items` - usar `subtitle`
   - `DeleteConfirmationModal` no tiene prop `loading`

---

## 🔄 FLUJO DE SINCRONIZACIÓN DE PRODUCTOS

1. **Crear Producto:**
   - Frontend envía datos incluyendo `canales` (array de documentIds)
   - POST guarda en Strapi con `estado_publicacion = "Pendiente"`
   - **IMPORTANTE:** Los canales se guardan en `strapiProductData.data.canales`

2. **Publicar Producto:**
   - Desde "Solicitudes de productos", se cambia estado a `"Publicado"` (con mayúscula inicial)
   - PUT actualiza en Strapi
   - Lifecycle `afterUpdate` detecta `estado_publicacion = "Publicado"` (después de normalizar)
   - Se sincroniza a WordPress solo si tiene canales asignados

3. **Eliminar Producto:**
   - DELETE en frontend llama a API
   - API elimina de Strapi usando `documentId`
   - Lifecycle `afterDelete` elimina de WooCommerce solo si `estado_publicacion === "publicado"`

---

## ⚠️ ADVERTENCIAS

- **NO** remover los logs de canales - son críticos para debugging
- **NO** cambiar la lógica de normalización de `estado_publicacion` sin verificar ambos lados (frontend y backend)
- **NO** usar `id` numérico para PUT/DELETE en content types con draft/publish - siempre usar `documentId`
- **NO** olvidar que los canales son obligatorios para sincronización con WordPress

---

## 📝 ARCHIVOS MODIFICADOS

### Frontend (Intranet):
- `src/app/api/tienda/obras/[id]/route.ts`
- `src/app/api/tienda/marca/[id]/route.ts`
- `src/app/api/tienda/productos/route.ts`
- `src/app/api/tienda/productos/[id]/route.ts`
- `src/app/(admin)/(apps)/(ecommerce)/products/atributos/obras/[obraId]/components/ObraDetails.tsx`
- `src/app/(admin)/(apps)/(ecommerce)/products/components/ProductsListing.tsx`
- `src/app/(admin)/(apps)/(ecommerce)/products/solicitudes/components/ProductRequestsListing.tsx`
- `src/app/(admin)/(apps)/colaboradores/components/*.tsx` (múltiples archivos)
- `src/app/(admin)/(apps)/colaboradores/[id]/page.tsx`
- `src/app/(admin)/(apps)/colaboradores/agregar/page.tsx`

### Backend (Strapi):
- `src/api/libro/services/libro.ts`
- `src/api/libro/content-types/libro/lifecycles.ts`

---

**Fecha de creación:** 2025-12-23
**Última actualización:** 2025-12-23

