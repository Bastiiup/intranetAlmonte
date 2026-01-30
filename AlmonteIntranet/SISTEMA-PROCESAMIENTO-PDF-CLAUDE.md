# 📚 Sistema de Procesamiento de PDFs con Claude AI

**Fecha:** 30 de enero de 2026  
**Versión:** 2.0  
**Modelo de IA:** Claude 3 Haiku (Anthropic)

---

## 🎯 Descripción General

Sistema completo para procesar listas de útiles escolares desde archivos PDF usando Claude AI de Anthropic. Extrae texto del PDF, identifica productos con IA, los busca en WooCommerce y guarda todo en Strapi con control de versiones.

---

## 🚀 Características Principales

### ✅ Procesamiento de PDF
- **Extracción de texto** con `pdf-parse` (sin problemas de workers)
- **Limpieza automática** de texto (normalización de caracteres especiales)
- **Validación de longitud** para evitar exceder límites de tokens
- **Logging estructurado** con timestamps y contexto

### 🤖 Inteligencia Artificial
- **Claude 3 Haiku** - Modelo rápido y económico de Anthropic
- **Prompt optimizado** para listas escolares chilenas
- **Retry logic** automático en caso de errores temporales
- **Validación Zod** para garantizar estructura correcta

### 🔍 Búsqueda y Validación
- **Búsqueda automática** en WooCommerce por cada producto
- **Detección de disponibilidad** y precios
- **Comparación inteligente** entre productos Claude vs actuales
- **Similitud de texto** para matching flexible

### 💾 Persistencia
- **Control de versiones** automático en Strapi
- **Historial completo** de procesamientos
- **Metadatos detallados** (modelo usado, fecha, estadísticas)

---

## 📋 Requisitos

### Dependencias NPM
```bash
npm install @anthropic-ai/sdk  # SDK de Claude
npm install pdf-parse           # Extracción de texto
npm install zod                 # Validación de schemas
```

### Variables de Entorno
```env
# .env.local
ANTHROPIC_API_KEY=sk-ant-api03-...  # Tu API key de Anthropic
NEXT_PUBLIC_STRAPI_URL=https://tu-strapi.com
STRAPI_API_TOKEN=tu-token-de-strapi
```

**⚠️ IMPORTANTE:** La API key de Claude debe estar en `.env.local` (no en el repositorio).

---

## 🛠️ Instalación

### 1. Verificar Dependencias
```bash
cd AlmonteIntranet
npm list @anthropic-ai/sdk pdf-parse zod
```

Si alguna falta:
```bash
npm install @anthropic-ai/sdk pdf-parse zod
```

### 2. Configurar API Key
```bash
# Crear o editar .env.local
echo "ANTHROPIC_API_KEY=sk-ant-api03-..." >> .env.local
```

### 3. Verificar Configuración
```bash
npm run dev
```

Buscar en los logs:
```
- Environments: .env.local  ✅
```

---

## 📡 API Endpoints

### 1. Procesar PDF con Claude

**Endpoint:** `POST /api/crm/listas/[id]/procesar-pdf`

**Descripción:** Procesa el PDF de una lista con Claude AI.

**Request:**
```bash
POST http://localhost:3000/api/crm/listas/w6ayqkjxc94h76gylitwlzgm/procesar-pdf
Content-Type: application/json
```

**Response (Éxito):**
```json
{
  "success": true,
  "message": "PDF procesado exitosamente con Claude AI",
  "data": {
    "productos": [
      {
        "id": "producto-1",
        "nombre": "Cuaderno universitario 100 hojas",
        "cantidad": 2,
        "marca": "Rhein",
        "isbn": null,
        "asignatura": "Matemáticas",
        "precio": 2500,
        "precio_woocommerce": 2490,
        "woocommerce_id": 12345,
        "woocommerce_sku": "CUA-100-RHEIN",
        "stock_quantity": 150,
        "encontrado_en_woocommerce": true,
        "disponibilidad": "disponible",
        "validado": false,
        "comprar": true,
        "imagen": "https://..."
      }
    ],
    "total": 42,
    "encontrados": 38,
    "noEncontrados": 4,
    "guardadoEnStrapi": true,
    "modelo_usado": "claude-3-haiku-20240307",
    "paginas_procesadas": 3,
    "tiempo_procesamiento_segundos": "8.45"
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Error al procesar PDF",
  "detalles": "No se pudo extraer texto del PDF. Puede ser un PDF escaneado o corrupto.",
  "sugerencia": "Verifica que el PDF sea válido y contenga texto legible"
}
```

**Códigos de Estado:**
- `200` - Éxito
- `400` - Solicitud inválida (sin PDF, sin ID)
- `404` - Curso no encontrado
- `500` - Error del servidor o de Claude

---

### 2. Comparar Productos

**Endpoint:** `GET /api/crm/listas/[id]/comparacion`

**Descripción:** Compara productos de Claude vs productos actuales.

**Request:**
```bash
GET http://localhost:3000/api/crm/listas/w6ayqkjxc94h76gylitwlzgm/comparacion
```

**Response:**
```json
{
  "success": true,
  "data": {
    "productosClaude": [...],
    "productosActuales": [...],
    "coincidencias": [
      {
        "claude": {
          "nombre": "Cuaderno universitario",
          "cantidad": 2,
          "precio": 2500
        },
        "actual": {
          "nombre": "Cuaderno universitario",
          "cantidad": 3,
          "precio": 2500
        },
        "estado": "diferente_cantidad",
        "diferencias": [
          "Cantidad: Claude=2, Actual=3"
        ]
      }
    ],
    "nuevos": [
      {
        "nombre": "Calculadora científica",
        "cantidad": 1,
        "precio": 8990,
        "estado": "nuevo",
        "sugerencia": "Claude detectó este producto en el PDF, considere agregarlo a la lista"
      }
    ],
    "faltantes": [
      {
        "nombre": "Tijera punta roma",
        "cantidad": 1,
        "precio": 1200,
        "estado": "faltante",
        "alerta": "Este producto está en la lista actual pero Claude no lo detectó en el PDF"
      }
    ],
    "estadisticas": {
      "totalClaude": 42,
      "totalActual": 40,
      "coincidencias": 38,
      "coincidenciasExactas": 35,
      "coincidenciasConDiferencias": 3,
      "nuevos": 4,
      "faltantes": 2,
      "porcentajeCoincidencia": 90
    }
  },
  "mensaje": "Comparación completada: 38 coincidencias, 4 nuevos, 2 faltantes"
}
```

**Estados de Comparación:**
- `coincide` - Productos idénticos
- `diferente_cantidad` - Mismo producto, diferente cantidad
- `diferente_precio` - Mismo producto, diferente precio
- `diferente_marca` - Mismo producto, diferente marca
- `nuevo` - Claude lo detectó pero no está en la lista actual
- `faltante` - Está en la lista actual pero Claude no lo detectó

---

## 🔧 Configuración Técnica

### Límites y Configuración

```typescript
const CLAUDE_MODEL = 'claude-3-haiku-20240307'
const MAX_TOKENS_RESPUESTA = 4096
const MAX_TOKENS_CONTEXTO = 200000
const TOKENS_POR_CARACTER = 0.25
const MAX_CARACTERES_SEGURO = 140000 // 70% del límite
const MAX_RETRIES_CLAUDE = 3
const RETRY_DELAY_MS = 1000
```

**Explicación:**
- **Modelo:** Claude 3 Haiku (más rápido y económico que Sonnet)
- **Tokens de respuesta:** Máximo 4096 tokens para la respuesta de Claude
- **Contexto:** Máximo 200,000 tokens de entrada
- **Caracteres seguros:** 140,000 caracteres (~70% del límite para margen)
- **Reintentos:** Hasta 3 intentos en caso de error de validación
- **Delay:** 1 segundo entre reintentos (se multiplica por el número de intento)

### Extracción de Texto

```typescript
// ✅ CORRECTO: Usar pdf-parse
import pdfParse from 'pdf-parse/lib/pdf-parse.js'

async function extraerTextoDelPDF(pdfBuffer: Buffer) {
  const data = await pdfParse(pdfBuffer, {
    max: 0 // sin límite de páginas
  })
  
  return {
    texto: data.text,
    paginas: data.numpages
  }
}
```

**⚠️ NO usar `pdfjs-dist`:**
```typescript
// ❌ INCORRECTO: Causa errores de workers en Next.js
import * as pdfjsLib from 'pdfjs-dist'
// Error: "Cannot find module 'pdf.worker.mjs'"
```

### Limpieza de Texto

```typescript
function limpiarTextoExtraido(texto: string): string {
  let textoLimpio = texto
  
  // Normalizar saltos de línea múltiples
  textoLimpio = textoLimpio.replace(/\n{3,}/g, '\n\n')
  
  // Corregir espacios antes/después de puntuación
  textoLimpio = textoLimpio.replace(/\s+([.,;:!?])/g, '$1')
  textoLimpio = textoLimpio.replace(/([.,;:!?])([^\s])/g, '$1 $2')
  
  // Normalizar caracteres especiales
  textoLimpio = textoLimpio.replace(/[""]/g, '"')
  textoLimpio = textoLimpio.replace(/['']/g, "'")
  textoLimpio = textoLimpio.replace(/–|—/g, '-')
  
  // Eliminar líneas vacías
  textoLimpio = textoLimpio.split('\n')
    .filter(line => line.trim().length > 0)
    .join('\n')
  
  return textoLimpio.trim()
}
```

### Validación Zod

```typescript
const ProductoExtraidoSchema = z.object({
  cantidad: z.union([
    z.number().int().positive(),
    z.string().transform((val) => {
      // Manejar: "2x", "dos", "II", "un", "par de"
      const numerosEspanol = {
        'un': 1, 'dos': 2, 'tres': 3,
        'par': 2, 'media': 0.5
      }
      // ... lógica de transformación
    })
  ]),
  
  nombre: z.string().min(1),
  isbn: z.string().nullable().transform(...),
  marca: z.string().nullable(),
  precio: z.union([z.number(), z.string()]).transform(...),
  asignatura: z.string().nullable(),
  descripcion: z.string().nullable(),
  comprar: z.boolean().default(true)
})
```

---

## 📊 Logging Estructurado

### Logger Class

```typescript
class Logger {
  info(message: string, context?: object)
  warn(message: string, context?: object)
  error(message: string, context?: object)
  debug(message: string, context?: object)
  start(message: string, context?: object)     // Con emoji 🚀
  success(message: string, context?: object)   // Con emoji ✅
  processing(message: string, context?: object) // Con emoji 🤖
  download(message: string, context?: object)   // Con emoji 📥
  save(message: string, context?: object)       // Con emoji 💾
}
```

### Ejemplo de Logs (Éxito)

```
[2026-01-30T...] [INFO] [Procesar PDF] [0ms] 🚀 Iniciando procesamiento de PDF con Claude AI
[2026-01-30T...] [INFO] [Procesar PDF] [100ms] 📥 Descargando PDF {
  "tamaño": "45.23 KB",
  "bytes": 46315
}
[2026-01-30T...] [INFO] [Procesar PDF] [550ms] 📄 Extrayendo texto del PDF con pdf-parse...
[2026-01-30T...] [INFO] [Procesar PDF] [1200ms] ✅ Texto extraído exitosamente {
  "caracteres": 5234,
  "paginas": 3,
  "preview": "LISTA DE ÚTILES ESCOLARES 2026..."
}
[2026-01-30T...] [INFO] [Procesar PDF] [1250ms] ✅ Texto limpiado {
  "caracteresOriginales": 5234,
  "caracteresLimpios": 5100,
  "reduccion": "3%"
}
[2026-01-30T...] [DEBUG] [Procesar PDF] [1260ms] 🔍 Validación de longitud {
  "esValido": true,
  "caracteres": 5100,
  "tokensEstimados": 1275,
  "porcentajeUsado": 4
}
[2026-01-30T...] [INFO] [Procesar PDF] [1270ms] 🤖 Procesando con Claude AI (intento 1/3)... {
  "modelo": "claude-3-haiku-20240307",
  "caracteres": 5100,
  "tokensEstimados": 1275
}
[2026-01-30T...] [INFO] [Procesar PDF] [3500ms] ✅ Claude procesó el texto exitosamente {
  "productosEncontrados": 42
}
[2026-01-30T...] [INFO] [Procesar PDF] [3550ms] 🔍 Buscando productos en WooCommerce... {
  "total": 42
}
[2026-01-30T...] [INFO] [Procesar PDF] [7200ms] ✅ Búsqueda en WooCommerce completada {
  "total": 42,
  "encontrados": 38,
  "noEncontrados": 4
}
[2026-01-30T...] [INFO] [Procesar PDF] [7250ms] 💾 Guardando en Strapi...
[2026-01-30T...] [INFO] [Procesar PDF] [7800ms] ✅ Guardado exitoso en Strapi {
  "version": 2
}
[2026-01-30T...] [INFO] [Procesar PDF] [7850ms] ✅ Procesamiento completado {
  "tiempoTotal": "7.85s",
  "productosEncontrados": 42,
  "guardadoExitoso": true
}
```

### Logs de Error (Ejemplo)

```
[2026-01-30T...] [ERROR] [Procesar PDF] [1200ms] ❌ Error al extraer texto del PDF {
  "error": "PDF appears to be encrypted"
}
[2026-01-30T...] [WARN] [Procesar PDF] [1500ms] ⚠️ Reintentando en 1000ms...
[2026-01-30T...] [ERROR] [Procesar PDF] [2700ms] ❌ Error en intento 2 {
  "error": "JSON inválido de Claude: Unexpected token",
  "tipo": "SyntaxError"
}
```

---

## 🎯 Prompt de Claude

### Prompt Completo

```
Eres un experto en analizar listas de útiles escolares. Tu tarea es extraer TODOS los productos de la siguiente lista.

REGLAS DE EXTRACCIÓN:

1. CANTIDAD:
   - Si hay número al inicio → usar ese número
   - "2x Cuadernos" → cantidad: 2
   - "dos lápices" → cantidad: 2
   - "II reglas" → cantidad: 2
   - "un cuaderno" → cantidad: 1
   - "par de tijeras" → cantidad: 2
   - Si no hay número → cantidad: 1

2. NOMBRE:
   - Ser específico y completo
   - NO usar nombres genéricos como "útiles" o "materiales"
   - Incluir detalles importantes: "Cuaderno universitario 100 hojas cuadriculado"
   - Extraer marca si está en el nombre: "Lápiz Faber-Castell HB"

3. ISBN:
   - Buscar patrones: "ISBN:", "ISBN", números de 10 o 13 dígitos
   - Limpiar guiones y espacios: "978-84-376-0494-7" → "9788437604947"
   - Si no hay ISBN → null

4. PRECIO:
   - Extraer si está presente: "$5.000", "CLP 5000", "5.000 pesos"
   - "gratis", "sin costo" → precio: 0
   - Si no hay precio → precio: 0

5. ASIGNATURA:
   - Si el producto está bajo un título de asignatura, asignarla
   - Ejemplos: "Matemáticas:", "Lenguaje:", "Ciencias:"
   - Si no está claro → null

6. QUÉ IGNORAR:
   - Títulos de secciones: "LISTA DE ÚTILES", "MATERIALES", "TEXTOS ESCOLARES"
   - Instrucciones generales: "Marcar todo con nombre"
   - Encabezados de asignaturas (pero sí extraer la asignatura para los productos)

FORMATO DE RESPUESTA:
{
  "productos": [
    {
      "cantidad": number,
      "nombre": string,
      "isbn": string | null,
      "marca": string | null,
      "precio": number,
      "asignatura": string | null,
      "descripcion": string | null,
      "comprar": boolean
    }
  ]
}

IMPORTANTE: NO incluyas ```json ni ``` en tu respuesta, solo el JSON puro.
```

---

## 💰 Costos de Claude

### Precios de Claude 3 Haiku

**Entrada (Input):**
- $0.25 / 1M tokens

**Salida (Output):**
- $1.25 / 1M tokens

### Estimación de Costos

**PDF típico (3 páginas, 5,000 caracteres):**
- Entrada: ~1,275 tokens → $0.0003
- Salida: ~1,000 tokens → $0.0013
- **Total por PDF: ~$0.0016 USD** (menos de 2 centavos)

**Procesamiento masivo (100 PDFs):**
- Entrada: ~127,500 tokens → $0.032
- Salida: ~100,000 tokens → $0.125
- **Total: ~$0.16 USD** (16 centavos)

**Nota:** Claude 3 Haiku es ~90% más barato que Claude 3 Sonnet.

---

## 🐛 Troubleshooting

### Error: "ANTHROPIC_API_KEY no está configurada"

**Causa:** La variable de entorno no está definida.

**Solución:**
```bash
# Crear .env.local
echo "ANTHROPIC_API_KEY=sk-ant-api03-..." >> .env.local

# Reiniciar servidor
npm run dev
```

Verificar:
```bash
grep ANTHROPIC_API_KEY .env.local
```

---

### Error: "Cannot find module 'pdf.worker.mjs'"

**Causa:** Estás usando `pdfjs-dist` en lugar de `pdf-parse`.

**Solución:**
```typescript
// ❌ Eliminar esto
import * as pdfjsLib from 'pdfjs-dist'

// ✅ Usar esto
import pdfParse from 'pdf-parse/lib/pdf-parse.js'
```

---

### Error: "JSON inválido de Claude"

**Causa:** Claude devolvió markdown o texto adicional.

**Solución:** El código ya maneja esto automáticamente:
```typescript
// Limpiar markdown
jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '')

// Buscar JSON
const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
if (jsonMatch) {
  jsonText = jsonMatch[0]
}
```

Si persiste, revisar el prompt o aumentar `MAX_RETRIES_CLAUDE`.

---

### Error: "Curso no encontrado"

**Causa:** El ID proporcionado no existe o no tiene permisos.

**Solución:**
1. Verificar que el ID es correcto
2. Verificar que `STRAPI_API_TOKEN` tiene permisos
3. Revisar logs del servidor

```bash
# Probar manualmente
curl -H "Authorization: Bearer $STRAPI_API_TOKEN" \
  https://tu-strapi.com/api/cursos/w6ayqkjxc94h76gylitwlzgm
```

---

### Advertencia: "Texto excede límite seguro"

**Causa:** El PDF es muy largo (>140,000 caracteres).

**Solución actual:** El sistema continúa con el texto completo (Claude puede manejar hasta 200K tokens).

**Solución futura:** Implementar chunking:
```typescript
if (!validacion.esValido) {
  // Dividir en chunks de MAX_CARACTERES_SEGURO
  const chunks = dividirEnChunks(textoLimpio, MAX_CARACTERES_SEGURO)
  
  // Procesar cada chunk
  for (const chunk of chunks) {
    const resultado = await procesarConClaude(chunk, anthropic, logger)
    productosExtraidos.push(...resultado.productos)
  }
}
```

---

## 📝 Flujo Completo del Sistema

### Diagrama de Flujo

```
1. Usuario → POST /api/crm/listas/[id]/procesar-pdf
           ↓
2. Obtener curso desde Strapi
           ↓
3. Descargar PDF (vía URL o ID)
           ↓
4. Extraer texto con pdf-parse
           ↓
5. Limpiar y normalizar texto
           ↓
6. Validar longitud de texto
           ↓
7. Enviar a Claude AI
           ↓
8. Validar respuesta con Zod
           ↓
9. Buscar cada producto en WooCommerce
           ↓
10. Guardar en Strapi (versiones_materiales)
           ↓
11. Responder al usuario con resultados
```

### Estructura de Datos en Strapi

```json
{
  "versiones_materiales": [
    {
      "version_numero": 2,
      "fecha_subida": "2026-01-30T10:00:00Z",
      "fecha_actualizacion": "2026-01-30T10:05:32Z",
      "procesado_con_ia": true,
      "modelo_ia": "claude-3-haiku-20240307",
      "pdf_id": "12345",
      "pdf_url": "https://...",
      "productos": [
        {
          "id": "producto-1",
          "nombre": "Cuaderno universitario",
          "cantidad": 2,
          "marca": "Rhein",
          "precio": 2500,
          "woocommerce_id": 12345,
          "encontrado_en_woocommerce": true,
          "validado": false
        }
      ]
    }
  ]
}
```

---

## 🔄 Uso del Endpoint de Comparación

### Casos de Uso

**1. Verificar si Claude detectó todos los productos:**
```bash
GET /api/crm/listas/[id]/comparacion
```

Revisar `faltantes` en la respuesta.

**2. Ver qué productos nuevos sugiere Claude:**
```bash
GET /api/crm/listas/[id]/comparacion
```

Revisar `nuevos` en la respuesta.

**3. Detectar diferencias de cantidad/precio:**
```bash
GET /api/crm/listas/[id]/comparacion
```

Revisar `coincidencias` con `estado: "diferente_cantidad"`.

### Integración con Frontend

```typescript
// React component
const [comparacion, setComparacion] = useState(null)

async function compararProductos() {
  const response = await fetch(`/api/crm/listas/${cursoId}/comparacion`)
  const data = await response.json()
  
  if (data.success) {
    setComparacion(data.data)
    
    // Alertas
    if (data.data.estadisticas.nuevos > 0) {
      alert(`Claude encontró ${data.data.estadisticas.nuevos} productos nuevos`)
    }
    if (data.data.estadisticas.faltantes > 0) {
      alert(`Hay ${data.data.estadisticas.faltantes} productos que Claude no detectó`)
    }
  }
}

// Renderizar
{comparacion && (
  <div>
    <h3>Estadísticas de Comparación</h3>
    <p>Coincidencias: {comparacion.estadisticas.coincidencias}</p>
    <p>Productos nuevos: {comparacion.estadisticas.nuevos}</p>
    <p>Faltantes: {comparacion.estadisticas.faltantes}</p>
    <p>% Coincidencia: {comparacion.estadisticas.porcentajeCoincidencia}%</p>
  </div>
)}
```

---

## 🎨 Mejoras Futuras

### 1. Chunking para PDFs Largos
```typescript
function dividirEnChunks(texto: string, maxCaracteres: number): string[] {
  const chunks: string[] = []
  let inicio = 0
  
  while (inicio < texto.length) {
    chunks.push(texto.substring(inicio, inicio + maxCaracteres))
    inicio += maxCaracteres
  }
  
  return chunks
}
```

### 2. OCR para PDFs Escaneados
```typescript
import Tesseract from 'tesseract.js'

async function extraerTextoConOCR(pdfBuffer: Buffer): Promise<string> {
  // Convertir PDF a imágenes
  const imagenes = await convertirPdfAImagenes(pdfBuffer)
  
  // Aplicar OCR
  let textoCompleto = ''
  for (const imagen of imagenes) {
    const { data: { text } } = await Tesseract.recognize(imagen, 'spa')
    textoCompleto += text + '\n'
  }
  
  return textoCompleto
}
```

### 3. Cache de Productos WooCommerce
```typescript
const cacheWoo = new Map<string, WooCommerceProduct>()

async function buscarConCache(nombre: string): Promise<WooCommerceProduct | null> {
  if (cacheWoo.has(nombre)) {
    return cacheWoo.get(nombre)!
  }
  
  const resultado = await wooClient.get('products', { search: nombre })
  if (resultado.length > 0) {
    cacheWoo.set(nombre, resultado[0])
    return resultado[0]
  }
  
  return null
}
```

### 4. Webhooks para Procesamiento Asíncrono
```typescript
// Endpoint para iniciar procesamiento
POST /api/crm/listas/[id]/procesar-pdf/async
→ Retorna { jobId: "..." }

// Endpoint para consultar estado
GET /api/crm/listas/[id]/procesar-pdf/status/[jobId]
→ Retorna { status: "processing" | "completed" | "failed", progress: 45 }
```

---

## 📚 Referencias

- [Anthropic Claude Documentation](https://docs.anthropic.com/)
- [pdf-parse NPM Package](https://www.npmjs.com/package/pdf-parse)
- [Zod Documentation](https://zod.dev/)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)

---

## ✅ Checklist de Implementación

- [x] Instalar dependencias (`@anthropic-ai/sdk`, `pdf-parse`, `zod`)
- [x] Configurar `ANTHROPIC_API_KEY` en `.env.local`
- [x] Crear endpoint `/api/crm/listas/[id]/procesar-pdf/route.ts`
- [x] Crear endpoint `/api/crm/listas/[id]/comparacion/route.ts`
- [x] Implementar extracción de texto con `pdf-parse`
- [x] Implementar limpieza de texto
- [x] Implementar validación Zod
- [x] Implementar retry logic
- [x] Implementar logging estructurado
- [x] Implementar búsqueda en WooCommerce
- [x] Implementar guardado en Strapi
- [x] Implementar comparación de productos
- [x] Documentar sistema completo
- [ ] Testing con PDFs reales
- [ ] Optimizaciones de rendimiento
- [ ] Implementar chunking (futuro)
- [ ] Implementar OCR (futuro)

---

**Última actualización:** 30 de enero de 2026  
**Estado:** ✅ Sistema completamente implementado y documentado
