# 🔍 Resumen del Problema: Procesamiento de PDF con Claude Vision API

## 📋 Contexto General

Estamos intentando implementar la extracción de productos desde PDFs de listas de útiles escolares usando Claude AI (Anthropic).

**Archivo principal:** `src/app/api/crm/listas/[id]/procesar-pdf/route.ts`

---

## 🎯 Problema Original

El sistema **NO extraía los productos reales del PDF**. Cuando procesábamos el PDF, Claude devolvía productos de ejemplo del prompt en lugar de los productos reales del documento.

### Causa Raíz

`pdf-parse` estaba extrayendo XML metadata en lugar del contenido real del PDF (especialmente en PDFs generados con Adobe Illustrator).

**Ejemplo del texto extraído:**
```xml
<?xpacket begin="..." id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
...
</x:xmpmeta>
```

Claude no encontraba productos reales, así que inventaba productos basándose en los ejemplos del prompt.

---

## 🔧 Solución Propuesta: Claude Vision API

Decidimos cambiar de estrategia:
1. ❌ **ANTES:** Extraer texto con `pdf-parse` → Enviar texto a Claude
2. ✅ **AHORA:** Enviar PDF directamente a Claude Vision API

---

## 🚧 Historia de Errores y Cambios

### Error #1: Caracteres Unicode en logs
```
Parsing ecmascript source code failed
Unexpected character '━'
```

**Solución:** Reemplazamos `━━━` por `===` en los console.log

---

### Error #2: Intento de conversión PDF → Imagen con pdfjs-dist

Intentamos convertir el PDF a imágenes usando `pdfjs-dist` y `@napi-rs/canvas`.

**Error obtenido:**
```
Setting up fake worker failed: "No 'GlobalWorkerOptions.workerSrc' specified."
```

**Intentos de solución:**
1. Configurar `GlobalWorkerOptions.workerSrc`
2. Usar polyfills para `DOMMatrix` y `Path2D`
3. Configurar `canvasFactory` e `imageFactory`

**Resultado:** Problemas persistentes con Turbopack/Next.js en modo desarrollo.

---

### Error #3: Decisión de enviar PDF directamente

Eliminamos la conversión a imagen y decidimos enviar el PDF directamente a Claude, ya que la API soporta PDFs nativamente.

**Cambios realizados:**
- Función `prepararPDFParaClaude`: Convierte PDF a base64
- Envío directo del PDF en el mensaje a Claude

---

### Error #4: Modelos deprecados (404)

#### Intento 1: `claude-3-sonnet-20240229`
```
404 {"type":"not_found_error","message":"model: claude-3-sonnet-20240229"}
```
**Causa:** Modelo deprecado (fin de vida: 21 julio 2025)

---

#### Intento 2: `claude-3-5-haiku-20241022`
```
404 {"type":"not_found_error","message":"model: claude-3-5-haiku-20241022"}
```
**Causa:** Este modelo no existe

---

#### Intento 3: `claude-3-haiku-20240307`
```
400 {"type":"invalid_request_error","message":"'claude-3-haiku-20240307' does not support PDF input."}
```
**Causa:** ✅ El modelo existe, PERO **Haiku NO soporta PDFs directamente**

---

## ✅ Solución Final Aplicada

Cambiamos al modelo: **`claude-3-5-sonnet-20241022`**

### ¿Por qué Sonnet?

| Modelo | Soporta Vision | Soporta PDF | Estado |
|--------|----------------|-------------|--------|
| Claude 3 Haiku | ✅ | ❌ | Solo imágenes |
| Claude 3.5 Sonnet | ✅ | ✅ | Activo |
| Claude 3 Opus | ✅ | ✅ | Activo |

Solo **Sonnet** y **Opus** soportan el procesamiento directo de PDFs.

---

## 🔑 Configuración Actual

### API Key
```
ANTHROPIC_API_KEY=sk-ant-api03-... (configurada en .env.local)
```

### Modelo
```typescript
const CLAUDE_MODEL = 'claude-3-5-sonnet-20241022'
```

### Estructura del mensaje a Claude

```typescript
const messages: Anthropic.Messages.MessageParam[] = [
  {
    role: 'user',
    content: [
      {
        type: 'text',
        text: crearPromptMejorado() // Instrucciones de extracción
      },
      {
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: pdfBase64 // PDF completo en base64
        }
      }
    ]
  }
]
```

---

## 📊 Logs del Último Intento (con Haiku)

```
[2026-02-02T21:05:57.576Z] [INFO] ✅ PDF descargado { "tamaño": "1.23 MB", "bytes": 1290146 }
[2026-02-02T21:05:57.577Z] [INFO] ✅ 📄 Preparando PDF para Claude Vision...
[2026-02-02T21:05:57.578Z] [INFO] ✅ PDF preparado exitosamente { "tamañoMB": "1.23", "tamañoBase64KB": "1679.88" }
[2026-02-02T21:05:57.580Z] [INFO] 🤖 🔄 Intento 1/3 { "modelo": "claude-3-haiku-20240307", "tamañoPDF": "1679.88 KB" }
[2026-02-02T21:05:58.657Z] [ERROR] ❌ Error en intento 1 {
  "error": "400 {\"type\":\"error\",\"error\":{\"type\":\"invalid_request_error\",\"message\":\"'claude-3-haiku-20240307' does not support PDF input.\"}}"
}
```

---

## 🎯 Próximos Pasos

1. ✅ Ya cambiamos a `claude-3-5-sonnet-20241022`
2. ⏳ Esperando recarga automática del servidor (Fast Refresh)
3. 🧪 Probar nuevamente el procesamiento del PDF

---

## 🤔 Preguntas sin Resolver

1. **¿El PDF se envía correctamente en base64?** 
   - ✅ Sí, logs muestran: 1.23 MB → 1679.88 KB base64

2. **¿La API key funciona?**
   - ✅ Sí, los errores son de modelo, no de autenticación

3. **¿Por qué no usar Opus?**
   - Opus es más costoso que Sonnet
   - Sonnet 3.5 es suficientemente capaz

4. **¿Deberíamos volver a la conversión PDF → Imagen?**
   - Solo si Sonnet también falla
   - Requeriría resolver los problemas de pdfjs-dist + Next.js/Turbopack

---

## 📝 Código Relevante

### Función principal de procesamiento

```typescript
async function procesarConClaude(
  pdfBase64: string,
  anthropic: Anthropic,
  logger: Logger,
  intento: number = 1
): Promise<{ productos: ProductoExtraido[] }> {
  
  logger.info('🤖 🔄 Intento ' + intento + '/' + MAX_RETRIES_CLAUDE, {
    modelo: CLAUDE_MODEL,
    tamañoPDF: (pdfBase64.length / 1024).toFixed(2) + ' KB'
  })

  const messages: Anthropic.Messages.MessageParam[] = [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: crearPromptMejorado()
        },
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: pdfBase64
          }
        }
      ]
    }
  ]

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: MAX_TOKENS_RESPUESTA,
    messages: messages
  })

  // Procesar respuesta...
}
```

### Preparación del PDF

```typescript
async function prepararPDFParaClaude(
  pdfBuffer: Buffer,
  logger: Logger
): Promise<string> {
  logger.info('📄 Preparando PDF para Claude Vision...', {
    tamañoBuffer: (pdfBuffer.length / 1024).toFixed(2) + ' KB',
    primerosBytes: pdfBuffer.slice(0, 4).toString('hex')
  })

  const pdfBase64 = pdfBuffer.toString('base64')
  
  logger.success('✅ PDF preparado para Claude Vision', {
    tamañoMB: (pdfBuffer.length / (1024 * 1024)).toFixed(2),
    tamañoKB: (pdfBuffer.length / 1024).toFixed(2),
    base64Length: pdfBase64.length
  })

  return pdfBase64
}
```

---

## 🔗 Referencias

- [Anthropic Models Documentation](https://docs.anthropic.com/en/docs/about-claude/models)
- [Claude Vision API Guide](https://docs.anthropic.com/en/docs/vision)
- [Model Deprecations](https://docs.anthropic.com/en/docs/resources/model-deprecations)

---

## 📌 Estado Actual (ACTUALIZADO - SOLUCIÓN ENCONTRADA)

### 🎉 **¡MODELOS CLAUDE 4 DISPONIBLES!**

Se creó un script (`test-models.js`) para probar sistemáticamente todos los modelos posibles con la API key proporcionada.

**✅ MODELOS QUE FUNCIONAN (5):**
1. ✅ `claude-sonnet-4-20250514` ← **USANDO ESTE**
2. ✅ `claude-4-sonnet-20250514`
3. ✅ `claude-opus-4-20250514`
4. ✅ `claude-4-opus-20250514`
5. ✅ `claude-3-haiku-20240307` (solo imágenes, NO PDFs)

**❌ MODELOS DEPRECADOS/NO DISPONIBLES (9):**
- `claude-3-5-sonnet-20240620` → 404
- `claude-3-5-sonnet-20241022` → 404
- `claude-3-opus-20240229` → 404 (deprecado)
- `claude-3-sonnet-20240229` → 404 (deprecado)
- Todos los aliases `-latest` → 404

### ✅ **SOLUCIÓN FINAL: Claude 4 Sonnet**

**MODELO SELECCIONADO:** `claude-sonnet-4-20250514`

**¿Por qué Claude 4 Sonnet?**
- ✅ Es el modelo Claude 4 más reciente (mayo 2025)
- ✅ Soporta Vision API y PDFs
- ✅ Más potente que Claude 3
- ✅ Verificado que funciona con la API key proporcionada
- 📊 Probado exitosamente en `test-models.js`

**ÚLTIMA MODIFICACIÓN:** Línea 114-117 de `route.ts`
```typescript
// Modelo de Claude AI
// claude-sonnet-4-20250514: Claude 4 Sonnet (2025) - Soporta Vision API y PDFs
// Modelo más reciente y potente disponible
const CLAUDE_MODEL = 'claude-sonnet-4-20250514'
```

### 📊 **Archivos creados para testing:**
- `test-claude-models.json` - Lista de modelos posibles
- `test-models.js` - Script de prueba automático
- `resultados-test-modelos.json` - Resultados de las pruebas

### ✅ **PROCESAMIENTO EXITOSO**

Claude 4 Sonnet procesó correctamente el PDF y extrajo **11 productos**:
1. 1x Cuaderno College
2. 2x Cuaderno Universitario
3. 1x Goma de borrar
4. 1x Block de dibujo N°99 1/8
5. 1x Caja de Témperas
6. 1x Pincel plano
7. 1x Lápiz Grafito
8. 1x Adhesivo en barra 8 gr
9. 1x Sacapuntas
10. 1x Regla
11. 1x Caja de lápices Colores

### 🔧 **Corrección final aplicada**

**Problema detectado:** Variable `paginas` no definida (ReferenceError)

**Causa:** Al cambiar de extracción de texto a Claude Vision directo, se eliminó la llamada a `extraerTextoDelPDF()` que proveía la variable `paginas`.

**Solución:** Agregado código para obtener el número de páginas del PDF usando `pdf-parse` (solo metadata, sin procesamiento completo):

```typescript
// Obtener número de páginas del PDF (necesario para coordenadas y metadata)
let paginas = 1 // Valor por defecto
try {
  const pdfData = await pdfParse(pdfBuffer)
  paginas = pdfData.numpages
  logger.info('📄 Páginas del PDF:', { paginas })
} catch (error) {
  logger.warn('⚠️ No se pudo obtener el número de páginas del PDF, usando valor por defecto: 1')
}
```

**Estado:** ✅ Corrección aplicada, esperando reinicio del servidor.
