# 🎯 Prompt para Cursor - Crear Content Type Listas de Útiles

**Copia y pega esto en Cursor en el proyecto de Strapi:**

---

## Prompt Principal

```
Necesito crear un nuevo content type en Strapi llamado "listas-utiles" para gestionar listas predefinidas de útiles escolares que pueden ser reutilizadas por múltiples cursos.

ESTRUCTURA REQUERIDA:

1. CONTENT TYPE: "listas-utiles"
   Campos:
   - nombre (Text, required) - Nombre descriptivo de la lista
   - nivel (Enum, required) - Opciones: "Basica", "Media"
   - grado (Integer, required, min: 1, max: 8) - Grado escolar (1-8 para Básica, 1-4 para Media)
   - descripcion (Text, optional) - Descripción adicional
   - materiales (Component: repeatable "curso.material") - Lista de materiales
   - activo (Boolean, default: true)

2. MODIFICAR CONTENT TYPE: "cursos"
   Agregar relación:
   - lista_utiles (Relation: manyToOne con "listas-utiles", optional)
   
   Esta relación permite que un curso use una lista predefinida de útiles.

IMPORTANTE:
- El componente "curso.material" ya existe, reutilizarlo
- La relación debe ser opcional para mantener compatibilidad con cursos existentes
- Habilitar permisos (find, findOne, create, update, delete) para el nuevo content type

Por favor:
1. Crea el content type "listas-utiles" con todos los campos mencionados
2. Reutiliza el componente existente "curso.material" para los materiales
3. Modifica el content type "cursos" para agregar la relación lista_utiles
4. Configura los permisos básicos
5. Confirma cuando esté listo
```

---

## Estructura Esperada del Schema

### Content Type: listas-utiles

```json
{
  "kind": "collectionType",
  "collectionName": "listas_utiles",
  "info": {
    "singularName": "lista-utiles",
    "pluralName": "listas-utiles",
    "displayName": "Lista de Útiles"
  },
  "attributes": {
    "nombre": {
      "type": "string",
      "required": true
    },
    "nivel": {
      "type": "enumeration",
      "enum": ["Basica", "Media"],
      "required": true
    },
    "grado": {
      "type": "integer",
      "required": true,
      "min": 1,
      "max": 8
    },
    "descripcion": {
      "type": "text"
    },
    "materiales": {
      "type": "component",
      "repeatable": true,
      "component": "curso.material"
    },
    "activo": {
      "type": "boolean",
      "default": true
    }
  }
}
```

### Modificación en Content Type: cursos

```json
{
  "lista_utiles": {
    "type": "relation",
    "relation": "manyToOne",
    "target": "api::lista-utiles.lista-utiles",
    "inversedBy": null
  }
}
```

---

**Última actualización:** 9 de Enero 2026
