# Content Types de Strapi para Listas

## 📋 Resumen

Para el módulo de **Listas**, estamos usando principalmente el content type **`cursos`** con un campo JSON llamado `versiones_materiales`.

## 🎯 Content Type Principal: `cursos`

### Endpoint de Strapi
```
/api/cursos
```

### Estructura
- **Content Type:** `cursos`
- **Campo clave:** `versiones_materiales` (tipo JSON)
- **Relaciones:**
  - `colegio` → Content type `colegios`
  - `colegio.comuna` → Content type `comunas`
  - `colegio.direcciones` → Content type `direcciones`
  - `colegio.telefonos` → Content type `telefonos`

### Campo `versiones_materiales` (JSON)
Este campo almacena un array de objetos con la siguiente estructura:

```json
{
  "versiones_materiales": [
    {
      "id": 1,
      "pdf_id": 123,
      "pdf_url": "/uploads/lista_2025.pdf",
      "fecha_creacion": "2025-01-15",
      "materiales": [
        {
          "id": 1,
          "nombre": "Lápiz grafito",
          "cantidad": 2,
          "obligatorio": true
        }
      ]
    }
  ]
}
```

### Uso en el Código
- **GET:** `/api/crm/listas` → Consulta `/api/cursos` con filtro por `versiones_materiales`
- **POST/PUT:** `/api/crm/cursos/[id]` → Actualiza `versiones_materiales` en `/api/cursos/[id]`
- **PDFs:** Los PDFs se suben a Strapi Media Library y se referencia en `versiones_materiales[].pdf_id`

## 📝 Content Type Secundario: `listas-utiles`

### Endpoint de Strapi
```
/api/listas-utiles
```

### Estructura
- **Content Type:** `listas-utiles`
- **Campos principales:**
  - `nombre`
  - `nivel` (Basica/Media)
  - `grado` (1-8)
  - `año`
  - `materiales` (array)
  - `curso` (relación con `cursos`)
  - `colegio` (relación con `colegios`)

### Uso
Este content type se usa para listas de útiles independientes, no directamente relacionadas con cursos específicos.

## 🔍 Endpoints de la Aplicación

### Listas (usando `cursos`)
- `GET /api/crm/listas` → Obtiene cursos con `versiones_materiales`
- `GET /api/crm/listas/por-colegio` → Agrupa cursos por colegio
- `GET /api/crm/listas/[id]` → Obtiene un curso específico con sus versiones
- `PUT /api/crm/listas/[id]` → Actualiza `versiones_materiales` de un curso
- `POST /api/crm/listas/[id]/procesar-pdf` → Procesa PDF y actualiza `versiones_materiales`

### Listas Útiles (usando `listas-utiles`)
- `GET /api/crm/listas-utiles` → Obtiene todas las listas de útiles
- `POST /api/crm/listas-utiles` → Crea una nueva lista de útiles
- `GET /api/crm/listas-utiles/[id]` → Obtiene una lista específica
- `PUT /api/crm/listas-utiles/[id]` → Actualiza una lista
- `DELETE /api/crm/listas-utiles/[id]` → Elimina una lista

## 📊 Resumen para Compartir con Colega

### Para el módulo de Listas (principal):
```
Content Type: cursos
Endpoint: /api/cursos
Campo clave: versiones_materiales (JSON)
```

### Para listas de útiles independientes:
```
Content Type: listas-utiles
Endpoint: /api/listas-utiles
```

## 🔗 Relaciones Importantes

```
cursos
  ├── colegio (relación)
  │   ├── comuna (relación)
  │   ├── direcciones (relación)
  │   └── telefonos (relación)
  └── versiones_materiales (JSON)
      ├── pdf_id (referencia a Media Library)
      ├── pdf_url (URL del PDF)
      └── materiales (array de objetos)
```

## 📌 Notas Importantes

1. **`versiones_materiales` es un campo JSON**, no una relación. Por eso:
   - No se puede usar `populate[versiones_materiales]`
   - Se debe incluir explícitamente en `fields[0]=versiones_materiales` si se usan `fields`
   - Se devuelve automáticamente si no se especifican `fields` restrictivos

2. **Los PDFs se almacenan en Strapi Media Library**, no directamente en `cursos`. Solo se guarda la referencia (`pdf_id` y `pdf_url`).

3. **Para compartir con un colega**, necesitará:
   - Acceso a Strapi: `https://strapi-pruebas-production.up.railway.app`
   - Token de API (configurado en `.env.local`)
   - Entender que las "listas" son cursos con `versiones_materiales` no vacío
