# 📋 Prompt para Integrar Rama: Importación Masiva de Cursos

## 🎯 Objetivo
Integrar la rama `mati-integracion` que contiene la funcionalidad completa de **importación masiva de cursos y listas útiles** desde Excel/CSV, incluyendo sincronización bidireccional entre `/crm/listas` y `/crm/colegios/[id]`.

---

## 📦 Resumen de Cambios

### Funcionalidades Principales
1. **Importación Masiva de Cursos**: Permite subir un archivo Excel/CSV con múltiples cursos y sus PDFs asociados
2. **Sincronización Bidireccional**: Los cambios (crear, editar, eliminar) se reflejan automáticamente en ambas vistas (`/crm/listas` y `/crm/colegios/[id]`)
3. **Subida de PDFs**: Asociación automática de PDFs a los cursos durante la importación
4. **Manejo Robusto de Errores**: Retry mechanisms, delays, y logging detallado para debugging

---

## 📁 Archivos Modificados/Creados

### Archivos Nuevos
1. **`AlmonteIntranet/src/app/api/crm/cursos/import-pdf/route.ts`**
   - Endpoint para subir PDFs y asociarlos a cursos
   - Implementa retry mechanism (3 intentos con delay de 1 segundo)
   - Busca cursos por `documentId`, `id` numérico, o `cursoId` original

### Archivos Modificados

#### Frontend (Componentes React)
1. **`AlmonteIntranet/src/app/(admin)/(apps)/crm/listas/components/ImportacionMasivaModal.tsx`**
   - Modal completo para importación masiva
   - Lectura de archivos Excel/CSV
   - Procesamiento secuencial de cursos con delays progresivos
   - Subida de PDFs asociados
   - Manejo de errores detallado

2. **`AlmonteIntranet/src/app/(admin)/(apps)/crm/listas/components/ListasListing.tsx`**
   - Función `recargarListas` con cache-busting y retry logic
   - Integración de `CustomEvent` y `localStorage` para sincronización bidireccional
   - Botón "Recargar" para refrescar datos manualmente
   - Manejo mejorado de eliminaciones múltiples

3. **`AlmonteIntranet/src/app/(admin)/(apps)/crm/colegios/[id]/page.tsx`**
   - Función `recargarCursosDesdeAPI` con cache-busting
   - Integración de `CustomEvent` y `localStorage` listeners
   - Botón de eliminar curso con modal de confirmación
   - Auto-recarga al cambiar de tab o al enfocar la ventana

#### Backend (API Routes)
4. **`AlmonteIntranet/src/app/api/crm/listas/route.ts`**
   - Filtrado mejorado de cursos con PDFs asociados
   - Manejo de errores mejorado

5. **`AlmonteIntranet/src/app/api/crm/listas/[id]/route.ts`**
   - Lógica mejorada de eliminación con retry mechanism
   - Verificación post-eliminación
   - Eliminación de `listas-utiles` asociadas

6. **`AlmonteIntranet/src/app/api/crm/colegios/[id]/cursos/route.ts`**
   - Mejora en obtención de `colegioId` (soporta ID numérico y `documentId`)
   - Validación mejorada de campos requeridos
   - Logging detallado

#### Componentes Reutilizables
7. **`AlmonteIntranet/src/components/table/DataTable.tsx`**
   - Corrección de estructura HTML (movido `DndContext` fuera de `<tr>` y `<table>`)
   - Resuelve errores de hidratación

8. **`AlmonteIntranet/src/components/table/DeleteConfirmationModal.tsx`**
   - Agregado soporte para `loading` y `disabled` props
   - Botones deshabilitados durante operaciones

---

## 🔧 Pasos para Integrar la Rama

### Paso 1: Preparar el Entorno

```bash
# Asegúrate de estar en la rama principal (o la rama donde quieres integrar)
git checkout main  # o tu rama principal
git pull origin main  # Asegúrate de tener la última versión

# Verifica que no tienes cambios sin commitear
git status
```

### Paso 2: Traer la Rama Remota

```bash
# Traer todas las ramas remotas
git fetch origin

# Verificar que la rama existe
git branch -r | grep mati-integracion
```

### Paso 3: Hacer el Merge

```bash
# Opción A: Merge directo (recomendado si no hay conflictos)
git merge origin/mati-integracion

# Opción B: Merge con mensaje personalizado
git merge origin/mati-integracion -m "Merge: Integrar funcionalidad de importación masiva de cursos"
```

### Paso 4: Resolver Conflictos (si los hay)

Si hay conflictos, Git te mostrará qué archivos tienen conflictos. Los archivos más probables de tener conflictos son:

- `ListasListing.tsx` (si se modificó la estructura de datos)
- `page.tsx` en `/crm/colegios/[id]` (si se agregaron nuevos hooks o estado)
- `DataTable.tsx` (si se modificó la estructura HTML)

**Para resolver conflictos:**

```bash
# Ver archivos con conflictos
git status

# Abrir cada archivo y buscar marcadores de conflicto:
# <<<<<<< HEAD
# (tu código)
# =======
# (código de mati-integracion)
# >>>>>>> origin/mati-integracion

# Editar manualmente y resolver conflictos
# Luego:
git add <archivo-resuelto>
git commit -m "Resolve: Conflictos en <archivo>"
```

### Paso 5: Verificar que Todo Compila

```bash
cd AlmonteIntranet
npm run build
```

Si hay errores de TypeScript, corrígelos antes de continuar.

### Paso 6: Probar la Funcionalidad

1. **Probar Importación Masiva:**
   - Ir a `/crm/listas`
   - Click en "Importación Masiva"
   - Seleccionar un colegio
   - Subir un archivo Excel/CSV de prueba
   - Verificar que los cursos se crean correctamente

2. **Probar Sincronización Bidireccional:**
   - Crear un curso en `/crm/listas`
   - Verificar que aparece en `/crm/colegios/[id]` (tab Cursos)
   - Eliminar un curso desde `/crm/listas`
   - Verificar que desaparece de `/crm/colegios/[id]`
   - Eliminar un curso desde `/crm/colegios/[id]`
   - Verificar que desaparece de `/crm/listas`

3. **Probar Subida de PDFs:**
   - Durante la importación masiva, verificar que los PDFs se suben correctamente
   - Verificar que aparecen en la lista de materiales del curso

---

## ⚠️ Posibles Conflictos y Soluciones

### Conflicto 1: Estructura de Datos de `ListaType`

**Síntoma:** Error en `ListasListing.tsx` sobre propiedades faltantes o tipos incorrectos.

**Solución:**
- Verificar que la interfaz `ListaType` incluya todas las propiedades necesarias:
  - `id`, `documentId`, `nombre`, `nivel`, `grado`, `año`, `descripcion`, `activo`
  - `pdf_id`, `pdf_url`, `pdf_nombre`
  - `colegio`, `curso`, `materiales`

### Conflicto 2: Orden de React Hooks

**Síntoma:** Error "React has detected a change in the order of Hooks".

**Solución:**
- Asegurar que todos los `useEffect` aparecen ANTES de los `useMemo`
- No usar hooks condicionalmente (dentro de `if` o loops)

### Conflicto 3: Estructura HTML en `DataTable.tsx`

**Síntoma:** Errores de hidratación sobre `<div>` dentro de `<tr>` o `<table>`.

**Solución:**
- Verificar que `DndContext` esté FUERA de `<table>` y `<tr>`
- Debe envolver solo el `<thead>` o estar al nivel del `<Table>`

### Conflicto 4: Tipos de TypeScript

**Síntoma:** Errores de tipo en `map`, `filter`, o `onClick` handlers.

**Solución:**
- Agregar tipos explícitos a callbacks: `(item: Tipo) => ...`
- Usar type assertions cuando sea necesario: `e.target as HTMLInputElement`
- Verificar que las interfaces incluyan propiedades opcionales cuando corresponda

---

## 🔍 Verificaciones Post-Merge

### Checklist de Verificación

- [ ] El proyecto compila sin errores (`npm run build`)
- [ ] No hay errores de TypeScript
- [ ] No hay errores de linting
- [ ] La importación masiva funciona correctamente
- [ ] Los PDFs se suben y asocian correctamente a los cursos
- [ ] La sincronización bidireccional funciona (crear, editar, eliminar)
- [ ] Los botones "Recargar" funcionan en ambas vistas
- [ ] Los modales de confirmación de eliminación funcionan
- [ ] No hay errores en la consola del navegador
- [ ] Los logs de debugging son útiles (en desarrollo)

### Comandos de Verificación

```bash
# Verificar que no hay errores de TypeScript
cd AlmonteIntranet
npx tsc --noEmit

# Verificar que no hay errores de linting
npm run lint

# Verificar que el build funciona
npm run build
```

---

## 📝 Notas Importantes

### Dependencias
- **`xlsx`**: Biblioteca para leer archivos Excel/CSV
  - Ya debería estar en `package.json`
  - Si no está: `npm install xlsx @types/xlsx`

### Variables de Entorno
- No se requieren nuevas variables de entorno
- Asegúrate de que `STRAPI_URL` y `STRAPI_API_TOKEN` estén configuradas

### Strapi
- No se requieren cambios en Strapi
- La funcionalidad usa los endpoints existentes de Strapi
- Asegúrate de que los Content Types `curso`, `colegio`, y `versiones-materiales` estén configurados correctamente

### Performance
- La importación masiva procesa cursos secuencialmente con delays progresivos
- Los primeros 3 cursos tienen delays de 200ms, 400ms, 600ms
- Después de crear un curso, hay un delay de 2 segundos antes de subir el PDF
- Esto ayuda a evitar rate limiting y problemas de eventual consistency en Strapi

---

## 🐛 Troubleshooting

### Error: "Curso no encontrado o formato inválido" al subir PDF
**Causa:** El curso aún no está disponible en Strapi cuando se intenta subir el PDF.

**Solución:** Ya está implementado un retry mechanism (3 intentos con 1 segundo de delay). Si persiste, aumentar el delay inicial en `ImportacionMasivaModal.tsx` (línea ~400) de 2000ms a 3000ms.

### Error: Los cursos no aparecen en `/crm/listas` después de importar
**Causa:** Cache del navegador o la API no está retornando los cursos con PDFs.

**Solución:** 
- Usar el botón "Recargar" en `/crm/listas`
- Verificar que los cursos tienen PDFs asociados en Strapi
- Verificar que el endpoint `/api/crm/listas` está filtrando correctamente

### Error: Sincronización bidireccional no funciona
**Causa:** Los eventos `CustomEvent` o `localStorage` no se están disparando/escuchando correctamente.

**Solución:**
- Verificar que ambas páginas están abiertas en la misma ventana/pestaña (o usar `localStorage` para cross-tab)
- Verificar en la consola que los eventos se están disparando: buscar logs con `[ListasListing] 🔔` o `[ColegioDetailPage] 🔔`
- Verificar que `notificarCambio` se está llamando después de crear/editar/eliminar

---

## 📞 Contacto

Si encuentras problemas durante la integración, revisa:
1. Los logs de la consola del navegador
2. Los logs del servidor (si estás en desarrollo)
3. Los commits en `mati-integracion` para entender mejor los cambios

**Último commit relevante:** `a970b970` - "Fix: Wrapper para onClick de recargarListas para manejar el evento del mouse"

---

## ✅ Comandos Rápidos (Copy-Paste)

```bash
# 1. Preparar
git checkout main
git pull origin main

# 2. Merge
git merge origin/mati-integracion -m "Merge: Importación masiva de cursos"

# 3. Si hay conflictos, resolverlos y luego:
git add .
git commit -m "Resolve: Conflictos de merge"

# 4. Verificar
cd AlmonteIntranet
npm run build

# 5. Push (si todo está bien)
git push origin main
```

---

**¡Buena suerte con la integración! 🚀**
