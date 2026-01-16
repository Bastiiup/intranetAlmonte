# 🚀 Guía Completa de Despliegue Local con Cursor

Este documento contiene todas las instrucciones necesarias para desplegar el proyecto localmente usando **Cursor IDE**. Sigue los pasos en orden y podrás tener el proyecto corriendo en minutos.

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

## 📥 Paso 1: Abrir el Proyecto en Cursor

### Opción A: Si ya tienes el proyecto clonado

1. Abre **Cursor**
2. Ve a **File → Open Folder** (o `Ctrl+K Ctrl+O`)
3. Navega a la carpeta `AlmonteIntranet` y selecciónala
4. Haz clic en **Select Folder**

### Opción B: Si necesitas clonarlo

1. Abre **Cursor**
2. Abre la terminal integrada: **Terminal → New Terminal** (o `` Ctrl+` ``)
3. Ejecuta:
```bash
git clone https://github.com/subimeDev/intranetAlmonte.git
cd intranetAlmonte/AlmonteIntranet
```
4. En Cursor, ve a **File → Open Folder** y selecciona la carpeta `AlmonteIntranet`

---

## 📦 Paso 2: Instalar Dependencias

1. En Cursor, abre la terminal integrada: **Terminal → New Terminal** (o `` Ctrl+` ``)
2. Asegúrate de estar en la carpeta `AlmonteIntranet` (deberías ver `AlmonteIntranet` en la ruta)
3. Ejecuta:
```bash
npm install
```

⏱️ **Tiempo estimado:** 3-5 minutos

**Nota:** Si encuentras errores durante la instalación, en la terminal ejecuta:
```bash
# Windows PowerShell
Remove-Item -Recurse -Force node_modules, package-lock.json
npm install

# O en Git Bash / WSL
rm -rf node_modules package-lock.json
npm install
```

---

## 🔧 Paso 3: Configurar Variables de Entorno

### Crear archivo `.env.local` en Cursor

1. En Cursor, haz clic derecho en la carpeta `AlmonteIntranet` (en el explorador de archivos a la izquierda)
2. Selecciona **New File**
3. Nombra el archivo: `.env.local`
4. Pega el siguiente contenido:

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

El proyecto tiene problemas conocidos con Bootstrap 5.3+ y Next.js 16/Turbopack. Necesitas aplicar estos parches **después de instalar dependencias**.

**💡 Tip en Cursor:** Usa `Ctrl+P` para buscar archivos rápidamente.

### 4.1. Corregir `_variables.scss`

1. En Cursor, presiona `Ctrl+P` y busca: `_variables.scss`
2. Abre el archivo: `node_modules/bootstrap/scss/_variables.scss`
3. Presiona `Ctrl+G` para ir a la línea 1753 (o busca `@import "variables-dark"`)

**Busca esta línea (alrededor de la línea 1753):**
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

1. En Cursor, presiona `Ctrl+P` y busca: `_mixins.scss`
2. Abre el archivo: `node_modules/bootstrap/scss/_mixins.scss`
3. Presiona `Ctrl+G` para ir a la línea 6

**Busca esta línea (línea 6):**
```scss
@import "vendor/rfs";
```

**Reemplázala por:**
```scss
// Comentado temporalmente para evitar error de resolución en Next.js/Turbopack
// El archivo vendor/rfs ya se importa antes en app.scss
// @import "vendor/rfs";
```

**Ahora busca las líneas 11-44** (todas las importaciones de mixins). 

**💡 Tip:** En Cursor, usa `Ctrl+H` para buscar y reemplazar múltiples líneas a la vez:
1. Presiona `Ctrl+H` para abrir buscar y reemplazar
2. En "Buscar", escribe: `@import "mixins/`
3. En "Reemplazar", escribe: `@import "bootstrap/scss/mixins/`
4. Haz clic en **Replace All** (o `Ctrl+Alt+Enter`)

**O manualmente, reemplaza cada línea:**

**Antes:**
```scss
@import "mixins/deprecate";
@import "mixins/breakpoints";
@import "mixins/color-mode";
// ... etc (líneas 11-44)
```

**Después:**
```scss
@import "bootstrap/scss/mixins/deprecate";
@import "bootstrap/scss/mixins/breakpoints";
@import "bootstrap/scss/mixins/color-mode";
// ... etc
```

### 4.3. Corregir `_forms.scss`

1. En Cursor, presiona `Ctrl+P` y busca: `_forms.scss`
2. Abre el archivo: `node_modules/bootstrap/scss/_forms.scss`
3. Presiona `Ctrl+H` para buscar y reemplazar:
   - **Buscar:** `@import "forms/`
   - **Reemplazar:** `@import "bootstrap/scss/forms/`
   - Haz clic en **Replace All**

**O manualmente:**

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

1. En Cursor, presiona `Ctrl+P` y busca: `_helpers.scss`
2. Abre el archivo: `node_modules/bootstrap/scss/_helpers.scss`
3. Presiona `Ctrl+H` para buscar y reemplazar:
   - **Buscar:** `@import "helpers/`
   - **Reemplazar:** `@import "bootstrap/scss/helpers/`
   - Haz clic en **Replace All**

**O manualmente:**

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

1. En Cursor, presiona `Ctrl+P` y busca: `next.config.ts`
2. Abre el archivo: `AlmonteIntranet/next.config.ts`
3. Busca la sección `sassOptions` (alrededor de la línea 74)
4. Asegúrate de que tenga esta configuración:

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

## 🚀 Paso 5: Iniciar el Servidor en Cursor

1. En Cursor, abre la terminal integrada: **Terminal → New Terminal** (o `` Ctrl+` ``)
2. Asegúrate de estar en la carpeta `AlmonteIntranet`
3. Ejecuta uno de estos comandos:

### Opción A: Usando npm (Recomendado)

```bash
npm run dev
```

### Opción B: Usando npx (si npm run dev falla)

```bash
npx next dev
```

⏱️ **Tiempo estimado:** 30-60 segundos (primera vez puede tardar más)

**💡 Tip:** Verás el output del servidor directamente en la terminal de Cursor. Cuando veas "Ready" o "Local: http://localhost:3000", el servidor está listo.

---

## ✅ Paso 6: Verificar que Funciona

1. **En Cursor, verifica que no hay errores** en la terminal (debería decir "Ready" o similar)
2. **Abre tu navegador** en: http://localhost:3000
   - 💡 **Tip:** Puedes hacer `Ctrl+Click` en la URL en la terminal de Cursor para abrirla automáticamente
3. **Verifica que la página carga** correctamente
4. **Revisa la consola del navegador** (F12) por errores
5. **Prueba el CRM:** http://localhost:3000/crm/colegios

**✅ Si todo funciona:** ¡Felicitaciones! El proyecto está corriendo localmente.

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

⚠️ **IMPORTANTE:** Los cambios en `node_modules` se perderán si ejecutas `npm install` de nuevo. Para hacerlos permanentes usando Cursor:

### Instalar patch-package

1. En la terminal de Cursor, ejecuta:
```bash
npm install --save-dev patch-package
```

### Crear los parches

2. En la terminal de Cursor, ejecuta:
```bash
# Crear parche para Bootstrap
npx patch-package bootstrap
```

Esto creará una carpeta `patches/` con los cambios aplicados.

### Agregar script postinstall

3. En Cursor, presiona `Ctrl+P` y busca: `package.json`
4. Abre el archivo `AlmonteIntranet/package.json`
5. Busca la sección `"scripts"` y agrega:

```json
{
  "scripts": {
    "postinstall": "patch-package",
    // ... otros scripts existentes
  }
}
```

6. **Guarda el archivo** (`Ctrl+S`)

✅ **Listo:** Ahora, cada vez que ejecutes `npm install`, los parches se aplicarán automáticamente.

**💡 Tip:** Si ya creaste el parche, puedes commitear la carpeta `patches/` al repositorio para que todos tengan los mismos parches.

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

## 🎯 Comandos Rápidos en Cursor

**💡 Tip:** Todos estos comandos se ejecutan en la terminal integrada de Cursor (`` Ctrl+` ``)

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

### Atajos de Cursor Útiles

- `` Ctrl+` `` - Abrir/cerrar terminal
- `Ctrl+P` - Buscar archivos rápidamente
- `Ctrl+G` - Ir a línea específica
- `Ctrl+H` - Buscar y reemplazar
- `Ctrl+Click` - Abrir URL en navegador (desde terminal)
- `Ctrl+S` - Guardar archivo

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
