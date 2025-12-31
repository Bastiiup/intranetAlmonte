# 👀 ¿Qué se puede ver en la Intranet con el CRM?

## 📋 Resumen

El módulo CRM permite gestionar y visualizar información de **Colegios** y **Personas** desde la intranet, conectándose directamente con Strapi.

---

## 🏫 Módulo de Colegios (`/crm/colegios`)

### Listado de Colegios

**Qué verás:**
- Tabla con todos los colegios registrados en Strapi
- Información básica de cada colegio:
  - Nombre del colegio
  - RUT (si está disponible)
  - Dirección
  - Comuna
  - Estado (activo/inactivo)
  - Fecha de creación

**Funcionalidades:**
- ✅ Búsqueda y filtrado de colegios
- ✅ Ordenamiento por columnas
- ✅ Paginación
- ✅ Vista detallada al hacer clic en un colegio

### Ficha Detalle de Colegio (`/crm/colegios/[id]`)

**Qué verás:**
- **Información General:**
  - Nombre completo
  - RUT
  - Dirección completa
  - Comuna y región
  - Teléfono y email
  - Estado

- **Relaciones:**
  - Personas asociadas al colegio
  - Eventos del colegio
  - Asignaciones de cartera
  - Trayectorias relacionadas

- **Historial:**
  - Fecha de creación
  - Última actualización
  - Eventos y cambios

---

## 👥 Módulo de Personas (`/crm/personas`)

### Listado de Personas

**Qué verás:**
- Tabla con todas las personas registradas en Strapi
- Información básica de cada persona:
  - Nombre completo
  - RUT
  - Género
  - Fecha de nacimiento
  - Colegio asociado (si tiene)
  - Estado (activo/inactivo)
  - Fecha de creación

**Funcionalidades:**
- ✅ Búsqueda por nombre o RUT
- ✅ Filtrado por colegio, género, estado
- ✅ Ordenamiento por columnas
- ✅ Paginación
- ✅ Vista detallada al hacer clic en una persona

### Ficha Detalle de Persona (`/crm/personas/[id]`)

**Qué verás:**
- **Información Personal:**
  - Nombres y apellidos
  - RUT
  - Género
  - Fecha de nacimiento
  - Nombre completo

- **Relaciones:**
  - Colegio asociado (si es estudiante/profesor)
  - Trayectorias educativas
  - Asignaciones de cartera
  - Eventos relacionados

- **Historial:**
  - Fecha de creación
  - Última actualización
  - Cambios y eventos

---

## 🔍 Funcionalidades Generales del CRM

### 1. Búsqueda y Filtrado

- **Búsqueda rápida:** Por nombre, RUT, o cualquier campo visible
- **Filtros avanzados:** Por estado, fecha, colegio, etc.
- **Búsqueda en tiempo real:** Resultados mientras escribes

### 2. Visualización de Datos

- **Tablas responsivas:** Se adaptan a diferentes tamaños de pantalla
- **Ordenamiento:** Click en columnas para ordenar ascendente/descendente
- **Paginación:** Navegación entre páginas de resultados
- **Vista detallada:** Click en cualquier registro para ver información completa

### 3. Integración con Strapi

- **Datos en tiempo real:** Los datos se obtienen directamente de Strapi
- **Sincronización automática:** Cambios en Strapi se reflejan en la intranet
- **Relaciones:** Visualización de relaciones entre colegios, personas, eventos, etc.

---

## 📊 Datos que se Muestran

### Para Colegios:

- Información básica (nombre, RUT, dirección)
- Datos de contacto (teléfono, email)
- Ubicación (comuna, región)
- Estado (activo/inactivo)
- Relaciones con personas
- Eventos del colegio
- Asignaciones de cartera
- Fechas de creación y actualización

### Para Personas:

- Información personal (nombres, apellidos, RUT)
- Datos demográficos (género, fecha de nacimiento)
- Colegio asociado
- Trayectorias educativas
- Asignaciones de cartera
- Eventos relacionados
- Estado (activo/inactivo)
- Fechas de creación y actualización

---

## 🎯 Casos de Uso

### 1. Buscar un Colegio

1. Ir a `/crm/colegios`
2. Usar la búsqueda para encontrar por nombre
3. Ver información detallada haciendo clic

### 2. Ver Personas de un Colegio

1. Ir a `/crm/colegios`
2. Hacer clic en un colegio
3. Ver la sección "Personas asociadas"

### 3. Buscar una Persona por RUT

1. Ir a `/crm/personas`
2. Buscar por RUT
3. Ver información completa y relaciones

### 4. Ver Trayectoria de una Persona

1. Ir a `/crm/personas`
2. Hacer clic en una persona
3. Ver sección "Trayectorias educativas"

---

## 🔐 Permisos y Acceso

- **Rutas protegidas:** Las rutas están en `(admin)/(apps)/crm/`, por lo que requieren autenticación
- **Mismo sistema de permisos:** Usa el mismo sistema de autenticación que el resto de la intranet
- **Acceso según roles:** Los permisos dependen de los roles configurados en la aplicación

---

## 📱 Responsive Design

- **Desktop:** Vista completa con todas las columnas
- **Tablet:** Tabla adaptada con columnas principales
- **Mobile:** Vista optimizada para pantallas pequeñas

---

## 🚀 Próximas Funcionalidades (Posibles)

Según la estructura típica de un CRM, podrían agregarse:

- ✅ Exportar datos a Excel/CSV
- ✅ Crear/editar colegios y personas desde la intranet
- ✅ Filtros avanzados más complejos
- ✅ Gráficos y estadísticas
- ✅ Historial de cambios
- ✅ Notificaciones y alertas

---

## 📝 Notas Importantes

1. **Solo lectura (por ahora):** El CRM actual muestra datos pero no permite editar desde la intranet
2. **Datos desde Strapi:** Toda la información viene directamente de Strapi
3. **Requiere variables de entorno:** `STRAPI_URL` y `STRAPI_API_TOKEN` deben estar configuradas
4. **Rutas protegidas:** Requiere estar autenticado en la intranet

---

## 🎨 Interfaz Visual

- **Diseño consistente:** Usa el mismo diseño que el resto de la intranet
- **Tablas con estilo:** Tablas con hover effects y ordenamiento visual
- **Cards informativos:** Información organizada en cards en las vistas de detalle
- **Badges de estado:** Indicadores visuales para estados (activo/inactivo)

---

**En resumen:** El CRM te permite ver y explorar toda la información de colegios y personas que está en Strapi, con una interfaz amigable y funcionalidades de búsqueda y filtrado.

