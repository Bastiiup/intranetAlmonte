# Análisis previo: Generador de licencias y QRs físicos

Resumen técnico para definir la arquitectura del feature **Generar Licencias** (códigos aleatorios + QR → `mira.app/activar?codigo=XYZ` → Modal Activar Libro con código pre-escrito).

---

## 1. Modelo de datos (Strapi)

### Colección

- **Nombre interno (API):** `licencia-estudiante` (singular)  
- **Ruta REST:** `/api/licencias-estudiantes`  
- **Tabla:** `licencias_estudiantes` (`collectionName` en el schema)

### Campos exactos del content-type

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|--------|
| `codigo_activacion` | string | sí | **Único** (unique: true). Es el código que el alumno escribe / que va en el QR. |
| `libro_mira` | relation (manyToOne) | sí | Referencia a `api::libro-mira.libro-mira`. |
| `estudiante` | relation (manyToOne) | no | Referencia a `api::persona-mira.persona-mira`. Null = licencia sin asignar (disponible para activar). |
| `activa` | boolean | — | default `true`. Si está disponible para activar. Tras activar, el backend la pone en `false`. |
| `fecha_activacion` | datetime | no | Se setea cuando el estudiante activa la licencia. |
| `fecha_vencimiento` | date | no | Usado en importación (ej. hoy + 18 meses). |
| `numeral` | integer | no | Correlativo según Excel de origen (opcional para generador). |
| `google_drive_folder_id` | string | no | Opcional. |

Para el **generador** solo son imprescindibles: `codigo_activacion` (único), `libro_mira`, `activa: true`; `estudiante` null; opcionalmente `fecha_vencimiento` y `numeral`.

---

## 2. Importador actual (Excel)

### Ubicación

- **Frontend (Intranet):**  
  `AlmonteIntranet/src/app/(admin)/(apps)/mira/licencias/components/ImportadorModal.tsx`
- **API que procesa el Excel:**  
  `AlmonteIntranet/src/app/api/mira/importar/route.ts`

### Flujo

1. El usuario selecciona un archivo **.csv, .xlsx o .xls** en el modal y pulsa "Importar".
2. El modal hace **POST** con `FormData` (campo `file`) a **`/api/mira/importar`**.
3. En **`/api/mira/importar/route.ts`**:
   - Se lee el Excel con **XLSX** (`xlsx`).
   - Se esperan columnas: **ISBN** (o variantes), **Código** (o Códigos, etc.), opcional **N** (numeral).
   - Se pre-carga el catálogo de **libros-mira** desde Strapi (`GET /api/libros-mira`) y se arma un mapa **ISBN → { libroMiraId, libroNombre }**.
   - Por cada fila válida (ISBN + código presentes y libro encontrado por ISBN) se agrega un ítem a una cola.
   - Se crean licencias en **lotes de 20** con **POST** a Strapi:
     - **URL:** `getStrapiUrl('/api/licencias-estudiantes')`
     - **Payload por licencia:**
       ```json
       {
         "data": {
           "codigo_activacion": "<código de la fila>",
           "libro_mira": <libroMiraId>,
           "numeral": <numeral o 0>,
           "activa": true,
           "fecha_vencimiento": "<YYYY-MM-DD (hoy + 18 meses)>"
         }
       }
       ```
   - No se asigna `estudiante` (queda null). Los logs y resumen se devuelven al modal.

Conclusión: la inserción de licencias es **POST a `/api/licencias-estudiantes`** con el mismo payload que puede usar el generador; la única diferencia es que el generador **creará códigos aleatorios** en lugar de leerlos del Excel.

---

## 3. Modal “Activar Libro” en la app MIRA

### Componente

- **Nombre:** `AddBookModal`
- **Ruta:** `Mira-Almonte/src/components/AddBookModal.tsx`

### Props actuales

```ts
interface AddBookModalProps {
  isOpen: boolean
  onClose: () => void
  onBookAdded: () => void
  personaMiraId: number
}
```

- **No** recibe código inicial ni parámetros de URL.
- El estado del código es interno: `const [licenseCode, setLicenseCode] = useState('')` y se resetea en `handleClose()`.

### Uso en el dashboard

- En **`Mira-Almonte/src/app/dashboard/page.tsx`**:
  - Estado: `isAddBookModalOpen`.
  - `<AddBookModal isOpen={isAddBookModalOpen} onClose={...} onBookAdded={...} personaMiraId={usuario.id} />`.
  - El modal se abre al hacer clic en “Activar Libro” (y en otros puntos que llaman `setIsAddBookModalOpen(true)`).
- **No** hay lógica que lea `searchParams` ni `codigo` en la URL para abrir el modal ni para rellenar el código.

### Activación en backend

- El modal envía **POST** a `${apiUrl}/api/licencias-estudiantes/activar` con:
  - `codigo`: código formateado (espacios cada 4 caracteres, sin guiones).
  - `persona_mira_id`: id del estudiante logueado.

Para el feature hace falta:

1. **Ruta de “activar”:** por ejemplo `/activar` (o `/dashboard` con query) con `?codigo=XYZ`.
2. **En la página que cargue (dashboard o una página intermedia):** leer `searchParams.get('codigo')` y, si existe, abrir el modal y pasar el código como prop.
3. **Cambio en `AddBookModal`:** añadir prop opcional `initialCode?: string` y, si viene, inicializar `licenseCode` y mostrarlo en el input.

---

## 4. Viabilidad del auth flow (callbackUrl)

### Redirección a login

- No hay middleware global que redirija a login; cada página/layout comprueba sesión en **cliente** (localStorage `mira_user`).
- Ejemplos:
  - **Dashboard:** `src/app/dashboard/page.tsx`: si no hay `mira_user` → `router.push('/login')` (sin query).
  - **DashboardShell:** `src/components/DashboardShell.tsx`: si no hay usuario → `router.push('/login')`.
  - **Mis evaluaciones, profesor, etc.:** mismo patrón, `router.push('/login')` sin parámetros.

### Login tras autenticarse

- En **`Mira-Almonte/src/app/login/page.tsx`**:
  - Se usa `useSearchParams()` solo para `registered=true` (mensaje de éxito).
  - Tras login exitoso se hace **siempre** `router.push('/dashboard')` o `router.push('/dashboard/profesor')` (según rol); **no** se lee ni se usa ningún `callbackUrl` ni `returnUrl`.

Conclusión: **no** está implementado un `callbackUrl` que preserve la ruta (ni los query params) al volver del login. Si un usuario no autenticado entra a `/dashboard?codigo=XYZ`, se le redirige a `/login` y tras loguearse termina en `/dashboard` **sin** `?codigo=XYZ`.

Para que el flujo QR funcione bien hace falta:

1. **Al redirigir a login** desde una ruta protegida, incluir la URL de vuelta deseada, por ejemplo:  
   `router.push(\`/login?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}\`)`  
   (o una ruta fija tipo `/dashboard?codigo=...` si se decide que el código solo se use en dashboard).
2. **En la página de login:** leer `searchParams.get('callbackUrl')` y, tras login exitoso, hacer `router.push(callbackUrl || '/dashboard')` en lugar de `router.push('/dashboard')` fijo.
3. **Ruta pública para el QR:** si el QR apunta a `mira.app/activar?codigo=XYZ`, se puede:
   - Hacer que **`/activar`** sea una página pública que solo redirija: si hay sesión → `/dashboard?codigo=XYZ`, si no → `/login?callbackUrl=/dashboard?codigo=XYZ`; así el callbackUrl ya lleva el código y tras login se vuelve al dashboard con el código en la URL.

---

## Resumen técnico para la arquitectura

| Tema | Conclusión |
|------|------------|
| **1. Modelo Strapi** | Colección **`licencia-estudiante`** (API: `/api/licencias-estudiantes`). Campos clave: `codigo_activacion` (único), `libro_mira`, `estudiante` (null si no asignada), `activa`, `fecha_activacion`, `fecha_vencimiento`, `numeral`. |
| **2. Importador** | Lógica en **`/api/mira/importar/route.ts`**; lee Excel (XLSX), resuelve libro por ISBN, crea licencias con **POST** a Strapi `/api/licencias-estudiantes` con `data: { codigo_activacion, libro_mira, numeral, activa, fecha_vencimiento }`. El generador puede reutilizar el mismo endpoint de creación con códigos generados. |
| **3. Modal Activar Libro** | Componente **`AddBookModal`** en `src/components/AddBookModal.tsx`. No recibe código por props ni lee URL. Hay que añadir prop `initialCode?: string` y, en la página que abra el modal (p. ej. dashboard), leer `searchParams.get('codigo')` y abrir el modal con ese código. |
| **4. Auth / callbackUrl** | No hay `callbackUrl`: al ir a login se pierde la URL y los query params. Hay que implementar: (a) redirigir a login con `callbackUrl` cuando se detecte usuario no autenticado en la ruta destino, (b) en login usar `callbackUrl` tras éxito para volver a esa URL (con `?codigo=...` si aplica). Opcional: página pública `/activar?codigo=XYZ` que redirija a dashboard con código o a login con callbackUrl. |

Con esto se puede definir la arquitectura del generador de licencias, la URL del QR y el flujo completo hasta el modal con código pre-escrito.
