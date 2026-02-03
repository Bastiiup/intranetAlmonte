# ✅ Checklist de Revisión - Refactorización ValidacionLista

## 📋 Archivos Creados (Verificar que existen)

### Tipos
- [ ] `src/app/(admin)/(apps)/crm/listas/[id]/validacion/types.ts`
  - Debe tener: `CoordenadasProducto`, `ProductoIdentificado`, `ListaData`

### Hooks
- [ ] `src/app/(admin)/(apps)/crm/listas/[id]/validacion/hooks/useProductos.ts`
  - Debe exportar: `useProductos` hook
  - Debe manejar: carga de productos, filtrado por versión

- [ ] `src/app/(admin)/(apps)/crm/listas/[id]/validacion/hooks/usePDFViewer.ts`
  - Debe exportar: `usePDFViewer` hook
  - Debe tener: navegación, zoom, dimensiones

- [ ] `src/app/(admin)/(apps)/crm/listas/[id]/validacion/hooks/useProductosCRUD.ts`
  - Debe exportar: `useProductosCRUD` hook
  - Debe tener: aprobar, eliminar, aprobar lista completa

### Componentes de Tabla
- [ ] `src/app/(admin)/(apps)/crm/listas/[id]/validacion/components/ProductosTable/ProductosTable.tsx`
  - Componente principal de la tabla

- [ ] `src/app/(admin)/(apps)/crm/listas/[id]/validacion/components/ProductosTable/ProductoRow.tsx`
  - Fila individual de producto

- [ ] `src/app/(admin)/(apps)/crm/listas/[id]/validacion/components/ProductosTable/ProductosFiltros.tsx`
  - Filtros y búsqueda

- [ ] `src/app/(admin)/(apps)/crm/listas/[id]/validacion/components/ProductosTable/ProductosResumen.tsx`
  - Resumen y botones de acción

### Componentes de PDF
- [ ] `src/app/(admin)/(apps)/crm/listas/[id]/validacion/components/PDFViewer/PDFHighlight.tsx`
  - Resaltado amarillo en PDF

- [ ] `src/app/(admin)/(apps)/crm/listas/[id]/validacion/components/PDFViewer/PDFControls.tsx`
  - Controles de navegación y zoom

- [ ] `src/app/(admin)/(apps)/crm/listas/[id]/validacion/components/PDFViewer/VersionSelector.tsx`
  - Selector de versiones

## 🔍 Verificaciones de Código

### 1. Verificar Imports
Abre cada archivo y verifica que:
- [ ] Los imports de tipos usan `../../types` o `../types` según la ubicación
- [ ] Los imports de componentes usan rutas relativas correctas
- [ ] No hay imports circulares

### 2. Verificar Tipos TypeScript
- [ ] `types.ts` define correctamente todas las interfaces
- [ ] Los hooks usan los tipos correctos
- [ ] Los componentes reciben props tipadas

### 3. Verificar Funcionalidad
Abre cada hook/componente y verifica:

#### `useProductos.ts`
- [ ] Tiene función `cargarProductos`
- [ ] Maneja estados: `productos`, `loading`, `error`
- [ ] Normaliza coordenadas correctamente

#### `usePDFViewer.ts`
- [ ] Tiene funciones: `nextPage`, `prevPage`, `onZoomIn`, `onZoomOut`, `onZoomReset`
- [ ] Tiene función `navegarAPagina` y `navegarAProducto`

#### `useProductosCRUD.ts`
- [ ] Tiene función `aprobarProducto`
- [ ] Tiene función `eliminarProducto`
- [ ] Tiene función `aprobarListaCompleta`

#### `ProductosTable.tsx`
- [ ] Usa `useMemo` para filtros
- [ ] Renderiza `ProductosFiltros`, `ProductoRow`, `ProductosResumen`
- [ ] Maneja estados vacíos y loading

#### `ProductoRow.tsx`
- [ ] Muestra todos los campos del producto
- [ ] Tiene handlers para click, editar, eliminar
- [ ] Muestra imagen si existe

#### `PDFHighlight.tsx`
- [ ] Verifica coordenadas antes de renderizar
- [ ] Muestra badge verde si son coordenadas reales
- [ ] Muestra badge amarillo si son aproximadas

## 🧪 Pruebas Rápidas (Sin Ejecutar)

### Verificar que no hay errores de sintaxis:
```bash
# En la terminal, ejecuta:
npm run build
# O si usas TypeScript directamente:
npx tsc --noEmit
```

### Verificar estructura de carpetas:
```
src/app/(admin)/(apps)/crm/listas/[id]/validacion/
├── types.ts ✅
├── hooks/
│   ├── useProductos.ts ✅
│   ├── usePDFViewer.ts ✅
│   └── useProductosCRUD.ts ✅
└── components/
    ├── ProductosTable/
    │   ├── ProductosTable.tsx ✅
    │   ├── ProductoRow.tsx ✅
    │   ├── ProductosFiltros.tsx ✅
    │   └── ProductosResumen.tsx ✅
    └── PDFViewer/
        ├── PDFHighlight.tsx ✅
        ├── PDFControls.tsx ✅
        └── VersionSelector.tsx ✅
```

## ⚠️ Problemas Comunes a Revisar

1. **Imports incorrectos:**
   - Verifica que las rutas relativas sean correctas
   - `../types` desde hooks
   - `../../types` desde componentes

2. **Tipos faltantes:**
   - Si ves errores de TypeScript, verifica que `types.ts` exporte todo lo necesario

3. **Props no definidas:**
   - Verifica que todos los componentes reciban las props que necesitan

4. **Funciones no exportadas:**
   - Verifica que todos los hooks y componentes usen `export default` o `export function`

## 📝 Notas

- Los modales (Edit, Add, Excel, Logs) aún NO están creados
- El componente `PDFViewer` principal aún NO está creado
- El archivo `ValidacionLista.tsx` original aún NO está refactorizado

**Siguiente paso:** Una vez verificado todo lo anterior, continuar con:
1. Crear `PDFViewer.tsx` principal
2. Crear modales
3. Refactorizar `ValidacionLista.tsx` para usar todos los nuevos componentes
