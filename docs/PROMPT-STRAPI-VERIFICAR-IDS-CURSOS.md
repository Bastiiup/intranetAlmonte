# Prompt para Strapi: Verificar IDs de Cursos y Estructura de Respuestas

## Contexto del Problema

Estamos teniendo problemas para obtener cursos individuales desde el frontend. Cuando intentamos acceder a un curso específico usando su ID, Strapi devuelve un error 404 "Not Found", aunque el curso existe cuando lo listamos.

### Errores Actuales:
```
[API /crm/cursos/[id] GET] Error: { message: 'Not Found', status: 404, id: '2' }
```

### Situación Actual:
- ✅ Podemos listar todos los cursos de un colegio correctamente
- ❌ No podemos obtener un curso individual por ID (error 404)
- El ID que estamos usando viene de la lista de cursos: `curso.id` o `curso.documentId`

## Preguntas para Strapi

### 1. ¿Qué formato de ID usa Strapi para los cursos?

Cuando hacemos una petición GET a `/api/cursos?filters[colegio][id][$eq]=126368`, los cursos se devuelven con:
- ¿Un campo `id` numérico? (ej: `id: 2`)
- ¿Un campo `documentId` string? (ej: `documentId: "abc123"`)
- ¿Ambos?

**Necesitamos saber:** ¿Cuál es el formato correcto del ID que debemos usar para obtener un curso individual?

### 2. ¿Cómo obtener un curso individual?

Si un curso tiene `id: 2` en la lista, ¿cuál es la petición correcta?
- `/api/cursos/2` ✅
- `/api/cursos?filters[id][$eq]=2` ✅
- Otro formato?

### 3. Estructura de la respuesta

Cuando obtenemos un curso individual con GET `/api/cursos/{id}`, ¿cuál es la estructura de la respuesta?

**Opciones posibles:**
```json
// Opción A: ID en el nivel raíz
{
  "data": {
    "id": 2,
    "attributes": {
      "nombre_curso": "...",
      ...
    }
  }
}

// Opción B: ID dentro de attributes
{
  "data": {
    "attributes": {
      "id": 2,
      "nombre_curso": "...",
      ...
    }
  }
}

// Opción C: documentId en lugar de id
{
  "data": {
    "documentId": "abc123",
    "attributes": {
      "nombre_curso": "...",
      ...
    }
  }
}
```

### 4. Verificar que el curso existe

**Por favor, verifica:**
1. ¿Existe un curso con ID `2` en Strapi?
2. ¿Cuál es el ID real de ese curso? (puede ser numérico o documentId)
3. ¿Qué petición GET funciona en Strapi para obtener ese curso?

### 5. Permisos y configuración

**Verificar:**
- ✅ ¿El content type `cursos` tiene permisos de lectura configurados?
- ✅ ¿La API está habilitada para obtener cursos individuales?
- ✅ ¿Hay algún middleware o hook que esté bloqueando la petición?

## Pruebas que Necesitamos

### Prueba 1: Listar cursos
```bash
GET /api/cursos?filters[colegio][id][$eq]=126368&populate[materiales]=true&populate[lista_utiles]=true
```

**Resultado esperado:** Lista de cursos con sus IDs

### Prueba 2: Obtener curso individual
```bash
GET /api/cursos/2?populate[materiales]=true&populate[colegio]=true&populate[lista_utiles]=true
```

**Resultado esperado:** 
- ✅ Si funciona: El curso con todos sus datos
- ❌ Si falla: Error 404 o 500

### Prueba 3: Verificar estructura de respuesta
Después de obtener un curso, verificar:
- ¿Dónde está el ID? (`data.id` vs `data.attributes.id` vs `data.documentId`)
- ¿Qué otros campos están disponibles en el nivel raíz vs dentro de `attributes`?

## Información que Necesitamos

Por favor, proporciona:

1. **Ejemplo de respuesta real** cuando obtienes un curso individual:
   ```json
   {
     "data": {
       // ... estructura completa
     }
   }
   ```

2. **ID correcto** de un curso de prueba:
   - ID numérico: `?`
   - documentId: `?`

3. **Petición que funciona** en Strapi Admin o Postman:
   ```
   GET /api/cursos/{ID_CORRECTO}?populate=...
   ```

4. **Configuración del content type:**
   - ¿Usa MongoDB o PostgreSQL?
   - ¿Tiene algún campo especial de ID?
   - ¿Hay algún lifecycle hook que modifique el ID?

## Solución Temporal

Mientras tanto, en el frontend estamos intentando usar ambos formatos:
- `curso.id` (numérico)
- `curso.documentId` (string)
- `curso.attributes.id`
- `curso.attributes.documentId`

Pero necesitamos saber cuál es el formato correcto que Strapi espera.

## Resultado Esperado

Una vez que sepamos:
1. ✅ El formato correcto del ID
2. ✅ La estructura de la respuesta
3. ✅ La petición que funciona

Podremos corregir el código del frontend para usar el formato correcto y resolver el error 404.

---

**Por favor, ejecuta las pruebas anteriores y comparte los resultados, especialmente:**
- La estructura completa de la respuesta cuando obtienes un curso individual
- El ID exacto (numérico o string) que funciona
- Cualquier error o advertencia en los logs de Strapi
