# Solución Definitiva: Error "api_key not valid"

## 🔴 Problema

El error `"api_key not valid"` aparece porque `NEXT_PUBLIC_STREAM_CHAT_API_KEY` **NO está disponible en el cliente del navegador**.

## ⚠️ CRÍTICO: Variables NEXT_PUBLIC_* en Next.js

En Next.js, las variables con prefijo `NEXT_PUBLIC_` se inyectan **EN TIEMPO DE BUILD**, no en runtime. Esto significa:

- ❌ **NO** se pueden leer desde variables de entorno en runtime
- ✅ **SÍ** se inyectan en el código JavaScript durante `npm run build`
- ⚠️ Si agregas la variable después del build, **DEBES hacer un nuevo build**

## ✅ Solución Paso a Paso

### Paso 1: Verificar en Railway

1. Ve a Railway → Tu proyecto → Variables
2. Verifica que tengas exactamente:
   - **Key**: `NEXT_PUBLIC_STREAM_CHAT_API_KEY`
   - **Value**: `cpfqkqww6947`

### Paso 2: FORZAR un Nuevo Build

**IMPORTANTE**: Railway solo inyecta variables `NEXT_PUBLIC_*` durante el build. Si agregaste la variable después del último build, necesitas forzar un rebuild.

**Opción A - Editar la variable (Recomendado):**
1. En Railway → Variables
2. Encuentra `NEXT_PUBLIC_STREAM_CHAT_API_KEY`
3. Haz clic en "Edit" o el ícono de lápiz
4. Agrega un espacio al final del valor y luego quítalo (o cualquier cambio mínimo)
5. Guarda
6. Railway detectará el cambio y hará un nuevo build automáticamente

**Opción B - Eliminar y recrear:**
1. Elimina la variable `NEXT_PUBLIC_STREAM_CHAT_API_KEY`
2. Vuelve a crearla con el mismo valor: `cpfqkqww6947`
3. Railway hará un nuevo build

**Opción C - Nuevo commit (ya hecho):**
- Ya hice un commit nuevo, esto debería forzar el rebuild
- Espera a que Railway termine el build

### Paso 3: Verificar el Build

1. Ve a Railway → Deploy Logs
2. Busca en los logs algo como:
   ```
   - Environments: .env.local
   ```
   O busca `NEXT_PUBLIC_STREAM_CHAT_API_KEY` en los logs del build
3. Verifica que no haya errores durante el build

### Paso 4: Verificar en el Navegador

Después de que Railway termine el nuevo build:

1. Recarga completamente la página (Ctrl+F5 o Cmd+Shift+R)
2. Abre la consola del navegador (F12)
3. Busca el mensaje: `[Chat] API Key disponible: Sí (oculta)`
4. Si ves `[Chat] API Key disponible: NO`, significa que Railway no hizo el rebuild o la variable no está configurada

## 🔍 Cómo Verificar si la Variable Está Disponible

Abre la consola del navegador y ejecuta:

```javascript
console.log('API Key:', process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY)
```

- ✅ Si muestra `cpfqkqww6947` → La variable está correctamente configurada
- ❌ Si muestra `undefined` → La variable NO está disponible, necesitas hacer un rebuild

## 🆘 Si Sigue Sin Funcionar

1. **Verifica que la variable esté exactamente como se muestra:**
   - Key: `NEXT_PUBLIC_STREAM_CHAT_API_KEY` (exactamente así, con mayúsculas y guiones bajos)
   - Value: `cpfqkqww6947` (sin espacios antes o después)

2. **Verifica que Railway haya terminado el build:**
   - Ve a Railway → Deploy Logs
   - Asegúrate de que el último deploy haya terminado exitosamente

3. **Limpia la caché del navegador:**
   - Ctrl+Shift+Delete → Limpia caché
   - O usa modo incógnito

4. **Verifica que el API Key sea correcto:**
   - Ve a tu dashboard de Stream: https://dashboard.getstream.io/
   - Verifica que el API Key sea `cpfqkqww6947`

## 📝 Nota Final

Las variables `NEXT_PUBLIC_*` son especiales en Next.js porque se insertan en el código JavaScript durante el build. Esto es por diseño de Next.js para optimización. Por eso es crítico que Railway haga un rebuild después de agregar o modificar estas variables.

