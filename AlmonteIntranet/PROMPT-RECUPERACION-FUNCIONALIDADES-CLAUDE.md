# PROMPT COMPLETO: Recuperación de Funcionalidades con Claude y Vista de Listas

## CONTEXTO
Necesito implementar un sistema completo de revisión y publicación de listas de útiles escolares con integración de Claude AI para comparación de productos. El sistema debe tener dos vistas principales y una vista de validación avanzada.

---

## PARTE 1: VISTA PRINCIPAL DE LISTAS (ListasListing.tsx)

### 1.1 Estructura de Vistas
- **Vista 1 - Lista de Colegios**: Mostrar todos los colegios con conteo de listas por año (2024, 2025, 2026, 2027)
- **Vista 2 - Cursos del Colegio**: Al hacer click en un colegio, mostrar todos sus cursos agrupados por año con sus respectivas listas

### 1.2 Componente ListasListing.tsx - Requisitos

#### Vista de Colegios:
- Tabla con columnas:
  - **COLEGIO**: Nombre del colegio + RBD
  - **LISTAS POR AÑO**: Badge con total de listas, clickeable para ver desglose por año (2024, 2025, 2026, 2027)
  - **DIRECCIÓN**: Dirección completa + comuna
  - **REGIÓN**: Región del colegio
  - **REPRESENTANTE**: Nombre del representante comercial
  - **ÚLTIMA ACTUALIZACIÓN**: Fecha del PDF más reciente del colegio
  - **ACCIONES**: Botones para ver detalle, exportar, etc.

#### Funcionalidades:
- Búsqueda/filtro por nombre de colegio
- Ordenamiento por columnas
- Paginación con TablePagination
- Al hacer click en un colegio → mostrar vista de cursos
- Botón "Volver" para regresar a vista de colegios
- Botón "Importación Completa" para subir plantillas Excel

#### Vista de Cursos (cuando se selecciona un colegio):
- Agrupar cursos por año en paneles separados:
  - Panel "Listas 2024" (badge amarillo/warning)
  - Panel "Listas 2025" (badge naranja)
  - Panel "Listas 2026" (badge azul/primary)
  - Panel "Listas 2027" (badge verde/success)
- Cada panel muestra tabla con:
  - **Curso**: Nombre del curso, nivel y año
  - **PDFs**: Badge con cantidad de PDFs disponibles
  - **Acciones**: 
    - Botón "Ver detalle" (LuEye) → navega a `/crm/listas/[id]/validacion`
    - Botón "Gestionar listas" (LuFileText) → abre modal de gestión de versiones

#### API Endpoint: `/api/crm/listas/por-colegio`
- Debe ser optimizado para no causar carga infinita
- Retornar estructura:
```json
{
  "success": true,
  "data": [
    {
      "id": "123",
      "nombre": "Colegio Ejemplo",
      "rbd": "12345",
      "direccion": "Calle 123",
      "comuna": "Santiago",
      "region": "Metropolitana",
      "representante": "Juan Pérez",
      "listas2024": 5,
      "listas2025": 8,
      "listas2026": 12,
      "listas2027": 10,
      "totalListas": 35,
      "ultimaActualizacion": "2026-01-30T10:00:00Z",
      "cursos": [
        {
          "id": "curso123",
          "nombre": "1º Básico",
          "nivel": "Basica",
          "grado": 1,
          "año": 2026,
          "cantidadPDFs": 2,
          "pdf_id": "pdf123",
          "pdf_url": "/api/files/..."
        }
      ]
    }
  ]
}
```

---

## PARTE 2: VISTA DE VALIDACIÓN (ValidacionLista.tsx)

### 2.1 Estructura Principal
- **PDF Viewer**: Visualización del PDF de la lista con zoom y navegación
- **Tabla de Productos**: Lista de productos identificados con acciones
- **Sistema de Tabs**: 
  - Tab "Productos Identificados": Vista principal de productos
  - Tab "Revisión Claude": Comparación lado a lado (Claude vs Actual)

### 2.2 Funcionalidades con Claude AI

#### 2.2.1 Comparación de Productos
- **Componente ComparacionProductos.tsx**:
  - Vista lado a lado:
    - **Columna Izquierda**: Productos reconocidos por Claude
    - **Columna Derecha**: Productos actuales en la lista
  - Estadísticas:
    - Total productos reconocidos por Claude
    - Total productos actuales
    - Coincidencias
    - Productos nuevos de Claude
    - Productos faltantes
  - Tabla comparativa con:
    - Nombre del producto
    - Estado (Coincide, Nuevo, Faltante)
    - Cantidad
    - Precio
    - Disponibilidad en WooCommerce
    - Acciones (Aprobar, Corregir, Añadir)

#### 2.2.2 Resaltado de Productos en PDF
- Al hacer click en un producto de la tabla:
  - Navegar automáticamente a la página del PDF donde está el producto
  - Resaltar el producto con:
    - Rectángulo amarillo con borde
    - Animación de pulso
    - Label con nombre del producto
  - Si el producto no tiene coordenadas:
    - Mostrar mensaje informativo
    - Opción de buscar en PDF con IA (Claude)

#### 2.2.3 Estados de Revisión
- Campo `estado_revision` en Strapi con valores:
  - `borrador`: Lista en proceso
  - `revisado`: Lista revisada pero no publicada
  - `publicado`: Lista publicada y disponible

#### 2.2.4 Botón de Publicación
- Botón "Publicar Lista" visible cuando:
  - Estado es `revisado` o `borrador`
  - Todos los productos están validados (opcional)
- Al publicar:
  - Cambiar estado a `publicado`
  - Preparar datos para `listar.escolar.cl`
  - Mostrar confirmación

### 2.3 API Endpoints Necesarios

#### `/api/crm/listas/[id]/comparacion` (GET)
```typescript
// Retorna comparación de productos Claude vs Actual
{
  "success": true,
  "data": {
    "productosClaude": [...],
    "productosActuales": [...],
    "estadisticas": {
      "totalClaude": 15,
      "totalActual": 12,
      "coincidencias": 10,
      "nuevos": 5,
      "faltantes": 2
    }
  }
}
```

#### `/api/crm/listas/[id]/publicar` (POST)
```typescript
// Publica la lista cambiando estado a "publicado"
{
  "success": true,
  "message": "Lista publicada exitosamente",
  "data": {
    "estado": "publicado",
    "fecha_publicacion": "2026-01-30T10:00:00Z"
  }
}
```

#### `/api/crm/listas/[id]/aprobar-producto` (POST)
```typescript
// Aprobar, corregir o eliminar un producto
Body: {
  "productoId": "123",
  "accion": "aprobar" | "corregir" | "eliminar",
  "datos": {...} // Si es corregir
}
```

#### `/api/crm/listas/[id]/buscar-producto-pdf` (POST) - OPCIONAL
```typescript
// Buscar producto en PDF usando Claude si no tiene coordenadas
Body: {
  "nombreProducto": "Cuaderno College",
  "pdfUrl": "..."
}
```

### 2.4 Componente ValidacionLista.tsx - Estructura

```typescript
// Estados principales
const [vistaActiva, setVistaActiva] = useState<'productos' | 'revision'>('productos')
const [estadoRevision, setEstadoRevision] = useState<'borrador' | 'revisado' | 'publicado'>('borrador')
const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
const [selectedProductData, setSelectedProductData] = useState<any>(null)
const [publicando, setPublicando] = useState(false)

// Funciones principales
const handleProductoClick = (producto: any) => {
  // Navegar a página del PDF
  // Resaltar producto
  // Actualizar estados
}

const handlePublicar = async () => {
  // Llamar a API de publicación
  // Actualizar estado
  // Mostrar confirmación
}

const cargarProductos = async () => {
  // Cargar productos desde API
  // Manejar versiones de materiales
}
```

### 2.5 Integración con Claude
- Usar variable de entorno `ANTHROPIC_API_KEY`
- Llamadas a Claude para:
  - Comparación de productos
  - Búsqueda de productos en PDF (si no tienen coordenadas)
  - Validación de productos

---

## PARTE 3: ENDPOINT PÚBLICO PARA PRECARGA

### `/api/public/listas/colegio/[colegioId]/curso/[cursoId]` (GET)
- Endpoint público (sin autenticación)
- CORS habilitado
- Retorna solo listas con estado `publicado`
- Usado por `listar.escolar.cl` para precargar listas

```typescript
{
  "success": true,
  "data": {
    "colegio": {...},
    "curso": {...},
    "productos": [...],
    "pdf_url": "..."
  }
}
```

---

## PARTE 4: OPTIMIZACIONES Y MEJORAS

### 4.1 Optimización de Carga
- El endpoint `/api/crm/listas/por-colegio` debe:
  - Usar paginación si hay muchos cursos
  - Cachear resultados cuando sea posible
  - No causar carga infinita
  - Retornar datos estructurados eficientemente

### 4.2 Manejo de Errores
- Mensajes claros cuando no se encuentra una lista
- Retry automático en caso de errores de red
- Loading states apropiados

### 4.3 UX/UI
- Spinners durante carga
- Mensajes informativos
- Animaciones suaves
- Feedback visual al hacer acciones

---

## PARTE 5: ARCHIVOS A CREAR/MODIFICAR

### Archivos Nuevos:
1. `src/app/(admin)/(apps)/crm/listas/[id]/validacion/components/ComparacionProductos.tsx`
2. `src/app/api/crm/listas/[id]/comparacion/route.ts`
3. `src/app/api/crm/listas/[id]/publicar/route.ts`
4. `src/app/api/public/listas/colegio/[colegioId]/curso/[cursoId]/route.ts`

### Archivos a Modificar:
1. `src/app/(admin)/(apps)/crm/listas/components/ListasListing.tsx`
   - Implementar vista de colegios
   - Implementar vista de cursos
   - Optimizar carga de datos

2. `src/app/(admin)/(apps)/crm/listas/[id]/validacion/components/ValidacionLista.tsx`
   - Agregar sistema de tabs
   - Integrar ComparacionProductos
   - Agregar botón de publicación
   - Implementar resaltado de productos en PDF
   - Manejar estados de revisión

3. `src/app/api/crm/listas/[id]/aprobar-producto/route.ts`
   - Mejorar búsqueda de productos
   - Manejar acciones: aprobar, corregir, eliminar

4. `src/app/api/crm/listas/por-colegio/route.ts`
   - Optimizar para evitar carga infinita
   - Mejorar estructura de datos retornada

---

## PARTE 6: VARIABLES DE ENTORNO

```env
ANTHROPIC_API_KEY=sk-ant-... # API key de Claude
GEMINI_API_KEY=... # Si se usa Gemini también
```

---

## PARTE 7: ESQUEMA DE DATOS EN STRAPI

### Campo `estado_revision` en Content Type `curso`:
- Tipo: Enumeration
- Valores: `borrador`, `revisado`, `publicado`
- Default: `borrador`

### Estructura de `versiones_materiales` (JSON):
```json
[
  {
    "version": 1,
    "fecha_subida": "2026-01-30",
    "pdf_id": "123",
    "pdf_url": "...",
    "materiales": [
      {
        "id": "prod1",
        "nombre": "Cuaderno College",
        "coordenadas": {
          "pagina": 1,
          "posicion_x": 100,
          "posicion_y": 200
        },
        "validado": true,
        "precio": 1500
      }
    ]
  }
]
```

---

## INSTRUCCIONES DE IMPLEMENTACIÓN

1. **Empezar con la vista de listas**:
   - Optimizar endpoint `/api/crm/listas/por-colegio`
   - Implementar vista de colegios en ListasListing
   - Implementar vista de cursos al seleccionar colegio

2. **Luego la vista de validación**:
   - Crear componente ComparacionProductos
   - Crear endpoints de comparación y publicación
   - Integrar en ValidacionLista con sistema de tabs
   - Implementar resaltado de productos en PDF

3. **Finalmente endpoint público**:
   - Crear endpoint público para precarga
   - Habilitar CORS
   - Filtrar solo listas publicadas

4. **Testing**:
   - Probar carga de listas (no debe ser infinita)
   - Probar comparación con Claude
   - Probar publicación
   - Probar resaltado en PDF
   - Probar endpoint público

---

## NOTAS IMPORTANTES

- **NO incluir la API key de Claude en el código**, solo usar variables de entorno
- **Manejar errores gracefully** - no romper la UI si Claude falla
- **Optimizar consultas a Strapi** - evitar N+1 queries
- **Usar TypeScript** para type safety
- **Mantener código limpio y comentado**

---

## RESULTADO ESPERADO

Al finalizar, deberías tener:
1. ✅ Vista de colegios funcionando sin carga infinita
2. ✅ Vista de cursos al seleccionar colegio
3. ✅ Vista de validación con comparación Claude
4. ✅ Sistema de publicación de listas
5. ✅ Resaltado de productos en PDF
6. ✅ Endpoint público para precarga
7. ✅ Todo funcionando de manera fluida y optimizada
