# 📋 Instrucciones: Extracción de PDFs con IA

## ✅ Componentes Implementados

1. **ListaDetailDrawer.tsx** - Panel lateral con split view (PDF + Formularios)
2. **PDFViewer.tsx** - Visualizador de PDFs con controles
3. **MaterialesForm.tsx** - Formularios editables de materiales
4. **MaterialItemRow.tsx** - Fila individual de material
5. **API extract-pdf** - Extracción de datos con Claude API
6. **API materiales** - Guardado de materiales editados

---

## 📦 Dependencias a Instalar

```bash
cd AlmonteIntranet

# Para extraer texto del PDF
npm install pdf-parse

# Para IA (Google Gemini) - GRATIS
npm install @google/generative-ai

# react-pdf ya está instalado ✅
```

---

## 🔐 Variables de Entorno

Agregar a `.env.local`:

```env
# Google Gemini API (GRATIS)
GEMINI_API_KEY=AIzaSy-...

# Opcional: Para debugging
DEBUG_CRM=true
```

**Obtener API Key (GRATIS):**
1. Ir a https://aistudio.google.com/
2. Iniciar sesión con cuenta de Google
3. Ir a "Get API key" o https://aistudio.google.com/app/apikey
4. Crear nueva key
5. Copiar y pegar en `.env.local`

**📖 Guía detallada:** Ver `COMO-OBTENER-API-KEY-GEMINI.md`

---

## 🚀 Cómo Usar

### 1. Seleccionar una Lista
- En `/crm/listas`, hacer clic en el **nombre** de cualquier lista
- Se abrirá el panel lateral con el PDF y formularios

### 2. Extraer Datos del PDF
- Hacer clic en **"Extraer del PDF"** o **"Extraer Datos"**
- El sistema:
  1. Descarga el PDF
  2. Extrae el texto
  3. Envía a Claude API
  4. Parsea la respuesta JSON
  5. Muestra los materiales en los formularios

### 3. Editar Materiales
- Los materiales aparecen como tarjetas expandibles
- Hacer clic en una tarjeta para expandir y editar
- Campos editables:
  - Asignatura
  - Item
  - Cantidad
  - Categoría
  - Marca
  - ISBN
  - Notas
  - Imagen
  - Relación de Orden
  - Botón

### 4. Guardar Cambios
- Hacer clic en **"Guardar Cambios"**
- Los materiales se guardan en `versiones_materiales[0].materiales`
- Se actualiza la fecha de actualización

---

## 🎨 Características

### Desktop
- **Split view**: 50% PDF, 50% Formularios
- Navegación entre páginas del PDF
- Zoom in/out
- Controles de PDF completos

### Móvil
- **Tabs**: Alternar entre PDF y Formularios
- Misma funcionalidad, adaptada a pantallas pequeñas

### Formularios
- Agregar materiales
- Editar materiales existentes
- Eliminar materiales
- Reordenar (mover arriba/abajo)
- Validación de campos requeridos

---

## 🔧 Estructura de Datos

Los materiales se guardan en este formato:

```typescript
interface MaterialItem {
  relacion_orden?: string        // "1 Lenguaje"
  asignatura: string            // "Lenguaje"
  relacion_orden_num?: number   // 1
  cantidad: string              // "1", "5 Varios"
  categoria: string             // "Materiales", "Libro"
  imagen?: string               // URL
  item: string                  // "Diccionario 4"
  marca: string                 // "Santillana", "N/A"
  isbn?: string                 // "123456789"
  notas?: string                // "Ver descuentos en web"
  boton?: string                // "Validar"
}
```

---

## ⚠️ Troubleshooting

### Error: "GEMINI_API_KEY no está configurada"
- Verificar que la variable esté en `.env.local`
- Reiniciar el servidor de desarrollo
- Verificar que no haya espacios en la key
- Verificar formato: `GEMINI_API_KEY=AIzaSy-...`

### Error: "Error al extraer texto del PDF"
- Verificar que el PDF no esté protegido
- Verificar que el PDF tenga texto (no solo imágenes)
- Revisar logs del servidor

### Error: "Error al parsear respuesta de IA"
- La IA puede devolver JSON mal formateado
- Revisar logs para ver la respuesta raw
- Intentar extraer nuevamente

### El PDF no se muestra
- Verificar que `react-pdf` esté instalado
- Verificar que el worker de PDF.js esté configurado
- Revisar consola del navegador

---

## 📝 Notas Importantes

1. **Costo de Google Gemini:**
   - ✅ **GRATIS** para uso general
   - Límite: 15 solicitudes por minuto
   - Límite diario: 1,500 solicitudes por día
   - Sin tarjeta de crédito requerida inicialmente

2. **Límites:**
   - Claude tiene límite de tokens por request
   - PDFs muy grandes pueden necesitar chunking
   - Máximo recomendado: ~50 páginas

3. **Alternativas (si necesitas más límites):**
   - Claude API (Anthropic) - Pago, pero muy bueno
   - OpenAI GPT-4 Vision - Pago, puede analizar imágenes
   - Para desarrollo y pruebas, Gemini es perfecto (gratis)

---

## 🎯 Próximos Pasos (Opcional)

1. **Mejorar Extracción:**
   - Agregar soporte para PDFs con imágenes (OCR)
   - Mejorar prompt para diferentes formatos de listas
   - Agregar validación de datos extraídos

2. **UX:**
   - Agregar preview antes de guardar
   - Agregar confirmación de cambios
   - Agregar historial de versiones

3. **Performance:**
   - Cachear extracciones
   - Agregar loading states mejorados
   - Optimizar renderizado de formularios

---

**¿Preguntas?** Revisar los logs del servidor o la consola del navegador para más detalles.

