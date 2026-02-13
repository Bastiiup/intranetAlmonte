# Problema del Destacado Amarillo en el PDF

## 📋 Estructura Actual del Sistema

### 1. **Estructura de Datos de Coordenadas**

```typescript
interface CoordenadasProducto {
  pagina: number              // Número de página donde está el producto
  posicion_x?: number         // Posición X en porcentaje (0-100)
  posicion_y?: number         // Posición Y en porcentaje (0-100)
  region?: string             // 'superior' | 'centro' | 'inferior'
  ancho?: number              // Ancho del resaltado (opcional)
  alto?: number               // Alto del resaltado (opcional)
}
```

### 2. **Flujo de Generación de Coordenadas**

#### A. **Coordenadas Reales (Ideal)**
- Se intenta extraer coordenadas reales usando `pdfjs-dist`
- Busca el texto del producto en el PDF y obtiene su posición exacta
- Archivo: `src/lib/utils/pdf-coordenadas.ts`
- Función: `extraerCoordenadasReales()`

#### B. **Coordenadas Aproximadas (Fallback)**
- Si no se encuentran coordenadas reales, se generan aproximadas
- Algoritmo de distribución:
  ```typescript
  // Calcula página basada en índice del producto
  const paginaCalculada = Math.floor(i / productosEstimadosPorPagina) + 1
  
  // Calcula posición Y aproximada
  const posicionY = margenSuperior + (posicionEnPagina + 1) * espaciamiento
  
  // Calcula posición X aleatoria (20-80%)
  const posicionX = 20 + (Math.random() * 60)
  ```

### 3. **Renderizado del Destacado en el Frontend**

#### Ubicación: `ValidacionLista.tsx` (líneas 2647-2800)

**Estructura del Overlay:**
```tsx
<div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
  {/* Resaltado amarillo principal */}
  <div style={{
    position: 'absolute',
    left: `${posicion_x}%`,      // Usa porcentaje
    top: `${posicion_y}%`,        // Usa porcentaje
    width: `${ancho || calculado}%`,
    height: `${alto || 30}px`,
    backgroundColor: 'rgba(255, 235, 59, 0.7)',
    transform: 'translate(-50%, -50%)',  // Centrado
  }} />
  
  {/* Etiqueta con nombre */}
  <div style={{ position: 'absolute', ... }}>📍 {nombre}</div>
  
  {/* Punto rojo indicador */}
  <div style={{ position: 'absolute', ... }} />
</div>
```

## ❌ Problemas Identificados

### **Problema 1: Coordenadas No Exactas**

**Causa:**
- Las coordenadas aproximadas se generan con un algoritmo de distribución uniforme
- No reflejan la posición real del texto en el PDF
- El cálculo usa `Math.random()` para variación, lo que hace que sea impreciso

**Síntomas:**
- El resaltado amarillo aparece en una posición diferente a donde está el producto
- El punto rojo no apunta exactamente al texto del producto
- La etiqueta flotante puede estar mal posicionada

**Ejemplo del código problemático:**
```typescript
// Línea 845-849 en procesar-pdf/route.ts
const variacionY = (Math.random() * 3) - 1.5  // ❌ Aleatorio
const posicionY = posicionBaseY + variacionY    // ❌ No exacto
const posicionX = 20 + (Math.random() * 60)     // ❌ Aleatorio
```

### **Problema 2: Extracción de Coordenadas Reales No Funciona**

**Causa:**
- La función `extraerCoordenadasReales()` en `pdf-coordenadas.ts` puede fallar por:
  - Problemas con el worker de `pdfjs-dist` en Node.js
  - El texto del producto no se encuentra exactamente (normalización de texto)
  - Errores en la conversión de coordenadas de puntos a porcentajes

**Síntomas:**
- Siempre se usan coordenadas aproximadas
- Los logs muestran: `📍 Coordenadas APROXIMADAS` en lugar de `✅ Coordenadas REALES`

**Código relevante:**
```typescript
// Línea 816 en procesar-pdf/route.ts
const coordenadasReales = coordenadasMap.get(productoId) || coordenadasMap.get(nombreBuscar)

if (coordenadasReales) {
  // ✅ Usar coordenadas reales
} else {
  // ❌ Fallback a aproximadas (siempre se ejecuta si falla la extracción)
}
```

### **Problema 3: Conversión de Coordenadas a Porcentajes**

**Causa:**
- Las coordenadas del PDF están en puntos (pixels)
- El frontend necesita porcentajes (0-100%)
- La conversión puede ser incorrecta si no se conoce el tamaño real de la página

**Síntomas:**
- El resaltado aparece en una posición incorrecta incluso con coordenadas "reales"
- El desplazamiento es proporcional al error de conversión

**Código de conversión:**
```typescript
// En pdf-coordenadas.ts
const xPorcentaje = (x / pageWidth) * 100  // ¿pageWidth es correcto?
const yPorcentaje = (y / pageHeight) * 100  // ¿pageHeight es correcto?
```

### **Problema 4: Sincronización de Página**

**Causa:**
- El overlay solo se renderiza si `selectedProductData.coordenadas.pagina === pageNumber`
- Si la página calculada es incorrecta, el resaltado nunca aparece

**Síntomas:**
- Al hacer click en un producto, no aparece el resaltado
- Los logs muestran: `paginaCorrecta: false`

**Código de verificación:**
```typescript
// Línea 2650 en ValidacionLista.tsx
const paginaCorrecta = selectedProductData?.coordenadas?.pagina === pageNumber
return tieneCoordenadas && paginaCorrecta  // ❌ Si página incorrecta, no renderiza
```

### **Problema 5: Tamaño del Resaltado**

**Causa:**
- El ancho del resaltado se calcula basado en la longitud del nombre: `nombre.length * 0.75 + 5`
- Esto no refleja el ancho real del texto en el PDF
- No se usa `ancho` y `alto` de las coordenadas reales si están disponibles

**Síntomas:**
- El resaltado es demasiado pequeño o grande
- No cubre completamente el texto del producto

**Código problemático:**
```typescript
// Línea 2706 en ValidacionLista.tsx
width: `${Math.min(selectedProductData.nombre.length * 0.75 + 5, 45)}%`
// ❌ No usa selectedProductData.coordenadas.ancho si existe
```

## 🔍 Flujo Completo del Problema

1. **Backend procesa PDF:**
   - Intenta extraer coordenadas reales → ❌ Falla (problema con worker o texto no encontrado)
   - Genera coordenadas aproximadas → ✅ Funciona pero es impreciso

2. **Coordenadas se guardan en Strapi:**
   - Se guardan con `posicion_x` y `posicion_y` como números
   - Pueden ser porcentajes o valores absolutos (inconsistencia)

3. **Frontend carga productos:**
   - Parsea coordenadas de Strapi
   - Verifica que `posicion_x` y `posicion_y` existan

4. **Usuario hace click en producto:**
   - Se verifica que la página coincida → ❌ Puede fallar si página calculada incorrectamente
   - Se renderiza overlay con coordenadas → ❌ Posición incorrecta si son aproximadas

5. **Overlay se posiciona:**
   - Usa `left: ${posicion_x}%` y `top: ${posicion_y}%`
   - Si las coordenadas son incorrectas, el resaltado aparece en lugar equivocado

## 📊 Resumen de Problemas

| Problema | Severidad | Causa Raíz | Impacto |
|----------|----------|------------|---------|
| Coordenadas aproximadas imprecisas | 🔴 Alta | Algoritmo de distribución + Math.random() | Resaltado no apunta al producto |
| Extracción de coordenadas reales falla | 🔴 Alta | Worker de pdfjs-dist o normalización de texto | Siempre se usan aproximadas |
| Conversión puntos → porcentajes | 🟡 Media | Falta de tamaño real de página | Desplazamiento proporcional |
| Página calculada incorrecta | 🟡 Media | Algoritmo de distribución | Resaltado no aparece |
| Tamaño del resaltado incorrecto | 🟢 Baja | Cálculo basado en longitud de nombre | Resaltado no cubre texto completo |

## 🎯 Estado Actual

- ✅ **Funciona:** El sistema de resaltado se renderiza correctamente
- ✅ **Funciona:** La navegación a la página del producto funciona
- ❌ **No funciona:** Las coordenadas no son exactas (siempre aproximadas)
- ❌ **No funciona:** El resaltado no apunta exactamente al texto del producto
- ⚠️ **Parcial:** La extracción de coordenadas reales existe pero no se ejecuta correctamente
