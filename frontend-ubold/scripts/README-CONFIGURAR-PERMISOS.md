# Configurar Permisos de Chat en Strapi

Este script configura los permisos necesarios para el content type `intranet-chats` en el rol "Authenticated" de Strapi.

## Problema

Los mensajes bidireccionales no funcionan porque el rol "Authenticated" no tiene permisos de `find` en el content type `intranet-chats`. Esto hace que la Query 2 siempre devuelva 0 resultados.

## Solución

El script configura automáticamente los siguientes permisos:
- `find`: Obtener lista de mensajes
- `findOne`: Obtener un mensaje específico
- `create`: Crear nuevos mensajes
- `update`: Actualizar mensajes
- `delete`: Eliminar mensajes

## Cómo Ejecutar

### Opción 1: Con token como argumento

```bash
node scripts/configurar-permisos-chat.js TU_TOKEN_AQUI
```

### Opción 2: Con variable de entorno (PowerShell)

```powershell
$env:STRAPI_API_TOKEN="tu_token_aqui"
node scripts/configurar-permisos-chat.js
```

### Opción 3: Con archivo .env.local

Crea o edita `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_STRAPI_URL=https://strapi.moraleja.cl
STRAPI_API_TOKEN=tu_token_aqui
```

Luego ejecuta:

```bash
node scripts/configurar-permisos-chat.js
```

## Dónde Obtener el Token

1. Ve al admin de Strapi: `https://strapi.moraleja.cl/admin`
2. Settings → API Tokens
3. Crea un nuevo token o usa uno existente con permisos de "Full access"
4. Copia el token

## Verificación

Después de ejecutar el script, deberías ver:

```
✅ Permisos actualizados correctamente!
📋 Resumen:
   - Rol: Authenticated (authenticated)
   - Content Type: intranet-chat
   - Permisos configurados: find, findOne, create, update, delete
```

## Notas

- Puede ser necesario reiniciar Strapi para que los cambios surtan efecto
- Si el script falla, verifica que el token tenga permisos de administrador
- Los permisos se agregan sin eliminar los existentes

