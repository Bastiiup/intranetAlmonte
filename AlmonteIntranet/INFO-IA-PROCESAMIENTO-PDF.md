# 🤖 IA Utilizada para Procesamiento de PDFs

## 📋 RESUMEN

El sistema utiliza **Claude AI (Anthropic)** para procesar y reconocer productos en los PDFs de listas de útiles escolares.

---

## 🔍 DETALLES TÉCNICOS

### 1. **Modelo de IA:**
- **Proveedor:** Anthropic (Claude AI)
- **Modelo:** `claude-3-haiku-20240307`
- **SDK:** `@anthropic-ai/sdk`

### 2. **Ubicación del código:**
- **Archivo:** `src/app/api/crm/listas/[id]/procesar-pdf/route.ts`
- **Línea 114:** `const CLAUDE_MODEL = 'claude-3-haiku-20240307'`

### 3. **Proceso completo:**

#### Paso 1: Extracción de texto del PDF
- **Librería:** `pdf-parse` (que internamente usa `pdfjs-dist`)
- **Función:** `extraerTextoDelPDF()`
- **Resultado:** Texto plano extraído del PDF

#### Paso 2: Limpieza del texto
- **Función:** `limpiarTextoExtraido()`
- **Acciones:**
  - Normaliza saltos de línea
  - Corrige espacios y puntuación
  - Elimina líneas vacías múltiples

#### Paso 3: Procesamiento con Claude AI
- **Función:** `procesarConClaude()`
- **Input:** Texto limpio del PDF
- **Output:** JSON estructurado con productos identificados
- **Formato esperado:**
  ```json
  {
    "productos": [
      {
        "cantidad": 2,
        "nombre": "Cuadernos universitarios 100 hojas",
        "isbn": null,
        "marca": null,
        "precio": 0,
        "asignatura": null,
        "descripcion": null,
        "comprar": true
      }
    ]
  }
  ```

#### Paso 4: Validación y filtrado
- **Validación:** Zod schema (`RespuestaClaudeSchema`)
- **Filtrado:** Elimina productos inválidos o instrucciones

#### Paso 5: Búsqueda en WooCommerce
- **Función:** `buscarEnWooCommerce()`
- **Acción:** Busca cada producto en WooCommerce para obtener precio, imagen, SKU, etc.

#### Paso 6: Extracción de coordenadas
- **Función:** `extraerCoordenadasReales()` (opcional)
- **Librería:** `pdfjs-dist`
- **Resultado:** Coordenadas exactas (X, Y, página) donde aparece cada producto en el PDF

#### Paso 7: Guardado en Strapi
- **Campo:** `versiones_materiales` del curso
- **Estructura:** Array de materiales con toda la información extraída

---

## 🔑 CONFIGURACIÓN

### Variables de entorno necesarias:

```env
ANTHROPIC_API_KEY=sk-ant-api03-...
```

### Límites y configuración:

- **Max tokens respuesta:** 4096 (límite del modelo haiku)
- **Max caracteres texto:** 50,000 (se trunca automáticamente si excede)
- **Max reintentos:** 3
- **Delay entre reintentos:** 2 segundos

---

## 📊 FLUJO COMPLETO

```
PDF → pdf-parse → Texto plano
                ↓
         Limpieza de texto
                ↓
         Claude AI (Haiku)
                ↓
         JSON estructurado
                ↓
         Validación Zod
                ↓
         Filtrado
                ↓
         Búsqueda WooCommerce
                ↓
         Extracción coordenadas (opcional)
                ↓
         Guardado en Strapi
```

---

## 🎯 PROMPT ENVIADO A CLAUDE

El prompt incluye instrucciones detalladas para:
- Extraer TODOS los productos sin excepción
- Copiar EXACTAMENTE el texto del PDF (sin modificar)
- Identificar cantidad, nombre, ISBN, marca, precio, asignatura
- Ignorar títulos, instrucciones, URLs
- Formato JSON estricto

---

## ⚠️ LIMITACIONES

1. **Modelo Haiku:**
   - Límite de 4096 tokens de salida
   - Si hay muchos productos, la respuesta puede cortarse
   - Solución: El sistema detecta esto y muestra advertencias

2. **PDFs escaneados:**
   - Si el PDF es solo imágenes (sin texto seleccionable), no se puede extraer texto
   - Solución: Se necesita OCR (no implementado actualmente)

3. **Rate limiting:**
   - Claude tiene límites de uso por minuto
   - Solución: Reintentos automáticos con delays

---

## 🔄 HISTORIAL

- **Anteriormente:** Se usaba Gemini AI
- **Actual:** Claude AI (Anthropic) - `claude-3-haiku-20240307`
- **Razón del cambio:** Mejor rendimiento y precisión en extracción de datos estructurados

---

## 📝 NOTAS

- El modelo `claude-3-haiku-20240307` es el más económico y rápido de Claude
- Es adecuado para tareas de extracción de datos estructurados
- Si necesitas más precisión, se puede cambiar a `claude-3-sonnet-20240229` o `claude-3-opus-20240229` (más costosos)
