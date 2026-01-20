# Prompt para Strapi: Agregar Campo versiones_materiales a Cursos

## Contexto del Problema

Estamos reestructurando la gestión de materiales en los cursos. En lugar de tener materiales directos o listas predefinidas, ahora cada PDF subido crea una "versión" independiente de materiales. Esto permite tener un historial de versiones sin mezclar los materiales.

### Situación Actual:
- El frontend intenta guardar un campo `versiones_materiales` en el content type `cursos`
- Strapi está rechazando la petición porque el campo no existe en el schema
- Necesitamos que Strapi tenga el campo `versiones_materiales` configurado

## Tarea Requerida

Necesito que agregues el campo `versiones_materiales` (tipo `JSON`) al content type `cursos` en Strapi.

## Especificaciones del Campo

**Nombre del campo:** `versiones_materiales`
- **Tipo:** `JSON`
- **Requerido:** `false` (opcional)
- **Configuración:**
  - Mostrar en el admin panel: `true`
  - Editable: `true`
  - Buscable: `false` (no es necesario buscar por este campo)

## Estructura de Datos

Cada versión tiene la siguiente estructura:

```json
{
  "id": 1,
  "nombre_archivo": "lista_utiles_2025.pdf",
  "fecha_subida": "2025-01-12T17:00:00.000Z",
  "fecha_actualizacion": "2025-01-12T17:00:00.000Z",
  "materiales": [
    {
      "material_nombre": "Lápiz grafito",
      "tipo": "util",
      "cantidad": 20,
      "obligatorio": true,
      "descripcion": "Lápiz tipo B"
    }
  ],
  "metadata": {
    "nombre": "lista_utiles_2025.pdf",
    "tamaño": 123456,
    "tipo": "application/pdf"
  }
}
```

El campo `versiones_materiales` será un array de estos objetos.

## Archivo a Modificar

**Ubicación:** `strapi/src/api/curso/content-types/curso/schema.json`

**Campo a agregar:**
```json
{
  "versiones_materiales": {
    "type": "json",
    "required": false
  }
}
```

## Pasos a Seguir

1. **Abrir Strapi Admin Panel** o editar el archivo de schema directamente

2. **Para `cursos`:**
   - Ir a Content-Type Builder → `cursos`
   - Agregar campo `versiones_materiales` tipo `JSON`
   - Marcar como opcional (no requerido)
   - Guardar

3. **Rebuild Strapi:**
   ```bash
   npm run build
   # o
   yarn build
   ```

4. **Reiniciar Strapi:**
   ```bash
   npm run develop
   # o
   yarn develop
   ```

## Verificación Post-Implementación

Después de implementar estos cambios, verifica:

1. ✅ El campo `versiones_materiales` aparece en el admin panel de Strapi
2. ✅ Se puede crear un curso y guardar `versiones_materiales` como JSON
3. ✅ Se puede actualizar un curso agregando nuevas versiones al array
4. ✅ No hay errores "Invalid key versiones_materiales" en las peticiones

## Notas Importantes

- El campo debe ser de tipo `JSON` para poder almacenar arrays de objetos complejos
- El campo es opcional porque los cursos pueden no tener versiones aún
- Cada versión es independiente y no se mezclan entre sí
- El frontend manejará la estructura y validación de los datos

## Preguntas para Strapi

1. ¿El campo `versiones_materiales` ya existe en el content type `cursos`? Si es así, ¿cuál es su configuración actual?
2. ¿Hay algún problema conocido con campos JSON en Strapi v4?
3. ¿Necesitamos hacer algún cambio adicional en los controllers o services después de agregar el campo?

## Resultado Esperado

Una vez configurado el campo `versiones_materiales` en Strapi:
- El frontend podrá guardar versiones de PDFs correctamente
- Cada PDF subido creará una nueva versión independiente
- Se podrá ver el historial de versiones ordenado por fecha
- No habrá más errores "Invalid key versiones_materiales" en las peticiones

---

**Por favor, confirma si el campo `versiones_materiales` ya existe en el content type `cursos`, y si no, agrégalo según las especificaciones anteriores.**
