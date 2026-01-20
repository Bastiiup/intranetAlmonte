# 📋 Cómo Ver Logs del Proyecto

Esta guía te explica cómo ver los logs en diferentes contextos del proyecto.

---

## 🖥️ 1. Logs del Servidor Next.js (Terminal de Cursor)

**SÍ, puedes ver los problemas directamente en la consola de Cursor.**

### En Cursor:

1. **Abre la terminal integrada**: Presiona `` Ctrl+` `` (Ctrl + backtick) o ve a **View → Terminal**
2. **Verás los logs en tiempo real** mientras el servidor está corriendo
3. Los logs incluyen:
   - ✅ Errores de compilación
   - ✅ Errores de API (como los de eliminación)
   - ✅ Logs de `console.log()` del servidor
   - ✅ Logs de `console.error()`
   - ✅ Logs de `debugLog()` que agregamos

### Ejemplo de logs que verás en Cursor:

```
[API /crm/listas GET] Obteniendo cursos con PDFs...
[API /crm/listas GET] ✅ Cursos con PDFs encontrados: 7
[API /crm/listas/[id] DELETE] Eliminando curso completo: 96
[API /crm/listas/[id] DELETE] ✅ Curso eliminado exitosamente
[Importación Masiva] Procesando fila 1/3: { colegio: "Colegio1", curso: "curso 1", ... }
```

### 💡 Tip para Cursor:

- **Scroll en la terminal**: Usa la rueda del mouse o las barras de desplazamiento
- **Buscar en logs**: Presiona `Ctrl+F` en la terminal para buscar texto
- **Limpiar terminal**: Click derecho → "Clear" o escribe `clear` y Enter
- **Copiar logs**: Selecciona el texto y presiona `Ctrl+C`

---

## 🌐 2. Logs del Navegador (Consola del Navegador)

Los logs del cliente (frontend) aparecen en la consola del navegador.

### Cómo abrir:

1. Abre tu navegador (Chrome, Firefox, Edge, etc.)
2. Presiona **F12** o **Ctrl+Shift+I** (Windows/Linux) o **Cmd+Option+I** (Mac)
3. Ve a la pestaña **Console**

### Verás:

- Logs de `console.log()` del frontend
- Errores de JavaScript
- Errores de React
- Warnings y errores de red

### Filtrar logs:

- **Errors only**: Haz clic en el icono de filtro y selecciona "Errors"
- **Warnings**: Selecciona "Warnings"
- **Info**: Selecciona "Info"

---

## 🔍 3. Logs Específicos de Importación Masiva

Para ver los logs detallados de la importación masiva:

### Paso 1: Abrir Consola del Navegador

1. Abre la página: http://localhost:3000/crm/listas
2. Presiona **F12** para abrir las herramientas de desarrollador
3. Ve a la pestaña **Console**

### Paso 2: Ejecutar Importación Masiva

1. Haz clic en "Importación Masiva"
2. Sube tu archivo Excel
3. Procesa la importación
4. **Los logs aparecerán en la consola del navegador**

### Logs que verás:

```
[Importación Masiva] Procesando fila 1/3: { colegio: "Colegio1", curso: "curso 1", ... }
[Importación Masiva] Buscando colegio: "Colegio1" (normalizado: "colegio1")
[Importación Masiva] Total colegios cargados: 150
[Importación Masiva] Búsqueda exacta: ✅ Encontrado
[Importación Masiva] ✅ Colegio encontrado: ID=123
[Importación Masiva] Creando curso: { nombre_curso: "curso 1", grado: "1", ... }
[Importación Masiva] Respuesta creación curso: { success: true, ... }
[Importación Masiva] ✅ Curso creado: ID=456
```

---

## 📡 4. Logs de la API (Backend)

Los logs de las rutas API aparecen en la terminal del servidor.

### Ver logs de API:

1. Abre la terminal donde corre `npm run dev`
2. Busca líneas que empiezan con `[API ...]`

### Ejemplo:

```
[API /crm/colegios/[id]/cursos POST] Creando curso para colegio: 123
[API /crm/colegios/[id]/cursos POST] Curso creado exitosamente
[API /crm/cursos/import-pdf POST] Subiendo PDF a Strapi Media Library...
[API /crm/cursos/import-pdf POST] ✅ PDF subido a Strapi: { pdfId: 789, ... }
```

---

## 🐛 5. Debugging Específico

### Ver logs detallados de importación masiva:

Los logs ahora incluyen información detallada sobre:
- Qué fila se está procesando
- Búsqueda de colegios (exacta y parcial)
- Creación de cursos
- Errores específicos

### Ver logs de Strapi:

Si necesitas ver los logs de Strapi directamente:
1. Accede al panel de Strapi: https://strapi-pruebas-production.up.railway.app/admin
2. Los logs de Strapi aparecen en la consola del servidor donde está corriendo Strapi

---

## 💡 Tips para Debugging

### 1. Filtrar logs en la consola del navegador:

```
// Solo ver logs de importación masiva
[Importación Masiva]
```

### 2. Ver errores de red:

1. Abre la consola del navegador (F12)
2. Ve a la pestaña **Network**
3. Filtra por **Fetch/XHR**
4. Haz clic en una petición para ver:
   - Headers
   - Payload
   - Response
   - Errores

### 3. Ver el estado completo de un error:

En la consola del navegador, expande el error para ver:
- Stack trace completo
- Línea de código donde ocurrió
- Variables en ese momento

---

## 📝 Logs Agregados en Importación Masiva

He agregado logs detallados en estos puntos:

1. **Inicio de procesamiento de cada fila**
2. **Búsqueda de colegios** (exacta y parcial)
3. **Lista de colegios disponibles** (si no se encuentra)
4. **Creación de cursos** (payload y respuesta)
5. **Errores específicos** con detalles

---

## ✅ Checklist para Ver Logs en Cursor

### Para ver logs del servidor (Backend):

- [ ] Terminal de Cursor abierta (`` Ctrl+` ``)
- [ ] Servidor Next.js corriendo (`npm run dev`)
- [ ] Buscar logs con `Ctrl+F` si es necesario
- [ ] Revisar errores en rojo (si los hay)

### Para ver logs del cliente (Frontend):

- [ ] Consola del navegador abierta (F12)
- [ ] Pestaña Console seleccionada
- [ ] Filtros aplicados si es necesario (escribir `[ListasListing]` en el filtro)
- [ ] Ejecutar la acción (eliminar, importar, etc.) para ver logs en tiempo real

---

## 🆘 Si No Ves Logs

1. **Verifica que el servidor esté corriendo**: Deberías ver `Ready` en la terminal
2. **Limpia la consola**: Haz clic en el icono de limpiar (🚫) en la consola del navegador
3. **Recarga la página**: Presiona F5 o Ctrl+R
4. **Verifica que no haya errores de compilación**: Revisa la terminal del servidor

---

**¡Ahora puedes ver todos los logs necesarios para debuggear!** 🎉
