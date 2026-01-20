# Prompt para Strapi: Configurar Campo Año en Cursos y Listas de Útiles

## Contexto del Problema

Actualmente estamos desarrollando un sistema CRM para gestionar colegios, cursos y listas de útiles escolares. El frontend (Next.js) está intentando guardar y filtrar cursos por año escolar, pero Strapi está devolviendo errores porque el campo `año` no existe en los content types.

### Errores Actuales:
```
[Strapi Client] ❌ Error response: {
  "status": 400,
  "name": "ValidationError",
  "message": "Invalid key año",
  "details": {
    "key": "año",
    "source": "body"
  }
}
```

### Situación Actual:
- El frontend envía el campo `año` al crear/actualizar cursos
- Strapi rechaza la petición porque el campo no existe en el schema
- Como solución temporal, estamos guardando el año en localStorage del navegador
- Necesitamos que Strapi tenga el campo `año` configurado para una solución permanente

## Tarea Requerida

Necesito que agregues el campo `año` (tipo `integer`) a los siguientes content types en Strapi:

1. **`cursos`** (api::curso.curso)
2. **`listas-utiles`** (api::listas-utiles.listas-utiles)

## Especificaciones del Campo

### Para ambos content types:

**Nombre del campo:** `año`
- **Tipo:** `integer`
- **Requerido:** `true` (required)
- **Valor por defecto:** Año actual (ej: 2025, 2026)
- **Validación:** 
  - Mínimo: 2000
  - Máximo: 2100
- **Configuración:**
  - Mostrar en el admin panel: `true`
  - Editable: `true`
  - Buscable: `true` (para poder filtrar por año)

## Archivos a Modificar

### 1. Content Type: `cursos`

**Ubicación:** `strapi/src/api/curso/content-types/curso/schema.json`

**Campo a agregar:**
```json
{
  "año": {
    "type": "integer",
    "required": true,
    "default": 2025,
    "min": 2000,
    "max": 2100
  }
}
```

### 2. Content Type: `listas-utiles`

**Ubicación:** `strapi/src/api/listas-utiles/content-types/listas-utiles/schema.json`

**Campo a agregar:**
```json
{
  "año": {
    "type": "integer",
    "required": true,
    "default": 2025,
    "min": 2000,
    "max": 2100
  }
}
```

## Pasos a Seguir

1. **Abrir Strapi Admin Panel** o editar los archivos de schema directamente

2. **Para `cursos`:**
   - Ir a Content-Type Builder → `cursos`
   - Agregar campo `año` tipo `integer`
   - Marcar como `required`
   - Establecer valor por defecto (año actual)
   - Establecer validaciones (min: 2000, max: 2100)
   - Guardar

3. **Para `listas-utiles`:**
   - Ir a Content-Type Builder → `listas-utiles`
   - Agregar campo `año` tipo `integer`
   - Marcar como `required`
   - Establecer valor por defecto (año actual)
   - Establecer validaciones (min: 2000, max: 2100)
   - Guardar

4. **Rebuild Strapi:**
   ```bash
   npm run build
   # o
   yarn build
   ```

5. **Reiniciar Strapi:**
   ```bash
   npm run develop
   # o
   yarn develop
   ```

## Verificación Post-Implementación

Después de implementar estos cambios, verifica:

1. ✅ Crear un curso con año 2025 - debe guardarse correctamente
2. ✅ Crear una lista de útiles con año 2024 - debe guardarse correctamente
3. ✅ Filtrar cursos por año - debe funcionar correctamente
4. ✅ El campo año aparece en el admin panel de Strapi
5. ✅ No hay errores "Invalid key año" en las peticiones

## Notas Importantes

- El campo debe llamarse `año` (con tilde). Si Strapi no acepta caracteres especiales, usar `ano` y el frontend manejará ambos nombres.
- El campo debe ser requerido para mantener la integridad de los datos.
- El valor por defecto debe ser el año actual para facilitar la creación de nuevos registros.
- Después del rebuild, los cursos y listas de útiles existentes necesitarán tener el campo `año` asignado manualmente o mediante un script de migración.

## Migración de Datos Existentes

Si ya existen cursos o listas de útiles sin el campo `año`, se recomienda:

1. **Opción 1:** Crear un script de migración que asigne el año actual a todos los registros existentes
2. **Opción 2:** Permitir que el campo sea opcional temporalmente, asignar valores manualmente, y luego hacerlo requerido

## Preguntas para Strapi

1. ¿El campo `año` ya existe en alguno de estos content types? Si es así, ¿cuál es su configuración actual?
2. ¿Hay algún problema conocido con caracteres especiales (tildes) en nombres de campos en Strapi?
3. ¿Necesitamos hacer algún cambio adicional en los controllers o services después de agregar el campo?
4. ¿Hay alguna mejor práctica para manejar campos de tipo año/fecha en Strapi?

## Resultado Esperado

Una vez configurado el campo `año` en Strapi:
- El frontend podrá guardar cursos y listas de útiles con año correctamente
- El filtro por año funcionará usando los datos de Strapi (no localStorage)
- Los datos serán persistentes y compartidos entre todos los usuarios
- No habrá más errores "Invalid key año" en las peticiones

---

**Por favor, confirma si el campo `año` ya existe en alguno de estos content types, y si no, agrégalo según las especificaciones anteriores.**
