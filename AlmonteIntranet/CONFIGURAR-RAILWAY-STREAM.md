# Configurar Stream Chat en Railway

## ✅ Credenciales Configuradas Localmente

Ya configuré las credenciales en tu `.env.local` localmente. Ahora necesitas agregarlas en Railway para producción.

## 🚀 Pasos para Configurar en Railway

### Paso 1: Ir a Railway

1. Ve a [https://railway.app/](https://railway.app/)
2. Inicia sesión
3. Selecciona tu proyecto (probablemente "Intranet prueba Basti")

### Paso 2: Agregar Variables de Entorno

1. **Haz clic en tu servicio** (el que tiene el frontend desplegado)

2. **Ve a la pestaña "Variables"** (en el menú lateral izquierdo o en la parte superior)

3. **Haz clic en "+ New Variable"** o **"Add Variable"** (botón verde o azul)

4. **Agrega las siguientes 3 variables** (una por una):

---

#### Variable 1:
- **Key (Nombre)**: `STREAM_CHAT_API_KEY`
- **Value (Valor)**: `cpfqkqww6947`
- Haz clic en **"Add"** o **"Save"**

#### Variable 2:
- **Key (Nombre)**: `STREAM_CHAT_API_SECRET`
- **Value (Valor)**: `9zx42z96w6eexq83kk5mf5dda6gb6s2rrtekgbe5we7rdmq344hpkfuq9b2qgj2n`
- Haz clic en **"Add"** o **"Save"**

#### Variable 3:
- **Key (Nombre)**: `NEXT_PUBLIC_STREAM_CHAT_API_KEY`
- **Value (Valor)**: `cpfqkqww6947` (igual que la primera)
- Haz clic en **"Add"** o **"Save"**

---

### Paso 3: Verificar

Deberías ver estas 3 variables en tu lista:
- ✅ `STREAM_CHAT_API_KEY` = `cpfqkqww6947`
- ✅ `STREAM_CHAT_API_SECRET` = `9zx42z96w6eexq83kk5mf5dda6gb6s2rrtekgbe5we7rdmq344hpkfuq9b2qgj2n`
- ✅ `NEXT_PUBLIC_STREAM_CHAT_API_KEY` = `cpfqkqww6947`

### Paso 4: Redeploy (si es necesario)

- Railway debería detectar los cambios automáticamente
- Si no, puedes hacer un nuevo commit y push, o simplemente esperar al próximo deploy
- Las variables se aplicarán en el próximo build

---

## ✅ Checklist

- [x] Credenciales configuradas en `.env.local` (local)
- [ ] `STREAM_CHAT_API_KEY` agregada en Railway
- [ ] `STREAM_CHAT_API_SECRET` agregada en Railway
- [ ] `NEXT_PUBLIC_STREAM_CHAT_API_KEY` agregada en Railway
- [ ] Deploy realizado en Railway

---

## 📝 Nota de Seguridad

✅ Las credenciales están guardadas correctamente:
- `.env.local` está en `.gitignore` (no se subirá a Git)
- El API Secret solo se usa en el servidor (nunca se expone al cliente)

