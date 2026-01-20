# 🎯 Prompt para Cursor - Corregir Content Type Cursos

**Copia y pega esto en Cursor en el proyecto de Strapi:**

---

## Prompt Principal - Corrección Urgente

```
Necesito corregir el content type "cursos" en Strapi porque el frontend está recibiendo errores al intentar crear/leer cursos.

ERRORES ACTUALES:
1. Invalid key materiales - al intentar populate[materiales]
2. Invalid key nombre - al intentar enviar campo nombre
3. Invalid key curso_nombre - al intentar enviar campo curso_nombre
4. Invalid key titulo - al intentar enviar campo titulo

TAREAS:

1. Verificar el schema actual del content type "cursos":
   - Buscar: src/api/curso/content-types/curso/schema.json
   - O: src/api/cursos/content-types/cursos/schema.json
   - Mostrar el schema completo actual

2. Identificar qué campos existen realmente:
   - ¿Cómo se llama el campo del nombre del curso?
   - ¿Existe el componente "materiales"?
   - ¿Cómo se llama realmente el componente de materiales?
   - ¿Qué otros campos tiene el content type?

3. SI EL CONTENT TYPE NO EXISTE o está incompleto:
   - Crear el content type "cursos" con los siguientes campos:
     * nombre_curso (Text, required) - Nombre del curso
     * nivel (Text, optional) - Ej: "Básico", "Medio", "Superior"
     * grado (Text, optional) - Ej: "1° Básico", "2° Medio"
     * activo (Boolean, default: true)
     * colegio (Relation: manyToOne con "colegios")
     * materiales (Component: repeatable "curso.material")

4. SI EL COMPONENTE "materiales" NO EXISTE:
   - Crear el componente repeatable "curso.material" con:
     * material_nombre (Text, required)
     * tipo (Enum: util, libro, cuaderno, otro)
     * cantidad (Number, default: 1)
     * obligatorio (Boolean, default: true)
     * descripcion (Text, optional)

5. CORREGIR el schema para que coincida con lo que el frontend necesita:
   - El campo del nombre debe existir y ser accesible
   - El componente materiales debe existir y ser populateable
   - La relación con colegios debe funcionar

6. Verificar permisos:
   - Habilitar find, findOne, create, update, delete para el content type "cursos"

7. Probar crear un curso desde Strapi Admin para verificar que funciona

Por favor, muestra el schema actual (si existe) y luego crea/corrige según sea necesario.
```

---

## Prompt Alternativo - Verificación y Corrección

```
Verifica y corrige el content type "cursos" en Strapi:

1. ¿Existe el content type "cursos"?
   - Buscar en: src/api/curso/ o src/api/cursos/

2. Si existe, mostrar el schema.json completo

3. Verificar estos problemas específicos:

   a) Campo del nombre del curso:
      - ¿Cómo se llama? (nombre, curso_nombre, titulo, nombre_curso, etc.)
      - ¿Existe realmente?
      - Si no existe, crearlo con nombre "nombre_curso" (Text, required)

   b) Componente materiales:
      - ¿Existe el componente "materiales"?
      - ¿Cómo se llama realmente? (materiales, material, lista_materiales, etc.)
      - Si no existe, crearlo como componente repeatable "curso.material"
      - Si existe pero tiene otro nombre, mostrarlo

   c) Relación con colegios:
      - ¿Existe la relación con "colegios"?
      - ¿Es manyToOne?
      - Si no existe, crearla

4. Si el content type NO existe:
   - Crear completamente desde cero siguiendo la estructura del prompt anterior

5. Después de corregir:
   - Hacer rebuild de Strapi
   - Probar crear un curso desde Strapi Admin
   - Verificar que la API funciona: GET /api/cursos

Muestra el schema actual y los cambios que hiciste.
```

---

## Prompt Rápido - Solo Verificación

```
Ejecuta estos comandos y muestra los resultados:

1. find . -name "schema.json" -path "*curso*"

2. Si encuentra archivos, mostrar el contenido completo

3. Si NO encuentra archivos, significa que el content type no existe y necesita crearse

4. Verificar si existe el componente "curso.material" o similar:
   find . -name "*.json" -path "*material*" -o -path "*curso*"

5. Mostrar estructura de directorios de cursos si existe:
   ls -la src/api/curso* 2>/dev/null || echo "No existe"

Con esta información podré corregir el código del frontend.
```

---

## Estructura Esperada del Schema

Después de crear/corregir, el schema debería verse así:

```json
{
  "kind": "collectionType",
  "collectionName": "cursos",
  "info": {
    "singularName": "curso",
    "pluralName": "cursos",
    "displayName": "Curso"
  },
  "options": {},
  "pluginOptions": {},
  "attributes": {
    "nombre_curso": {
      "type": "string",
      "required": true
    },
    "nivel": {
      "type": "string"
    },
    "grado": {
      "type": "string"
    },
    "activo": {
      "type": "boolean",
      "default": true
    },
    "colegio": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::colegio.colegio",
      "inversedBy": "cursos"
    },
    "materiales": {
      "type": "component",
      "repeatable": true,
      "component": "curso.material"
    }
  }
}
```

Y el componente `curso.material` debería ser:

```json
{
  "collectionName": "components_curso_materials",
  "info": {
    "displayName": "Material",
    "description": ""
  },
  "options": {},
  "attributes": {
    "material_nombre": {
      "type": "string",
      "required": true
    },
    "tipo": {
      "type": "enumeration",
      "enum": ["util", "libro", "cuaderno", "otro"],
      "required": true
    },
    "cantidad": {
      "type": "integer",
      "default": 1,
      "min": 1
    },
    "obligatorio": {
      "type": "boolean",
      "default": true
    },
    "descripcion": {
      "type": "text"
    }
  }
}
```

---

## Instrucciones de Uso

1. **Abre Cursor en el proyecto de Strapi**
2. **Copia el "Prompt Principal - Corrección Urgente"** (el más completo)
3. **Pégalo en el chat de Cursor**
4. **Cursor te ayudará a verificar, corregir o crear el content type**
5. **Comparte los resultados** (schema final, cambios realizados)
6. **Haz rebuild de Strapi**: `npm run build` y reinicia
7. **Prueba crear un curso** desde Strapi Admin para verificar

---

## Información Necesaria del Resultado

Después de ejecutar el prompt, necesito saber:

1. ✅ **Nombre exacto del campo del nombre del curso**
2. ✅ **Nombre exacto del componente de materiales** (si es diferente a "materiales")
3. ✅ **Schema completo después de las correcciones**
4. ✅ **Si se creó/corrigió exitosamente**
5. ✅ **Si el rebuild funcionó**

Con esta información actualizaré el código del frontend para usar los nombres correctos.

---

## Errores Actuales que se Deben Corregir

### Error 1: Invalid key materiales (en populate)
```
populate[materiales]=true
```
**Solución:** Verificar que el componente se llame "materiales" o usar el nombre correcto

### Error 2: Invalid key nombre/curso_nombre/titulo (en body)
```
{ nombre: "...", curso_nombre: "...", titulo: "..." }
```
**Solución:** Usar el nombre exacto del campo que existe en el schema (probablemente "nombre_curso")

---

**Última actualización:** 9 de Enero 2026  
**Prioridad:** 🔴 **ALTA** - Bloquea funcionalidad de cursos
