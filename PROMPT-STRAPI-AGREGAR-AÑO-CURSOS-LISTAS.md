# Prompt para Strapi: Agregar Campo Año a Cursos y Listas de Útiles

## Contexto
Necesitamos agregar un campo `año` (tipo `integer`) a los content types `cursos` y `listas-utiles` en Strapi. Este campo permitirá gestionar cursos y listas de útiles por año escolar, ya que estos cambian cada año.

## Cambios Requeridos

### 1. Content Type: `cursos` (api::curso.curso)

**Agregar campo:**
- **Nombre del campo:** `año`
- **Tipo:** `integer`
- **Requerido:** `true` (required)
- **Valor por defecto:** Año actual (ej: 2025)
- **Validación:** Debe ser un año válido (sugerencia: entre 2000 y 2100)

**Ubicación del schema:**
- Archivo: `strapi/src/api/curso/content-types/curso/schema.json`

**Ejemplo de campo a agregar:**
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

### 2. Content Type: `listas-utiles` (api::listas-utiles.listas-utiles)

**Agregar campo:**
- **Nombre del campo:** `año`
- **Tipo:** `integer`
- **Requerido:** `true` (required)
- **Valor por defecto:** Año actual (ej: 2025)
- **Validación:** Debe ser un año válido (sugerencia: entre 2000 y 2100)

**Ubicación del schema:**
- Archivo: `strapi/src/api/listas-utiles/content-types/listas-utiles/schema.json`

**Ejemplo de campo a agregar:**
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

1. **Abrir Strapi Admin Panel** o editar los archivos de schema directamente.

2. **Para `cursos`:**
   - Ir a Content-Type Builder → `cursos`
   - Agregar campo `año` tipo `integer`
   - Marcar como `required`
   - Establecer valor por defecto (año actual)
   - Guardar y hacer rebuild

3. **Para `listas-utiles`:**
   - Ir a Content-Type Builder → `listas-utiles`
   - Agregar campo `año` tipo `integer`
   - Marcar como `required`
   - Establecer valor por defecto (año actual)
   - Guardar y hacer rebuild

4. **Rebuild Strapi:**
   ```bash
   npm run build
   # o
   yarn build
   ```

5. **Verificar:**
   - Probar crear un curso con año
   - Probar crear una lista de útiles con año
   - Verificar que el filtrado por año funcione en las queries

## Notas Importantes

- El campo debe llamarse `año` (con tilde), pero si Strapi no acepta caracteres especiales, usar `ano` y el frontend manejará ambos nombres.
- El campo debe ser requerido para mantener la integridad de los datos.
- El valor por defecto debe ser el año actual para facilitar la creación de nuevos registros.
- Después del rebuild, los cursos y listas de útiles existentes necesitarán tener el campo `año` asignado manualmente o mediante un script de migración.

## Migración de Datos Existentes

Si ya existen cursos o listas de útiles sin el campo `año`, se recomienda:

1. Crear un script de migración que asigne el año actual a todos los registros existentes.
2. O bien, permitir que el campo sea opcional temporalmente, asignar valores manualmente, y luego hacerlo requerido.

## Verificación Post-Implementación

Después de implementar estos cambios:

1. Verificar que se puede crear un curso con año
2. Verificar que se puede crear una lista de útiles con año
3. Verificar que las queries filtran correctamente por año
4. Verificar que el frontend puede enviar y recibir el campo `año`
