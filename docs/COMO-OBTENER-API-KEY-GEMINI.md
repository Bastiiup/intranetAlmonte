# 🔑 Cómo Obtener la API Key de Google Gemini (Gratis)

## 📋 Pasos Detallados

### Paso 1: Acceder a Google AI Studio

1. Ve a: **https://aistudio.google.com/**
2. Inicia sesión con tu cuenta de Google
3. Si es la primera vez, acepta los términos y condiciones

### Paso 2: Obtener API Key

1. Una vez dentro, verás el dashboard de **Google AI Studio**
2. En el menú lateral izquierdo, busca **"Get API key"** o **"API Keys"**
3. O haz clic directamente en: **https://aistudio.google.com/app/apikey**

### Paso 3: Crear Nueva API Key

1. Haz clic en **"Create API Key"** o **"Crear clave de API"**
2. Selecciona un proyecto de Google Cloud:
   - Si tienes proyectos existentes, selecciona uno
   - Si no, se creará uno automáticamente
3. Haz clic en **"Create API key in new project"** o **"Crear clave de API en un proyecto nuevo"**

### Paso 4: Copiar la API Key

1. **⚠️ IMPORTANTE:** La key se mostrará en una ventana emergente
2. Copia la key completa (empieza con `AIza...`)
3. **Guárdala en un lugar seguro** (no la compartas)
4. Puedes cerrar la ventana después de copiarla

### Paso 5: Agregar a .env.local

1. Abre el archivo `.env.local` en `AlmonteIntranet/`
2. Si no existe, créalo
3. Agrega esta línea:

```env
GEMINI_API_KEY=AIzaSy-tu-key-aqui
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
- ✅ Si la key está configurada: `[API /crm/listas/[id]/extract-pdf POST] Enviando a Google Gemini...`
- ❌ Si falta la key: `GEMINI_API_KEY no está configurada`

---

## 💰 Información de Costos

### Modelo: Gemini 1.5 Flash

- **✅ GRATIS** para uso general
- **Límite:** 15 solicitudes por minuto (RPM)
- **Límite diario:** 1,500 solicitudes por día (RPD)
- **Sin tarjeta de crédito** requerida inicialmente

### Límites de Tokens

- **Entrada:** 1 millón de tokens por solicitud
- **Salida:** 8,192 tokens por solicitud
- **Suficiente** para PDFs de hasta ~50-100 páginas

### Cuando se Acaban los Límites Gratuitos

Si necesitas más:
1. Puedes esperar hasta el siguiente día (límite diario se resetea)
2. O configurar facturación en Google Cloud (opcional)
3. Con facturación: $0.075 por millón de tokens de entrada

---

## ⚠️ Seguridad

### ✅ Buenas Prácticas

1. **Nunca commitees** `.env.local` al repositorio
2. **No compartas** la API key públicamente
3. **Usa diferentes keys** para desarrollo y producción
4. **Restringe la key** en Google Cloud Console (opcional)

### Restringir API Key (Opcional pero Recomendado)

1. Ve a **Google Cloud Console**: https://console.cloud.google.com/
2. Ve a **APIs & Services → Credentials**
3. Haz clic en tu API key
4. En **"API restrictions"**, selecciona **"Restrict key"**
5. Selecciona solo **"Generative Language API"**
6. Guarda los cambios

---

## 🐛 Troubleshooting

### Error: "GEMINI_API_KEY no está configurada"

**Causas posibles:**
1. El archivo `.env.local` no existe
2. La variable no está escrita correctamente
3. El servidor no se reinició después de agregar la variable

**Solución:**
1. Verifica que `.env.local` esté en `AlmonteIntranet/`
2. Verifica que la línea sea: `GEMINI_API_KEY=AIzaSy-...`
3. Reinicia el servidor: `npm run dev`

### Error: "API key not valid"

**Causas posibles:**
1. La key está mal copiada (espacios, caracteres faltantes)
2. La key fue revocada
3. La key no tiene permisos para Generative Language API

**Solución:**
1. Verifica que no haya espacios antes/después de la key
2. Crea una nueva key en Google AI Studio
3. Verifica que la API esté habilitada en Google Cloud Console

### Error: "Quota exceeded" o "Rate limit exceeded"

**Causa:**
- Se alcanzó el límite de solicitudes (15 por minuto o 1,500 por día)

**Solución:**
- Espera unos minutos antes de intentar nuevamente
- O espera hasta el siguiente día para que se resetee el límite diario

### Error: "Generative Language API has not been used"

**Causa:**
- La API no está habilitada en tu proyecto de Google Cloud

**Solución:**
1. Ve a **Google Cloud Console**: https://console.cloud.google.com/
2. Ve a **APIs & Services → Library**
3. Busca **"Generative Language API"**
4. Haz clic en **"Enable"** o **"Habilitar"**

---

## 📞 Soporte

Si tienes problemas:

1. **Google AI Studio Help:** https://support.google.com/aistudio
2. **Documentación Gemini:** https://ai.google.dev/docs
3. **Google Cloud Support:** https://cloud.google.com/support

---

## ✅ Checklist

- [ ] Cuenta de Google creada/iniciada sesión
- [ ] API Key creada en Google AI Studio
- [ ] Key copiada y guardada
- [ ] Variable agregada a `.env.local`
- [ ] Servidor reiniciado
- [ ] Extracción probada y funcionando

---

## 🎯 Ventajas de Gemini

- ✅ **Gratis** para uso general
- ✅ **Sin tarjeta de crédito** inicialmente
- ✅ **Límites generosos** (1,500 solicitudes/día)
- ✅ **Rápido** (Gemini Flash es muy veloz)
- ✅ **Bueno con documentos** y tablas
- ✅ **Fácil de configurar**

---

**¡Listo!** Ya puedes usar la extracción de PDFs con Gemini de forma gratuita. 🎉



