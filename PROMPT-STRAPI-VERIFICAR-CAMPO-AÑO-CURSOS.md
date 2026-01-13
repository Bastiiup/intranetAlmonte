# Prompt para Strapi: Verificar y Corregir Campo `año` en Content Type `cursos`

## Contexto del Problema

Estamos teniendo un error **SOLO cuando subimos un PDF** para agregar versiones de materiales a un curso. El error es:

```
año must be a 'number' type, but the final value was: 'NaN'.
```

Este error ocurre cuando intentamos actualizar un curso (para agregar `versiones_materiales`) que **no tiene un año definido** o tiene un año inválido.

**IMPORTANTE:** El problema NO ocurre al crear o editar cursos normalmente, solo cuando subimos un PDF.

## Situación Actual

1. **Content Type:** `cursos`
2. **Campo problemático:** `año` (tipo: `number`)
3. **Error:** Cuando actualizamos el curso sin incluir `año` o con un valor inválido, Strapi valida y rechaza la petición.

## Lo que Necesitamos Verificar

### 1. Verificar la Configuración del Campo `año`

Por favor, verifica en el schema del content type `cursos`:

**Archivo:** `strapi/src/api/curso/content-types/curso/schema.json`

Busca el campo `año` y verifica:

```json
{
  "año": {
    "type": "number",
    "required": true/false,  // ← ¿Es requerido?
    "min": null,             // ← ¿Tiene mínimo?
    "max": null              // ← ¿Tiene máximo?
  }
}
```

### 2. Opciones de Solución

**Opción A: Si `año` NO debe ser requerido**
- Cambiar `"required": false` en el schema
- Esto permitirá que los cursos existan sin año
- Al actualizar, podemos omitir el campo si no existe

**Opción B: Si `año` DEBE ser requerido**
- Asegurar que todos los cursos existentes tengan un año válido
- O establecer un valor por defecto (ej: año actual)
- O hacer que el campo sea opcional pero con validación

**Opción C: Permitir `null` o valores por defecto**
- Configurar el campo para aceptar `null` o un valor por defecto
- Esto permitiría actualizar cursos sin especificar año

### 3. Verificar Cursos Existentes

Por favor, verifica si hay cursos en la base de datos que:
- No tienen el campo `año` definido
- Tienen `año` como `null` o `undefined`
- Tienen `año` con un valor inválido (no numérico)

### 4. Recomendación

**Recomendamos la Opción A** (hacer `año` opcional):
- Los cursos pueden existir sin año (por ejemplo, cursos históricos o en proceso de configuración)
- Al actualizar versiones de materiales, no necesitamos especificar el año si ya existe
- El frontend puede manejar cursos sin año mostrando "Sin año" o el año actual

## Schema Esperado (Recomendado)

```json
{
  "año": {
    "type": "number",
    "required": false,  // ← Opcional
    "min": 1900,        // ← Validación mínima (opcional)
    "max": 2100         // ← Validación máxima (opcional)
  }
}
```

## Verificación Después del Cambio

Después de modificar el schema, por favor:

1. **Rebuild de Strapi:**
   ```bash
   npm run build
   # o
   yarn build
   ```

2. **Verificar en Admin Panel:**
   - Ir a Content-Type Builder → `cursos`
   - Verificar que `año` aparezca como opcional
   - Intentar crear/editar un curso sin especificar año

3. **Probar desde API:**
   ```bash
   # PUT /api/cursos/{id}
   # Sin incluir campo "año" en el payload
   {
     "data": {
       "versiones_materiales": [...]
     }
   }
   ```
   - Debe funcionar sin error si `año` es opcional
   - O debe usar el valor existente si `año` es requerido pero ya existe

## Información Adicional

- **Content Type:** `cursos`
- **Campo:** `año` (tipo `number`)
- **Ubicación del schema:** `strapi/src/api/curso/content-types/curso/schema.json`
- **Error actual:** `año must be a 'number' type, but the final value was: 'NaN'`
- **Cuándo ocurre:** Al actualizar un curso con `versiones_materiales` sin incluir `año` válido

## Preguntas para Strapi

1. ¿El campo `año` está configurado como `required: true`?
2. ¿Hay cursos existentes sin el campo `año` definido?
3. ¿Podemos hacer que `año` sea opcional (`required: false`)?
4. Si `año` debe ser requerido, ¿podemos establecer un valor por defecto (ej: año actual)?
5. ¿Hay alguna validación adicional en el campo `año` que esté causando el error?

---

**Nota:** Si el campo `año` puede ser opcional, el frontend ya está preparado para omitirlo del payload cuando no existe o es inválido. Solo necesitamos que Strapi acepte actualizaciones sin este campo.
