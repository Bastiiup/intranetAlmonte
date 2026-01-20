# 🎯 Prompt para Cursor - Crear Content Type Cursos con Materiales

**Copia y pega esto en Cursor en el proyecto de Strapi:**

---

## Prompt Principal

```
Necesito crear un nuevo content type en Strapi llamado "cursos" que permita gestionar los cursos de cada colegio y los materiales (útiles, libros, etc.) que necesita cada curso.

Estructura requerida:

1. Content Type: "cursos"
   - Campos:
     - curso_nombre (Text, required)
     - nivel (Text, optional) - Ej: "Básico", "Medio", "Superior"
     - grado (Text, optional) - Ej: "1° Básico", "2° Medio"
     - activo (Boolean, default: true)
     - colegio (Relation: manyToOne con "colegios")
     - materiales (Component: repeatable)

2. Component: "curso.material" (repeatable)
   - Campos:
     - material_nombre (Text, required) - Ej: "Lápiz grafito", "Libro de Matemáticas"
     - tipo (Enum, required) - Opciones: "util", "libro", "cuaderno", "otro"
     - cantidad (Number, default: 1) - Cantidad necesaria
     - obligatorio (Boolean, default: true) - Si es obligatorio u opcional
     - descripcion (Text, optional) - Descripción adicional del material

Por favor:
1. Crea el content type "cursos" con todos los campos mencionados
2. Crea el componente repeatable "curso.material" con los campos especificados
3. Configura la relación manyToOne entre cursos y colegios
4. Asegúrate de que el componente materiales esté correctamente vinculado
5. Configura los permisos básicos (find, findOne, create, update, delete) para el content type
```

---

## Prompt Alternativo (Más Detallado)

```
Crear en Strapi un sistema de gestión de cursos por colegio con materiales asociados.

REQUERIMIENTOS:

1. CONTENT TYPE: "cursos"
   Campos base:
   - curso_nombre: Text (required, unique: false)
   - nivel: Text (optional) - Para clasificar: "Básico", "Medio", "Superior"
   - grado: Text (optional) - Para especificar: "1° Básico", "2° Medio", etc.
   - activo: Boolean (default: true)
   
   Relaciones:
   - colegio: manyToOne con content type "colegios"
   
   Componentes:
   - materiales: Component repeatable "curso.material"

2. COMPONENT: "curso.material" (repeatable)
   Campos:
   - material_nombre: Text (required) - Nombre del material
   - tipo: Enum (required) con opciones:
     * "util" - Útiles escolares (lápices, gomas, etc.)
     * "libro" - Libros de texto
     * "cuaderno" - Cuadernos
     * "otro" - Otros materiales
   - cantidad: Number (default: 1, min: 1) - Cantidad necesaria
   - obligatorio: Boolean (default: true) - Si es obligatorio u opcional
   - descripcion: Text (optional, long text) - Descripción adicional

3. CONFIGURACIÓN:
   - Habilitar Draft & Publish
   - Configurar permisos para API (find, findOne, create, update, delete)
   - Asegurar que la relación con colegios funcione correctamente

Por favor, crea todo esto en Strapi y confirma cuando esté listo.
```

---

## Prompt de Verificación

```
Verifica que el content type "cursos" en Strapi tenga:

1. ✅ Campo "curso_nombre" (Text, required)
2. ✅ Campo "nivel" (Text, optional)
3. ✅ Campo "grado" (Text, optional)
4. ✅ Campo "activo" (Boolean, default: true)
5. ✅ Relación "colegio" (manyToOne con "colegios")
6. ✅ Componente "materiales" (repeatable) con:
   - material_nombre (Text, required)
   - tipo (Enum: util, libro, cuaderno, otro)
   - cantidad (Number, default: 1)
   - obligatorio (Boolean, default: true)
   - descripcion (Text, optional)

Si falta algo, créalo. Si está todo, confirma.
```

---

## Instrucciones de Uso

1. **Abre Cursor en el proyecto de Strapi**
2. **Copia uno de los prompts de arriba** (recomiendo el "Prompt Principal")
3. **Pégalo en el chat de Cursor**
4. **Cursor te ayudará a crear el content type y componente**

---

## Estructura Esperada en Strapi

Después de crear, deberías tener:

```
Content Types:
  - cursos
    - curso_nombre (Text)
    - nivel (Text)
    - grado (Text)
    - activo (Boolean)
    - colegio (Relation → colegios)
    - materiales (Component → curso.material)

Components:
  - curso.material (repeatable)
    - material_nombre (Text)
    - tipo (Enum)
    - cantidad (Number)
    - obligatorio (Boolean)
    - descripcion (Text)
```

---

## Verificación Post-Creación

Después de crear, verifica:

1. ✅ Puedes crear un curso desde Strapi Admin
2. ✅ Puedes asociar un colegio al curso
3. ✅ Puedes agregar múltiples materiales al curso
4. ✅ La API `/api/cursos` responde correctamente
5. ✅ La relación con colegios funciona (puedes filtrar cursos por colegio)

---

## Notas Importantes

- **Nombre del content type:** Debe ser exactamente `cursos` (plural)
- **Relación con colegios:** Debe ser `manyToOne` (muchos cursos pertenecen a un colegio)
- **Componente materiales:** Debe ser `repeatable` para permitir múltiples materiales por curso
- **Permisos:** Asegúrate de habilitar los permisos necesarios en Settings → Users & Permissions Plugin → Roles → Public/Authenticated

---

**Última actualización:** Enero 2026
