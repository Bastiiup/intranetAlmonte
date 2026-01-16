# 🔍 Cómo Ver Logs en Cursor - Guía Rápida

## ✅ SÍ, puedes ver los logs directamente en Cursor

---

## 🖥️ Paso 1: Abrir Terminal de Cursor

1. **Presiona** `` Ctrl+` `` (Ctrl + backtick, la tecla que está arriba del Tab)
2. **O ve a**: View → Terminal
3. **Verás la terminal integrada** en la parte inferior de Cursor

---

## 📊 Paso 2: Ver Logs del Servidor

**Los logs aparecen automáticamente** mientras el servidor está corriendo.

### Ejemplo de logs que verás:

```
[API /crm/listas/[id] DELETE] Eliminando curso completo: 96
[API /crm/listas/[id] DELETE] IDs del curso: { cursoId: 96, cursoDocumentId: '...' }
[API /crm/listas/[id] DELETE] ✅ Curso eliminado exitosamente
[API /crm/listas GET] Obteniendo cursos con PDFs...
[API /crm/listas GET] ✅ Cursos con PDFs encontrados: 3
```

---

## 🔎 Paso 3: Buscar Logs Específicos

### En la terminal de Cursor:

1. **Presiona `Ctrl+F`** para buscar
2. **Escribe el texto** que quieres buscar, por ejemplo:
   - `[API.*DELETE]` - Ver solo eliminaciones
   - `[Importación Masiva]` - Ver solo importaciones
   - `Error` - Ver solo errores
   - `✅` - Ver solo éxitos

### Ejemplo de búsqueda:

```
Buscar: [API.*DELETE]
Resultado: Verás todas las líneas que contienen eliminaciones
```

---

## 🐛 Ver Errores Específicos

### Para ver errores de eliminación:

1. Abre la terminal de Cursor (`` Ctrl+` ``)
2. Busca: `[API /crm/listas/[id] DELETE]`
3. Verás:
   - ✅ Si se eliminó: `✅ Curso eliminado exitosamente`
   - ❌ Si falló: `❌ Error: ...`

### Para ver errores de importación:

1. Abre la terminal de Cursor
2. Busca: `[Importación Masiva]`
3. Verás:
   - Qué fila se está procesando
   - Si se creó el curso
   - Si falló algo

---

## 📋 Logs que Verás para Eliminación Múltiple

Cuando eliminas varios cursos, verás en la terminal:

```
[API /crm/listas/[id] DELETE] Eliminando curso completo: 96
[API /crm/listas/[id] DELETE] ✅ Curso eliminado exitosamente
[API /crm/listas/[id] DELETE] Eliminando curso completo: 79
[API /crm/listas/[id] DELETE] ✅ Curso eliminado exitosamente
[API /crm/listas/[id] DELETE] Eliminando curso completo: 102
[API /crm/listas/[id] DELETE] ❌ Error: Curso no encontrado
```

---

## 📋 Logs que Verás para Importación Masiva

Cuando importas cursos, verás:

```
[Importación Masiva] Cargando colegios...
[Importación Masiva] Colegios cargados: 1000
[Importación Masiva] Usando colegio seleccionado: { id: 123, nombre: "..." }
[Importación Masiva] Procesando fila 1/3: { ... }
[Importación Masiva] Creando curso: { ... }
[Importación Masiva] ✅ Curso creado: ID=102
[API /crm/cursos/import-pdf POST] Subiendo PDF...
[API /crm/cursos/import-pdf POST] ✅ PDF subido exitosamente
```

---

## 💡 Tips Útiles

### 1. Limpiar Terminal

- **Click derecho** en la terminal → "Clear"
- **O escribe**: `clear` y presiona Enter

### 2. Copiar Logs

- **Selecciona el texto** con el mouse
- **Presiona `Ctrl+C`** para copiar
- **Pega** donde necesites (por ejemplo, para compartir conmigo)

### 3. Scroll en Terminal

- **Rueda del mouse** para hacer scroll
- **Barras de desplazamiento** a la derecha

### 4. Múltiples Terminales

- Puedes tener varias terminales abiertas
- Cada una muestra los mismos logs del servidor
- Cierra las que no uses para no confundirte

---

## 🎯 Qué Buscar para Cada Problema

### Problema: "No se eliminan los cursos"

**Busca en terminal:**
```
[API /crm/listas/[id] DELETE]
```

**Qué verificar:**
- ¿Aparece `✅ Curso eliminado exitosamente`?
- ¿O aparece `❌ Error: ...`?

### Problema: "Solo se crea 1 de 3 cursos"

**Busca en terminal:**
```
[Importación Masiva] Procesando fila
```

**Qué verificar:**
- ¿Aparecen las 3 filas procesándose?
- ¿Qué error aparece en las que fallan?

### Problema: "Error 404 en import-pdf"

**Busca en terminal:**
```
[API /crm/cursos/import-pdf POST]
```

**Qué verificar:**
- ¿Aparece el log de subida de PDF?
- ¿Qué error específico muestra?

---

## 🆘 Si No Ves Logs

1. **Verifica que el servidor esté corriendo**:
   - Deberías ver `Ready` o `Local: http://localhost:3000` en la terminal
   - Si no, ejecuta `npm run dev` en la terminal de Cursor

2. **Verifica que estés en la terminal correcta**:
   - Puede haber múltiples terminales abiertas
   - Busca la que muestra los logs de Next.js

3. **Limpia la terminal**:
   - Click derecho → "Clear"
   - O escribe `clear` y Enter

4. **Haz una acción** (eliminar, importar) para generar logs nuevos

---

## 📸 Cómo Compartir Logs conmigo

Si necesitas ayuda, puedes:

1. **Copiar los logs relevantes**:
   - Selecciona el texto en la terminal
   - `Ctrl+C` para copiar
   - Pega aquí en el chat

2. **O describe qué ves**:
   - ¿Qué mensajes aparecen?
   - ¿Hay errores en rojo?
   - ¿Qué números o IDs ves?

---

**¡Ahora puedes ver todos los logs directamente en Cursor!** 🎉
