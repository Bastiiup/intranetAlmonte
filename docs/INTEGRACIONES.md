# Integraciones

Este documento describe todas las integraciones del proyecto: Strapi, WooCommerce, Shipit, Stream Chat, POS y gestión de clientes.

## 📋 Tabla de Contenidos

- [Strapi CMS](#strapi-cms)
- [WooCommerce](#woocommerce)
- [Shipit](#shipit)
- [Stream Chat](#stream-chat)
- [Sistema POS](#sistema-pos)
- [Gestión de Clientes](#gestión-de-clientes)
- [Haulmer (Facturación)](#haulmer-facturación)

---

## Strapi CMS

### Descripción

Strapi es el CMS headless utilizado como backend principal. Almacena productos, pedidos, clientes y colaboradores.

### URLs

- **Admin Panel:** https://strapi.moraleja.cl/admin
- **API Base:** https://strapi.moraleja.cl/api

### Content Types Principales

- `libros` - Productos/libros
- `wo-pedidos` - Pedidos de WooCommerce
- `wo-clientes` - Clientes de WooCommerce
- `persona` - Personas/Colaboradores
- `Intranet-colaboradores` - Colaboradores internos

### Cliente Strapi

**Ubicación:** `src/lib/strapi/client.ts`

**Características:**
- Timeout de 30 segundos
- Retry logic con backoff exponencial
- Logs detallados en desarrollo
- Manejo robusto de errores

**Ejemplo de uso:**
```typescript
import strapiClient from '@/lib/strapi/client'

// Obtener productos
const productos = await strapiClient.get('/api/libros?populate=*')

// Crear registro
await strapiClient.post('/api/libros', { data: { nombre_libro: 'Nuevo' } })

// Actualizar
await strapiClient.put(`/api/libros/${id}`, { data: { nombre_libro: 'Actualizado' } })

// Eliminar
await strapiClient.delete(`/api/libros/${id}`)
```

### Variables de Entorno

```env
NEXT_PUBLIC_STRAPI_URL=https://strapi.moraleja.cl
STRAPI_API_TOKEN=tu_token_aqui
```

Ver [docs/CONFIGURACION.md](CONFIGURACION.md) para más detalles.

---

## WooCommerce

### Descripción

Integración con dos tiendas WooCommerce:
- **Moraleja**: https://moraleja.cl
- **Escolar**: https://escolar.moraleja.cl

### Funcionalidades

- Sincronización de productos
- Gestión de pedidos
- Gestión de clientes
- Sincronización de stock
- Integración con POS

### API Endpoints

**Cliente WooCommerce:** `src/lib/woocommerce/client.ts`

**Endpoints disponibles:**
- `/api/woocommerce/products` - Productos
- `/api/woocommerce/orders` - Pedidos
- `/api/woocommerce/customers` - Clientes

### Variables de Entorno

**Moraleja:**
```env
NEXT_PUBLIC_WOOCOMMERCE_URL_MORALEJA=https://moraleja.cl
WOO_MORALEJA_CONSUMER_KEY=ck_xxxxx
WOO_MORALEJA_CONSUMER_SECRET=cs_xxxxx
```

**Escolar:**
```env
NEXT_PUBLIC_WOOCOMMERCE_URL_ESCOLAR=https://escolar.moraleja.cl
WOO_ESCOLAR_CONSUMER_KEY=ck_xxxxx
WOO_ESCOLAR_CONSUMER_SECRET=cs_xxxxx
```

### Cómo Obtener Credenciales

1. Ve a WordPress Admin → WooCommerce → Configuración → Avanzado → REST API
2. Crea una nueva clave con permisos **Read/Write**
3. Copia el Consumer Key y Consumer Secret

⚠️ **Importante:** El Consumer Secret solo se muestra una vez.

---

## Shipit

### Descripción

Integración con Shipit para gestión de envíos y logística.

### Funcionalidades

- Creación de envíos desde pedidos
- Consulta de estado de envíos
- Webhooks para actualizaciones
- Verificación de cobertura
- Mapeo de comunas chilenas

### Estructura de Archivos

```
src/lib/shipit/
├── config.ts      # Configuración
├── client.ts      # Cliente HTTP
├── types.ts       # Tipos TypeScript
├── utils.ts       # Utilidades
└── communes.ts    # Mapeo de comunas
```

### API Endpoints

- `POST /api/shipit/shipments` - Crear envío
- `GET /api/shipit/shipments` - Listar envíos
- `GET /api/shipit/shipments/[id]` - Obtener envío
- `PUT /api/shipit/shipments/[id]` - Actualizar envío
- `GET /api/shipit/shipments/[id]/status` - Estado del envío
- `POST /api/shipit/webhooks` - Recibir webhooks
- `GET /api/shipit/coverage` - Verificar cobertura

### Variables de Entorno

```env
SHIPIT_API_TOKEN=tu_token_aqui
SHIPIT_API_EMAIL=tu_email@ejemplo.com  # REQUERIDO
SHIPIT_API_URL=https://api.shipit.cl/v4
NEXT_PUBLIC_SHIPIT_ENABLED=true
```

**Importante:** Shipit requiere tanto `SHIPIT_API_TOKEN` como `SHIPIT_API_EMAIL`.

### Autenticación

Headers requeridos:
- `X-Shipit-Email`: Email de cuenta
- `X-Shipit-Access-Token`: Token de acceso

---

## Stream Chat

### Descripción

Sistema de chat en tiempo real entre colaboradores usando Stream Chat.

### Funcionalidades

- Chat 1-a-1 entre colaboradores
- Mensajería en tiempo real
- Lista de contactos
- Historial de conversaciones

### Implementación

**Cliente Stream:** `src/lib/stream/client.ts`

**API Routes:**
- `POST /api/chat/stream-token` - Generar token de autenticación
- `POST /api/chat/stream-ensure-user` - Asegurar usuario en Stream

**Componente Principal:** `src/app/(admin)/(apps)/chat/page.tsx`

### Variables de Entorno

```env
STREAM_API_KEY=tu_api_key_aqui
STREAM_SECRET_KEY=tu_secret_key_aqui
NEXT_PUBLIC_STREAM_API_KEY=tu_api_key_aqui
```

### Flujo de Funcionamiento

1. Usuario se autentica en la app
2. Frontend llama a `/api/chat/stream-token` para obtener token
3. Frontend inicializa cliente Stream con API Key pública
4. Frontend se conecta usando el token
5. Se crea/obtiene canal 1-a-1 con otro usuario
6. Mensajes se envían/reciben en tiempo real

### Identificadores

El sistema usa **RUT de la persona** como identificador único en Stream Chat (no IDs numéricos) para evitar problemas de duplicados.

### Cómo Obtener Credenciales

1. Ve a [Stream Dashboard](https://dashboard.getstream.io/)
2. Crea una nueva app o selecciona una existente
3. Ve a **Chat → Overview**
4. Copia **API Key** y **API Secret**

---

## Sistema POS

### Descripción

Sistema Point of Sale (Punto de Venta) funcional integrado con WooCommerce.

### Funcionalidades

- ✅ Búsqueda de productos
- ✅ Carrito de compras
- ✅ Métodos de pago (efectivo, tarjeta, transferencia)
- ✅ Gestión de clientes
- ✅ Descuentos y cupones
- ✅ Impresión de tickets (HTML)
- ✅ Integración con WooCommerce
- ✅ Gestión de caja
- ✅ Descuento automático de inventario

### Ruta

**URL:** `/tienda/pos`

### Requisitos Mínimos

**Para empezar a vender hoy:**
- PC o Tablet con navegador
- Conexión a internet estable
- Productos cargados en WooCommerce
- Variables de entorno configuradas

**Opcional pero recomendado:**
- Impresora térmica
- Escáner de código de barras
- Cajón de dinero automático

### Flujo de Venta

1. Abrir POS en `/tienda/pos`
2. Buscar producto (por nombre o código de barras)
3. Agregar al carrito
4. (Opcional) Aplicar descuentos
5. (Opcional) Seleccionar cliente
6. Procesar pago
7. Imprimir ticket
8. Pedido se crea en WooCommerce automáticamente

### Hardware Recomendado

- **Tablet:** $150.000 - $300.000 CLP
- **Impresora térmica:** $80.000 - $150.000 CLP
- **Escáner código barras:** $30.000 - $80.000 CLP
- **Cajón automático:** $50.000 - $120.000 CLP

Ver `INICIO-RAPIDO-POS.md` en docs/archive/ para más detalles.

---

## Gestión de Clientes

### Descripción

CRUD completo de clientes con sincronización entre Strapi y WooCommerce.

### Funcionalidades

- Creación de clientes en Strapi y WooCommerce
- Edición de clientes con sincronización
- Validación de RUT chileno
- Múltiples emails y teléfonos por cliente
- Búsqueda por RUT
- Sincronización con ambas plataformas (Moraleja y Escolar)

### Flujo de Creación

```
Frontend (AddClienteForm)
    ↓
POST /api/tienda/clientes
    ↓
1. Validar RUT
2. Crear Persona en Strapi
3. Enviar a WordPress/WooCommerce
4. Crear WO-Clientes en Strapi (uno por plataforma)
```

### Flujo de Edición

```
Frontend (EditClienteModal)
    ↓
PUT /api/tienda/clientes/[id]
    ↓
1. Buscar Persona por documentId o RUT
2. Actualizar Persona en Strapi
3. Sincronizar con WordPress/WooCommerce (ambas plataformas)
```

### API Endpoints

- `GET /api/tienda/clientes` - Listar clientes
- `POST /api/tienda/clientes` - Crear cliente
- `GET /api/tienda/clientes/[id]` - Obtener cliente
- `PUT /api/tienda/clientes/[id]` - Actualizar cliente

### Content Types de Strapi

**Persona:**
- `nombres`, `primer_apellido`, `segundo_apellido`
- `genero`, `rut`
- `emails` (componente repetible)
- `telefonos` (componente repetible)

**WO-Clientes:**
- `nombre`, `correo_electronico`
- `persona` (relación con Persona)
- `originPlatform` (woo_escolar, woo_moraleja)
- `pedidos`, `gasto_total`

### Validación de RUT

Utilidades en `src/lib/utils/rut.ts`:
- `validarRUTChileno()` - Valida dígito verificador
- `formatearRUT()` - Formatea RUT a estándar chileno
- `limpiarRUT()` - Limpia RUT (solo dígitos y K)

---

## Haulmer (Facturación)

### Descripción

Integración con Haulmer/OpenFactura para facturación electrónica en Chile.

### Funcionalidades

- Emisión de documentos tributarios electrónicos
- Tipos de documentos: Factura, Boleta, Notas de Crédito/Débito
- Timbraje de folios
- Validación de datos del emisor

### Variables de Entorno

```env
HAULMER_API_KEY=tu_api_key_aqui
HAULMER_API_URL=https://dev-api.haulmer.com
HAULMER_EMISOR_RUT=12345678-9
HAULMER_EMISOR_RAZON_SOCIAL=Nombre Empresa
HAULMER_EMISOR_GIRO=Giro Comercial
HAULMER_EMISOR_DIRECCION=Dirección Completa
HAULMER_EMISOR_COMUNA=Comuna
```

### Tipos de Documentos

- **33**: Factura Electrónica
- **34**: Factura Exenta
- **39**: Boleta Electrónica (por defecto)
- **41**: Boleta Exenta
- **56**: Nota de Débito
- **61**: Nota de Crédito

### Timbraje de Folios

⚠️ **IMPORTANTE:** Antes de emitir facturas, necesitas folios timbrados:

1. Accede a https://espacio.haulmer.com/
2. Ve a **Documentos Electrónicos → General → Timbrar Folios**
3. Solicita folios del tipo de documento necesario
4. Espera autorización del SII

Sin folios timbrados, la emisión fallará.

---

## Referencias

- [Documentación Strapi](https://docs.strapi.io/)
- [WooCommerce REST API](https://woocommerce.github.io/woocommerce-rest-api-docs/)
- [Stream Chat Documentation](https://getstream.io/chat/docs/)
- [Shipit API Documentation](https://shipit.cl/)
- [Haulmer Documentation](https://help.haulmer.com/)

Para configuraciones específicas, ver [docs/CONFIGURACION.md](CONFIGURACION.md).

