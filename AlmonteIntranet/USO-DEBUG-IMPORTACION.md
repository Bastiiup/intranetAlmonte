# 🔍 Debug: Monitoreo de Importación en Tiempo Real

**Fecha:** 29 de enero de 2026  
**Propósito:** Capturar TODO el proceso de importación para detectar problemas

---

## 🎯 Cómo Usar

### Paso 1: Abrir la página de debug

1. Abre en tu navegador: **`http://localhost:3000/debug/importacion`**
2. Verás la página de monitoreo (inicialmente sin logs)

### Paso 2: Activar Auto-refresh

1. Haz clic en el botón **"Auto-refresh OFF"** para activarlo
2. Cambiará a **"Auto-refresh ON"** (color verde)
3. Ahora la página se actualizará cada 2 segundos automáticamente

### Paso 3: Hacer la importación

1. **Deja abierta** la página de debug en una pestaña
2. En otra pestaña, ve a: **`http://localhost:3000/crm/listas`**
3. Haz clic en **"Importación Completa (Plantilla)"**
4. Selecciona tu Excel y haz clic en **"🚀 Procesar e Importar"**

### Paso 4: Ver los logs en tiempo real

1. **Vuelve a la pestaña de debug** (`/debug/importacion`)
2. Verás los logs aparecer en tiempo real mientras se procesa
3. Cada acción quedará registrada con su timestamp

---

## 📊 Qué Información Captura

### 🚀 Inicio
```
📤 Iniciando importación del archivo: plantilla.xlsx
Datos: { nombreArchivo, tamañoBytes }
```

### 📄 Parseando
```
📄 Excel parseado: 150 filas detectadas
Datos: { totalFilas }
```

### 🏫 Colegio
```
➕ Creando nuevo colegio: Colegio Estela Segura
Datos: { rbd, nombre, comuna }

✅ Colegio creado exitosamente: Colegio Estela Segura
Datos: { id, rbd }
```

### 📚 Curso
```
➕ Creando curso: 1º Básico A
Datos: { nombre, nivel, grado, año, matricula, colegioId, colegioNombre }

✅ Curso creado exitosamente: 1º Básico A
Datos: { cursoId, documentId, id, nombre, matricula, colegio }
```

### ❌ Error
```
❌ Error al crear curso: [mensaje]
Datos: { error completo }
```

### 🎉 Fin
```
🎉 Importación finalizada
Datos: { totalResultados, exitosos, errores, duracionSegundos }
```

---

## 🔍 Características del Debug

### Estadísticas en Tiempo Real
- **Total de Logs:** Cantidad total de eventos capturados
- **Última Importación:** Timestamp de la última importación
- **Por Tipo:** Contador de cada tipo de evento

### Filtros por Tipo
Haz clic en los badges de colores para filtrar por tipo:
- **Inicio** (azul): Eventos de inicio
- **Parseando** (cian): Eventos de parseo
- **Colegios** (verde): Creación/búsqueda de colegios
- **Cursos** (amarillo): Creación/búsqueda de cursos
- **Errores** (rojo): Todos los errores

### Ver Datos Detallados
- Cada log tiene una columna "Datos"
- Haz clic en **"Ver"** para expandir los detalles completos
- Verás el JSON con toda la información del evento

---

## 🎬 Ejemplo de Uso Completo

```
1. Abrir: http://localhost:3000/debug/importacion
2. Activar: Auto-refresh ON
3. Ir a: http://localhost:3000/crm/listas
4. Importar: Tu Excel
5. Volver a debug: Ver logs en tiempo real
6. Analizar: Si hay errores, ver detalles en rojo
```

---

## 🔧 Problemas Comunes que se Detectarán

### ✅ Curso sin `colegio` asignado
```
Buscar en logs:
- ✅ Curso creado exitosamente
- Ver "Datos" → "colegio"
- Si "colegio" es null o undefined → PROBLEMA
```

### ✅ Matrícula no se guarda
```
Buscar en logs:
- ➕ Creando curso
- Ver "Datos" → "matricula"
- Si "matricula" es null pero tu Excel tenía datos → PROBLEMA
```

### ✅ Colegio no se encuentra
```
Buscar en logs:
- ❌ Error (tipo: error)
- Ver mensaje del error
- Si dice "colegio no encontrado" → PROBLEMA
```

### ✅ Demora en procesar
```
Ver estadísticas:
- Fin → "duracionSegundos"
- Si es mayor a 30 segundos para 50 filas → PROBLEMA
```

---

## 🛠️ Acciones Disponibles

### 🔄 Actualizar
- Refresca los logs manualmente
- Útil cuando auto-refresh está OFF

### 🗑️ Limpiar
- Borra TODOS los logs de memoria
- Útil para empezar una nueva prueba limpia

### 🔒 Filtrar
- Haz clic en los badges de estadísticas
- Filtra por tipo específico
- Vuelve a hacer clic para quitar el filtro

---

## 📋 Checklist de Debugging

Cuando hagas una importación, verifica:

- [ ] El log de **"Inicio"** aparece con el nombre del archivo
- [ ] El log de **"Parseando"** muestra las filas correctas
- [ ] Los **colegios** se crean/encuentran correctamente
- [ ] Los **cursos** se crean con:
  - [ ] `colegioId` correcto (no null)
  - [ ] `matricula` con valor (si tu Excel tenía datos)
  - [ ] `colegio` con { id, nombre } (no null)
- [ ] El log de **"Fin"** muestra:
  - [ ] Exitosos > 0
  - [ ] Errores = 0
- [ ] No hay logs de **Error** (rojos)

---

## 🎯 Objetivo

Con este debug podrás ver **exactamente**:
1. ✅ Si los colegios se crean correctamente
2. ✅ Si los cursos se crean con `colegio` asignado
3. ✅ Si la matrícula se guarda
4. ✅ Dónde falla el proceso (si falla)
5. ✅ Cuánto demora cada paso

---

## 💡 Consejos

1. **Siempre activa Auto-refresh ON** antes de importar
2. **Deja la página de debug abierta** durante la importación
3. **No cierres la pestaña** hasta terminar de revisar los logs
4. **Copia los logs** (con los JSON) si necesitas reportar un problema
5. **Limpia los logs** antes de cada nueva prueba para evitar confusión

---

## 📸 Ejemplo Visual

```
┌────────────────────────────────────────────────────────────┐
│ 🔍 Debug: Importación Excel                                │
│ Monitoreo en tiempo real del proceso de importación       │
│                                                            │
│ [Auto-refresh ON] [🔄 Actualizar] [🗑️ Limpiar]          │
├────────────────────────────────────────────────────────────┤
│ 📊 Estadísticas                                            │
│ Total: 47 logs   Última: 14:32:05                         │
│ Inicio:1 Colegios:2 Cursos:42 Errores:0 Fin:1             │
├────────────────────────────────────────────────────────────┤
│ Timestamp      │ Tipo     │ Mensaje                       │
│ 14:32:05.123  │ 🎉 Fin    │ Importación finalizada        │
│ 14:32:04.987  │ ✅ Curso  │ Curso creado: 3º Básico      │
│ 14:32:04.654  │ ➕ Curso  │ Creando curso: 3º Básico     │
│ 14:32:03.321  │ ✅ Colegio│ Colegio creado: Est. Segura  │
│ 14:32:02.123  │ 📄 Parse  │ Excel parseado: 150 filas    │
│ 14:32:01.000  │ 🚀 Inicio │ Iniciando importación        │
└────────────────────────────────────────────────────────────┘
```

---

**¿Listo para debuggear?** 🔍  
Abre `http://localhost:3000/debug/importacion` y empieza a importar!
