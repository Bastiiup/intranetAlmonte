# 📚 EXPLICACIÓN COMPLETA: PROCESAMIENTO DE PDFs CON GEMINI AI

## 🎯 RESUMEN GENERAL

El sistema extrae productos de listas de útiles escolares (PDFs) usando **Google Gemini AI**, valida esos productos contra **WooCommerce Escolar**, y los guarda en **Strapi** para mostrarlos en la interfaz.

---

## 🔄 FLUJO COMPLETO DEL PROCESO

### **1. INICIO DEL PROCESO (Frontend)**

**Archivo:** `src/app/(admin)/(apps)/crm/listas/[id]/validacion/components/ValidacionLista.tsx`

**Función:** `procesarPDFConGemini()`

```typescript
// Usuario hace clic en "Procesar con IA"
const response = await fetch(`/api/crm/listas/${id}/procesar-pdf`, {
  method: 'POST',
})
```

**Qué hace:**
- El usuario hace clic en el botón "Procesar con IA"
- El frontend envía una petición POST a `/api/crm/listas/[id]/procesar-pdf`
- Muestra un spinner de carga mientras procesa

---

### **2. OBTENER CURSO DESDE STRAPI (Backend)**

**Archivo:** `src/app/api/crm/listas/[id]/procesar-pdf/route.ts`

**Líneas:** 74-130

```typescript
// Buscar curso por documentId primero
const cursoResponse = await strapiClient.get(`/api/cursos?filters[documentId][$eq]=${id}`)

// Si no se encuentra, intentar con id numérico
if (!curso && /^\d+$/.test(String(id))) {
  const cursoResponse = await strapiClient.get(`/api/cursos/${id}`)
}
```

**Qué hace:**
- Busca el curso en Strapi usando el ID de la URL
- Intenta primero con `documentId` (recomendado en Strapi v5)
- Si falla, intenta con `id` numérico
- Obtiene el curso completo con sus relaciones (colegio, versiones_materiales)

**Datos obtenidos:**
- Información del curso (nombre, nivel, grado, etc.)
- `versiones_materiales`: Array con las versiones de materiales del curso
- `ultimaVersion`: La versión más reciente (ordenada por fecha)

---

### **3. DESCARGAR PDF DESDE STRAPI**

**Líneas:** 132-209

```typescript
// Obtener ID del PDF desde la última versión
const pdfId = ultimaVersion?.pdf_id

// Descargar archivo desde Strapi Media Library
const fileResponse = await fetch(`${STRAPI_URL}/api/upload/files/${pdfId}`)
const fileData = await fileResponse.json()

// Descargar el PDF real
const pdfResponse = await fetch(fileData.url)
const pdfBuffer = await pdfResponse.arrayBuffer()

// Convertir a base64 para Gemini
const pdfBase64 = Buffer.from(pdfBuffer).toString('base64')
```

**Qué hace:**
1. Obtiene el `pdf_id` de la última versión de materiales
2. Descarga la información del archivo desde Strapi Media Library
3. Descarga el PDF real usando la URL del archivo
4. Convierte el PDF a base64 (formato que Gemini acepta)

**Por qué base64:**
- Gemini 1.5 Flash/Pro acepta PDFs directamente como `inlineData`
- No necesitamos extraer texto manualmente
- Gemini procesa el PDF visualmente (mejor comprensión)

---

### **4. PROCESAR PDF CON GEMINI AI**

**Líneas:** 216-404

```typescript
// Configurar Gemini
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

// Modelos a probar (en orden de preferencia)
const MODELOS_DISPONIBLES = [
  'gemini-2.5-flash',      // Más rápido y barato
  'gemini-flash-latest',   // Última versión Flash
  'gemini-2.5-pro',        // Más potente
  'gemini-pro-latest',     // Última versión Pro
  'gemini-1.5-flash',      // Fallback
  'gemini-1.5-pro',         // Fallback
]

// Prompt detallado para Gemini
const prompt = `Eres un experto en analizar listas de útiles escolares...
[Instrucciones detalladas de extracción]`

// Enviar PDF directamente a Gemini
const result = await model.generateContent([
  prompt,
  {
    inlineData: {
      data: pdfBase64,        // PDF en base64
      mimeType: 'application/pdf'
    }
  }
])

// Obtener respuesta
const textoRespuesta = result.response.text()
// Ejemplo: { "productos": [{ "cantidad": 2, "nombre": "Cuaderno", ... }] }
```

**Qué hace:**
1. Configura Google Gemini AI con la API key
2. Prueba modelos en orden hasta que uno funcione
3. Envía el PDF directamente a Gemini (no extrae texto manualmente)
4. Gemini analiza el PDF visualmente y extrae productos
5. Limpia la respuesta (remueve markdown si existe)
6. Parsea el JSON con los productos extraídos

**Ventajas de enviar PDF directo:**
- ✅ Gemini entiende el formato visual del PDF
- ✅ No necesita extraer texto manualmente (evita problemas de workers)
- ✅ Mejor comprensión de tablas, listas, etc.
- ✅ Funciona con PDFs escaneados (OCR automático)

**Modelos y fallback:**
- Si `gemini-2.5-flash` falla, prueba `gemini-flash-latest`
- Si todos fallan, muestra error detallado
- Cada modelo tiene diferentes capacidades y costos

---

### **5. NORMALIZAR PRODUCTOS**

**Líneas:** 408-428

```typescript
const productosNormalizados = productos.map((producto, index) => ({
  id: `producto-${index + 1}`,
  validado: false,
  nombre: producto.nombre || `Producto ${index + 1}`,
  isbn: producto.isbn || null,
  marca: producto.marca || null,
  cantidad: parseInt(String(producto.cantidad)) || 1,
  comprar: producto.comprar !== false,
  precio: parseFloat(String(producto.precio)) || 0,
  asignatura: producto.asignatura || null,
  descripcion: producto.descripcion || null,
  disponibilidad: 'disponible',
  encontrado_en_woocommerce: false,
}))
```

**Qué hace:**
- Convierte los productos de Gemini a un formato estándar
- Asegura tipos correctos (números, strings, booleanos)
- Agrega campos por defecto si faltan
- Prepara para validación en WooCommerce

---

### **6. VALIDAR PRODUCTOS EN WOOCOMMERCE ESCOLAR**

**Líneas:** 430-535

```typescript
// Cliente de WooCommerce Escolar
const wooCommerceClient = createWooCommerceClient('woo_escolar')

// Buscar cada producto
const buscarProductoEnWooCommerce = async (producto) => {
  // 1. Buscar por SKU/ISBN primero (más preciso)
  if (producto.isbn) {
    const productosPorSKU = await wooCommerceClient.get('products', {
      sku: producto.isbn,
      per_page: 1,
    })
  }
  
  // 2. Si no se encuentra, buscar por nombre
  const productosPorNombre = await wooCommerceClient.get('products', {
    search: producto.nombre,
    per_page: 10,
  })
  
  // Comparar nombres (case-insensitive, parcial)
  const encontrado = productosPorNombre.find(p => 
    p.name.toLowerCase().includes(producto.nombre.toLowerCase())
  )
  
  return encontrado || null
}

// Validar todos los productos en paralelo
const productosValidados = await Promise.all(
  productosNormalizados.map(async (producto) => {
    const productoWooCommerce = await buscarProductoEnWooCommerce(producto)
    
    if (productoWooCommerce) {
      return {
        ...producto,
        woocommerce_id: productoWooCommerce.id,
        woocommerce_sku: productoWooCommerce.sku,
        precio: productoWooCommerce.price,
        stock_quantity: productoWooCommerce.stock_quantity,
        disponibilidad: productoWooCommerce.stock_status === 'instock' ? 'disponible' : 'no_disponible',
        encontrado_en_woocommerce: true,
        imagen: productoWooCommerce.images[0]?.src,
      }
    } else {
      return {
        ...producto,
        encontrado_en_woocommerce: false,
        disponibilidad: 'no_encontrado',
      }
    }
  })
)
```

**Qué hace:**
1. Para cada producto extraído:
   - **Primero** busca por SKU/ISBN (más preciso)
   - **Si no encuentra**, busca por nombre (búsqueda parcial, case-insensitive)
2. Si encuentra el producto en WooCommerce:
   - Agrega información de WooCommerce (ID, SKU, precio, stock, imagen)
   - Marca como `encontrado_en_woocommerce: true`
   - Actualiza disponibilidad según stock
3. Si NO encuentra:
   - Marca como `encontrado_en_woocommerce: false`
   - Disponibilidad: `no_encontrado`

**Por qué validar:**
- Verifica que los productos existan en WooCommerce
- Obtiene precios y stock actualizados
- Obtiene imágenes de los productos
- Identifica productos que no están en el catálogo

---

### **7. GUARDAR PRODUCTOS EN STRAPI**

**Líneas:** 537-680

```typescript
// Preparar productos para guardar (solo campos necesarios)
const productosParaGuardar = productosValidados.map((p) => ({
  cantidad: p.cantidad || 1,
  nombre: p.nombre || '',
  isbn: p.isbn || null,
  marca: p.marca || null,
  comprar: p.comprar !== false,
  precio: p.precio || 0,
  asignatura: p.asignatura || null,
  descripcion: p.descripcion || null,
  woocommerce_id: p.woocommerce_id || null,
  woocommerce_sku: p.woocommerce_sku || null,
  precio_woocommerce: p.precio_woocommerce || null,
  stock_quantity: p.stock_quantity || null,
  disponibilidad: p.disponibilidad || 'disponible',
  encontrado_en_woocommerce: p.encontrado_en_woocommerce || false,
  imagen: p.imagen || null,
}))

// Actualizar la última versión con los productos
const versionesActualizadas = versiones.map((v) => {
  const isUltimaVersion = v.id === ultimaVersion.id || 
                         v.fecha_subida === ultimaVersion.fecha_subida
  
  if (isUltimaVersion) {
    return {
      ...v,
      materiales: productosParaGuardar,  // ← Productos guardados aquí
      fecha_actualizacion: new Date().toISOString(),
      procesado_con_ia: true,
      fecha_procesamiento: new Date().toISOString(),
      validado_woocommerce: true,
      fecha_validacion: new Date().toISOString(),
    }
  }
  return v
})

// Actualizar curso en Strapi
const cursoDocumentId = curso.documentId || curso.id
const updateData = {
  data: {
    versiones_materiales: versionesActualizadas,
  },
}

const response = await strapiClient.put(`/api/cursos/${cursoDocumentId}`, updateData)
```

**Qué hace:**
1. **Prepara productos:** Limpia y normaliza los productos validados
2. **Actualiza versión:** Encuentra la última versión y actualiza su array `materiales`
3. **Agrega metadatos:**
   - `fecha_actualizacion`: Fecha de última actualización
   - `procesado_con_ia`: `true` (indica que fue procesado con IA)
   - `fecha_procesamiento`: Fecha del procesamiento
   - `validado_woocommerce`: `true` (indica que fue validado)
   - `fecha_validacion`: Fecha de validación
4. **Guarda en Strapi:** Actualiza el curso completo con las versiones actualizadas

**Estructura en Strapi:**
```json
{
  "versiones_materiales": [
    {
      "id": "...",
      "fecha_subida": "...",
      "pdf_id": 123,
      "materiales": [
        {
          "cantidad": 2,
          "nombre": "Cuaderno universitario",
          "isbn": null,
          "woocommerce_id": 456,
          "precio": 1500,
          "encontrado_en_woocommerce": true,
          ...
        }
      ],
      "procesado_con_ia": true,
      "fecha_procesamiento": "2024-01-15T10:30:00Z",
      "validado_woocommerce": true,
      "fecha_validacion": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

### **8. RECARGAR PRODUCTOS EN FRONTEND**

**Archivo:** `src/app/(admin)/(apps)/crm/listas/[id]/validacion/components/ValidacionLista.tsx`

**Líneas:** 240-248

```typescript
// Si el guardado fue exitoso, recargar productos
if (data.data.guardadoEnStrapi) {
  // Esperar un momento para que Strapi procese
  await new Promise(resolve => setTimeout(resolve, 500))
  
  // Recargar productos desde la API
  await cargarProductos(true)
  
  // Verificar que se cargaron
  console.log('Productos cargados:', productos.length)
}
```

**Qué hace:**
- Si el guardado fue exitoso, espera 500ms
- Llama a `cargarProductos(true)` para forzar recarga desde la API
- Los productos aparecen en la tabla automáticamente

---

## 📊 ESTRUCTURA DE DATOS

### **Producto Extraído (Gemini)**
```typescript
{
  cantidad: 2,
  nombre: "Cuaderno universitario",
  isbn: null,
  marca: null,
  comprar: true,
  precio: 0,
  asignatura: null,
  descripcion: "100 hojas cuadriculado"
}
```

### **Producto Normalizado**
```typescript
{
  id: "producto-1",
  validado: false,
  nombre: "Cuaderno universitario",
  cantidad: 2,
  isbn: null,
  disponibilidad: "disponible",
  encontrado_en_woocommerce: false,
  // ... más campos
}
```

### **Producto Validado (WooCommerce)**
```typescript
{
  id: "producto-1",
  nombre: "Cuaderno universitario",
  cantidad: 2,
  woocommerce_id: 456,
  woocommerce_sku: "CUAD-001",
  precio: 1500,
  precio_woocommerce: 1500,
  stock_quantity: 50,
  disponibilidad: "disponible",
  encontrado_en_woocommerce: true,
  imagen: "https://...",
  // ... más campos
}
```

### **Producto Guardado (Strapi)**
```typescript
{
  cantidad: 2,
  nombre: "Cuaderno universitario",
  isbn: null,
  marca: null,
  comprar: true,
  precio: 1500,
  woocommerce_id: 456,
  woocommerce_sku: "CUAD-001",
  precio_woocommerce: 1500,
  stock_quantity: 50,
  disponibilidad: "disponible",
  encontrado_en_woocommerce: true,
  imagen: "https://...",
  // ... más campos
}
```

---

## 🔑 PUNTOS CLAVE

### **1. Gemini procesa PDFs directamente**
- No extraemos texto manualmente
- Gemini entiende el formato visual
- Funciona con PDFs escaneados

### **2. Validación en WooCommerce Escolar**
- Busca por SKU primero (más preciso)
- Si no encuentra, busca por nombre
- Obtiene precios, stock e imágenes actualizados

### **3. Guardado en Strapi**
- Actualiza `versiones_materiales[].materiales[]`
- Solo actualiza la última versión
- Preserva otras versiones intactas
- Agrega metadatos de procesamiento

### **4. Manejo de errores**
- Si Gemini falla, prueba otro modelo
- Si WooCommerce falla, marca producto como no encontrado
- Si Strapi falla, muestra error específico pero no bloquea

---

## 🛠️ CONFIGURACIÓN NECESARIA

### **Variables de Entorno**
```env
GEMINI_API_KEY=tu_api_key_aqui
NEXT_PUBLIC_STRAPI_URL=https://strapi.moraleja.cl
STRAPI_API_TOKEN=tu_token_aqui
```

### **WooCommerce Escolar**
- URL: Configurada en `createWooCommerceClient('woo_escolar')`
- Credenciales: En variables de entorno
- Productos deben tener SKU o nombre para validación

### **Strapi**
- Modelo `curso` debe tener campo `versiones_materiales` (JSON)
- Campo `materiales` dentro de cada versión (Array)
- Permisos de actualización configurados

---

## 📝 LOGS IMPORTANTES

### **Durante el procesamiento:**
```
[Procesar PDF] 🚀 Iniciando procesamiento...
[Procesar PDF] ✅ Curso encontrado
[Procesar PDF] ⬇️ Descargando PDF desde Strapi...
[Procesar PDF] ✅ PDF descargado: 123456 bytes
[Procesar PDF] 🤖 Procesando con Gemini AI...
[Procesar PDF] Probando modelo: gemini-2.5-flash
[Procesar PDF] ✅ Éxito con: gemini-2.5-flash
[Procesar PDF] Productos extraídos: 3
[Procesar PDF] 🔍 Validando productos en WooCommerce Escolar...
[Procesar PDF] ✅ Validación completada: { total: 3, encontrados: 3, noEncontrados: 0 }
[Procesar PDF] 💾 Guardando productos en Strapi...
[Procesar PDF] 📤 Actualizando curso en Strapi: { cursoId: "...", productosCount: 3 }
[Procesar PDF] ✅ Productos guardados exitosamente en Strapi: 3
```

---

## ✅ RESULTADO FINAL

1. **PDF procesado** con Gemini AI
2. **Productos extraídos** y normalizados
3. **Productos validados** contra WooCommerce Escolar
4. **Productos guardados** en Strapi (en `versiones_materiales[].materiales[]`)
5. **Productos mostrados** en la tabla del frontend

---

## 🎯 VENTAJAS DEL SISTEMA

✅ **Automatización completa:** De PDF a datos en segundos
✅ **Validación automática:** Verifica existencia en WooCommerce
✅ **Datos actualizados:** Precios y stock desde WooCommerce
✅ **Manejo de errores robusto:** Fallbacks y mensajes claros
✅ **Logging detallado:** Fácil debugging
✅ **Escalable:** Funciona con cualquier cantidad de productos

---

¿Tienes alguna pregunta específica sobre alguna parte del proceso?
