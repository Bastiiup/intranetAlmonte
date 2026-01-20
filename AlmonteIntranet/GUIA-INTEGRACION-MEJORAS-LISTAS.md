# 📋 GUÍA DE INTEGRACIÓN: MEJORAS EN PROCESAMIENTO DE LISTAS

## 🎯 OBJETIVO

Esta guía te ayudará a integrar las **mejoras recientes** en el procesamiento de PDFs de listas escolares y la visualización de productos desde la rama `mati-integracion` a tu rama principal.

---

## 📦 CAMBIOS INCLUIDOS

Esta integración incluye:
- ✅ **Manejo mejorado de PDFs grandes** (timeouts aumentados, mejor procesamiento)
- ✅ **Tabs de filtrado** (Todos, Disponibles, No Disponibles)
- ✅ **Imágenes mejoradas** (más grandes, hover, click para ampliar)
- ✅ **Mejor indicación de disponibilidad** (emojis, badges mejorados)
- ✅ **Logging detallado** para debugging de nombres de productos

---

## 🔧 PASOS DE INTEGRACIÓN

### **1. Actualizar tu rama principal**

```bash
# Asegúrate de estar en tu rama principal (main o develop)
git checkout main
git pull origin main
```

### **2. Traer los cambios de la rama mati-integracion**

```bash
# Traer los cambios
git fetch origin mati-integracion

# Ver los commits recientes
git log origin/mati-integracion --oneline -5
```

### **3. Identificar archivos a integrar**

Los siguientes archivos son los que necesitas integrar:

#### **Archivos modificados:**
```
src/app/(admin)/(apps)/crm/listas/[id]/validacion/components/ValidacionLista.tsx
src/app/api/crm/listas/[id]/procesar-pdf/route.ts
```

---

## 📝 INTEGRACIÓN MANUAL (RECOMENDADO)

### **Opción 1: Cherry-pick del commit específico**

```bash
# Volver a tu rama principal
git checkout main

# Hacer cherry-pick del commit de mejoras
git cherry-pick bf8cdd2d
```

Si hay conflictos, resuélvelos manualmente y luego:
```bash
git add .
git cherry-pick --continue
```

### **Opción 2: Copiar cambios manualmente**

#### **1. Archivo: `ValidacionLista.tsx`**

**Cambios principales:**
- Agregar estado `tabActivo` para filtrado
- Separar productos en `productosDisponibles` y `productosNoDisponibles`
- Agregar tabs de filtrado antes de la tabla
- Mejorar visualización de imágenes (80x80px, hover, click)
- Mejorar badges de disponibilidad con emojis
- Agregar logging detallado para debugging

**Buscar y agregar después de los estados:**
```tsx
const [tabActivo, setTabActivo] = useState<'todos' | 'disponibles' | 'no-disponibles'>('todos')
```

**Buscar y reemplazar las constantes de productos:**
```tsx
// ANTES:
const disponibles = productos.filter(p => p.disponibilidad === 'disponible').length

// DESPUÉS:
// Separar productos por disponibilidad
const productosDisponibles = productos.filter(p => 
  p.encontrado_en_woocommerce === true && p.disponibilidad === 'disponible'
)
const productosNoDisponibles = productos.filter(p => 
  p.encontrado_en_woocommerce === false || p.disponibilidad !== 'disponible'
)

const disponibles = productosDisponibles.length
const noDisponibles = productosNoDisponibles.length

// Productos a mostrar según el tab
const productosAMostrar = tabActivo === 'disponibles' 
  ? productosDisponibles 
  : tabActivo === 'no-disponibles' 
  ? productosNoDisponibles 
  : productos
```

**Agregar tabs antes de la tabla:**
```tsx
{/* Tabs de filtrado */}
<div style={{ 
  padding: '0.75rem 1rem', 
  borderBottom: '1px solid #dee2e6',
  background: '#f8f9fa'
}}>
  <div className="btn-group" role="group">
    <button
      type="button"
      className={`btn btn-sm ${tabActivo === 'todos' ? 'btn-primary' : 'btn-outline-primary'}`}
      onClick={() => setTabActivo('todos')}
    >
      Todos ({productos.length})
    </button>
    <button
      type="button"
      className={`btn btn-sm ${tabActivo === 'disponibles' ? 'btn-success' : 'btn-outline-success'}`}
      onClick={() => setTabActivo('disponibles')}
    >
      Disponibles ({disponibles})
    </button>
    <button
      type="button"
      className={`btn btn-sm ${tabActivo === 'no-disponibles' ? 'btn-warning' : 'btn-outline-warning'}`}
      onClick={() => setTabActivo('no-disponibles')}
    >
      No Disponibles ({noDisponibles})
    </button>
  </div>
</div>
```

**Reemplazar el mapeo de productos:**
```tsx
// ANTES:
{productos.map((producto) => (

// DESPUÉS:
{productosAMostrar.length === 0 ? (
  <tr>
    <td colSpan={10} className="text-center py-4">
      <Alert variant="info" className="mb-0">
        No hay productos en esta categoría
      </Alert>
    </td>
  </tr>
) : (
  productosAMostrar.map((producto) => (
```

**Mejorar visualización de imágenes:**
```tsx
// REEMPLAZAR la celda de imagen con:
<td>
  {producto.imagen ? (
    <div 
      style={{ 
        position: 'relative',
        width: '80px', 
        height: '80px',
        cursor: 'pointer',
        borderRadius: '4px',
        overflow: 'hidden',
        border: '1px solid #dee2e6'
      }}
      onClick={(e) => {
        e.stopPropagation()
        window.open(producto.imagen, '_blank')
      }}
      title="Click para ver imagen completa"
    >
      <img 
        src={producto.imagen} 
        alt={producto.nombre}
        style={{ 
          width: '100%', 
          height: '100%', 
          objectFit: 'cover',
          transition: 'transform 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
        }}
        onError={(e) => {
          e.currentTarget.style.display = 'none'
          const parent = e.currentTarget.parentElement
          if (parent) {
            parent.innerHTML = '<div style="width: 100%; height: 100%; background: #f0f0f0; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; color: #999;">Sin imagen</div>'
          }
        }}
      />
    </div>
  ) : (
    <div style={{ 
      width: '80px', 
      height: '80px', 
      background: '#f0f0f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '0.7rem',
      color: '#999',
      borderRadius: '4px',
      border: '1px solid #dee2e6'
    }}>
      Sin imagen
    </div>
  )}
</td>
```

**Mejorar badges de disponibilidad:**
```tsx
// REEMPLAZAR la celda de disponibilidad con:
<td>
  {producto.encontrado_en_woocommerce === true ? (
    <Badge bg={producto.disponibilidad === 'disponible' ? 'success' : 'danger'}>
      {producto.disponibilidad === 'disponible' ? '✅ Disponible' : '❌ No disponible'}
      {producto.stock_quantity !== undefined && producto.stock_quantity > 0 && (
        <span className="ms-1">({producto.stock_quantity})</span>
      )}
    </Badge>
  ) : (
    <Badge bg="warning" text="dark">
      ⚠️ No encontrado
    </Badge>
  )}
</td>
```

**Mejorar extracción de nombres:**
```tsx
// En la función cargarProductos, reemplazar:
nombre: material.nombre || material.nombre_producto || 'Producto sin nombre',

// CON:
// Intentar obtener el nombre de múltiples campos posibles
const nombreProducto = material.nombre || 
                      material.nombre_producto || 
                      material.NOMBRE || 
                      material.Nombre || 
                      material.producto_nombre ||
                      material.descripcion || // Fallback a descripción si no hay nombre
                      `Producto ${index + 1}`

// Y luego usar:
nombre: nombreProducto,
```

#### **2. Archivo: `procesar-pdf/route.ts`**

**Cambios principales:**
- Agregar `maxDuration = 300` (5 minutos)
- Agregar timeout de 4 minutos para Gemini
- Mejorar logging del tamaño del PDF
- Optimizar prompt para PDFs largos
- Mejor manejo de errores de timeout

**Agregar después de `export const runtime = 'nodejs'`:**
```typescript
// Aumentar timeout para PDFs grandes (máximo 5 minutos)
export const maxDuration = 300
```

**Agregar después de convertir PDF a base64:**
```typescript
const pdfBase64 = Buffer.from(pdfBuffer).toString('base64')
const pdfSizeMB = (pdfBuffer.byteLength / (1024 * 1024)).toFixed(2)

console.log('[Procesar PDF] 📊 Información del PDF:', {
  tamañoBytes: pdfBuffer.byteLength,
  tamañoMB: `${pdfSizeMB} MB`,
  tamañoBase64: `${(pdfBase64.length / (1024 * 1024)).toFixed(2)} MB`,
})

// Advertencia si el PDF es muy grande (>20MB)
if (pdfBuffer.byteLength > 20 * 1024 * 1024) {
  console.warn('[Procesar PDF] ⚠️ PDF muy grande, puede tardar más tiempo en procesarse')
}
```

**Mejorar el prompt (agregar al inicio):**
```typescript
const prompt = `Eres un experto en analizar listas de útiles escolares de Chile.

Tu tarea es extraer TODOS los productos/útiles mencionados en este PDF.

⚠️ IMPORTANTE PARA PDFs LARGOS:
- Si el PDF es extenso, enfócate en las secciones de productos/útiles
- Ignora páginas de portada, índice, instrucciones generales
- Extrae productos de TODAS las páginas que contengan listas de útiles

// ... resto del prompt ...
```

**Agregar timeout a la llamada de Gemini:**
```typescript
// Crear AbortController para timeout (4 minutos para PDFs grandes)
const controller = new AbortController()
const timeoutMs = 240000 // 4 minutos
let timeoutId: NodeJS.Timeout | null = null

try {
  timeoutId = setTimeout(() => {
    controller.abort()
  }, timeoutMs)

  const result = await Promise.race([
    model.generateContent([
      prompt,
      {
        inlineData: {
          data: pdfBase64,
          mimeType: 'application/pdf'
        }
      }
    ]),
    new Promise((_, reject) => {
      controller.signal.addEventListener('abort', () => {
        reject(new Error(`Timeout: El procesamiento tardó más de ${timeoutMs / 1000} segundos. El PDF puede ser muy grande.`))
      })
    })
  ]) as any
  
  if (timeoutId) clearTimeout(timeoutId)
  
  // ... resto del código ...
} catch (innerError: any) {
  if (timeoutId) clearTimeout(timeoutId)
  throw innerError
}
```

**Mejorar manejo de errores de timeout:**
```typescript
} catch (error: any) {
  const errorMsg = error.message || String(error)
  
  // Detectar errores de timeout específicamente
  if (errorMsg.includes('Timeout') || errorMsg.includes('timeout')) {
    console.error('[Procesar PDF] ⏱️ Error de timeout detectado')
    errorModelos.push({ 
      modelo: nombreModelo, 
      error: `Timeout: El PDF es muy grande (${pdfSizeMB} MB). Intenta con un PDF más pequeño o divide el contenido.` 
    })
  } else {
    errorModelos.push({ modelo: nombreModelo, error: errorMsg })
  }
  continue
}
```

**Mejorar mensaje de error cuando todos los modelos fallan:**
```typescript
// Detectar si todos los errores son de timeout
const todosTimeouts = errorModelos.every(e => e.error.includes('Timeout') || e.error.includes('timeout'))

return NextResponse.json(
  {
    success: false,
    error: todosTimeouts 
      ? 'El PDF es muy grande y el procesamiento excedió el tiempo límite'
      : 'No se pudieron extraer productos del PDF',
    details: errorModelos.length > 0 
      ? `Errores: ${errorModelos.map(e => `${e.modelo}: ${e.error}`).join(', ')}`
      : 'Gemini procesó el PDF pero no encontró productos válidos.',
    sugerencia: todosTimeouts
      ? `El PDF es muy grande (${pdfSizeMB} MB). Intenta: 1) Dividir el PDF en partes más pequeñas, 2) Usar un PDF con menos páginas, 3) Optimizar el PDF reduciendo su tamaño.`
      : 'Verifica que el PDF contenga una lista de útiles escolares válida...',
    pdfSizeMB: parseFloat(pdfSizeMB),
  },
  { status: todosTimeouts ? 504 : 500 }
)
```

---

## 🔑 DEPENDENCIAS

No se requieren nuevas dependencias. Las mejoras usan las mismas librerías ya instaladas:
- `@google/generative-ai` (ya instalado)
- `react-bootstrap` (ya instalado)
- `react-pdf` (ya instalado)

---

## 📋 CAMBIOS EN CONFIGURACIÓN

### **Variables de entorno**

No se requieren nuevas variables de entorno. Las existentes son suficientes:
```env
GEMINI_API_KEY=tu_api_key_aqui
NEXT_PUBLIC_STRAPI_URL=https://strapi.moraleja.cl
STRAPI_API_TOKEN=tu_token_aqui
```

---

## 🧪 VERIFICACIÓN POST-INTEGRACIÓN

### **1. Compilar el proyecto:**

```bash
npm run build
```

**Errores comunes:**
- ❌ `Cannot find name 'tabActivo'` → Agregar el estado `tabActivo`
- ❌ `Cannot find name 'productosAMostrar'` → Agregar la constante `productosAMostrar`
- ❌ `maxDuration is not a valid export` → Verificar que esté en la ruta API correcta

### **2. Probar la funcionalidad:**

1. **Ir a:** `http://localhost:3000/crm/listas`
2. **Hacer clic** en el nombre de un curso
3. **Verificar** que aparecen los tabs: "Todos", "Disponibles", "No Disponibles"
4. **Probar los tabs:**
   - Click en "Disponibles" → Solo debe mostrar productos disponibles
   - Click en "No Disponibles" → Solo debe mostrar productos no disponibles
   - Click en "Todos" → Debe mostrar todos los productos
5. **Verificar imágenes:**
   - Las imágenes deben ser más grandes (80x80px)
   - Hover sobre imagen → Debe hacer zoom
   - Click en imagen → Debe abrir en nueva pestaña
6. **Probar con PDF grande:**
   - Subir un PDF grande (>10MB)
   - Click en "Procesar con IA"
   - Debe procesar sin timeout (hasta 4 minutos)

---

## ⚠️ POSIBLES CONFLICTOS

### **Conflicto 1: Estructura de estados diferente**

Si tu componente tiene una estructura de estados diferente:
- Asegúrate de agregar `tabActivo` en la sección de estados
- Verifica que no haya conflictos con otros estados

### **Conflicto 2: Estilos diferentes**

Si usas estilos diferentes:
- Los estilos inline pueden necesitar ajustes
- Puedes convertir a clases CSS si prefieres

### **Conflicto 3: maxDuration no soportado**

Si `maxDuration` no está disponible en tu versión de Next.js:
- Verifica la versión: `npm list next`
- Next.js 13.4+ soporta `maxDuration`
- Si es anterior, puedes omitir esta configuración (pero los timeouts seguirán siendo 10s por defecto)

### **Conflicto 4: Nombres de productos genéricos**

Si todos los productos muestran "Libro" o nombres genéricos:
- Revisa los logs en la consola del navegador
- Verifica qué campos tienen los materiales en Strapi
- El código ahora busca en múltiples campos (`nombre`, `nombre_producto`, `descripcion`, etc.)

---

## 🔍 ARCHIVOS CLAVE A REVISAR

### **1. `ValidacionLista.tsx`**

**Líneas importantes:**
- Línea ~68: Estado `tabActivo`
- Línea ~350-365: Separación de productos disponibles/no disponibles
- Línea ~490-510: Tabs de filtrado
- Línea ~520-580: Visualización mejorada de imágenes
- Línea ~640-655: Badges de disponibilidad mejorados

### **2. `procesar-pdf/route.ts`**

**Líneas importantes:**
- Línea ~17: `export const maxDuration = 300`
- Línea ~227-240: Logging del tamaño del PDF
- Línea ~350-380: Timeout de Gemini
- Línea ~450-470: Manejo de errores de timeout

---

## 📚 FUNCIONALIDADES NUEVAS

### **1. Tabs de Filtrado**

- **Todos:** Muestra todos los productos
- **Disponibles:** Solo productos encontrados en WooCommerce con stock disponible
- **No Disponibles:** Productos no encontrados o sin stock

### **2. Imágenes Mejoradas**

- **Tamaño:** 80x80px (antes 50x50px)
- **Hover:** Zoom al pasar el mouse
- **Click:** Abre imagen en nueva pestaña
- **Fallback:** Muestra "Sin imagen" si no hay o falla

### **3. Manejo de PDFs Grandes**

- **Timeout Next.js:** 5 minutos (antes 10 segundos)
- **Timeout Gemini:** 4 minutos
- **Logging:** Muestra tamaño del PDF en MB
- **Errores:** Mensajes específicos para timeouts

---

## ✅ CHECKLIST DE INTEGRACIÓN

- [ ] Actualizar rama principal
- [ ] Traer cambios de `mati-integracion`
- [ ] Aplicar cambios en `ValidacionLista.tsx`
- [ ] Aplicar cambios en `procesar-pdf/route.ts`
- [ ] Agregar estado `tabActivo`
- [ ] Agregar separación de productos disponibles/no disponibles
- [ ] Agregar tabs de filtrado
- [ ] Mejorar visualización de imágenes
- [ ] Mejorar badges de disponibilidad
- [ ] Agregar `maxDuration = 300` en API route
- [ ] Agregar timeout de Gemini
- [ ] Compilar proyecto (`npm run build`)
- [ ] Probar tabs de filtrado
- [ ] Probar imágenes (hover, click)
- [ ] Probar con PDF grande
- [ ] Verificar logs en consola

---

## 🆘 SI ALGO FALLA

### **Error: "Tabs no funcionan"**
- Verifica que `tabActivo` esté declarado como estado
- Verifica que `productosAMostrar` esté calculado correctamente
- Revisa la consola del navegador para errores

### **Error: "Imágenes no se ven"**
- Verifica que las URLs de imágenes sean válidas
- Revisa la consola del navegador para errores de CORS
- Verifica que `producto.imagen` tenga un valor

### **Error: "Timeout con PDFs grandes"**
- Verifica que `maxDuration = 300` esté en el archivo de ruta
- Verifica que el timeout de Gemini esté configurado (4 minutos)
- Revisa los logs del servidor para ver el tamaño del PDF

### **Error: "Todos los productos muestran 'Libro'"**
- Revisa los logs en la consola del navegador
- Verifica qué campos tienen los materiales en Strapi
- El código ahora busca en múltiples campos, pero puede que necesites ajustar según tu estructura

---

## 📞 CONTACTO

Si tienes dudas o problemas durante la integración:
1. Revisa los logs del servidor (`npm run dev`)
2. Revisa la consola del navegador (F12)
3. Compara tu código con el de la rama `mati-integracion`

---

## 🎉 ¡LISTO!

Una vez completados todos los pasos, deberías tener:
- ✅ Tabs de filtrado funcionando
- ✅ Imágenes mejoradas (más grandes, hover, click)
- ✅ Mejor indicación de disponibilidad
- ✅ Manejo mejorado de PDFs grandes
- ✅ Logging detallado para debugging

**¡Buena suerte con la integración!** 🚀
