# 📋 Checklist de Funcionalidades - Módulo de Listas

## ✅ COMPLETADO

### 1. **Subir PDF masivamente para cada curso** ✅
- ✅ Implementado en `ImportacionCompletaModal.tsx`
- ✅ Permite subir PDFs desde URL o manualmente
- ✅ Soporta múltiples PDFs por curso

### 2. **Botón ojo en lista redirecciona al detalle del PDF** ✅
- ✅ Implementado en `ListasListing.tsx`
- ✅ Redirecciona a `/crm/listas/[id]/validacion`

### 3. **Cargar productos manualmente en validación** ✅
- ✅ Implementado en `ValidacionLista.tsx`
- ✅ Modal "Agregar Manual" con autocompletado de WooCommerce
- ✅ Modal "Agregar con Excel" con plantilla descargable
- ✅ Permite agregar múltiples productos antes de guardar

### 4. **Asignaturas en la tabla de productos** ✅
- ✅ Columna "Asignatura" visible en la tabla de productos
- ✅ Se muestra en la validación de listas

### 5. **Múltiples PDFs por curso** ✅
- ✅ Implementado sistema de `versiones_materiales`
- ✅ Dropdown para seleccionar entre diferentes versiones (Lista de Útiles, Textos Escolares, Plan Lector)
- ✅ Switch para ver todos los productos juntos o por versión
- ✅ Cada versión mantiene sus propios productos

### 6. **Importación completa con Excel** ✅
- ✅ Plantilla Excel profesional y compacta
- ✅ Soporta RBD, Colegio, Curso, Asignatura, Productos, URL PDF
- ✅ Verificación automática de colegios existentes
- ✅ Auto-completado de datos de colegios existentes
- ✅ Manejo de múltiples PDFs por curso

---

## ⚠️ PENDIENTE / EN PROGRESO

### 1. **Quitar el paralelo en cursos** ⚠️
**Estado:** Pendiente  
**Descripción:** Las listas de útiles son las mismas para primero A, B, C, etc. Solo dejar el curso (sin paralelo)  
**Archivos identificados que usan paralelo:**
- `src/app/api/crm/colegios/[id]/cursos/route.ts` (línea 26, 275, 285)
- `src/app/api/crm/cursos/import-pdf/route.ts` (línea 370-372)
- `src/app/(admin)/(apps)/crm/colegios/[id]/components/CursoModal.tsx` (línea 477-485)
- `src/app/(admin)/(apps)/crm/listas/components/ImportacionMasivaModal.tsx` (no usa paralelo en creación)

**Tareas:**
- [ ] Revisar schema de cursos en Strapi (verificar si paralelo es obligatorio)
- [ ] Eliminar campo "paralelo" de la creación de cursos en `CursoModal.tsx`
- [ ] Eliminar campo "paralelo" de la API `/api/crm/colegios/[id]/cursos` (POST)
- [ ] Eliminar campo "paralelo" de la API `/api/crm/cursos/import-pdf` (POST)
- [ ] Actualizar componentes que muestran cursos (quitar paralelo del nombre)
- [ ] Actualizar filtros y búsquedas
- [ ] Migrar datos existentes (agrupar por curso sin paralelo si es necesario)

---

### 2. **Carga masiva de colegios con cursos** ⚠️
**Estado:** Pendiente (componente existe pero está oculto)  
**Descripción:** Poder cargar de manera masiva los colegios con sus respectivos cursos. Debe ser de PreKinder a Cuarto Medio  
**Archivos relacionados:**
- `src/app/(admin)/(apps)/crm/listas/components/ImportacionMasivaColegiosModal.tsx` (existe)
- `src/app/(admin)/(apps)/crm/listas/components/ListasListing.tsx` (línea 28, 78 - está comentado/oculto)

**Tareas:**
- [ ] Revisar `ImportacionMasivaColegiosModal.tsx` para verificar funcionalidad
- [ ] Asegurar que soporte PreKinder a 4to Medio (verificar grados permitidos)
- [ ] Crear plantilla Excel para importación masiva de colegios y cursos
- [ ] Validar datos antes de importar (RBD, nombres, grados válidos)
- [ ] Mostrar preview antes de confirmar
- [ ] Descomentar/habilitar el modal en `ListasListing.tsx`
- [ ] Agregar botón en la UI para acceder a esta funcionalidad

---

### 3. **Contador de listas por colegio en filtros** ⚠️
**Estado:** Pendiente  
**Descripción:** En listas, cuando filtramos, debería decir cuántas listas por colegio tenemos  
**Archivo:** `src/app/(admin)/(apps)/crm/listas/components/ListasListing.tsx` (línea 176-200, filtro de colegio)

**Tareas:**
- [ ] Agregar contador de listas por colegio en el filtro dropdown
- [ ] Mostrar número de listas junto al nombre del colegio (ej: "Colegio X (5 listas)")
- [ ] Calcular contador basado en los datos filtrados actuales
- [ ] Actualizar contador cuando se filtran resultados (usar `table.getFilteredRowModel()`)

---

### 4. **Problema: Lista se oculta al crearla** ⚠️
**Estado:** Bug pendiente - Requiere investigación  
**Descripción:** Cuando creamos una lista se oculta  
**Archivos relacionados:**
- `src/app/(admin)/(apps)/crm/listas/components/ListaModal.tsx` (línea 232-236, 258-262 - `onSuccess`)
- `src/app/(admin)/(apps)/crm/listas/components/ListasListing.tsx` (línea 71-72, 700-750 - manejo de `onSuccess`)

**Tareas:**
- [ ] Investigar por qué se oculta la lista después de crearla
- [ ] Revisar lógica de `onSuccess` en `ListaModal` (línea 232, 258)
- [ ] Verificar que `handleSuccess` en `ListasListing` recargue correctamente los datos
- [ ] Verificar que la lista se agregue correctamente al estado local
- [ ] Asegurar que el modal se cierre correctamente después de crear
- [ ] Verificar que la recarga de datos desde la API funcione correctamente

---

### 5. **Cargar asignaturas en importación masiva y manual** ⚠️
**Estado:** Parcialmente implementado - Requiere verificación  
**Descripción:** En la carga masiva y la carga manual de listas debería poder cargarse las asignaturas  
**Archivos:**
- `src/app/(admin)/(apps)/crm/listas/components/ImportacionCompletaModal.tsx` (tiene campo `Asignatura` en el Excel)
- `src/app/(admin)/(apps)/crm/listas/[id]/validacion/components/ValidacionLista.tsx` (línea 59, 120, 293 - campo `asignatura` en productos)

**Tareas:**
- [ ] Verificar que el campo `Asignatura` del Excel se guarde en `materiales` en importación masiva
- [ ] Verificar que el campo `asignatura` se guarde correctamente cuando se agrega manualmente
- [ ] Verificar que `asignatura` se muestre en la tabla de productos (ya está en columna)
- [ ] Asegurar que `asignatura` se incluya en el payload al guardar productos
- [ ] Verificar que `asignatura` se persista en Strapi en `versiones_materiales[].materiales[].asignatura`

---

### 6. **Cargar nombres de colegios desde Excel en desplegable** ⚠️
**Estado:** Pendiente  
**Descripción:** En el desplegable de crear listas, esos mismos nombres nosotros podríamos cargarlos directamente con el Excel con el nombre o document ID del colegio o RBD  
**Archivo:** `src/app/(admin)/(apps)/crm/listas/components/ListaModal.tsx` (línea 67-68, 118-139 - carga de colegios)

**Tareas:**
- [ ] Agregar botón "Importar desde Excel" en `ListaModal`
- [ ] Crear modal/componente para importar colegios desde Excel
- [ ] Permitir matching por nombre, documentId o RBD
- [ ] Validar que el colegio exista en Strapi antes de agregarlo
- [ ] Mostrar preview de colegios a agregar antes de confirmar
- [ ] Actualizar el dropdown de colegios después de importar
- [ ] Crear plantilla Excel para importación de colegios

---

### 7. **Orden de asignatura** ⚠️
**Estado:** Implementado pero puede mejorar  
**Descripción:** Orden de asignatura es en que orden aparecen (primero matemáticas, luego lenguaje, etc.)  
**Archivos:**
- `ImportacionCompletaModal.tsx` (tiene campo `Orden_asignatura`)

**Tareas:**
- [ ] Verificar que el orden se guarde correctamente
- [ ] Asegurar que se muestre en la tabla ordenado
- [ ] Verificar que se use en la visualización

---

### 8. **Mejorar rendimiento del cargado de listas y análisis de PDF** ⚠️
**Estado:** Pendiente  
**Descripción:** Mejorar el rendimiento del cargado de listas de útiles y el análisis de PDF para acortar tiempo de forma rápida y precisa  
**Archivos:**
- `ListasListing.tsx` (carga de listas)
- `procesar-pdf/route.ts` (análisis de PDF)

**Tareas:**
- [ ] Implementar paginación en la lista de listas
- [ ] Agregar lazy loading de productos
- [ ] Optimizar consultas a Strapi (usar campos específicos)
- [ ] Implementar caché de resultados
- [ ] Optimizar procesamiento de PDF (reducir tiempo de análisis)
- [ ] Implementar procesamiento en background si es posible
- [ ] Reducir tamaño de respuestas de API

---

## 📊 Resumen

- **Completado:** 6 funcionalidades ✅
- **Pendiente:** 8 funcionalidades ⚠️
- **Total:** 14 funcionalidades

---

## 🎯 Prioridades Sugeridas

### Alta Prioridad:
1. **Quitar paralelo en cursos** - Afecta la estructura base
2. **Problema: Lista se oculta al crearla** - Bug crítico
3. **Carga masiva de colegios con cursos** - Funcionalidad importante

### Media Prioridad:
4. **Contador de listas por colegio**
5. **Cargar asignaturas correctamente**
6. **Cargar nombres de colegios desde Excel**

### Baja Prioridad:
7. **Orden de asignatura** (ya está implementado, solo verificar)
8. **Mejorar rendimiento** (optimización continua)

---

## 📝 Notas Adicionales

- El sistema de múltiples PDFs por curso está completamente funcional
- La importación completa con Excel es robusta y profesional
- El sistema de validación manual es completo y funcional
- La integración con WooCommerce está funcionando correctamente
