# Documentación: Extracción de PDF con IA (Implementación Actual)

## 📋 Resumen Ejecutivo

Este documento describe la implementación **actual y funcional** de extracción de productos desde PDFs de listas de útiles usando Google Gemini AI. La implementación actual utiliza un enfoque simplificado que envía el PDF directamente a Gemini como Base64, evitando los problemas de compatibilidad de versiones anteriores.

**Estado Actual:** ✅ Funcional (requiere verificación de modelos disponibles)  
**Última Actualización:** Enero 2025  
**Rama:** `mati-integracion`

---

## 🎯 Objetivo de la Implementación

Implementar una funcionalidad que permita:
1. Seleccionar una lista desde `/crm/listas`
2. Navegar a una página de validación (`/crm/listas/[id]/validacion`)
3. Visualizar el PDF en un lado de la pantalla
4. Ver los productos extraídos del PDF en el otro lado
5. Extraer automáticamente productos del PDF usando Google Gemini AI
6. Validar productos contra WooCommerce Escolar
7. Mostrar disponibilidad y precios de productos encontrados

---

## 🏗️ Arquitectura Implementada

### Componentes Frontend

1. **`ValidacionLista.tsx`**
   - Componente principal de la página de validación
   - Vista dividida: productos a la izquierda, PDF a la derecha
   - Gestiona el estado de carga, procesamiento y productos
   - Ubicación: `src/app/(admin)/(apps)/crm/listas/[id]/validacion/components/ValidacionLista.tsx`

2. **`ListasListing.tsx`** (modificado)
   - El nombre del curso ahora es un link que navega a `/crm/listas/[id]/validacion`
   - Ubicación: `src/app/(admin)/(apps)/crm/listas/components/ListasListing.tsx`

3. **`page.tsx`** (nuevo)
   - Server component que obtiene los datos de la lista
   - Ubicación: `src/app/(admin)/(apps)/crm/listas/[id]/validacion/page.tsx`

### API Routes

1. **`GET /api/crm/listas/[id]`**
   - Obtiene una lista individual con sus versiones y materiales
   - Maneja búsqueda por `documentId` o `id` numérico
   - Ubicación: `src/app/api/crm/listas/[id]/route.ts`

2. **`POST /api/crm/listas/[id]/procesar-pdf`**
   - Procesa el PDF con Gemini AI
   - Valida productos contra WooCommerce Escolar
   - Guarda productos en Strapi
   - Ubicación: `src/app/api/crm/listas/[id]/procesar-pdf/route.ts`

3. **`GET /api/crm/listas/pdf/[pdfId]`**
   - Sirve PDFs desde Strapi Media Library con autenticación
   - Ubicación: `src/app/api/crm/listas/pdf/[pdfId]/route.ts`

4. **`GET /api/crm/listas/test-gemini`** (nuevo)
   - Endpoint de prueba para verificar qué modelos de Gemini están disponibles
   - Ubicación: `src/app/api/crm/listas/test-gemini/route.ts`

---

## 🔧 Dependencias

```json
{
  "@google/generative-ai": "^0.24.1",
  "react-pdf": "^9.2.1"
}
```

**Nota:** A diferencia de la implementación anterior, **NO se usa `pdf-parse` ni `pdfjs-dist` directamente**. El PDF se envía directamente a Gemini como Base64, lo que simplifica enormemente la implementación y evita problemas de compatibilidad.

---

## 🔑 Variables de Entorno

Agregar en `.env.local`:

```env
GEMINI_API_KEY=tu_api_key_aqui
```

**Nota:** La API key está hardcodeada como fallback en el código, pero se recomienda usar la variable de entorno.

---

## 🚀 Flujo de Funcionamiento

### 1. Navegación a la Página de Validación

1. Usuario hace clic en el nombre del curso en `/crm/listas`
2. Navega a `/crm/listas/[id]/validacion`
3. El server component (`page.tsx`) obtiene los datos de la lista
4. Se renderiza `ValidacionLista` con los datos iniciales

### 2. Carga de Productos

1. `ValidacionLista` carga productos desde `versiones_materiales` del curso
2. Si no hay productos, muestra mensaje para procesar el PDF
3. Si hay productos, los muestra en la tabla

### 3. Procesamiento del PDF con IA

1. Usuario hace clic en "Procesar con IA"
2. Se llama a `POST /api/crm/listas/[id]/procesar-pdf`
3. El endpoint:
   - Obtiene el curso desde Strapi
   - Descarga el PDF desde Strapi Media Library
   - Convierte el PDF a Base64
   - Envía el PDF a Gemini AI con un prompt estructurado
   - Parsea la respuesta JSON de Gemini
   - Valida cada producto contra WooCommerce Escolar (búsqueda por ISBN/SKU y nombre)
   - Enriquece productos con datos de WooCommerce (precio, stock, imagen)
   - Guarda productos en `versiones_materiales` del curso
4. El frontend recarga los productos después del procesamiento

### 4. Validación contra WooCommerce

Para cada producto extraído:
1. Se busca primero por ISBN/SKU en WooCommerce Escolar
2. Si no se encuentra, se busca por nombre
3. Si se encuentra:
   - Se agrega `woocommerce_id`, `woocommerce_sku`
   - Se agrega `precio_woocommerce` y `stock_quantity`
   - Se agrega `imagen` si está disponible
   - Se marca `encontrado_en_woocommerce: true`
4. Si no se encuentra:
   - Se marca `encontrado_en_woocommerce: false`
   - Se mantiene el precio del PDF si está disponible

---

## 📝 Estructura de Datos

### Producto Identificado

```typescript
interface ProductoIdentificado {
  id: string | number
  validado: boolean
  imagen?: string
  isbn?: string
  nombre: string
  marca?: string
  cantidad: number
  comprar: boolean
  disponibilidad: 'disponible' | 'no_disponible' | 'no_encontrado'
  precio: number
  precio_woocommerce?: number
  asignatura?: string
  woocommerce_id?: number
  woocommerce_sku?: string
  stock_quantity?: number
  encontrado_en_woocommerce?: boolean
}
```

### Versión de Materiales en Strapi

Los productos se guardan en el campo `versiones_materiales` del curso:

```typescript
{
  versiones_materiales: [
    {
      id: string,
      fecha_subida: string,
      fecha_actualizacion: string,
      pdf_id: number,
      pdf_url: string,
      nombre_archivo: string,
      materiales: ProductoIdentificado[],
      procesado_con_ia: boolean,
      fecha_procesamiento: string
    }
  ]
}
```

---

## 🤖 Integración con Google Gemini

### Prompt para Extracción

El prompt enviado a Gemini incluye:
- Instrucciones detalladas sobre el formato esperado
- Campos requeridos: nombre, isbn, marca, cantidad, comprar, precio, asignatura, descripcion
- Formato JSON esperado con array de productos

### Modelos Probados

El código intenta múltiples modelos en orden de preferencia:
1. `gemini-1.5-pro-latest`
2. `gemini-1.5-flash-latest`
3. `gemini-1.5-pro-002`
4. `gemini-1.5-flash-002`
5. `gemini-1.5-pro-001`
6. `gemini-1.5-flash-001`
7. `gemini-1.5-pro`
8. `gemini-1.5-flash`
9. `gemini-pro`

**Nota:** Si ningún modelo funciona, puede ser un problema con la API key o permisos. Usa el endpoint `/api/crm/listas/test-gemini` para verificar qué modelos están disponibles.

### Envío del PDF

El PDF se envía como `inlineData` con:
- `data`: Base64 del PDF
- `mimeType`: `application/pdf`

---

## 🔍 Validación contra WooCommerce Escolar

### Búsqueda de Productos

1. **Por ISBN/SKU:**
   ```typescript
   const searchParams = new URLSearchParams({
     sku: producto.isbn,
     per_page: '1',
     status: 'publish',
   })
   ```

2. **Por Nombre (fallback):**
   ```typescript
   const searchParams = new URLSearchParams({
     search: producto.nombre,
     per_page: '1',
     status: 'publish',
   })
   ```

### Datos Enriquecidos

Si se encuentra el producto en WooCommerce:
- `woocommerce_id`: ID del producto en WooCommerce
- `woocommerce_sku`: SKU del producto
- `precio_woocommerce`: Precio actual en WooCommerce
- `stock_quantity`: Cantidad en stock
- `imagen`: URL de la imagen principal
- `encontrado_en_woocommerce`: `true`
- `disponibilidad`: `'disponible'` si hay stock, `'no_disponible'` si no hay stock

Si no se encuentra:
- `encontrado_en_woocommerce`: `false`
- `disponibilidad`: `'no_encontrado'`

---

## 🐛 Problemas Conocidos y Soluciones

### 1. Error: "models/gemini-1.5-pro is not found"

**Causa:** El modelo no está disponible para la API key o la versión de la API.

**Solución:**
- El código intenta múltiples modelos automáticamente
- Usa el endpoint `/api/crm/listas/test-gemini` para verificar modelos disponibles
- Verifica que la API key tenga acceso a los modelos en Google AI Studio

**Estado:** ⚠️ Requiere verificación de modelos disponibles

---

### 2. Productos no se cargan después del procesamiento

**Causa:** El frontend no recarga los datos después del procesamiento.

**Solución Implementada:**
- Se llama a `cargarProductos(true)` después del procesamiento exitoso
- Se agregó botón "Recargar" para recargar manualmente
- Se agregó lógica para recargar automáticamente si la lista inicial no tiene versiones

**Estado:** ✅ Resuelto

---

### 3. Error: "Lista no encontrada"

**Causa:** El ID de la lista no se encuentra en Strapi.

**Solución Implementada:**
- Búsqueda por `documentId` primero
- Fallback a búsqueda por `id` numérico
- Logging detallado para debugging

**Estado:** ✅ Resuelto

---

## 📁 Archivos Creados/Modificados

### Nuevos Componentes
- `src/app/(admin)/(apps)/crm/listas/[id]/validacion/page.tsx`
- `src/app/(admin)/(apps)/crm/listas/[id]/validacion/components/ValidacionLista.tsx`

### Nuevas API Routes
- `src/app/api/crm/listas/[id]/route.ts`
- `src/app/api/crm/listas/[id]/procesar-pdf/route.ts`
- `src/app/api/crm/listas/test-gemini/route.ts`

### Archivos Modificados
- `src/app/(admin)/(apps)/crm/listas/components/ListasListing.tsx` (navegación al hacer clic en curso)

### Archivos de Documentación
- `DOCUMENTACION-EXTRACCION-PDF-ACTUAL.md` (este archivo)
- `GEMINI-AI-CONFIG.md` (configuración de API key)

---

## ✅ Ventajas de esta Implementación

1. **Simplicidad:** No requiere extracción de texto previa, Gemini procesa el PDF directamente
2. **Sin problemas de compatibilidad:** No usa `pdf-parse` ni `pdfjs-dist` directamente
3. **Validación automática:** Valida productos contra WooCommerce automáticamente
4. **Enriquecimiento de datos:** Agrega precios, stock e imágenes de WooCommerce
5. **Interfaz clara:** Vista dividida con PDF y productos lado a lado

---

## 🔄 Diferencias con Implementación Anterior

| Aspecto | Implementación Anterior | Implementación Actual |
|---------|------------------------|----------------------|
| Extracción de texto | `pdf-parse` o `pdfjs-dist` | Envío directo a Gemini |
| Interfaz | Drawer lateral | Página completa |
| Validación | Manual | Automática contra WooCommerce |
| Problemas de compatibilidad | Muchos (pdfjs-dist, canvas, etc.) | Ninguno |
| Complejidad | Alta | Baja |

---

## 🧪 Testing

### Endpoint de Prueba

Para verificar qué modelos de Gemini están disponibles:

```bash
GET http://localhost:3000/api/crm/listas/test-gemini
```

Respuesta esperada:
```json
{
  "success": true,
  "modelosDisponibles": ["gemini-1.5-flash-latest", "gemini-1.5-pro-latest"],
  "todosLosResultados": [...],
  "recomendacion": "Usar modelo: gemini-1.5-flash-latest"
}
```

### Flujo de Prueba Manual

1. Ir a `/crm/listas`
2. Hacer clic en un curso que tenga PDF
3. Verificar que se carga la página de validación
4. Verificar que el PDF se muestra correctamente
5. Hacer clic en "Procesar con IA"
6. Verificar que los productos se extraen y validan
7. Verificar que los productos se muestran en la tabla
8. Verificar que la disponibilidad y precios de WooCommerce se muestran correctamente

---

## 📚 Referencias

- [Google Gemini API Documentation](https://ai.google.dev/)
- [react-pdf Documentation](https://react-pdf.org/)
- [WooCommerce REST API](https://woocommerce.github.io/woocommerce-rest-api-docs/)

---

## 👥 Contacto y Soporte

Para preguntas o problemas:
1. Revisar este documento
2. Verificar logs del servidor en modo desarrollo
3. Usar el endpoint `/api/crm/listas/test-gemini` para diagnosticar problemas con Gemini
4. Revisar los comentarios en el código

---

**Última Revisión:** Enero 2025  
**Autor:** Implementación colaborativa  
**Estado:** ✅ Funcional (requiere verificación de modelos disponibles)
