# Configuración de Credenciales WooCommerce

**Fecha de configuración:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

---

## ✅ Credenciales Configuradas

### WooCommerce - Escolar

```env
WOO_ESCOLAR_CONSUMER_KEY="ck_a70a60d406748d0d3d2a3334191c120c5945de9c"
WOO_ESCOLAR_CONSUMER_SECRET="cs_08e562ca6e7d78b5ec6430285e37cb7a034718cc"
NEXT_PUBLIC_WOOCOMMERCE_URL_ESCOLAR="https://staging.escolar.cl"
WOO_ESCOLAR_URL="https://staging.escolar.cl"
```

**Compatibilidad:**
- También se puede usar: `WOOCOMMERCE_CONSUMER_KEY` y `WOOCOMMERCE_CONSUMER_SECRET`
- También se puede usar: `NEXT_PUBLIC_WOOCOMMERCE_URL`

---

### WooCommerce - Moraleja

```env
WOO_MORALEJA_CONSUMER_KEY="ck_0fe9d7146066c43cb6dd07c617cc58097a8a2f1d"
WOO_MORALEJA_CONSUMER_SECRET="cs_54e171eb79302e2dd319f434cf36b53d54c3a6d2"
NEXT_PUBLIC_WOO_MORALEJA_URL="https://staging.moraleja.cl"
WOO_MORALEJA_URL="https://staging.moraleja.cl"
```

---

## 📝 Variables en el Código

### Archivo: `src/lib/woocommerce/config.ts`

El código ahora soporta múltiples nombres de variables para máxima compatibilidad:

**Para Escolar:**
- `WOO_ESCOLAR_CONSUMER_KEY` (preferido)
- `WOOCOMMERCE_CONSUMER_KEY` (compatibilidad)
- `WOO_ESCOLAR_URL` (preferido)
- `NEXT_PUBLIC_WOOCOMMERCE_URL_ESCOLAR` (preferido)
- `NEXT_PUBLIC_WOOCOMMERCE_URL` (compatibilidad)

**Para Moraleja:**
- `WOO_MORALEJA_CONSUMER_KEY`
- `WOO_MORALEJA_CONSUMER_SECRET`
- `WOO_MORALEJA_URL`
- `NEXT_PUBLIC_WOO_MORALEJA_URL`

---

## 🔧 Cambios Realizados

### 1. Archivo `config.ts` Actualizado

Se actualizó `src/lib/woocommerce/config.ts` para soportar múltiples nombres de variables:

```typescript
// Antes
export const WOOCOMMERCE_URL = process.env.NEXT_PUBLIC_WOOCOMMERCE_URL || 'https://staging.escolar.cl'
export const WOOCOMMERCE_CONSUMER_KEY = process.env.WOOCOMMERCE_CONSUMER_KEY || ''
export const WOOCOMMERCE_CONSUMER_SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET || ''

// Después (con soporte para múltiples nombres)
export const WOOCOMMERCE_URL = process.env.NEXT_PUBLIC_WOOCOMMERCE_URL_ESCOLAR 
  || process.env.WOO_ESCOLAR_URL 
  || process.env.NEXT_PUBLIC_WOOCOMMERCE_URL 
  || 'https://staging.escolar.cl'
export const WOOCOMMERCE_CONSUMER_KEY = process.env.WOO_ESCOLAR_CONSUMER_KEY 
  || process.env.WOOCOMMERCE_CONSUMER_KEY 
  || ''
export const WOOCOMMERCE_CONSUMER_SECRET = process.env.WOO_ESCOLAR_CONSUMER_SECRET 
  || process.env.WOOCOMMERCE_CONSUMER_SECRET 
  || ''
```

### 2. Archivo `.env.local` Actualizado

Se agregaron/actualizaron las siguientes variables en `.env.local`:

```env
# WooCommerce - Escolar
WOO_ESCOLAR_CONSUMER_KEY="ck_a70a60d406748d0d3d2a3334191c120c5945de9c"
WOO_ESCOLAR_CONSUMER_SECRET="cs_08e562ca6e7d78b5ec6430285e37cb7a034718cc"
NEXT_PUBLIC_WOOCOMMERCE_URL_ESCOLAR="https://staging.escolar.cl"
WOO_ESCOLAR_URL="https://staging.escolar.cl"

# WooCommerce - Moraleja
WOO_MORALEJA_CONSUMER_KEY="ck_0fe9d7146066c43cb6dd07c617cc58097a8a2f1d"
WOO_MORALEJA_CONSUMER_SECRET="cs_54e171eb79302e2dd319f434cf36b53d54c3a6d2"
NEXT_PUBLIC_WOO_MORALEJA_URL="https://staging.moraleja.cl"
WOO_MORALEJA_URL="https://staging.moraleja.cl"
```

---

## 📍 Ubicaciones en el Código

### Archivos que usan estas credenciales:

1. **`src/lib/woocommerce/config.ts`**
   - Configuración principal de WooCommerce
   - Exporta URLs y credenciales para ambas plataformas

2. **`src/lib/woocommerce/client.ts`**
   - Cliente HTTP para hacer peticiones a WooCommerce
   - Usa las credenciales de `config.ts`

3. **`src/lib/clientes/utils.ts`**
   - Funciones para enviar clientes a ambas plataformas
   - Usa variables de entorno directamente

4. **API Routes:**
   - `src/app/api/woocommerce/**/*.ts`
   - Todas las rutas API que interactúan con WooCommerce

---

## ✅ Verificación

Para verificar que las credenciales están configuradas correctamente:

1. **Verificar variables de entorno:**
   ```bash
   # Las variables deben estar en .env.local
   # El servidor Next.js las carga automáticamente
   ```

2. **Probar conexión:**
   - Las rutas API que usan WooCommerce deberían funcionar
   - Si hay errores 401, las credenciales son inválidas
   - Si hay errores 404, las URLs pueden estar incorrectas

3. **Revisar logs:**
   - El código muestra warnings si las credenciales no están configuradas
   - Buscar en la consola mensajes como: `⚠️ WooCommerce API credentials`

---

## 🔄 Sincronización

Si las credenciales cambian:

1. Actualizar `.env.local` con las nuevas credenciales
2. Reiniciar el servidor de desarrollo (`npm run dev`)
3. Si es producción, actualizar las variables de entorno en Railway/Vercel/etc.

---

## 📝 Notas Importantes

1. **Las credenciales son sensibles:**
   - No deben estar en el código fuente
   - No deben commitearse a Git (`.env.local` debe estar en `.gitignore`)
   - Solo deben estar en variables de entorno

2. **Variables públicas vs privadas:**
   - Variables con prefijo `NEXT_PUBLIC_` están disponibles en el cliente (navegador)
   - Variables sin prefijo solo están en el servidor
   - Las credenciales (`CONSUMER_KEY` y `CONSUMER_SECRET`) NO deben tener `NEXT_PUBLIC_`

3. **Plataformas de staging:**
   - Ambas URLs apuntan a staging:
     - Escolar: `https://staging.escolar.cl`
     - Moraleja: `https://staging.moraleja.cl`
   - Para producción, actualizar a las URLs de producción

---

**Configurado por:** Sistema automatizado  
**Estado:** ✅ Configurado
