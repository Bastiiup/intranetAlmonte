# Schema de Cotizaciones en Strapi

Este documento describe el esquema del Content Type `cotizaciones` en Strapi para el módulo de CRM.

## Content Type: `cotizacion` (singular: cotizacion, plural: cotizaciones)

### Campos Principales

| Campo | Tipo | Descripción | Requerido |
|-------|------|-------------|-----------|
| `nombre` | Text (Short text) | Nombre o título de la cotización | ✅ Sí |
| `descripcion` | Text (Long text) | Descripción detallada de la cotización | ❌ No |
| `monto` | Number (Decimal) | Monto total de la cotización | ❌ No |
| `moneda` | Enumeration | Moneda: `CLP`, `USD`, `EUR` | ❌ No (default: `CLP`) |
| `estado` | Enumeration | Estado de la cotización: `Borrador`, `Enviada`, `Aprobada`, `Rechazada`, `Vencida` | ❌ No (default: `Borrador`) |
| `fecha_envio` | Date | Fecha en que se envió la cotización | ❌ No |
| `fecha_vencimiento` | Date | Fecha de vencimiento de la cotización | ❌ No |
| `notas` | Text (Long text) | Notas o comentarios adicionales | ❌ No |
| `activo` | Boolean | Si la cotización está activa | ❌ No (default: `true`) |
| `token_acceso` | Text (Short text) | Token único para acceso público a la cotización | ❌ No |
| `respuestas_empresas` | JSON | Array de respuestas de empresas con sus valores estimados | ❌ No |

### Relaciones

#### 1. `empresas` - Many to Many
- **Tipo:** Relación Many-to-Many
- **Content Type relacionado:** `empresa`
- **Descripción:** Múltiples empresas pueden recibir la misma cotización
- **Campo en la otra entidad:** `cotizaciones` (opcional, para consulta inversa)

#### 2. `productos` - Many to Many
- **Tipo:** Relación Many-to-Many
- **Content Type relacionado:** `libro` (o el content type de productos/libros)
- **Descripción:** Múltiples productos/libros pueden estar incluidos en una cotización
- **Campo en la otra entidad:** `cotizaciones` (opcional, para consulta inversa)

#### 3. `creado_por` - Many to One
- **Tipo:** Relación Many-to-One
- **Content Type relacionado:** `colaborador`
- **Descripción:** Colaborador que creó la cotización
- **Campo en la otra entidad:** `cotizaciones_creadas` (opcional, one-to-many)

## Configuración en Strapi

### 1. Crear el Content Type

1. Ve a **Content-Type Builder** en el panel de administración de Strapi
2. Crea un nuevo Content Type llamado `cotizacion`
3. Agrega los campos según la tabla anterior
4. Configura las relaciones según las especificaciones

### 2. Configuración de Enumerations

#### `moneda`
```
CLP
USD
EUR
```

#### `estado`
```
Borrador
Enviada
Aprobada
Rechazada
Vencida
```

### 3. Permisos (Settings > Users & Permissions Plugin > Roles)

Configurar permisos para el rol `Authenticated`:
- **Cotizaciones:**
  - ✅ `find`
  - ✅ `findOne`
  - ✅ `create`
  - ✅ `update`
  - ✅ `delete`

## Ejemplo de Payload para Crear una Cotización

```json
{
  "data": {
    "nombre": "Cotización - Libros Educativos 2026",
    "descripcion": "Cotización de libros para educación básica y media",
    "monto": 1500000.00,
    "moneda": "CLP",
    "estado": "Enviada",
    "fecha_envio": "2026-01-15",
    "fecha_vencimiento": "2026-02-15",
    "notas": "Cotización válida por 30 días",
    "activo": true,
    "empresas": [1, 2, 3],  // IDs de empresas
    "productos": [10, 11, 12],  // IDs de productos/libros
    "creado_por": 5  // ID del colaborador
  }
}
```

## Endpoints de API

### GET `/api/cotizaciones`
Obtiene una lista paginada de cotizaciones.

**Query Parameters:**
- `pagination[page]`: Número de página (default: 1)
- `pagination[pageSize]`: Tamaño de página (default: 25)
- `filters[nombre][$containsi]`: Búsqueda por nombre
- `filters[estado][$eq]`: Filtro por estado
- `populate[empresas]`: Incluir empresas relacionadas
- `populate[productos]`: Incluir productos relacionados
- `populate[creado_por]`: Incluir información del creador
- `sort[0]`: Ordenamiento (ej: `createdAt:desc`)

### GET `/api/cotizaciones/:id`
Obtiene una cotización específica por ID.

### POST `/api/cotizaciones`
Crea una nueva cotización.

### PUT `/api/cotizaciones/:id`
Actualiza una cotización existente.

### DELETE `/api/cotizaciones/:id`
Elimina una cotización.

### POST `/api/crm/cotizaciones/:id/enviar-email`
Envía la cotización por correo electrónico a las empresas asociadas.

**Body:**
```json
{
  "empresaIds": [1, 2, 3]  // Opcional: IDs específicos de empresas. Si no se envía, se envía a todas.
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Correos enviados: 2 de 2",
  "resultados": [
    {
      "empresa": "Empresa A",
      "success": true
    },
    {
      "empresa": "Empresa B",
      "success": true
    }
  ],
  "token": "token_generado",
  "url": "https://app.com/cotizacion/token_generado"
}
```

### GET `/api/cotizacion/:token`
Obtiene una cotización por su token de acceso (público, sin autenticación).

### POST `/api/cotizacion/:token`
Permite a una empresa responder con su valor estimado (público, sin autenticación).

**Body:**
```json
{
  "valor_empresa": 1500000,
  "empresa_id": 1,
  "notas": "Comentarios adicionales"
}
```

## Uso en el Frontend

El módulo de cotizaciones permite:
1. **Crear cotizaciones** que pueden ser enviadas a múltiples empresas
2. **Asociar múltiples productos/libros** a una cotización
3. **Gestionar estados** (Borrador, Enviada, Aprobada, Rechazada, Vencida)
4. **Rastrear fechas** de envío y vencimiento
5. **Ver historial** de cotizaciones por empresa o producto

## Campos Adicionales para Envío por Email

### `token_acceso`
- **Tipo:** Text (Short text)
- **Descripción:** Token único generado automáticamente cuando se envía la cotización por email
- **Uso:** Permite acceso público a la cotización sin autenticación mediante la URL `/cotizacion/[token]`
- **Generación:** Se genera automáticamente al enviar la cotización por email

### `respuestas_empresas`
- **Tipo:** JSON (o Component repetible)
- **Descripción:** Array de respuestas de empresas con sus valores estimados
- **Estructura:**
```json
[
  {
    "empresa_id": 1,
    "valor_empresa": 1500000,
    "notas": "Comentarios de la empresa",
    "fecha_respuesta": "2026-01-20T10:30:00.000Z"
  }
]
```

## Integración con SendGrid

El sistema utiliza SendGrid para enviar correos electrónicos a las empresas. 

### Variables de Entorno Requeridas

```env
SENDGRID_API_KEY=tu_api_key_de_sendgrid
SENDGRID_FROM_EMAIL=noreply@tudominio.cl  # Opcional, default: noreply@moraleja.cl
```

### Flujo de Envío

1. **Crear cotización** en el CRM
2. **Asociar empresas** a la cotización
3. **Enviar por email** usando el endpoint `/api/crm/cotizaciones/[id]/enviar-email`
4. **Empresas reciben email** con enlace único
5. **Empresas acceden** a `/cotizacion/[token]` para ver y responder
6. **Empresas proporcionan** su valor estimado
7. **Respuestas se guardan** en `respuestas_empresas`

## Página Pública

Las empresas pueden acceder a la cotización mediante:
- **URL:** `/cotizacion/[token]`
- **Acceso:** Público, sin autenticación requerida
- **Funcionalidades:**
  - Ver detalles de la cotización
  - Ver productos incluidos
  - Proporcionar valor estimado
  - Agregar notas o comentarios

## Comportamiento del GET cuando Strapi falla

Si el content type `cotizaciones` **no existe** en Strapi, o Strapi devuelve **404/500** (por relaciones inexistentes, permisos, etc.):

- La API `/api/crm/cotizaciones` responde **200** con `{ success: true, data: [], meta: { pagination: { total: 0, ... } } }`.
- La página de Cotizaciones muestra la tabla vacía en lugar de un error 500.
- Se intenta primero la petición **con** `populate` (empresas, productos, creado_por). Si falla, se reintenta **sin** populate. Si también falla, se devuelve la respuesta vacía.

## Notas Importantes

- Una cotización puede estar asociada a **múltiples empresas**, lo que permite enviar la misma propuesta a varios clientes.
- Una cotización puede incluir **múltiples productos**, facilitando cotizaciones complejas.
- El campo `estado` permite hacer seguimiento del ciclo de vida de la cotización.
- El campo `activo` permite mantener un historial sin eliminar registros (soft delete).
- El **token de acceso** se genera automáticamente al enviar por email y permite acceso público seguro.
- Las **respuestas de empresas** se almacenan en formato JSON, permitiendo múltiples respuestas por cotización.

