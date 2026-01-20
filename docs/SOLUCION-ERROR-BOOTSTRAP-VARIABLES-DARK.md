# 🔧 Soluciones para el Error de Bootstrap `variables-dark`

## 📋 Problema Identificado

**Error:**
```
Error: Can't find stylesheet to import.
@import "variables-dark"; // en node_modules/bootstrap/scss/_variables.scss línea 1753
```

**Causa Raíz:**
- Bootstrap 5.3.8 tiene un `@import "variables-dark"` en su archivo interno `_variables.scss`
- Este import se ejecuta cuando Bootstrap procesa sus variables
- SASS busca `variables-dark` desde el contexto de `node_modules/bootstrap/scss/`
- Aunque el archivo existe en `src/assets/scss/_variables-dark.scss`, SASS no lo encuentra porque el path de resolución no está disponible cuando Bootstrap hace su import interno

---

## ✅ Soluciones (Ordenadas por Recomendación)

### **Solución 1: Usar `sassOptions.additionalData` en Next.js** ⭐ (RECOMENDADA)

**Descripción:** Inyectar el import de `variables-dark` antes de que Bootstrap lo procese.

**Ubicación:** `AlmonteIntranet/next.config.ts`

**Cambios Necesarios:**

```typescript
sassOptions: {
  includePaths: [
    './src/assets/scss',
    './node_modules/bootstrap/scss',
  ],
  additionalData: `@import "variables-dark";`, // Agregar esta línea
  silenceDeprecations: ['legacy-js-api'],
},
```

**Pros:**
- ✅ No modifica archivos de Bootstrap
- ✅ Persiste entre reinstalaciones
- ✅ SASS resuelve el import antes de que Bootstrap lo necesite

**Contras:**
- ⚠️ Puede causar importaciones duplicadas (pero SASS las maneja con `@use`/`@import`)

**Nota:** Si causa duplicaciones, necesitarás ajustar `app.scss` para remover la línea 13 `@import "variables-dark";`

---

### **Solución 2: Crear Archivo Stub en node_modules** 

**Descripción:** Crear un archivo vacío o con placeholder en `node_modules/bootstrap/scss/_variables-dark.scss`

**Pasos:**

1. Crear archivo: `AlmonteIntranet/node_modules/bootstrap/scss/_variables-dark.scss`
2. Dejar el archivo vacío o agregar:
```scss
// Variables dark mode - Inyectadas desde src/assets/scss/_variables-dark.scss
// Este archivo es un stub para evitar errores de compilación
// Las variables reales se importan en app.scss
```

**Pros:**
- ✅ Solución rápida y directa
- ✅ Bootstrap encuentra el archivo inmediatamente

**Contras:**
- ❌ Se pierde al ejecutar `npm install` o `npm ci`
- ❌ Requiere recrear el archivo después de cada instalación
- ⚠️ No es una solución permanente

**Para Hacerlo Permanente:**
- Usar `patch-package` (ver Solución 4)

---

### **Solución 3: Usar `patch-package` para Modificar Bootstrap**

**Descripción:** Modificar Bootstrap y crear un patch que se aplica automáticamente después de `npm install`

**Pasos:**

1. **Instalar patch-package:**
```bash
cd AlmonteIntranet
npm install -D patch-package
```

2. **Agregar script a `package.json`:**
```json
"scripts": {
  "postinstall": "patch-package"
}
```

3. **Crear archivo stub:**
   - Crear `node_modules/bootstrap/scss/_variables-dark.scss` (vacío o con placeholder)

4. **Crear el patch:**
```bash
npx patch-package bootstrap
```

5. **Commitear el patch:**
   - El patch se creará en `patches/bootstrap-5.3.8.patch`
   - Agregar a git: `git add patches/`

**Pros:**
- ✅ Solución permanente
- ✅ Se aplica automáticamente después de `npm install`
- ✅ Funciona en CI/CD

**Contras:**
- ⚠️ Requiere mantener el patch actualizado cuando Bootstrap se actualiza

---

### **Solución 4: Modificar Orden de Imports en `app.scss`**

**Descripción:** Importar `variables-dark` ANTES de `bootstrap/scss/variables`

**Ubicación:** `AlmonteIntranet/src/assets/scss/app.scss`

**Cambios Necesarios:**

```scss
// Core files
@import "bootstrap/scss/functions";

// IMPORTAR variables-dark ANTES de bootstrap/scss/variables
@import "variables-dark";

// Ahora importar variables de Bootstrap
@import "bootstrap/scss/variables";

@import "variables";
// Remover esta línea: @import "variables-dark"; // Ya se importó arriba
```

**Pros:**
- ✅ Cambio simple en un solo archivo
- ✅ No requiere modificar Bootstrap

**Contras:**
- ❌ Puede no funcionar porque Bootstrap busca el archivo desde su propio contexto
- ⚠️ Las variables dark pueden no estar disponibles cuando Bootstrap las necesita

**Probabilidad de Éxito:** Media-Baja

---

### **Solución 5: Crear Archivo Simbólico (Symlink)**

**Descripción:** Crear un symlink desde `node_modules/bootstrap/scss/_variables-dark.scss` hacia `src/assets/scss/_variables-dark.scss`

**Pasos (Windows - PowerShell como Admin):**

```powershell
cd AlmonteIntranet
New-Item -ItemType SymbolicLink -Path "node_modules\bootstrap\scss\_variables-dark.scss" -Target "src\assets\scss\_variables-dark.scss"
```

**Pasos (Linux/Mac):**

```bash
cd AlmonteIntranet
ln -s ../../../src/assets/scss/_variables-dark.scss node_modules/bootstrap/scss/_variables-dark.scss
```

**Pros:**
- ✅ Apunta al archivo real (no duplicación)
- ✅ Se actualiza automáticamente si cambias el archivo original

**Contras:**
- ❌ Se pierde al ejecutar `npm install` o `npm ci`
- ⚠️ Requiere recrear después de cada instalación
- ⚠️ En Windows puede requerir permisos de administrador

---

### **Solución 6: Configurar `sassOptions.loadPaths` con Path Absoluto**

**Descripción:** Usar path absoluto en lugar de relativo

**Ubicación:** `AlmonteIntranet/next.config.ts`

**Cambios Necesarios:**

```typescript
import path from 'path'

const nextConfig: NextConfig = {
  // ... resto de configuración
  sassOptions: {
    includePaths: [
      path.join(__dirname, 'src/assets/scss'),
      path.join(__dirname, 'node_modules/bootstrap/scss'),
    ],
    silenceDeprecations: ['legacy-js-api'],
  },
}
```

**Pros:**
- ✅ Paths más explícitos
- ✅ Puede resolver mejor los imports

**Contras:**
- ⚠️ Puede no resolver el problema porque Bootstrap busca desde su propio contexto

---

### **Solución 7: Downgrade a Bootstrap 5.3.7 o Anterior**

**Descripción:** Usar una versión de Bootstrap que no tenga este problema

**Pasos:**

1. En `package.json`, cambiar:
```json
"bootstrap": "^5.3.7" // o versión anterior
```

2. Ejecutar:
```bash
npm install
```

**Pros:**
- ✅ Evita el problema completamente

**Contras:**
- ❌ Pierdes features de Bootstrap 5.3.8
- ❌ No es una solución a largo plazo

---

## 🎯 Recomendación Final

**Usar Solución 1 (`additionalData`)** porque:
- Es la más limpia y mantenible
- No requiere modificar archivos de terceros
- Funciona consistentemente
- Es compatible con CI/CD

Si la Solución 1 no funciona, usar **Solución 3 (patch-package)** como alternativa permanente.

---

## 📝 Pasos para Implementar Solución 1

1. Abrir `AlmonteIntranet/next.config.ts`

2. Modificar la sección `sassOptions`:

```typescript
sassOptions: {
  includePaths: [
    './src/assets/scss',
    './node_modules/bootstrap/scss',
  ],
  additionalData: `@import "variables-dark";`, // AGREGAR ESTA LÍNEA
  silenceDeprecations: ['legacy-js-api'],
},
```

3. (Opcional) Si aparece error de importación duplicada, remover la línea 13 de `app.scss`:
   - Buscar: `@import "variables-dark"; // Necesario para que maps.scss tenga las variables dark definidas`
   - Comentar o eliminar

4. Reiniciar el servidor de desarrollo:
```bash
npm run dev
```

---

## 🧪 Verificar que Funciona

Después de aplicar la solución:

1. El servidor debería iniciar sin errores
2. Los estilos deberían cargar correctamente
3. No deberían aparecer errores relacionados con `variables-dark` en la consola

---

## 📚 Referencias

- [Next.js SASS Options](https://nextjs.org/docs/app/api-reference/next-config-js/sassOptions)
- [Bootstrap 5.3 Dark Mode Variables](https://getbootstrap.com/docs/5.3/customize/sass/#variable-defaults)
- [SASS Additional Data](https://sass-lang.com/documentation/js-api/interfaces/Options#additionalData)
- [patch-package](https://github.com/ds300/patch-package)
