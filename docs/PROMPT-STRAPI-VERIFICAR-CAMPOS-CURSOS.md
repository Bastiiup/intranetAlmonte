# 🎯 Prompt para Cursor - Verificar Campos del Content Type Cursos

**Copia y pega esto en Cursor en el proyecto de Strapi:**

---

## Prompt Principal

```
Necesito verificar el schema exacto del content type "cursos" en Strapi para corregir errores en el frontend.

Por favor:

1. Revisa el schema del content type "cursos" en:
   src/api/curso/content-types/curso/schema.json
   O en: src/api/cursos/content-types/cursos/schema.json

2. Identifica el nombre EXACTO del campo que almacena el nombre del curso:
   - ¿Se llama "nombre"?
   - ¿Se llama "curso_nombre"?
   - ¿Se llama de otra forma?

3. Verifica qué campos existen realmente en el schema:
   - Campo para el nombre del curso
   - Campo "nivel" (si existe)
   - Campo "grado" (si existe)
   - Campo "activo" (si existe)
   - Relación con "colegio"
   - Componente "materiales"

4. Verifica qué campos son ordenables (sortable):
   - ¿Puedo ordenar por el nombre del curso?
   - ¿Qué campos puedo usar en sort?

5. Muestra el schema completo del content type "cursos" y explica:
   - El nombre exacto de cada campo
   - Qué campos son requeridos
   - Qué campos son ordenables
   - La estructura del componente "materiales"

6. Si el campo del nombre NO se llama "nombre" ni "curso_nombre", indica cuál es el nombre correcto.

Con esta información podré corregir el código del frontend para que use los nombres correctos.
```

---

## Prompt Alternativo (Más Específico)

```
Revisa el content type "cursos" en Strapi y responde:

1. ¿Cuál es el nombre EXACTO del campo que almacena el nombre del curso?
   (Busca en: src/api/curso/content-types/curso/schema.json o similar)

2. ¿Existe el campo "nivel" en el schema? Si no existe, ¿qué campo se usa para el nivel?

3. ¿Existe el campo "grado" en el schema? Si no existe, ¿qué campo se usa para el grado?

4. ¿Qué campos son ordenables (sortable) en este content type?

5. Muestra el contenido completo del archivo schema.json del content type "cursos"

6. Verifica la estructura del componente "materiales":
   - ¿Se llama "materiales" o tiene otro nombre?
   - ¿Qué campos tiene el componente?
   - ¿El componente es repeatable?

Con esta información corregiré los errores:
- "Invalid key nombre" en sort
- "Invalid key curso_nombre" en body
```

---

## Prompt de Verificación Rápida

```
Ejecuta estos comandos en el proyecto de Strapi y muestra los resultados:

1. Buscar el schema del content type cursos:
   find . -name "schema.json" -path "*/curso*" -o -path "*/cursos*"

2. Mostrar el contenido del schema encontrado

3. Verificar si existe el campo "nombre" o "curso_nombre" en el schema

4. Listar todos los campos del content type cursos

5. Verificar qué campos son sortable
```

---

## Instrucciones de Uso

1. **Abre Cursor en el proyecto de Strapi**
2. **Copia uno de los prompts de arriba** (recomiendo el "Prompt Principal")
3. **Pégalo en el chat de Cursor**
4. **Cursor te ayudará a encontrar el schema y verificar los campos**
5. **Comparte los resultados** para que pueda corregir el código del frontend

---

## Información que Necesito

Después de ejecutar el prompt, necesito saber:

1. ✅ **Nombre exacto del campo del nombre del curso** (ej: `nombre`, `curso_nombre`, `titulo`, etc.)
2. ✅ **Campos que existen en el schema** (nivel, grado, activo, etc.)
3. ✅ **Campos que son ordenables** (sortable)
4. ✅ **Estructura del componente materiales** (nombre del componente, campos, etc.)

---

## Errores Actuales

El frontend está recibiendo estos errores:

1. **Error en GET (sort):**
   ```
   Invalid key nombre
   ```
   - Intenta ordenar por `nombre:asc` pero el campo no existe o no es ordenable

2. **Error en POST (body):**
   ```
   Invalid key curso_nombre
   ```
   - Intenta enviar `curso_nombre` pero el campo no existe en Strapi

---

## Solución Esperada

Una vez que sepa el nombre correcto del campo, actualizaré:

1. **El sort** para usar el campo correcto (o removerlo si no es ordenable)
2. **El POST/PUT** para usar el nombre correcto del campo
3. **La visualización** para leer el campo correcto

---

**Última actualización:** 9 de Enero 2026  
**Estado:** ⏳ Esperando verificación del schema en Strapi
