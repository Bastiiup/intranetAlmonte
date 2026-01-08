# 🔧 Solución: Contactos No Aparecen en Colegio y Datos No Se Guardan

**Fecha:** 8 de enero de 2026  
**Problemas identificados:**
1. Contactos no aparecen en la vista de colegio
2. Ciertos datos no se guardan en Strapi

---

## 🔍 DIAGNÓSTICO

### Problema 1: Contactos No Aparecen en Colegio

**Causa probable:**
1. El filtro `filters[trayectorias][colegio][id][$eq]` puede no estar funcionando correctamente
2. Puede que necesite filtrar por `documentId` también
3. El populate de trayectorias puede no estar incluyendo el colegio correctamente

**Archivo afectado:** `frontend-ubold/src/app/api/crm/colegios/[id]/contacts/route.ts`

### Problema 2: Datos No Se Guardan

**Causas probables:**
1. IDs inválidos (0, null, undefined) al crear trayectorias
2. El formato de `connect` puede estar incorrecto
3. Validaciones de Strapi rechazando los datos
4. Campos requeridos faltantes

**Archivos afectados:**
- `frontend-ubold/src/app/(admin)/(apps)/crm/contacts/components/AddContactModal.tsx`
- `frontend-ubold/src/app/api/persona-trayectorias/route.ts`
- `frontend-ubold/src/app/api/crm/contacts/route.ts`

---

## ✅ SOLUCIONES

### Solución 1: Mejorar Filtro de Contactos en Colegio

**Cambio en:** `frontend-ubold/src/app/api/crm/colegios/[id]/contacts/route.ts`

**Problema:** El filtro puede no estar encontrando las trayectorias correctamente.

**Solución:** Usar un enfoque más robusto:
1. Intentar filtrar por `id` numérico
2. Si no hay resultados, intentar por `documentId`
3. Usar `$or` para buscar ambos
4. Asegurar que el populate incluya todos los campos necesarios

### Solución 2: Validar y Corregir Creación de Trayectorias

**Cambios necesarios:**
1. Validar que `personaId` y `colegioId` sean números válidos antes de crear
2. Asegurar que se use el ID numérico, no `documentId` para `connect`
3. Agregar logs detallados para debugging
4. Manejar errores correctamente

### Solución 3: Verificar Estructura de Datos en Strapi

**Verificar:**
1. Que el content type `profesores` tenga los campos correctos
2. Que las relaciones `persona` y `colegio` estén configuradas correctamente
3. Que no haya campos requeridos faltantes

---

## 🛠️ IMPLEMENTACIÓN

### ✅ Cambios Implementados

#### 1. Mejora en API de Contactos de Colegio (`/api/crm/colegios/[id]/contacts`)

**Problema:** El filtro `filters[trayectorias][colegio][id][$eq]` puede no funcionar correctamente en Strapi.

**Solución implementada:**
- **Estrategia principal:** Obtener trayectorias directamente del colegio usando `/api/profesores`
- **Ventaja:** Más confiable porque filtra directamente por colegio
- **Fallback:** Si no funciona, intenta el método original de filtrar personas

**Código:**
```typescript
// ESTRATEGIA 1: Obtener trayectorias del colegio directamente
const trayectoriasParams = new URLSearchParams({
  'filters[colegio][id][$eq]': String(colegioIdNum),
  'filters[activo][$eq]': 'true',
  'populate[persona][populate][emails]': 'true',
  'populate[persona][populate][telefonos]': 'true',
  // ... más populates
})

const trayectoriasResponse = await strapiClient.get(`/api/profesores?${trayectoriasParams.toString()}`)

// Agrupar trayectorias por persona
const personasMap = new Map<string, any>()
trayectoriasResponse.data.forEach((trayectoria: any) => {
  // Agrupar por persona
})
```

#### 2. Validación Mejorada en Creación de Trayectorias (`/api/persona-trayectorias`)

**Problema:** IDs inválidos (0, null, undefined) causaban errores silenciosos.

**Solución implementada:**
- Validación exhaustiva de `personaId` y `colegioId`
- Conversión correcta de `documentId` a `id` numérico
- Logs detallados para debugging
- Mensajes de error claros

**Código:**
```typescript
// Validar persona
let personaIdNum: number | null = null
if (body.data.persona?.connect?.[0]) {
  personaIdNum = parseInt(String(body.data.persona.connect[0]))
}

if (!personaIdNum || personaIdNum === 0 || isNaN(personaIdNum)) {
  return NextResponse.json({ error: 'ID de persona inválido' }, { status: 400 })
}

// Similar para colegio...
```

#### 3. Mejora en AddContactModal

**Problema:** No se validaba correctamente el `colegioId` antes de crear la trayectoria.

**Solución implementada:**
- Validación mejorada del `colegioId`
- Obtención del ID numérico si solo se tiene `documentId`
- Manejo de errores con mensajes al usuario
- No falla la creación del contacto si falla la trayectoria

**Código:**
```typescript
// Validar y obtener colegioId numérico
let colegioIdNum: number | null = null

if (formData.colegioId && formData.colegioId !== '' && formData.colegioId !== '0') {
  colegioIdNum = parseInt(String(formData.colegioId))
  
  // Si no es válido, intentar obtener del colegio seleccionado
  if (!colegioIdNum || isNaN(colegioIdNum)) {
    const colegioSeleccionado = colegios.find(...)
    // Obtener ID numérico...
  }
}
```

---

## 🧪 TESTING

### Casos de Prueba

1. **Crear contacto con colegio:**
   - ✅ Crear contacto desde `/crm/contacts`
   - ✅ Seleccionar colegio y cargo
   - ✅ Verificar que aparece en `/crm/colegios/[id]` → Tab "Colaboradores"

2. **Ver contactos de un colegio:**
   - ✅ Ir a `/crm/colegios/[id]`
   - ✅ Tab "Colaboradores" debe mostrar todos los contactos
   - ✅ Verificar que se muestran cargo, curso, asignatura

3. **Editar contacto:**
   - ✅ Editar contacto existente
   - ✅ Cambiar colegio o cargo
   - ✅ Verificar que se actualiza en la vista del colegio

---

## 📋 CHECKLIST

- [x] Mejorar query de contactos en colegio (estrategia alternativa)
- [x] Validar IDs antes de crear trayectorias
- [x] Mejorar manejo de errores en AddContactModal
- [x] Agregar logs detallados para debugging
- [ ] Probar creación de contacto con colegio
- [ ] Probar visualización de contactos en colegio
- [ ] Verificar que los datos se guardan correctamente en Strapi

---

## 🔍 DEBUGGING

Si los contactos aún no aparecen:

1. **Verificar logs en consola del navegador:**
   - Buscar `[API /crm/colegios/[id]/contacts GET]`
   - Ver cuántas trayectorias se encontraron
   - Ver cuántas personas únicas se encontraron

2. **Verificar logs en servidor:**
   - Buscar `[API /persona-trayectorias POST]`
   - Ver si la trayectoria se creó correctamente
   - Verificar IDs de persona y colegio

3. **Verificar en Strapi Admin:**
   - Ir a Content Type "Profesores"
   - Verificar que existen trayectorias con el colegio correcto
   - Verificar que las relaciones están correctas

---

**Última actualización:** 8 de enero de 2026
