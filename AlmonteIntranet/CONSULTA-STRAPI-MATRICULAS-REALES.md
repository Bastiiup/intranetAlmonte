# Consulta a Strapi - Verificar Datos Reales de Matrícula en Cursos

**Fecha:** 30 de enero de 2026  
**Objetivo:** Verificar si los cursos tienen datos poblados en el campo `matricula`

---

## 🔍 Consulta Principal

Por favor, ejecuta esta consulta en Strapi y muéstrame los resultados:

### 1. Ver cursos de American Academy (RBD: 10611) con matrícula

```
GET /api/cursos?filters[colegio][rbd][$eq]=10611&fields[0]=nombre_curso&fields[1]=nivel&fields[2]=grado&fields[3]=anio&fields[4]=matricula&populate[colegio][fields][0]=colegio_nombre&populate[colegio][fields][1]=rbd&pagination[pageSize]=20
```

**O en lenguaje natural para la IA:**
```
Muéstrame todos los cursos del colegio con RBD 10611 (American Academy)
Incluye los campos: nombre_curso, nivel, grado, anio, matricula
Incluye también el nombre del colegio
```

---

### 2. Ver estadísticas de cursos con/sin matrícula

```
Muéstrame:
- Total de cursos en la base de datos
- Cuántos tienen el campo "matricula" con valor > 0
- Cuántos tienen el campo "matricula" = 0 o null
- Ejemplos de 5 cursos con matrícula > 0 (si existen)
```

---

### 3. Ver cursos de los 6 colegios que aparecen en la tabla

Por favor muéstrame los datos de matrícula de los cursos de estos colegios:

**A. American Academy (RBD: 10611)**
```
Cursos: 4° Básico, 3° Básico, 2° Básico, 1° Básico (año 2026)
¿Tienen datos en campo "matricula"?
```

**B. colegio1 (RBD: 5654343)**
```
Cursos: 1° Basica A (año 2026)
¿Tiene datos en campo "matricula"?
```

**C. Colegio Estela Segura (RBD: 10479)**
```
Cursos: 4° Básico, 3° Básico, 2° Básico, 1° Básico (año 2026)
¿Tienen datos en campo "matricula"?
```

**D. Academia Hospicio (RBD: 12605)**
```
Cursos: 4° Básico, 3° Básico, 2° Básico, 1° Básico (año 2026)
¿Tienen datos en campo "matricula"?
```

**E. Colegio Elena Bettini Independencia (RBD: 10350)**
```
Cursos: 1° Básico (año 2026)
¿Tiene datos en campo "matricula"?
```

**F. Colegio Ejemplo 1 (RBD: 12345)**
```
Cursos: 1° Básico (año 2026)
¿Tiene datos en campo "matricula"?
```

---

## 📊 Formato de respuesta esperado

Para cada colegio, espero algo como:

```json
{
  "colegio": "American Academy (RBD: 10611)",
  "total_cursos": 4,
  "cursos": [
    {
      "id": 223663,
      "nombre": "4° Básico",
      "grado": "4",
      "nivel": "Basica",
      "anio": 2026,
      "matricula": 67  // ← Valor en Strapi
    },
    {
      "id": 223662,
      "nombre": "3° Básico",
      "grado": "3",
      "nivel": "Basica",
      "anio": 2026,
      "matricula": 68  // ← Valor en Strapi
    }
  ],
  "total_matriculados": 135  // ← Suma de todos los cursos
}
```

**O si NO hay datos:**
```json
{
  "colegio": "American Academy (RBD: 10611)",
  "total_cursos": 4,
  "cursos": [
    {
      "id": 223663,
      "nombre": "4° Básico",
      "matricula": null  // ← No hay datos
    }
  ],
  "total_matriculados": 0
}
```

---

## 🎯 Lo que necesito saber

### Pregunta clave:
**¿Los cursos actuales en Strapi tienen valores en el campo `matricula`?**

**Opciones de respuesta:**

**A. ✅ SÍ tienen datos:**
```
Los cursos tienen datos de matrícula:
- American Academy: 353 estudiantes (suma de 4 cursos)
- Colegio Estela Segura: 245 estudiantes (suma de 4 cursos)
- Etc.
```
→ **Acción:** Verificar por qué la API no los está mostrando.

**B. ❌ NO tienen datos (todos en 0 o null):**
```
Los cursos NO tienen datos de matrícula:
- Todos los campos "matricula" están en 0 o null
- Se necesita poblar los datos manualmente o con importación
```
→ **Acción:** Crear script para importar datos de matrícula.

**C. ⚠️ Algunos SÍ, otros NO:**
```
Algunos cursos tienen datos, otros no:
- 120 cursos con matrícula > 0
- 450 cursos con matrícula = 0 o null
```
→ **Acción:** Identificar cuáles tienen datos y cuáles no.

---

## 📋 Consulta alternativa (si es más fácil)

Si prefieres, puedes ejecutar esta consulta SQL directa (si tienes acceso):

```sql
-- Ver cursos con matrícula del colegio RBD 10611
SELECT 
  c.id,
  c.nombre_curso,
  c.nivel,
  c.grado,
  c.anio,
  c.matricula,
  col.colegio_nombre,
  col.rbd
FROM cursos c
JOIN colegios col ON c.colegio_id = col.id
WHERE col.rbd = 10611
AND c.anio = 2026
ORDER BY c.grado;

-- Estadísticas generales
SELECT 
  COUNT(*) as total_cursos,
  SUM(CASE WHEN matricula > 0 THEN 1 ELSE 0 END) as con_matricula,
  SUM(CASE WHEN matricula IS NULL OR matricula = 0 THEN 1 ELSE 0 END) as sin_matricula,
  AVG(COALESCE(matricula, 0)) as promedio_matricula
FROM cursos;
```

---

## ✅ Una vez que tengas los resultados

Por favor compárteme:
1. ✅ Los datos de matrícula de los 6 colegios mencionados
2. ✅ El total de cursos con/sin matrícula en la base de datos
3. ✅ Ejemplos de cursos que SÍ tienen matrícula (si existen)

Con esa información podré:
- Verificar si el problema está en la API o en los datos
- Crear script de importación si es necesario
- Corregir la consulta si está mal formada

---

**¡Gracias!** 🙏
