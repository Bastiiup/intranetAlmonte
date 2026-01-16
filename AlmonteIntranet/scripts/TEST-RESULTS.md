# Resultados de Tests de Verificación Strapi

**Fecha de ejecución:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")  
**Script:** `test-strapi.js`  
**Modo:** Verbose (--verbose)

---

## 📊 Resumen Ejecutivo

- **Total de endpoints probados:** 13
- **Exitosos (200 OK):** 3 (23.1%)
- **Advertencias (403/404):** 10 (76.9%)
- **Fallidos (errores de conexión):** 0 (0%)
- **Tasa de éxito general:** 23.1%

---

## ⚙️ Configuración

### Variables de Entorno

- **URL Strapi:** `https://strapi.moraleja.cl`
- **Token API:** `NO CONFIGURADO` ⚠️
- **Archivo .env.local:** ✓ Detectado y cargado

### Advertencia Importante

⚠️ **STRAPI_API_TOKEN no está configurado.**  
Algunos endpoints requieren autenticación y retornan 403 (Forbidden) sin el token configurado.

---

## 📋 Resultados Detallados por Content Type

### ✅ Endpoints Exitosos (200 OK)

| Content Type | Endpoint | Estado | Registros | Total | Tiempo |
|--------------|----------|--------|-----------|-------|--------|
| **Productos/Libros** | `/api/libros` | ✓ 200 | 14 | 14 total | 1085ms |
| **Colegios** | `/api/colegios` | ✓ 200 | 5 | 6031 total | 539ms |
| **Personas** | `/api/personas` | ✓ 200 | 5 | 2038 total | 536ms |

#### Detalles

1. **Productos/Libros (`/api/libros`)**
   - ✅ Endpoint accesible sin autenticación
   - ✅ 14 registros disponibles
   - ✅ Tiempo de respuesta: 1085ms
   - 📝 Campos: `id`, `documentId`, `isbn_libro`, `nombre_libro`, `subtitulo_libro`, etc.

2. **Colegios (`/api/colegios`)**
   - ✅ Endpoint accesible sin autenticación
   - ✅ 5 registros en muestra, 6031 total
   - ✅ Tiempo de respuesta: 539ms
   - 📝 Campos: `id`, `documentId`, `colegio_nombre`, `rbd`, `rbd_digito_verificador`, `dependencia`, etc.

3. **Personas (`/api/personas`)**
   - ✅ Endpoint accesible sin autenticación
   - ✅ 5 registros en muestra, 2038 total
   - ✅ Tiempo de respuesta: 536ms
   - 📝 Campos: `id`, `documentId`, `rut`, `nombres`, `nombre_completo`, `nivel_confianza`, `origen`, etc.

---

### ⚠️ Endpoints con Advertencias

#### 403 Forbidden (Requieren Autenticación)

Los siguientes endpoints requieren `STRAPI_API_TOKEN` para funcionar correctamente:

| Content Type | Endpoint | Estado | Motivo |
|--------------|----------|--------|--------|
| Etiquetas | `/api/etiquetas` | ⚠️ 403 | Sin permisos (requiere token) |
| Autores | `/api/autores` | ⚠️ 403 | Sin permisos (requiere token) |
| Colecciones | `/api/colecciones` | ⚠️ 403 | Sin permisos (requiere token) |
| Obras | `/api/obras` | ⚠️ 403 | Sin permisos (requiere token) |
| Sellos | `/api/sellos` | ⚠️ 403 | Sin permisos (requiere token) |
| Marcas | `/api/marcas` | ⚠️ 403 | Sin permisos (requiere token) |
| Pedidos | `/api/wo-pedidos` | ⚠️ 403 | Sin permisos (requiere token) |
| Clientes | `/api/wo-clientes` | ⚠️ 403 | Sin permisos (requiere token) |

**Total de endpoints con 403:** 8

#### 404 Not Found (Endpoint no existe)

| Content Type | Endpoint | Estado | Motivo |
|--------------|----------|--------|--------|
| Categorías | `/api/categorias` | ⚠️ 404 | Endpoint no encontrado |
| Profesores/Trayectorias | `/api/profesores` | ⚠️ 404 | Endpoint no encontrado |

**Total de endpoints con 404:** 2

**Posibles causas:**
- El content type no existe en Strapi
- El endpoint tiene un nombre diferente
- La ruta API no está configurada correctamente

---

## 🔍 Análisis de Resultados

### Endpoints Públicos (Sin Autenticación)

Los siguientes endpoints están configurados como públicos y funcionan sin token:
- ✅ `/api/libros`
- ✅ `/api/colegios`
- ✅ `/api/personas`

### Endpoints Protegidos (Requieren Token)

Los siguientes endpoints requieren autenticación con `STRAPI_API_TOKEN`:
- ⚠️ `/api/etiquetas`
- ⚠️ `/api/autores`
- ⚠️ `/api/colecciones`
- ⚠️ `/api/obras`
- ⚠️ `/api/sellos`
- ⚠️ `/api/marcas`
- ⚠️ `/api/wo-pedidos`
- ⚠️ `/api/wo-clientes`

### Endpoints No Encontrados

- ⚠️ `/api/categorias` - Posible nombre alternativo o no configurado
- ⚠️ `/api/profesores` - Posiblemente `/api/persona-trayectorias` u otro nombre

---

## 💡 Recomendaciones

### 1. Configurar STRAPI_API_TOKEN (CRÍTICO)

Para probar todos los endpoints protegidos, agregar a `.env.local`:

```env
STRAPI_API_TOKEN=tu_token_aqui
```

**Cómo obtener el token:**
1. Acceder a: https://strapi.moraleja.cl/admin
2. Ir a: Settings → API Tokens
3. Crear un nuevo token con permisos "Full access"
4. Copiar y pegar en `.env.local`

### 2. Verificar Endpoints con 404

Verificar en Strapi Admin si los siguientes content types existen:
- `categorias` (puede estar con otro nombre)
- `profesores` (puede ser `persona-trayectorias` u otro nombre)

### 3. Revisar Permisos en Strapi

Para los endpoints que retornan 403:
1. Ir a: Strapi Admin → Settings → Roles → Public/Authenticated
2. Verificar permisos de `find` y `findOne` para cada content type
3. Habilitar permisos si es necesario para desarrollo

### 4. Ejecutar Tests con Token

Una vez configurado el token, ejecutar nuevamente:

```bash
npm run test:strapi:verbose
```

Deberían aparecer todos los endpoints protegidos como exitosos.

---

## 📈 Tiempos de Respuesta

| Endpoint | Tiempo (ms) | Estado |
|----------|-------------|--------|
| `/api/libros` | 1085 | Lento pero funcional |
| `/api/colegios` | 539 | Normal |
| `/api/personas` | 536 | Normal |

**Promedio:** 720ms (para endpoints exitosos)

---

## ✅ Conclusión

El script de verificación se ejecutó correctamente y identificó:

1. **3 endpoints funcionando correctamente** sin autenticación
2. **8 endpoints que requieren autenticación** (403)
3. **2 endpoints no encontrados** (404)

**Acción requerida:** Configurar `STRAPI_API_TOKEN` en `.env.local` para probar todos los endpoints protegidos y obtener un reporte completo.

---

## 🔄 Próximos Pasos

1. ✅ Script de verificación funcionando correctamente
2. ⏳ Configurar `STRAPI_API_TOKEN` en `.env.local`
3. ⏳ Ejecutar tests nuevamente con token configurado
4. ⏳ Verificar endpoints con 404 en Strapi Admin
5. ⏳ Revisar permisos de API en Strapi Settings

---

**Generado por:** `scripts/test-strapi.js`  
**Versión:** 1.0.0
