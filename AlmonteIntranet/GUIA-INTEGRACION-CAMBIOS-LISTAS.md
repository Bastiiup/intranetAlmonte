# 📘 Guía de Integración - Mejoras en Sistema de Listas

**Para:** Integrar cambios de la rama `mati-integracion` a otra rama  
**Fecha:** 21 de Enero, 2026  
**Autor:** Mati

---

## 🎯 Objetivo

Esta guía te ayudará a incorporar todas las mejoras del sistema de listas de útiles desde la rama `mati-integracion` a tu rama de trabajo.

---

## 📋 Paso 1: Preparar tu Entorno

### 1.1 Asegúrate de estar en tu rama de trabajo

```bash
# Verificar rama actual
git branch

# Si no estás en tu rama, cambiar a ella
git checkout tu-rama-de-trabajo
```

### 1.2 Asegúrate de tener los últimos cambios de main

```bash
# Traer cambios remotos
git fetch origin

# Si estás en main, actualizar
git pull origin main

# Si estás en otra rama, traer cambios de main
git merge origin/main
```

---

## 📥 Paso 2: Traer los Cambios de mati-integracion

### Opción A: Merge (Recomendado si quieres mantener historial)

```bash
# Traer cambios de la rama mati-integracion
git fetch origin mati-integracion

# Hacer merge de los cambios
git merge origin/mati-integracion
```

### Opción B: Cherry-pick (Si solo quieres commits específicos)

```bash
# Ver los commits de mati-integracion
git log origin/mati-integracion --oneline

# Hacer cherry-pick de commits específicos
git cherry-pick <commit-hash-1>
git cherry-pick <commit-hash-2>
```

### Opción C: Rebase (Si quieres aplicar cambios encima de tu trabajo)

```bash
# Traer cambios
git fetch origin mati-integracion

# Hacer rebase
git rebase origin/mati-integracion
```

---

## 🔍 Paso 3: Resolver Conflictos (Si los hay)

Si Git te indica que hay conflictos:

### 3.1 Identificar archivos con conflictos

```bash
git status
```

### 3.2 Resolver conflictos manualmente

Los archivos más probables de tener conflictos son:

1. **`src/app/api/crm/listas/route.ts`**
   - Busca la sección donde se construye `nombreCompleto`
   - Asegúrate de que incluya la lógica de corrección de doble letra
   - Verifica que se incluyan `colegio.direccion`, `colegio.comuna`, `colegio.region`
   - Verifica que se incluyan `createdAt` y `updatedAt`

2. **`src/app/(admin)/(apps)/crm/listas/components/ListasListing.tsx`**
   - Verifica que la interface `ListaType` incluya los nuevos campos
   - Verifica que las columnas nuevas estén definidas
   - Verifica que los filtros nuevos estén implementados

3. **`src/app/api/crm/listas/[id]/procesar-pdf/route.ts`**
   - Verifica que `MODELOS_DISPONIBLES` solo tenga `gemini-2.5-flash` y `gemini-2.5-flash-lite`
   - Verifica que el manejo de errores 429 esté implementado

### 3.3 Después de resolver conflictos

```bash
# Agregar archivos resueltos
git add <archivo-resuelto>

# Continuar el merge/rebase
git commit  # Si es merge
# o
git rebase --continue  # Si es rebase
```

---

## ✅ Paso 4: Verificar Archivos Nuevos

Asegúrate de que estos archivos nuevos existan:

### 4.1 Archivos de API nuevos

```
src/app/api/crm/listas/[id]/aprobar-producto/route.ts
src/app/api/crm/listas/[id]/productos/[productoId]/route.ts
src/app/api/crm/listas/aprobar-lista/route.ts
src/app/api/crm/listas/carga-masiva-ia/route.ts
src/app/api/crm/listas/debug-logs/route.ts
```

### 4.2 Archivos de Frontend nuevos

```
src/app/(admin)/(apps)/crm/listas/logs/page.tsx
src/app/(admin)/(apps)/crm/listas/logs/components/LogsViewer.tsx
```

### 4.3 Verificar que existan

```bash
# Verificar archivos nuevos
ls src/app/api/crm/listas/[id]/aprobar-producto/route.ts
ls src/app/api/crm/listas/[id]/productos/[productoId]/route.ts
ls src/app/api/crm/listas/aprobar-lista/route.ts
ls src/app/api/crm/listas/carga-masiva-ia/route.ts
ls src/app/api/crm/listas/debug-logs/route.ts
ls src/app/(admin)/(apps)/crm/listas/logs/page.tsx
ls src/app/(admin)/(apps)/crm/listas/logs/components/LogsViewer.tsx
```

---

## 🔧 Paso 5: Verificar Variables de Entorno

### 5.1 Verificar `.env.local`

Asegúrate de que tu archivo `.env.local` tenga:

```env
GEMINI_API_KEY=AIzaSyB_5goHo1ci1l588RER49_oUbXCrLAn3YA
NEXT_PUBLIC_STRAPI_URL=https://strapi.moraleja.cl
STRAPI_API_TOKEN=<tu-token>
```

### 5.2 Verificar que la API key funcione

```bash
# Iniciar servidor
npm run dev

# Probar endpoint de test
curl http://localhost:3000/api/test-env
```

O visita: `http://localhost:3000/api/test-env`

Deberías ver:
```json
{
  "hasGeminiApiKey": true,
  "geminiApiKeyLength": 39
}
```

---

## 🧪 Paso 6: Probar Funcionalidades

### 6.1 Probar Corrección de Doble Letra

1. Ve a `/crm/listas`
2. Busca un curso que tenga doble letra (ej: "1° Basica A A")
3. Verifica que ahora muestre solo una letra (ej: "1° Basica A")

**Archivo a verificar:** `src/app/api/crm/listas/route.ts` (líneas 162-205)

### 6.2 Probar Datos del Colegio

1. Ve a `/crm/listas`
2. Verifica que la columna "Colegio" muestre:
   - Nombre del colegio
   - Dirección
   - Comuna
   - Región

**Archivo a verificar:** `src/app/(admin)/(apps)/crm/listas/components/ListasListing.tsx`

### 6.3 Probar Fechas

1. Ve a `/crm/listas`
2. Verifica que la columna "Fechas" muestre:
   - Fecha de modificación
   - Fecha de creación

### 6.4 Probar Filtros

1. Ve a `/crm/listas`
2. Verifica que existan estos filtros:
   - Filtro por Colegio
   - Filtro por Nivel (Básica/Media)
   - Filtro por Año
   - Filtro por Paralelo
   - Filtro por Estado (Activo/Inactivo)

### 6.5 Probar Procesamiento Individual

1. Ve a `/crm/listas`
2. Abre una lista
3. Haz clic en "Procesar con IA"
4. Verifica que:
   - Procese correctamente
   - Muestre productos extraídos
   - Valide productos en WooCommerce

**Archivo a verificar:** `src/app/api/crm/listas/[id]/procesar-pdf/route.ts`

### 6.6 Probar Procesamiento Masivo

1. Ve a `/crm/listas`
2. Haz clic en "Importación Masiva"
3. Sube un archivo Excel/CSV
4. Completa la importación
5. Haz clic en "Procesar Todo con IA"
6. Verifica que:
   - Procese múltiples cursos en paralelo
   - Muestre progreso
   - Maneje errores correctamente

**Archivo a verificar:** `src/app/(admin)/(apps)/crm/listas/components/ImportacionMasivaModal.tsx`

### 6.7 Probar Página de Logs

1. Ve a `/crm/listas/logs`
2. Verifica que:
   - Se muestren logs del servidor
   - Los filtros funcionen
   - El auto-refresh funcione
   - Se puedan exportar logs

**Archivos a verificar:**
- `src/app/(admin)/(apps)/crm/listas/logs/page.tsx`
- `src/app/(admin)/(apps)/crm/listas/logs/components/LogsViewer.tsx`

---

## 🐛 Paso 7: Verificar Errores Comunes

### 7.1 Error: "MODELOS_DISPONIBLES is not defined"

**Solución:** Verifica que en `src/app/api/crm/listas/[id]/procesar-pdf/route.ts` esté definido:

```typescript
const MODELOS_DISPONIBLES = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
]
```

### 7.2 Error: "Cannot find module '@/...'"

**Solución:** Verifica que las rutas de importación sean correctas. Los archivos nuevos deben usar rutas relativas o alias `@/`.

### 7.3 Error: "Type error: Property 'direccion' does not exist"

**Solución:** Verifica que la interface `ListaType` en `ListasListing.tsx` incluya:

```typescript
colegio: {
  id: string | number
  nombre: string
  rbd?: string | number
  direccion?: string
  comuna?: string
  region?: string
}
```

### 7.4 Error: "429 Too Many Requests" en Gemini

**Solución:** Esto es normal si has excedido la cuota del plan gratuito. El sistema ahora maneja esto correctamente y muestra mensajes claros.

---

## 📝 Paso 8: Verificar Cambios Específicos en Archivos

### 8.1 `src/app/api/crm/listas/route.ts`

**Cambios principales:**

1. **Corrección de doble letra** (líneas ~162-205):
```typescript
// Verificar si el nombre ya termina con el paralelo
const nombreTerminaConParalelo = paraleloLimpio && (
  nombreLimpio.endsWith(` ${paraleloLimpio}`) || 
  nombreLimpio.endsWith(paraleloLimpio) ||
  nombreLimpio.endsWith(`${paraleloLimpio} ${paraleloLimpio}`)
)

// Si hay doble letra, limpiar
if (nombreTerminaConParalelo && paraleloLimpio) {
  nombreCurso = nombreLimpio.replace(new RegExp(`\\s*${paraleloLimpio}\\s*${paraleloLimpio}\\s*$`, 'i'), ` ${paraleloLimpio}`)
  nombreCurso = nombreCurso.replace(new RegExp(`\\s*${paraleloLimpio}\\s*$`, 'i'), '').trim()
}
```

2. **Populate de datos del colegio** (líneas ~58-62):
```typescript
populate: {
  colegio: {
    populate: {
      direcciones: true,
      comuna: true,
      region: true,
    },
  },
}
```

3. **Inclusión de fechas** (líneas ~70-71, 227-228):
```typescript
createdAt: curso.createdAt,
updatedAt: curso.updatedAt,
```

### 8.2 `src/app/api/crm/listas/[id]/procesar-pdf/route.ts`

**Cambios principales:**

1. **Modelos actualizados** (líneas ~23-30):
```typescript
const MODELOS_DISPONIBLES = [
  'gemini-2.5-flash',      // Más rápido y eficiente
  'gemini-2.5-flash-lite', // Versión lite
]
```

2. **Manejo de errores 429** (líneas ~506-522):
```typescript
if (errorMsg.includes('429') || errorMsg.includes('quota')) {
  const retryAfter = errorMsg.match(/retry in (\d+\.?\d*)s/i)?.[1] || '20'
  // Esperar antes de intentar siguiente modelo
  if (MODELOS_DISPONIBLES.indexOf(nombreModelo) < MODELOS_DISPONIBLES.length - 1) {
    const waitTime = Math.min(parseFloat(retryAfter) * 1000 || 20000, 30000)
    await new Promise(resolve => setTimeout(resolve, waitTime))
  }
}
```

### 8.3 `src/app/(admin)/(apps)/crm/listas/components/ListasListing.tsx`

**Cambios principales:**

1. **Interface actualizada:**
```typescript
interface ListaType {
  id: string
  nombre: string
  nivel: string
  grado: number
  año: number
  paralelo?: string
  activo: boolean
  colegio: {
    id: string | number
    nombre: string
    rbd?: string | number
    direccion?: string
    comuna?: string
    region?: string
  }
  createdAt?: string
  updatedAt?: string
}
```

2. **Nuevas columnas:**
   - Columna "Paralelo"
   - Columna "Fechas"
   - Columna "Colegio" mejorada

3. **Nuevos filtros:**
   - Filtro por Nivel
   - Filtro por Paralelo
   - Filtro por Estado

### 8.4 `src/app/(admin)/(apps)/crm/listas/components/ImportacionMasivaModal.tsx`

**Cambios principales:**

1. **Procesamiento en paralelo** (líneas ~760-863):
```typescript
const CONCURRENCY_LIMIT = 3
const chunks: Array<Array<typeof cursosConPDFVerificados[0]>> = []

for (let i = 0; i < cursosConPDFVerificados.length; i += CONCURRENCY_LIMIT) {
  chunks.push(cursosConPDFVerificados.slice(i, i + CONCURRENCY_LIMIT))
}

// Procesar cada lote en paralelo
for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
  const chunk = chunks[chunkIndex]
  
  await Promise.all(
    chunk.map((curso, indexInChunk) => 
      procesarCurso(curso, chunkIndex * CONCURRENCY_LIMIT + indexInChunk)
    )
  )
  
  // Delay reducido entre lotes (200ms)
  if (chunkIndex < chunks.length - 1) {
    await new Promise(resolve => setTimeout(resolve, 200))
  }
}
```

2. **Manejo robusto de errores:**
   - Captura de errores de red
   - Verificación de content-type
   - Logging detallado
   - Mensajes de error mejorados

---

## ✅ Checklist Final

Antes de considerar la integración completa, verifica:

- [ ] Todos los archivos nuevos existen
- [ ] No hay errores de TypeScript (`npm run build`)
- [ ] No hay errores de linting (`npm run lint`)
- [ ] La corrección de doble letra funciona
- [ ] Los datos del colegio se muestran correctamente
- [ ] Las fechas se muestran correctamente
- [ ] Los filtros funcionan
- [ ] El procesamiento individual funciona
- [ ] El procesamiento masivo funciona (más rápido)
- [ ] La página de logs funciona
- [ ] La API key de Gemini está configurada
- [ ] Los modelos de Gemini están actualizados

---

## 🆘 Si Algo Sale Mal

### Problema: Merge conflictivo

**Solución:**
1. Abre el archivo con conflictos
2. Busca las marcas `<<<<<<<`, `=======`, `>>>>>>>`
3. Decide qué código mantener (generalmente el de `mati-integracion`)
4. Elimina las marcas de conflicto
5. Guarda el archivo
6. Ejecuta `git add <archivo>` y `git commit`

### Problema: Errores de TypeScript

**Solución:**
1. Ejecuta `npm run build` para ver errores específicos
2. Revisa los errores uno por uno
3. Verifica que las interfaces estén actualizadas
4. Verifica que las importaciones sean correctas

### Problema: Funcionalidad no funciona

**Solución:**
1. Revisa la consola del navegador (F12)
2. Revisa los logs del servidor
3. Verifica que los archivos nuevos estén en su lugar
4. Verifica que las rutas de API sean correctas
5. Revisa la página de logs: `/crm/listas/logs`

---

## 📞 Contacto

Si tienes problemas o preguntas durante la integración:

1. Revisa los logs en `/crm/listas/logs`
2. Verifica que todos los archivos nuevos existan
3. Compara tu código con el de `mati-integracion`
4. Revisa este documento completo

---

## 📚 Archivos Clave a Revisar

### Backend
- `src/app/api/crm/listas/route.ts` - Corrección doble letra, datos colegio, fechas
- `src/app/api/crm/listas/[id]/procesar-pdf/route.ts` - Modelos Gemini, manejo errores
- `src/app/api/crm/listas/carga-masiva-ia/route.ts` - Modelos Gemini
- `src/app/api/crm/listas/debug-logs/route.ts` - Sistema de logs

### Frontend
- `src/app/(admin)/(apps)/crm/listas/components/ListasListing.tsx` - Tabla, filtros, columnas
- `src/app/(admin)/(apps)/crm/listas/components/ImportacionMasivaModal.tsx` - Procesamiento paralelo
- `src/app/(admin)/(apps)/crm/listas/logs/page.tsx` - Página de logs
- `src/app/(admin)/(apps)/crm/listas/logs/components/LogsViewer.tsx` - Componente de logs

---

**¡Éxito con la integración! 🚀**
