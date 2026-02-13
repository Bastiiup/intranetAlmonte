# 📋 CONTEXTO COMPLETO: Sistema de Validación de Listas de Útiles Escolares

## 🎯 OBJETIVO DEL SISTEMA

Sistema para procesar, validar y aprobar listas de útiles escolares desde PDFs usando Claude AI (Anthropic), con destacado visual en el PDF y gestión de estados de revisión.

---

## 📊 ESTRUCTURA DE DATOS EN STRAPI

### Content Type: `Curso`

```typescript
interface Curso {
  id: number
  documentId: string
  nombre_curso: string
  nivel: 'Basica' | 'Media'
  grado: number
  anio: number
  paralelo?: string
  colegio: Relation (manyToOne)
  
  // ⚠️ IMPORTANTE: versiones_materiales es un campo JSON, NO una relación
  versiones_materiales: Array<VersionMateriales>
  
  // Estados de revisión (pueden no existir en Strapi)
  estado_revision?: 'borrador' | 'revisado' | 'publicado' | null
  fecha_revision?: string | null
  fecha_publicacion?: string | null
}
```

### Estructura de `versiones_materiales` (Campo JSON)

```typescript
interface VersionMateriales {
  id: number | string
  nombre_archivo: string
  fecha_subida: string
  fecha_actualizacion: string
  pdf_id: number | string
  pdf_url: string
  materiales: Array<Material>
}

interface Material {
  id: string | number
  nombre: string
  cantidad: number
  marca?: string
  isbn?: string
  precio?: number
  asignatura?: string
  descripcion?: string
  comprar: boolean
  aprobado: boolean  // ✅ Campo clave para validación
  fecha_aprobacion?: string
  
  // Coordenadas para destacado en PDF
  coordenadas?: {
    pagina: number
    posicion_x?: number  // Porcentaje (0-100)
    posicion_y?: number  // Porcentaje (0-100)
    region?: 'superior' | 'centro' | 'inferior'
  }
  
  // Información de WooCommerce
  woocommerce_id?: number
  woocommerce_sku?: string
  encontrado_en_woocommerce?: boolean
  disponibilidad?: 'disponible' | 'no_disponible' | 'no_encontrado'
  precio_woocommerce?: number
  stock_quantity?: number
}
```

---

## 🔄 FLUJO COMPLETO DEL SISTEMA

### 1. PROCESAMIENTO DE PDF CON CLAUDE AI

**Endpoint:** `POST /api/crm/listas/[id]/procesar-pdf`

#### Proceso:

1. **Descarga del PDF desde Strapi**
   ```typescript
   const pdfUrl = `${STRAPI_URL}${pdfPath}`
   const pdfResponse = await fetch(pdfUrl)
   const pdfBuffer = await pdfResponse.arrayBuffer()
   ```

2. **Extracción de texto con `pdf-parse`**
   - Usa polyfills para `DOMMatrix`, `Path2D`, `AbortException` (requeridos por `pdfjs-dist`)
   - Fallback de 3 niveles si `pdf-parse` falla:
     - Intento 1: `pdf-parse` (método principal)
     - Intento 2: Extracción básica del buffer (patrones de texto)
     - Intento 3: Extracción de streams del PDF

3. **Envío a Claude AI**
   - Prompt estructurado con reglas de extracción
   - Validación con Zod schema
   - Retry automático en caso de errores de validación
   - Manejo de rate limits (HTTP 429)

4. **Generación de coordenadas aproximadas**
   ```typescript
   // Algoritmo mejorado para distribución precisa
   const productosEstimadosPorPagina = Math.max(Math.ceil(totalProductos / totalPaginas), 8)
   const paginaCalculada = Math.min(Math.floor(i / productosEstimadosPorPagina) + 1, totalPaginas)
   
   // Distribución vertical uniforme
   const margenSuperior = 18  // Encabezado
   const margenInferior = 88  // Pie de página
   const espaciamiento = (margenInferior - margenSuperior) / (productosEstimadosPorPagina + 1)
   const posicionY = margenSuperior + (posicionEnPagina + 1) * espaciamiento
   
   // Posición X variada (20% a 80% del ancho)
   const posicionX = 20 + (Math.random() * 60)
   ```

5. **Búsqueda en WooCommerce**
   - Busca cada producto por nombre
   - Si encuentra: marca como `encontrado_en_woocommerce: true`
   - Si no encuentra: marca como `encontrado_en_woocommerce: false`

6. **Guardado en Strapi**
   ```typescript
   // Actualizar versiones_materiales con los nuevos materiales
   const updateData = {
     data: {
       versiones_materiales: versionesActualizadas
     }
   }
   await strapiClient.put(`/api/cursos/${cursoDocumentId}`, updateData)
   ```

---

### 2. DESTACADO EN EL PDF VIEWER

**Componente:** `ValidacionLista.tsx`

#### Cómo funciona:

1. **Al hacer click en un producto de la tabla:**
   ```typescript
   const handleProductoClick = (productoId: string | number) => {
     const producto = productos.find(p => p.id === productoId)
     setSelectedProduct(productoId)
     setSelectedProductData(producto)
     
     // Navegar a la página del producto
     if (producto.coordenadas?.pagina) {
       setPageNumber(producto.coordenadas.pagina)
     }
   }
   ```

2. **Renderizado del destacado:**
   ```typescript
   {selectedProductData?.coordenadas && 
    selectedProductData.coordenadas.pagina === pageNumber && (
     <>
       {/* Resaltado amarillo */}
       <div style={{
         position: 'absolute',
         left: `${selectedProductData.coordenadas.posicion_x}%`,
         top: `${selectedProductData.coordenadas.posicion_y}%`,
         width: `${Math.min(selectedProductData.nombre.length * 0.75 + 5, 45)}%`,
         height: '30px',
         backgroundColor: 'rgba(255, 235, 59, 0.7)',
         transform: 'translate(-50%, -50%)',
         animation: 'pulse 2s ease-in-out infinite'
       }} />
       
       {/* Etiqueta con nombre */}
       <div style={{
         position: 'absolute',
         top: `${selectedProductData.coordenadas.posicion_y}%`,
         left: `${selectedProductData.coordenadas.posicion_x}%`,
         transform: 'translate(-50%, calc(-100% - 12px))',
         backgroundColor: 'rgba(255, 193, 7, 0.98)',
         padding: '6px 14px',
         borderRadius: '6px'
       }}>
         📍 {selectedProductData.nombre}
       </div>
       
       {/* Punto rojo en coordenadas exactas */}
       <div style={{
         position: 'absolute',
         left: `${selectedProductData.coordenadas.posicion_x}%`,
         top: `${selectedProductData.coordenadas.posicion_y}%`,
         width: '10px',
         height: '10px',
         backgroundColor: '#FF6F00',
         borderRadius: '50%',
         transform: 'translate(-50%, -50%)'
       }} />
     </>
   )}
   ```

#### ⚠️ PROBLEMA ACTUAL:

- Las coordenadas son **aproximadas** (generadas algorítmicamente)
- No son coordenadas reales extraídas del PDF
- El destacado puede no ser exacto

#### ✅ SOLUCIÓN PENDIENTE:

- Implementar OCR real o extracción de coordenadas precisas del PDF
- Alternativa: Permitir ajuste manual de coordenadas por el usuario

---

### 3. APROBACIÓN DE PRODUCTOS Y LISTAS

#### A. Aprobar Producto Individual

**Endpoint:** `POST /api/crm/listas/[id]/aprobar-producto`

```typescript
// Busca el producto en versiones_materiales
const material = ultimaVersion.materiales.find(m => 
  m.id === productoId || 
  m.nombre === nombreProducto ||
  materiales.indexOf(m) === indiceProducto
)

// Actualiza el estado
material.aprobado = !material.aprobado
material.fecha_aprobacion = new Date().toISOString()

// Si todos están aprobados, actualiza estado_revision
if (todosAprobados) {
  cursoData.data.estado_revision = 'revisado'
  cursoData.data.fecha_revision = new Date().toISOString()
}
```

#### B. Aprobar Lista Completa

**Endpoint:** `POST /api/crm/listas/aprobar-lista`

```typescript
// 1. Obtener curso desde Strapi
const curso = await strapiClient.get(`/api/cursos/${listaId}`)

// 2. Obtener última versión de materiales
const versiones = curso.attributes.versiones_materiales || []
const ultimaVersion = versiones.sort((a, b) => 
  new Date(b.fecha_actualizacion) - new Date(a.fecha_actualizacion)
)[0]

// 3. Aprobar todos los materiales
const materialesAprobados = ultimaVersion.materiales.map(m => ({
  ...m,
  aprobado: true,
  fecha_aprobacion: new Date().toISOString()
}))

// 4. Actualizar versión
const versionesActualizadas = versiones.map(v => 
  v === ultimaVersion 
    ? { ...v, materiales: materialesAprobados }
    : v
)

// 5. Guardar en Strapi (2 llamadas separadas)
// Llamada 1: Actualizar versiones_materiales
await strapiClient.put(`/api/cursos/${cursoDocumentId}`, {
  data: { versiones_materiales: versionesActualizadas }
})

// Llamada 2: Actualizar estado_revision (puede fallar si el campo no existe)
try {
  await strapiClient.put(`/api/cursos/${cursoDocumentId}`, {
    data: {
      estado_revision: 'revisado',
      fecha_revision: new Date().toISOString()
    }
  })
} catch (error) {
  // No crítico - solo loguear
  console.warn('No se pudo actualizar estado_revision')
}

// 6. Revalidar rutas de Next.js
revalidatePath(`/crm/listas/${cursoDocumentId}/validacion`)
revalidatePath(`/crm/listas/colegio/${colegioId}`)
revalidatePath('/crm/listas')
```

---

### 4. VISUALIZACIÓN DEL ESTADO EN EL LISTADO

**Página:** `/crm/listas/colegio/[colegioId]`

#### Cómo se obtiene el estado:

1. **Endpoint:** `GET /api/crm/colegios/[id]/cursos`
   ```typescript
   // NO usar fields[] específicos para obtener TODOS los campos
   const paramsObj = new URLSearchParams({
     'filters[colegio][id][$eq]': String(colegioIdNum),
     'populate[colegio]': 'true',
     'publicationState': 'preview',
   })
   ```

2. **Mapeo en `page.tsx`:**
   ```typescript
   const estadoRevision = attrs.estado_revision || curso.estado_revision || null
   
   const cursoMapeado = {
     // ... otros campos
     estado_revision: estadoRevision,
     fecha_revision: attrs.fecha_revision || curso.fecha_revision || null,
     fecha_publicacion: attrs.fecha_publicacion || curso.fecha_publicacion || null,
   }
   ```

3. **Visualización en `CursosColegioListing.tsx`:**
   ```typescript
   const estado = row.original.estado_revision
   
   if (estado === 'publicado') {
     badgeBg = 'success'
     badgeText = '✓ Lista para Exportar'
   } else if (estado === 'revisado') {
     badgeBg = 'info'
     badgeText = '👁 En Revisión'
   } else if (estado === 'borrador') {
     badgeBg = 'warning'
     badgeText = '✏ Borrador'
   } else {
     badgeBg = 'secondary'
     badgeText = '✗ Sin Validar'
   }
   ```

---

## 🔧 PROBLEMAS PENDIENTES Y SOLUCIONES

### ❌ PROBLEMA 1: Coordenadas aproximadas (destacado no exacto)

**Causa:** Las coordenadas se generan algorítmicamente, no se extraen del PDF real.

**Solución propuesta:**
1. **Opción A:** Implementar OCR real con `tesseract.js` o similar
2. **Opción B:** Permitir ajuste manual de coordenadas por el usuario
3. **Opción C:** Mejorar el algoritmo de distribución basándose en patrones comunes de PDFs

**Estado:** Pendiente

---

### ❌ PROBLEMA 2: `estado_revision` puede no existir en Strapi

**Causa:** El campo `estado_revision` puede no estar definido en el schema de Strapi.

**Solución actual:**
- Se intenta actualizar en una llamada separada
- Si falla, no es crítico (solo se loguea el error)
- La aprobación de productos funciona independientemente

**Solución recomendada:**
- Agregar el campo `estado_revision` al Content Type `Curso` en Strapi
- Tipo: Enumeration con valores: `borrador`, `revisado`, `publicado`
- Agregar también `fecha_revision` y `fecha_publicacion` (Date)

**Estado:** Funciona con fallback, pero idealmente debería existir en Strapi

---

### ❌ PROBLEMA 3: Botón "Aprobar Lista Completa" se corta

**Causa:** Restricciones de CSS en contenedores con `overflow: hidden`.

**Solución aplicada:**
- Agregado `overflow: 'visible'` a todos los contenedores relevantes
- Cambiado `minWidth: 'fit-content'` a `minWidth: 'max-content'`
- Agregado `flexShrink: 0` para evitar que se encoja
- Reducido tamaño de fuente e iconos

**Estado:** Corregido (pendiente verificación)

---

### ❌ PROBLEMA 4: Estado no se actualiza después de aprobar

**Causa:** El caché de Next.js no se invalida correctamente.

**Solución aplicada:**
- `revalidatePath` después de aprobar
- `router.refresh()` en el frontend
- Redirección automática con timestamp para evitar caché

**Estado:** Corregido (pendiente verificación)

---

## 📁 ARCHIVOS CLAVE DEL SISTEMA

### Backend (API Routes)

1. **`src/app/api/crm/listas/[id]/procesar-pdf/route.ts`**
   - Procesa PDFs con Claude AI
   - Genera coordenadas aproximadas
   - Busca productos en WooCommerce
   - Guarda materiales en Strapi

2. **`src/app/api/crm/listas/[id]/aprobar-producto/route.ts`**
   - Aprueba/desaprueba productos individuales
   - Actualiza `estado_revision` si todos están aprobados

3. **`src/app/api/crm/listas/aprobar-lista/route.ts`**
   - Aprueba todos los productos de una lista
   - Actualiza `estado_revision` a `'revisado'`
   - Revalida rutas de Next.js

4. **`src/app/api/crm/listas/[id]/route.ts`**
   - Obtiene datos completos de un curso
   - Normaliza datos de Strapi (extrae de `attributes` si existe)
   - NO usa `fields[]` específicos para obtener todos los campos

5. **`src/app/api/crm/colegios/[id]/cursos/route.ts`**
   - Obtiene todos los cursos de un colegio
   - NO usa `fields[]` específicos para incluir `estado_revision`

### Frontend (Components)

1. **`src/app/(admin)/(apps)/crm/listas/[id]/validacion/components/ValidacionLista.tsx`**
   - Componente principal de validación
   - Muestra tabla de productos
   - PDF viewer con destacado
   - Botones de aprobación
   - Badge de estado en header

2. **`src/app/(admin)/(apps)/crm/listas/colegio/[colegioId]/components/CursosColegioListing.tsx`**
   - Listado de cursos del colegio
   - Columna "ESTADO" con badges de estado
   - Filtros por año

3. **`src/app/(admin)/(apps)/crm/listas/colegio/[colegioId]/page.tsx`**
   - Página del listado de cursos
   - Mapea datos de Strapi
   - Prioriza estado_revision al combinar cursos duplicados

---

## 🎨 ESTRUCTURA DE COORDENADAS

```typescript
interface CoordenadasProducto {
  pagina: number              // Página del PDF (1-indexed)
  posicion_x?: number         // Porcentaje horizontal (0-100)
  posicion_y?: number         // Porcentaje vertical (0-100)
  region?: 'superior' | 'centro' | 'inferior'
}
```

### Algoritmo de generación:

```typescript
// 1. Calcular productos por página
const productosEstimadosPorPagina = Math.max(
  Math.ceil(totalProductos / totalPaginas), 
  8
)

// 2. Determinar página
const paginaCalculada = Math.min(
  Math.floor(indiceProducto / productosEstimadosPorPagina) + 1,
  totalPaginas
)

// 3. Distribución vertical
const margenSuperior = 18  // % desde arriba (encabezado)
const margenInferior = 88  // % desde arriba (pie de página)
const rangoUtil = margenInferior - margenSuperior
const espaciamiento = rangoUtil / (productosEstimadosPorPagina + 1)
const posicionY = margenSuperior + (posicionEnPagina + 1) * espaciamiento

// 4. Distribución horizontal (variada)
const posicionX = 20 + (Math.random() * 60)  // 20% a 80%

// 5. Determinar región
let region = 'centro'
if (posicionY < 35) region = 'superior'
else if (posicionY > 65) region = 'inferior'
```

---

## 🔄 FLUJO DE APROBACIÓN COMPLETO

```
1. Usuario abre página de validación
   ↓
2. Sistema carga productos desde versiones_materiales
   ↓
3. Usuario aprueba productos individuales (opcional)
   ↓
4. Usuario hace click en "Aprobar Lista Completa"
   ↓
5. Sistema aprueba todos los productos
   ↓
6. Sistema actualiza estado_revision a 'revisado'
   ↓
7. Sistema revalida rutas de Next.js
   ↓
8. Sistema redirige al listado del colegio
   ↓
9. Listado muestra estado "👁 En Revisión"
```

---

## ⚠️ NOTAS IMPORTANTES

1. **`versiones_materiales` es un campo JSON, NO una relación**
   - NO usar `populate[versiones_materiales]` en Strapi
   - Se devuelve automáticamente si no se especifican `fields[]` específicos

2. **`estado_revision` puede no existir en Strapi**
   - El sistema funciona sin él
   - Idealmente debería agregarse al schema de Strapi

3. **Coordenadas son aproximadas**
   - No son coordenadas reales del PDF
   - El destacado puede no ser exacto
   - Pendiente: Implementar OCR o ajuste manual

4. **Normalización de datos de Strapi**
   - Strapi v5 devuelve datos en `attributes`
   - El sistema normaliza automáticamente:
     ```typescript
     const cursoNormalizado = curso?.attributes ? {
       ...curso.attributes,
       id: curso.id,
       documentId: curso.documentId,
     } : curso
     ```

---

## 🚀 PRÓXIMOS PASOS RECOMENDADOS

1. ✅ **Agregar campo `estado_revision` a Strapi** (si no existe)
2. ✅ **Mejorar precisión de coordenadas** (OCR o ajuste manual)
3. ✅ **Agregar validación de estado en frontend** (mostrar mensajes claros)
4. ✅ **Optimizar recarga de datos** (evitar múltiples llamadas innecesarias)
5. ✅ **Agregar logs más detallados** (para debugging)

---

## 📝 RESUMEN DE ENDPOINTS

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/crm/listas/[id]/procesar-pdf` | POST | Procesa PDF con Claude AI |
| `/api/crm/listas/[id]/aprobar-producto` | POST | Aprueba producto individual |
| `/api/crm/listas/aprobar-lista` | POST | Aprueba lista completa |
| `/api/crm/listas/[id]` | GET | Obtiene datos del curso |
| `/api/crm/colegios/[id]/cursos` | GET | Obtiene cursos del colegio |

---

**Última actualización:** 2026-02-02
**Versión del sistema:** 1.0.0
