# Instrucciones para IA de Strapi - Agregar Campos de Matriculados

## Objetivo
Necesito agregar campos para almacenar la cantidad de estudiantes matriculados en colegios y cursos.

---

## 1. Modificar Content-Type: `colegio`

### Campo a agregar:

**Nombre del campo:** `total_matriculados`
- **Tipo:** Number (integer)
- **Descripción:** Cantidad total de estudiantes matriculados en el colegio
- **Requerido:** No
- **Valor por defecto:** null (o 0)
- **Valor mínimo:** 0
- **Valor máximo:** 999999

### Ejemplo de uso:
```json
{
  "colegio_nombre": "American Academy",
  "rbd": 10611,
  "total_matriculados": 450
}
```

---

## 2. Modificar Content-Type: `curso`

### Campo a agregar:

**Nombre del campo:** `matriculados`
- **Tipo:** Number (integer)
- **Descripción:** Cantidad de estudiantes matriculados en este curso específico
- **Requerido:** No
- **Valor por defecto:** null (o 0)
- **Valor mínimo:** 0
- **Valor máximo:** 999

### Ejemplo de uso:
```json
{
  "nombre_curso": "1° Básico A",
  "nivel": "Basica",
  "grado": 1,
  "matriculados": 35
}
```

---

## 3. Relación entre campos

- **`colegio.total_matriculados`**: Suma de todos los estudiantes del colegio
- **`curso.matriculados`**: Estudiantes específicos de ese curso
- Relación: `colegio.total_matriculados` = Σ `curso.matriculados` de todos los cursos

---

## 4. Pasos a realizar en Strapi

### Para Content-Type `colegio`:
1. Ir a **Content-Type Builder**
2. Seleccionar **colegio**
3. Clic en **Add another field**
4. Seleccionar tipo **Number**
5. Nombre: `total_matriculados`
6. Format: **integer**
7. Guardar y publicar

### Para Content-Type `curso`:
1. Ir a **Content-Type Builder**
2. Seleccionar **curso**
3. Clic en **Add another field**
4. Seleccionar tipo **Number**
5. Nombre: `matriculados`
6. Format: **integer**
7. Guardar y publicar

---

## 5. Campos relacionados que también deberían existir

### En `colegio`:
- ✅ `colegio_nombre` (Text)
- ✅ `rbd` (Number)
- ⚠️ `comuna` (Relation con tabla comunas O Text)
- ✅ `region` (Text)
- ⚠️ `direccion` (Text o Relation con direcciones)
- ⚠️ `telefono` (Text)
- ⚠️ `email` (Email)
- ➕ `total_matriculados` (Number) - **A AGREGAR**

### En `curso`:
- ✅ `nombre_curso` (Text)
- ✅ `nivel` (Enumeration: Basica, Media)
- ✅ `grado` (Number)
- ✅ `anio` (Number)
- ✅ `colegio` (Relation con colegio)
- ✅ `versiones_materiales` (JSON)
- ➕ `matriculados` (Number) - **A AGREGAR**

---

## 6. Verificación después de agregar

Después de agregar los campos, ejecutar estas consultas para verificar:

### Verificar `colegio`:
```bash
GET /api/colegios?populate=*&pagination[pageSize]=1
```

### Verificar `curso`:
```bash
GET /api/cursos?populate=colegio&pagination[pageSize]=1
```

Deberías ver los nuevos campos `total_matriculados` y `matriculados` en las respuestas.

---

## 7. Datos de ejemplo para poblar

### Ejemplo para American Academy (RBD: 10611):

**Colegio:**
```json
{
  "total_matriculados": 420
}
```

**Cursos:**
```json
[
  { "nombre_curso": "1° Básico", "matriculados": 35 },
  { "nombre_curso": "2° Básico", "matriculados": 38 },
  { "nombre_curso": "3° Básico", "matriculados": 36 },
  { "nombre_curso": "4° Básico", "matriculados": 40 }
]
```

---

## 8. Permisos necesarios

Asegúrate de que estos campos sean:
- ✅ **Readable** por la API pública (si es necesario)
- ✅ **Writable** por usuarios autenticados
- ✅ **Incluidos en populate** por defecto

---

## 9. Migración de datos existentes

Si ya existen registros de colegios y cursos:
1. Los campos nuevos tendrán valor `null` por defecto
2. La API frontend mostrará "No disponible" cuando sea `null`
3. Se pueden actualizar manualmente o mediante script

---

## Resultado esperado

Después de agregar estos campos:

✅ La tabla de listas mostrará la cantidad de matriculados por colegio
✅ El modal de edición permitirá actualizar estos valores
✅ La API `/api/crm/listas/por-colegio` devolverá los datos correctamente
✅ Los reportes y exportaciones incluirán información de matriculados

---

## Contacto para dudas

Si hay algún problema o los campos ya existen con otro nombre, por favor indicar:
- ¿Cuál es el nombre actual del campo?
- ¿En qué content-type está?
- ¿Qué tipo de dato es?
