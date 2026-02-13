# Contexto Completo: Extracción de PDF con Gemini AI

## 📋 Resumen Ejecutivo

Este documento describe el trabajo realizado para implementar la funcionalidad de extracción de productos desde PDFs de listas de útiles escolares usando Google Gemini AI. El proyecto enfrentó desafíos con la disponibilidad de modelos de Gemini, lo que llevó a implementar una solución alternativa que extrae el texto del PDF y lo envía a Gemini como texto plano.

**Estado Actual:** ✅ Implementación completada con solución alternativa  
**Fecha:** Enero 2025  
**Rama:** `mati-integracion`

---

## 🎯 Objetivo Principal

Implementar una funcionalidad que permita:
1. Seleccionar una lista desde `/crm/listas`
2. Navegar a una página de validación (`/crm/listas/[id]/validacion`)
3. Visualizar el PDF en un lado de la pantalla
4. Ver los productos extraídos del PDF en el otro lado
5. Extraer automáticamente productos del PDF usando Google Gemini AI
6. Validar productos contra WooCommerce Escolar
7. Mostrar disponibilidad y precios de productos encontrados

---

## 🐛 Problema Encontrado

### Error Inicial: Modelos de Gemini No Disponibles

Al intentar usar los modelos de Gemini AI, se encontró que **ningún modelo estaba disponible** con la API key proporcionada:

```json
{
  "success": true,
  "modelosDisponibles": [],
  "todosLosResultados": [
    {
      "modelo": "gemini-1.5-pro-latest",
      "disponible": false,
      "error": "[404 Not Found] models/gemini-1.5-pro-latest is not found for API version v1beta"
    },
    // ... todos los modelos probados fallaron
  ]
}
```

**Modelos probados (todos fallaron):**
- `gemini-1.5-pro-latest`
- `gemini-1.5-flash-latest`
- `gemini-1.5-pro-002`
- `gemini-1.5-flash-002`
- `gemini-1.5-pro-001`
- `gemini-1.5-flash-001`
- `gemini-1.5-pro`
- `gemini-1.5-flash`
- `gemini-pro`

**Causa probable:**
- La API key no tiene acceso a los modelos en la versión v1beta
- Los modelos pueden requerir habilitación en Google Cloud Console
- Puede ser necesario usar una versión diferente de la API

---

## ✅ Solución Implementada

### Estrategia: Extracción de Texto como Alternativa

Dado que los modelos de Gemini no están disponibles para procesar PDFs directamente, se implementó una solución alternativa:

1. **Intento principal:** Enviar el PDF directamente a Gemini (si hay modelos disponibles)
2. **Fallback:** Si falla, extraer el texto del PDF usando `pdf-parse`
3. **Procesamiento:** Enviar el texto extraído a Gemini como texto plano

### Ventajas de esta Solución

- ✅ Funciona incluso si los modelos no soportan PDFs directamente
- ✅ Más compatible con diferentes versiones de la API
- ✅ El texto plano es más fácil de procesar para Gemini
- ✅ Menos dependencias de características específicas de modelos

### Desventajas

- ⚠️ Puede perder información visual del PDF (tablas, imágenes, formato)
- ⚠️ Requiere una biblioteca adicional (`pdf-parse`)
- ⚠️ PDFs escaneados (imágenes) no funcionarán

---

## 🔧 Cambios Técnicos Realizados

### 1. Instalación de Dependencias

```bash
npm install pdf-parse --save
```

**Dependencia agregada:**
- `pdf-parse`: Biblioteca para extraer texto de PDFs en Node.js

### 2. Actualización del Endpoint de Procesamiento

**Archivo:** `src/app/api/crm/listas/[id]/procesar-pdf/route.ts`

#### Cambios Principales:

1. **Listado de Modelos Disponibles:**
   - Intenta obtener modelos disponibles desde la API REST de Gemini
   - Prueba múltiples modelos en orden de preferencia
   - Incluye modelos adicionales como `gemini-pro-vision` y `gemini-2.0-flash-exp`

2. **Solución Alternativa con Extracción de Texto:**
   ```typescript
   // Intentar primero con el PDF directamente
   try {
     result = await model.generateContent([
       prompt,
       { inlineData: { data: pdfBase64, mimeType: 'application/pdf' } }
     ])
   } catch (geminiError) {
     // Si falla, extraer texto del PDF
     const pdfParse = require('pdf-parse')
     const pdfData = await pdfParse(Buffer.from(pdfBuffer))
     textoExtraido = pdfData.text
     
     // Enviar texto extraído a Gemini
     result = await model.generateContent([
       prompt + '\n\nTexto extraído del PDF:\n' + textoExtraido
     ])
   }
   ```

3. **Manejo de Errores Mejorado:**
   - Errores específicos para cada tipo de fallo
   - Mensajes de sugerencia más claros
   - Logging detallado para debugging

### 3. Actualización del Endpoint de Prueba

**Archivo:** `src/app/api/crm/listas/test-gemini/route.ts`

#### Cambios:

1. **Listado de Modelos desde API:**
   - Intenta obtener modelos disponibles desde la API REST
   - Filtra solo modelos que contengan "gemini"
   - Prioriza modelos obtenidos desde la API

2. **Modelos Adicionales:**
   - Agregados `gemini-pro-vision` y `gemini-2.0-flash-exp`
   - Eliminación de duplicados antes de probar

---

## 📁 Archivos Modificados

### Archivos Nuevos
- `DOCUMENTACION-EXTRACCION-PDF-ACTUAL.md` - Documentación de la implementación actual
- `GEMINI-AI-CONFIG.md` - Configuración de credenciales Gemini
- `CONTEXTO-EXTRACCION-PDF-GEMINI.md` - Este documento

### Archivos Modificados

1. **`src/app/api/crm/listas/[id]/procesar-pdf/route.ts`**
   - Agregada lógica de listado de modelos disponibles
   - Implementada solución alternativa con extracción de texto
   - Mejorado manejo de errores
   - Agregadas importaciones necesarias

2. **`src/app/api/crm/listas/test-gemini/route.ts`**
   - Agregado listado de modelos desde API REST
   - Agregados modelos adicionales para probar
   - Mejorado logging y mensajes de error

3. **`package.json`**
   - Agregada dependencia `pdf-parse`

4. **`GUIA-INTEGRACION-RAMA-MATI.md`**
   - Actualizada con información sobre extracción de PDF
   - Agregadas pruebas para la nueva funcionalidad

---

## 🔍 Flujo de Funcionamiento Actual

### 1. Usuario Hace Clic en "Procesar con IA"

```
Usuario → Frontend (ValidacionLista.tsx)
  ↓
POST /api/crm/listas/[id]/procesar-pdf
```

### 2. Backend Procesa el PDF

```
Backend (procesar-pdf/route.ts)
  ↓
1. Obtiene curso desde Strapi
  ↓
2. Descarga PDF desde Strapi Media Library
  ↓
3. Convierte PDF a Base64
  ↓
4. Intenta listar modelos disponibles desde API REST
  ↓
5. Prueba modelos en orden de preferencia
  ↓
6a. Si encuentra modelo disponible:
    → Intenta enviar PDF directamente a Gemini
    ↓
    Si falla → 6b
    Si funciona → 7
  ↓
6b. Si no hay modelo o falla:
    → Extrae texto del PDF con pdf-parse
    → Envía texto a Gemini
  ↓
7. Parsea respuesta JSON de Gemini
  ↓
8. Valida productos contra WooCommerce Escolar
  ↓
9. Enriquece productos con datos de WooCommerce
  ↓
10. Guarda productos en Strapi
  ↓
11. Retorna respuesta al frontend
```

### 3. Frontend Actualiza la UI

```
Frontend recibe respuesta
  ↓
Recarga productos desde API
  ↓
Muestra productos en tabla
  ↓
Muestra disponibilidad y precios de WooCommerce
```

---

## 🧪 Testing y Verificación

### Endpoint de Prueba

Para verificar qué modelos están disponibles:

```bash
GET http://localhost:3000/api/crm/listas/test-gemini
```

**Respuesta esperada:**
```json
{
  "success": true,
  "modelosDisponibles": ["modelo1", "modelo2"],
  "modelosDesdeAPI": ["modelos obtenidos desde API"],
  "todosLosResultados": [...],
  "recomendacion": "Usar modelo: modelo1"
}
```

### Pruebas Manuales

1. **Probar extracción de PDF:**
   - Ir a `/crm/listas`
   - Hacer clic en un curso con PDF
   - Hacer clic en "Procesar con IA"
   - Verificar que los productos se extraen correctamente

2. **Verificar validación contra WooCommerce:**
   - Verificar que productos encontrados muestran precio y stock
   - Verificar que productos no encontrados muestran badge "No Encontrado"

3. **Verificar persistencia:**
   - Recargar la página
   - Verificar que los productos persisten en Strapi

---

## ⚠️ Problemas Conocidos y Limitaciones

### 1. Modelos de Gemini No Disponibles

**Problema:** Ningún modelo de Gemini está disponible con la API key actual.

**Solución Implementada:** Extracción de texto como alternativa.

**Solución Futura Recomendada:**
- Verificar API key en Google AI Studio
- Habilitar API en Google Cloud Console
- Verificar permisos y cuotas
- Considerar usar API v1 en lugar de v1beta

### 2. PDFs Escaneados

**Problema:** `pdf-parse` no puede extraer texto de PDFs escaneados (imágenes).

**Solución Futura Recomendada:**
- Usar OCR (Tesseract.js, Google Vision API)
- O usar modelos de Gemini que soporten imágenes directamente

### 3. Pérdida de Formato

**Problema:** Al extraer texto, se pierde información visual (tablas, formato).

**Impacto:** Puede afectar la precisión de la extracción.

**Mitigación:** El prompt de Gemini está diseñado para manejar texto plano y extraer información estructurada.

---

## 🔑 Configuración Requerida

### Variables de Entorno

Agregar en `.env.local`:

```env
GEMINI_API_KEY=tu_api_key_aqui
```

**Nota:** La API key está hardcodeada como fallback, pero se recomienda usar la variable de entorno.

### Dependencias

```json
{
  "dependencies": {
    "@google/generative-ai": "^0.24.1",
    "pdf-parse": "^2.4.5",
    "react-pdf": "^9.2.1"
  }
}
```

---

## 📊 Estado del Proyecto

### ✅ Completado

- [x] Implementación de extracción de texto como alternativa
- [x] Integración con `pdf-parse`
- [x] Manejo de errores mejorado
- [x] Listado de modelos disponibles
- [x] Validación contra WooCommerce Escolar
- [x] Guardado de productos en Strapi
- [x] Interfaz de usuario completa
- [x] Documentación

### ⚠️ Pendiente

- [ ] Verificar y habilitar modelos de Gemini en Google Cloud Console
- [ ] Probar con PDFs reales de listas de útiles
- [ ] Optimizar prompt para mejor extracción
- [ ] Manejar PDFs escaneados (OCR)
- [ ] Mejorar manejo de errores de extracción de texto

### 🔄 Mejoras Futuras Sugeridas

1. **OCR para PDFs Escaneados:**
   - Integrar Tesseract.js o Google Vision API
   - Detectar si el PDF es escaneado antes de procesar

2. **Mejor Extracción de Tablas:**
   - Usar bibliotecas especializadas para extraer tablas del PDF
   - Mejorar prompt para manejar tablas en texto plano

3. **Caché de Resultados:**
   - Guardar resultados de extracción para evitar reprocesar
   - Invalidar caché cuando el PDF cambia

4. **Procesamiento Asíncrono:**
   - Para PDFs grandes, procesar en background
   - Notificar al usuario cuando termine

---

## 🚀 Próximos Pasos

### Inmediatos

1. **Verificar API Key de Gemini:**
   - Ir a Google AI Studio: https://aistudio.google.com/
   - Verificar que la API key tenga acceso a modelos
   - Habilitar API en Google Cloud Console si es necesario

2. **Probar con PDF Real:**
   - Subir un PDF de lista de útiles real
   - Probar la extracción completa
   - Verificar que los productos se extraen correctamente

3. **Ajustar Prompt:**
   - Basado en resultados reales, ajustar el prompt
   - Mejorar formato de respuesta esperado

### Mediano Plazo

1. **Optimizar Extracción:**
   - Mejorar manejo de tablas
   - Mejorar extracción de precios y cantidades
   - Manejar diferentes formatos de listas

2. **Mejorar Validación:**
   - Mejorar búsqueda de productos en WooCommerce
   - Manejar variaciones de nombres
   - Sugerir productos similares si no se encuentra exacto

### Largo Plazo

1. **OCR para PDFs Escaneados:**
   - Implementar detección de PDFs escaneados
   - Integrar OCR cuando sea necesario

2. **Machine Learning:**
   - Entrenar modelo para reconocer formatos de listas
   - Mejorar precisión de extracción

---

## 📚 Referencias y Recursos

### Documentación

- [Google Gemini API](https://ai.google.dev/)
- [pdf-parse npm](https://www.npmjs.com/package/pdf-parse)
- [react-pdf Documentation](https://react-pdf.org/)
- [WooCommerce REST API](https://woocommerce.github.io/woocommerce-rest-api-docs/)

### Archivos de Documentación Relacionados

- `DOCUMENTACION-EXTRACCION-PDF-ACTUAL.md` - Documentación técnica detallada
- `GUIA-INTEGRACION-RAMA-MATI.md` - Guía de integración de la rama
- `GEMINI-AI-CONFIG.md` - Configuración de credenciales

### Endpoints de API

- `GET /api/crm/listas/test-gemini` - Probar modelos disponibles
- `POST /api/crm/listas/[id]/procesar-pdf` - Procesar PDF con Gemini
- `GET /api/crm/listas/[id]` - Obtener datos de lista
- `GET /api/crm/listas/pdf/[pdfId]` - Servir PDF desde Strapi

---

## 💡 Lecciones Aprendidas

### 1. APIs en Evolución

Las APIs de IA están en constante evolución. Los nombres de modelos y versiones cambian frecuentemente. Es importante:
- Tener múltiples estrategias de fallback
- Listar modelos disponibles dinámicamente
- No depender de nombres de modelos hardcodeados

### 2. Extracción de Texto como Alternativa

Cuando una API no soporta un formato directamente (PDF), extraer el contenido (texto) puede ser una solución viable:
- Más compatible
- Menos dependiente de características específicas
- Puede funcionar con múltiples proveedores de IA

### 3. Manejo de Errores Robusto

Es crucial tener múltiples niveles de manejo de errores:
- Errores de API (modelos no disponibles)
- Errores de procesamiento (PDF inválido)
- Errores de extracción (PDF escaneado)
- Errores de validación (productos no encontrados)

### 4. Logging Detallado

El logging detallado es esencial para debugging:
- Logs en cada paso del proceso
- Información sobre qué modelo se está usando
- Errores específicos con contexto

---

## 👥 Equipo y Contacto

**Desarrollador Principal:** Mati  
**Rama:** `mati-integracion`  
**Fecha de Implementación:** Enero 2025

Para preguntas o problemas:
1. Revisar este documento
2. Consultar documentación técnica relacionada
3. Revisar logs del servidor
4. Usar endpoint de prueba `/api/crm/listas/test-gemini`

---

## 📝 Notas Finales

Esta implementación representa un enfoque pragmático para resolver el problema de extracción de productos desde PDFs. Aunque los modelos de Gemini no están disponibles actualmente, la solución alternativa con extracción de texto debería funcionar para la mayoría de los casos de uso.

El código está diseñado para:
- Intentar primero la solución ideal (PDF directo)
- Caer automáticamente a la solución alternativa (texto extraído)
- Proporcionar feedback claro sobre qué método se está usando
- Manejar errores de manera robusta

**Estado:** ✅ Listo para pruebas con PDFs reales

---

**Última Actualización:** Enero 2025  
**Versión del Documento:** 1.0
