# 🚀 Guía Completa de Despliegue Local

Este documento contiene todas las instrucciones necesarias para desplegar el proyecto localmente en tu máquina.

---

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- ✅ **Node.js** >= 20.9.0
- ✅ **npm** >= 10.0.0
- ✅ **Git** (para clonar el repositorio)
- ✅ Acceso a Strapi (https://strapi.moraleja.cl)

### Verificar Versiones

```bash
# Verificar Node.js
node --version
# Debe mostrar: v20.9.0 o superior

# Verificar npm
npm --version
# Debe mostrar: 10.0.0 o superior
```

Si no tienes Node.js instalado, descárgalo desde: https://nodejs.org/

---

## 📥 Paso 1: Clonar/Navegar al Proyecto

### Si ya tienes el proyecto clonado:

```bash
cd AlmonteIntranet
```

### Si necesitas clonarlo:

```bash
git clone https://github.com/subimeDev/intranetAlmonte.git
cd intranetAlmonte/AlmonteIntranet
```

---

## 📦 Paso 2: Instalar Dependencias

```bash
npm install
```

⏱️ **Tiempo estimado:** 3-5 minutos

**Nota:** Si encuentras errores durante la instalación, intenta:
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## 🔧 Paso 3: Configurar Variables de Entorno

### Crear archivo `.env.local`

Crea un archivo `.env.local` en la raíz de `AlmonteIntranet/` con el siguiente contenido:

```env
# ==========================================
# Next.js Configuration
# ==========================================
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ==========================================
# Strapi Configuration (REQUERIDO)
# ==========================================
NEXT_PUBLIC_STRAPI_URL=https://strapi.moraleja.cl
STRAPI_API_TOKEN=tu_token_de_strapi_aqui

# ⚠️ IMPORTANTE: Reemplaza 'tu_token_de_strapi_aqui' con tu token real
```

### Obtener Token de Strapi

1. Accede a: https://strapi.moraleja.cl/admin
2. Ve a **Settings → API Tokens**
3. Haz clic en **Create new API Token**
4. Configura:
   - **Name:** "Desarrollo Local"
   - **Token type:** "Full access"
   - **Token duration:** "Unlimited"
5. Haz clic en **Save**
6. **Copia el token generado** (solo se muestra una vez)
7. Pégalo en `.env.local` como `STRAPI_API_TOKEN=tu_token_aqui`

⚠️ **CRÍTICO:** Sin el token de Strapi, el módulo CRM y otras funcionalidades **NO funcionarán**.

---

## 🔨 Paso 4: Corregir Errores de Bootstrap Sass (IMPORTANTE)

El proyecto tiene problemas conocidos con Bootstrap 5.3+ y Next.js 16/Turbopack. Necesitas aplicar estos parches **después de instalar dependencias**:

### 4.1. Corregir `_variables.scss`

Edita el archivo: `node_modules/bootstrap/scss/_variables.scss`

**Busca la línea 1753:**
```scss
@import "variables-dark"; // TODO: can be removed safely in v6, only here to avoid breaking changes in v5.3
```

**Reemplázala por:**
```scss
// Comentado temporalmente para evitar error de resolución en Next.js/Turbopack
// El archivo variables-dark ya se importa después de variables en app.scss
// @import "variables-dark"; // TODO: can be removed safely in v6, only here to avoid breaking changes in v5.3
```

### 4.2. Corregir `_mixins.scss`

Edita el archivo: `node_modules/bootstrap/scss/_mixins.scss`

**Busca la línea 6:**
```scss
@import "vendor/rfs";
```

**Reemplázala por:**
```scss
// Comentado temporalmente para evitar error de resolución en Next.js/Turbopack
// El archivo vendor/rfs ya se importa antes en app.scss
// @import "vendor/rfs";
```

**Busca las líneas 11-44** (todas las importaciones de mixins) y reemplaza todas las rutas relativas por absolutas:

**Antes:**
```scss
@import "mixins/deprecate";
@import "mixins/breakpoints";
@import "mixins/color-mode";
// ... etc
```

**Después:**
```scss
@import "bootstrap/scss/mixins/deprecate";
@import "bootstrap/scss/mixins/breakpoints";
@import "bootstrap/scss/mixins/color-mode";
// ... etc
```

### 4.3. Corregir `_forms.scss`

Edita el archivo: `node_modules/bootstrap/scss/_forms.scss`

**Reemplaza todas las importaciones relativas por absolutas:**

**Antes:**
```scss
@import "forms/labels";
@import "forms/form-text";
// ... etc
```

**Después:**
```scss
@import "bootstrap/scss/forms/labels";
@import "bootstrap/scss/forms/form-text";
// ... etc
```

### 4.4. Corregir `_helpers.scss`

Edita el archivo: `node_modules/bootstrap/scss/_helpers.scss`

**Reemplaza todas las importaciones relativas por absolutas:**

**Antes:**
```scss
@import "helpers/clearfix";
@import "helpers/color-bg";
// ... etc
```

**Después:**
```scss
@import "bootstrap/scss/helpers/clearfix";
@import "bootstrap/scss/helpers/color-bg";
// ... etc
```

### 4.5. Verificar `next.config.ts`

Asegúrate de que `next.config.ts` tenga esta configuración en `sassOptions`:

```typescript
sassOptions: {
  includePaths: [
    './src/assets/scss',
    './node_modules/bootstrap/scss',
    './node_modules',
  ],
  silenceDeprecations: ['legacy-js-api'],
},
```

---

## 🚀 Paso 5: Iniciar el Servidor

### Opción A: Usando npm

```bash
npm run dev
```

### Opción B: Usando npx (si npm run dev falla)

```bash
npx next dev
```

### Opción C: Usando el script de PowerShell (Windows)

```powershell
.\iniciar-local.ps1
```

⏱️ **Tiempo estimado:** 30-60 segundos (primera vez puede tardar más)

---

## ✅ Paso 6: Verificar que Funciona

1. **Abre tu navegador** en: http://localhost:3000
2. **Verifica que la página carga** correctamente
3. **Revisa la consola del navegador** (F12) por errores
4. **Prueba el CRM:** http://localhost:3000/crm/colegios

---

## 🔍 Solución de Problemas Comunes

### ❌ Error: "Cannot find module"

```bash
# Solución: Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

**Luego vuelve a aplicar los parches de Bootstrap (Paso 4)**

### ❌ Error: "Port 3000 is already in use"

**Windows PowerShell:**
```powershell
# Encontrar el proceso usando el puerto
netstat -ano | findstr :3000

# Matar el proceso (reemplaza <PID> con el número que aparece)
taskkill /PID <PID> /F
```

**O usar otro puerto:**
```bash
npm run dev -- -p 3001
```

### ❌ Error: "STRAPI_API_TOKEN no está configurado"

- Verifica que el archivo `.env.local` existe en `AlmonteIntranet/`
- Verifica que `STRAPI_API_TOKEN` tiene un valor válido
- Reinicia el servidor después de cambiar `.env.local`

### ❌ Error: "Can't find stylesheet to import" (Bootstrap)

Esto significa que no aplicaste los parches del Paso 4. Vuelve a ese paso y aplica todas las correcciones.

### ❌ Error: "next no se reconoce como comando"

```bash
# Usar npx en su lugar
npx next dev
```

### ❌ Error: "Error al cargar colegios/contactos"

- Verifica que el token de Strapi es válido
- Verifica que Strapi está accesible: https://strapi.moraleja.cl
- Revisa la consola del navegador (F12) para más detalles

---

## 🔄 Hacer los Parches Permanentes (Opcional pero Recomendado)

Los cambios en `node_modules` se perderán si ejecutas `npm install` de nuevo. Para hacerlos permanentes:

### Instalar patch-package

```bash
npm install --save-dev patch-package
```

### Crear los parches

```bash
# Crear parche para Bootstrap
npx patch-package bootstrap
```

### Agregar script postinstall

Edita `package.json` y agrega en la sección `scripts`:

```json
{
  "scripts": {
    "postinstall": "patch-package"
  }
}
```

Ahora, cada vez que ejecutes `npm install`, los parches se aplicarán automáticamente.

---

## 📝 Checklist Final

Antes de comenzar a desarrollar, verifica:

- [ ] Node.js >= 20.9.0 instalado
- [ ] npm >= 10.0.0 instalado
- [ ] Proyecto clonado/navegado
- [ ] Dependencias instaladas (`npm install` ejecutado)
- [ ] Archivo `.env.local` creado
- [ ] `STRAPI_API_TOKEN` configurado y válido
- [ ] Parches de Bootstrap aplicados (Paso 4)
- [ ] Servidor ejecutando (`npm run dev`)
- [ ] Aplicación accesible en `http://localhost:3000`
- [ ] CRM funcionando correctamente

---

## 🎯 Comandos Rápidos

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Build de producción (para probar)
npm run build

# Iniciar servidor de producción (requiere build)
npm run start

# Verificar tipos TypeScript
npm run type-check

# Ejecutar linter
npm run lint
```

---

## 📚 Documentación Adicional

- **Configuración completa:** `docs/CONFIGURACION.md`
- **Guía de desarrollo:** `docs/GUIA-DESARROLLO.md`
- **Deployment:** `docs/DEPLOYMENT.md`
- **Checklist de despliegue:** `CHECKLIST-DESPLIEGUE-LOCAL.md`

---

## 🆘 ¿Necesitas Ayuda?

Si encuentras problemas que no están cubiertos en esta guía:

1. Revisa la consola del navegador (F12) para errores
2. Revisa los logs del servidor en la terminal
3. Verifica que todas las variables de entorno estén configuradas
4. Asegúrate de haber aplicado todos los parches de Bootstrap

---

## ✅ ¡Listo para Desarrollar!

Una vez que hayas completado todos los pasos, deberías tener el proyecto corriendo localmente en `http://localhost:3000`.

**¡Feliz desarrollo!** 🎉
