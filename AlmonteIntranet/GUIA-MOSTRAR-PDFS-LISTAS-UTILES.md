# 📋 Guía Completa: Cómo Mostrar PDFs de Listas de Útiles

## 🎯 Objetivo

Visualizar las listas de útiles escolares (PDFs) cuando un usuario hace clic en un curso en la página de detalle de un colegio. Los PDFs deben mostrarse en un panel lateral derecho junto con los materiales/productos extraídos del PDF.

---

## 📊 Estructura de Datos en Strapi

### Content-Type: `cursos`
- **Campo principal**: `versiones_materiales` (tipo: `JSON`)
- **Estructura del campo JSON**:
  ```json
  {
    "versiones_materiales": [
      {
        "id": 1,
        "nombre_archivo": "lista_utiles_2025.pdf",
        "fecha_subida": "2025-01-30T12:00:00.000Z",
        "fecha_actualizacion": "2025-01-30T12:00:00.000Z",
        "pdf_id": 158,  // ID del archivo en Strapi Media Library
        "pdf_url": "/uploads/lista_utiles_2025_abc123.pdf",  // URL del PDF
        "materiales": [
          {
            "nombre": "Cuaderno universitario",
            "cantidad": 2,
            "marca": "Torre",
            "precio": 1500,
            "asignatura": "Lenguaje",
            "descripcion": "...",
            "imagen": "https://...",
            "coordenadas": {...}
          }
        ],
        "metadata": {...},
        "procesado_con_ia": true,
        "modelo_ia": "claude-sonnet-4-20250514"
      }
    ]
  }
  ```

### Almacenamiento de PDFs

1. **Archivo físico**: Strapi Media Library (`plugin::upload.file`)
   - ID: `pdf_id` (ej: `158`)
   - URL: `pdf_url` (ej: `"/uploads/lista.pdf"`)

2. **Referencias**: Campo JSON `versiones_materiales` en `cursos`
   - Contiene `pdf_id` y `pdf_url`
   - Contiene array de `materiales` extraídos del PDF

---

## 🔌 API para Obtener los Datos

### Endpoint en Strapi

**Por RBD del colegio:**
```
GET /api/cursos?filters[colegio][rbd][$eq]=1930&populate=*
```

**Por ID del curso:**
```
GET /api/cursos/{cursoId}?populate=*
```

**Headers necesarios:**
```javascript
{
  'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
  'Content-Type': 'application/json'
}
```

**Ejemplo en JavaScript:**
```javascript
const STRAPI_API_URL = 'https://strapi-pruebas-production.up.railway.app';
const STRAPI_API_TOKEN = 'tu_token_aqui';

async function obtenerCurso(cursoId) {
  const response = await fetch(
    `${STRAPI_API_URL}/api/cursos/${cursoId}?populate=*`,
    {
      headers: {
        'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  const data = await response.json();
  return data.data;
}
```

---

## 🔍 Cómo Acceder al Campo `versiones_materiales`

**⚠️ IMPORTANTE:** En Strapi V5, los campos JSON pueden venir en `attributes` o directamente en el objeto.

```javascript
// Opción 1: Si viene en attributes
const versiones = curso.attributes?.versiones_materiales

// Opción 2: Si viene directamente
const versiones = curso.versiones_materiales

// Opción 3: Manejar ambos casos (RECOMENDADO)
const versiones = curso.attributes?.versiones_materiales || curso.versiones_materiales
```

---

## 🛠️ Función para Procesar el Campo JSON

```javascript
/**
 * Procesa el campo versiones_materiales que puede venir en diferentes formatos
 * @param {Object} curso - Objeto del curso desde Strapi
 * @returns {Array|null} - Array de versiones o null si no hay datos
 */
function procesarVersionesMateriales(curso) {
  let versiones = null;
  
  // Obtener el campo (puede estar en attributes o directamente)
  const versionesRaw = curso.attributes?.versiones_materiales || curso.versiones_materiales;
  
  // Si es null o undefined, no hay versiones
  if (!versionesRaw) {
    return null;
  }
  
  // Si ya es un array, usarlo directamente
  if (Array.isArray(versionesRaw)) {
    versiones = versionesRaw;
  }
  // Si es un string JSON, parsearlo
  else if (typeof versionesRaw === 'string') {
    try {
      const parsed = JSON.parse(versionesRaw);
      versiones = Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      console.error('Error al parsear versiones_materiales:', e);
      return null;
    }
  }
  // Si es un objeto, convertirlo a array
  else if (typeof versionesRaw === 'object') {
    versiones = Object.values(versionesRaw).filter(v => v !== null);
  }
  
  // Filtrar versiones válidas
  return versiones && versiones.length > 0 ? versiones : null;
}
```

---

## 🔗 Función para Limpiar URL del PDF

**Problema común:** Las URLs pueden venir en diferentes formatos:
- Relativas: `/uploads/lista.pdf`
- Absolutas: `https://strapi.../uploads/lista.pdf`
- Duplicadas: `https://strapi...https://media.moraleja.cl/...`

**Solución:**
```javascript
/**
 * Limpia y normaliza la URL del PDF
 * @param {string|null} url - URL del PDF (puede ser null)
 * @param {number|null} pdfId - ID del PDF en Strapi Media Library
 * @returns {string|null} - URL limpia o null si no hay datos
 */
function limpiarPdfUrl(url, pdfId) {
  // Si hay pdf_id pero no URL, construir desde el ID
  if (pdfId && !url) {
    const strapiBaseUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 
                         'https://strapi-pruebas-production.up.railway.app';
    return `${strapiBaseUrl}/api/upload/files/${pdfId}`;
  }
  
  if (!url) return null;
  
  let urlLimpia = url.trim();
  
  // Manejar URLs duplicadas (tomar la última)
  if (urlLimpia.includes('http://') || urlLimpia.includes('https://')) {
    const urls = urlLimpia.match(/https?:\/\/[^\s]+/g);
    if (urls && urls.length > 0) {
      urlLimpia = urls[urls.length - 1];
    }
  }
  
  // Si es relativa, construir URL completa
  if (urlLimpia.startsWith('/')) {
    const strapiBaseUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 
                         'https://strapi-pruebas-production.up.railway.app';
    urlLimpia = `${strapiBaseUrl}${urlLimpia}`;
  }
  
  return urlLimpia;
}
```

---

## 📄 Mostrar el PDF en React/Next.js

### Opción A: Iframe (Simple y Rápido)

```jsx
function PDFViewer({ pdfUrl }) {
  const urlLimpia = limpiarPdfUrl(pdfUrl);
  
  if (!urlLimpia) {
    return (
      <div className="p-4 text-center text-gray-500">
        PDF no disponible
      </div>
    );
  }
  
  return (
    <div className="w-full h-full">
      <iframe
        src={`${urlLimpia}#toolbar=0`}
        className="w-full h-full border-0 rounded"
        title="Vista previa del PDF"
        style={{ minHeight: '600px' }}
      />
    </div>
  );
}
```

### Opción B: Usando react-pdf (Más Control)

**Instalación:**
```bash
npm install react-pdf pdfjs-dist
```

**Componente:**
```jsx
import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Configurar worker de pdfjs
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

function PDFViewer({ pdfUrl }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  
  const urlLimpia = limpiarPdfUrl(pdfUrl);
  
  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }
  
  if (!urlLimpia) {
    return <div>PDF no disponible</div>;
  }
  
  return (
    <div className="pdf-viewer">
      <div className="pdf-controls mb-4">
        <button 
          onClick={() => setPageNumber(prev => Math.max(1, prev - 1))}
          disabled={pageNumber <= 1}
        >
          Anterior
        </button>
        <span className="mx-4">
          Página {pageNumber} de {numPages}
        </span>
        <button 
          onClick={() => setPageNumber(prev => Math.min(numPages, prev + 1))}
          disabled={pageNumber >= numPages}
        >
          Siguiente
        </button>
      </div>
      
      <Document
        file={urlLimpia}
        onLoadSuccess={onDocumentLoadSuccess}
        loading={<div>Cargando PDF...</div>}
        error={<div>Error al cargar PDF</div>}
      >
        <Page 
          pageNumber={pageNumber} 
          renderTextLayer={true}
          renderAnnotationLayer={true}
        />
      </Document>
    </div>
  );
}
```

---

## 📦 Mostrar Materiales/Productos

```jsx
function MaterialesList({ materiales }) {
  if (!materiales || !Array.isArray(materiales) || materiales.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No hay materiales disponibles
      </div>
    );
  }
  
  return (
    <div className="materiales-list">
      <h3 className="text-lg font-bold mb-4">
        Materiales ({materiales.length})
      </h3>
      <ul className="space-y-2">
        {materiales.map((material, index) => (
          <li 
            key={material.id || index}
            className="p-3 border rounded hover:bg-gray-50"
          >
            <div className="font-semibold">{material.nombre}</div>
            <div className="text-sm text-gray-600 mt-1">
              {material.cantidad && (
                <span className="mr-3">Cantidad: {material.cantidad}</span>
              )}
              {material.marca && (
                <span className="mr-3">Marca: {material.marca}</span>
              )}
              {material.precio && (
                <span className="mr-3">Precio: ${material.precio.toLocaleString()}</span>
              )}
            </div>
            {material.asignatura && (
              <div className="text-xs text-blue-600 mt-1">
                {material.asignatura}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 🎨 Ejemplo Completo de Componente

```jsx
import { useState, useEffect } from 'react';

function CursoConLista({ curso }) {
  const [versionSeleccionada, setVersionSeleccionada] = useState(null);
  
  // Procesar versiones
  const versiones = procesarVersionesMateriales(curso);
  
  // Seleccionar última versión por defecto
  useEffect(() => {
    if (versiones && versiones.length > 0) {
      // Ordenar por fecha (más reciente primero)
      const versionesOrdenadas = [...versiones].sort((a, b) => {
        const fechaA = new Date(a.fecha_actualizacion || a.fecha_subida || 0);
        const fechaB = new Date(b.fecha_actualizacion || b.fecha_subida || 0);
        return fechaB - fechaA;
      });
      setVersionSeleccionada(versionesOrdenadas[0]);
    }
  }, [versiones]);
  
  if (!versiones || versiones.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        Este curso no tiene listas de útiles disponibles
      </div>
    );
  }
  
  const pdfUrl = limpiarPdfUrl(
    versionSeleccionada?.pdf_url,
    versionSeleccionada?.pdf_id
  );
  
  return (
    <div className="flex gap-4 h-screen">
      {/* Panel izquierdo: Lista de versiones y materiales */}
      <div className="w-1/3 border-r p-4 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Listas de Útiles</h2>
        
        {/* Selector de versiones */}
        {versiones.length > 1 && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Versión:
            </label>
            <select 
              className="w-full p-2 border rounded"
              value={versionSeleccionada?.id} 
              onChange={(e) => {
                const version = versiones.find(v => v.id === parseInt(e.target.value));
                setVersionSeleccionada(version);
              }}
            >
              {versiones.map(v => (
                <option key={v.id} value={v.id}>
                  {v.nombre_archivo} - {new Date(v.fecha_subida).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {/* Información de la versión */}
        {versionSeleccionada && (
          <div className="mb-4 p-3 bg-gray-50 rounded">
            <div className="text-sm">
              <div><strong>Archivo:</strong> {versionSeleccionada.nombre_archivo}</div>
              <div><strong>Subido:</strong> {new Date(versionSeleccionada.fecha_subida).toLocaleString()}</div>
              {versionSeleccionada.procesado_con_ia && (
                <div className="text-green-600">
                  ✓ Procesado con IA ({versionSeleccionada.modelo_ia})
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Lista de materiales */}
        {versionSeleccionada?.materiales && (
          <MaterialesList materiales={versionSeleccionada.materiales} />
        )}
      </div>
      
      {/* Panel derecho: PDF */}
      <div className="w-2/3 p-4">
        {pdfUrl ? (
          <PDFViewer pdfUrl={pdfUrl} />
        ) : (
          <div className="p-4 text-center text-gray-500">
            PDF no disponible
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 🔍 Debugging y Verificación

### Función de Debug

```javascript
function debugVersionesMateriales(curso) {
  console.log('=== DEBUG: versiones_materiales ===');
  console.log('Curso completo:', curso);
  console.log('versiones_materiales raw:', curso.versiones_materiales);
  console.log('versiones_materiales en attributes:', curso.attributes?.versiones_materiales);
  console.log('Tipo:', typeof curso.versiones_materiales);
  console.log('Es array:', Array.isArray(curso.versiones_materiales));
  console.log('Es null:', curso.versiones_materiales === null);
  console.log('Es undefined:', curso.versiones_materiales === undefined);
  
  const versiones = procesarVersionesMateriales(curso);
  console.log('Versiones procesadas:', versiones);
  console.log('Cantidad de versiones:', versiones?.length || 0);
}
```

### Verificar Datos en Strapi

**Si los cursos tienen `versiones_materiales: null`:**

1. **Verificar en Strapi Admin:**
   - Ir a Content Manager → Cursos
   - Buscar el curso específico
   - Ver si el campo `versiones_materiales` tiene datos

2. **Verificar permisos:**
   - Settings → Roles → Public (o el rol que uses)
   - Asegurar que `cursos` tenga permisos de lectura
   - Verificar que el campo JSON no esté marcado como privado

3. **Verificar populate:**
   - Los campos JSON no necesitan populate especial
   - Deben venir automáticamente con `populate=*`

---

## 🚨 Problemas Comunes y Soluciones

### Problema 1: `versiones_materiales` es `null`

**Causa:** Los datos realmente no existen en Strapi.

**Solución:**
- Verificar en Strapi Admin si el curso tiene datos
- Si no tiene datos, necesitas subir un PDF primero usando la funcionalidad de importación

### Problema 2: URL del PDF no funciona

**Causa:** URL mal formada o duplicada.

**Solución:**
- Usar la función `limpiarPdfUrl()` que maneja todos los casos
- Si hay `pdf_id`, construir la URL desde el ID: `/api/upload/files/${pdfId}`

### Problema 3: Campo JSON no se obtiene

**Causa:** Permisos o configuración en Strapi.

**Solución:**
- Verificar permisos del rol en Strapi
- Asegurar que el campo JSON no esté marcado como privado
- Intentar obtener el campo explícitamente (aunque no debería ser necesario)

### Problema 4: PDF se muestra pero no carga

**Causa:** CORS o permisos de acceso al archivo.

**Solución:**
- Verificar que el PDF sea accesible públicamente
- Si está en Strapi Media Library, verificar permisos del archivo
- Usar el endpoint de Strapi: `/api/upload/files/${pdfId}`

---

## 📋 Checklist de Implementación

- [ ] Función `procesarVersionesMateriales()` implementada
- [ ] Función `limpiarPdfUrl()` implementada
- [ ] Componente `PDFViewer` implementado (iframe o react-pdf)
- [ ] Componente `MaterialesList` implementado
- [ ] Componente principal `CursoConLista` implementado
- [ ] Manejo de casos sin datos (null, undefined)
- [ ] Manejo de múltiples versiones
- [ ] Selector de versiones si hay más de una
- [ ] Ordenamiento por fecha (más reciente primero)
- [ ] Logs de debugging agregados
- [ ] Pruebas con cursos que tienen datos
- [ ] Pruebas con cursos que no tienen datos

---

## 🔗 Referencias

### Strapi API
- **Documentación:** https://docs.strapi.io/dev-docs/api/rest
- **Query Parameters:** https://docs.strapi.io/dev-docs/api/rest/filters-locale-publication

### React PDF
- **Documentación:** https://react-pdf.org/
- **Instalación:** `npm install react-pdf pdfjs-dist`

### PDF.js
- **Documentación:** https://mozilla.github.io/pdf.js/

---

## 💡 Notas Adicionales

- El campo `versiones_materiales` es un campo JSON personalizado en Strapi
- No es una relación, por lo que no necesita `populate` especial
- Cada versión puede tener múltiples materiales/productos
- Los materiales pueden tener coordenadas si fueron procesados con IA
- El campo `pdf_id` es el ID del archivo en Strapi Media Library
- El campo `pdf_url` puede ser relativo o absoluto

---

## 🎯 Resumen Rápido

1. **Obtener curso:** `GET /api/cursos/{id}?populate=*`
2. **Extraer versiones:** `curso.attributes?.versiones_materiales || curso.versiones_materiales`
3. **Procesar JSON:** Usar función `procesarVersionesMateriales()`
4. **Limpiar URL:** Usar función `limpiarPdfUrl()`
5. **Mostrar PDF:** Componente `PDFViewer` con iframe o react-pdf
6. **Mostrar materiales:** Componente `MaterialesList` mapeando el array

---

**Fecha de creación:** 2 de febrero de 2026  
**Última actualización:** 2 de febrero de 2026
