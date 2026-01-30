# 🤖 Configuración de Claude AI para Procesamiento de PDFs

**Fecha:** 30 de enero de 2026  
**Modelo usado:** `claude-sonnet-4-20250514`  
**Proveedor:** Anthropic

---

## 📋 Descripción

Esta funcionalidad utiliza **Claude AI (Anthropic)** para procesar PDFs de listas de útiles escolares y extraer automáticamente los productos/materiales mencionados en el documento.

Claude fue elegido por:
- ✅ **Mayor precisión** en extracción de datos estructurados
- ✅ **Mejor comprensión** de contexto e instrucciones
- ✅ **Consistencia** en resultados
- ✅ **API muy estable** y confiable

---

## 🔑 Configuración de API Key

### 1. Obtener API Key de Anthropic

1. Ve a: https://console.anthropic.com/
2. Crea una cuenta o inicia sesión
3. Ve a **API Keys** en el menú
4. Genera una nueva API key
5. Copia la key (comienza con `sk-ant-`)

### 2. Configurar Variable de Entorno

**Para desarrollo local** (`.env.local`):

```env
ANTHROPIC_API_KEY=sk-ant-api03-tu-key-aqui
```

**Para Railway** (Production):

```bash
railway variables set ANTHROPIC_API_KEY=sk-ant-api03-tu-key-aqui
```

---

## 🚀 Uso

### En Página Individual de Validación

1. Navegar a: `/crm/listas/[id]/validacion`
2. El PDF se procesa **automáticamente** al cargar la página
3. Los productos aparecen en la tabla de la izquierda
4. Si falla, puedes hacer clic en **"Procesar con IA"** manualmente

### En Procesamiento Masivo

1. Navegar a: `/crm/listas/colegio/[colegioId]`
2. Seleccionar múltiples cursos con checkboxes
3. Hacer clic en **"⚡ Procesar con IA"**
4. Claude procesa cada PDF secuencialmente
5. Ver progreso en tiempo real en el modal

---

## 🔧 Modelo de Claude Utilizado

### Modelo Principal

```
claude-sonnet-4-20250514
```

**Características:**
- 🚀 **Velocidad:** Muy rápido (2-5 segundos por PDF)
- 🎯 **Precisión:** Excelente para extracción estructurada
- 💰 **Costo:** ~$3 por millón de tokens input, ~$15 por millón de tokens output
- 📄 **Contexto:** 200K tokens (PDFs grandes sin problema)

### Modelos Alternativos (Fallback)

Si necesitas cambiar el modelo, edita en el código:

```typescript
// src/app/api/crm/listas/[id]/procesar-pdf/route.ts

const message = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514', // ← Cambiar aquí
  max_tokens: 8000,
  messages: [...]
})
```

**Opciones disponibles:**
- `claude-sonnet-4-20250514` - Recomendado (balance precio/calidad)
- `claude-3-5-sonnet-20241022` - Alternativa anterior
- `claude-opus-4-20250514` - Máxima precisión (más caro)
- `claude-haiku-3-20240307` - Más económico (menos preciso)

---

## 📊 Formato de Datos Extraídos

Los productos extraídos incluyen:

```json
{
  "productos": [
    {
      "nombre": "Cuaderno Universitario Torre 100 hojas",
      "cantidad": 2,
      "marca": "Torre",
      "isbn": null,
      "asignatura": "Lenguaje",
      "especificaciones": "100 hojas, cuadriculado"
    },
    {
      "nombre": "Don Quijote de la Mancha",
      "cantidad": 1,
      "marca": "Editorial Zig-Zag",
      "isbn": "978-956-12-2345-6",
      "asignatura": "Lenguaje y Comunicación",
      "especificaciones": "Edición completa"
    }
  ]
}
```

---

## 🔄 Flujo de Procesamiento

```
1. Usuario abre página de validación
   ↓
2. Sistema descarga PDF desde Strapi
   ↓
3. Extrae texto del PDF (pdf-parse)
   ↓
4. Envía texto a Claude AI
   ↓
5. Claude analiza y extrae productos
   ↓
6. Sistema busca cada producto en WooCommerce
   ↓
7. Guarda resultados en Strapi
   ↓
8. Muestra productos en la interfaz
```

---

## 💰 Costos Estimados

### Por PDF (Promedio)

- **Tamaño típico:** 2-5 páginas
- **Tokens input:** ~3,000-5,000 tokens
- **Tokens output:** ~500-1,000 tokens
- **Costo por PDF:** $0.02 - $0.05 USD

### Procesamiento Masivo

| Cantidad PDFs | Costo Estimado |
|---------------|----------------|
| 10 PDFs | $0.30 USD |
| 50 PDFs | $1.50 USD |
| 100 PDFs | $3.00 USD |
| 500 PDFs | $15.00 USD |

**Nota:** Costos basados en `claude-sonnet-4` (modelo actual).

---

## 🎯 Prompt Usado

El prompt enviado a Claude es:

```
Eres un asistente experto en analizar listas de útiles escolares de Chile.

Tu tarea es:
1. Identificar TODOS los productos/materiales escolares mencionados
2. Extraer la información de cada producto de forma estructurada
3. Ser preciso con cantidades, marcas y especificaciones
4. Si un producto tiene marca/editorial específica, incluirla
5. Normalizar nombres

IMPORTANTE:
- Extrae SOLO productos escolares
- NO incluyas instrucciones o texto informativo
- Si aparece "Editorial" o "Marca", inclúyela
- La cantidad debe ser un número

Formato de respuesta: JSON con array de productos
```

---

## 🔍 Búsqueda en WooCommerce

Después de extraer productos con Claude, el sistema:

1. **Busca cada producto** en WooCommerce (plataforma `woo_escolar`)
2. **Compara nombres** para encontrar coincidencias
3. **Obtiene precio y stock** si encuentra el producto
4. **Marca disponibilidad**:
   - `disponible` - Encontrado en WooCommerce
   - `no_encontrado` - No está en el catálogo

---

## ⚠️ Limitaciones

### Limitación 1: PDFs Escaneados

Claude no procesa PDFs directamente. Si el PDF es una imagen escaneada sin texto:

```
Error: "No se pudo extraer texto del PDF"
```

**Solución:** Usar OCR previo o pedir PDF con texto seleccionable.

### Limitación 2: Límite de Tokens

Claude Sonnet 4 tiene límite de 200K tokens input.

**Un PDF típico:** 3,000-5,000 tokens  
**Máximo teórico:** ~50-60 páginas

**Solución:** Dividir PDFs muy largos en secciones.

### Limitación 3: Rate Limiting

Anthropic tiene límites de requests por minuto según tu plan.

**Plan Free:** 50 requests/min  
**Plan Pro:** 1,000 requests/min

**Solución:** Procesamiento secuencial (ya implementado).

---

## 🐛 Troubleshooting

### Error: "ANTHROPIC_API_KEY no está configurada"

**Causa:** Variable de entorno no definida.

**Solución:**
1. Verifica en Railway: `railway variables`
2. O en local: revisa `.env.local`
3. Asegúrate que la key comience con `sk-ant-`

### Error: "authentication_error"

**Causa:** API key inválida o expirada.

**Solución:**
1. Ve a https://console.anthropic.com/
2. Verifica que la key sea válida
3. Genera una nueva si es necesario
4. Actualiza `ANTHROPIC_API_KEY`

### Error: "No se pudo extraer texto del PDF"

**Causa:** PDF escaneado o corrupto.

**Solución:**
1. Verifica que el PDF sea seleccionable (no imagen)
2. Intenta abrir el PDF manualmente
3. Regenera el PDF si es posible

### Error: "rate_limit_error"

**Causa:** Demasiados requests en poco tiempo.

**Solución:**
1. Espera 1 minuto e intenta de nuevo
2. El procesamiento masivo ya maneja esto automáticamente
3. Considera upgrade a plan Pro si procesas muchos PDFs

---

## 📈 Comparación: Claude vs Gemini

| Característica | Claude (Actual) | Gemini (Anterior) |
|----------------|-----------------|-------------------|
| **Precisión** | ⭐⭐⭐⭐⭐ Excelente | ⭐⭐⭐⭐ Muy buena |
| **Velocidad** | ⭐⭐⭐⭐⭐ Muy rápido | ⭐⭐⭐⭐⭐ Muy rápido |
| **Consistencia** | ⭐⭐⭐⭐⭐ Muy consistente | ⭐⭐⭐ Inconsistente |
| **Costo** | ⭐⭐⭐ $0.02-0.05/PDF | ⭐⭐⭐⭐⭐ Gratis |
| **API Estable** | ⭐⭐⭐⭐⭐ Muy estable | ⭐⭐⭐ Algunos 404s |
| **PDF Nativo** | ❌ No (extrae texto) | ✅ Sí (beta) |

**Conclusión:** Claude es mejor si pagas por precisión y estabilidad. Gemini es mejor si el costo es crítico.

---

## 📝 Logs y Debugging

Para ver logs detallados en desarrollo:

```typescript
// Los logs aparecen automáticamente en consola
console.log('[Procesar PDF] 🚀 Iniciando...')
console.log('[Procesar PDF] 📄 Texto extraído: X caracteres')
console.log('[Procesar PDF] 🤖 Procesando con Claude...')
console.log('[Procesar PDF] ✅ Productos extraídos: X')
```

En producción, los logs están en Railway:

```bash
railway logs
```

---

## 🔄 Actualizar Modelo

Para cambiar a un modelo más nuevo de Claude:

1. **Verifica modelos disponibles:** https://docs.anthropic.com/en/docs/models-overview
2. **Edita el código:**

```typescript
// src/app/api/crm/listas/[id]/procesar-pdf/route.ts
const message = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514', // ← Cambiar aquí
  ...
})
```

3. **Reinicia el servidor**
4. **Prueba con un PDF de prueba**

---

## 📚 Documentación Oficial

- **Anthropic Docs:** https://docs.anthropic.com/
- **Modelos disponibles:** https://docs.anthropic.com/en/docs/models-overview
- **API Reference:** https://docs.anthropic.com/en/api/messages
- **Pricing:** https://www.anthropic.com/pricing

---

## ✅ Checklist de Integración

- [x] Instalar `@anthropic-ai/sdk`
- [x] Instalar `pdf-parse`
- [x] Configurar `ANTHROPIC_API_KEY`
- [x] Reescribir `/api/crm/listas/[id]/procesar-pdf`
- [x] Probar procesamiento individual
- [x] Probar procesamiento masivo
- [x] Verificar guardado en Strapi
- [x] Verificar búsqueda en WooCommerce
- [x] Documentar en `CLAUDE-AI-CONFIG.md`

---

**Documentación creada por:** IA Assistant  
**Última actualización:** 30 de enero de 2026  
**Versión del sistema:** 2.0.0 (Claude AI)
