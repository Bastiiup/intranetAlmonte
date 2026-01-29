# 🔗 Cómo Acceder al Endpoint Optimizado `/api/cursos/optimized`

## 📍 URL Completa del Endpoint

**URL Base de Strapi:** `https://strapi-pruebas-production.up.railway.app`

**Endpoint Optimizado:** 
```
https://strapi-pruebas-production.up.railway.app/api/cursos/optimized
```

---

## 🔐 Autenticación Requerida

El endpoint requiere un **Bearer Token** de Strapi.

**Header necesario:**
```
Authorization: Bearer <STRAPI_API_TOKEN>
```

---

## 🧪 Formas de Probar el Endpoint

### Opción 1: Usando cURL (Terminal/CMD)

```bash
# Reemplaza <TU_TOKEN> con tu STRAPI_API_TOKEN
curl -X GET \
  "https://strapi-pruebas-production.up.railway.app/api/cursos/optimized?pagination[page]=1&pagination[pageSize]=10" \
  -H "Authorization: Bearer <TU_TOKEN>" \
  -H "Content-Type: application/json"
```

**Ejemplo con parámetros:**
```bash
curl -X GET \
  "https://strapi-pruebas-production.up.railway.app/api/cursos/optimized?publicationState=preview&pagination[page]=1&pagination[pageSize]=1000&sort[0]=id:asc" \
  -H "Authorization: Bearer <TU_TOKEN>" \
  -H "Content-Type: application/json"
```

### Opción 2: Usando PowerShell (Windows)

```powershell
# Obtener el token de las variables de entorno
$token = $env:STRAPI_API_TOKEN

# Hacer la petición
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$url = "https://strapi-pruebas-production.up.railway.app/api/cursos/optimized?pagination[page]=1&pagination[pageSize]=10"

Invoke-RestMethod -Uri $url -Method Get -Headers $headers
```

### Opción 3: Usando el Navegador (con extensión)

**Requisito:** Extensión que permita agregar headers (ej: ModHeader, Requestly)

1. Instalar extensión de headers en el navegador
2. Agregar header: `Authorization: Bearer <TU_TOKEN>`
3. Visitar: `https://strapi-pruebas-production.up.railway.app/api/cursos/optimized?pagination[pageSize]=10`

### Opción 4: Usando Postman o Insomnia

**Configuración:**
- **Method:** GET
- **URL:** `https://strapi-pruebas-production.up.railway.app/api/cursos/optimized`
- **Headers:**
  - `Authorization: Bearer <TU_TOKEN>`
  - `Content-Type: application/json`
- **Query Params:**
  - `publicationState`: `preview`
  - `pagination[page]`: `1`
  - `pagination[pageSize]`: `10`
  - `sort[0]`: `id:asc`

---

## 📋 Parámetros del Endpoint

### Parámetros Disponibles

| Parámetro | Tipo | Descripción | Ejemplo |
|-----------|------|-------------|---------|
| `publicationState` | string | Estado de publicación | `preview` o `live` |
| `pagination[page]` | number | Número de página | `1`, `2`, `3`... |
| `pagination[pageSize]` | number | Tamaño de página (máx 1000) | `100`, `500`, `1000` |
| `sort[0]` | string | Ordenamiento | `id:asc`, `id:desc` |

### Ejemplo de Query Completa

```
/api/cursos/optimized?publicationState=preview&pagination[page]=1&pagination[pageSize]=1000&sort[0]=id:asc
```

---

## 📤 Estructura de Respuesta Esperada

```json
{
  "data": [
    {
      "id": 123,
      "documentId": "abc123",
      "attributes": {
        "nombre_curso": "I Medio 2022",
        "grado": "9",
        "nivel": "Media",
        "matricula": 181,  // ✅ SIEMPRE en attributes.matricula
        "versiones_materiales": [...],
        "anio": 2022,
        "colegio": {
          "data": {
            "id": 456,
            "documentId": "def456",
            "attributes": {
              "rbd": 10479,
              "colegio_nombre": "Colegio Estela Segura",
              "region": "Metropolitana de Santiago",
              "provincia": "Santiago",
              "dependencia": "Particular Subvencionado"
            }
          }
        }
      }
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 1000,
      "pageCount": 54,
      "total": 53857
    }
  }
}
```

---

## ✅ Verificación Rápida

### Test 1: Verificar que el Endpoint Existe

```bash
curl -X GET \
  "https://strapi-pruebas-production.up.railway.app/api/cursos/optimized?pagination[pageSize]=1" \
  -H "Authorization: Bearer <TU_TOKEN>"
```

**Resultado esperado:** Status 200 con estructura JSON

**Si obtienes 404:** El endpoint aún no está desplegado en Strapi

### Test 2: Verificar Matrícula en Ubicación Correcta

```bash
curl -X GET \
  "https://strapi-pruebas-production.up.railway.app/api/cursos/optimized?pagination[pageSize]=10" \
  -H "Authorization: Bearer <TU_TOKEN>" \
  | jq '.data[0].attributes.matricula'
```

**Resultado esperado:** Número o `null`, **nunca** `undefined`

### Test 3: Verificar Rendimiento

```bash
time curl -X GET \
  "https://strapi-pruebas-production.up.railway.app/api/cursos/optimized?pagination[pageSize]=1000" \
  -H "Authorization: Bearer <TU_TOKEN>"
```

**Resultado esperado:** < 1 segundo para 1000 cursos

---

## 🔍 Cómo Obtener el Token de Strapi

### Opción 1: Desde Variables de Entorno

El token está en `.env.local` o `.env`:

```bash
# En PowerShell
$env:STRAPI_API_TOKEN

# En CMD
echo %STRAPI_API_TOKEN%

# En Bash/Linux
echo $STRAPI_API_TOKEN
```

### Opción 2: Desde el Panel de Strapi

1. Ir a Strapi Admin Panel
2. Settings → API Tokens
3. Crear o copiar un token existente
4. Usar ese token en las peticiones

---

## 🚨 Solución de Problemas

### Error 404: Not Found

**Causa:** El endpoint `/api/cursos/optimized` no está desplegado en Strapi

**Solución:** 
1. Verificar que Strapi tenga el código del endpoint implementado
2. Hacer commit y push del código
3. Desplegar en Railway
4. Esperar a que el deploy termine

### Error 401: Unauthorized

**Causa:** Token inválido o ausente

**Solución:**
1. Verificar que el token esté correcto
2. Verificar que el header `Authorization` esté presente
3. Verificar formato: `Bearer <token>` (con espacio después de "Bearer")

### Error 500: Internal Server Error

**Causa:** Error en el código del endpoint en Strapi

**Solución:**
1. Revisar logs de Strapi en Railway
2. Verificar que el código del controller esté correcto
3. Verificar que la ruta esté registrada correctamente

---

## 📝 Ejemplo Completo de Uso en Código

### En el Frontend (Next.js API Route)

```typescript
import strapiClient from '@/lib/strapi/client'

// El cliente ya maneja la URL base y el token automáticamente
const response = await strapiClient.get('/api/cursos/optimized?pagination[pageSize]=1000')
```

### En el Código Actual

El código ya está actualizado en:
- `src/app/api/crm/listas/por-colegio/route.ts`

**Línea ~117:**
```typescript
firstPageResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>[]>>(
  `/api/cursos/optimized?${firstPageQuery.toString()}`
)
```

---

## 🎯 URL Completa para Copiar y Pegar

```
https://strapi-pruebas-production.up.railway.app/api/cursos/optimized?publicationState=preview&pagination[page]=1&pagination[pageSize]=10&sort[0]=id:asc
```

**Recuerda agregar el header:**
```
Authorization: Bearer <TU_TOKEN>
```

---

## ✅ Checklist de Verificación

- [ ] El endpoint está desplegado en Strapi
- [ ] Tienes el token de Strapi
- [ ] Puedes hacer una petición GET exitosa
- [ ] La respuesta tiene estructura correcta
- [ ] `matricula` está en `attributes.matricula`
- [ ] El rendimiento es aceptable (< 1 segundo por 1000 cursos)

---

**Última actualización:** 29 de enero de 2026
