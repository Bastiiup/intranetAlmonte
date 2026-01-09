# 📝 Cambios en Intranet/Frontend - CRM

**Fecha:** Enero 2026  
**Rama:** `prueba-mati`

---

## 🎯 Resumen

Cambios realizados en el frontend (intranet) para mejorar el manejo de datos del CRM y debugging del flujo de información desde Strapi.

---

## 📋 Cambios Realizados

### 1. **API Route: `/api/crm/colegios/[id]/route.ts`**

**Cambios:**
- ✅ Mejorado el `populate` manual para incluir todas las relaciones necesarias (incluyendo `persona_trayectorias`)
- ✅ Agregados logs de debugging condicionales para inspeccionar la estructura de datos recibida
- ✅ Mejorado el manejo de diferentes formatos de respuesta de Strapi

**Nota sobre `populate=deep`:**
- ⚠️ **IMPORTANTE:** La sintaxis `populate=deep` no está soportada en esta versión de Strapi
- Se usa populate manual con la sintaxis `populate[field]=true` para relaciones anidadas
- Se agregaron relaciones para `persona_trayectorias` y sus relaciones anidadas

**Código actualizado:**
```typescript
const paramsObj = new URLSearchParams({
  'populate[comuna]': 'true',
  'populate[telefonos]': 'true',
  'populate[emails]': 'true',
  'populate[direcciones]': 'true',
  'populate[cartera_asignaciones][populate][ejecutivo]': 'true',
  'populate[persona_trayectorias][populate][persona]': 'true',
  'populate[persona_trayectorias][populate][colegio]': 'true',
  'populate[persona_trayectorias][populate][curso]': 'true',
  'populate[persona_trayectorias][populate][asignatura]': 'true',
})
```

**Razón:** Esta versión de Strapi no soporta `populate=deep`, por lo que se usa populate manual explícito para todas las relaciones necesarias.

---

### 2. **Componente: `ColegioDetailPage.tsx`**

**Cambios:**
- ✅ Agregados logs de debugging condicionales para entender la estructura de datos
- ✅ Mejorado el manejo de diferentes formatos de respuesta de Strapi
- ✅ Acceso a datos tanto desde `colegio.attributes` como directamente desde `colegio`

**Código agregado:**
```typescript
// Debug: ver qué datos tenemos (solo en desarrollo)
if (process.env.NODE_ENV === 'development') {
  console.log('[ColegioDetailPage] colegio object keys:', Object.keys(colegio))
  console.log('[ColegioDetailPage] persona_trayectorias:', colegio.persona_trayectorias)
  console.log('[ColegioDetailPage] colegio.attributes:', colegio.attributes)
}

// Manejar diferentes formatos de respuesta de Strapi
const colegioData = colegio.attributes || colegio
const trayectorias = colegioData.persona_trayectorias?.data || colegioData.persona_trayectorias || []
```

**Razón:** Strapi puede devolver datos en diferentes formatos dependiendo de si usa `documentId` vs `id`, si está publicado o en draft, etc. Este código maneja todos los casos.

---

### 3. **Logs de Debugging Condicionales**

**Cambios:**
- ✅ Todos los `console.log` de debugging ahora son condicionales basados en `process.env.NODE_ENV === 'development'`
- ✅ Los `console.error` se mantienen para producción (errores críticos)
- ✅ Creada función helper `debugLog` para facilitar el logging condicional

**Implementación:**
```typescript
// Helper para logs condicionales
const DEBUG = process.env.NODE_ENV === 'development' || process.env.DEBUG_CRM === 'true'

const debugLog = (...args: any[]) => {
  if (DEBUG) {
    console.log(...args)
  }
}

// Uso
debugLog('[API /crm/colegios/[id] GET] Buscando colegio con ID:', id)
```

**Razón:** Los logs de debugging son útiles durante el desarrollo pero pueden impactar el performance en producción y exponer información sensible.

---

## ⚠️ Logs de Debugging

**IMPORTANTE:** Se agregaron múltiples `console.log` condicionales en el código para debugging. Estos solo se ejecutan en desarrollo o cuando `DEBUG_CRM=true`.

### Logs agregados:

1. **En `/api/crm/colegios/[id]/route.ts`:**
   - Log de respuesta completa de Strapi (solo desarrollo)
   - Log de existencia de `persona_trayectorias` (solo desarrollo)
   - Log de tipo y estructura de `persona_trayectorias` (solo desarrollo)

2. **En `ColegioDetailPage.tsx`:**
   - Log de keys del objeto colegio (solo desarrollo)
   - Log de `persona_trayectorias` raw (solo desarrollo)
   - Log de `attributes` si existe (solo desarrollo)
   - Log de cantidad de trayectorias encontradas (solo desarrollo)
   - Log de datos de trayectorias (solo desarrollo)

**Recomendación:** Los logs condicionales están configurados para ejecutarse solo en desarrollo. Si necesitas debugging en producción, puedes establecer la variable de entorno `DEBUG_CRM=true`.

---

## 🔧 Variables de Entorno Requeridas

**No hay cambios en las variables de entorno.** Se siguen usando las mismas:

```env
STRAPI_URL=http://localhost:1337
STRAPI_API_TOKEN=your-token-here
```

**Nueva variable opcional:**
```env
DEBUG_CRM=true  # Opcional: activa logs de debugging en producción
```

---

## 📦 Dependencias

**No se agregaron nuevas dependencias.** Los cambios son solo en el código existente.

---

## 🐛 Problemas Conocidos / Pendientes

1. **Logs de debugging:** ✅ **RESUELTO** - Ahora son condicionales
2. **populate manual:** ⚠️ **ACTUALIZADO** - Se usa populate manual porque `populate=deep` no está soportado en esta versión de Strapi. Se incluyen todas las relaciones necesarias explícitamente.
3. **Manejo de errores:** Podría mejorarse para dar mensajes más específicos al usuario

---

## ✅ Compatibilidad

- ✅ **Compatible con versiones anteriores:** No hay breaking changes
- ✅ **Strapi v4:** Todos los cambios son compatibles con Strapi v4
- ✅ **Next.js:** Compatible con la versión actual de Next.js

---

## 🧪 Testing

**Para probar los cambios:**

1. Abrir la consola del navegador (F12)
2. Navegar a `/crm/colegios/[id]` (donde `[id]` es un ID de colegio válido)
3. Revisar los logs en la consola (solo en desarrollo):
   - En Network tab: verificar la respuesta de `/api/crm/colegios/[id]`
   - En Console tab: verificar los logs de debugging (solo en desarrollo)
4. Verificar que la tabla de "Colaboradores" muestre datos correctamente

---

## 📚 Archivos Modificados

```
AlmonteIntranet/src/app/api/crm/
├── colegios/[id]/route.ts                    (modificado)
└── colegios/[id]/contacts/route.ts          (modificado - logs condicionales)

AlmonteIntranet/src/app/(admin)/(apps)/crm/
└── colegios/[id]/page.tsx                    (modificado - logs condicionales)
```

---

## 🚀 Próximos Pasos Recomendados

1. ✅ **Logs condicionales:** Completado
2. ⚠️ **Monitorear performance de `populate=deep`:** Revisar tiempos de respuesta en producción con grandes volúmenes de datos
3. **Optimización futura:** Si `populate=deep` causa problemas de performance, considerar volver a populate manual pero más optimizado
4. **Agregar manejo de errores** más robusto con mensajes específicos al usuario

---

## 📊 Impacto en Performance

**Populate manual:**
- ✅ **Ventaja:** Control explícito sobre qué relaciones se populan
- ⚠️ **Consideración:** Puede ser más costoso en términos de tiempo de respuesta y ancho de banda con grandes volúmenes de datos
- 📈 **Recomendación:** Monitorear los tiempos de respuesta en producción. Si se detectan problemas, considerar:
  - Reducir el número de relaciones populadas según necesidad
  - Implementar paginación
  - Cachear respuestas cuando sea apropiado
- ⚠️ **Nota:** `populate=deep` no está disponible en esta versión de Strapi, por lo que se usa populate manual

---

**Última actualización:** Enero 2026  
**Autor:** Mati
