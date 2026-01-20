# Guía de Despliegue Local - CRM

Esta guía te ayudará a configurar y ejecutar el proyecto localmente, especialmente para trabajar con el módulo CRM.

## 📋 Checklist Pre-Despliegue

### ✅ Requisitos Previos

- [x] **Node.js** >= 20.9.0
- [x] **npm** >= 10.0.0
- [x] **Git** (para clonar el repositorio)
- [x] Acceso a Strapi (https://strapi.moraleja.cl)

### ✅ Configuración Necesaria

- [ ] Variables de entorno configuradas (`.env.local`)
- [ ] Dependencias instaladas (`npm install`)
- [ ] Conexión a Strapi verificada
- [ ] Permisos de API en Strapi configurados

---

## 🚀 Pasos para Desplegar Localmente

### 1. Clonar/Navegar al Proyecto

```bash
# Si ya tienes el proyecto clonado
cd AlmonteIntranet

# Si necesitas clonarlo
git clone https://github.com/subimeDev/intranetAlmonte.git
cd intranetAlmonte/AlmonteIntranet
```

### 2. Instalar Dependencias

```bash
npm install
```

**⏱️ Tiempo estimado:** 3-5 minutos

### 3. Configurar Variables de Entorno

#### Opción A: Copiar desde ejemplo

```bash
cp .env.local.example .env.local
```

#### Opción B: Crear manualmente

Crea un archivo `.env.local` en la raíz de `AlmonteIntranet/` con las siguientes variables **mínimas para CRM**:

```env
# Strapi Configuration (REQUERIDO para CRM)
NEXT_PUBLIC_STRAPI_URL=https://strapi.moraleja.cl
STRAPI_API_TOKEN=tu_token_de_strapi_aqui

# Next.js Configuration
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### Obtener el Token de Strapi

1. Accede a: https://strapi.moraleja.cl/admin
2. Ve a **Settings → API Tokens**
3. Crea un nuevo token con permisos **Full access**
4. Copia el token generado
5. Pégalo en `.env.local` como `STRAPI_API_TOKEN`

⚠️ **IMPORTANTE:** Sin el token de Strapi, el módulo CRM **NO funcionará**.

### 4. Verificar Configuración

Antes de ejecutar, verifica que:

- ✅ El archivo `.env.local` existe en `AlmonteIntranet/`
- ✅ `STRAPI_API_TOKEN` tiene un valor válido
- ✅ `NEXT_PUBLIC_STRAPI_URL` apunta a `https://strapi.moraleja.cl`

### 5. Ejecutar en Desarrollo

```bash
npm run dev
```

**⏱️ Tiempo estimado:** 30-60 segundos (primera vez puede tardar más)

### 6. Acceder a la Aplicación

Abre tu navegador en:
```
http://localhost:3000
```

Para acceder al CRM:
```
http://localhost:3000/crm
http://localhost:3000/crm/colegios
http://localhost:3000/crm/contacts
```

---

## 🔍 Verificación Post-Despliegue

### Verificar que Funciona

1. **Acceso a la aplicación:**
   - [ ] Abre `http://localhost:3000`
   - [ ] La página carga correctamente
   - [ ] No hay errores en la consola del navegador

2. **Conexión con Strapi:**
   - [ ] Accede a `/crm/colegios`
   - [ ] La lista de colegios carga (o muestra "No hay colegios")
   - [ ] No aparecen errores de conexión en la consola

3. **Funcionalidad CRM:**
   - [ ] Puedes ver la lista de colegios
   - [ ] Puedes ver la lista de contactos
   - [ ] Los filtros funcionan correctamente
   - [ ] Puedes crear/editar/eliminar registros

### Errores Comunes

#### ❌ Error: "Cannot find module"
```bash
# Solución: Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

#### ❌ Error: "Port 3000 is already in use"
```bash
# Windows PowerShell
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# O cambiar el puerto temporalmente
npm run dev -- -p 3001
```

#### ❌ Error: "STRAPI_API_TOKEN no está configurado"
- Verifica que el archivo `.env.local` existe
- Verifica que `STRAPI_API_TOKEN` tiene un valor
- Reinicia el servidor después de cambiar `.env.local`

#### ❌ Error: "Error al cargar colegios" o "Error al cargar contactos"
- Verifica que `STRAPI_API_TOKEN` es válido
- Verifica que Strapi está accesible: https://strapi.moraleja.cl
- Revisa la consola del navegador (F12) para más detalles
- Verifica los permisos del token en Strapi (debe tener Full access)

---

## 📦 Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Inicia servidor de desarrollo (localhost:3000)

# Build y Producción
npm run build           # Construye la aplicación para producción
npm run start           # Inicia servidor de producción (requiere build)

# Calidad de Código
npm run lint            # Ejecuta el linter
npm run type-check      # Verifica errores de TypeScript

# Testing (si está configurado)
npm run test            # Ejecuta tests unitarios
npm run test:e2e        # Ejecuta tests end-to-end (Playwright)
```

---

## 🎯 Variables de Entorno por Módulo

### Mínimas para CRM
```env
NEXT_PUBLIC_STRAPI_URL=https://strapi.moraleja.cl
STRAPI_API_TOKEN=tu_token_aqui
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Completas (si usas otros módulos)
Ver: `docs/CONFIGURACION.md` o `.env.local.example`

---

## 📝 Notas Importantes

1. **Hot Reload:** Los cambios en el código se reflejan automáticamente (no necesitas reiniciar)
2. **Variables de Entorno:** Requieren reinicio del servidor para aplicar cambios
3. **Strapi:** Debe estar accesible desde tu red (no requiere estar local)
4. **Base de Datos:** El proyecto usa Strapi como backend, no requiere base de datos local
5. **Puerto:** Por defecto usa 3000, puedes cambiarlo con `-p 3001`

---

## 🔗 Recursos Adicionales

- **Documentación completa:** `docs/CONFIGURACION.md`
- **Guía de desarrollo:** `docs/GUIA-DESARROLLO.md`
- **Deployment en producción:** `docs/DEPLOYMENT.md`
- **README principal:** `README.md`

---

## ✅ Checklist Final

Antes de comenzar a desarrollar, verifica:

- [ ] Node.js y npm instalados y en versión correcta
- [ ] Proyecto clonado/navegado
- [ ] Dependencias instaladas (`npm install`)
- [ ] Archivo `.env.local` creado
- [ ] `STRAPI_API_TOKEN` configurado y válido
- [ ] Servidor ejecutando (`npm run dev`)
- [ ] Aplicación accesible en `http://localhost:3000`
- [ ] CRM funcionando correctamente

**¡Listo para desarrollar!** 🎉
