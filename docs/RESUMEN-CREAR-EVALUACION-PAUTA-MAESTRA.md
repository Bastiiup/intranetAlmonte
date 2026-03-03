# Resumen: Crear Evaluación / Pauta Maestra (OMR)

Documentación de lo implementado para la funcionalidad **Crear Evaluación OMR** (Cargar Hoja Maestra) en la Intranet y en Strapi.

---

## 1. Objetivo

Permitir a un usuario de la Intranet crear **evaluaciones** (pautas maestras) asociadas a un libro MIRA, con:

- Datos generales: nombre, categoría, cantidad de preguntas, libro MIRA.
- Una o varias **formas** (Forma A, B, etc.), cada una con:
  - Nombre de la forma.
  - Código de evaluación (ej. B1234567, leído por el OMR).
  - Pauta de respuestas correctas (por número de pregunta).

El backend (Strapi) guarda estos datos en el content-type `api::evaluacion.evaluacion` para que el flujo OMR pueda comparar las respuestas escaneadas con la pauta y corregir automáticamente.

---

## 2. Strapi (backend)

### 2.1 Content-type y schema

- **Content-type:** `api::evaluacion.evaluacion`
- **Schema** (`strapi/src/api/evaluacion/content-types/evaluacion/schema.json`):
  - `nombre` (string, requerido)
  - `categoria` (enum: Básica, Media, Simce, Paes, Universitaria)
  - `cantidad_preguntas` (integer, requerido)
  - `libro_mira` (relation manyToOne → `api::libro-mira.libro-mira`, requerido)
  - `formas` (componente repetible → `mira.forma-evaluacion`)
  - `activo` (boolean, default true)

### 2.2 Componente repetible `formas`

- **Componente:** `mira.forma-evaluacion`  
  (`strapi/src/components/mira/forma-evaluacion.json`)
- Campos:
  - `nombre_forma` (string, requerido)
  - `codigo_evaluacion` (string, requerido)
  - `pauta_respuestas` (JSON, requerido), ej: `{"1":"A","2":"C","3":"B"}`
  - `hoja_maestra_imagen` (media, opcional)

### 2.3 Rutas API

- **Ruta por defecto:** `strapi/src/api/evaluacion/routes/evaluacion.ts`  
  `createCoreRouter('api::evaluacion.evaluacion')`
- **Rutas custom:** `strapi/src/api/evaluacion/routes/01-custom-evaluacion.ts`
  - **POST** `/api/evaluaciones` → crear evaluación (auth: false)
  - **GET** `/api/evaluaciones` → listar
  - **GET** `/api/evaluaciones/:id` → obtener una

Importante: la API pública es **`/api/evaluaciones`** (con “e”), no `/api/evaluacions`.

### 2.4 Controller de evaluación

- **Archivo:** `strapi/src/api/evaluacion/controllers/evaluacion.ts`
- **create:** Recibe `data` (JSON o string en multipart), valida nombre, cantidad_preguntas, libro_mira; comprueba que el libro exista; arma el payload con **`formas`** (array del componente repetible) y crea con `entityService.create`.
- **find:** Lista evaluaciones con populate de `libro_mira` y paginación.

Corrección aplicada: el create debe enviar **`formas`** (array) al entityService, no `pauta_respuestas` a nivel raíz, para coincidir con el schema.

---

## 3. Intranet (frontend y API proxy)

### 3.1 Página y formulario

- **Ruta en la app:** `/mira/evaluaciones/crear`
- **Archivos:**
  - `AlmonteIntranet/src/app/(admin)/(apps)/mira/evaluaciones/crear/page.tsx`  
    Página con `PageBreadcrumb` y el componente del formulario.
  - `AlmonteIntranet/src/app/(admin)/(apps)/mira/evaluaciones/crear/components/CrearEvaluacionOmrForm.tsx`  
    Formulario cliente con:
  - Nombre de la prueba, categoría (select), cantidad de preguntas, libro MIRA (select que carga vía API).
  - Sección dinámica **Formas**: por cada forma, nombre, código de evaluación y **pauta por pregunta** (dropdowns A–E por número de pregunta, sin JSON).
  - Botones: Agregar otra forma, Eliminar forma, Cancelar, Guardar evaluación.

### 3.2 Menú lateral

- En **MIRA** se agregó el ítem **“Crear evaluación (Hoja Maestra)”** que apunta a `/mira/evaluaciones/crear`.
- **Archivo:** `AlmonteIntranet/src/layouts/components/data.ts` (array `menuItems`, bloque `mira`).

### 3.3 Rutas API de la Intranet (proxy a Strapi)

Las llamadas a Strapi se hacen **desde el servidor** (rutas API de Next) para evitar CSP y uso de token en el cliente.

1. **GET libros MIRA** (para el select de libro):
   - **Ruta Intranet:** `GET /api/mira/libros-mira`
   - **Archivo:** `AlmonteIntranet/src/app/api/mira/libros-mira/route.ts`
   - Hace GET a Strapi con token y devuelve la lista (id + nombre del libro).

2. **POST crear evaluación** (submit del formulario):
   - **Ruta Intranet:** `POST /api/mira/evaluaciones`
   - **Archivo:** `AlmonteIntranet/src/app/api/mira/evaluaciones/route.ts`
   - Recibe body `{ data: { nombre, categoria, cantidad_preguntas, libro_mira, activo, formas } }` y hace **POST a Strapi** a **`/api/evaluaciones`** (no `/api/evaluacions`).

### 3.4 Payload enviado a Strapi

```json
{
  "data": {
    "nombre": "Ensayo PAES 1",
    "categoria": "Paes",
    "cantidad_preguntas": 30,
    "libro_mira": 21,
    "activo": true,
    "formas": [
      {
        "nombre_forma": "Forma A",
        "codigo_evaluacion": "B1234567",
        "pauta_respuestas": { "1": "A", "2": "B", "3": "C" }
      }
    ]
  }
}
```

---

## 4. UX: Pauta de respuestas sin JSON

- **Problema inicial:** Se pedía ingresar la pauta en un textarea como JSON, poco amigable para usuarios no técnicos.
- **Solución:** Se reemplazó por una **UI por pregunta**:
  - El usuario indica primero la **cantidad de preguntas** en el formulario principal.
  - En cada forma aparece la sección **“Respuesta correcta por pregunta”** con un dropdown por número de pregunta (1, 2, 3, …), con opciones A, B, C, D, E (y “—” si no hay respuesta).
  - Al enviar, el frontend construye el objeto `pauta_respuestas` (ej. `{"1":"A","2":"C",...}`) y lo manda dentro de cada ítem de `formas`.

---

## 5. Correcciones aplicadas

| Problema | Causa | Solución |
|----------|--------|----------|
| No cargaban los libros MIRA en el select | El cliente llamaba directo a Strapi → CSP bloqueaba y no había token en el navegador | El formulario llama a `GET /api/mira/libros-mira` (mismo origen); la ruta API de la Intranet llama a Strapi con token. |
| Error al guardar: “Method Not Allowed” (405) | La Intranet hacía POST a `/api/evaluacions`; en Strapi la ruta expuesta es `/api/evaluaciones` | En la ruta `POST /api/mira/evaluaciones` de la Intranet se cambió la URL de Strapi a **`/api/evaluaciones`**. |
| Evaluación sin formas guardadas | El controller de Strapi usaba `pauta_respuestas` en el payload de create; el schema tiene el componente repetible `formas` | En el controller se pasó a enviar **`formas`** (array) en `dataToCreate` en lugar de `pauta_respuestas` a nivel raíz. |

---

## 6. Resumen de archivos tocados

**Intranet**

- `src/app/(admin)/(apps)/mira/evaluaciones/crear/page.tsx` (nuevo)
- `src/app/(admin)/(apps)/mira/evaluaciones/crear/components/CrearEvaluacionOmrForm.tsx` (nuevo)
- `src/app/api/mira/evaluaciones/route.ts` (nuevo)
- `src/app/api/mira/libros-mira/route.ts` (existente; usado por el formulario)
- `src/layouts/components/data.ts` (ítem de menú “Crear evaluación (Hoja Maestra)”)

**Strapi**

- `strapi/src/api/evaluacion/controllers/evaluacion.ts` (create con `formas`)
- `strapi/src/api/evaluacion/routes/evaluacion.ts` (core router)
- `strapi/src/api/evaluacion/routes/01-custom-evaluacion.ts` (POST/GET `/api/evaluaciones`)
- `strapi/src/api/evaluacion/content-types/evaluacion/schema.json`
- `strapi/src/components/mira/forma-evaluacion.json`

---

## 7. Commits de referencia (resumen)

- **Intranet (ramaBasti-Intranet):**  
  feat(mira): vista y formulario crear evaluaciones y pautas maestras; ítem de menú; fix carga libros y crear evaluación vía API; pauta con dropdowns; fix POST a `/api/evaluaciones`.
- **Strapi (Strapi-Pruebas):**  
  fix(evaluacion): crear con `formas` y uso de URL `/api/evaluaciones`.

---

*Documento generado a partir del trabajo realizado en Intranet y Strapi para la funcionalidad Crear Evaluación / Pauta Maestra OMR.*
