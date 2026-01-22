# 📋 Schema de Strapi: Sistema de Compras y Proveedores

**Fecha:** Enero 2026  
**Propósito:** Documentación completa del sistema de gestión de compras y proveedores  
**Versión:** 1.0

---

## 🏗️ Arquitectura General

El sistema de compras y proveedores sigue este flujo:

```
Empresa (Proveedor) 
  └── Contactos (Many-to-One)
  └── RFQ (Solicitud de Cotización) (Many-to-Many)
      └── Cotización Recibida (Many-to-One)
          └── Orden de Compra (Many-to-One)
              └── Factura (Media)
              └── Orden de Despacho (Media)
```

---

## 📊 Content Types

### 1. `empresa` (Ya existe - Reutilizar)

El content-type `empresa` ya existe y tiene:
- Datos de facturación (`datos_facturacion`)
- Contactos relacionados (`empresa-contactos`)
- Emails y teléfonos

**Nota:** Reutilizamos este content-type existente.

---

### 2. `empresa-contacto` / `empresa-contactos` (Ya existe - Reutilizar)

Content-type intermedio que relaciona Personas con Empresas.

**Campos:**
- `persona` (Relation, manyToOne → `persona`)
- `empresa` (Relation, manyToOne → `empresa`)
- `cargo` (Text, opcional)

**Nota:** Ya está implementado.

---

### 3. `rfq` / `rfqs` (NUEVO - Solicitud de Cotización)

**Nombre Singular:** `rfq`  
**Nombre Plural:** `rfqs`  
**Display Name:** `Solicitud de Cotización`  
**Tipo:** Collection Type

#### Campos Principales

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `numero_rfq` | Text (Short text) | ✅ Sí | Número único de RFQ (ej: RFQ-2026-001) |
| `nombre` | Text (Short text) | ✅ Sí | Nombre o título de la solicitud |
| `descripcion` | Text (Long text) | ❌ No | Descripción detallada |
| `fecha_solicitud` | Date | ✅ Sí | Fecha de creación de la solicitud |
| `fecha_vencimiento` | Date | ❌ No | Fecha límite para recibir cotizaciones |
| `estado` | Enumeration | ✅ Sí | Estado: `draft`, `sent`, `received`, `converted`, `cancelled` |
| `token_acceso` | Text (Short text, Unique) | ❌ No | Token único para acceso público |
| `notas_internas` | Text (Long text) | ❌ No | Notas internas (no visibles para proveedores) |
| `moneda` | Enumeration | ❌ No | Moneda: `CLP`, `USD`, `EUR` (default: `CLP`) |
| `activo` | Boolean | ❌ No | Si está activa (default: `true`) |

#### Relaciones

| Campo | Tipo | Content Type Destino | Descripción |
|-------|------|---------------------|-------------|
| `empresas` | Relation (Many-to-Many) | `empresa` | Empresas/proveedores a los que se envía |
| `productos` | Relation (Many-to-Many) | `libro` (o producto) | Productos solicitados |
| `creado_por` | Relation (Many-to-One) | `colaborador` | Colaborador que creó la RFQ |
| `cotizaciones_recibidas` | Relation (One-to-Many) | `cotizacion-recibida` | Cotizaciones recibidas de proveedores |

#### Enumeration: `estado`

```
draft        - Borrador
sent         - Enviada a proveedores
received     - Se recibió al menos una cotización
converted    - Convertida a Orden de Compra
cancelled    - Cancelada
```

#### Enumeration: `moneda`

```
CLP
USD
EUR
```

---

### 4. `cotizacion-recibida` / `cotizaciones-recibidas` (NUEVO)

**Nombre Singular:** `cotizacion-recibida`  
**Nombre Plural:** `cotizaciones-recibidas`  
**Display Name:** `Cotización Recibida`  
**Tipo:** Collection Type

#### Campos Principales

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `numero_cotizacion` | Text (Short text) | ❌ No | Número de cotización del proveedor |
| `fecha_recepcion` | Date | ✅ Sí | Fecha en que se recibió |
| `fecha_validez` | Date | ❌ No | Fecha hasta la cual es válida |
| `precio_unitario` | Number (Decimal) | ❌ No | Precio unitario (si aplica) |
| `precio_total` | Number (Decimal) | ✅ Sí | Precio total de la cotización |
| `moneda` | Enumeration | ❌ No | Moneda: `CLP`, `USD`, `EUR` (default: `CLP`) |
| `notas` | Text (Long text) | ❌ No | Notas del proveedor |
| `estado` | Enumeration | ✅ Sí | Estado: `pendiente`, `aprobada`, `rechazada`, `convertida` |
| `archivo_pdf` | Media (Single) | ❌ No | PDF de la cotización subida por el proveedor |
| `activo` | Boolean | ❌ No | Si está activa (default: `true`) |

#### Relaciones

| Campo | Tipo | Content Type Destino | Descripción |
|-------|------|---------------------|-------------|
| `rfq` | Relation (Many-to-One) | `rfq` | RFQ a la que responde |
| `empresa` | Relation (Many-to-One) | `empresa` | Empresa que envió la cotización |
| `contacto_responsable` | Relation (Many-to-One) | `persona` | Contacto que respondió |
| `orden_compra` | Relation (One-to-One) | `orden-compra` | Orden de compra generada (si se aprobó) |

#### Enumeration: `estado`

```
pendiente    - Pendiente de revisión
aprobada     - Aprobada para generar PO
rechazada    - Rechazada
convertida   - Convertida a Orden de Compra
```

---

### 5. `orden-compra` / `ordenes-compra` (NUEVO)

**Nombre Singular:** `orden-compra`  
**Nombre Plural:** `ordenes-compra`  
**Display Name:** `Orden de Compra`  
**Tipo:** Collection Type

#### Campos Principales

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `numero_po` | Text (Short text) | ✅ Sí | Número único de PO (ej: PO-2026-001) |
| `fecha_emision` | Date | ✅ Sí | Fecha de emisión |
| `fecha_entrega_estimada` | Date | ❌ No | Fecha estimada de entrega |
| `monto_total` | Number (Decimal) | ✅ Sí | Monto total de la orden |
| `moneda` | Enumeration | ❌ No | Moneda: `CLP`, `USD`, `EUR` (default: `CLP`) |
| `estado` | Enumeration | ✅ Sí | Estado: `emitida`, `confirmada`, `en_proceso`, `despachada`, `recibida`, `facturada`, `cancelada` |
| `notas` | Text (Long text) | ❌ No | Notas adicionales |
| `direccion_facturacion` | JSON | ❌ No | Dirección de facturación (estructura completa) |
| `direccion_despacho` | JSON | ❌ No | Dirección de despacho (estructura completa) |
| `activo` | Boolean | ❌ No | Si está activa (default: `true`) |

#### Relaciones

| Campo | Tipo | Content Type Destino | Descripción |
|-------|------|---------------------|-------------|
| `cotizacion_recibida` | Relation (One-to-One) | `cotizacion-recibida` | Cotización que originó esta PO |
| `empresa` | Relation (Many-to-One) | `empresa` | Empresa/proveedor |
| `creado_por` | Relation (Many-to-One) | `colaborador` | Colaborador que creó la PO |
| `factura` | Media (Single) | - | Factura recibida del proveedor |
| `orden_despacho` | Media (Single) | - | Orden de despacho recibida |

#### Enumeration: `estado`

```
emitida      - Emitida (enviada al proveedor)
confirmada   - Confirmada por el proveedor
en_proceso   - En proceso de preparación
despachada   - Despachada
recibida     - Recibida
facturada    - Facturada
cancelada    - Cancelada
```

---

## 🔄 Flujo de Trabajo

### 1. Crear RFQ (Solicitud de Cotización)

1. Usuario crea RFQ desde la intranet
2. Selecciona empresas/proveedores (Many-to-Many)
3. Selecciona productos (Many-to-Many)
4. Estado inicial: `draft`
5. Al enviar, se genera token único y estado cambia a `sent`
6. Se envía email a cada empresa con enlace: `https://intranet.com/quote-reply/[TOKEN]`

### 2. Proveedor Responde

1. Proveedor recibe email con enlace
2. Accede a página pública: `/quote-reply/[TOKEN]`
3. Puede:
   - Llenar formulario con precios y notas
   - Subir PDF de cotización
4. Al enviar, se crea registro en `cotizacion-recibida`
5. Estado de RFQ cambia a `received` (si es la primera)

### 3. Revisar y Aprobar Cotización

1. Usuario revisa cotizaciones recibidas desde la intranet
2. Puede aprobar o rechazar cada cotización
3. Al aprobar, estado cambia a `aprobada`

### 4. Generar Orden de Compra

1. Usuario selecciona cotización aprobada
2. Click en "Generar Orden de Compra"
3. Se crea registro en `orden-compra`:
   - Relación con `cotizacion-recibida`
   - Copia datos de facturación de la empresa
   - Genera número único de PO
4. Estado inicial: `emitida`
5. Se envía email al proveedor con detalles de la PO
6. Estado de cotización cambia a `convertida`
7. Estado de RFQ cambia a `converted`

### 5. Recibir Factura y Orden de Despacho

1. Proveedor envía factura y orden de despacho
2. Usuario sube archivos desde la intranet:
   - `factura` (Media)
   - `orden_despacho` (Media)
3. Estado de PO cambia según corresponda

---

## 📡 Endpoints API Necesarios

### Next.js API Routes

```
POST   /api/compras/rfqs                    # Crear RFQ
GET    /api/compras/rfqs                    # Listar RFQs
GET    /api/compras/rfqs/[id]               # Obtener RFQ
PUT    /api/compras/rfqs/[id]               # Actualizar RFQ
POST   /api/compras/rfqs/[id]/enviar        # Enviar RFQ a proveedores

GET    /api/compras/cotizaciones-recibidas  # Listar cotizaciones
GET    /api/compras/cotizaciones-recibidas/[id]  # Obtener cotización
PUT    /api/compras/cotizaciones-recibidas/[id]/aprobar  # Aprobar cotización
PUT    /api/compras/cotizaciones-recibidas/[id]/rechazar # Rechazar cotización

POST   /api/compras/ordenes-compra          # Crear PO desde cotización
GET    /api/compras/ordenes-compra          # Listar POs
GET    /api/compras/ordenes-compra/[id]     # Obtener PO
PUT    /api/compras/ordenes-compra/[id]     # Actualizar PO (subir factura/despacho)

# Endpoints Públicos (sin autenticación)
POST   /api/public/quote-reply/[token]      # Recibir respuesta de proveedor
GET    /api/public/quote-reply/[token]      # Obtener datos de RFQ para formulario
```

### Páginas Públicas

```
/quote-reply/[token]                        # Formulario público para responder RFQ
```

---

## 🔐 Permisos en Strapi

### RFQ (`rfqs`)

**Authenticated:**
- ✅ `find`
- ✅ `findOne`
- ✅ `create`
- ✅ `update`
- ✅ `delete`

**Public:** (Solo para consulta de RFQ por token)
- ✅ `findOne` (con filtro por token)

### Cotización Recibida (`cotizaciones-recibidas`)

**Authenticated:**
- ✅ `find`
- ✅ `findOne`
- ✅ `create`
- ✅ `update`
- ✅ `delete`

**Public:** (Solo para crear desde formulario público)
- ✅ `create` (con validación de token)

### Orden de Compra (`ordenes-compra`)

**Authenticated:**
- ✅ `find`
- ✅ `findOne`
- ✅ `create`
- ✅ `update`
- ✅ `delete`

**Public:** ❌ Sin acceso

---

## 📝 Ejemplos de Payload

### Crear RFQ

```json
{
  "data": {
    "nombre": "RFQ - Libros Educativos Q1 2026",
    "descripcion": "Solicitud de cotización para libros de educación básica",
    "fecha_solicitud": "2026-01-15",
    "fecha_vencimiento": "2026-02-15",
    "estado": "draft",
    "moneda": "CLP",
    "empresas": { "connect": [1, 2, 3] },
    "productos": { "connect": [10, 11, 12] },
    "creado_por": { "connect": [5] }
  }
}
```

### Crear Cotización Recibida (desde formulario público)

```json
{
  "data": {
    "rfq": { "connect": [1] },
    "empresa": { "connect": [2] },
    "fecha_recepcion": "2026-01-20",
    "precio_total": 1500000.00,
    "moneda": "CLP",
    "notas": "Precio incluye IVA y envío",
    "estado": "pendiente"
  }
}
```

### Crear Orden de Compra

```json
{
  "data": {
    "numero_po": "PO-2026-001",
    "fecha_emision": "2026-01-25",
    "monto_total": 1500000.00,
    "moneda": "CLP",
    "estado": "emitida",
    "cotizacion_recibida": { "connect": [1] },
    "empresa": { "connect": [2] },
    "creado_por": { "connect": [5] }
  }
}
```

---

## 🔧 Configuración de Strapi Hooks (Opcional)

Si quieres usar hooks de Strapi para envío automático de emails:

```javascript
// src/api/rfq/content-types/rfq/lifecycles.js
module.exports = {
  async afterCreate(event) {
    const { result } = event
    // Llamar a servicio de email si estado es 'sent'
    if (result.estado === 'sent') {
      // Enviar emails a empresas
    }
  },
}
```

**Nota:** En este proyecto, manejamos los emails desde Next.js para mayor control.

---

## ✅ Checklist de Implementación

- [ ] Crear content-type `rfq` en Strapi
- [ ] Crear content-type `cotizacion-recibida` en Strapi
- [ ] Crear content-type `orden-compra` en Strapi
- [ ] Configurar permisos en Strapi
- [ ] Implementar servicios de email (SendGrid)
- [ ] Crear endpoints API en Next.js
- [ ] Crear página pública `/quote-reply/[token]`
- [ ] Crear interfaces de administración
- [ ] Implementar generación de números únicos (RFQ-XXX, PO-XXX)
- [ ] Implementar validaciones de estado
- [ ] Testing completo del flujo

---

## 💡 Sugerencias de Mejora

1. **Historial de Cambios:** Agregar campo `historial` (JSON) para trackear cambios de estado
2. **Notificaciones:** Sistema de notificaciones cuando se recibe cotización
3. **Comparación de Cotizaciones:** Vista para comparar múltiples cotizaciones de una RFQ
4. **Plantillas de RFQ:** Guardar RFQs como plantillas reutilizables
5. **Integración con Facturación:** Conectar con sistema de facturación electrónica (Haulmer)
6. **Dashboard:** Vista de resumen con métricas de compras


