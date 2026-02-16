# Resumen: MIRA en la Intranet

Resumen de todo lo relacionado con **MIRA** dentro del proyecto **AlmonteIntranet**: analíticas, importación de licencias y cambios asociados.

---

## 1. Dónde está MIRA en la Intranet

### Menú lateral
- **Sección:** "MIRA" (título)
- **Ítem:** "Mira" (icono `LuGraduationCap`)
  - **Licencias de libros** → `/mira/licencias`
  - **Analíticas** → `/mira/analiticas`

Definido en: `src/layouts/components/data.ts` (claves `mira-section`, `mira`, `mira-licencias`, `mira-analiticas`).

---

## 2. Analíticas MIRA

### Rutas y componentes
- **Página:** `src/app/(admin)/(apps)/mira/analiticas/page.tsx`  
  - Título: "MIRA · Analíticas"  
  - Render dinámico (`force-dynamic`).
- **Cliente:** `src/app/(admin)/(apps)/mira/analiticas/components/AnaliticasMiraClient.tsx`

### Qué hace
- Llama a **`/api/mira/licencias?pageSize=500`** (cache: no-store) para obtener licencias.
- Calcula en el cliente:
  - **Resumen:** total, activas, vencidas, sin usar.
  - **Uso por libro:** por cada libro (nombre, ISBN), total de licencias y cuántas usadas (con `fecha_activacion`).
  - **Activaciones recientes:** últimas 15 (código, fecha, libro, ISBN, estudiante, email, colegio, curso).
- Muestra:
  - Cards: Licencias totales, Licencias activas, Licencias vencidas, Licencias sin usar (con porcentajes).
  - Tabla “Uso por libro” (top 10 por total).
  - Tabla “Activaciones recientes” (15 últimas).

### Dependencias
- Los datos vienen de la API interna **`/api/mira/licencias`**, que a su vez usa **Strapi** (`licencias-estudiantes`) vía `getStrapiUrl` y `STRAPI_API_TOKEN` (`src/lib/strapi/config.ts`).

---

## 3. Licencias de libros MIRA

### Rutas y componentes
- **Página:** `src/app/(admin)/(apps)/mira/licencias/page.tsx`  
  - Título: "Licencias de Libros MIRA"  
  - Obtiene `licencias` y `meta` llamando a **`${baseUrl}/api/mira/licencias`** (server-side, no-store, timeout 50s).  
  - Pasa datos a `LicenciasListing`.
- **Listado:** `LicenciasListing.tsx`  
  - Tabla con filtros, orden, paginación (TanStack Table).  
  - Columnas: código activación, libro (nombre/ISBN), estudiante, email, colegio, curso, fechas, estado (activa/vencida/sin usar).  
  - Acciones: **Importar** (abre `ImportadorModal`), **Editar** (abre `EditLicenciaModal`), refrescar.
- **Importador:** `ImportadorModal.tsx`  
  - Sube archivo Excel/CSV (.xlsx, .xls, .csv), máx. 10 MB.  
  - Envía el archivo a **`POST /api/mira/importar`**.  
  - Muestra logs en tiempo real y resumen (éxitos, errores, advertencias, ISBNs no encontrados).
- **Editar licencia:** `EditLicenciaModal.tsx`  
  - Edición de licencia (activa, fecha vencimiento, numeral).  
  - Llama a **`PUT /api/mira/licencias/[id]`**.

---

## 4. APIs MIRA (Next.js → Strapi)

Todas usan **Strapi** mediante `getStrapiUrl()` y `STRAPI_API_TOKEN` de `@/lib/strapi/config`.

### `GET /api/mira/licencias`
- **Archivo:** `src/app/api/mira/licencias/route.ts`
- **Hace:** GET a Strapi `licencias-estudiantes` con populate (libro_mira.libro, estudiante.persona, estudiante.colegio, etc.), paginación y orden `createdAt:desc`.
- **Uso:** Listado de licencias y analíticas.

### `PUT /api/mira/licencias/[id]`
- **Archivo:** `src/app/api/mira/licencias/[id]/route.ts`
- **Hace:** PUT a Strapi `licencias-estudiantes/:id` con `data: { activa?, fecha_vencimiento?, numeral? }`.
- **Uso:** Editar una licencia desde el modal.

### `POST /api/mira/importar`
- **Archivo:** `src/app/api/mira/importar/route.ts`
- **Hace:**
  1. Recibe un **Excel/CSV** (FormData, campo `file`).
  2. **Paso 0:** Carga en memoria todo el catálogo de **libros-mira** desde Strapi (paginado), construye un mapa ISBN → `{ libroMiraId, libroNombre }`.
  3. **Paso 1:** Recorre todas las hojas del Excel; por fila espera columnas tipo **ISBN**, **Códigos/Código**, opcional **N** (numeral). Normaliza ISBN (quitar espacios, etc.) y busca en el mapa.
  4. Si el ISBN existe, agrega la fila a una lista de licencias a crear (con `codigo_activacion`, `libroMiraId`, etc.).
  5. Crea en Strapi las licencias (endpoint `licencias-estudiantes`) en lotes.
- **Límites:** `maxDuration = 300` (5 min), archivo máximo 10 MB en el modal.
- **Respuesta:** `success`, `logs` (info/success/warning/error), contadores y opcionalmente ISBNs no encontrados.

---

## 5. Configuración Strapi (Intranet)

- **Archivo:** `src/lib/strapi/config.ts`
- **URL:**  
  - Desarrollo: `NEXT_PUBLIC_STRAPI_URL_LOCAL` si existe, si no `NEXT_PUBLIC_STRAPI_URL`.  
  - Producción: `NEXT_PUBLIC_STRAPI_URL` (ej. en Railway).  
  - Fallback si no hay nada: `https://strapi.moraleja.cl`
- **Token:**  
  - Desarrollo: `STRAPI_API_TOKEN_LOCAL` o `STRAPI_API_TOKEN`.  
  - Producción: `STRAPI_API_TOKEN`.

Toda la parte MIRA (licencias, importar, analíticas) usa esta misma configuración para hablar con Strapi.

---

## 6. Resumen de archivos tocados por MIRA

| Ruta | Descripción |
|------|-------------|
| `layouts/components/data.ts` | Menú MIRA (Licencias, Analíticas). |
| `(admin)/(apps)/mira/analiticas/page.tsx` | Página analíticas. |
| `(admin)/(apps)/mira/analiticas/components/AnaliticasMiraClient.tsx` | Lógica y UI de analíticas. |
| `(admin)/(apps)/mira/licencias/page.tsx` | Página listado licencias. |
| `(admin)/(apps)/mira/licencias/components/LicenciasListing.tsx` | Tabla, filtros, paginación, botones Importar/Editar. |
| `(admin)/(apps)/mira/licencias/components/ImportadorModal.tsx` | Modal importación Excel/CSV. |
| `(admin)/(apps)/mira/licencias/components/EditLicenciaModal.tsx` | Modal edición licencia. |
| `api/mira/licencias/route.ts` | GET licencias desde Strapi. |
| `api/mira/licencias/[id]/route.ts` | PUT actualizar licencia en Strapi. |
| `api/mira/importar/route.ts` | POST importación masiva (Excel → Strapi). |
| `lib/strapi/config.ts` | URL y token de Strapi (usado por todas las APIs MIRA). |

---

## 7. Flujo resumido

1. **Analíticas:** Usuario entra a **Mira → Analíticas**. El cliente pide `/api/mira/licencias?pageSize=500`, la API pide a Strapi `licencias-estudiantes`, y el cliente calcula y muestra resumen, uso por libro y activaciones recientes.
2. **Licencias:** Usuario entra a **Mira → Licencias de libros**. La página (server) pide `/api/mira/licencias`, la API consulta Strapi y devuelve licencias; el listado muestra la tabla y permite editar (PUT) o importar (POST importar).
3. **Importar:** Usuario abre “Importar”, elige Excel/CSV y envía. El navegador hace POST a `/api/mira/importar`; la API carga el catálogo libros-mira, procesa el Excel y crea licencias en Strapi, devolviendo logs y resumen.

Todo lo que toca datos de MIRA (licencias, libros-mira) pasa por Strapi usando la configuración central de `lib/strapi/config.ts`.
