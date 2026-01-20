# 🚀 Guía Rápida: Probar "Etiquetas QR" Localmente

## 📋 Pasos para Ejecutar el Proyecto Localmente

### 1. Navegar al Directorio del Proyecto

```bash
cd AlmonteIntranet
```

### 2. Crear Archivo `.env.local`

Crea un archivo `.env.local` en la raíz de `AlmonteIntranet/` (mismo nivel que `package.json`):

**Ubicación:** `AlmonteIntranet/.env.local`

### 3. Configurar Variables de Entorno Mínimas

#### 🔴 MÍNIMO REQUERIDO (Para que funcione la estructura básica):

```env
# ==========================================
# Next.js Configuration
# ==========================================
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ==========================================
# Strapi Configuration (REQUERIDO para CRM y datos)
# ==========================================
NEXT_PUBLIC_STRAPI_URL=https://strapi.moraleja.cl
STRAPI_API_TOKEN=tu_token_de_strapi_aqui
```

#### 🟡 CONFIGURACIÓN COMPLETA (Recomendada):

```env
# ==========================================
# Next.js Configuration
# ==========================================
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ==========================================
# Strapi Configuration
# ==========================================
NEXT_PUBLIC_STRAPI_URL=https://strapi.moraleja.cl
STRAPI_API_TOKEN=tu_token_de_strapi_aqui

# ==========================================
# WooCommerce - Moraleja (Opcional)
# ==========================================
NEXT_PUBLIC_WOOCOMMERCE_URL_MORALEJA=https://moraleja.cl
WOO_MORALEJA_CONSUMER_KEY=ck_xxxxxxxxxxxxx
WOO_MORALEJA_CONSUMER_SECRET=cs_xxxxxxxxxxxxx

# ==========================================
# WooCommerce - Escolar (Opcional)
# ==========================================
NEXT_PUBLIC_WOOCOMMERCE_URL_ESCOLAR=https://escolar.moraleja.cl
WOO_ESCOLAR_CONSUMER_KEY=ck_xxxxxxxxxxxxx
WOO_ESCOLAR_CONSUMER_SECRET=cs_xxxxxxxxxxxxx

# ==========================================
# Stream Chat (Opcional - Solo si usas chat)
# ==========================================
STREAM_API_KEY=tu_api_key_aqui
STREAM_SECRET_KEY=tu_secret_key_aqui
NEXT_PUBLIC_STREAM_API_KEY=tu_api_key_aqui

# ==========================================
# Shipit (Opcional - Solo si usas envíos)
# ==========================================
SHIPIT_API_TOKEN=tu_token_aqui
SHIPIT_API_EMAIL=tu_email@ejemplo.com
SHIPIT_API_URL=https://api.shipit.cl/v4
NEXT_PUBLIC_SHIPIT_ENABLED=true

# ==========================================
# Haulmer / Facturación Electrónica (Opcional)
# ==========================================
HAULMER_API_KEY=tu_api_key_aqui
HAULMER_API_URL=https://dev-api.haulmer.com
HAULMER_EMISOR_RUT=12345678-9
HAULMER_EMISOR_RAZON_SOCIAL=Nombre de tu Empresa
HAULMER_EMISOR_GIRO=Giro Comercial
HAULMER_EMISOR_DIRECCION=Dirección Completa
HAULMER_EMISOR_COMUNA=Comuna
```

### 4. Obtener Token de Strapi (IMPORTANTE)

1. Ve a: **https://strapi.moraleja.cl/admin**
2. Inicia sesión con tus credenciales
3. Ve a **Settings → API Tokens**
4. Haz clic en **"Create new API Token"**
5. Completa el formulario:
   - **Name**: `Intranet Local Development`
   - **Token type**: `Full access`
   - **Token duration**: `Unlimited` (o según necesites)
6. Copia el token generado
7. Pégalo en `.env.local` como valor de `STRAPI_API_TOKEN`

⚠️ **IMPORTANTE:** Sin `STRAPI_API_TOKEN` válido, el CRM y otras secciones que usan Strapi **NO funcionarán**.

### 5. Instalar Dependencias (si es primera vez)

```bash
npm install
```

### 6. Ejecutar el Servidor de Desarrollo

```bash
npm run dev
```

### 7. Acceder a la Aplicación

Abre tu navegador en: **http://localhost:3000**

### 8. Navegar a "Etiquetas QR"

Una vez en la aplicación:

1. Ve al menú lateral izquierdo
2. Busca la sección **"COMERCIAL"**
3. Expande **"Etiquetas QR"**
4. Haz clic en **"Listado de QR"**

O directamente en el navegador:
**http://localhost:3000/comercial/etiquetas-qr**

---

## 🔍 Verificar que Funciona

### Comprobar Variables de Entorno

Puedes crear un endpoint de prueba o verificar en la consola del navegador:

```typescript
// En la consola del navegador (F12)
console.log(process.env.NEXT_PUBLIC_STRAPI_URL)
console.log(process.env.NEXT_PUBLIC_APP_URL)
```

### Probar la Ruta

1. Deberías ver la página "Etiquetas QR" con el breadcrumb
2. Deberías ver la tabla vacía con el mensaje "No hay etiquetas QR disponibles"
3. El menú lateral debería mostrar "Etiquetas QR" bajo "Comercial"

---

## ⚠️ Solución de Problemas

### Error: "STRAPI_API_TOKEN no está configurado"

**Solución:**
- Verifica que el archivo `.env.local` esté en `AlmonteIntranet/.env.local`
- Verifica que el token sea válido
- Reinicia el servidor (`Ctrl+C` y luego `npm run dev` nuevamente)

### Error: "Cannot find module" o errores de dependencias

**Solución:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### El menú no muestra "Etiquetas QR"

**Solución:**
- Verifica que hayas guardado `data.ts` correctamente
- Reinicia el servidor de desarrollo
- Limpia la caché del navegador (Ctrl+Shift+R o Cmd+Shift+R)

### La página muestra error 404

**Solución:**
- Verifica que la ruta sea correcta: `/comercial/etiquetas-qr`
- Verifica que los archivos estén en:
  - `AlmonteIntranet/src/app/(admin)/(apps)/comercial/etiquetas-qr/page.tsx`
  - `AlmonteIntranet/src/app/(admin)/(apps)/comercial/etiquetas-qr/components/EtiquetasQRListing.tsx`

### Puerto 3000 ya está en uso

**Solución:**
```bash
# Usar otro puerto
PORT=3001 npm run dev
```

O cambiar el puerto en `.env.local`:
```env
PORT=3001
```

---

## 📝 Notas Importantes

1. **`.env.local` está en `.gitignore`** - No se sube al repositorio por seguridad
2. **Reiniciar servidor** - Cualquier cambio en `.env.local` requiere reiniciar el servidor
3. **Variables con `NEXT_PUBLIC_`** - Solo estas son accesibles en el navegador
4. **Variables sin `NEXT_PUBLIC_`** - Solo accesibles en el servidor (API routes, server components)

---

## 🎯 Próximos Pasos

Una vez que funcione localmente, puedes:

1. **Implementar la API** para obtener los QR codes:
   - Crear: `AlmonteIntranet/src/app/api/comercial/etiquetas-qr/route.ts`

2. **Integrar tu código del otro repositorio**:
   - Reemplazar `EtiquetasQRListing.tsx` con tu componente
   - Adaptar los tipos de datos según tu modelo

3. **Agregar funcionalidades**:
   - Modal para crear/editar QR
   - Visualización de código QR
   - Descarga/impresión de etiquetas

---

## 📚 Documentación Adicional

- **Configuración completa**: Ver `docs/CONFIGURACION.md`
- **Guía de desarrollo**: Ver `docs/GUIA-DESARROLLO.md`
- **Integraciones**: Ver `docs/INTEGRACIONES.md`
