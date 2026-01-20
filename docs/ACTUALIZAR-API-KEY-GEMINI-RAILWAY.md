# 🔑 Actualizar API Key de Gemini en Railway (Urgente)

## ⚠️ Problema: API Key Reportada como Filtrada (Leaked)

Si ves este error en producción:

```
Error: [403 Forbidden] Your API key was reported as leaked. Please use another API key.
```

Significa que tu API key de Google Gemini fue reportada como filtrada y Google la ha deshabilitado por seguridad. **Necesitas crear una nueva API key y actualizarla en Railway.**

---

## 📋 Pasos para Solucionarlo

### Paso 1: Crear Nueva API Key de Gemini

1. **Ve a Google AI Studio**: https://aistudio.google.com/
2. **Inicia sesión** con tu cuenta de Google
3. **Ve a "Get API key"** o directamente: https://aistudio.google.com/app/apikey
4. **Haz clic en "Create API Key"** o **"Crear clave de API"**
5. Selecciona un proyecto (o crea uno nuevo)
6. **Copia la nueva API key** (empieza con `AIza...`)
7. **⚠️ IMPORTANTE**: Guárdala en un lugar seguro

> 💡 **Nota**: Si quieres usar la misma API key antigua, primero debes eliminarla/revocarla en Google Cloud Console para poder crear una nueva con el mismo nombre.

---

### Paso 2: Actualizar API Key en Railway

1. **Ve a Railway**: https://railway.app/
2. **Selecciona tu proyecto** (intranetalmonte-production)
3. **Haz clic en el servicio** (AlmonteIntranet)
4. **Ve a la pestaña "Variables"**
5. **Busca la variable** `GEMINI_API_KEY`
6. **Haz clic en el lápiz** (icono de editar) o en la variable
7. **Reemplaza el valor** con la nueva API key
8. **Haz clic en "Save"** o **"Guardar"**

---

### Paso 3: Verificar que Funciona

1. **Railway redeployará automáticamente** cuando guardes la variable
2. **Espera 1-2 minutos** para que el deploy termine
3. **Ve a tu aplicación** y prueba extraer un PDF de una lista
4. **Si funciona correctamente**, verás los productos extraídos sin errores

---

## 🔍 Verificar el Deploy

### Opción 1: Logs de Railway

1. Ve a Railway → Tu proyecto → Servicio → **"Deployments"** o **"Logs"**
2. Busca mensajes como:
   - ✅ `Build successful`
   - ✅ `Deploy successful`
   - ❌ Si hay errores, verás `Build failed` o `Deploy failed`

### Opción 2: Probar en la App

1. Ve a `/crm/listas` en tu aplicación
2. Selecciona una lista con PDF
3. Haz clic en **"Extraer del PDF"** o **"Procesar PDF"**
4. Si funciona, verás los productos extraídos
5. Si no funciona, verás un mensaje de error específico

---

## 🐛 Troubleshooting

### Error: "GEMINI_API_KEY no está configurada"

**Causa**: La variable de entorno no se guardó correctamente o el deploy falló.

**Solución**:
1. Verifica que `GEMINI_API_KEY` esté en la lista de variables de Railway
2. Verifica que el valor no tenga espacios al inicio/final
3. Verifica que no tenga comillas alrededor (debe ser: `AIzaSy...`, NO: `"AIzaSy..."`)
4. Espera 2-3 minutos y vuelve a intentar
5. Si persiste, revisa los logs de Railway para ver errores

### Error: "API key not valid" o "403 Forbidden"

**Causa**: La nueva API key no es válida o no tiene permisos.

**Solución**:
1. Verifica que copiaste la API key completa (no cortada)
2. Verifica que no haya espacios antes/después
3. Crea una nueva API key en Google AI Studio
4. Verifica que la API esté habilitada en Google Cloud Console:
   - Ve a: https://console.cloud.google.com/
   - Ve a: **APIs & Services → Library**
   - Busca: **"Generative Language API"**
   - Si no está habilitada, haz clic en **"Enable"**

### Error: "Quota exceeded" o "Rate limit exceeded"

**Causa**: Has alcanzado el límite de solicitudes (15 por minuto o 1,500 por día).

**Solución**:
- Espera unos minutos antes de intentar nuevamente
- O espera hasta el siguiente día para que se resetee el límite diario

---

## 🔒 Prevención: Seguridad de API Keys

### ✅ Buenas Prácticas

1. **Nunca commitees** API keys al repositorio
2. **No compartas** API keys públicamente
3. **Usa diferentes keys** para desarrollo y producción
4. **Restringe la key** en Google Cloud Console (opcional pero recomendado)
5. **Revoca keys** antiguas cuando las reemplaces

### Restringir API Key en Google Cloud (Recomendado)

1. Ve a **Google Cloud Console**: https://console.cloud.google.com/
2. Ve a **APIs & Services → Credentials**
3. Haz clic en tu API key
4. En **"API restrictions"**, selecciona **"Restrict key"**
5. Selecciona solo **"Generative Language API"**
6. En **"Application restrictions"**, puedes restringir por:
   - **HTTP referrers** (websites) - Recomendado
   - **IP addresses** - Si Railway tiene IPs fijas
7. Guarda los cambios

---

## 📚 Documentación Relacionada

- **Cómo obtener API key**: Ver `docs/COMO-OBTENER-API-KEY-GEMINI.md`
- **Configuración general**: Ver `docs/CONFIGURACION.md`
- **Documentación de despliegue**: Ver `docs/DEPLOYMENT.md`

---

## ✅ Checklist

- [ ] Nueva API key creada en Google AI Studio
- [ ] API key copiada y guardada de forma segura
- [ ] Variable `GEMINI_API_KEY` actualizada en Railway
- [ ] Deploy completado exitosamente
- [ ] Extracción de PDF probada y funcionando
- [ ] API key antigua revocada (opcional pero recomendado)
- [ ] Nueva API key restringida en Google Cloud Console (opcional pero recomendado)

---

## 🎯 Resumen Rápido

1. **Crear nueva API key** en https://aistudio.google.com/app/apikey
2. **Actualizar `GEMINI_API_KEY`** en Railway → Variables
3. **Esperar deploy** (1-2 minutos)
4. **Probar extracción** de PDF

**¡Listo!** Tu aplicación debería funcionar correctamente con la nueva API key. 🎉

