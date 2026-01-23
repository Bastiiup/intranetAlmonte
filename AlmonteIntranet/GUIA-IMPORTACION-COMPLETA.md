# Guía de Importación Completa de Listas

## 📋 Descripción

El sistema de **Importación Completa** permite cargar masivamente colegios, cursos, asignaturas y productos/libros desde un archivo Excel/CSV usando la estructura de la plantilla completa.

## 🔄 Cómo Funciona

### 1. **Estructura de Datos**

El sistema agrupa automáticamente los datos por:
- **Colegio** (identificado por RBD o nombre)
- **Curso** (ej: "1º Básico", "IV Medio")
- **Asignatura** (ej: "Lenguaje y Comunicación", "Matemáticas")
- **Lista** (nombre de la lista de útiles)

### 2. **Proceso de Importación**

```
Excel/CSV → Agrupación → Match Colegios → Crear Colegios → Crear Cursos → Crear Listas con Productos
```

#### Paso 1: Lectura y Agrupación
- Lee el archivo Excel/CSV
- Normaliza los nombres de columnas (case-insensitive)
- Agrupa filas por: Colegio + Curso + Asignatura + Lista
- Cada grupo representa una lista única con sus productos

#### Paso 2: Match de Colegios
- **Prioridad 1:** Busca por RBD (número exacto)
- **Prioridad 2:** Busca por nombre (normalizado, sin acentos)
- Si no existe, crea el colegio automáticamente (requiere RBD)

#### Paso 3: Creación de Cursos
- Extrae nivel (Básica/Media) y grado del nombre del curso
- Busca curso existente por: nombre + nivel + grado + año
- Si no existe, crea el curso automáticamente

#### Paso 4: Creación de Listas
- Crea una versión de materiales por cada grupo (asignatura)
- Incluye todos los productos/libros de esa asignatura
- Mantiene el orden de asignatura y orden de productos

### 3. **Formato de Columnas Requeridas**

#### Columnas Mínimas (Obligatorias):
- `Colegio` o `colegio`: Nombre del colegio
- `RBD` o `rbd`: RBD del colegio (obligatorio para crear nuevos)
- `Curso` o `curso`: Nombre del curso (ej: "1º Básico")
- `Asignatura` o `asignatura`: Nombre de la asignatura
- `Lista_nombre` o `lista_nombre`: Nombre de la lista
- `Libro_nombre` o `libro_nombre`: Nombre del producto/libro

#### Columnas Opcionales:
- `Comuna`, `Orden_colegio`
- `Año_curso`, `Orden_curso`
- `Orden_asignatura`
- `Año_lista`, `Fecha_actualizacion`, `Fecha_publicacion`, `URL_lista`, `URL_publicacion`, `Orden_lista`
- `Libro_codigo`, `Libro_isbn`, `Libro_autor`, `Libro_editorial`, `Libro_orden`, `Libro_cantidad`, `Libro_observaciones`, `Libro_mes_uso`

## 🧪 Cómo Probar

### Opción 1: Crear un Excel de Prueba

1. **Abre Excel** y crea un archivo con estas columnas:

```
| Colegio | RBD | Curso | Año_curso | Asignatura | Orden_asignatura | Lista_nombre | Año_lista | Libro_nombre | Libro_isbn | Libro_autor | Libro_editorial | Libro_cantidad |
|---------|-----|-------|-----------|------------|------------------|--------------|-----------|--------------|------------|-------------|----------------|----------------|
| Colegio Test | 99999 | 1º Básico | 2026 | Lenguaje y Comunicación | 1 | Lista de Útiles 2026 | 2026 | Cuaderno Universitario | 978-1234567890 | Autor Test | Editorial Test | 2 |
| Colegio Test | 99999 | 1º Básico | 2026 | Lenguaje y Comunicación | 1 | Lista de Útiles 2026 | 2026 | Lápiz Grafito | 978-1234567891 | Autor Test 2 | Editorial Test 2 | 5 |
| Colegio Test | 99999 | 1º Básico | 2026 | Matemáticas | 2 | Lista de Útiles 2026 | 2026 | Regla 30cm | 978-1234567892 | Autor Test 3 | Editorial Test 3 | 1 |
```

2. **Guarda el archivo** como `.xlsx` o `.csv`

### Opción 2: Usar la Plantilla del Amigo

1. **Abre el archivo** `plantilla-completa-todos-elementos.csv`
2. **Modifica los datos** con información real o de prueba
3. **Guarda** el archivo

### Pasos para Probar

1. **Accede a la página de Listas:**
   ```
   http://localhost:3000/crm/listas
   ```

2. **Haz clic en el botón:**
   ```
   "Importación Completa (Plantilla)"
   ```

3. **Sube el archivo:**
   - Selecciona tu archivo Excel/CSV
   - El sistema lo leerá automáticamente

4. **Revisa el agrupamiento:**
   - Verás una tabla con las listas que se crearán
   - Cada fila muestra: Colegio, Curso, Asignatura, Lista, Cantidad de Productos

5. **Procesa:**
   - Haz clic en "Procesar"
   - Verás el progreso en tiempo real
   - El sistema creará:
     - ✅ Colegios (si no existen)
     - ✅ Cursos (si no existen)
     - ✅ Listas con productos agrupados por asignatura

6. **Revisa los resultados:**
   - Verás un resumen: Exitosos / Errores
   - Si hay errores, se mostrarán detalles

7. **Verifica en la lista principal:**
   - Las listas creadas aparecerán en la tabla principal
   - Puedes hacer clic para ver los detalles

## 🔍 Verificación

### Verificar que se creó el colegio:
1. Ve a `/crm/colegios`
2. Busca el colegio por nombre o RBD
3. Debería aparecer en la lista

### Verificar que se creó el curso:
1. Ve al colegio creado
2. En la sección de cursos, debería aparecer el curso

### Verificar que se creó la lista:
1. Ve a `/crm/listas`
2. Busca la lista por nombre del curso
3. Haz clic para ver los detalles
4. Deberías ver los productos agrupados por asignatura

### Verificar productos:
1. En la página de validación de la lista (`/crm/listas/[id]/validacion`)
2. Deberías ver los productos con:
   - Nombre del libro
   - ISBN, Autor, Editorial (en descripción)
   - Asignatura
   - Cantidad

## ⚠️ Errores Comunes

### Error: "No se puede crear colegio sin RBD"
- **Solución:** Asegúrate de que la columna `RBD` tenga valores numéricos

### Error: "No se encontró colegio"
- **Solución:** Verifica que el nombre del colegio coincida exactamente o que el RBD sea correcto

### Error: "Error al crear curso"
- **Solución:** Verifica que el nombre del curso tenga formato válido (ej: "1º Básico", "IV Medio")

### Error: "No se pudo obtener o crear el curso"
- **Solución:** Verifica que el colegio se haya creado correctamente primero

## 📊 Ejemplo de Datos de Prueba

```csv
Colegio,RBD,Curso,Año_curso,Asignatura,Orden_asignatura,Lista_nombre,Año_lista,Libro_nombre,Libro_isbn,Libro_autor,Libro_editorial,Libro_cantidad
"Colegio San Patricio",12345,"1º Básico",2026,"Lenguaje y Comunicación",1,"Lista de Útiles 2026",2026,"Cuaderno Universitario",978-1234567890,"Juan Pérez","Editorial ABC",2
"Colegio San Patricio",12345,"1º Básico",2026,"Lenguaje y Comunicación",1,"Lista de Útiles 2026",2026,"Lápiz Grafito N°2",978-1234567891,"María González","Editorial XYZ",5
"Colegio San Patricio",12345,"1º Básico",2026,"Matemáticas",2,"Lista de Útiles 2026",2026,"Regla 30cm",978-1234567892,"Pedro López","Editorial DEF",1
```

## 🎯 Flujo Completo

```
1. Usuario sube Excel/CSV
   ↓
2. Sistema lee y agrupa datos
   ↓
3. Para cada grupo (colegio+curso+asignatura+lista):
   ↓
4. Busca/Crea Colegio (por RBD o nombre)
   ↓
5. Busca/Crea Curso (por nombre+nivel+grado+año)
   ↓
6. Crea Versión de Materiales con:
   - Asignatura y orden
   - Lista de productos/libros
   - Metadata (fechas, URLs, etc.)
   ↓
7. Guarda en Strapi
   ↓
8. Muestra resultados
```

## ✅ Checklist de Prueba

- [ ] Crear archivo Excel/CSV con datos de prueba
- [ ] Subir archivo en el modal de importación completa
- [ ] Verificar que se agrupa correctamente
- [ ] Procesar la importación
- [ ] Verificar que se creó el colegio
- [ ] Verificar que se creó el curso
- [ ] Verificar que se creó la lista
- [ ] Verificar que los productos están agrupados por asignatura
- [ ] Verificar que los productos tienen toda la información (ISBN, autor, etc.)

## 🚀 Próximos Pasos

Una vez probado, puedes:
1. Usar datos reales de colegios
2. Importar múltiples cursos y asignaturas
3. Verificar que el orden de asignaturas se mantiene
4. Probar con diferentes formatos de nombres de cursos
