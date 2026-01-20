# Documentación: Implementación de Extracción de PDF con IA

## 📋 Resumen Ejecutivo

Este documento detalla todo el proceso de implementación de la funcionalidad de extracción de texto de PDFs usando IA (Google Gemini) para el módulo de "Listas de Útiles" en el CRM. Aunque la implementación aún no está completamente funcional, este documento recopila todos los aprendizajes, problemas encontrados, soluciones intentadas y configuraciones realizadas.

**Estado Actual:** ⚠️ En progreso - Requiere revisión adicional  
**Última Actualización:** Diciembre 2024

---

## 🎯 Objetivo de la Implementación

Implementar una funcionalidad que permita:
1. Seleccionar una lista desde el listing de listas
2. Abrir un panel lateral (drawer) con vista dividida:
   - **Lado izquierdo:** Visualizador de PDF
   - **Lado derecho:** Formularios editables con los materiales extraídos del PDF
3. Extraer automáticamente el contenido del PDF usando IA (Google Gemini)
4. Permitir edición y guardado de los materiales extraídos

---

## 🏗️ Arquitectura Implementada

### Componentes Frontend Creados

1. **`ListaDetailDrawer.tsx`**
   - Panel lateral que se abre al seleccionar una lista
   - Gestiona el estado de carga, extracción, guardado
   - Vista dividida en desktop, tabs en mobile
   - Ubicación: `src/app/(admin)/(apps)/crm/listas/components/ListaDetailDrawer.tsx`

2. **`PDFViewer.tsx`**
   - Componente para visualizar PDFs
   - Controles de zoom y navegación de páginas
   - Usa `react-pdf` con worker local
   - Ubicación: `src/app/(admin)/(apps)/crm/listas/components/PDFViewer.tsx`

3. **`MaterialesForm.tsx`**
   - Formulario editable para los materiales extraídos
   - Permite agregar, editar, eliminar y reordenar materiales
   - Ubicación: `src/app/(admin)/(apps)/crm/listas/components/MaterialesForm.tsx`

4. **`MaterialItemRow.tsx`**
   - Fila individual editable para cada material
   - Campos: asignatura, item, cantidad, categoria, marca, isbn, notas, etc.
   - Ubicación: `src/app/(admin)/(apps)/crm/listas/components/MaterialItemRow.tsx`

### API Routes Creadas

1. **`GET /api/crm/listas/[id]`**
   - Obtiene una lista individual con sus versiones y materiales
   - Ubicación: `src/app/api/crm/listas/[id]/route.ts`

2. **`POST /api/crm/listas/[id]/extract-pdf`**
   - Extrae texto del PDF usando `pdfjs-dist`
   - Envía el texto a Google Gemini para extracción estructurada
   - Retorna materiales en formato JSON
   - Ubicación: `src/app/api/crm/listas/[id]/extract-pdf/route.ts`

3. **`PUT /api/crm/listas/[id]/materiales`**
   - Guarda los materiales editados en Strapi
   - Actualiza el campo `versiones_materiales` del curso
   - Ubicación: `src/app/api/crm/listas/[id]/materiales/route.ts`

---

## 🔧 Dependencias Instaladas

```json
{
  "pdf-parse": "^2.4.5",
  "react-pdf": "^9.2.1",
  "@google/generative-ai": "^0.21.0",
  "pdfjs-dist": "2.16.105"
}
```

### Configuración de Versiones

Se agregaron `overrides` y `resolutions` en `package.json` para forzar `pdfjs-dist@2.16.105`:

```json
{
  "overrides": {
    "@date-fns/tz": "1.3.1",
    "pdfjs-dist": "2.16.105"
  },
  "resolutions": {
    "@date-fns/tz": "1.3.1",
    "pdfjs-dist": "2.16.105"
  }
}
```

**Razón:** `pdf-parse` requiere una versión específica de `pdfjs-dist` para funcionar correctamente. Versiones más nuevas causan errores de compatibilidad.

---

## 🔑 Variables de Entorno

Agregar en `.env.local`:

```env
GEMINI_API_KEY=AIzaSyAhX5ME_MGEwIaMsvO0Ab7SnkA38BuJjI0
```

**Nota:** La API key de Gemini está configurada. Para obtener una nueva, seguir las instrucciones en `COMO-OBTENER-API-KEY-GEMINI.md`.

---

## 🐛 Problemas Encontrados y Soluciones Intentadas

### 1. Error: "Unexpected end of JSON input"

**Causa:** El endpoint `/api/crm/listas/[id]` no existía.

**Solución:** Se creó el endpoint que:
- Obtiene el curso desde Strapi
- Transforma los datos al formato `ListaType`
- Maneja errores cuando la lista no existe o no tiene PDFs

**Estado:** ✅ Resuelto

---

### 2. Error: "Failed to fetch dynamically imported module: pdf.worker.min.js"

**Causa:** `react-pdf` intentaba cargar el worker desde un CDN que no estaba disponible.

**Solución:** 
- Descargar `pdf.worker.min.js` para `pdfjs-dist@2.16.105`
- Colocarlo en `public/pdfjs/pdf.worker.min.js`
- Configurar `pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.js'`

**Estado:** ✅ Resuelto

---

### 3. Error: "DOMMatrix is not defined"

**Causa:** `pdf-parse` intenta usar APIs del navegador (`DOMMatrix`, `DOMPoint`) en Node.js.

**Solución:** Agregar polyfills en el API route antes de importar `pdf-parse`:

```typescript
// Polyfill para DOMMatrix
if (typeof globalThis.DOMMatrix === 'undefined') {
  class DOMMatrixPolyfill { /* ... */ }
  ;(globalThis as any).DOMMatrix = DOMMatrixPolyfill
}

// Polyfill para DOMPoint
if (typeof globalThis.DOMPoint === 'undefined') {
  class DOMPointPolyfill { /* ... */ }
  ;(globalThis as any).DOMPoint = DOMPointPolyfill
}
```

**Estado:** ✅ Resuelto

---

### 4. Error: "pdfParse is not a function"

**Causa:** Problemas con la importación de `pdf-parse` en Next.js API routes.

**Solución:** Crear función helper `getPdfParse()` que intenta múltiples métodos de importación:

```typescript
async function getPdfParse() {
  try {
    const pdfParseModule = await import('pdf-parse')
    let pdfParseFn = pdfParseModule.default || pdfParseModule
    // ... lógica de fallback
  } catch (error) {
    // Fallback a require
  }
}
```

**Estado:** ⚠️ Parcialmente resuelto - Se cambió de estrategia

---

### 5. Error: "Class constructor AbortException cannot be invoked without 'new'"

**Causa:** Incompatibilidad entre `pdf-parse` y versiones nuevas de `pdfjs-dist`.

**Solución Intentada:**
- Agregar polyfill para `AbortException` que funcione con y sin `new`
- Forzar versión `pdfjs-dist@2.16.105` con overrides

**Estado:** ⚠️ No resuelto completamente - Se cambió de estrategia

**Decisión:** Se abandonó `pdf-parse` y se implementó extracción directa con `pdfjs-dist`.

---

### 6. Error: "Module not found: Can't resolve 'canvas'"

**Causa:** `react-pdf` (o sus dependencias) intenta importar `canvas` en el cliente.

**Solución:**
1. Configurar webpack para ignorar `canvas`:
   ```typescript
   config.resolve.fallback = {
     canvas: false,
     fs: false,
     path: false,
     crypto: false,
   }
   ```

2. Usar `dynamic` import con `ssr: false` para `PDFViewer`:
   ```typescript
   const PDFViewer = dynamic(() => import('./PDFViewer'), {
     ssr: false,
   })
   ```

3. Forzar uso de webpack en scripts:
   ```json
   {
     "scripts": {
       "dev": "next dev --webpack",
       "build": "next build --webpack"
     }
   }
   ```

**Estado:** ✅ Resuelto

---

### 7. Error: "Cannot find module 'pdfjs-dist/legacy/build/pdf.mjs'"

**Causa:** `pdf-parse` intenta importar una ruta que no existe en `pdfjs-dist@2.16.105`.

**Solución:** Configurar alias en webpack y turbopack:

```typescript
config.resolve.alias = {
  'pdfjs-dist/legacy/build/pdf.mjs': 'pdfjs-dist/build/pdf.js',
  'pdfjs-dist/legacy/build/pdf': 'pdfjs-dist/build/pdf.js',
}
```

**Estado:** ⚠️ Parcialmente resuelto - Requiere ajustes adicionales

---

### 8. Error: "ENOENT: no such file or directory, open '...react-pdf/node_modules/pdfjs-dist/build/pdf.js'"

**Causa:** Webpack intenta usar `pdfjs-dist` desde `react-pdf/node_modules` que no tiene el archivo `build/pdf.js`.

**Solución Intentada:**
- Instalar `pdfjs-dist` como dependencia directa
- Configurar alias para que webpack use el `pdfjs-dist` instalado directamente
- Agregar alias: `'react-pdf/node_modules/pdfjs-dist': 'pdfjs-dist'`

**Estado:** ⚠️ En progreso

---

## 📝 Configuraciones Realizadas

### `next.config.ts`

#### Webpack Configuration

```typescript
webpack: (config, { isServer }) => {
  const path = require('path')
  
  // Fallbacks para módulos del navegador
  config.resolve.fallback = {
    canvas: false,
    fs: false,
    path: false,
    crypto: false,
  }
  
  // Alias para ignorar canvas
  config.resolve.alias = {
    ...config.resolve.alias,
    canvas: false,
  }
  
  // Configurar alias para pdfjs-dist
  try {
    const pdfjsPath = require.resolve('pdfjs-dist/package.json')
    const pdfjsDir = path.dirname(pdfjsPath)
    const pdfjsBuildPath = path.join(pdfjsDir, 'build', 'pdf.js')
    
    config.resolve.alias = {
      ...config.resolve.alias,
      'pdfjs-dist/legacy/build/pdf.mjs': pdfjsBuildPath,
      'pdfjs-dist/legacy/build/pdf': pdfjsBuildPath,
      'pdfjs-dist/build/pdf.js': pdfjsBuildPath,
      'react-pdf/node_modules/pdfjs-dist': pdfjsDir,
    }
  } catch (e) {
    // Fallback
    config.resolve.alias = {
      ...config.resolve.alias,
      'pdfjs-dist/legacy/build/pdf.mjs': 'pdfjs-dist/build/pdf.js',
      'pdfjs-dist/legacy/build/pdf': 'pdfjs-dist/build/pdf.js',
      'react-pdf/node_modules/pdfjs-dist': 'pdfjs-dist',
    }
  }
  
  return config
}
```

#### Turbopack Configuration

```typescript
turbopack: {
  // Turbopack configurado como objeto vacío
  // Se usa webpack para el build
}
```

**Nota:** Turbopack no acepta valores booleanos en `resolveAlias`, por lo que se usa webpack para el build.

---

### `package.json`

```json
{
  "scripts": {
    "dev": "next dev --webpack",
    "build": "next build --webpack"
  },
  "overrides": {
    "pdfjs-dist": "2.16.105"
  },
  "resolutions": {
    "pdfjs-dist": "2.16.105"
  }
}
```

---

## 🔄 Estrategia de Extracción de Texto

### Evolución de la Implementación

1. **Inicial:** Usar `pdf-parse` directamente
   - ❌ Problemas de compatibilidad con `pdfjs-dist`
   - ❌ Errores de `AbortException`

2. **Intermedia:** Usar `pdfjs-dist` directamente desde `pdf-parse/node_modules`
   - ❌ Problemas para encontrar el módulo
   - ❌ Rutas no resueltas correctamente

3. **Actual:** Usar `pdfjs-dist` instalado directamente
   - ✅ Instalado como dependencia directa
   - ⚠️ Configuración de webpack en progreso

### Función de Extracción Actual

```typescript
async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  try {
    let pdfjs: any
    
    // Intentar cargar desde la ruta legacy (más compatible)
    try {
      pdfjs = require('pdfjs-dist/legacy/build/pdf.js')
    } catch (e1) {
      try {
        pdfjs = require('pdfjs-dist/build/pdf.js')
      } catch (e2) {
        // Último intento: import dinámico
        const pdfjsModule = await import('pdfjs-dist/legacy/build/pdf.mjs')
        pdfjs = pdfjsModule.default || pdfjsModule
      }
    }
    
    // Cargar documento
    const loadingTask = pdfjs.getDocument({
      data: pdfBuffer,
      useSystemFonts: true,
    })
    
    const pdfDocument = await loadingTask.promise
    const numPages = pdfDocument.numPages
    
    // Extraer texto de cada página
    let fullText = ''
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum)
      const textContent = await page.getTextContent()
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
      fullText += pageText + '\n'
    }
    
    return fullText.trim()
  } catch (error: any) {
    throw new Error(`Error al extraer texto con pdfjs-dist: ${error.message}`)
  }
}
```

---

## 🤖 Integración con Google Gemini

### Prompt para Extracción

El prompt enviado a Gemini incluye:
- Instrucciones detalladas sobre el formato esperado
- Ejemplo de estructura JSON
- Campos requeridos: asignatura, item, cantidad, categoria, marca, isbn, notas, relacion_orden, relacion_orden_num

### Estructura de Respuesta Esperada

```json
{
  "materiales": [
    {
      "asignatura": "Matemáticas",
      "item": "Cuaderno",
      "cantidad": "1",
      "categoria": "Útiles",
      "marca": "Oxford",
      "isbn": "",
      "notas": "Tamaño carta",
      "relacion_orden": "1",
      "relacion_orden_num": 1
    }
  ]
}
```

---

## 📁 Archivos Creados/Modificados

### Nuevos Componentes
- `src/app/(admin)/(apps)/crm/listas/components/ListaDetailDrawer.tsx`
- `src/app/(admin)/(apps)/crm/listas/components/PDFViewer.tsx`
- `src/app/(admin)/(apps)/crm/listas/components/MaterialesForm.tsx`
- `src/app/(admin)/(apps)/crm/listas/components/MaterialItemRow.tsx`

### Nuevas API Routes
- `src/app/api/crm/listas/[id]/route.ts`
- `src/app/api/crm/listas/[id]/extract-pdf/route.ts`
- `src/app/api/crm/listas/[id]/materiales/route.ts`

### Archivos Modificados
- `src/app/(admin)/(apps)/crm/listas/components/ListasListing.tsx` (agregado handler para abrir drawer)
- `next.config.ts` (configuración de webpack y turbopack)
- `package.json` (dependencias, overrides, scripts)
- `.env.local` (GEMINI_API_KEY)

### Archivos de Documentación
- `COMO-OBTENER-API-KEY-GEMINI.md`
- `CAMBIOS-CLAUDE-A-GEMINI.md`
- `SOLUCION-ERRORES-PDF-Y-JSON.md`
- `DOCUMENTACION-EXTRACCION-PDF-LEARNINGS.md` (este archivo)

---

## ⚠️ Problemas Conocidos Pendientes

1. **Build Error con webpack:**
   - Webpack intenta cargar `pdfjs-dist` desde `react-pdf/node_modules` que no tiene `build/pdf.js`
   - **Estado:** Configuración de alias actualizada, requiere verificación

2. **Compatibilidad entre `react-pdf` y `pdfjs-dist`:**
   - `react-pdf` usa su propia versión de `pdfjs-dist`
   - Necesitamos que ambos usen la misma versión o configurar correctamente los alias
   - **Estado:** En progreso

3. **Extracción de texto:**
   - La función `extractTextFromPDF` puede no estar cargando correctamente `pdfjs-dist`
   - **Estado:** Requiere pruebas adicionales

---

## 🔍 Próximos Pasos Recomendados

### 1. Verificar Configuración de Webpack
- [ ] Confirmar que los alias están funcionando correctamente
- [ ] Verificar que `pdfjs-dist` se carga desde la ubicación correcta
- [ ] Probar el build completo

### 2. Probar Extracción de Texto
- [ ] Verificar que `extractTextFromPDF` carga `pdfjs-dist` correctamente
- [ ] Probar con un PDF de ejemplo
- [ ] Verificar que el texto extraído es correcto

### 3. Probar Integración Completa
- [ ] Abrir drawer desde el listing
- [ ] Cargar PDF en el visor
- [ ] Extraer materiales con IA
- [ ] Editar y guardar materiales

### 4. Alternativas a Considerar
Si los problemas persisten, considerar:
- **Opción A:** Usar una biblioteca alternativa para extracción de texto (ej: `pdf2json`, `pdf-lib`)
- **Opción B:** Usar un servicio externo para extracción de PDF (ej: Google Document AI, AWS Textract)
- **Opción C:** Separar completamente `react-pdf` (cliente) de la extracción (servidor) usando diferentes versiones de `pdfjs-dist`

---

## 💡 Lecciones Aprendidas

### 1. Compatibilidad de Versiones
- Las dependencias anidadas pueden causar conflictos
- Los `overrides` y `resolutions` son útiles pero no siempre suficientes
- A veces es mejor instalar dependencias directamente que confiar en las anidadas

### 2. Next.js y Módulos del Navegador
- Next.js intenta hacer SSR de todo por defecto
- Los módulos del navegador (como `canvas`) necesitan ser excluidos del servidor
- `dynamic` imports con `ssr: false` son esenciales para componentes que usan APIs del navegador

### 3. Webpack vs Turbopack
- Turbopack es más estricto con la configuración
- Webpack permite más flexibilidad pero es más lento
- Para casos complejos, webpack puede ser más confiable

### 4. PDF.js y Node.js
- `pdfjs-dist` está diseñado principalmente para el navegador
- Usar `pdfjs-dist` en Node.js requiere configuración especial
- Los polyfills son necesarios para APIs del navegador

### 5. Manejo de Errores
- Los errores de módulos pueden ser difíciles de diagnosticar
- Los mensajes de error a veces no son claros sobre la causa real
- Es útil tener múltiples estrategias de fallback

---

## 📚 Referencias y Recursos

- [PDF.js Documentation](https://mozilla.github.io/pdf.js/)
- [react-pdf Documentation](https://react-pdf.org/)
- [Google Gemini API](https://ai.google.dev/)
- [Next.js Webpack Configuration](https://nextjs.org/docs/api-reference/next.config.js/custom-webpack-config)
- [pdf-parse npm](https://www.npmjs.com/package/pdf-parse)

---

## 👥 Contacto y Soporte

Para preguntas o problemas relacionados con esta implementación:
- Revisar este documento primero
- Consultar los archivos de documentación mencionados
- Revisar los comentarios en el código
- Verificar los logs del servidor en modo desarrollo

---

**Última Revisión:** Diciembre 2024  
**Autor:** Implementación colaborativa  
**Estado:** ⚠️ En progreso - Requiere revisión adicional



