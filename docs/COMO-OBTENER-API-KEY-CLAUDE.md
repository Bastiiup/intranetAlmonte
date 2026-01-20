# 🔑 Cómo Obtener la API Key de Claude (Anthropic)

## 📋 Pasos Detallados

### Paso 1: Crear Cuenta en Anthropic

1. Ve a: **https://console.anthropic.com/**
2. Haz clic en **"Sign Up"** o **"Sign In"**
3. Completa el registro con tu email
4. Verifica tu email si es necesario

### Paso 2: Acceder al Dashboard

1. Una vez dentro, verás el **Dashboard de Anthropic**
2. En el menú lateral, busca **"API Keys"** o **"API Keys"**

### Paso 3: Crear Nueva API Key

1. Haz clic en **"Create Key"** o **"New Key"**
2. Dale un nombre descriptivo (ej: "Intranet Almonte - Desarrollo")
3. **IMPORTANTE:** Selecciona el tipo de key:
   - **Development/Testing** (para desarrollo local)
   - **Production** (para producción)
4. Haz clic en **"Create Key"**

### Paso 4: Copiar la API Key

1. **⚠️ IMPORTANTE:** La key solo se muestra **UNA VEZ**
2. Copia la key completa (empieza con `sk-ant-api03-...`)
3. **Guárdala en un lugar seguro** (no la compartas)

### Paso 5: Agregar a .env.local

1. Abre el archivo `.env.local` en `AlmonteIntranet/`
2. Si no existe, créalo
3. Agrega esta línea:

```env
ANTHROPIC_API_KEY=sk-ant-api03-tu-key-aqui
```

4. **No agregues comillas** alrededor de la key
5. Guarda el archivo

### Paso 6: Reiniciar el Servidor

1. Si el servidor de desarrollo está corriendo, **detenlo** (Ctrl+C)
2. Reinicia con: `npm run dev`
3. La variable de entorno se cargará automáticamente

---

## 🔍 Verificar que Funciona

### Opción 1: Probar la Extracción

1. Ve a `/crm/listas`
2. Haz clic en una lista que tenga PDF
3. Haz clic en **"Extraer del PDF"**
4. Si funciona, verás los materiales extraídos
5. Si no funciona, verás un error específico

### Opción 2: Ver Logs del Servidor

En la consola del servidor, deberías ver:
- ✅ Si la key está configurada: `[API /crm/listas/[id]/extract-pdf POST] Enviando a Claude API...`
- ❌ Si falta la key: `ANTHROPIC_API_KEY no está configurada`

---

## 💰 Información de Costos

### Modelo: Claude 3.5 Sonnet

- **Entrada:** ~$3 por millón de tokens
- **Salida:** ~$15 por millón de tokens
- **PDF típico (5-10 páginas):** ~$0.01-0.05 por extracción
- **PDF grande (20-30 páginas):** ~$0.10-0.20 por extracción

### Límites Gratuitos

Anthropic ofrece créditos gratuitos para nuevos usuarios:
- **$5 USD** de crédito al registrarte
- Suficiente para **~100-500 extracciones** dependiendo del tamaño

### Monitoreo de Uso

1. Ve a **https://console.anthropic.com/**
2. Sección **"Usage"** o **"Billing"**
3. Verás:
   - Tokens usados
   - Costo estimado
   - Límites y créditos

---

## ⚠️ Seguridad

### ✅ Buenas Prácticas

1. **Nunca commitees** `.env.local` al repositorio
2. **No compartas** la API key públicamente
3. **Usa diferentes keys** para desarrollo y producción
4. **Rota las keys** periódicamente si es necesario

### ❌ Qué NO Hacer

- ❌ No subas `.env.local` a GitHub
- ❌ No compartas la key en chats públicos
- ❌ No uses la misma key en múltiples proyectos sin límites

---

## 🐛 Troubleshooting

### Error: "ANTHROPIC_API_KEY no está configurada"

**Causas posibles:**
1. El archivo `.env.local` no existe
2. La variable no está escrita correctamente
3. El servidor no se reinició después de agregar la variable

**Solución:**
1. Verifica que `.env.local` esté en `AlmonteIntranet/`
2. Verifica que la línea sea: `ANTHROPIC_API_KEY=sk-ant-api03-...`
3. Reinicia el servidor: `npm run dev`

### Error: "Invalid API Key"

**Causas posibles:**
1. La key está mal copiada (espacios, caracteres faltantes)
2. La key fue revocada
3. La key es de otro proyecto/environment

**Solución:**
1. Verifica que no haya espacios antes/después de la key
2. Crea una nueva key en Anthropic Console
3. Reemplaza la key en `.env.local`

### Error: "Rate limit exceeded"

**Causa:**
- Demasiadas solicitudes en poco tiempo

**Solución:**
- Espera unos minutos antes de intentar nuevamente
- Considera implementar rate limiting en el código

---

## 📞 Soporte

Si tienes problemas:

1. **Anthropic Support:** https://support.anthropic.com/
2. **Documentación:** https://docs.anthropic.com/
3. **Discord Community:** https://discord.gg/anthropic

---

## ✅ Checklist

- [ ] Cuenta creada en Anthropic
- [ ] API Key creada
- [ ] Key copiada y guardada
- [ ] Variable agregada a `.env.local`
- [ ] Servidor reiniciado
- [ ] Extracción probada y funcionando

---

**¡Listo!** Ya puedes usar la extracción de PDFs con IA. 🎉



