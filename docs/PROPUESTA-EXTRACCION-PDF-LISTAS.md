# 🎯 Propuesta: Extracción y Edición de Datos de PDFs en Listas

## 📋 Resumen

Implementar un sistema que permita:
1. **Seleccionar listas** en el listing
2. **Abrir panel lateral** con split view (PDF + Formularios)
3. **Extraer datos del PDF** usando IA
4. **Editar datos extraídos** en formularios
5. **Guardar datos** en `versiones_materiales`

---

## 🏗️ Arquitectura Propuesta

### 1. **Panel Lateral (Drawer/Sidebar)**

**Componente:** `ListaDetailDrawer.tsx`
- Se abre al hacer clic en una fila del listing
- Split view: 50% PDF viewer, 50% formularios
- Responsive: en móvil se convierte en tabs

### 2. **Estructura de Datos**

Basado en la imagen proporcionada, los campos son:

```typescript
interface MaterialItem {
  relacion_orden: string        // "1 Lenguaje", "2 Plan Lector", etc.
  asignatura: string            // "Lenguaje", "Matemática", etc.
  relacion_orden_num: number     // 1, 2, 3, etc.
  cantidad: string              // "1", "5 Varios", "7 Libro"
  categoria: string              // "Materiales", "Libro"
  imagen?: string               // URL o base64
  item: string                  // Nombre del item
  marca: string                 // "Santillana", "Varias", "N/A"
  isbn?: string                 // ISBN del libro
  notas?: string                // Notas adicionales
  boton?: string                // "Validar" u otros
}
```

### 3. **Flujo de Extracción con IA**

```
PDF → Extraer texto (pdf-parse) → Enviar a IA → Parsear JSON → Mostrar en formularios
```

**Opciones de IA:**
1. **Claude API (Anthropic)** - Recomendado ✅
   - Mejor para documentos complejos
   - Ya mencionado en documentación
   - Bueno con tablas y estructuras

2. **OpenAI GPT-4 Vision** - Alternativa
   - Puede analizar imágenes del PDF directamente
   - Bueno con tablas

3. **Google Gemini Vision** - Alternativa
   - Gratis hasta cierto límite
   - Bueno con documentos

**Recomendación:** Claude API (Anthropic) porque:
- Ya está en la documentación del proyecto
- Excelente para extraer datos estructurados
- Buen manejo de tablas y listas

---

## 📦 Componentes a Crear

### 1. `ListaDetailDrawer.tsx`
Panel lateral con split view

### 2. `PDFViewer.tsx`
Visualizador de PDF (usar `react-pdf`)

### 3. `MaterialesForm.tsx`
Formularios editables con los campos

### 4. `MaterialItemRow.tsx`
Fila individual de material (reutilizable)

---

## 🔌 APIs a Crear

### 1. `POST /api/crm/listas/[id]/extract-pdf`
Extrae datos del PDF usando IA

### 2. `PUT /api/crm/listas/[id]/materiales`
Guarda los materiales editados

---

## 🚀 Plan de Implementación

### Fase 1: UI y Estructura (Sin IA)
1. Crear `ListaDetailDrawer` con split view
2. Integrar PDF viewer
3. Crear formularios vacíos (hardcodeados)
4. Conectar con selección de filas

### Fase 2: Extracción con IA
1. Instalar dependencias (Claude SDK)
2. Crear API de extracción
3. Integrar extracción en el drawer
4. Mostrar datos extraídos en formularios

### Fase 3: Guardado y Persistencia
1. API para guardar materiales
2. Actualizar `versiones_materiales` en Strapi
3. Validaciones y manejo de errores

---

## 📝 Dependencias Necesarias

```bash
# Para visualizar PDFs
npm install react-pdf pdfjs-dist

# Para extraer texto del PDF
npm install pdf-parse

# Para IA (Claude)
npm install @anthropic-ai/sdk

# Para formularios (ya instalado)
# react-hook-form, yup
```

---

## 🎨 Diseño del Panel

```
┌─────────────────────────────────────────────────────────┐
│  [X] Lista: 2° Media A - Colegio XYZ                   │
├──────────────────────┬──────────────────────────────────┤
│                      │                                  │
│   PDF VIEWER         │   FORMULARIOS DE MATERIALES     │
│   (50% width)        │   (50% width)                    │
│                      │                                  │
│   [Zoom +] [Zoom -]  │   ┌──────────────────────────┐  │
│   [Página 1/5]       │   │ Material 1                │  │
│                      │   │ Asignatura: [Lenguaje ▼] │  │
│   📄 PDF Content    │   │ Item: [Diccionario...]    │  │
│                      │   │ Cantidad: [1]            │  │
│                      │   │ Categoría: [Materiales] │  │
│                      │   │ Marca: [Santillana]     │  │
│                      │   │ ISBN: [123456789]       │  │
│                      │   │ Notas: [Ver descuentos] │  │
│                      │   └──────────────────────────┘  │
│                      │                                  │
│                      │   ┌──────────────────────────┐  │
│                      │   │ Material 2                │  │
│                      │   │ ...                       │  │
│                      │   └──────────────────────────┘  │
│                      │                                  │
│                      │   [+ Agregar Material]          │
│                      │   [🔄 Extraer del PDF]         │
│                      │   [💾 Guardar Cambios]         │
├──────────────────────┴──────────────────────────────────┤
│  [Cancelar]                    [Guardar y Cerrar]      │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Detalles Técnicos

### Extracción con Claude API

```typescript
// Prompt para Claude
const prompt = `
Analiza este PDF de lista de útiles escolares y extrae todos los materiales en formato JSON.

Estructura esperada:
{
  "materiales": [
    {
      "asignatura": "Lenguaje",
      "item": "Diccionario 4",
      "cantidad": "1",
      "categoria": "Libro",
      "marca": "Santillana",
      "isbn": "123456789",
      "notas": "Ver descuentos en web"
    },
    ...
  ]
}

Texto del PDF:
${pdfText}
`
```

### Guardado en Strapi

Los materiales se guardarán en `versiones_materiales[0].materiales`:

```typescript
versiones_materiales: [
  {
    id: 1,
    pdf_id: 123,
    materiales: [
      { asignatura: "Lenguaje", item: "...", ... },
      ...
    ]
  }
]
```

---

## ✅ Checklist de Implementación

### Fase 1: UI
- [ ] Crear `ListaDetailDrawer.tsx`
- [ ] Integrar `react-pdf` para visualización
- [ ] Crear `MaterialesForm.tsx` con campos
- [ ] Conectar selección de filas con drawer
- [ ] Hacer responsive (tabs en móvil)

### Fase 2: Extracción IA
- [ ] Instalar `@anthropic-ai/sdk`
- [ ] Crear API `/api/crm/listas/[id]/extract-pdf`
- [ ] Integrar extracción en drawer
- [ ] Manejar errores de extracción
- [ ] Mostrar loading durante extracción

### Fase 3: Guardado
- [ ] Crear API `/api/crm/listas/[id]/materiales`
- [ ] Validar datos antes de guardar
- [ ] Actualizar `versiones_materiales` en Strapi
- [ ] Mostrar confirmación de guardado
- [ ] Recargar datos después de guardar

---

## 🎯 Próximos Pasos

1. **Aprobar esta propuesta**
2. **Implementar Fase 1** (UI sin IA)
3. **Probar con datos hardcodeados**
4. **Implementar Fase 2** (IA)
5. **Implementar Fase 3** (Guardado)

---

**¿Preguntas o cambios?** Comenta antes de implementar.



