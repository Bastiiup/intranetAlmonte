# Integración del CRUD Completo de Clientes

## 📋 Resumen

Este documento describe la funcionalidad completa del CRUD (Create, Read, Update, Delete) de clientes implementado en la intranet, que incluye:

- **Creación de clientes** en Strapi (Content Types: `Persona` y `WO-Clientes`) y sincronización con WordPress/WooCommerce (Moraleja y Escolar)
- **Lectura/Listado** de clientes desde Strapi con relaciones completas
- **Edición de clientes** con actualización en Strapi y sincronización con WordPress
- **Validación de RUT chileno** con verificación del dígito verificador
- **Búsqueda por RUT** para edición
- **Gestión de múltiples emails y teléfonos** por cliente
- **Campos estructurados**: nombres, primer_apellido, segundo_apellido, género

---

## 🏗️ Arquitectura y Flujo de Datos

### Flujo de Creación de Clientes

```
Frontend (AddClienteForm)
    ↓
POST /api/tienda/clientes
    ↓
1. Validar RUT (si existe, verificar que no esté duplicado)
2. Crear Persona en Strapi (con emails, telefonos, rut, nombres, apellidos, genero)
3. Enviar a WordPress/WooCommerce (Moraleja y/o Escolar según selección)
4. Crear WO-Clientes en Strapi (uno por cada plataforma seleccionada)
   - Cada WO-Cliente tiene: persona (relación), originPlatform, nombre, correo_electronico
```

### Flujo de Edición de Clientes

```
Frontend (EditClienteModal)
    ↓
PUT /api/tienda/clientes/[id]
    ↓
1. Buscar Persona por documentId (prioritario) o RUT
2. Actualizar Persona en Strapi (emails, telefonos, nombres, apellidos, genero)
3. Sincronizar cambios con WordPress/WooCommerce (ambas plataformas)
```

### Flujo de Lectura de Clientes

```
Frontend (ClientsListing / CustomersCard)
    ↓
GET /api/tienda/clientes
    ↓
Strapi: GET /api/wo-clientes?populate[persona][populate][telefonos]=*&populate[persona][populate][emails]=*
    ↓
Mapear datos y mostrar en tabla
```

---

## 📁 Archivos Creados/Modificados

### Componentes Frontend

#### Nuevos Componentes
- `frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/clientes/components/AddClienteForm.tsx`
  - Formulario para creación de clientes
  - Incluye validación de RUT, campos estructurados, múltiples emails/teléfonos
  - Selector de plataformas (Moraleja/Escolar)

- `frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/clientes/components/EditClienteModal.tsx`
  - Modal para edición de clientes
  - Carga datos desde Strapi y permite edición
  - Soporta búsqueda por RUT

- `frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/clientes/components/PlatformSelector.tsx`
  - Componente para seleccionar plataformas WordPress (Moraleja/Escolar)

- `frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/clientes/components/ClientsListing.tsx`
  - Listado de clientes desde Strapi
  - Maneja estado de selección para edición

#### Páginas
- `frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/clientes/page.tsx`
  - Página principal de listado de clientes
  - Usa `CustomersCard` para mostrar clientes desde WooCommerce

- `frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/clientes/agregar/page.tsx`
  - Página dedicada para agregar nuevos clientes
  - Usa `AddClienteForm`

#### Componentes Modificados
- `frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/customers/components/CustomersCard.tsx`
  - Modificado para usar `AddClienteForm` y `EditClienteModal`
  - Integrado con el sistema de clientes de Strapi

### API Routes (Backend)

#### Nuevas Rutas
- `frontend-ubold/src/app/api/tienda/clientes/route.ts`
  - `GET`: Obtiene todos los clientes desde Strapi (WO-Clientes)
  - `POST`: Crea nuevo cliente en Strapi y sincroniza con WordPress

- `frontend-ubold/src/app/api/tienda/clientes/[id]/route.ts`
  - `GET`: Obtiene un cliente específico por ID
  - `PUT`: Actualiza cliente en Strapi y sincroniza con WordPress

### Utilidades

#### Nuevos Archivos
- `frontend-ubold/src/lib/utils/rut.ts`
  - Funciones para validación y formato de RUT chileno
  - `validarRUTChileno()`: Valida el dígito verificador
  - `formatearRUT()`: Formatea RUT a estándar chileno
  - `limpiarRUT()`: Limpia RUT (solo dígitos y K)

- `frontend-ubold/src/lib/clientes/utils.ts`
  - `parseNombreCompleto()`: Parsea nombre completo en nombres y apellidos
  - `buscarClientePorEmail()`: Busca cliente en WooCommerce por email
  - `createOrUpdateClienteEnWooCommerce()`: Crea o actualiza cliente en WooCommerce
  - `enviarClienteABothWordPress()`: Envía cliente a ambos WordPress (Moraleja y Escolar)

---

## 🔧 Dependencias y Configuraciones

### Variables de Entorno Requeridas

#### Strapi
```env
# URL de Strapi (puede ser pública)
NEXT_PUBLIC_STRAPI_URL=https://strapi.moraleja.cl

# Token de API de Strapi (SOLO servidor, NUNCA cliente)
STRAPI_API_TOKEN=tu_token_de_strapi
```

#### WooCommerce - Escolar
```env
# URL de WooCommerce Escolar
NEXT_PUBLIC_WOOCOMMERCE_URL_ESCOLAR=https://escolar.cl
# O usar la variable genérica (fallback)
NEXT_PUBLIC_WOOCOMMERCE_URL=https://escolar.cl

# Credenciales de API (SOLO servidor)
WOO_ESCOLAR_CONSUMER_KEY=ck_xxxxxxxxxxxxx
WOO_ESCOLAR_CONSUMER_SECRET=cs_xxxxxxxxxxxxx
# O usar las variables genéricas (fallback)
WOOCOMMERCE_CONSUMER_KEY=ck_xxxxxxxxxxxxx
WOOCOMMERCE_CONSUMER_SECRET=cs_xxxxxxxxxxxxx
```

#### WooCommerce - Moraleja
```env
# URL de WooCommerce Moraleja
NEXT_PUBLIC_WOOCOMMERCE_URL_MORALEJA=https://moraleja.cl

# Credenciales de API (SOLO servidor)
WOO_MORALEJA_CONSUMER_KEY=ck_xxxxxxxxxxxxx
WOO_MORALEJA_CONSUMER_SECRET=cs_xxxxxxxxxxxxx
```

### Content Types de Strapi

El sistema requiere los siguientes Content Types en Strapi:

#### 1. `Persona`
Campos requeridos:
- `nombres` (Text, required)
- `primer_apellido` (Text, optional)
- `segundo_apellido` (Text, optional)
- `genero` (Enumeration: Masculino, Femenino)
- `rut` (Text, unique, optional)
- `nombre_completo` (Text, computed/required)
- `emails` (Component, repeatable):
  - `email` (Email, required)
  - `tipo` (Enumeration: Personal, Laboral, Institucional)
- `telefonos` (Component, repeatable):
  - `telefono_raw` (Text, required)
  - `telefono_norm` (Text, optional)
  - `tipo` (Enumeration: Personal, Laboral, Institucional, nullable)
  - `principal` (Boolean)
  - `status` (Enumeration, optional)

#### 2. `WO-Clientes`
Campos requeridos:
- `nombre` (Text, required)
- `correo_electronico` (Email, required)
- `persona` (Relation, Many-to-One con `Persona`, required)
- `originPlatform` (Enumeration: woo_escolar, woo_moraleja, required)
- `pedidos` (Number, default: 0)
- `gasto_total` (Number, default: 0)
- `fecha_registro` (DateTime)

---

## 🔀 Instrucciones de Integración

### Paso 1: Preparación

1. **Crear backup de la rama destino**
   ```bash
   git checkout rama-destino
   git pull origin rama-destino
   git checkout -b backup-rama-destino
   git push origin backup-rama-destino
   git checkout rama-destino
   ```

2. **Verificar que la rama origen esté actualizada**
   ```bash
   git checkout rama-origen  # Ej: rama-Gonza2-clean
   git pull origin rama-origen
   ```

### Paso 2: Merge desde la rama origen

```bash
git checkout rama-destino
git merge rama-origen --no-ff -m "Merge: Integración CRUD Clientes completo"
```

### Paso 3: Resolución de Conflictos Comunes

#### 3.1 Conflictos en archivos de configuración

**Si hay conflictos en `package.json`:**
- Aceptar cambios de ambas ramas si son complementarios
- Si hay versiones diferentes, usar la más reciente

**Si hay conflictos en variables de entorno:**
- Combinar todas las variables necesarias
- Verificar que no falte ninguna variable requerida (ver sección de Variables de Entorno)

#### 3.2 Conflictos en componentes compartidos

**Si `CustomersCard.tsx` tiene conflictos:**
- La versión de la rama origen usa `AddClienteForm` y `EditClienteModal`
- Aceptar los cambios de la rama origen para estos imports y modales
- Si hay cambios específicos en la rama destino que deben mantenerse, combinarlos manualmente

**Si hay conflictos en rutas API:**
- Verificar que no exista una ruta `/api/tienda/clientes` en la rama destino
- Si existe, reemplazarla completamente con la versión de la rama origen
- Verificar que no haya conflictos con otras rutas API

#### 3.3 Conflictos en tipos TypeScript

**Si hay conflictos en tipos de clientes:**
- Verificar que las interfaces sean compatibles
- Combinar campos si ambos son necesarios
- Priorizar la estructura de la rama origen para mantener consistencia

### Paso 4: Verificar Archivos Necesarios

Asegúrate de que existan los siguientes archivos después del merge:

```bash
# Utilidades
frontend-ubold/src/lib/utils/rut.ts
frontend-ubold/src/lib/clientes/utils.ts

# Componentes
frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/clientes/components/AddClienteForm.tsx
frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/clientes/components/EditClienteModal.tsx
frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/clientes/components/PlatformSelector.tsx
frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/clientes/components/ClientsListing.tsx

# API Routes
frontend-ubold/src/app/api/tienda/clientes/route.ts
frontend-ubold/src/app/api/tienda/clientes/[id]/route.ts

# Páginas
frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/clientes/page.tsx
frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/clientes/agregar/page.tsx
```

### Paso 5: Configurar Variables de Entorno

1. **En el servidor (Railway/Vercel/etc):**
   - Agregar todas las variables de entorno listadas en la sección "Dependencias y Configuraciones"
   - Verificar que `STRAPI_API_TOKEN` esté configurado
   - Verificar que las credenciales de WooCommerce estén configuradas para ambas plataformas

2. **Localmente (`.env.local`):**
   ```env
   # Strapi
   NEXT_PUBLIC_STRAPI_URL=https://strapi.moraleja.cl
   STRAPI_API_TOKEN=tu_token_local

   # WooCommerce Escolar
   NEXT_PUBLIC_WOOCOMMERCE_URL_ESCOLAR=https://escolar.cl
   WOO_ESCOLAR_CONSUMER_KEY=ck_xxxxx
   WOO_ESCOLAR_CONSUMER_SECRET=cs_xxxxx

   # WooCommerce Moraleja
   NEXT_PUBLIC_WOOCOMMERCE_URL_MORALEJA=https://moraleja.cl
   WOO_MORALEJA_CONSUMER_KEY=ck_xxxxx
   WOO_MORALEJA_CONSUMER_SECRET=cs_xxxxx
   ```

### Paso 6: Verificar Content Types en Strapi

1. Acceder a Strapi Admin
2. Verificar que existan los Content Types `Persona` y `WO-Clientes`
3. Verificar que los campos estén configurados según la especificación
4. Si faltan campos, agregarlos antes de probar la funcionalidad

### Paso 7: Instalar Dependencias y Compilar

```bash
cd frontend-ubold
npm install
npm run build
```

Si hay errores de compilación:
- Verificar que todos los imports sean correctos
- Verificar que no falten dependencias en `package.json`
- Revisar errores de TypeScript y corregirlos

### Paso 8: Pruebas

#### 8.1 Prueba de Creación de Clientes

1. Navegar a `/clientes/agregar` o usar el botón "Agregar Cliente"
2. Completar el formulario:
   - RUT (opcional, pero si se ingresa, debe ser válido)
   - Nombres
   - Apellidos
   - Email (obligatorio)
   - Teléfono (opcional)
   - Género
   - Seleccionar plataforma(s)
3. Hacer clic en "Guardar"
4. Verificar en Strapi:
   - Se creó una entrada en `Persona`
   - Se crearon entradas en `WO-Clientes` (una por plataforma seleccionada)
5. Verificar en WordPress/WooCommerce:
   - El cliente aparece en las tiendas seleccionadas

#### 8.2 Prueba de Edición de Clientes

1. Navegar a `/clientes`
2. Hacer clic en el botón "Editar" de un cliente
3. Modificar algunos campos
4. Guardar cambios
5. Verificar que:
   - Los cambios se reflejan en Strapi (`Persona`)
   - Los cambios se sincronizan en WordPress/WooCommerce

#### 8.3 Prueba de Validación de RUT

1. Intentar crear un cliente con RUT inválido
2. Debe mostrar un error de validación
3. Intentar crear un cliente con RUT duplicado
4. Debe mostrar error de RUT ya existente

#### 8.4 Prueba de Búsqueda por RUT

1. Crear un cliente con RUT
2. Intentar editar usando el botón "Buscar por RUT"
3. Ingresar el RUT
4. Verificar que se carga correctamente el cliente

---

## ⚠️ Problemas Comunes y Soluciones

### Error: "STRAPI_API_TOKEN no está configurado"

**Causa:** Variable de entorno faltante

**Solución:**
- Verificar que `STRAPI_API_TOKEN` esté configurada en las variables de entorno
- Reiniciar el servidor después de agregar la variable

### Error: "Invalid key" al crear/editar cliente

**Causa:** El Content Type en Strapi no tiene los campos esperados o tienen nombres diferentes

**Solución:**
- Verificar la estructura del Content Type en Strapi
- Asegurarse de que los campos coincidan con la especificación
- Revisar logs del servidor para identificar qué campo está causando el error

### Error: "RUT ya existe" al crear cliente nuevo

**Causa:** El RUT ingresado ya está registrado en Strapi

**Solución:**
- Verificar si realmente es un cliente nuevo o uno existente
- Si es existente, usar la función de edición en lugar de crear
- Si debe ser un cliente nuevo con RUT diferente, verificar que no haya un error de duplicado real

### Error: "Cliente no encontrado" al editar

**Causa:** El `documentId` o `id` no coincide con ningún registro

**Solución:**
- Verificar que el cliente exista en Strapi
- Revisar los logs del servidor para ver qué ID se está buscando
- Verificar que el `personaDocumentId` se esté enviando correctamente desde el frontend

### Error: Cliente no se sincroniza con WordPress

**Causa:** Credenciales de WooCommerce incorrectas o faltantes

**Solución:**
- Verificar que las variables de entorno de WooCommerce estén configuradas
- Verificar que las credenciales sean correctas
- Revisar logs del servidor para ver errores específicos de la API de WooCommerce

### Error de TypeScript: "Type 'X' is not assignable to type 'Y'"

**Causa:** Incompatibilidad de tipos entre ramas

**Solución:**
- Revisar las interfaces y tipos definidos
- Ajustar los tipos para que sean compatibles
- Verificar que los imports sean correctos

---

## 🔍 Verificación Post-Merge

### Checklist de Verificación

- [ ] Todas las variables de entorno están configuradas
- [ ] El build se completa sin errores (`npm run build`)
- [ ] Los Content Types en Strapi tienen todos los campos necesarios
- [ ] Se puede crear un cliente exitosamente
- [ ] Se puede editar un cliente existente
- [ ] La validación de RUT funciona correctamente
- [ ] Los clientes se sincronizan con WordPress/WooCommerce
- [ ] El listado de clientes muestra datos correctamente
- [ ] No hay errores en la consola del navegador
- [ ] No hay errores en los logs del servidor

### Comandos de Verificación

```bash
# Verificar que el build funciona
npm run build

# Verificar tipos de TypeScript
npx tsc --noEmit

# Ejecutar en desarrollo y probar manualmente
npm run dev
```

---

## 📝 Notas Adicionales

### Orden de Creación

**Importante:** El orden de creación es crítico:
1. Primero se crea `Persona` en Strapi
2. Luego se envía a WordPress/WooCommerce
3. Finalmente se crean las entradas `WO-Clientes` (una por plataforma)

Esto es necesario porque `WO-Clientes` requiere una relación con `Persona`, y WordPress puede devolver el `woocommerce_id` que se puede usar en el futuro.

### Uso de documentId vs id

Strapi v4 usa `documentId` (string) para relaciones en lugar de `id` (number). El código está diseñado para usar `documentId` cuando está disponible, con fallback a `id` para compatibilidad.

### Múltiples Emails y Teléfonos

El sistema soporta múltiples emails y teléfonos por cliente. En el formulario de creación/edición, se pueden agregar múltiples entradas. Cada email/teléfono tiene un tipo (Personal, Laboral, Institucional).

### Sincronización con WordPress

Cuando se edita un cliente, los cambios se sincronizan con **ambas** plataformas WordPress (Moraleja y Escolar), independientemente de en cuál fue creado originalmente. Esto asegura consistencia entre sistemas.

---

## 📚 Referencias

- [Documentación de Strapi v4](https://docs.strapi.io/dev-docs/api/rest)
- [WooCommerce REST API Documentation](https://woocommerce.github.io/woocommerce-rest-api-docs/)
- Archivo de configuración de WooCommerce: `frontend-ubold/src/lib/woocommerce/config.ts`
- Cliente de Strapi: `frontend-ubold/src/lib/strapi/client.ts`

---

## 🤝 Soporte

Si encuentras problemas durante la integración:

1. Revisa los logs del servidor para identificar el error específico
2. Verifica que todas las variables de entorno estén configuradas
3. Confirma que los Content Types en Strapi estén correctamente configurados
4. Revisa este documento para soluciones a problemas comunes
5. Si el problema persiste, contacta al equipo de desarrollo con:
   - Mensaje de error completo
   - Pasos para reproducir
   - Logs relevantes del servidor

