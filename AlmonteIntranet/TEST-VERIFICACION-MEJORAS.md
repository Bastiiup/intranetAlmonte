# 🧪 Guía de Verificación - Mejoras Implementadas

## ✅ Checklist de Verificación

### 1. **Validación de Permisos** 🔐
- [ ] **Sin sesión activa:**
  - Intentar aprobar un producto → Debe mostrar error 401
  - Intentar aprobar lista completa → Debe mostrar error 401
  - Intentar procesar PDF → Debe mostrar error 401

- [ ] **Con sesión activa:**
  - Todas las operaciones deben funcionar normalmente

**URLs para probar:**
```
POST /api/crm/listas/[id]/aprobar-producto
POST /api/crm/listas/aprobar-lista
POST /api/crm/listas/[id]/procesar-pdf
```

---

### 2. **Aprobación Individual de Productos** ✅
- [ ] Click en checkbox de un producto:
  - [ ] Debe mostrar spinner mientras procesa
  - [ ] El estado debe actualizarse inmediatamente (optimistic update)
  - [ ] Si falla, debe revertir el cambio
  - [ ] Mostrar mensaje de error claro si falla

- [ ] Verificar en consola del navegador:
  - [ ] Fecha de aprobación usa zona horaria de Chile
  - [ ] Logs muestran operación exitosa

- [ ] Cuando todos los productos están aprobados:
  - [ ] Estado de lista cambia a "revisado"
  - [ ] Se muestra mensaje de confirmación

**Página para probar:**
```
http://localhost:3000/crm/listas/[id]/validacion
```

---

### 3. **Aprobación Completa de Lista** 📋
- [ ] Click en "Aprobar Lista Completa":
  - [ ] Debe mostrar "Aprobando..." con spinner
  - [ ] Botón debe estar deshabilitado durante proceso
  - [ ] Todos los productos deben marcarse como aprobados
  - [ ] Estado de lista debe cambiar a "revisado"

- [ ] Verificar en listado del colegio:
  - [ ] El estado se refleja correctamente
  - [ ] Badge muestra "Revisado" o "Aprobado"
  - [ ] Fecha de revisión se muestra correctamente

- [ ] Verificar en consola:
  - [ ] Una sola llamada PUT a Strapi (no dos)
  - [ ] Fecha usa zona horaria de Chile

**Páginas para probar:**
```
http://localhost:3000/crm/listas/[id]/validacion
http://localhost:3000/crm/listas/colegio/[colegioId]
```

---

### 4. **Filtros y Búsqueda** 🔍
- [ ] **Input de búsqueda:**
  - [ ] Escribir nombre de producto → Filtra en tiempo real
  - [ ] Limpiar búsqueda → Muestra todos los productos
  - [ ] Búsqueda case-insensitive (mayúsculas/minúsculas)

- [ ] **Select de filtro de estado:**
  - [ ] "Todos los estados" → Muestra todos
  - [ ] "Solo aprobados" → Solo productos con `validado: true`
  - [ ] "Solo pendientes" → Solo productos con `validado: false`

- [ ] **Combinación de filtros:**
  - [ ] Búsqueda + Filtro de estado → Funciona correctamente
  - [ ] Tab (disponibles/no disponibles) + Búsqueda → Funciona correctamente
  - [ ] Badge muestra cantidad correcta de resultados

- [ ] **Rendimiento:**
  - [ ] Filtros no causan lag en listas grandes
  - [ ] `useMemo` funciona correctamente

**Página para probar:**
```
http://localhost:3000/crm/listas/[id]/validacion
```

---

### 5. **Procesamiento de PDF** 📄
- [ ] **PDF nuevo:**
  - [ ] Procesar PDF que no ha sido procesado → Funciona
  - [ ] Productos se extraen correctamente
  - [ ] Coordenadas se generan correctamente

- [ ] **PDF duplicado:**
  - [ ] Intentar procesar PDF ya procesado → Error 409
  - [ ] Mensaje: "Este PDF ya fue procesado anteriormente"
  - [ ] Muestra fecha de procesamiento anterior

- [ ] **PDF grande:**
  - [ ] Intentar procesar PDF > 10MB → Error 413
  - [ ] Mensaje muestra tamaño actual y máximo
  - [ ] Sugerencia de comprimir PDF

- [ ] **Verificar en consola:**
  - [ ] Logs muestran validación de permisos
  - [ ] Logs muestran validación de tamaño
  - [ ] Logs muestran validación de duplicados

**Página para probar:**
```
http://localhost:3000/crm/listas/[id]/validacion
```

---

### 6. **Normalización de IDs** 🔢
- [ ] **IDs numéricos:**
  - [ ] Aprobar producto con ID numérico → Funciona
  - [ ] Búsqueda de producto por ID numérico → Funciona

- [ ] **IDs string:**
  - [ ] Aprobar producto con ID string → Funciona
  - [ ] Búsqueda de producto por ID string → Funciona

- [ ] **IDs mixtos:**
  - [ ] Lista con IDs numéricos y strings → Todos funcionan
  - [ ] Comparaciones de IDs funcionan correctamente

**Verificar en:**
- Consola del navegador (logs)
- Network tab (requests/responses)

---

### 7. **Manejo de Errores** ⚠️
- [ ] **Errores de red:**
  - [ ] Desconectar internet → Mensaje claro
  - [ ] Reconectar → Operación se puede reintentar

- [ ] **Errores del servidor:**
  - [ ] Error 500 → Mensaje claro al usuario
  - [ ] Error 404 → Mensaje específico
  - [ ] Error 401 → Mensaje de no autorizado

- [ ] **Errores de validación:**
  - [ ] Campos faltantes → Mensaje específico
  - [ ] Datos inválidos → Mensaje claro

- [ ] **Errores silenciosos:**
  - [ ] `estado_revision` no existe → No rompe, guarda en metadata
  - [ ] Logs muestran advertencias pero no errores críticos

**Verificar en:**
- Consola del navegador
- Network tab
- Mensajes al usuario (alerts/toasts)

---

### 8. **Estados de Loading** ⏳
- [ ] **Aprobación individual:**
  - [ ] Spinner en checkbox durante aprobación
  - [ ] Checkbox deshabilitado durante proceso
  - [ ] Spinner desaparece al completar

- [ ] **Aprobación completa:**
  - [ ] Botón muestra "Aprobando..." con spinner
  - [ ] Botón deshabilitado durante proceso
  - [ ] Estado vuelve a normal al completar

- [ ] **Procesamiento PDF:**
  - [ ] Loading state visible durante procesamiento
  - [ ] Mensaje claro de progreso

**Verificar en:**
- UI (spinners visibles)
- Botones deshabilitados
- Estados no se quedan "colgados"

---

### 9. **Fechas con Zona Horaria de Chile** 🕐
- [ ] **Verificar en base de datos (Strapi):**
  - [ ] `fecha_aprobacion` usa zona horaria de Chile
  - [ ] `fecha_revision` usa zona horaria de Chile
  - [ ] `fecha_actualizacion` usa zona horaria de Chile

- [ ] **Verificar en UI:**
  - [ ] Fechas se muestran correctamente
  - [ ] Formato es legible

**Verificar en:**
- Strapi admin panel
- Logs de consola
- UI de la aplicación

---

### 10. **Normalización de Strapi** 🔄
- [ ] **Datos de Strapi v5:**
  - [ ] Datos con `attributes` se normalizan correctamente
  - [ ] Datos sin `attributes` funcionan correctamente
  - [ ] `versiones_materiales` se extrae correctamente

- [ ] **Consistencia:**
  - [ ] Todos los endpoints usan normalización centralizada
  - [ ] No hay código duplicado de normalización

**Verificar en:**
- Network tab (responses)
- Consola del navegador (logs)
- UI (datos se muestran correctamente)

---

## 🐛 Problemas Conocidos a Verificar

### Problema 1: Estado de Aprobación No Se Refleja
- [ ] Aprobar lista completa
- [ ] Verificar que estado cambia en listado del colegio
- [ ] Si no cambia, verificar:
  - [ ] `revalidatePath` se ejecuta
  - [ ] `router.refresh()` se llama
  - [ ] Cache de Next.js se invalida

### Problema 2: Highlighting en PDF No Es Exacto
- [ ] Click en producto
- [ ] Verificar que resaltado amarillo aparece
- [ ] Verificar que punto rojo está en coordenadas
- [ ] Nota: Las coordenadas son aproximadas (no exactas)

---

## 📊 Métricas de Éxito

### Rendimiento
- [ ] Filtros responden en < 100ms
- [ ] Aprobación individual completa en < 2s
- [ ] Aprobación completa completa en < 5s

### UX
- [ ] Loading states visibles en todas las operaciones
- [ ] Mensajes de error claros y útiles
- [ ] Feedback inmediato en acciones del usuario

### Seguridad
- [ ] Todas las operaciones requieren autenticación
- [ ] Errores no exponen información sensible
- [ ] Validación de permisos en todos los endpoints

---

## 🔧 Comandos Útiles para Debugging

### Ver logs en consola del navegador:
```javascript
// Filtrar logs de ValidacionLista
console.log('[ValidacionLista]')

// Filtrar logs de API
console.log('[Aprobar Producto]')
console.log('[Aprobar Lista]')
console.log('[Procesar PDF]')
```

### Verificar en Network tab:
- Filtrar por "aprobar" o "procesar"
- Verificar status codes (200, 401, 409, 413, 500)
- Verificar request/response bodies

### Verificar en Strapi:
- Ir a Content Manager → Cursos
- Verificar campos: `estado_revision`, `fecha_revision`, `versiones_materiales`
- Verificar que fechas usan zona horaria correcta

---

## ✅ Resultado Final Esperado

Después de completar esta verificación, deberías tener:
- ✅ Sistema robusto con validación de permisos
- ✅ UX mejorada con loading states y filtros
- ✅ Manejo de errores claro y útil
- ✅ Fechas correctas con zona horaria de Chile
- ✅ IDs normalizados funcionando correctamente
- ✅ Validaciones de seguridad y tamaño de PDF

---

## 📝 Notas

- Si encuentras algún problema, documenta:
  1. Qué estabas haciendo
  2. Qué esperabas que pasara
  3. Qué pasó realmente
  4. Logs de consola/network
  5. Screenshots si es necesario

- Para problemas críticos, revisa:
  - `PROBLEMAS-DESTACADO-Y-APROBACION.md`
  - `CONTEXTO-COMPLETO-SISTEMA-VALIDACION.md`
