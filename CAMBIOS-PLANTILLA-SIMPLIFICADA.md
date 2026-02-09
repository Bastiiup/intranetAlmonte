# 📋 Cambios: Plantilla Simplificada de Importación

## 🎯 Objetivo

Ajustar la importación completa para que funcione con la **plantilla exacta** mostrada en la imagen:

```
RBD | Curso | Nº curso | Año | URL PDF | URL ORIGINAL | FECHA DE ACTUALIZACION DE LISTA DE UTILES
```

---

## 📝 Cambios Realizados

### 1. **Detección de Formato Simplificado**

El sistema ahora detecta automáticamente si el Excel usa el formato simplificado:

```typescript
const tieneFormatoSimplificado = !!(colRBD && colCurso && colNcurso && colAño)
```

**Columnas requeridas para formato simplificado:**
- ✅ RBD
- ✅ Curso
- ✅ Nº curso
- ✅ Año

**Columnas opcionales:**
- URL PDF (puede tener múltiples URLs)
- URL ORIGINAL
- FECHA DE ACTUALIZACION DE LISTA DE UTILES

---

### 2. **Validación Actualizada**

**Antes:** Requería RBD, Curso, Asignatura y Producto

**Ahora:** Acepta dos formatos:

#### Formato Simplificado:
- RBD ✅
- Curso ✅
- Nº curso ✅
- Año ✅
- (Sin Asignatura ni Producto)

#### Formato Completo:
- RBD, Curso, Asignatura, Producto ✅

---

### 3. **Agrupamiento para Formato Simplificado**

Cuando se detecta formato simplificado:

- **Asignatura:** Se asigna "General" por defecto
- **Lista:** Se asigna "Lista de Útiles" por defecto
- **Productos:** Array vacío (sin productos)
- **Grado:** Se extrae de la columna "Nº curso"
- **Nivel:** Se extrae del nombre del curso (Básica/Media)

```typescript
if (tieneFormatoSimplificado) {
  const clave = `${identificadorColegio}|${row.Curso}|General|Lista de Útiles`
  // Crear grupo sin productos, solo con información de curso y PDFs
}
```

---

### 4. **Extracción de "Nº curso"**

El sistema ahora detecta correctamente la columna "Nº curso" y la usa para el grado:

```typescript
const colNcurso = findKey(['Nº curso', 'N° curso', 'No curso', 'Grado', 'grado'])
const ncursoVal = getVal(row, colNcurso, 'Nº curso', 'N° curso', 'Grado', 'grado')
grado = parseInt(String(ncursoVal)) || 1
```

---

### 5. **Procesamiento Sin Productos**

El sistema ahora permite crear versiones de materiales **sin productos** (solo con PDFs):

```typescript
// Si es formato simplificado (sin productos), crear versión vacía pero con PDF
const esFormatoSimplificado = materiales.length === 0 && (pdfUrl || pdfId)

// Se permite crear versión solo con PDF, sin materiales
if (!pdfUrl && !pdfId && materiales.length === 0) {
  // Omitir solo si no hay ni PDF ni materiales
}
```

---

### 6. **Instrucciones Actualizadas**

Las instrucciones en el modal ahora reflejan el formato simplificado:

```
Columnas obligatorias: RBD, Curso, Nº curso, Año
Columnas opcionales: URL PDF, URL ORIGINAL, FECHA DE ACTUALIZACION DE LISTA DE UTILES
```

---

## 📊 Estructura de la Plantilla

### Columnas Exactas (según imagen):

| Columna | Descripción | Obligatorio | Ejemplo |
|---------|-------------|-------------|---------|
| **RBD** | RBD del colegio | ✅ Sí | `257` |
| **Curso** | Nombre del curso | ✅ Sí | `1º Básico`, `IVº Medio` |
| **Nº curso** | Número del curso | ✅ Sí | `1` |
| **Año** | Año del curso | ✅ Sí | `2025` |
| **URL PDF** | URL(s) del PDF | ❌ No | `https://url1.pdf, https://url2.pdf` |
| **URL ORIGINAL** | URL de la página de origen | ❌ No | `https://colegio.cl/listas` |
| **FECHA DE ACTUALIZACION DE LISTA DE UTILES** | Fecha de actualización | ❌ No | `2026-02-01` |

---

## 🔄 Flujo de Procesamiento

### Formato Simplificado:

```
1. Usuario sube Excel con: RBD, Curso, Nº curso, Año, URL PDF, URL ORIGINAL, FECHA...
   ↓
2. Sistema detecta formato simplificado (no hay Asignatura ni Producto)
   ↓
3. Agrupa por: RBD|Curso|General|Lista de Útiles
   ↓
4. Extrae grado de "Nº curso"
   ↓
5. Extrae nivel del nombre del curso
   ↓
6. Descarga PDFs desde URLs (si hay)
   ↓
7. Crea curso (si no existe)
   ↓
8. Crea versión de materiales:
   - Sin productos (array vacío)
   - Con PDFs descargados
   - Con versionado (v1, v2, v3) según fecha
   - Con URL original en metadata
```

---

## ✅ Características Implementadas

- ✅ **Detección automática** de formato simplificado
- ✅ **Soporte para "Nº curso"** como columna de grado
- ✅ **Creación de cursos sin productos** (solo con PDFs)
- ✅ **Asignatura "General"** por defecto para formato simplificado
- ✅ **Múltiples URLs de PDF** (separadas por coma, punto y coma, o salto de línea)
- ✅ **URL Original** guardada en metadata
- ✅ **Versionado por fecha** (v1, v2, v3, etc.)
- ✅ **Instrucciones actualizadas** en el modal

---

## 🧪 Cómo Probar

1. **Crear Excel con formato simplificado:**
   ```
   RBD: 257
   Curso: 1º Básico
   Nº curso: 1
   Año: 2025
   URL PDF: https://url1.pdf, https://url2.pdf
   URL ORIGINAL: https://colegio.cl/listas
   FECHA DE ACTUALIZACION DE LISTA DE UTILES: 2026-02-01
   ```

2. **Subir el Excel** en `/crm/listas` → "Importación Completa (Plantilla)"

3. **Verificar:**
   - Se detecta formato simplificado
   - Se crea curso con grado extraído de "Nº curso"
   - Se descargan ambos PDFs
   - Se crea versión v1 sin productos (solo con PDFs)
   - Metadata incluye URL original y fecha de actualización

4. **Probar versionado:**
   - Subir otro Excel con fecha más reciente
   - Verificar que se crea versión v2

---

## 📝 Notas Importantes

- **Formato simplificado:** No requiere Asignatura ni Producto
- **Formato completo:** Sigue funcionando como antes (con Asignatura y Producto)
- **Detección automática:** El sistema detecta qué formato usar según las columnas presentes
- **"Nº curso":** Se normaliza a "Grado" internamente para consistencia
- **Sin productos:** Se permite crear versiones solo con PDFs (útil para listas que se procesarán después con IA)

---

## 🔄 Compatibilidad

El sistema mantiene **compatibilidad hacia atrás** con el formato completo:
- Si el Excel tiene Asignatura y Producto → Usa formato completo
- Si el Excel solo tiene RBD, Curso, Nº curso, Año → Usa formato simplificado

---

## 📅 Fecha de Implementación

**Fecha:** 2026-02-04
**Rama:** `intranet-matias`
**Archivo modificado:** `ImportacionCompletaModal.tsx`
