# Guía Paso a Paso: Configurar Stream Chat

## 🎯 Paso 1: Obtener Credenciales de Stream

### 1.1 Crear una Nueva App en Stream

1. Ve a tu dashboard de Stream: [https://dashboard.getstream.io/](https://dashboard.getstream.io/)
2. Si acabas de crear la cuenta, puede que ya tengas una app creada automáticamente
3. Si no, haz clic en **"Create App"** o el botón **"+"** en la parte superior
4. Completa el formulario:
   - **App Name**: `Intranet Chat` (o el nombre que prefieras)
   - **Region**: Elige la más cercana (US East, EU West, etc.)
5. Haz clic en **"Create App"**

### 1.2 Encontrar API Key y API Secret

Una vez dentro de tu app, verás el dashboard. Busca:

**Opción A - Desde el Overview:**
- En la pantalla principal verás una sección con "Chat" o "API Keys"
- Busca **"API Key"** (es una cadena de texto, ejemplo: `abc123xyz456`)
- Busca **"API Secret"** (haz clic en "Show" o "Reveal" para verla - ejemplo: `xyz789abc123`)

**Opción B - Desde el Menú:**
- En el menú lateral, ve a **"Chat"** → **"Overview"** o **"Settings"**
- O busca **"API Keys"** en la configuración
- Ahí verás ambas credenciales

### 1.3 Anotar las Credenciales

**IMPORTANTE**: Copia y guarda en un lugar seguro:
- ✅ **API Key**: `________________` (publícala en variables de entorno públicas)
- 🔒 **API Secret**: `________________` (NUNCA la compartas, solo en el servidor)

---

## 🎯 Paso 2: Configurar Variables de Entorno Localmente

### 2.1 Crear/Editar `.env.local`

1. Ve a la carpeta del proyecto: `C:\Trabajo\Intranet\frontend-ubold`
2. Abre o crea el archivo `.env.local` en la raíz del proyecto
3. Agrega estas líneas (reemplaza con tus credenciales reales):

```env
# Stream Chat - Credenciales
STREAM_CHAT_API_KEY=tu_api_key_aqui
STREAM_CHAT_API_SECRET=tu_api_secret_aqui
NEXT_PUBLIC_STREAM_CHAT_API_KEY=tu_api_key_aqui
```

**Ejemplo:**
```env
STREAM_CHAT_API_KEY=abc123xyz456
STREAM_CHAT_API_SECRET=xyz789abc123def456
NEXT_PUBLIC_STREAM_CHAT_API_KEY=abc123xyz456
```

**Nota**: 
- `STREAM_CHAT_API_KEY` y `STREAM_CHAT_API_SECRET` se usan en el servidor
- `NEXT_PUBLIC_STREAM_CHAT_API_KEY` es la misma API Key pero con prefijo `NEXT_PUBLIC_` para que sea accesible en el cliente
- El API Secret NUNCA debe tener el prefijo `NEXT_PUBLIC_` (solo se usa en el servidor)

### 2.2 Verificar que `.env.local` está en `.gitignore`

Abre `.gitignore` y asegúrate de que tenga:
```
.env.local
.env*.local
```

Esto asegura que tus credenciales no se suban a Git.

---

## 🎯 Paso 3: Configurar Variables de Entorno en Railway

### 3.1 Acceder a Railway

1. Ve a [https://railway.app/](https://railway.app/)
2. Inicia sesión
3. Selecciona tu proyecto (Intranet prueba Basti o el que estés usando)

### 3.2 Agregar Variables de Entorno

1. En tu proyecto de Railway, haz clic en el servicio (el que tiene el frontend)
2. Ve a la pestaña **"Variables"** (en el menú lateral o en la parte superior)
3. Haz clic en **"+ New Variable"** o **"Add Variable"**

4. Agrega las siguientes variables (una por una):

**Variable 1:**
- **Key**: `STREAM_CHAT_API_KEY`
- **Value**: `tu_api_key_aqui` (pega tu API Key de Stream)
- Haz clic en **"Add"**

**Variable 2:**
- **Key**: `STREAM_CHAT_API_SECRET`
- **Value**: `tu_api_secret_aqui` (pega tu API Secret de Stream)
- Haz clic en **"Add"**

**Variable 3:**
- **Key**: `NEXT_PUBLIC_STREAM_CHAT_API_KEY`
- **Value**: `tu_api_key_aqui` (mismo valor que STREAM_CHAT_API_KEY)
- Haz clic en **"Add"**

### 3.3 Verificar Variables

Deberías ver 3 variables nuevas en la lista:
- ✅ `STREAM_CHAT_API_KEY`
- ✅ `STREAM_CHAT_API_SECRET`
- ✅ `NEXT_PUBLIC_STREAM_CHAT_API_KEY`

### 3.4 Reiniciar el Servicio

Después de agregar las variables:
1. Railway debería detectar los cambios automáticamente
2. Si no, puedes hacer un redeploy o simplemente esperar al próximo deploy
3. Los cambios se aplicarán en el próximo build

---

## 🎯 Paso 4: Probar la Configuración

### 4.1 Probar Localmente

1. Reinicia el servidor de desarrollo:
   ```bash
   # Detén el servidor actual (Ctrl+C)
   # Luego inicia de nuevo:
   npm run dev
   ```

2. Verifica que no haya errores en la consola

3. Navega a la página de chat en tu aplicación

### 4.2 Verificar en Railway

1. Espera a que Railway haga el deploy automático (o haz un push a tu rama)
2. Revisa los logs de build en Railway para asegurarte de que no hay errores
3. Prueba la aplicación en producción

---

## ✅ Checklist

- [ ] Cuenta de Stream creada
- [ ] App creada en Stream
- [ ] API Key copiada
- [ ] API Secret copiada
- [ ] Variables agregadas en `.env.local`
- [ ] Variables agregadas en Railway
- [ ] Servidor local reiniciado
- [ ] Deploy en Railway realizado

---

## 🆘 Solución de Problemas

### Error: "NEXT_PUBLIC_STREAM_CHAT_API_KEY no está configurada"
- Verifica que agregaste la variable en `.env.local` (local) o Railway (producción)
- Reinicia el servidor después de agregar variables

### Error: "STREAM_CHAT_API_KEY y STREAM_CHAT_API_SECRET deben estar configuradas"
- Verifica que agregaste ambas variables en Railway
- Asegúrate de que los valores son correctos (sin espacios adicionales)

### Error 401 al obtener token
- Verifica que el API Secret es correcto
- Asegúrate de que copiaste la API Secret completa (sin cortarla)

---

## 📝 Próximos Pasos

Una vez configuradas las variables de entorno, el siguiente paso es integrar Stream Chat en el componente del chat. Esto se hará actualizando `page.tsx` para usar el hook `useStreamChat`.








