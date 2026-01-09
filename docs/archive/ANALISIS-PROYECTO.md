# 📊 Análisis Completo del Proyecto Intranet Almonte

## 🎯 Resumen Ejecutivo

**Intranet Almonte** es una aplicación web empresarial desarrollada con **Next.js 16** y **React 19**, diseñada como un sistema de gestión interna (intranet) para la empresa Almonte. El proyecto utiliza **Strapi** como CMS backend y está desplegado en **Railway**.

---

## 🏗️ Arquitectura del Proyecto

### Estructura General

```
intranetAlmonte/
├── frontend-ubold/          # Aplicación principal Next.js (App Router)
│   ├── src/
│   │   ├── app/            # Rutas y páginas (Next.js App Router)
│   │   ├── components/     # Componentes reutilizables
│   │   ├── lib/           # Utilidades y clientes (Strapi, WooCommerce)
│   │   ├── hooks/         # Custom hooks de React
│   │   ├── layouts/       # Layouts de la aplicación
│   │   └── assets/        # Estilos SCSS, imágenes
│   └── package.json
├── frontend/               # Aplicación frontend secundaria (no utilizada)
└── README.md
```

### Stack Tecnológico

#### Frontend
- **Next.js 16.0.10** - Framework React con App Router
- **React 19.1.0** - Biblioteca UI
- **TypeScript 5.8.3** - Tipado estático
- **Bootstrap 5.3.8** - Framework CSS
- **SCSS** - Preprocesador CSS

#### Backend/CMS
- **Strapi** (v4/v5) - CMS headless en `https://strapi.moraleja.cl`
- **WooCommerce** - Integración de e-commerce (opcional)

#### Deployment
- **Railway** - Plataforma de despliegue
- **NIXPACKS** - Builder automático
- **Docker** - Contenedorización (backup)

#### Librerías Principales
- **ApexCharts** - Gráficos y visualizaciones
- **React Hook Form** - Manejo de formularios
- **TanStack Table** - Tablas avanzadas
- **FullCalendar** - Calendarios
- **Leaflet** - Mapas
- **SweetAlert2** - Alertas y modales
- **Quill** - Editor de texto enriquecido

---

## 🔑 Funcionalidades Principales

### 1. Sistema de Autenticación
- **Login/Logout** con JWT tokens
- **Gestión de sesiones** en localStorage
- **Roles de usuario**:
  - `super_admin`
  - `encargado_adquisiciones`
  - `supervisor`
  - `soporte`
- **Perfiles de colaboradores** vinculados a personas

**Archivos clave:**
- `src/lib/auth.ts` - Utilidades de autenticación
- `src/hooks/useAuth.ts` - Hook para datos del usuario
- `src/app/api/auth/login/route.ts` - Endpoint de login

### 2. Gestión de Tienda/E-commerce
- **CRUD de productos** (libros)
- **Gestión de categorías**
- **Gestión de pedidos**
- **Integración con WooCommerce**
- **Sistema POS** (Point of Sale)

**Endpoints API:**
- `/api/tienda/productos` - Listar productos
- `/api/tienda/productos/[id]` - GET/PUT producto individual
- `/api/tienda/pedidos` - Gestión de pedidos
- `/api/woocommerce/*` - Integración WooCommerce

### 3. Sistema de Chat
- **Chat interno** entre colaboradores
- **Lista de contactos**
- **Mensajería en tiempo real**

**Archivos:**
- `src/app/(admin)/(apps)/chat/`
- `src/app/api/chat/colaboradores/route.ts`
- `src/app/api/chat/mensajes/route.ts`

### 4. Dashboard y Analytics
- **Múltiples dashboards** con métricas
- **Gráficos interactivos** (ApexCharts, Chart.js)
- **Widgets personalizables**

### 5. Gestión de Usuarios y Colaboradores
- **Perfiles de usuario**
- **Gestión de roles y permisos**
- **Contactos**
- **API de colaboradores**: `/api/colaboradores/me`

### 6. Módulos Adicionales
- **CRM** - Gestión de clientes, leads, oportunidades
- **Email** - Sistema de correo interno
- **Calendario** - Gestión de eventos
- **File Manager** - Gestor de archivos
- **Tablas de datos** - DataTables y TanStack Table
- **Formularios** - Validación con Yup/Zod
- **Mapas** - Leaflet y mapas vectoriales

---

## 🔌 Integración con Strapi

### Configuración

**Variables de entorno requeridas:**
```env
NEXT_PUBLIC_STRAPI_URL=https://strapi.moraleja.cl
STRAPI_API_TOKEN=<token_de_autenticacion>
```

### Cliente Strapi

**Archivo:** `src/lib/strapi/client.ts`

**Características:**
- ✅ Timeout de 30 segundos para peticiones
- ✅ Logs detallados en desarrollo
- ✅ Manejo de errores robusto
- ✅ Headers de autenticación automáticos
- ✅ Métodos: `get`, `post`, `put`, `delete`

**Ejemplo de uso:**
```typescript
import strapiClient from '@/lib/strapi/client'

// Obtener productos
const productos = await strapiClient.get('/api/libros?populate=*')

// Actualizar producto
await strapiClient.put(`/api/libros/${id}`, {
  data: { nombre_libro: 'Nuevo nombre' }
})
```

### Estructura de Datos en Strapi

**Colección: `libros`**
- Endpoint: `/api/libros`
- Campos principales:
  - `id` (numérico)
  - `documentId` (string, Strapi v5)
  - `nombre_libro`
  - `descripcion`
  - `portada_libro`
  - `isbn_libro`

**Nota importante:** Los datos vienen directamente en el objeto, NO dentro de `attributes` (diferente a algunas versiones de Strapi).

---

## ⚠️ Problemas Conocidos y Soluciones

### 1. Problema: Edición de Productos

**Síntoma:** Error "Producto con ID X no encontrado" al intentar editar.

**Causa:** Inconsistencia entre `id` numérico y `documentId` en Strapi v5.

**Solución implementada:**
- Búsqueda directa por ID primero
- Fallback a búsqueda en lista completa
- Manejo de ambos formatos (`id` y `documentId`)

**Archivo:** `src/app/api/tienda/productos/[id]/route.ts`

### 2. Problema: Configuración de Token en Railway

**Síntoma:** `STRAPI_API_TOKEN no está configurado`

**Solución:**
- Documentación en `CONFIGURAR-TOKEN-RAILWAY.md`
- Token debe configurarse en Railway → Variables
- Token visible en documentación (⚠️ **debe cambiarse en producción**)

### 3. Problema: Despliegue en Railway

**Síntoma:** Railway no detecta cambios automáticamente

**Solución:**
- Configuración de `railway.json` con `rootDirectory`
- Uso de NIXPACKS en lugar de Dockerfile
- Documentación en `SOLUCION-DESPLIEGUE-RAILWAY.md`

---

## 📁 Estructura de Directorios Clave

### `/src/app/` - Rutas de Next.js

```
app/
├── (admin)/              # Rutas protegidas (requieren autenticación)
│   ├── (apps)/          # Aplicaciones principales
│   │   ├── chat/        # Sistema de chat
│   │   ├── (ecommerce)/ # Tienda/e-commerce
│   │   └── users/       # Gestión de usuarios
│   ├── charts/          # Gráficos y visualizaciones
│   ├── forms/           # Formularios
│   └── tables/          # Tablas de datos
├── (auth)/              # Páginas de autenticación
│   └── auth-1/         # Login, sign-in
├── api/                 # API Routes (Next.js)
│   ├── auth/           # Autenticación
│   ├── chat/           # Chat API
│   ├── colaboradores/   # API de colaboradores
│   └── tienda/         # API de tienda
└── landing/            # Página de inicio pública
```

### `/src/lib/` - Utilidades y Clientes

```
lib/
├── auth.ts              # Utilidades de autenticación
├── strapi/             # Cliente Strapi
│   ├── client.ts       # Cliente HTTP principal
│   ├── config.ts       # Configuración
│   └── types.ts        # Tipos TypeScript
└── woocommerce/        # Cliente WooCommerce
```

### `/src/components/` - Componentes Reutilizables

- `AlmonteLogo.tsx` - Logo de la empresa
- `AppWrapper.tsx` - Wrapper principal
- `Loader.tsx` - Indicador de carga
- `FileUploader.tsx` - Subida de archivos
- Componentes de cards, tablas, etc.

---

## 🚀 Scripts y Comandos

### Desarrollo
```bash
cd frontend-ubold
npm install
npm run dev          # Inicia servidor en http://localhost:3000
```

### Producción
```bash
npm run build        # Compila para producción
npm start            # Inicia servidor de producción
```

### Calidad de Código
```bash
npm run lint         # Ejecuta ESLint
npm run format       # Formatea con Prettier
npm run type-check   # Verifica tipos TypeScript
```

---

## 🔐 Seguridad

### Variables de Entorno

**⚠️ IMPORTANTE:** Los siguientes tokens están expuestos en la documentación y deben cambiarse:

1. **STRAPI_API_TOKEN** - Token de autenticación de Strapi
2. **WOOCOMMERCE_CONSUMER_KEY** - Key de WooCommerce
3. **WOOCOMMERCE_CONSUMER_SECRET** - Secret de WooCommerce

**Recomendación:** Rotar estos tokens inmediatamente en producción.

### Autenticación

- Tokens JWT almacenados en `localStorage` (cliente)
- Tokens de API almacenados solo en servidor (variables de entorno)
- Validación de sesión en cada petición protegida

---

## 📊 Estado del Proyecto

### ✅ Completado

- [x] Estructura base de Next.js con App Router
- [x] Sistema de autenticación
- [x] Integración con Strapi
- [x] CRUD de productos
- [x] Sistema de chat
- [x] Dashboard y analytics
- [x] Gestión de usuarios
- [x] Despliegue en Railway
- [x] Resolución de conflictos entre ramas

### 🔄 En Progreso / Mejoras Pendientes

- [ ] Resolver completamente el problema de edición de productos
- [ ] Rotar tokens de seguridad expuestos
- [ ] Optimizar rendimiento de búsquedas en Strapi
- [ ] Implementar caché para peticiones frecuentes
- [ ] Mejorar manejo de errores en frontend
- [ ] Documentar API endpoints
- [ ] Tests unitarios e integración

### ⚠️ Problemas Conocidos

1. **Edición de productos:** A veces falla la búsqueda por ID
2. **Tokens expuestos:** Documentación contiene tokens reales
3. **Performance:** Búsquedas en lista completa pueden ser lentas
4. **Error handling:** Algunos errores no se muestran al usuario

---

## 🔄 Ramas del Repositorio

### Ramas Existentes

- `main` - Rama principal
- `RamaBastian-Intranet` - Cambios de Bastian
- `matiRama` - Cambios de Mati
- `respaldo` - Backup
- `respaldoBastian` - Backup de Bastian

### Nueva Rama Creada

- **`integracion-todas-ramas`** - Combina todos los cambios de todas las ramas
  - ✅ Merge de `RamaBastian-Intranet`
  - ✅ Merge de `matiRama` (conflicto resuelto en `client.ts`)
  - ✅ Merge de `respaldo` y `respaldoBastian` (sin cambios adicionales)

---

## 📝 Documentación Adicional

El proyecto incluye varios archivos de documentación:

1. **README.md** - Documentación principal
2. **CONFIGURAR-TOKEN-RAILWAY.md** - Guía de configuración de tokens
3. **PROBLEMA-EDICION-PRODUCTOS.md** - Análisis del problema de edición
4. **SOLUCION-DESPLIEGUE-RAILWAY.md** - Solución de problemas de despliegue
5. **frontend-ubold/src/lib/strapi/README.md** - Documentación del cliente Strapi

---

## 🎨 UI/UX

### Framework CSS
- **Bootstrap 5.3.8** - Framework principal
- **SCSS** - Variables personalizadas en `src/assets/scss/`
- **Tema oscuro** - Variables en `_variables-dark.scss`

### Componentes UI
- React Bootstrap
- SweetAlert2 para modales
- React Icons
- Custom components en `src/components/`

---

## 🔍 Recomendaciones

### Seguridad
1. ⚠️ **URGENTE:** Rotar todos los tokens expuestos en documentación
2. Implementar validación de tokens en cada petición
3. Considerar usar cookies httpOnly en lugar de localStorage para JWT
4. Implementar rate limiting en API routes

### Performance
1. Implementar caché para peticiones frecuentes a Strapi
2. Optimizar búsquedas (usar filtros en lugar de listas completas)
3. Implementar paginación en listas grandes
4. Lazy loading de componentes pesados

### Código
1. Agregar tests unitarios y de integración
2. Mejorar manejo de errores con mensajes claros
3. Documentar todos los endpoints de API
4. Estandarizar estructura de respuestas de API
5. Implementar logging estructurado

### DevOps
1. Configurar CI/CD pipeline
2. Implementar health checks más robustos
3. Configurar monitoreo y alertas
4. Documentar proceso de despliegue

---

## 📞 Información de Contacto y URLs

- **Strapi Admin:** https://strapi.moraleja.cl/admin
- **Strapi API:** https://strapi.moraleja.cl/api
- **Repositorio:** https://github.com/subimeDev/intranetAlmonte
- **Railway:** Dashboard de Railway (configuración de despliegue)

---

## 📅 Historial de Cambios Recientes

### Merge de Ramas (Rama Actual: `integracion-todas-ramas`)

**Cambios de `RamaBastian-Intranet`:**
- Sistema de autenticación mejorado
- Integración de chat
- Gestión de colaboradores
- Componentes de logo personalizados

**Cambios de `matiRama`:**
- Logs detallados de debugging
- Mejoras en cliente Strapi
- Soluciones de problemas de edición
- Configuración de Railway

**Conflicto resuelto:**
- `client.ts`: Combinación de timeout (Bastian) + logs (Mati)

---

## 🎯 Próximos Pasos Sugeridos

1. **Inmediato:**
   - Rotar tokens de seguridad
   - Probar funcionalidad de edición de productos
   - Verificar que todos los merges funcionan correctamente

2. **Corto plazo:**
   - Implementar tests básicos
   - Mejorar documentación de API
   - Optimizar búsquedas en Strapi

3. **Mediano plazo:**
   - Implementar caché
   - Mejorar manejo de errores
   - Agregar monitoreo

---

**Última actualización:** Diciembre 2024  
**Versión del proyecto:** 1.1.0  
**Estado:** En desarrollo activo

