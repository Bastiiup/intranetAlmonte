# 🚀 Guía de Integración - Cambios de Matías

¡Hola compadre! 👋

Acá está todo lo que hemos trabajado para que puedas integrarlo sin problemas. Estamos en la rama `intranet-matias`, así que dale con confianza.

## 🤖 Para Cursor AI (Integración Automática)

**Si estás usando Cursor AI, copia y pega esto en el chat:**

```
Necesito integrar los cambios de la rama intranet-matias. Por favor:

1. Verifica en qué rama estoy actualmente
2. Haz fetch de origin y cambia a la rama intranet-matias
3. Haz pull de origin/intranet-matias
4. Verifica si hay nuevas dependencias en package.json (especialmente react-hot-toast)
5. Si hay nuevas dependencias, ejecuta npm install en AlmonteIntranet
6. Verifica que exista el archivo .env.local y que tenga la variable ANTHROPIC_API_KEY configurada
7. Si falta ANTHROPIC_API_KEY, avísame para que la configure
8. Revisa los archivos nuevos y modificados listados en esta guía
9. Verifica que no haya conflictos de merge
10. Si todo está bien, reinicia el servidor con npm run dev

Archivos nuevos que deberían existir:
- src/app/(admin)/(apps)/crm/listas/components/CargaMasivaPDFsPorColegioModal.tsx
- src/app/(admin)/(apps)/crm/listas/colegio/[colegioId]/components/GestionVersionesModal.tsx
- src/app/(admin)/(apps)/crm/listas/debug-importacion/page.tsx
- src/app/api/crm/listas/debug-colegio/route.ts

Archivos modificados importantes:
- src/app/api/crm/listas/carga-masiva-ia/route.ts (ahora usa Claude en lugar de Gemini)
- src/app/api/crm/listas/exportar-cursos/route.ts (exportación escolar ahora es CSV)
- src/app/api/crm/listas/mapear-pdfs-ia/route.ts (ahora usa Claude)

Si encuentras algún problema o conflicto, detente y avísame antes de continuar.
```

## 📋 Cambios Principales

### 1. **Carga Masiva de PDFs por Colegio** 🎯
- Nuevo botón "Carga Masiva PDFs por Colegio" en la página de listas
- Permite seleccionar un colegio y año, subir múltiples PDFs
- El sistema detecta automáticamente los cursos desde los nombres de los PDFs usando IA (Claude)
- Crea cursos automáticamente si no existen
- Soporta reconocimiento de cursos con números romanos, nombres del colegio al inicio, etc.
- Campo "URL ORIGINAL" para almacenar la fuente de los PDFs

### 2. **Modal de Gestión de Versiones** 📄
- Nuevo modal para gestionar versiones de materiales por curso
- Permite ocultar/activar versiones
- Preview de PDF al hacer hover sobre el nombre del archivo
- Opción para subir nuevas versiones
- Botón "Ocultar Todas las Activas" para gestión rápida

### 3. **Exportación Escolar Mejorada** 📊
- Exportación "escolar" ahora genera CSV (no Excel)
- Formato UTF-8 sin BOM
- Incluye campo "URL ORIGINAL"
- Solo exporta versiones activas
- Mismo formato completo que la exportación CSV normal

### 4. **Optimizaciones** ⚡
- Cache de colegios en localStorage (5 minutos)
- Búsqueda por RBD en el selector de colegios
- Mejoras en la carga de datos
- Mejor manejo de versiones activas/inactivas

## 🔧 Cómo Integrar

### Paso 1: Actualizar tu rama
```bash
git fetch origin
git checkout intranet-matias
git pull origin intranet-matias
```

### Paso 2: Instalar dependencias (si hay nuevas)
```bash
cd AlmonteIntranet
npm install
```

**Nota:** Se agregó `react-hot-toast` como dependencia nueva.

### Paso 3: Verificar variables de entorno
Asegúrate de tener en tu `.env.local`:
```env
ANTHROPIC_API_KEY=tu_api_key_de_claude
STRAPI_API_URL=tu_url_de_strapi
STRAPI_API_TOKEN=tu_token
```

**Importante:** Ahora usamos Claude (Anthropic) en lugar de Gemini para el procesamiento de PDFs.

### Paso 4: Reiniciar el servidor
```bash
npm run dev
```

## 🧪 Cómo Probar

### 1. Carga Masiva PDFs por Colegio
1. Ve a `/crm/listas`
2. Haz clic en "Carga Masiva PDFs por Colegio"
3. Selecciona un colegio (puedes buscar por nombre o RBD)
4. Selecciona el año
5. Sube varios PDFs
6. Ingresa la URL ORIGINAL (opcional)
7. El sistema debería detectar los cursos automáticamente

### 2. Gestión de Versiones
1. Ve a un colegio específico: `/crm/listas/colegio/[colegioId]`
2. Haz clic en el botón "Versiones" (amarillo/naranja) de cualquier curso
3. Prueba:
   - Ocultar/activar versiones
   - Hover sobre el nombre del PDF para ver el preview
   - Subir una nueva versión

### 3. Exportación Escolar
1. Ve a un colegio: `/crm/listas/colegio/[colegioId]`
2. Selecciona algunos cursos
3. Haz clic en "Exportar Escolar"
4. Verifica que el archivo descargado sea `.csv` (no `.xlsx`)
5. Abre el CSV y verifica que tenga la columna "URL ORIGINAL"

## 📁 Archivos Nuevos

- `src/app/(admin)/(apps)/crm/listas/components/CargaMasivaPDFsPorColegioModal.tsx`
- `src/app/(admin)/(apps)/crm/listas/colegio/[colegioId]/components/GestionVersionesModal.tsx`
- `src/app/(admin)/(apps)/crm/listas/debug-importacion/page.tsx` (página de debug)
- `src/app/api/crm/listas/debug-colegio/route.ts` (endpoint de debug)

## 🔄 Archivos Modificados

- `src/app/(admin)/(apps)/crm/listas/components/ImportacionCompletaModal.tsx`
- `src/app/(admin)/(apps)/crm/listas/components/ListasListing.tsx`
- `src/app/(admin)/(apps)/crm/listas/colegio/[colegioId]/components/CursosColegioListing.tsx`
- `src/app/api/crm/listas/carga-masiva-ia/route.ts`
- `src/app/api/crm/listas/exportar-cursos/route.ts`
- `src/app/api/crm/listas/mapear-pdfs-ia/route.ts`
- `src/app/api/crm/listas/por-colegio/route.ts`

## ⚠️ Notas Importantes

1. **Claude AI:** Asegúrate de tener `ANTHROPIC_API_KEY` configurada. Ya no usamos Gemini.

2. **Versiones Activas:** La exportación escolar ahora solo exporta versiones con `activo !== false`. Si una versión no tiene el campo `activo`, se considera activa.

3. **Cache de Colegios:** Los colegios se cachean en localStorage por 5 minutos. Si necesitas forzar una actualización, limpia el localStorage o espera 5 minutos.

4. **Formato CSV:** La exportación escolar genera CSV UTF-8 sin BOM. Si necesitas abrirlo en Excel y tienes problemas con caracteres especiales, puedes usar "Importar datos" en Excel y seleccionar UTF-8.

## 🐛 Debug

Si algo no funciona, hay páginas de debug disponibles:
- `/crm/listas/debug-importacion` - Para ver cómo se parsea el Excel
- `/api/crm/listas/debug-colegio?rbd=24508` - Para ver el estado de un colegio específico

## 📝 Checklist de Integración

- [ ] Hacer pull de la rama `intranet-matias`
- [ ] Instalar dependencias (`npm install`)
- [ ] Verificar variables de entorno (especialmente `ANTHROPIC_API_KEY`)
- [ ] Reiniciar el servidor
- [ ] Probar "Carga Masiva PDFs por Colegio"
- [ ] Probar "Gestión de Versiones"
- [ ] Probar "Exportación Escolar"
- [ ] Verificar que los CSV se descargan correctamente

## 💬 Si Algo Sale Mal

1. Revisa la consola del navegador (F12)
2. Revisa los logs del servidor
3. Verifica que `ANTHROPIC_API_KEY` esté configurada
4. Verifica que Strapi esté corriendo y accesible
5. Limpia el cache del navegador y localStorage

## 🎉 Listo!

Con esto deberías tener todo funcionando. Si tienes algún problema, avísame y lo revisamos juntos.

¡Éxito con la integración! 🚀

---

**Última actualización:** 2025-01-XX
**Rama:** `intranet-matias`
**Commit:** `cd3556b7`
