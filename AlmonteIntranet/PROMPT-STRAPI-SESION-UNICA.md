# Configuración de Sesión Única en Strapi

## 📋 Resumen

Este documento contiene las instrucciones para configurar el campo `session_token` en Strapi que permite implementar sesión única (un usuario solo puede tener una sesión activa a la vez).

## 🎯 Objetivo

Implementar sesión única: cuando un usuario inicia sesión desde un nuevo dispositivo/navegador, todas las sesiones anteriores se invalidan automáticamente.

## 🔧 Configuración en Strapi

### Paso 1: Agregar campo `session_token` al Content Type `intranet-colaboradores`

1. Ve a **Content-Type Builder** en Strapi
2. Selecciona el Content Type **`intranet-colaboradores`**
3. Haz clic en **"Add another field"**
4. Configura el campo:
   - **Name**: `session_token`
   - **Type**: `Text`
   - **Required**: ❌ No (opcional, para compatibilidad con sesiones antiguas)
   - **Unique**: ❌ No
   - **Default value**: (dejar vacío)
   - **Private**: ✅ Sí (recomendado, para seguridad)
5. Haz clic en **"Finish"**
6. Haz clic en **"Save"** en la parte superior

### Paso 2: Configurar permisos

1. Ve a **Settings** → **Users & Permissions plugin** → **Roles** → **Public**
2. En la sección **`intranet-colaboradores`**, asegúrate de que:
   - **find**: ✅ Permitido (para verificar token de sesión)
   - **findOne**: ✅ Permitido (para verificar token de sesión)
   - **update**: ✅ Permitido (para actualizar token de sesión al hacer login/logout)

## 📝 Notas Importantes

- El campo `session_token` almacena un UUID único generado en cada login
- Cuando un usuario hace login, se genera un nuevo token y se guarda en Strapi
- Si el mismo usuario hace login desde otro lugar, el token anterior se reemplaza
- Las sesiones anteriores detectan que su token no coincide y se cierran automáticamente
- El campo es opcional para mantener compatibilidad con sesiones antiguas (sin token)

## ✅ Verificación

Después de configurar:

1. Haz login desde un navegador/dispositivo
2. Haz login desde otro navegador/dispositivo con la misma cuenta
3. La primera sesión debería cerrarse automáticamente
4. Solo la segunda sesión debería permanecer activa

## 🔍 Debugging

Si el sistema de sesión única no funciona:

1. Verifica que el campo `session_token` existe en Strapi
2. Verifica que los permisos están configurados correctamente
3. Revisa los logs del servidor para ver mensajes de verificación de token
4. Verifica que el token se está guardando en las cookies del navegador

