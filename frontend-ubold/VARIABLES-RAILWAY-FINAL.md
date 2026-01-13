# Variables de Entorno para Railway - Nombres de Stream Dashboard

## ✅ Variables Correctas (Usando los nombres que Stream Dashboard proporciona)

Ve a Railway → Tu proyecto → Variables → "+ New Variable"

Agrega estas **2 variables**:

---

## Variable 1:

**Key (Nombre):**
```
STREAM_API_KEY
```

**Value (Valor):**
```
cpfqkqww6947
```

---

## Variable 2:

**Key (Nombre):**
```
STREAM_SECRET_KEY
```

**Value (Valor):**
```
9zx42z96w6eexq83kk5mf5dda6gb6s2rrtekgbe5we7rdmq344hpkfuq9b2qgj2n
```

---

## Variable 3 (Necesaria para el cliente del navegador):

**Key (Nombre):**
```
NEXT_PUBLIC_STREAM_API_KEY
```

**Value (Valor):**
```
cpfqkqww6947
```

**(Nota: Es el mismo valor que STREAM_API_KEY, pero con prefijo NEXT_PUBLIC_ para que sea accesible en el cliente)**

---

## ✅ Checklist Final

Después de agregar las variables, deberías tener:

- [ ] `STREAM_API_KEY` = `cpfqkqww6947`
- [ ] `STREAM_SECRET_KEY` = `9zx42z96w6eexq83kk5mf5dda6gb6s2rrtekgbe5we7rdmq344hpkfuq9b2qgj2n`
- [ ] `NEXT_PUBLIC_STREAM_API_KEY` = `cpfqkqww6947`

---

## 📝 Nota

- Las dos primeras (`STREAM_API_KEY` y `STREAM_SECRET_KEY`) son exactamente como Stream Dashboard las proporciona
- La tercera (`NEXT_PUBLIC_STREAM_API_KEY`) es necesaria para que el código del cliente del navegador pueda acceder al API Key
- El prefijo `NEXT_PUBLIC_` es requerido por Next.js para variables que se usan en el cliente








