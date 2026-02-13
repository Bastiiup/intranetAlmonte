# 🔴 PROBLEMAS CRÍTICOS: Destacado y Aprobación

## 📍 PROBLEMA 1: DESTACADO NO EXACTO EN EL PDF

### ❌ **Situación Actual**

El sistema genera **coordenadas aproximadas** algorítmicamente, no coordenadas reales extraídas del PDF. Esto causa que el destacado amarillo no apunte exactamente al producto en el PDF.

### 🔍 **Cómo Funciona Actualmente**

**Archivo:** `src/app/api/crm/listas/[id]/procesar-pdf/route.ts` (líneas 831-876)

```typescript
// Algoritmo de generación de coordenadas aproximadas
const totalProductos = productosExtraidos.length
const productosEstimadosPorPagina = Math.max(Math.ceil(totalProductos / totalPaginas), 8)

// Calcular página (distribución uniforme)
const paginaCalculada = Math.min(
  Math.floor(i / productosEstimadosPorPagina) + 1,
  totalPaginas
)

// Distribución vertical (18% a 88% de la página)
const margenSuperior = 18  // Encabezado
const margenInferior = 88  // Pie de página
const espaciamiento = (margenInferior - margenSuperior) / (productosEstimadosPorPagina + 1)
const posicionY = margenSuperior + (posicionEnPagina + 1) * espaciamiento

// Distribución horizontal (aleatoria entre 20% y 80%)
const posicionX = 20 + (Math.random() * 60)

// Guardar coordenadas
const coordenadas = {
  pagina: paginaCalculada,
  posicion_x: posicionX,      // Porcentaje (0-100)
  posicion_y: posicionY,      // Porcentaje (0-100)
  region: 'centro'
}
```

### ⚠️ **Problemas del Algoritmo Actual**

1. **No usa coordenadas reales del PDF**
   - No extrae la posición real del texto del producto
   - Solo distribuye productos uniformemente en la página

2. **Posición X aleatoria**
   - `posicionX = 20 + (Math.random() * 60)` genera valores aleatorios
   - No refleja dónde está realmente el producto en el PDF

3. **Distribución vertical uniforme**
   - Asume que todos los productos están espaciados uniformemente
   - No considera saltos de línea, tablas, o formato del PDF

4. **No considera el formato del PDF**
   - No detecta si el PDF tiene tablas, listas, o texto libre
   - No detecta si hay imágenes o múltiples columnas

### 🎯 **Solución Propuesta: Extracción Real de Coordenadas**

#### **Opción A: Usar `pdfjs-dist` para Extraer Coordenadas Reales**

```typescript
import * as pdfjsLib from 'pdfjs-dist'

async function extraerCoordenadasReales(
  pdfBuffer: Buffer,
  nombreProducto: string,
  pagina: number
): Promise<CoordenadasProducto | null> {
  const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise
  const page = await pdf.getPage(pagina)
  const textContent = await page.getTextContent()
  
  // Buscar el texto del producto en el contenido
  for (const item of textContent.items) {
    if (item.str && item.str.includes(nombreProducto)) {
      // Obtener la transformación del texto
      const transform = item.transform
      
      // Calcular posición relativa (porcentajes)
      const viewport = page.getViewport({ scale: 1.0 })
      const posicionX = (transform[4] / viewport.width) * 100  // X en porcentaje
      const posicionY = ((viewport.height - transform[5]) / viewport.height) * 100  // Y en porcentaje
      
      return {
        pagina: pagina,
        posicion_x: Math.round(posicionX * 10) / 10,
        posicion_y: Math.round(posicionY * 10) / 10,
        region: posicionY < 35 ? 'superior' : posicionY > 65 ? 'inferior' : 'centro'
      }
    }
  }
  
  return null
}
```

**Ventajas:**
- ✅ Coordenadas reales y precisas
- ✅ Funciona con cualquier formato de PDF
- ✅ No requiere OCR

**Desventajas:**
- ⚠️ Requiere que el texto esté en el PDF (no funciona con PDFs escaneados)
- ⚠️ Puede ser más lento para PDFs grandes

#### **Opción B: Permitir Ajuste Manual de Coordenadas**

Agregar un modal para que el usuario ajuste manualmente las coordenadas:

```typescript
// En ValidacionLista.tsx
const [editandoCoordenadas, setEditandoCoordenadas] = useState(false)
const [coordenadasTemporales, setCoordenadasTemporales] = useState<CoordenadasProducto | null>(null)

const ajustarCoordenadas = async (productoId: string) => {
  // Mostrar modal con controles para ajustar X, Y, página
  // Guardar coordenadas ajustadas en Strapi
}
```

**Ventajas:**
- ✅ Permite precisión perfecta
- ✅ El usuario puede corregir coordenadas incorrectas

**Desventajas:**
- ⚠️ Requiere trabajo manual por producto
- ⚠️ No es escalable para muchas listas

#### **Opción C: Mejorar el Algoritmo con Análisis de Texto**

Analizar el texto extraído para encontrar patrones y mejorar la distribución:

```typescript
// Analizar el texto para encontrar dónde está cada producto
function analizarPosicionEnTexto(
  textoCompleto: string,
  nombreProducto: string,
  totalProductos: number,
  indiceProducto: number
): { pagina: number, posicionRelativa: number } {
  // Buscar el producto en el texto
  const indiceTexto = textoCompleto.indexOf(nombreProducto)
  
  // Calcular posición relativa en el texto
  const posicionRelativa = indiceTexto / textoCompleto.length
  
  // Estimar página basándose en la posición
  const paginas = Math.ceil(textoCompleto.length / 3000) // ~3000 chars por página
  const pagina = Math.min(Math.ceil(posicionRelativa * paginas), paginas)
  
  return { pagina, posicionRelativa }
}
```

**Ventajas:**
- ✅ Mejor que el algoritmo actual
- ✅ No requiere cambios grandes

**Desventajas:**
- ⚠️ Sigue siendo aproximado
- ⚠️ No considera formato visual del PDF

### ✅ **Recomendación: Implementar Opción A (Extracción Real)**

**Implementación sugerida:**

1. **Modificar `buscarEnWooCommerce` para extraer coordenadas reales:**
   ```typescript
   // Después de buscar en WooCommerce, extraer coordenadas reales
   const coordenadasReales = await extraerCoordenadasReales(
     pdfBuffer,
     nombreBuscar,
     paginaCalculada
   )
   
   // Usar coordenadas reales si están disponibles, sino usar aproximadas
   const coordenadas = coordenadasReales || coordenadasAproximadas
   ```

2. **Fallback a coordenadas aproximadas si falla:**
   ```typescript
   try {
     const coordenadasReales = await extraerCoordenadasReales(...)
     if (coordenadasReales) {
       return coordenadasReales
     }
   } catch (error) {
     logger.warn('No se pudieron extraer coordenadas reales, usando aproximadas')
   }
   return coordenadasAproximadas
   ```

---

## ❌ PROBLEMA 2: APROBACIÓN NO FUNCIONA CORRECTAMENTE

### ❌ **Situación Actual**

El sistema intenta actualizar `estado_revision` pero puede fallar silenciosamente si el campo no existe en Strapi. Además, el estado no se refleja correctamente en el listado después de aprobar.

### 🔍 **Cómo Funciona Actualmente**

**Archivo:** `src/app/api/crm/listas/aprobar-lista/route.ts` (líneas 161-176)

```typescript
// Intentar actualizar estado_revision en una llamada separada
try {
  const estadoData = {
    data: {
      estado_revision: 'revisado',
      fecha_revision: new Date().toISOString(),
    },
  }
  await strapiClient.put(`/api/cursos/${cursoDocumentId}`, estadoData)
  console.log('✅ Estado de revisión actualizado')
} catch (estadoError: any) {
  // ⚠️ PROBLEMA: Si falla, solo se loguea, no se lanza error
  console.warn('⚠️ No se pudo actualizar estado_revision')
  // NO lanzar el error - la aprobación de productos es lo importante
}
```

### ⚠️ **Problemas Identificados**

1. **El campo `estado_revision` puede no existir en Strapi**
   - Strapi rechaza el campo con error "Invalid key estado_revision"
   - El error se captura silenciosamente
   - El usuario no sabe que el estado no se actualizó

2. **El estado no se refleja en el listado**
   - Aunque se actualice en Strapi, el listado puede mostrar estado antiguo
   - El caché de Next.js no se invalida correctamente
   - La página no se recarga automáticamente

3. **Dos llamadas separadas a Strapi**
   - Primera llamada: actualiza `versiones_materiales`
   - Segunda llamada: actualiza `estado_revision`
   - Si la segunda falla, el estado no se actualiza pero los productos sí

### 🎯 **Soluciones Propuestas**

#### **Solución 1: Verificar si el Campo Existe en Strapi**

```typescript
// Antes de intentar actualizar, verificar si el campo existe
async function verificarCampoEstadoRevision(
  cursoDocumentId: string
): Promise<boolean> {
  try {
    const curso = await strapiClient.get(`/api/cursos/${cursoDocumentId}`)
    const attrs = curso.data?.attributes || curso.data
    
    // Verificar si el campo existe en la respuesta
    return 'estado_revision' in attrs || 'estado_revision' in curso.data
  } catch (error) {
    return false
  }
}

// Usar en aprobar-lista
const tieneCampoEstado = await verificarCampoEstadoRevision(cursoDocumentId)

if (tieneCampoEstado) {
  // Actualizar estado_revision
  await strapiClient.put(`/api/cursos/${cursoDocumentId}`, {
    data: {
      estado_revision: 'revisado',
      fecha_revision: new Date().toISOString()
    }
  })
} else {
  console.warn('⚠️ El campo estado_revision no existe en Strapi. Agregarlo al Content Type "Curso"')
  // Opcional: Guardar estado en un campo alternativo o en metadata
}
```

#### **Solución 2: Combinar Ambas Actualizaciones en Una Sola Llamada**

```typescript
// Actualizar versiones_materiales Y estado_revision en una sola llamada
const updateData = {
  data: {
    versiones_materiales: versionesActualizadas,
    // Solo incluir estado_revision si sabemos que existe
    ...(tieneCampoEstado && {
      estado_revision: 'revisado',
      fecha_revision: new Date().toISOString()
    })
  }
}

await strapiClient.put(`/api/cursos/${cursoDocumentId}`, updateData)
```

**Problema:** Si `estado_revision` no existe, toda la llamada falla.

**Solución mejorada:**
```typescript
// Intentar con estado_revision primero
try {
  const updateData = {
    data: {
      versiones_materiales: versionesActualizadas,
      estado_revision: 'revisado',
      fecha_revision: new Date().toISOString()
    }
  }
  await strapiClient.put(`/api/cursos/${cursoDocumentId}`, updateData)
} catch (error: any) {
  // Si falla, intentar solo con versiones_materiales
  if (error.message?.includes('estado_revision') || error.message?.includes('Invalid key')) {
    console.warn('⚠️ estado_revision no existe, actualizando solo versiones_materiales')
    await strapiClient.put(`/api/cursos/${cursoDocumentId}`, {
      data: { versiones_materiales: versionesActualizadas }
    })
  } else {
    throw error
  }
}
```

#### **Solución 3: Guardar Estado en Metadata o Campo Alternativo**

Si `estado_revision` no existe, guardar el estado en otro lugar:

```typescript
// Opción A: Guardar en metadata de la última versión
const versionesActualizadas = versiones.map(v => {
  if (v === ultimaVersion) {
    return {
      ...v,
      materiales: materialesAprobados,
      metadata: {
        ...v.metadata,
        estado_revision: 'revisado',
        fecha_revision: new Date().toISOString()
      }
    }
  }
  return v
})

// Opción B: Guardar en un campo personalizado
const updateData = {
  data: {
    versiones_materiales: versionesActualizadas,
    // Usar un campo que seguro existe, como "notas" o crear uno nuevo
    notas: `Estado: revisado - ${new Date().toISOString()}`
  }
}
```

#### **Solución 4: Forzar Recarga del Listado**

Mejorar la recarga del listado después de aprobar:

```typescript
// En ValidacionLista.tsx después de aprobar
const aprobarListaCompleta = async () => {
  // ... aprobar lista ...
  
  // Forzar recarga completa
  router.refresh()
  
  // Redirigir con timestamp para evitar caché
  const colegioId = lista?.colegio?.data?.id || lista?.colegio?.data?.documentId
  if (colegioId) {
    router.push(`/crm/listas/colegio/${colegioId}?t=${Date.now()}`)
    
    // Esperar y forzar recarga del servidor
    setTimeout(() => {
      window.location.reload()  // Recarga completa de la página
    }, 1000)
  }
}
```

### ✅ **Recomendación: Implementar Solución 2 + Solución 4**

**Implementación sugerida:**

1. **Modificar `aprobar-lista/route.ts`:**
   ```typescript
   // Intentar actualizar con estado_revision
   try {
     const updateData = {
       data: {
         versiones_materiales: versionesActualizadas,
         estado_revision: 'revisado',
         fecha_revision: new Date().toISOString()
       }
     }
     await strapiClient.put(`/api/cursos/${cursoDocumentId}`, updateData)
   } catch (error: any) {
     // Si falla por estado_revision, intentar solo versiones
     if (error.message?.includes('estado_revision') || 
         error.message?.includes('Invalid key')) {
       console.warn('⚠️ estado_revision no existe, actualizando solo versiones')
       await strapiClient.put(`/api/cursos/${cursoDocumentId}`, {
         data: { versiones_materiales: versionesActualizadas }
       })
       // Guardar estado en metadata como fallback
       const versionesConEstado = versionesActualizadas.map(v => 
         v === ultimaVersion 
           ? { ...v, metadata: { ...v.metadata, estado_revision: 'revisado' } }
           : v
       )
       await strapiClient.put(`/api/cursos/${cursoDocumentId}`, {
         data: { versiones_materiales: versionesConEstado }
       })
     } else {
       throw error
     }
   }
   ```

2. **Mejorar recarga en frontend:**
   ```typescript
   // Después de aprobar exitosamente
   router.refresh()
   router.push(`/crm/listas/colegio/${colegioId}?t=${Date.now()}`)
   
   // Forzar recarga del servidor después de 1 segundo
   setTimeout(() => {
     window.location.reload()
   }, 1000)
   ```

---

## 🔧 IMPLEMENTACIÓN PRIORITARIA

### **Prioridad 1: Arreglar Aprobación (CRÍTICO)**

1. ✅ Implementar fallback para `estado_revision`
2. ✅ Guardar estado en metadata si el campo no existe
3. ✅ Forzar recarga completa del listado después de aprobar
4. ✅ Mostrar mensaje al usuario si el estado no se pudo actualizar

### **Prioridad 2: Mejorar Destacado (IMPORTANTE)**

1. ✅ Implementar extracción real de coordenadas con `pdfjs-dist`
2. ✅ Fallback a coordenadas aproximadas si falla
3. ✅ Agregar logs para debugging de coordenadas
4. ⚠️ Opcional: Permitir ajuste manual de coordenadas

---

## 📝 NOTAS TÉCNICAS

### **Sobre `estado_revision` en Strapi**

- El campo debe agregarse al Content Type `Curso` en Strapi
- Tipo: **Enumeration** con valores: `borrador`, `revisado`, `publicado`
- Campos adicionales recomendados:
  - `fecha_revision` (Date)
  - `fecha_publicacion` (Date)

### **Sobre Coordenadas en PDFs**

- Las coordenadas se guardan como porcentajes (0-100)
- `posicion_x`: Porcentaje horizontal desde la izquierda
- `posicion_y`: Porcentaje vertical desde arriba
- `pagina`: Número de página (1-indexed)

---

**Última actualización:** 2026-02-02
