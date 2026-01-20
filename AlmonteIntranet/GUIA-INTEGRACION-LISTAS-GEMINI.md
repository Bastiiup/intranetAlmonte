# 📋 GUÍA DE INTEGRACIÓN: PROCESAMIENTO DE LISTAS CON GEMINI AI

## 🎯 OBJETIVO

Esta guía te ayudará a integrar los cambios relacionados con el **procesamiento de PDFs de listas escolares usando Gemini AI** desde la rama `mati-integracion` a tu rama principal.

---

## 📦 CAMBIOS INCLUIDOS

Esta integración incluye:
- ✅ Extracción automática de productos desde PDFs usando Google Gemini AI
- ✅ Validación de productos contra WooCommerce Escolar
- ✅ Guardado automático de productos en Strapi
- ✅ Nueva interfaz de validación de listas
- ✅ Visualización de PDFs y productos extraídos

---

## 🔧 PASOS DE INTEGRACIÓN

### **1. Actualizar tu rama principal**

```bash
# Asegúrate de estar en tu rama principal (main o develop)
git checkout main
git pull origin main
```

### **2. Traer los cambios de la rama mati-integracion**

```bash
# Traer los cambios de la rama mati-integracion
git fetch origin mati-integracion

# Crear una rama temporal para revisar los cambios
git checkout -b integracion-listas-gemini origin/mati-integracion
```

### **3. Identificar archivos relacionados con listas**

Los siguientes archivos son los que necesitas integrar:

#### **Archivos nuevos (crear):**
```
src/app/(admin)/(apps)/crm/listas/[id]/validacion/page.tsx
src/app/(admin)/(apps)/crm/listas/[id]/validacion/components/ValidacionLista.tsx
src/app/api/crm/listas/[id]/procesar-pdf/route.ts
src/app/api/crm/listas/test-gemini/route.ts
```

#### **Archivos modificados (actualizar):**
```
src/app/(admin)/(apps)/crm/listas/components/ListasListing.tsx
src/app/api/crm/listas/[id]/route.ts
```

#### **Documentación (opcional):**
```
EXPLICACION-FUNCIONAMIENTO-PDF-GEMINI.md
GEMINI-AI-CONFIG.md
CONTEXTO-EXTRACCION-PDF-GEMINI.md
```

---

## 📝 INTEGRACIÓN MANUAL (RECOMENDADO)

### **Opción 1: Cherry-pick de commits específicos**

```bash
# Volver a tu rama principal
git checkout main

# Ver los commits relacionados con listas
git log origin/mati-integracion --oneline --grep="listas\|PDF\|Gemini" -i

# Hacer cherry-pick de los commits específicos (reemplaza COMMIT_HASH)
git cherry-pick COMMIT_HASH
```

### **Opción 2: Copiar archivos manualmente**

#### **1. Crear la estructura de carpetas:**

```bash
mkdir -p src/app/(admin)/(apps)/crm/listas/[id]/validacion/components
mkdir -p src/app/api/crm/listas/[id]/procesar-pdf
mkdir -p src/app/api/crm/listas/test-gemini
```

#### **2. Copiar archivos desde la rama mati-integracion:**

```bash
# Desde la rama mati-integracion, copiar archivos
git checkout mati-integracion

# Copiar archivos nuevos
git show mati-integracion:src/app/(admin)/(apps)/crm/listas/[id]/validacion/page.tsx > src/app/(admin)/(apps)/crm/listas/[id]/validacion/page.tsx
git show mati-integracion:src/app/(admin)/(apps)/crm/listas/[id]/validacion/components/ValidacionLista.tsx > src/app/(admin)/(apps)/crm/listas/[id]/validacion/components/ValidacionLista.tsx
git show mati-integracion:src/app/api/crm/listas/[id]/procesar-pdf/route.ts > src/app/api/crm/listas/[id]/procesar-pdf/route.ts
git show mati-integracion:src/app/api/crm/listas/test-gemini/route.ts > src/app/api/crm/listas/test-gemini/route.ts

# Volver a tu rama
git checkout main

# Copiar archivos modificados (revisar y aplicar cambios manualmente)
git show mati-integracion:src/app/(admin)/(apps)/crm/listas/components/ListasListing.tsx > temp_ListasListing.tsx
git show mati-integracion:src/app/api/crm/listas/[id]/route.ts > temp_route.tsx

# Comparar y aplicar cambios manualmente
# diff src/app/(admin)/(apps)/crm/listas/components/ListasListing.tsx temp_ListasListing.tsx
```

---

## 🔑 DEPENDENCIAS NECESARIAS

### **1. Instalar paquetes npm:**

```bash
npm install @google/generative-ai react-pdf pdfjs-dist
```

O si usas yarn:

```bash
yarn add @google/generative-ai react-pdf pdfjs-dist
```

### **2. Variables de entorno (.env.local):**

Agrega estas variables si no las tienes:

```env
# Gemini AI
GEMINI_API_KEY=AIzaSyDeibOMGmbVhKrrggR2ROAjn38WuK02IFI

# Strapi (ya deberías tenerlas)
NEXT_PUBLIC_STRAPI_URL=https://strapi.moraleja.cl
STRAPI_API_TOKEN=tu_token_aqui
```

---

## 📋 CAMBIOS EN ARCHIVOS EXISTENTES

### **1. `src/app/(admin)/(apps)/crm/listas/components/ListasListing.tsx`**

**Cambio:** Hacer clickeable el nombre del curso para navegar a la página de validación.

**Buscar:**
```tsx
<td>{lista.nombre}</td>
```

**Reemplazar con:**
```tsx
<td>
  <Link href={`/crm/listas/${lista.documentId || lista.id}/validacion`}>
    {lista.nombre}
  </Link>
</td>
```

**Import necesario:**
```tsx
import Link from 'next/link'
```

### **2. `src/app/api/crm/listas/[id]/route.ts`**

**Cambios:**
- Mejoras en la búsqueda del curso (por documentId e id numérico)
- Populación de `colegio` y `versiones_materiales`
- Extracción de `ultimaVersion` con detalles

**Revisar:** Comparar con tu versión y aplicar los cambios relacionados con:
- Búsqueda por `documentId`
- Populate de relaciones
- Estructura de respuesta

---

## 🧪 VERIFICACIÓN POST-INTEGRACIÓN

### **1. Verificar que los archivos existen:**

```bash
# Verificar estructura
ls -la src/app/(admin)/(apps)/crm/listas/[id]/validacion/
ls -la src/app/api/crm/listas/[id]/procesar-pdf/
```

### **2. Compilar el proyecto:**

```bash
npm run build
```

**Errores comunes:**
- ❌ `Module not found: @google/generative-ai` → Instalar dependencias
- ❌ `Module not found: react-pdf` → Instalar dependencias
- ❌ `GEMINI_API_KEY is not defined` → Agregar variable de entorno

### **3. Probar la funcionalidad:**

1. **Ir a:** `http://localhost:3000/crm/listas`
2. **Hacer clic** en el nombre de un curso (debe navegar a `/crm/listas/[id]/validacion`)
3. **Verificar** que se muestra el PDF y la tabla de productos
4. **Hacer clic** en "Procesar con IA"
5. **Verificar** que se procesan los productos y aparecen en la tabla

---

## ⚠️ POSIBLES CONFLICTOS

### **Conflicto 1: Estructura de carpetas diferente**

Si tu proyecto tiene una estructura diferente:
- Ajusta las rutas de los archivos según tu estructura
- Mantén la lógica de los componentes igual

### **Conflicto 2: Dependencias diferentes**

Si ya tienes `react-pdf` o `pdfjs-dist` instalados:
- Verifica que las versiones sean compatibles
- Revisa si hay cambios en la API

### **Conflicto 3: Variables de entorno**

Si ya tienes `GEMINI_API_KEY` configurada:
- Verifica que la API key sea válida
- Prueba con el endpoint de test: `/api/crm/listas/test-gemini`

### **Conflicto 4: Estructura de Strapi diferente**

Si tu modelo `curso` en Strapi tiene una estructura diferente:
- Verifica que el campo `versiones_materiales` exista
- Ajusta la estructura de datos en `procesar-pdf/route.ts` si es necesario

---

## 🔍 ARCHIVOS CLAVE A REVISAR

### **1. `src/app/api/crm/listas/[id]/procesar-pdf/route.ts`**

Este es el archivo principal. Contiene:
- Lógica de extracción con Gemini
- Validación con WooCommerce
- Guardado en Strapi

**Puntos importantes:**
- Línea 19: API Key de Gemini (puede usar variable de entorno)
- Líneas 22-29: Modelos de Gemini disponibles
- Línea 606: Uso de `documentId` para actualizar en Strapi

### **2. `src/app/(admin)/(apps)/crm/listas/[id]/validacion/components/ValidacionLista.tsx`**

Componente frontend que:
- Muestra el PDF
- Muestra productos extraídos
- Llama a la API de procesamiento
- Recarga productos después del guardado

---

## 📚 DOCUMENTACIÓN ADICIONAL

Si necesitas entender mejor cómo funciona el sistema:

1. **`EXPLICACION-FUNCIONAMIENTO-PDF-GEMINI.md`** - Explicación completa del flujo
2. **`GEMINI-AI-CONFIG.md`** - Configuración de Gemini AI
3. **`CONTEXTO-EXTRACCION-PDF-GEMINI.md`** - Contexto técnico

---

## ✅ CHECKLIST DE INTEGRACIÓN

- [ ] Actualizar rama principal
- [ ] Crear estructura de carpetas
- [ ] Copiar archivos nuevos
- [ ] Aplicar cambios en archivos existentes
- [ ] Instalar dependencias (`@google/generative-ai`, `react-pdf`, `pdfjs-dist`)
- [ ] Agregar variables de entorno (`GEMINI_API_KEY`)
- [ ] Compilar proyecto (`npm run build`)
- [ ] Probar funcionalidad completa
- [ ] Verificar que los productos se guardan en Strapi
- [ ] Verificar que los productos aparecen en la tabla

---

## 🆘 SI ALGO FALLA

### **Error: "No se pudo obtener la lista"**
- Verifica que el endpoint `/api/crm/listas/[id]` funciona
- Revisa los logs del servidor

### **Error: "Gemini API key not found"**
- Verifica que `GEMINI_API_KEY` esté en `.env.local`
- Reinicia el servidor después de agregar la variable

### **Error: "Productos no se guardan en Strapi"**
- Verifica que el campo `versiones_materiales` existe en el modelo `curso`
- Revisa los logs del servidor para ver el error específico
- Verifica que el `documentId` del curso sea correcto

### **Error: "Module not found"**
- Ejecuta `npm install` o `yarn install`
- Verifica que las dependencias estén en `package.json`

---

## 📞 CONTACTO

Si tienes dudas o problemas durante la integración, revisa:
1. Los logs del servidor (`npm run dev`)
2. La consola del navegador (F12)
3. La documentación en los archivos `.md` mencionados

---

## 🎉 ¡LISTO!

Una vez completados todos los pasos, deberías tener:
- ✅ Nueva página de validación de listas
- ✅ Procesamiento automático de PDFs con Gemini
- ✅ Validación contra WooCommerce
- ✅ Guardado automático en Strapi
- ✅ Visualización de productos en la tabla

**¡Buena suerte con la integración!** 🚀
