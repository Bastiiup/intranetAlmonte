# Solución: Error "api_key not valid" en Stream Chat

## 🔴 Problema

El error `"api_key not valid"` indica que `NEXT_PUBLIC_STREAM_CHAT_API_KEY` no está disponible en el cliente del navegador.

## ✅ Solución

En Next.js, las variables con prefijo `NEXT_PUBLIC_` se inyectan en **tiempo de build**, no en runtime. Esto significa que:

1. **Si agregaste la variable después del último build**, necesitas hacer un **nuevo build y deploy**
2. **Railway debe hacer un rebuild automático** cuando detecta cambios en las variables de entorno

## 📋 Pasos para Solucionarlo

### Opción 1: Forzar un nuevo build en Railway (Recomendado)

1. Ve a Railway → Tu proyecto → Variables
2. Verifica que `NEXT_PUBLIC_STREAM_CHAT_API_KEY` está configurada correctamente
3. Haz un **pequeño cambio** en cualquier variable (agrega y elimina un espacio) o **elimina y vuelve a agregar** `NEXT_PUBLIC_STREAM_CHAT_API_KEY`
4. Esto forzará a Railway a hacer un nuevo build

### Opción 2: Hacer un commit nuevo

1. Haz un pequeño cambio en cualquier archivo (puede ser un comentario)
2. Haz commit y push
3. Railway hará un nuevo build automáticamente

### Opción 3: Verificar que la variable está correctamente configurada

Asegúrate de que en Railway tengas exactamente:

- **Key**: `NEXT_PUBLIC_STREAM_CHAT_API_KEY`
- **Value**: `cpfqkqww6947` (sin espacios al inicio o final)

## ⚠️ Nota Importante

Las variables `NEXT_PUBLIC_*` se insertan en el código JavaScript durante el build. Si cambias estas variables después del build, **debes hacer un nuevo build** para que los cambios surtan efecto.

## 🔍 Verificación

Después del nuevo build, puedes verificar en la consola del navegador que la variable está disponible:

```javascript
console.log(process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY)
```

Debería mostrar: `cpfqkqww6947`

Si muestra `undefined`, significa que la variable no está configurada o el build no se hizo después de agregarla.








