# 📋 Cambios: Importación Completa - Múltiples PDFs y Versionado

## 🎯 Objetivo

Modificar la importación completa para soportar:
1. **Múltiples URLs de PDF** en la columna "URL PDF" (separadas por coma, punto y coma, o salto de línea)
2. **URL Original** (página de origen del PDF) para dar confianza al cliente
3. **Fecha de Actualización de Lista** para versionar las listas (v1, v2, v3, etc.)

---

## 📝 Cambios Realizados

### 1. **Interfaces Actualizadas**

#### `ImportRow`
- `URL_lista`: Ahora puede ser `string | string[]` (una URL o múltiples URLs)
- `URL_original`: Nueva propiedad para la URL de la página de origen
- `Fecha_actualizacion_lista`: Nueva propiedad para la fecha de actualización de la lista

#### `AgrupadoPorLista.lista`
- `url_lista`: Ahora puede ser `string | string[]`
- `url_original`: Nueva propiedad
- `fecha_actualizacion_lista`: Nueva propiedad

---

### 2. **Nuevas Funciones de Extracción**

#### `obtenerURLsPDF(row: any): string[]`
- **Antes:** `obtenerURLLista()` retornaba una sola URL
- **Ahora:** Retorna un array de URLs
- **Soporta múltiples separadores:** Coma (`,`), punto y coma (`;`), salto de línea (`\n` o `\r`)
- **Ejemplo:** `"https://url1.pdf, https://url2.pdf; https://url3.pdf"` → `["https://url1.pdf", "https://url2.pdf", "https://url3.pdf"]`

#### `obtenerURLOriginal(row: any): string | undefined`
- Busca la columna "URL ORIGINAL" (case-insensitive)
- También busca variantes: "URL_ORIGEN", "ORIGEN", "FUENTE", "PAGINA_ORIGEN"
- Retorna la URL de la página de origen del PDF

#### `obtenerFechaActualizacionLista(row: any): string | undefined`
- Busca la columna "FECHA DE ACTUALIZACION DE LISTA DE UTILES" (case-insensitive)
- También busca variantes: "FECHA_ACTUALIZACION_LISTA", "FECHA ACTUALIZACION LISTA"
- Retorna la fecha de actualización de la lista

---

### 3. **Normalización de Datos**

- Actualizado para usar `obtenerURLsPDF()` en lugar de `obtenerURLLista()`
- Captura `URL_original` y `Fecha_actualizacion_lista` en la normalización
- Maneja arrays de URLs en el agrupamiento

---

### 4. **Agrupamiento Mejorado**

- **Combinación de URLs:** Si múltiples filas tienen URLs, se combinan en un array único
- **URL Original:** Se captura de la primera fila que la tenga
- **Fecha de Actualización:** Se compara y se usa la más reciente si hay múltiples fechas

```typescript
// Si el grupo no tiene URL_lista pero esta fila sí la tiene, actualizarla
const urlsPDF = obtenerURLsPDF(row)
if (urlsPDF.length > 0 && (!grupo.lista.url_lista || (Array.isArray(grupo.lista.url_lista) && grupo.lista.url_lista.length === 0))) {
  grupo.lista.url_lista = urlsPDF
} else if (urlsPDF.length > 0 && Array.isArray(grupo.lista.url_lista)) {
  // Combinar URLs únicas
  const urlsExistentes = new Set(grupo.lista.url_lista)
  urlsPDF.forEach(url => urlsExistentes.add(url))
  grupo.lista.url_lista = Array.from(urlsExistentes)
}
```

---

### 5. **Procesamiento de Múltiples PDFs**

#### Prioridad 1: PDFs Subidos Manualmente
- Funciona igual que antes (sin cambios)

#### Prioridad 2: Descargar desde URLs
- **Antes:** Descargaba una sola URL
- **Ahora:** Descarga todas las URLs del array `urlsPDF`
- **Delay entre descargas:** 1 segundo entre cada descarga para evitar saturar
- **Nombres de archivo:** Si hay múltiples PDFs, se nombran como `lista-asignatura_1.pdf`, `lista-asignatura_2.pdf`, etc.

```typescript
// Descargar cada URL
for (let i = 0; i < urlsPDF.length; i++) {
  const urlParaDescargar = urlsPDF[i]
  const nombrePDF = urlsPDF.length === 1
    ? `${grupo.lista.nombre || 'lista'}-${grupo.asignatura.nombre || 'asignatura'}.pdf`
    : `${grupo.lista.nombre || 'lista'}-${grupo.asignatura.nombre || 'asignatura'}_${i + 1}.pdf`
  
  const resultadoPDF = await descargarYSubirPDF(urlParaDescargar, nombrePDF)
  // ... procesar resultado
}
```

---

### 6. **Sistema de Versionado**

#### Lógica de Versionado

1. **Comparación de Fechas:**
   - Si `fecha_actualizacion_lista` es más reciente que la última versión existente → **Nueva versión**
   - Si `fecha_actualizacion_lista` es igual o muy cercana (menos de 1 día) → **Actualizar versión existente**
   - Si `fecha_actualizacion_lista` es más antigua → **Nueva versión** (pero con número basado en total)

2. **Cálculo de Número de Versión:**
   - Busca versiones existentes con la misma asignatura
   - Si es nueva versión: `numeroVersion = versionesMismaAsignatura.length + 1`
   - Si es actualización: `numeroVersion = versionesMismaAsignatura.length`

3. **Nombre de Archivo con Versión:**
   - Nueva versión: `"Lista de Útiles (v1)"`, `"Lista de Útiles (v2)"`, etc.
   - Actualización: Mantiene el nombre base (sin cambiar el número de versión)

4. **Metadata:**
   - `version_numero`: Número de versión (1, 2, 3, ...)
   - `metadata.version`: Número de versión en metadata también
   - `metadata.url_original`: URL de la página de origen
   - `metadata.fecha_actualizacion_lista`: Fecha de actualización de la lista

#### Ejemplo de Flujo:

```
Febrero 2026:
- Se carga lista con fecha "2026-02-01"
- Se crea versión v1: "Lista de Útiles (v1)"

Abril 2026:
- Se carga lista con fecha "2026-04-15" (más reciente)
- Se detecta nueva versión
- Se crea versión v2: "Lista de Útiles (v2)"

Abril 2026 (mismo día):
- Se carga lista con fecha "2026-04-15" (misma fecha)
- Se detecta actualización
- Se actualiza versión v2 existente
```

---

### 7. **Estructura de Versión Actualizada**

```typescript
const versionMaterial = {
  id: esNuevaVersion ? versionesExistentes.length + 1 : versionExistenteParaActualizar?.id,
  nombre_archivo: nombreConVersion, // "Lista de Útiles (v1)"
  fecha_subida: fechaActualizacionLista || grupo.lista.fecha_actualizacion || new Date().toISOString(),
  fecha_actualizacion: fechaActualizacionLista || grupo.lista.fecha_actualizacion || new Date().toISOString(),
  fecha_publicacion: grupo.lista.fecha_publicacion,
  materiales: materiales,
  pdf_url: pdfUrl || null,
  pdf_id: pdfId || null,
  version_numero: numeroVersion, // 1, 2, 3, ...
  metadata: {
    nombre: grupo.lista.nombre,
    asignatura: grupo.asignatura.nombre,
    orden_asignatura: grupo.asignatura.orden,
    url_lista: Array.isArray(grupo.lista.url_lista) ? grupo.lista.url_lista : grupo.lista.url_lista,
    url_original: grupo.lista.url_original || null, // ✨ NUEVO
    url_publicacion: grupo.lista.url_publicacion || null,
    fecha_actualizacion_lista: fechaActualizacionLista || null, // ✨ NUEVO
    version: numeroVersion, // ✨ NUEVO
  },
}
```

---

### 8. **Mensajes de Resultado Actualizados**

```typescript
const mensajeVersion = esNuevaVersion 
  ? `Lista "${grupo.lista.nombre}" (${grupo.asignatura.nombre}) creada v${numeroVersion} con ${materiales.length} productos`
  : `Lista "${grupo.lista.nombre}" (${grupo.asignatura.nombre}) actualizada v${numeroVersion} con ${materiales.length} productos`
```

---

## 📊 Formato de Plantilla Excel

### Columnas Requeridas:

| Columna | Descripción | Ejemplo | Múltiples Valores |
|---------|-------------|---------|-------------------|
| **RBD** | RBD del colegio | `257` | No |
| **Curso** | Nombre del curso | `1º Básico` | No |
| **Nº curso** | Número del curso | `1` | No |
| **Año** | Año del curso | `2025` | No |
| **URL PDF** | URL(s) del PDF | `https://url1.pdf, https://url2.pdf` | ✅ Sí (separadas por coma, punto y coma, o salto de línea) |
| **URL ORIGINAL** | URL de la página de origen | `https://colegio.cl/listas` | No |
| **FECHA DE ACTUALIZACION DE LISTA DE UTILES** | Fecha de actualización | `2026-02-01` | No |

### Ejemplo de Fila:

```
RBD: 257
Curso: 1º Básico
Nº curso: 1
Año: 2025
URL PDF: https://colegio.cl/pdf1.pdf, https://colegio.cl/pdf2.pdf
URL ORIGINAL: https://colegio.cl/listas-utiles
FECHA DE ACTUALIZACION DE LISTA DE UTILES: 2026-02-01
```

---

## 🔄 Flujo de Versionado

```
1. Usuario sube Excel con fecha "2026-02-01"
   ↓
2. Sistema busca versiones existentes de la misma asignatura
   ↓
3. Compara fechas:
   - Si fecha nueva > fecha última versión → Nueva versión (v2, v3, etc.)
   - Si fecha nueva ≈ fecha última versión → Actualizar versión existente
   ↓
4. Crea/actualiza versión con:
   - Nombre: "Lista de Útiles (v1)", "Lista de Útiles (v2)", etc.
   - version_numero: 1, 2, 3, ...
   - url_original: URL de la página de origen
   - fecha_actualizacion_lista: Fecha de actualización
```

---

## ✅ Características Implementadas

- ✅ **Múltiples URLs de PDF:** Soporta múltiples URLs separadas por coma, punto y coma, o salto de línea
- ✅ **Descarga automática:** Descarga todos los PDFs desde las URLs automáticamente
- ✅ **URL Original:** Guarda la URL de la página de origen en metadata
- ✅ **Versionado por fecha:** Compara fechas para determinar si es nueva versión o actualización
- ✅ **Números de versión:** Asigna v1, v2, v3, etc. automáticamente
- ✅ **Nombres con versión:** Los nombres de archivo incluyen el número de versión
- ✅ **Actualización inteligente:** Actualiza versiones existentes si la fecha es la misma o muy cercana
- ✅ **Mensajes informativos:** Los mensajes de resultado incluyen el número de versión

---

## 🧪 Cómo Probar

1. **Crear Excel con múltiples URLs:**
   ```
   URL PDF: https://url1.pdf, https://url2.pdf
   URL ORIGINAL: https://colegio.cl/listas
   FECHA DE ACTUALIZACION DE LISTA DE UTILES: 2026-02-01
   ```

2. **Subir el Excel** en `/crm/listas` → "Importación Completa (Plantilla)"

3. **Verificar:**
   - Se descargan ambos PDFs
   - Se crea versión v1 con ambos PDFs
   - Metadata incluye `url_original` y `fecha_actualizacion_lista`

4. **Probar versionado:**
   - Subir otro Excel con fecha más reciente (ej: 2026-04-15)
   - Verificar que se crea versión v2
   - Verificar que el nombre incluye "(v2)"

5. **Probar actualización:**
   - Subir otro Excel con la misma fecha
   - Verificar que se actualiza la versión existente (no se crea nueva)

---

## 📝 Notas Importantes

- **Separadores de URLs:** Coma (`,`), punto y coma (`;`), o salto de línea (`\n` o `\r`)
- **Formato de fecha:** Cualquier formato que `new Date()` pueda parsear
- **Comparación de fechas:** Tolerancia de 1 día para considerar "misma fecha"
- **Versiones por asignatura:** El versionado es independiente por asignatura (cada asignatura tiene sus propias versiones v1, v2, etc.)

---

## 🐛 Troubleshooting

### Problema: No se descargan múltiples PDFs
**Solución:** Verificar que las URLs estén separadas correctamente (coma, punto y coma, o salto de línea)

### Problema: No se detecta nueva versión
**Solución:** Verificar que la fecha de actualización sea más reciente que la última versión existente

### Problema: Se crean versiones duplicadas
**Solución:** Verificar que la fecha de actualización esté en formato correcto y que el sistema pueda parsearla

---

## 📅 Fecha de Implementación

**Fecha:** 2026-02-04
**Rama:** `intranet-matias`
**Archivo modificado:** `ImportacionCompletaModal.tsx`
