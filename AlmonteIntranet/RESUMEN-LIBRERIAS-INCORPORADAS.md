# 📚 Resumen de Librerías Incorporadas - Rama `mati-integracion`

**Fecha:** Enero 2026  
**Rama:** `mati-integracion`

---

## 🎯 Resumen Ejecutivo

Este documento lista todas las librerías nuevas incorporadas durante el desarrollo de las funcionalidades de listas de útiles escolares en la rama `mati-integracion`.

---

## 📦 Librerías Nuevas Agregadas

### 1. **@google/generative-ai** `^0.24.1`
**Propósito:** Integración con Gemini AI para procesamiento de PDFs

**Uso:**
- Extracción automática de productos desde PDFs
- Análisis de contenido de listas escolares
- Validación y estructuración de datos

**Archivos donde se usa:**
- `src/app/api/crm/listas/[id]/procesar-pdf/route.ts`
- `src/app/api/crm/listas/carga-masiva-ia/route.ts`
- `src/app/api/crm/listas/test-gemini/route.ts`
- `src/app/api/crm/listas/diagnostico-gemini/route.ts`

**Configuración requerida:**
```env
GEMINI_API_KEY=tu_api_key_aqui
```

**Documentación:** https://ai.google.dev/gemini-api/docs

---

### 2. **xlsx** `^0.18.5`
**Propósito:** Lectura y escritura de archivos Excel/CSV

**Uso:**
- Importación de listas desde Excel
- Generación de plantillas Excel
- Exportación de datos

**Archivos donde se usa:**
- `src/app/(admin)/(apps)/crm/listas/components/ImportacionCompletaModal.tsx`
- `src/app/(admin)/(apps)/crm/listas/components/ImportacionMasivaModal.tsx`
- `src/app/(admin)/(apps)/crm/listas/[id]/validacion/components/ValidacionLista.tsx`

**Funcionalidades principales:**
- `XLSX.read()` - Leer archivos Excel
- `XLSX.utils.sheet_to_json()` - Convertir hojas a JSON
- `XLSX.utils.json_to_sheet()` - Convertir JSON a hojas
- `XLSX.writeFile()` - Escribir archivos Excel

**Tipos TypeScript:**
- `@types/xlsx`: `^0.0.36` (devDependencies)

**Documentación:** https://docs.sheetjs.com/

---

### 3. **react-pdf** `^9.2.1`
**Propósito:** Visualización de PDFs en React

**Uso:**
- Visualización de PDFs de listas
- Resaltado de productos en el PDF
- Navegación de páginas

**Archivos donde se usa:**
- `src/app/(admin)/(apps)/crm/listas/[id]/validacion/components/ValidacionLista.tsx`
- `src/app/(admin)/(apps)/crm/listas/components/PDFViewer.tsx`

**Funcionalidades principales:**
- `<Document>` - Componente para mostrar PDF
- `<Page>` - Componente para páginas individuales
- `usePDF` - Hook para cargar PDFs
- Resaltado de texto con coordenadas

**Dependencias relacionadas:**
- `pdfjs-dist` (incluido en react-pdf)

**Documentación:** https://react-pdf.org/

---

## 🔄 Librerías Ya Existentes (Uso Extendido)

### 4. **react-select** `^5.10.1`
**Uso extendido:**
- Búsqueda de colegios con autocompletado
- Búsqueda por RBD en selectores
- Filtrado customizado

**Mejoras implementadas:**
- `filterOption` personalizado para buscar por RBD
- Búsqueda case-insensitive
- Mejor UX en selección de colegios

---

### 5. **@tanstack/react-table** `^8.21.3`
**Uso extendido:**
- Tablas de listas con filtros mejorados
- Búsqueda global personalizada
- Filtros por columna

**Mejoras implementadas:**
- Filtro global que busca en múltiples campos (nombre, colegio, RBD, curso)
- Normalización de búsquedas (espacios, case-insensitive)

---

## 📋 Dependencias de Desarrollo

### **@types/xlsx** `^0.0.36`
**Propósito:** Tipos TypeScript para la librería `xlsx`

**Ubicación:** `devDependencies`

---

## 🔧 Configuración de Librerías

### Instalación

```bash
npm install @google/generative-ai xlsx react-pdf
npm install --save-dev @types/xlsx
```

### Configuración de Variables de Entorno

```env
# .env.local
GEMINI_API_KEY=tu_api_key_de_google_ai_studio
```

### Configuración de PDF.js Worker

El worker de PDF.js debe estar disponible en:
```
/public/pdfjs/pdf.worker.min.js
/public/pdfjs/pdf.worker.min.mjs
```

---

## 📊 Estadísticas de Uso

### @google/generative-ai
- **Archivos que la usan:** 4
- **Llamadas API:** ~10-15 por procesamiento de PDF
- **Modelos usados:** gemini-2.5-flash, gemini-2.0-flash, gemini-2.5-pro

### xlsx
- **Archivos que la usan:** 3
- **Operaciones:** Lectura y escritura de Excel/CSV
- **Formatos soportados:** .xlsx, .xls, .csv

### react-pdf
- **Archivos que la usan:** 2
- **Componentes:** Document, Page
- **Funcionalidades:** Visualización, resaltado, navegación

---

## ⚠️ Consideraciones Importantes

### 1. **@google/generative-ai**
- ⚠️ Requiere API key válida de Google AI Studio
- ⚠️ Tiene límites de rate (queries por minuto)
- ⚠️ Algunos modelos pueden no estar disponibles (404)
- ✅ Implementado sistema de fallback a modelos alternativos
- ✅ Manejo robusto de errores (403, 404, timeouts)

### 2. **xlsx**
- ✅ Soporta múltiples formatos (Excel, CSV)
- ✅ Maneja encoding correctamente
- ⚠️ Archivos grandes pueden ser lentos (optimizado con streaming)
- ✅ Normalización flexible de nombres de columnas

### 3. **react-pdf**
- ✅ Renderizado eficiente de PDFs
- ⚠️ PDFs muy grandes pueden ser lentos
- ✅ Soporte para resaltado de texto
- ✅ Navegación de páginas optimizada

---

## 🔗 Enlaces de Documentación

- **@google/generative-ai:** https://ai.google.dev/gemini-api/docs
- **xlsx (SheetJS):** https://docs.sheetjs.com/
- **react-pdf:** https://react-pdf.org/
- **react-select:** https://react-select.com/
- **@tanstack/react-table:** https://tanstack.com/table/latest

---

## 📝 Notas de Actualización

### Versiones Actuales
- `@google/generative-ai`: `^0.24.1` (última estable)
- `xlsx`: `^0.18.5` (compatible con Node 20+)
- `react-pdf`: `^9.2.1` (compatible con React 19)

### Compatibilidad
- ✅ Node.js 20.9.0+
- ✅ React 19.1.0
- ✅ Next.js 16.0.10
- ✅ TypeScript 5.8.3

---

## 🚀 Próximas Mejoras Potenciales

### Librerías a considerar:
1. **pdf-parse** (ya incluida) - Para análisis más profundo de PDFs
2. **mammoth** - Para convertir Word a HTML (si se necesita)
3. **papaparse** - Alternativa más rápida para CSV grandes

---

**Última actualización:** Enero 2026
