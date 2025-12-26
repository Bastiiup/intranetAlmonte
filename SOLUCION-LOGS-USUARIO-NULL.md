# Solución: Logs con usuario NULL

## 🔴 Problema Identificado

Los logs en Strapi tienen `usuario: null` cuando deberían tener el ID del colaborador asociado.

## ✅ Cambios Implementados

### 1. Logging Detallado en `getUserFromRequest`

**Archivo**: `frontend-ubold/src/lib/logging/service.ts`

**Cambios**:
- Agregado logging al inicio de la función para rastrear el flujo
- Logging detallado de cookies desde `request.cookies`
- Logging del header `Cookie` cuando no hay cookies en `request.cookies`
- Logging de la estructura completa del colaborador parseado

**Logs agregados**:
```typescript
console.log('[Logging] 🔍 [getUserFromRequest] Iniciando extracción de usuario...')
console.log('[Logging] 🔍 [getUserFromRequest] Cookies desde request.cookies:', {...})
console.log('[Logging] 🔍 [getUserFromRequest] Cookie header completo:', ...)
```

### 2. Logging en `logActivity`

**Archivo**: `frontend-ubold/src/lib/logging/service.ts`

**Cambios**:
- Logging del usuario extraído antes de asociarlo al log
- Logging del body completo que se envía a Strapi
- Verificación del tipo de dato del usuario (number, string, null)

**Logs agregados**:
```typescript
console.log('[Logging] 🔍 [logActivity] Usuario extraído:', {...})
console.log('[Logging] 📤 Enviando a Strapi:', {
  bodyCompleto: JSON.stringify(bodyToSend, null, 2),
  ...
})
```

### 3. Populate Mejorado en `/api/logs/usuarios`

**Archivo**: `frontend-ubold/src/app/api/logs/usuarios/route.ts`

**Cambio**:
```typescript
// ANTES:
populate[usuario][fields]=email_login&populate[usuario][populate][persona][fields]=...

// AHORA:
populate[usuario][populate][persona]=*&populate[usuario][fields]=email_login,id,documentId
```

**Razón**: Usar `populate[persona]=*` asegura que se traigan todos los campos de persona, no solo los especificados.

### 4. Logging en Procesamiento de Logs

**Archivo**: `frontend-ubold/src/app/api/logs/usuarios/route.ts`

**Cambios**:
- Logging de los primeros 3 logs para ver su estructura
- Logging cuando `usuario` es NULL
- Logging de la clave de agrupación (emailKey) y asociación de IPs

**Logs agregados**:
```typescript
addDebugLog(`[API /logs/usuarios] 🔍 Log #${index} - usuario: ${usuario ? 'EXISTE' : 'NULL'}`)
addDebugLog(`[API /logs/usuarios] 🔍 Log #${index} - emailKey: "${emailKey}"`)
```

## 🔍 Pasos para Debugging

### 1. Verificar que el Usuario se Capture en `logActivity`

**En los logs del servidor, busca**:
```
[Logging] 🔍 [getUserFromRequest] Iniciando extracción de usuario...
[Logging] 🔍 [getUserFromRequest] Cookies desde request.cookies: ...
[Logging] 🔍 Colaborador desde cookie: ...
[Logging] 🔍 [logActivity] Usuario extraído: ...
[Logging] ✅ Usuario capturado para log: ...
```

**Si ves**:
- `⚠️ No se encontró cookie colaboradorData ni colaborador` → Las cookies no se están pasando
- `❌ No se pudo extraer ID del colaborador` → El ID no está en la estructura esperada
- `⚠️ No se pudo capturar usuario para log` → El usuario no se extrajo correctamente

### 2. Verificar el Body que se Envía a Strapi

**En los logs del servidor, busca**:
```
[Logging] 📤 Enviando a Strapi: {
  bodyCompleto: {...},
  usuarioId: ...,
  tieneUsuario: true/false
}
```

**Verifica que**:
- `tieneUsuario: true`
- `usuarioId` sea un número (no null)
- El `bodyCompleto` tenga `data.usuario` con el ID

### 3. Verificar el Populate en `/api/logs/usuarios`

**En los logs del servidor, busca**:
```
[API /logs/usuarios] 🔍 Log #0 - usuario: EXISTE/NULL
[API /logs/usuarios] 🔍 Log #0 - usuario estructura: {...}
```

**Si `usuario: NULL`**:
- El log se creó sin usuario asociado
- Revisa los logs anteriores para ver por qué no se capturó el usuario

**Si `usuario: EXISTE`**:
- Verifica que tenga `email_login`
- Verifica que tenga `persona` con los datos de nombre

### 4. Verificar la Agrupación por Email

**En los logs del servidor, busca**:
```
[API /logs/usuarios] 🔍 Log #0 - emailKey: "mati@gmail.com"
[API /logs/usuarios] ✅ Asociando IP 181.172.250.7 con email mati@gmail.com
```

**Verifica que**:
- `emailKey` sea el email, no `id_123`
- Las IPs se asocien correctamente a emails

## 🐛 Problemas Comunes y Soluciones

### Problema 1: Cookies no se pasan desde el navegador

**Síntoma**: `⚠️ No se encontró cookie colaboradorData ni colaborador`

**Solución**:
1. Verificar que después del login, la cookie `colaboradorData` se establezca correctamente
2. Verificar que las cookies tengan `httpOnly: false` y `sameSite: 'lax'`
3. Verificar que el dominio de las cookies sea correcto

### Problema 2: ID no se extrae de la cookie

**Síntoma**: `❌ No se pudo extraer ID del colaborador`

**Solución**:
1. Revisar la estructura de la cookie `colaboradorData` en el navegador (DevTools → Application → Cookies)
2. Verificar que la cookie tenga `id` o `documentId` en el nivel superior
3. Si no está, modificar `/api/auth/login/route.ts` para asegurar que se guarde el ID

### Problema 3: Usuario es NULL en Strapi

**Síntoma**: Los logs en Strapi tienen `usuario: null`

**Solución**:
1. Verificar que `logData.usuario` tenga un valor antes de enviar a Strapi
2. Verificar que el formato sea correcto (número, no objeto)
3. Verificar que Strapi acepte el ID del colaborador en la relación `usuario`

### Problema 4: Populate no trae usuario

**Síntoma**: En `/api/logs/usuarios`, `logData.usuario` es null aunque el log tenga usuario

**Solución**:
1. Verificar que el populate incluya `populate[usuario]=*` o campos específicos
2. Verificar que la relación `usuario` en Strapi esté configurada correctamente
3. Probar con diferentes formatos de populate

## 📋 Checklist de Verificación

- [ ] Después del login, la cookie `colaboradorData` tiene `id` o `documentId`
- [ ] `getUserFromRequest` extrae correctamente el ID del colaborador
- [ ] `logActivity` asocia el usuario al log antes de enviar a Strapi
- [ ] El body enviado a Strapi tiene `data.usuario` con el ID
- [ ] Los logs en Strapi tienen `usuario` con el ID (no null)
- [ ] El populate en `/api/logs/usuarios` trae el usuario completo
- [ ] La agrupación usa `email_login` cuando el usuario existe
- [ ] Los logs anónimos se asocian a usuarios reales cuando comparten IP

## 🚀 Próximos Pasos

1. **Probar con un usuario real**: Iniciar sesión con `prueba@prueba.com` y realizar una acción
2. **Revisar los logs del servidor**: Buscar los mensajes de logging agregados
3. **Verificar en Strapi**: Comprobar que el log tenga `usuario` con el ID
4. **Verificar en la tabla**: Comprobar que se agrupe por email y muestre el nombre correcto

## 📝 Notas Importantes

1. **El logging es extenso**: Esto es intencional para debugging. Una vez resuelto, se pueden reducir los logs.

2. **El populate puede variar**: Dependiendo de la versión de Strapi, el formato del populate puede cambiar. Si no funciona, probar con `populate[usuario]=*`.

3. **Las cookies pueden no pasarse en SSR**: Si las cookies no se pasan desde Server Components, asegurarse de pasarlas manualmente en los fetch internos.

4. **El ID puede estar en diferentes lugares**: La búsqueda recursiva debería encontrar el ID en cualquier estructura, pero si no funciona, revisar la estructura exacta de la cookie.

