# Configuración de Equipos de Trabajo en Strapi

Este documento explica cómo configurar el content type "Equipo" en Strapi para poder relacionar contactos en equipos de trabajo.

## Paso 1: Crear el Content Type "Equipo"

1. Ve a Strapi Admin → Content-Type Builder
2. Haz clic en "Create new collection type"
3. Nombre: `equipo` (singular) o `equipos` (plural)
4. Haz clic en "Continue"

## Paso 2: Agregar Campos

Agrega los siguientes campos al content type "Equipo":

### Campo: `nombre` (Text)
- **Tipo**: Text
- **Requerido**: ✅ Sí
- **Único**: ✅ Sí (opcional, pero recomendado)

### Campo: `descripcion` (Text)
- **Tipo**: Text (Long text)
- **Requerido**: ❌ No

### Campo: `activo` (Boolean)
- **Tipo**: Boolean
- **Requerido**: ❌ No
- **Valor por defecto**: `true`

### Campo: `miembros` (Relation)
- **Tipo**: Relation
- **Relación**: Many-to-Many
- **Relacionado con**: `Persona` (personas)
- **Nombre del campo en el otro lado**: `equipos` (esto creará automáticamente el campo en Persona)

### Campo: `colegio` (Relation)
- **Tipo**: Relation
- **Relación**: Many-to-One
- **Relacionado con**: `Colegio` (colegios)
- **Nombre del campo en el otro lado**: (dejar vacío o usar un nombre descriptivo)

### Campo: `lider` (Relation)
- **Tipo**: Relation
- **Relación**: Many-to-One
- **Relacionado con**: `Persona` (personas)
- **Nombre del campo en el otro lado**: (dejar vacío)

## Paso 3: Configurar Permisos

1. Ve a Strapi Admin → Settings → Users & Permissions → Roles
2. Selecciona el rol apropiado (Public, Authenticated, etc.)
3. Busca "Equipo" en la lista de permisos
4. Habilita los siguientes permisos:
   - ✅ `find` (GET)
   - ✅ `findOne` (GET por ID)
   - ✅ `create` (POST)
   - ✅ `update` (PUT)
   - ✅ `delete` (DELETE)

## Paso 4: Verificar que el Campo `equipos` se Creó en Persona

1. Ve a Content-Type Builder
2. Abre el content type "Persona"
3. Verifica que existe un campo `equipos` de tipo Relation (Many-to-Many con Equipo)
4. Si no existe, créalo manualmente:
   - **Tipo**: Relation
   - **Relación**: Many-to-Many
   - **Relacionado con**: `Equipo` (equipos)
   - **Nombre del campo en el otro lado**: `miembros`

## Paso 5: Guardar y Reiniciar

1. Haz clic en "Save" en Content-Type Builder
2. Reinicia Strapi si es necesario
3. Verifica que puedes crear equipos desde Strapi Admin

## Notas Importantes

- El campo `miembros` en Equipo y `equipos` en Persona deben estar relacionados (Many-to-Many)
- Un contacto puede pertenecer a múltiples equipos
- Un equipo puede tener múltiples miembros
- El campo `lider` es opcional y puede ser cualquier persona (no necesariamente un miembro del equipo)
- El campo `colegio` es opcional y permite asociar un equipo a un colegio específico

## Uso en la Aplicación

Una vez configurado, podrás:
- Crear equipos desde la API: `POST /api/crm/equipos`
- Asignar contactos a equipos: `POST /api/crm/equipos/[id]/miembros`
- Ver equipos de un contacto en la página de detalle
- Gestionar equipos desde la interfaz de usuario
