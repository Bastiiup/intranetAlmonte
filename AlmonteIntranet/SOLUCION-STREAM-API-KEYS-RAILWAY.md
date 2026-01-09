# Solución: Stream Chat API Keys no se toman desde Railway

## 🔍 Problema

El despliegue funciona bien, pero las API keys de Stream Chat configuradas en Railway no se están tomando correctamente.

## ⚠️ Causa Principal

En Next.js, las variables de entorno que empiezan con `NEXT_PUBLIC_*` **deben estar disponibles en tiempo de BUILD**. Si agregas las variables después de que Railway hizo el build, no estarán disponibles hasta que se vuelva a hacer el build.

## ✅ Solución

### Paso 1: Verificar Variables Configuradas

Ve a Railway → Tu proyecto → Variables y verifica que tengas estas variables:

**Para el servidor (generación de tokens):**
- `STREAM_API_KEY` = `cpfqkqww6947` (o usar `STREAM_CHAT_API_KEY`)
- `STREAM_SECRET_KEY` = `9zx42z96w6eexq83kk5mf5dda6gb6s2rrtekgbe5we7rdmq344hpkfuq9b2qgj2n` (o usar `STREAM_CHAT_API_SECRET`)

**Para el cliente (frontend del navegador):**
- `NEXT_PUBLIC_STREAM_API_KEY` = `cpfqkqww6947` (o usar `NEXT_PUBLIC_STREAM_CHAT_API_KEY`)

**Nota:** Puedes usar cualquiera de los dos conjuntos de nombres:
- `STREAM_API_KEY` / `STREAM_SECRET_KEY` / `NEXT_PUBLIC_STREAM_API_KEY` (recomendado, nombres oficiales)
- `STREAM_CHAT_API_KEY` / `STREAM_CHAT_API_SECRET` / `NEXT_PUBLIC_STREAM_CHAT_API_KEY` (alternativo)

### Paso 2: Diagnosticar el Problema

1. **Visita el endpoint de diagnóstico:**
   ```
   https://tu-dominio.com/api/test-env
   ```
   
   Esto te mostrará qué variables de Stream están disponibles.

2. **Revisa los logs del build en Railway:**
   - Ve a Railway → Tu proyecto → Deployments
   - Abre el último deployment
   - Revisa los logs del build para ver si hay errores relacionados con Stream

### Paso 3: Forzar un Nuevo Build

Si agregaste las variables después del último build, necesitas forzar un nuevo build:

**Opción A: Trigger Manual (Recomendado)**
1. Ve a Railway → Tu proyecto → Settings
2. En la sección "Source", haz clic en "Redeploy"
3. O simplemente haz un pequeño cambio en cualquier variable (agrega y quita un espacio) para forzar un nuevo deploy

**Opción B: Push a Git**
1. Haz un pequeño cambio (ej: agregar un espacio en blanco en cualquier archivo)
2. Haz commit y push
3. Railway hará un nuevo build automáticamente

### Paso 4: Verificar que Funciona

Después del nuevo build:

1. **Verifica el endpoint de diagnóstico:**
   ```
   GET /api/test-env
   ```
   
   Deberías ver:
   ```json
   {
     "hasStreamApiKey": true,
     "hasStreamSecretKey": true,
     "hasNextPublicStreamApiKey": true,
     "streamApiKeyVar": "STREAM_API_KEY",
     "streamSecretKeyVar": "STREAM_SECRET_KEY",
     "nextPublicStreamApiKeyVar": "NEXT_PUBLIC_STREAM_API_KEY"
   }
   ```

2. **Prueba el chat:**
   - Ve a la página del chat en tu aplicación
   - Debería conectarse correctamente sin errores de API key

## 🔧 Cambios Realizados en el Código

Se mejoró el manejo de errores para proporcionar información más detallada:

1. **`/lib/stream/client.ts`**: Ahora muestra qué variables están disponibles cuando falta alguna
2. **`/app/(admin)/(apps)/chat/page.tsx`**: Mejor mensaje de error con instrucciones
3. **`/api/test-env`**: Agregado diagnóstico de variables de Stream Chat

## 📝 Checklist de Verificación

- [ ] Variables configuradas en Railway (`STREAM_API_KEY`, `STREAM_SECRET_KEY`, `NEXT_PUBLIC_STREAM_API_KEY`)
- [ ] Variables agregadas ANTES del build (o forzado un nuevo build después de agregarlas)
- [ ] Build completado exitosamente en Railway
- [ ] `/api/test-env` muestra que las variables están disponibles
- [ ] Chat funciona correctamente sin errores de API key

## 🚨 Errores Comunes

### Error: "NEXT_PUBLIC_STREAM_API_KEY no está configurada"

**Causa:** La variable no está disponible en el cliente.

**Solución:**
1. Verifica que `NEXT_PUBLIC_STREAM_API_KEY` esté configurada en Railway
2. Fuerza un nuevo build (las variables `NEXT_PUBLIC_*` deben estar en tiempo de build)
3. Verifica que el build se completó correctamente

### Error: "STREAM_API_KEY y STREAM_SECRET_KEY deben estar configuradas"

**Causa:** Las variables del servidor no están disponibles.

**Solución:**
1. Verifica que `STREAM_API_KEY` (o `STREAM_CHAT_API_KEY`) y `STREAM_SECRET_KEY` (o `STREAM_CHAT_API_SECRET`) estén configuradas en Railway
2. Verifica que el servicio se haya vuelto a desplegar después de agregar las variables
3. Revisa los logs del servidor para ver el error completo con diagnóstico

## 💡 Notas Importantes

1. **Variables `NEXT_PUBLIC_*` son públicas**: Estas variables son accesibles en el cliente del navegador, por lo que solo deben contener valores que sea seguro exponer públicamente (como el API Key de Stream, que está diseñado para ser público).

2. **Variables sin `NEXT_PUBLIC_` son privadas**: `STREAM_SECRET_KEY` nunca debe tener el prefijo `NEXT_PUBLIC_` porque es secreta y solo debe usarse en el servidor.

3. **Build necesario**: Cada vez que agregas o cambias variables `NEXT_PUBLIC_*`, necesitas un nuevo build para que estén disponibles.

4. **Nombres alternativos**: El código acepta ambos conjuntos de nombres (`STREAM_API_KEY` / `STREAM_CHAT_API_KEY`), así que puedes usar cualquiera que prefieras, pero mantén consistencia.



