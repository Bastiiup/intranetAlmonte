# 🔧 Solución: Guardado de Colegios al Asignar Contactos

**Fecha:** Enero 2026  
**Problema:** Los colegios no se guardaban cuando se asignaban a contactos  
**Estado:** ✅ SOLUCIONADO

---

## 🐛 Problema Identificado

### Síntomas
1. Al crear un contacto y asignarle un colegio, la trayectoria no se creaba
2. Al editar un contacto y cambiar el colegio, los cambios no se guardaban
3. Los contactos no aparecían en la vista de detalle del colegio

### Causas Raíz

#### 1. **IDs Inválidos en el Endpoint `/api/crm/colegios/list`**
- El endpoint devolvía `id: 0` cuando no podía parsear correctamente el ID
- No filtraba colegios sin ID numérico válido
- Priorizaba `documentId` sobre `id` numérico

#### 2. **Manejo Incorrecto de IDs en los Selects**
- `EditContactModal` usaba `value={colegio.id}` pero `formData.colegioId` podía ser un string
- `AddContactModal` usaba `String(colegio.id || colegio.documentId)` causando inconsistencias
- No se validaba que el ID fuera numérico antes de enviarlo

#### 3. **Validación Insuficiente en el Backend**
- El endpoint PUT de contactos no validaba correctamente `null` o `undefined` en `colegioId`
- No había logs suficientes para debugging

---

## ✅ Soluciones Implementadas

### 1. Mejora del Endpoint `/api/crm/colegios/list`

**Archivo:** `frontend-ubold/src/app/api/crm/colegios/list/route.ts`

**Cambios:**
- Prioriza `id` numérico sobre `documentId`
- Filtra colegios sin ID numérico válido (`id > 0`)
- Mejora el parseo de IDs para evitar `id: 0`

```typescript
const colegios = data
  .map((colegio: any) => {
    const attrs = colegio.attributes || colegio
    // ⚠️ IMPORTANTE: Priorizar id numérico sobre documentId para connect en Strapi
    const idNum = colegio.id && typeof colegio.id === 'number' ? colegio.id : null
    const documentId = colegio.documentId || String(colegio.id || '')
    
    // Si no tenemos id numérico, intentar obtenerlo
    let idFinal: number | null = idNum
    if (!idFinal && documentId) {
      const parsed = parseInt(documentId)
      if (!isNaN(parsed) && parsed > 0) {
        idFinal = parsed
      }
    }
    
    return {
      id: idFinal || 0,
      documentId: documentId,
      nombre: attrs.colegio_nombre || 'Sin nombre',
      rbd: attrs.rbd || null,
    }
  })
  .filter((c: any) => c.id > 0) // ⚠️ Filtrar colegios sin ID numérico válido
```

---

### 2. Corrección de `EditContactModal`

**Archivo:** `frontend-ubold/src/app/(admin)/(apps)/crm/contacts/components/EditContactModal.tsx`

**Cambios:**
- El select ahora usa siempre el ID numérico como string: `value={String(colegio.id)}`
- Filtra colegios sin ID válido antes de mostrar
- Mejora la validación del `colegioId` antes de enviarlo
- Agrega logs detallados para debugging

```typescript
// Select mejorado
<FormControl
  as="select"
  value={formData.colegioId || ''}
  onChange={(e) => {
    const selectedValue = e.target.value
    console.log('[EditContactModal] Colegio seleccionado:', selectedValue)
    handleFieldChange('colegioId', selectedValue)
  }}
  disabled={loading || loadingColegios}
>
  <option value="">Seleccionar colegio...</option>
  {colegios
    .filter((c) => c.id && c.id > 0) // ⚠️ Solo mostrar colegios con ID numérico válido
    .map((colegio) => {
      const colegioValue = String(colegio.id) // ⚠️ Siempre usar ID numérico como string
      return (
        <option key={colegioValue} value={colegioValue}>
          {colegio.nombre} {colegio.rbd ? `(RBD: ${colegio.rbd})` : ''}
        </option>
      )
    })}
</FormControl>

// Validación mejorada antes de enviar
trayectoria: {
  colegio: (() => {
    const colegioIdNum = parseInt(String(formData.colegioId))
    if (!colegioIdNum || colegioIdNum === 0 || isNaN(colegioIdNum)) {
      console.error('[EditContactModal] ⚠️ ID de colegio inválido:', formData.colegioId)
      return null
    }
    return colegioIdNum
  })(),
  cargo: formData.cargo || null,
  is_current: true,
},
```

---

### 3. Corrección de `AddContactModal`

**Archivo:** `frontend-ubold/src/app/(admin)/(apps)/crm/contacts/components/AddContactModal.tsx`

**Cambios:**
- El select ahora usa siempre el ID numérico: `value={String(colegio.id)}`
- Filtra colegios sin ID válido
- Mejora la lógica de obtención del ID numérico con fallbacks
- Agrega logs detallados en cada paso

```typescript
// Select mejorado
{colegios
  .filter((c) => c.id && c.id > 0) // ⚠️ Solo mostrar colegios con ID numérico válido
  .map((colegio) => {
    const colegioValue = String(colegio.id) // ⚠️ Siempre usar ID numérico como string
    return (
      <option key={colegioValue} value={colegioValue}>
        {colegio.nombre} {colegio.rbd ? `(RBD: ${colegio.rbd})` : ''}
      </option>
    )
  })}

// Lógica mejorada de obtención de ID
if (formData.colegioId && formData.colegioId !== '' && formData.colegioId !== '0') {
  colegioIdNum = parseInt(String(formData.colegioId))
  
  if (!colegioIdNum || colegioIdNum === 0 || isNaN(colegioIdNum)) {
    // Buscar en lista de colegios
    const colegioSeleccionado = colegios.find(
      (c) => String(c.id) === String(formData.colegioId) || String(c.documentId) === String(formData.colegioId)
    )
    
    if (colegioSeleccionado && colegioSeleccionado.id && colegioSeleccionado.id > 0) {
      colegioIdNum = colegioSeleccionado.id
    } else if (colegioSeleccionado?.documentId) {
      // Obtener desde Strapi si solo tenemos documentId
      const colegioResponse = await fetch(`/api/crm/colegios/${colegioSeleccionado.documentId}`)
      // ... obtener id numérico
    }
  }
}
```

---

### 4. Mejora de Validación en Backend

**Archivo:** `frontend-ubold/src/app/api/crm/contacts/[id]/route.ts`

**Cambios:**
- Valida `null` y `undefined` explícitamente
- Mejora los logs de error
- Asegura que solo se procesen IDs numéricos válidos

```typescript
// Validar colegioId
let colegioIdNum: number | null = null

if (body.trayectoria.colegio === null || body.trayectoria.colegio === undefined) {
  console.warn('⚠️ [API /crm/contacts/[id] PUT] colegio es null/undefined, omitiendo trayectoria')
} else {
  colegioIdNum = typeof body.trayectoria.colegio === 'number' 
    ? body.trayectoria.colegio 
    : parseInt(String(body.trayectoria.colegio))
  
  if (!colegioIdNum || colegioIdNum === 0 || isNaN(colegioIdNum)) {
    console.warn('⚠️ [API /crm/contacts/[id] PUT] ID de colegio inválido, omitiendo trayectoria:', {
      colegioId: body.trayectoria.colegio,
      colegioIdNum,
      tipo: typeof body.trayectoria.colegio,
    })
  }
}

if (colegioIdNum && colegioIdNum > 0 && !isNaN(colegioIdNum)) {
  // Procesar trayectoria...
}
```

---

## 🧪 Testing

### Test 1: Crear Contacto con Colegio
1. Ir a `/crm/contacts`
2. Click en "Añadir Nuevo Contacto"
3. Llenar nombre, email
4. Seleccionar un colegio del dropdown
5. Agregar cargo (opcional)
6. Guardar
7. ✅ **Verificar:** El contacto debe aparecer en `/crm/colegios/[id]` en la pestaña "Colaboradores"

### Test 2: Editar Contacto y Cambiar Colegio
1. Ir a `/crm/contacts`
2. Click en "Editar" en un contacto existente
3. Cambiar el colegio seleccionado
4. Guardar
5. ✅ **Verificar:** 
   - El contacto debe aparecer en el nuevo colegio
   - Debe desaparecer del colegio anterior (si no tiene otras trayectorias)

### Test 3: Verificar Logs en Consola
1. Abrir DevTools (F12)
2. Ir a la pestaña "Console"
3. Crear/editar un contacto con colegio
4. ✅ **Verificar:** Deben aparecer logs como:
   - `[EditContactModal] Colegio seleccionado: 123`
   - `[EditContactModal] ✅ Contacto actualizado exitosamente`
   - `[API /crm/contacts/[id] PUT] ✅ Trayectoria creada/actualizada`

---

## 📋 Checklist de Verificación

- [x] Endpoint `/api/crm/colegios/list` devuelve solo colegios con ID numérico válido
- [x] `EditContactModal` usa ID numérico en el select
- [x] `AddContactModal` usa ID numérico en el select
- [x] Validación mejorada en backend para `colegioId`
- [x] Logs detallados agregados para debugging
- [x] Filtrado de colegios sin ID válido en los selects
- [x] Manejo correcto de `null` y `undefined` en validaciones

---

## 🔍 Notas Importantes

1. **IDs en Strapi:**
   - Para `connect` en relaciones, **SIEMPRE** usar el ID numérico (`id`), no `documentId`
   - El `documentId` es útil para búsquedas, pero no para `connect`

2. **Validación:**
   - Siempre validar que `id > 0` antes de usar
   - Filtrar elementos con `id: 0` o `id: null` antes de mostrar en selects

3. **Logs:**
   - Los logs ahora incluyen información detallada sobre IDs y validaciones
   - Revisar la consola del navegador y del servidor para debugging

4. **Cartera de Asignaciones:**
   - ⚠️ **IMPORTANTE:** La "cartera de asignaciones" es diferente a las trayectorias
   - La cartera de asignaciones relaciona **ejecutivos comerciales** con colegios
   - Las trayectorias relacionan **personas/contactos** con colegios
   - Son conceptos separados en Strapi

---

## 🚀 Próximos Pasos (Opcional)

1. **Mejorar UX:**
   - Agregar indicador visual cuando se está guardando la trayectoria
   - Mostrar mensaje de éxito específico cuando se asocia un colegio

2. **Validación Adicional:**
   - Verificar que el colegio existe antes de crear la trayectoria
   - Validar que no se creen trayectorias duplicadas

3. **Optimización:**
   - Cachear la lista de colegios para evitar múltiples requests
   - Implementar búsqueda en tiempo real en el select de colegios

---

**Última actualización:** Enero 2026  
**Autor:** Mati
