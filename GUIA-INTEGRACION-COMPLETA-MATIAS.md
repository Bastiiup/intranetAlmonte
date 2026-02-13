# 📋 Guía Completa de Integración - Rama `intranet-matias`

**Fecha:** Febrero 2026  
**Rama:** `intranet-matias`  
**Último commit:** `2456f64d`

---

## 🎯 Resumen Ejecutivo

Esta rama contiene mejoras significativas en el módulo de gestión de listas de útiles, incluyendo:
- Mejoras en la UI/UX con tooltips informativos
- Navegación mejorada entre páginas
- Gestión mejorada de versiones de PDFs
- Normalización de nombres de cursos
- Persistencia mejorada de cambios
- Visualización mejorada durante procesamiento masivo

---

## 📦 Archivos Modificados

### 1. Componentes de UI

#### `AlmonteIntranet/src/app/(admin)/(apps)/crm/listas/components/ListasListing.tsx`
- ✅ Agregados tooltips informativos en botones de importación
- ✅ Mejorada navegación con información contextual

#### `AlmonteIntranet/src/app/(admin)/(apps)/crm/listas/components/ImportacionCompletaModal.tsx`
- ✅ Mejorada visualización de colegio y RBD durante procesamiento
- ✅ Alert más visible con iconos y mejor formato

### 2. Componentes de Validación

#### `AlmonteIntranet/src/app/(admin)/(apps)/crm/listas/[id]/validacion/components/ValidacionLista.tsx`
- ✅ Agregados botones de navegación (volver a listas del curso y a colegios)
- ✅ Filtrado de versiones ocultas (solo muestra versiones activas)
- ✅ Mejorada lógica de selección de versión actual

#### `AlmonteIntranet/src/app/(admin)/(apps)/crm/listas/[id]/validacion/components/PDFViewer/PDFViewer.tsx`
- ✅ Pasado `versionActual` al VersionSelector para mejor sincronización

#### `AlmonteIntranet/src/app/(admin)/(apps)/crm/listas/[id]/validacion/components/PDFViewer/VersionSelector.tsx`
- ✅ Mejorado cálculo de índice basado en `versionActual`
- ✅ Sincronización correcta entre versiones activas y selección

#### `AlmonteIntranet/src/app/(admin)/(apps)/crm/listas/[id]/validacion/hooks/useProductos.ts`
- ✅ Filtrado de versiones activas al obtener productos
- ✅ Lógica mejorada para seleccionar versión activa más reciente

### 3. Componentes de Gestión de Cursos

#### `AlmonteIntranet/src/app/(admin)/(apps)/crm/listas/colegio/[colegioId]/components/CursosColegioListing.tsx`
- ✅ Eliminación de años en nombres de cursos (normalización)
- ✅ Botón "Volver a Listas" mejorado

#### `AlmonteIntranet/src/app/(admin)/(apps)/crm/listas/colegio/[colegioId]/components/GestionVersionesModal.tsx`
- ✅ Agregada funcionalidad de eliminar PDFs permanentemente
- ✅ Mejorado ordenamiento: nuevos PDFs quedan como primera versión
- ✅ Mejorada persistencia de cambios (múltiples recargas y cache busting)
- ✅ Mejorada función `cargarCurso` con cache busting

### 4. APIs

#### `AlmonteIntranet/src/app/api/crm/cursos/[id]/route.ts`
- ✅ Agregada revalidación de rutas después de actualizar curso
- ✅ Mejorada persistencia de cambios en Strapi

---

## 🚀 Funcionalidades Agregadas

### 1. Tooltips Informativos

**Ubicación:** Página principal de listas (`/crm/listas`)

**Cambios:**
- Botón "Importación Completa (Plantilla)" ahora muestra tooltip con información detallada
- Botón "Carga Masiva PDFs por Colegio" ahora muestra tooltip con información detallada

**Archivo modificado:**
- `ListasListing.tsx`

**Código agregado:**
```typescript
import { OverlayTrigger, Tooltip } from 'react-bootstrap'

<OverlayTrigger
  placement="top"
  overlay={
    <Tooltip>
      <div className="text-start">
        <strong>Importación Completa (Plantilla)</strong>
        <br />
        Permite cargar masivamente colegios, cursos, asignaturas y productos/libros...
      </div>
    </Tooltip>
  }
>
  <Button>...</Button>
</OverlayTrigger>
```

---

### 2. Botones de Navegación en Página de Validación

**Ubicación:** Página de validación (`/crm/listas/[id]/validacion`)

**Cambios:**
- Agregado botón "Listas del Curso" que navega a `/crm/listas/colegio/[colegioId]`
- Agregado botón "Volver a Colegios" que navega a `/crm/listas`
- Ambos botones aparecen en el header de la página

**Archivo modificado:**
- `ValidacionLista.tsx`

**Funcionalidad:**
- Helper `obtenerColegioId()` para extraer el ID del colegio desde diferentes estructuras de Strapi
- Botones condicionales (solo se muestra "Listas del Curso" si hay `colegioId`)

---

### 3. Eliminación de Años en Nombres de Cursos

**Ubicación:** Página de cursos del colegio (`/crm/listas/colegio/[colegioId]`)

**Cambios:**
- Los nombres de cursos ahora se muestran sin el año (ej: "I Medio" en lugar de "I Medio 2022")
- Normalización mejorada que elimina años en cualquier posición

**Archivo modificado:**
- `CursosColegioListing.tsx`

**Lógica de normalización:**
```typescript
// Eliminar años (4 dígitos) del nombre
nombreNormalizado = nombreNormalizado.replace(/\s*\(\s*\d{4}\s*\)\s*/g, ' ') // Paréntesis
nombreNormalizado = nombreNormalizado.replace(/\s+\d{4}\s+/g, ' ') // En medio
nombreNormalizado = nombreNormalizado.replace(/\s+\d{4}$/g, '') // Al final
nombreNormalizado = nombreNormalizado.replace(/^\d{4}\s+/g, '') // Al inicio
nombreNormalizado = nombreNormalizado.replace(/\d{4}/g, '') // Cualquier año restante
```

---

### 4. Filtrado de Versiones Ocultas

**Ubicación:** Página de validación (`/crm/listas/[id]/validacion`)

**Problema resuelto:**
- Las versiones ocultas (`activo: false`) se mostraban en la página de validación
- Ahora solo se muestran versiones activas

**Archivos modificados:**
- `ValidacionLista.tsx`
- `useProductos.ts`
- `VersionSelector.tsx`
- `PDFViewer.tsx`

**Cambios clave:**
1. `versionActual` ahora filtra solo versiones activas
2. `versiones` se filtra antes de pasarse al componente
3. `useProductos` filtra versiones activas al obtener productos
4. `VersionSelector` calcula índices correctos basándose en versiones activas

**Código clave:**
```typescript
// Filtrar solo versiones activas
const versionesActivas = lista.versiones_materiales.filter((v: any) => v.activo !== false)
```

---

### 5. Eliminación de PDFs desde Modal

**Ubicación:** Modal de gestión de versiones

**Cambios:**
- Agregada función `eliminarVersion()` que elimina permanentemente una versión
- Botón de eliminar (rojo con icono de basura) en la tabla de versiones
- Confirmación antes de eliminar

**Archivo modificado:**
- `GestionVersionesModal.tsx`

**Funcionalidad:**
- Elimina la versión del array `versiones_materiales`
- Actualiza el curso en Strapi
- Recarga múltiple para asegurar persistencia

---

### 6. Nuevos PDFs como Primera Versión Visible

**Ubicación:** Modal de gestión de versiones

**Cambios:**
- Cuando se sube un nuevo PDF, automáticamente queda como primera versión
- Se ordena por fecha (más reciente primero)
- La primera versión siempre queda activa

**Archivo modificado:**
- `GestionVersionesModal.tsx` - función `handleUploadPDF`

**Lógica:**
```typescript
// Ordenar versiones por fecha (más reciente primero)
const versionesOrdenadas = [...versiones].sort((a: any, b: any) => {
  const fechaA = new Date(a.fecha_actualizacion || a.fecha_subida || 0).getTime()
  const fechaB = new Date(b.fecha_actualizacion || b.fecha_subida || 0).getTime()
  return fechaB - fechaA
})

// Asegurar que la primera versión esté activa
const versionesActualizadas = versionesOrdenadas.map((v: any, index: number) => ({
  ...v,
  activo: index === 0 ? true : (v.activo !== undefined ? v.activo : true)
}))
```

---

### 7. Persistencia Mejorada de Cambios

**Problema resuelto:**
- Los cambios en el modal de versiones se perdían al recargar la página

**Solución implementada:**
1. **Cache busting** en `cargarCurso()`:
   ```typescript
   const timestamp = new Date().getTime()
   fetch(`/api/crm/cursos/${cursoId}?t=${timestamp}`, {
     cache: 'no-store',
     headers: {
       'Cache-Control': 'no-cache, no-store, must-revalidate',
       'Pragma': 'no-cache',
       'Expires': '0'
     }
   })
   ```

2. **Múltiples recargas** después de guardar:
   - Recarga inmediata
   - Recarga después de 500ms
   - Recarga después de 1s (y 2s en upload)

3. **Revalidación de rutas** en la API:
   ```typescript
   const { revalidatePath } = await import('next/cache')
   revalidatePath(`/crm/listas/${id}/validacion`)
   revalidatePath(`/crm/listas/colegio`)
   revalidatePath('/crm/listas')
   ```

4. **Verificación de respuesta** mejorada:
   - Verifica `response.ok` y `data.success`
   - Muestra errores específicos

**Archivos modificados:**
- `GestionVersionesModal.tsx`
- `AlmonteIntranet/src/app/api/crm/cursos/[id]/route.ts`

---

### 8. Visualización Mejorada de Colegio y RBD

**Ubicación:** Modal de importación completa durante procesamiento

**Cambios:**
- Alert más grande y visible (1.1rem)
- Iconos para identificar rápidamente (🏫 Colegio, 🔢 RBD)
- Texto en negrita
- Layout centrado con mejor espaciado

**Archivo modificado:**
- `ImportacionCompletaModal.tsx`

**Actualizaciones de `colegioActual`:**
- Se actualiza al inicio de cada grupo procesado
- Se actualiza cuando se encuentra un colegio por RBD
- Se actualiza cuando se encuentra un colegio por nombre
- Se actualiza cuando se crea un nuevo colegio

---

## 🔧 Instrucciones de Integración

### Paso 1: Obtener la Rama

```bash
git fetch origin intranet-matias
git checkout intranet-matias
```

O si ya tienes la rama localmente:

```bash
git checkout intranet-matias
git pull origin intranet-matias
```

---

### Paso 2: Verificar Cambios

```bash
git log --oneline origin/main..intranet-matias
```

Esto mostrará todos los commits que están en `intranet-matias` pero no en `main`.

---

### Paso 3: Revisar Conflictos Potenciales

Los archivos modificados son:
- Componentes de UI (ListasListing, ImportacionCompletaModal)
- Componentes de validación (ValidacionLista, PDFViewer, VersionSelector)
- Hooks (useProductos)
- Componentes de gestión (CursosColegioListing, GestionVersionesModal)
- API (cursos/[id]/route.ts)

**Verificar conflictos:**
```bash
git merge-base origin/main intranet-matias
git diff origin/main...intranet-matias --name-only
```

---

### Paso 4: Integrar en Main (Merge)

**Opción A: Merge directo**
```bash
git checkout main
git pull origin main
git merge intranet-matias --no-ff -m "Merge branch 'intranet-matias': Mejoras en gestión de versiones y UI"
git push origin main
```

**Opción B: Rebase (si prefieres historia lineal)**
```bash
git checkout intranet-matias
git rebase origin/main
# Resolver conflictos si los hay
git checkout main
git merge intranet-matias --ff-only
git push origin main
```

---

## ⚠️ Consideraciones Importantes

### 1. Variables de Entorno

**No se requieren nuevas variables de entorno.**  
Todas las funcionalidades usan variables existentes.

---

### 2. Dependencias

**No se agregaron nuevas dependencias.**  
Todos los cambios usan librerías ya instaladas:
- `react-bootstrap` (OverlayTrigger, Tooltip)
- `next/navigation` (useRouter)
- Librerías existentes

---

### 3. Compatibilidad con Strapi

**Importante:** Los cambios asumen que:
- El campo `activo` existe en `versiones_materiales` (puede ser `true`, `false`, o `undefined`)
- Las versiones con `activo === false` deben estar ocultas
- Las versiones con `activo !== false` (incluyendo `undefined`) se consideran activas

**Si el campo `activo` no existe en Strapi:**
- Todas las versiones se mostrarán (comportamiento actual)
- No habrá errores, pero el filtrado no funcionará

**Recomendación:** Verificar que el campo `activo` esté definido en el schema de `versiones_materiales` en Strapi.

---

### 4. Cache y Revalidación

Los cambios incluyen:
- Cache busting en el frontend
- Revalidación de rutas en la API
- Múltiples recargas para asegurar persistencia

**Si hay problemas de caché después de integrar:**
- Limpiar caché del navegador
- Verificar que `revalidatePath` esté funcionando correctamente
- Revisar logs de Next.js para ver si las rutas se están revalidando

---

### 5. Testing Recomendado

Después de integrar, probar:

1. **Tooltips:**
   - Pasar mouse sobre botones de importación en `/crm/listas`
   - Verificar que aparezcan los tooltips

2. **Navegación:**
   - Ir a una página de validación
   - Verificar que aparezcan los botones de navegación
   - Probar que naveguen correctamente

3. **Nombres de cursos:**
   - Ir a página de cursos de un colegio
   - Verificar que los nombres no tengan años

4. **Versiones ocultas:**
   - Ocultar una versión en el modal
   - Ir a la página de validación
   - Verificar que la versión oculta NO aparezca
   - Verificar que solo aparezcan versiones activas

5. **Eliminación de PDFs:**
   - Eliminar una versión desde el modal
   - Recargar la página
   - Verificar que la versión eliminada NO aparezca

6. **Nuevos PDFs:**
   - Subir un nuevo PDF desde el modal
   - Ir a la página de validación
   - Verificar que el nuevo PDF sea la primera versión visible

7. **Persistencia:**
   - Ocultar/activar versiones
   - Recargar la página
   - Verificar que los cambios persistan

8. **Importación masiva:**
   - Iniciar una importación completa
   - Verificar que se muestre el colegio y RBD durante el procesamiento

---

## 🐛 Troubleshooting

### Problema: Los cambios no persisten después de recargar

**Solución:**
1. Verificar que la API esté guardando correctamente (revisar logs)
2. Verificar que `revalidatePath` esté funcionando
3. Limpiar caché del navegador
4. Verificar que Strapi esté guardando los cambios (revisar en Strapi admin)

### Problema: Las versiones ocultas aún se muestran

**Solución:**
1. Verificar que el campo `activo` exista en Strapi
2. Verificar que las versiones tengan `activo: false` cuando se ocultan
3. Revisar la consola del navegador para errores
4. Verificar que el filtrado se esté aplicando correctamente

### Problema: Los tooltips no aparecen

**Solución:**
1. Verificar que `react-bootstrap` esté instalado
2. Verificar que `OverlayTrigger` y `Tooltip` estén importados
3. Revisar la consola del navegador para errores

### Problema: Los botones de navegación no funcionan

**Solución:**
1. Verificar que `useRouter` esté importado
2. Verificar que `obtenerColegioId()` esté funcionando correctamente
3. Revisar la consola del navegador para errores
4. Verificar que las rutas existan

---

## 📊 Estadísticas del Cambio

- **Archivos modificados:** 9
- **Líneas agregadas:** ~547
- **Líneas eliminadas:** ~82
- **Commits:** 1 commit principal + 8 commits anteriores de la rama

---

## ✅ Checklist de Integración

- [ ] Obtener la rama `intranet-matias`
- [ ] Revisar cambios con `git diff`
- [ ] Verificar que no haya conflictos con `main`
- [ ] Hacer merge o rebase según preferencia
- [ ] Verificar que todas las dependencias estén instaladas
- [ ] Probar tooltips en página de listas
- [ ] Probar navegación en página de validación
- [ ] Probar normalización de nombres de cursos
- [ ] Probar filtrado de versiones ocultas
- [ ] Probar eliminación de PDFs
- [ ] Probar subida de nuevos PDFs
- [ ] Probar persistencia de cambios
- [ ] Probar visualización durante importación masiva
- [ ] Verificar que no haya errores en consola
- [ ] Verificar que no haya errores en logs del servidor
- [ ] Hacer push a `main` si todo está correcto

---

## 📝 Notas Adicionales

### Cambios en la Estructura de Datos

**Ningún cambio en la estructura de datos de Strapi es requerido**, pero se recomienda:
- Verificar que el campo `activo` exista en `versiones_materiales`
- Si no existe, agregarlo como campo opcional (tipo: Boolean)

### Performance

Los cambios no deberían afectar significativamente el performance:
- Los filtrados se hacen en memoria (rápido)
- Las recargas múltiples solo ocurren después de acciones del usuario
- El cache busting solo afecta las peticiones específicas

### Compatibilidad

- ✅ Compatible con Next.js 14+
- ✅ Compatible con React 18+
- ✅ Compatible con Strapi 5.x
- ✅ No requiere cambios en la base de datos

---

## 🔗 Referencias

- **Rama:** `intranet-matias`
- **Último commit:** `2456f64d`
- **Archivos principales modificados:** 9 archivos
- **Tipo de cambios:** Mejoras de UI/UX y funcionalidad

---

**Documento creado:** Febrero 2026  
**Autor:** Matías  
**Revisión:** Pendiente
