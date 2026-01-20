# Prompt para Strapi: Verificar Permisos y Configuración de versiones_materiales

## Contexto

Ya se agregó el campo `versiones_materiales` (tipo JSON) al content type `cursos`. Ahora necesitamos verificar que todo esté configurado correctamente para que funcione desde la API.

## Verificaciones Necesarias

### 1. Permisos de API

**Verificar que el campo `versiones_materiales` sea accesible en las APIs:**

1. Ir a **Settings** → **Users & Permissions Plugin** → **Roles** → **Public** o **Authenticated**
2. En la sección **Cursos**, verificar que:
   - ✅ `find` (GET) esté habilitado
   - ✅ `findOne` (GET por ID) esté habilitado
   - ✅ `create` (POST) esté habilitado
   - ✅ `update` (PUT) esté habilitado
   - ✅ `delete` (DELETE) esté habilitado (opcional)

3. **IMPORTANTE:** Asegurarse de que estos permisos incluyan acceso al campo `versiones_materiales`

### 2. Verificar que el Campo Existe

**Confirmar que el campo está en el schema:**

- Archivo: `strapi/src/api/curso/content-types/curso/schema.json`
- Debe contener:
  ```json
  {
    "versiones_materiales": {
      "type": "json"
    }
  }
  ```

### 3. Verificar en Admin Panel

1. Ir a **Content Manager** → **Cursos**
2. Crear o editar un curso
3. Verificar que el campo `versiones_materiales` aparece (aunque sea como editor JSON)
4. Intentar guardar un curso con `versiones_materiales` vacío o con datos

### 4. Probar desde la API

**Hacer una petición de prueba:**

```bash
# GET para verificar que el campo se devuelve
curl -X GET "https://strapi.moraleja.cl/api/cursos/[ID]?publicationState=preview" \
  -H "Authorization: Bearer [TOKEN]"

# PUT para verificar que se puede actualizar
curl -X PUT "https://strapi.moraleja.cl/api/cursos/[ID]" \
  -H "Authorization: Bearer [TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "versiones_materiales": [
        {
          "id": 1,
          "nombre_archivo": "test.pdf",
          "fecha_subida": "2025-01-12T00:00:00.000Z",
          "fecha_actualizacion": "2025-01-12T00:00:00.000Z",
          "materiales": [],
          "metadata": {
            "nombre": "test.pdf",
            "tamaño": 12345,
            "tipo": "application/pdf"
          }
        }
      ]
    }
  }'
```

## Posibles Problemas y Soluciones

### Problema 1: El campo no aparece en las respuestas de la API

**Solución:** Verificar que los permisos incluyan acceso al campo. En Strapi v4, los campos JSON deberían ser accesibles automáticamente si los permisos están habilitados.

### Problema 2: Error "Invalid key versiones_materiales"

**Solución:** 
- Verificar que el campo existe en el schema
- Hacer rebuild de Strapi: `npm run build` o `yarn build`
- Reiniciar Strapi

### Problema 3: El campo se guarda pero no se devuelve en GET

**Solución:** 
- Verificar permisos de lectura
- Asegurarse de usar `publicationState=preview` si el curso está en estado "Draft"
- Verificar que no haya filtros que excluyan el campo

## Estructura de Datos Esperada

El campo `versiones_materiales` debe aceptar un array de objetos con esta estructura:

```json
[
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
]
```

## Preguntas para Verificar

1. ✅ ¿El campo `versiones_materiales` aparece en el admin panel de Strapi?
2. ✅ ¿Se puede crear/actualizar un curso con `versiones_materiales` desde el admin panel?
3. ✅ ¿Los permisos de API están configurados correctamente?
4. ✅ ¿Se puede leer el campo `versiones_materiales` desde la API?
5. ✅ ¿Se puede escribir el campo `versiones_materiales` desde la API?

## Resultado Esperado

Una vez verificados estos puntos:
- ✅ El campo `versiones_materiales` es accesible desde la API
- ✅ Se puede leer y escribir el campo sin errores
- ✅ Los permisos están correctamente configurados
- ✅ El sistema de versiones de PDFs funciona completamente

---

**Por favor, verifica estos puntos y confirma si todo está funcionando correctamente o si hay algún problema que necesite resolverse.**
