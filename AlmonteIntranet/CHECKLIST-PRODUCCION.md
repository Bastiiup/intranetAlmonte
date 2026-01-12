# ✅ Checklist Pre-Producción - Intranet Almonte

**Fecha objetivo: Miércoles** - El equipo de producción tomará la intranet

---

## 🔴 CRÍTICO - Debe estar listo ANTES del miércoles

### 1. ⚠️ Configuración en Strapi (URGENTE)

#### Campo `plataforma` en Colaboradores
- [ ] **Agregar campo `plataforma`** al Content Type `intranet-colaboradores`
  - Tipo: Enumeration
  - Valores: `moraleja`, `escolar`, `general`
  - Default: `general`
  - **Prompt listo en**: `PROMPT-STRAPI-PLATAFORMA.txt`
  
- [ ] **Asignar plataformas a colaboradores existentes**
  - Revisar cada colaborador en Strapi
  - Asignar `moraleja` o `escolar` según corresponda
  - Dejar `general` para supervisores/admins que necesitan ver ambas

**⚠️ SIN ESTO, el filtrado por plataforma NO funcionará**

---

### 2. 🔐 Variables de Entorno en Railway (VERIFICAR)

#### Variables Obligatorias
- [ ] `NEXT_PUBLIC_STRAPI_URL` = `https://strapi.moraleja.cl`
- [ ] `STRAPI_API_TOKEN` = Token válido con permisos completos
- [ ] `NEXT_PUBLIC_WOOCOMMERCE_URL_MORALEJA` = `https://moraleja.cl`
- [ ] `WOO_MORALEJA_CONSUMER_KEY` = Clave válida
- [ ] `WOO_MORALEJA_CONSUMER_SECRET` = Secreto válido
- [ ] `NEXT_PUBLIC_WOOCOMMERCE_URL_ESCOLAR` = `https://escolar.moraleja.cl`
- [ ] `WOO_ESCOLAR_CONSUMER_KEY` = Clave válida
- [ ] `WOO_ESCOLAR_CONSUMER_SECRET` = Secreto válido

#### Variables Opcionales (pero importantes)
- [ ] `STREAM_API_KEY` (si usan chat)
- [ ] `STREAM_SECRET_KEY` (si usan chat)
- [ ] `NEXT_PUBLIC_STREAM_API_KEY` (si usan chat)
- [ ] `SHIPIT_API_TOKEN` (si usan envíos)
- [ ] `SHIPIT_API_EMAIL` (si usan envíos)
- [ ] Variables de Haulmer (si usan facturación electrónica)

**Verificar en**: Railway → Variables

---

### 3. 👥 Permisos y Roles en Strapi

- [ ] **Verificar permisos del rol "Public"** en Strapi
  - Content Types que deben ser accesibles públicamente (si aplica)
  - Endpoints de API que necesitan acceso público

- [ ] **Verificar permisos de API Tokens**
  - El token usado en `STRAPI_API_TOKEN` debe tener permisos completos
  - Verificar que no haya expirado

- [ ] **Verificar roles de colaboradores**
  - `super_admin` - Acceso completo
  - `encargado_adquisiciones` - Permisos de productos
  - `supervisor` - Permisos de supervisión
  - `soporte` - Permisos básicos

---

### 4. 🔒 Seguridad y Autenticación

- [ ] **Verificar que el login funcione correctamente**
  - Probar login con diferentes colaboradores
  - Verificar que las cookies se establezcan correctamente
  - Verificar que el middleware proteja las rutas

- [ ] **Verificar que los colaboradores inactivos no puedan acceder**
  - Campo `activo: false` debe bloquear acceso

- [ ] **Verificar que el filtrado por plataforma funcione**
  - Probar con colaborador de `moraleja` - solo debe ver datos de moraleja
  - Probar con colaborador de `escolar` - solo debe ver datos de escolar
  - Probar con colaborador de `general` - debe ver ambas plataformas

---

### 5. 📊 Datos y Contenido

- [ ] **Limpiar datos de prueba** (si existen)
  - Productos de prueba
  - Pedidos de prueba
  - Clientes de prueba
  - Colaboradores de prueba

- [ ] **Eliminar páginas de prueba** (antes de producción)
  - `/tienda/test-token` - Página de prueba de tokens (eliminar carpeta `src/app/tienda/test-token/`)
  - `/tienda/test-strapi` - Página de prueba de Strapi (eliminar carpeta `src/app/tienda/test-strapi/`)
  - `/tienda/test-formulario-cliente` - Página de prueba de formularios (eliminar carpeta `src/app/tienda/test-formulario-cliente/`)
  - `/tienda/productos/debug` - Página de debug de productos (eliminar carpeta `src/app/tienda/productos/debug/`)
  - `/tienda/productos/debug-data` - Página de debug de datos (eliminar carpeta `src/app/tienda/productos/debug-data/`)
  - Cualquier otra página con "test" o "debug" en la ruta

- [ ] **Verificar datos reales**
  - Productos reales están cargados
  - Colegios y contactos están actualizados
  - Cursos y listas de útiles están configurados

---

### 6. 🧪 Testing Final

- [ ] **Probar funcionalidades críticas**:
  - [ ] Login/Logout
  - [ ] Navegación del menú
  - [ ] Visualización de productos (con filtrado por plataforma)
  - [ ] Visualización de pedidos (con filtrado por plataforma)
  - [ ] Visualización de clientes (con filtrado por plataforma)
  - [ ] CRM - Contactos, Colegios, Personas
  - [ ] Chat (si se usa)
  - [ ] POS (si se usa)

- [ ] **Probar en diferentes navegadores**:
  - [ ] Chrome
  - [ ] Firefox
  - [ ] Edge
  - [ ] Safari (si aplica)

- [ ] **Probar en diferentes dispositivos**:
  - [ ] Desktop
  - [ ] Tablet
  - [ ] Mobile

---

### 7. 📚 Documentación para el Equipo

- [ ] **Crear guía de inicio rápido** para nuevos usuarios
  - Cómo hacer login
  - Navegación básica
  - Funcionalidades principales

- [ ] **Documentar funcionalidades específicas**:
  - Cómo crear/editar productos
  - Cómo gestionar pedidos
  - Cómo usar el CRM
  - Cómo usar el POS (si aplica)

- [ ] **Documentar el sistema de plataformas**:
  - Qué significa cada plataforma
  - Cómo se asigna a colaboradores
  - Qué datos puede ver cada plataforma

---

### 8. 🔧 Configuración de Railway

- [ ] **Verificar configuración del servicio**:
  - [ ] Root Directory: `AlmonteIntranet`
  - [ ] Build Command: (vacío, usa Dockerfile)
  - [ ] Start Command: `node server.js`
  - [ ] Healthcheck: `/api/health`

- [ ] **Verificar que el build compile correctamente**
  - Último build exitoso
  - Sin errores críticos

- [ ] **Verificar dominio/URL de producción**
  - URL pública configurada
  - SSL/HTTPS funcionando

---

### 9. 📝 Logs y Monitoreo

- [ ] **Verificar que los logs funcionen**
  - Activity logs en Strapi
  - Logs de Railway
  - Errores se registran correctamente

- [ ] **Configurar alertas** (si aplica)
  - Errores críticos
  - Caídas del servicio

---

### 10. 🚨 Plan de Contingencia

- [ ] **Backup de datos**
  - Backup de Strapi configurado
  - Backup de base de datos (si aplica)

- [ ] **Proceso de rollback**
  - Saber cómo volver a versión anterior si hay problemas
  - Documentar proceso

- [ ] **Contactos de emergencia**
  - Quién contactar si hay problemas
  - Acceso a Railway/Strapi para soluciones rápidas

---

## 📋 Checklist Rápido (Última Verificación)

### Antes del Miércoles:

- [ ] ✅ Campo `plataforma` agregado en Strapi
- [ ] ✅ Colaboradores tienen plataforma asignada
- [ ] ✅ Variables de entorno en Railway configuradas
- [ ] ✅ Login funciona correctamente
- [ ] ✅ Filtrado por plataforma funciona
- [ ] ✅ Menú lateral visible en todas las páginas
- [ ] ✅ Build compila sin errores críticos
- [ ] ✅ Datos de prueba limpiados (si aplica)
- [ ] ✅ Documentación básica disponible
- [ ] ✅ Testing básico realizado

---

## 🎯 Prioridades (Orden de Importancia)

1. **🔴 URGENTE**: Campo `plataforma` en Strapi + Asignación a colaboradores
2. **🔴 URGENTE**: Variables de entorno en Railway verificadas
3. **🟡 IMPORTANTE**: Testing de funcionalidades críticas
4. **🟡 IMPORTANTE**: Verificar permisos y roles
5. **🟢 DESEABLE**: Documentación para el equipo
6. **🟢 DESEABLE**: Limpieza de datos de prueba

---

## 📞 Contactos y Recursos

- **Documentación de configuración**: `docs/CONFIGURACION.md`
- **Documentación de despliegue**: `docs/DEPLOYMENT.md`
- **Prompt para Strapi (plataforma)**: `PROMPT-STRAPI-PLATAFORMA.txt`
- **Implementación plataforma**: `IMPLEMENTACION-PLATAFORMA-ROLES.md`

---

## ⚠️ ADVERTENCIAS

1. **Sin el campo `plataforma` en Strapi**, el filtrado NO funcionará y todos verán todas las plataformas (comportamiento actual, pero sin control)

2. **Sin variables de entorno correctas**, la intranet no podrá conectarse a Strapi/WooCommerce

3. **Sin asignar plataformas a colaboradores**, todos tendrán `general` por defecto (verán ambas plataformas)

---

## ✅ Estado Actual

- ✅ Código implementado y funcionando
- ✅ Pruebas unitarias: 172 pasadas
- ✅ Pruebas de integración: 35 pasadas
- ✅ Build compila correctamente
- ✅ Menú lateral en todas las páginas
- ⏳ **PENDIENTE**: Configuración en Strapi (campo plataforma)
- ⏳ **PENDIENTE**: Asignación de plataformas a colaboradores
- ⏳ **PENDIENTE**: Verificación final de variables de entorno

