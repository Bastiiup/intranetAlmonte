# 🚀 Guía de Onboarding - Intranet Almonte

**Para el equipo de producción que tomará la intranet el miércoles**

---

## 📋 Índice

1. [Primeros Pasos](#primeros-pasos)
2. [Acceso y Login](#acceso-y-login)
3. [Navegación Básica](#navegación-básica)
4. [Sistema de Plataformas](#sistema-de-plataformas)
5. [Funcionalidades Principales](#funcionalidades-principales)
6. [Solución de Problemas](#solución-de-problemas)

---

## 🎯 Primeros Pasos

### 1. Acceder a la Intranet

- **URL de producción**: (configurar según el dominio final)
- **Navegador recomendado**: Chrome, Firefox o Edge (últimas versiones)

### 2. Tu Primera Sesión

1. Abre la URL de la intranet
2. Serás redirigido automáticamente al login si no estás autenticado
3. Ingresa tu email y contraseña (proporcionados por el administrador)
4. Haz clic en "Iniciar Sesión"

---

## 🔐 Acceso y Login

### Credenciales

- **Email**: Tu email corporativo (el mismo que está en Strapi)
- **Contraseña**: La contraseña configurada en tu cuenta de colaborador

### Problemas de Login

Si no puedes iniciar sesión:
1. Verifica que tu email sea correcto
2. Verifica que tu cuenta esté activa (`activo: true` en Strapi)
3. Contacta al administrador si el problema persiste

### Mantener Sesión

- Puedes marcar "Mantenerme conectado" para no tener que iniciar sesión cada vez
- La sesión dura 7 días

---

## 🧭 Navegación Básica

### Menú Lateral

El menú lateral está siempre visible en la izquierda de la pantalla. Contiene:

- **Tableros**: Dashboards y estadísticas
- **COMERCIAL**:
  - **CRM**: Gestión de contactos, colegios, personas, oportunidades, leads, embudo, campaña, cotizaciones, actividades
- **ECOMMERCE**:
  - **Products**: Gestión de productos
  - **Orders**: Gestión de pedidos
  - **Customers**: Gestión de clientes
- **Tienda**: Productos, POS, Pedidos, Facturas

### Topbar (Barra Superior)

- **Logo**: Click para ir al inicio
- **Búsqueda**: Buscar en la intranet
- **Notificaciones**: Ver notificaciones
- **Perfil de Usuario**: Ver y editar tu perfil

---

## 🌐 Sistema de Plataformas

### ¿Qué es el Sistema de Plataformas?

Cada colaborador tiene asignada una **plataforma** que determina qué datos puede ver:

- **Moraleja**: Solo puede ver productos, pedidos y clientes de Editorial Moraleja
- **Escolar**: Solo puede ver productos, pedidos y clientes de Librería Escolar
- **General**: Puede ver datos de ambas plataformas (supervisores, admins)

### ¿Cómo Sé Mi Plataforma?

Tu plataforma está asignada en Strapi por el administrador. Si no estás seguro:
- Contacta al administrador
- Por defecto, si no tienes plataforma asignada, verás ambas plataformas (`general`)

### ¿Qué Significa Esto en la Práctica?

- **Si eres de Moraleja**: Solo verás productos/pedidos/clientes de moraleja.cl
- **Si eres de Escolar**: Solo verás productos/pedidos/clientes de escolar.moraleja.cl
- **Si eres General**: Verás datos de ambas plataformas

---

## 📦 Funcionalidades Principales

### 1. Gestión de Productos

**Ruta**: `/products` o `/tienda/productos`

- Ver todos los productos
- Crear nuevos productos
- Editar productos existentes
- Gestionar stock
- Ver categorías y etiquetas

**Nota**: Los productos se filtran automáticamente según tu plataforma.

### 2. Gestión de Pedidos

**Ruta**: `/orders` o `/tienda/pedidos`

- Ver todos los pedidos
- Filtrar por estado, fecha, cliente
- Ver detalles de pedidos
- Actualizar estado de pedidos

**Nota**: Los pedidos se filtran automáticamente según tu plataforma.

### 3. Gestión de Clientes

**Ruta**: `/customers` o `/tienda/clientes`

- Ver todos los clientes
- Crear nuevos clientes
- Editar información de clientes
- Ver historial de pedidos por cliente

**Nota**: Los clientes se filtran automáticamente según tu plataforma.

### 4. CRM

**Rutas**: `/crm/*`

- **Contactos**: Gestionar contactos
- **Colegios**: Gestionar colegios
- **Personas**: Gestionar personas
- **Oportunidades**: Gestionar oportunidades de negocio
- **Leads**: Gestionar leads
- **Embudo**: Ver pipeline de ventas
- **Campaña**: Gestionar campañas
- **Cotizaciones**: Gestionar cotizaciones
- **Actividades**: Ver registro de actividades

### 5. POS (Punto de Venta)

**Ruta**: `/tienda/pos`

- Interfaz de punto de venta
- Búsqueda de productos por código de barras
- Gestión de carrito
- Procesamiento de pagos
- Impresión de tickets

---

## 🔧 Solución de Problemas

### No Veo el Menú Lateral

- Verifica que estés en una página de administración o tienda
- Las páginas de login/error no tienen menú lateral (es normal)
- Recarga la página (F5)

### No Veo Todos los Productos/Pedidos/Clientes

- Esto es normal si tienes una plataforma específica asignada
- Solo verás datos de tu plataforma
- Si necesitas ver ambas plataformas, contacta al administrador para cambiar tu plataforma a `general`

### Error al Cargar Datos

1. Verifica tu conexión a internet
2. Recarga la página (F5)
3. Cierra sesión y vuelve a iniciar sesión
4. Si el problema persiste, contacta al administrador

### No Puedo Editar/Crear Algo

- Verifica que tengas los permisos necesarios según tu rol
- Algunas funcionalidades requieren roles específicos:
  - `super_admin`: Acceso completo
  - `encargado_adquisiciones`: Puede gestionar productos
  - `supervisor`: Puede supervisar operaciones
  - `soporte`: Acceso básico

---

## 📞 Contacto y Soporte

### Si Tienes Problemas

1. **Revisa esta guía** primero
2. **Contacta al administrador** de Strapi
3. **Reporta el problema** con:
   - Qué estabas haciendo
   - Qué error viste
   - Captura de pantalla (si aplica)

### Recursos Adicionales

- **Documentación técnica**: `docs/` (para desarrolladores)
- **Configuración**: `docs/CONFIGURACION.md`
- **Despliegue**: `docs/DEPLOYMENT.md`

---

## ✅ Checklist de Primer Día

- [ ] Puedo iniciar sesión correctamente
- [ ] Veo el menú lateral
- [ ] Puedo navegar entre secciones
- [ ] Entiendo qué plataforma tengo asignada
- [ ] Puedo ver los datos que necesito (productos, pedidos, clientes)
- [ ] Sé a quién contactar si tengo problemas

---

**¡Bienvenido al equipo! 🎉**

