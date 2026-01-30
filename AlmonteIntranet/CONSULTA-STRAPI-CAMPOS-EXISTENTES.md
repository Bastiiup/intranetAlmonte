# Consulta para IA de Strapi - Verificar Campos de Matriculados

## 🔍 Pregunta Principal

¿Existen campos relacionados con **cantidad de estudiantes matriculados** en los Content-Types `colegio` y `curso`?

---

## 📋 Información que necesito

### 1. En el Content-Type `colegio`:

Por favor indícame si existe algún campo con estos nombres (o similares):
- `total_matriculados`
- `matriculados`
- `cantidad_matriculados`
- `alumnos_matriculados`
- `total_alumnos`
- `enrollment`
- `estudiantes`
- `cantidad_estudiantes`
- Cualquier otro campo numérico relacionado con cantidad de estudiantes

**Si existe:**
- ✅ ¿Cuál es el nombre EXACTO del campo?
- ✅ ¿Qué tipo de dato es? (Number, Text, Relation, etc.)
- ✅ ¿Es un campo directo o una relación?
- ✅ ¿Tiene valores poblados actualmente?

**Ejemplo de respuesta esperada:**
```
Sí, existe el campo "total_matriculados" (tipo: Number)
Tiene valores en 45 de 120 colegios
```

---

### 2. En el Content-Type `curso`:

Por favor indícame si existe algún campo con estos nombres (o similares):
- `matriculados`
- `cantidad_matriculados`
- `alumnos`
- `cantidad_alumnos`
- `estudiantes`
- `cantidad_estudiantes`
- `enrollment`
- `numero_estudiantes`
- Cualquier otro campo numérico relacionado con cantidad de estudiantes

**Si existe:**
- ✅ ¿Cuál es el nombre EXACTO del campo?
- ✅ ¿Qué tipo de dato es? (Number, Text, Relation, etc.)
- ✅ ¿Es un campo directo o una relación?
- ✅ ¿Tiene valores poblados actualmente?

**Ejemplo de respuesta esperada:**
```
Sí, existe el campo "matriculados" (tipo: Number)
Tiene valores en 230 de 450 cursos
```

---

### 3. Campos relacionados con estudiantes

¿Existe algún Content-Type relacionado con estudiantes? Por ejemplo:
- `estudiante`
- `alumno`
- `matricula`
- `student`
- `enrollment`

Si existe, ¿tiene relación con `colegio` y/o `curso`?

---

## 🎯 Consulta específica para verificar

Por favor ejecuta estas consultas y muéstrame el resultado:

### A. Ver todos los campos de `colegio`:
```
Muéstrame TODOS los campos del Content-Type "colegio"
Especialmente los de tipo Number o Relation
```

### B. Ver todos los campos de `curso`:
```
Muéstrame TODOS los campos del Content-Type "curso"
Especialmente los de tipo Number o Relation
```

### C. Ver un ejemplo real:
```
Muéstrame un registro completo de:
- 1 colegio con RBD 10611 (American Academy)
- 1 curso asociado a ese colegio

Con TODOS sus campos (incluye populate=*)
```

---

## 📊 Datos que necesito del ejemplo

Del colegio **American Academy (RBD: 10611)**, necesito ver:
- ✅ `colegio_nombre`
- ✅ `rbd`
- ⚠️ ¿Tiene campo de matriculados? → **¿Cuál es su nombre?**
- ✅ `comuna` (o relación con comuna)
- ✅ `region`
- ✅ `direccion` (o relación con direcciones)
- ✅ `telefono` (o relación con telefonos)
- ✅ `email`

De los cursos de ese colegio, necesito ver:
- ✅ `nombre_curso`
- ✅ `nivel`
- ✅ `grado`
- ✅ `anio`
- ⚠️ ¿Tiene campo de matriculados? → **¿Cuál es su nombre?**
- ✅ `versiones_materiales`
- ✅ `colegio` (relación)

---

## 🔑 Lo más importante

**Si los campos ya existen pero con otro nombre:**
- Por favor indícame el **nombre exacto** del campo
- Te daré ejemplos de cómo accederlo desde la API

**Si los campos NO existen:**
- Tengo instrucciones listas para crearlos (en el archivo anterior)

**Si los datos están en otro Content-Type:**
- Indícame cuál es y cómo se relaciona

---

## ✅ Respuesta ideal

La respuesta ideal sería algo como:

```json
{
  "colegio": {
    "campo_matriculados": {
      "nombre": "total_matriculados",
      "tipo": "Number",
      "existe": true,
      "poblado": "45/120 registros"
    }
  },
  "curso": {
    "campo_matriculados": {
      "nombre": "matriculados",
      "tipo": "Number", 
      "existe": true,
      "poblado": "230/450 registros"
    }
  }
}
```

O simplemente:

```
✅ Colegio tiene campo "total_matriculados" (Number)
✅ Curso tiene campo "matriculados" (Number)
```

O si no existen:

```
❌ Colegio NO tiene campo de matriculados
❌ Curso NO tiene campo de matriculados
```

---

## 🚀 Siguiente paso

Con esta información podré:
1. ✅ Actualizar la API para usar el campo correcto
2. ✅ Mostrar los datos en el frontend
3. ✅ Permitir edición de matriculados
4. ✅ Generar reportes con totales correctos

---

**¡Gracias por la información!** 🙏
