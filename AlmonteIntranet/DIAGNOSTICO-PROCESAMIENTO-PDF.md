# 🔍 DIAGNÓSTICO: Procesamiento de PDF con Claude AI

## 📋 FLUJO COMPLETO DEL PROCESAMIENTO

### 1. **DESCARGAR PDF** (`/api/crm/listas/[id]/procesar-pdf`)
- ✅ Obtiene `pdf_id` o `pdf_url` del curso
- ✅ Descarga el PDF desde Strapi
- ✅ Valida tamaño (máx 10MB)
- ✅ Valida header PDF (`%PDF`)

**Logs esperados:**
```
📥 Descargando PDF desde Strapi...
✅ PDF descargado exitosamente
```

---

### 2. **EXTRAER TEXTO DEL PDF** (`extraerTextoDelPDF`)
- ✅ Usa `pdf-parse` para extraer texto
- ✅ Si falla, intenta extracción básica (fallback)
- ⚠️ **PROBLEMA POTENCIAL**: Si el PDF es solo imágenes (escaneado), no se puede extraer texto

**Logs esperados:**
```
🔍 Iniciando extracción de texto con pdf-parse...
📄 pdf-parse cargado, ejecutando extracción...
📊 Resultado de pdf-parse: { tieneTexto: true, longitudTexto: XXXX }
✅ Texto extraído exitosamente con pdf-parse
```

**Si falla:**
```
❌ PDF no contiene texto extraíble
pdf-parse falló, intentando extracción básica...
```

---

### 3. **LIMPIAR TEXTO** (`limpiarTextoExtraido`)
- ✅ Normaliza saltos de línea
- ✅ Corrige espacios y puntuación
- ✅ Elimina líneas vacías múltiples

**Logs esperados:**
```
✅ Texto limpiado: { caracteresOriginales: XXXX, caracteresLimpios: XXXX }
```

---

### 4. **VALIDAR LONGITUD** (`validarLongitudTexto`)
- ✅ Verifica que no exceda 50,000 caracteres
- ✅ Si excede, trunca al 90% del límite

**Logs esperados:**
```
Texto excede límite seguro, truncando automáticamente...
Texto truncado exitosamente
```

---

### 5. **PROCESAR CON CLAUDE AI** (`procesarConClaude`)
- ✅ Envía prompt + texto a Claude
- ✅ Modelo: `claude-3-haiku-20240307`
- ✅ Max tokens respuesta: 4096
- ⚠️ **PROBLEMA POTENCIAL**: Si la respuesta se corta (95%+ tokens), puede perder productos

**Logs esperados:**
```
🤖 Procesando con Claude AI (intento 1/3)...
📥 Respuesta recibida de Claude: { longitud: XXXX, preview: "..." }
✅ Claude procesó el texto exitosamente: { productosEncontrados: X }
```

**Si hay problemas:**
```
⚠️ La respuesta de Claude puede estar cortada - se usó más del 95% de los tokens
⚠️ No se encontró JSON válido en la respuesta de Claude
❌ Error al parsear JSON de Claude
❌ Error de validación Zod
```

---

### 6. **FILTRAR PRODUCTOS** (`productosFiltrados`)
- ✅ Valida que tenga nombre
- ✅ Limpia URLs
- ⚠️ **PROBLEMA POTENCIAL**: Si el filtrado es muy agresivo, puede eliminar productos válidos

**Logs esperados:**
```
🔍 Filtrando productos... { totalAntesFiltrado: X }
✅ Filtrado completado: { totalAntes: X, totalDespues: Y }
```

**Si todos se filtran:**
```
❌ Todos los productos fueron filtrados
```

---

### 7. **BUSCAR EN WOOCOMMERCE** (`buscarEnWooCommerce`)
- ✅ Busca cada producto en WooCommerce
- ✅ Extrae coordenadas reales del PDF (si es posible)

---

### 8. **GUARDAR EN STRAPI**
- ✅ Actualiza `versiones_materiales` del curso
- ✅ Guarda productos con coordenadas

---

## 🐛 POSIBLES PROBLEMAS Y SOLUCIONES

### Problema 1: **Claude no encuentra productos (0 productos)**
**Causas posibles:**
- El texto extraído está vacío o corrupto
- El prompt no es claro
- Claude está interpretando mal el texto

**Solución:**
- Revisar logs: `📤 Texto que se enviará a Claude`
- Verificar que el texto tenga contenido legible
- Mejorar el prompt si es necesario

---

### Problema 2: **Claude encuentra productos pero el filtrado los elimina todos**
**Causas posibles:**
- Filtrado demasiado agresivo
- Productos con nombres que parecen instrucciones

**Solución:**
- Revisar logs: `🔍 Filtrando productos...` y `✅ Filtrado completado`
- Ver qué productos se están filtrando y por qué
- Ajustar el filtrado

---

### Problema 3: **La respuesta de Claude se corta (tokens)**
**Causas posibles:**
- PDF muy grande con muchos productos
- `max_tokens` (4096) insuficiente

**Solución:**
- Revisar logs: `⚠️ La respuesta de Claude puede estar cortada`
- Si se usa >95% de tokens, la respuesta puede estar incompleta
- Considerar procesar en lotes o aumentar tokens (si el modelo lo permite)

---

### Problema 4: **Error al extraer texto del PDF**
**Causas posibles:**
- PDF escaneado (solo imágenes, sin texto)
- PDF corrupto
- `pdf-parse` falla

**Solución:**
- Revisar logs: `❌ PDF no contiene texto extraíble`
- Verificar que el PDF tenga texto seleccionable
- Si es escaneado, necesitaría OCR (no implementado)

---

## 📊 LOGS A REVISAR

Cuando proceses un PDF, busca estos logs en la consola del servidor:

1. **`📥 Descargando PDF desde Strapi...`** - ¿Se descarga correctamente?
2. **`📄 Extrayendo texto del PDF...`** - ¿Se extrae texto?
3. **`✅ Texto extraído exitosamente`** - ¿Cuántos caracteres?
4. **`📤 Texto que se enviará a Claude`** - ¿Qué texto se envía?
5. **`📥 Respuesta recibida de Claude`** - ¿Qué responde Claude?
6. **`📊 Resultado de Claude`** - ¿Cuántos productos encontró?
7. **`🔍 Filtrando productos...`** - ¿Cuántos productos antes del filtrado?
8. **`✅ Filtrado completado`** - ¿Cuántos productos después del filtrado?

---

## 🔧 PRÓXIMOS PASOS

1. Procesa un PDF
2. Copia TODOS los logs del servidor (consola de Node.js)
3. Comparte los logs para diagnosticar el problema exacto
