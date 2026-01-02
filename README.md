# Intranet Almonte

Sistema de gestión interna (intranet) para la empresa Almonte, desarrollado con Next.js 16, React 19 y Strapi CMS.

## 📋 Tabla de Contenidos

- [Inicio Rápido](#inicio-rápido)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Stack Tecnológico](#stack-tecnológico)
- [Funcionalidades](#funcionalidades)
- [Documentación](#documentación)
- [Contribución](#contribución)

## 🚀 Inicio Rápido

### Requisitos Previos

- **Node.js**: >= 20.9.0
- **npm**: >= 10.0.0
- **Git**

### Instalación Local

```bash
# 1. Clonar el repositorio
git clone https://github.com/subimeDev/intranetAlmonte.git
cd intranetAlmonte

# 2. Navegar al frontend
cd AlmonteIntranet

# 3. Instalar dependencias
npm install

# 4. Configurar variables de entorno (ver docs/CONFIGURACION.md)
cp .env.example .env.local

# 5. Ejecutar en desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

Para más detalles, ver [docs/GUIA-DESARROLLO.md](docs/GUIA-DESARROLLO.md)

## 📁 Estructura del Proyecto

```
intranetAlmonte/
├── AlmonteIntranet/         # Aplicación Next.js principal
│   ├── src/
│   │   ├── app/            # Rutas y páginas (App Router)
│   │   ├── components/     # Componentes reutilizables
│   │   ├── lib/           # Utilidades y clientes (Strapi, WooCommerce, Shipit)
│   │   ├── hooks/         # Custom hooks de React
│   │   ├── layouts/       # Layouts de la aplicación
│   │   └── assets/        # Estilos SCSS, imágenes
│   ├── public/            # Archivos estáticos
│   └── package.json
├── strapi-backend/         # Backend Strapi (CMS)
├── docs/                  # Documentación del proyecto
│   ├── CONFIGURACION.md   # Variables de entorno y configuraciones
│   ├── GUIA-DESARROLLO.md # Guía de desarrollo
│   ├── INTEGRACIONES.md   # Integraciones (Strapi, WooCommerce, Shipit)
│   └── DEPLOYMENT.md      # Guía de despliegue
└── README.md
```

## 🛠️ Stack Tecnológico

### Frontend
- **Next.js 16.0.10** - Framework React con App Router
- **React 19.1.0** - Biblioteca UI
- **TypeScript 5.8.3** - Tipado estático
- **Bootstrap 5.3.8** - Framework CSS
- **SCSS** - Preprocesador CSS

### Backend/CMS
- **Strapi** (v4/v5) - CMS headless en `https://strapi.moraleja.cl`
- **WooCommerce** - E-commerce (Moraleja y Escolar)

### Integraciones
- **Shipit** - Gestión de envíos y logística
- **Stream Chat** - Sistema de mensajería en tiempo real
- **Haulmer** - Facturación electrónica

### Deployment
- **Railway** - Plataforma de despliegue
- **Docker** - Contenedorización

## ✨ Funcionalidades

### Sistema de Autenticación
- Login/Logout con JWT tokens
- Roles de usuario (super_admin, encargado_adquisiciones, supervisor, soporte)
- Gestión de sesiones

### Gestión de Tienda/E-commerce
- **CRUD de productos** - Gestión completa de libros/productos
- **Sistema POS** - Point of Sale funcional con integración WooCommerce
- **Gestión de pedidos** - Creación, actualización y seguimiento
- **Gestión de clientes** - CRUD completo con sincronización WooCommerce

### Sistema de Chat
- Chat interno entre colaboradores
- Integración con Stream Chat
- Mensajería en tiempo real

### Logística
- Integración con Shipit para envíos
- Gestión de tracking
- Webhooks para actualizaciones

### Dashboard y Analytics
- Múltiples dashboards con métricas
- Gráficos interactivos (ApexCharts, Chart.js)
- Reportes personalizables

## 📚 Documentación

La documentación completa se encuentra en la carpeta `docs/`:

- **[docs/CONFIGURACION.md](docs/CONFIGURACION.md)** - Variables de entorno, credenciales y configuraciones
- **[docs/GUIA-DESARROLLO.md](docs/GUIA-DESARROLLO.md)** - Guía de desarrollo local, estructura del código, scripts
- **[docs/INTEGRACIONES.md](docs/INTEGRACIONES.md)** - Detalles de integraciones (Strapi, WooCommerce, Shipit, Stream Chat)
- **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Guía de despliegue en Railway

## 🚀 Scripts Disponibles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Construir para producción
npm run start        # Servidor de producción
npm run lint         # Ejecutar ESLint
npm run type-check   # Verificar tipos TypeScript
npm test             # Ejecutar tests
```

## 🔐 Variables de Entorno

Las variables de entorno necesarias se documentan en [docs/CONFIGURACION.md](docs/CONFIGURACION.md).

**Importante:** Nunca commitees archivos `.env.local` o credenciales en el repositorio.

## 🌿 Ramas del Repositorio

- `main` - Rama principal
- `infanteDev` - Rama de desarrollo actual

## 📝 Estado del Proyecto

- ✅ Sistema POS funcional
- ✅ CRUD de clientes completo
- ✅ Integración Shipit implementada
- ✅ Chat con Stream integrado
- ✅ Despliegue en Railway configurado
- ✅ Gestión de pedidos y productos

## 🤝 Contribución

1. Crear una rama desde `infanteDev`
2. Realizar cambios
3. Hacer commit con mensajes descriptivos
4. Crear Pull Request hacia `infanteDev`

## 📞 Contacto y URLs

- **Strapi Admin:** https://strapi.moraleja.cl/admin
- **Strapi API:** https://strapi.moraleja.cl/api
- **Repositorio:** https://github.com/subimeDev/intranetAlmonte

## 📄 Licencia

Privado - Todos los derechos reservados

---

**Última actualización:** Diciembre 2024  
**Versión:** 1.1.0

