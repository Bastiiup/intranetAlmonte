# 🛒 Guía de Implementación: Sistema de Compras y Proveedores

**Fecha:** Enero 2026  
**Versión:** 1.0

---

## 📋 Resumen

Este documento describe la implementación completa del sistema de gestión de compras y proveedores, incluyendo RFQ (Solicitud de Cotización), Cotizaciones Recibidas y Órdenes de Compra.

---

## ✅ Estado de Implementación

### Completado

- ✅ **Documentación de Schemas Strapi** (`docs/crm/STRAPI-SCHEMA-COMPRAS-PROVEEDORES.md`)
- ✅ **Servicios de Negocio:**
  - `src/lib/services/rfqService.ts` - Gestión de RFQ y envío de emails
  - `src/lib/services/ordenCompraService.ts` - Gestión de PO y aprobación de cotizaciones
- ✅ **Endpoints API:**
  - `/api/compras/rfqs` - CRUD de RFQs
  - `/api/compras/rfqs/[id]/enviar` - Enviar RFQ a proveedores
  - `/api/compras/cotizaciones-recibidas` - Listar cotizaciones recibidas
  - `/api/compras/cotizaciones-recibidas/[id]/aprobar` - Aprobar cotización
  - `/api/compras/cotizaciones-recibidas/[id]/rechazar` - Rechazar cotización
  - `/api/compras/ordenes-compra` - CRUD de POs
  - `/api/public/quote-reply/[token]` - Endpoint público para recibir respuestas
- ✅ **Página Pública:**
  - `/quote-reply/[token]` - Formulario para que proveedores respondan RFQ
- ✅ **Middleware actualizado** - Permite acceso público a `/quote-reply`

### Pendiente

- ⏳ **Interfaces de Administración:**
  - Página de listado de RFQs
  - Página de creación/edición de RFQ
  - Página de listado de cotizaciones recibidas
  - Página de listado de órdenes de compra
  - Página de detalle de PO con subida de factura/despacho

---

## 🚀 Pasos para Completar la Implementación

### 1. Crear Content Types en Strapi

Sigue la documentación en `docs/crm/STRAPI-SCHEMA-COMPRAS-PROVEEDORES.md` para crear:

1. **RFQ** (`rfq` / `rfqs`)
2. **Cotización Recibida** (`cotizacion-recibida` / `cotizaciones-recibidas`)
3. **Orden de Compra** (`orden-compra` / `ordenes-compra`)

**Importante:** Usa los schemas JSON proporcionados en la documentación.

### 2. Configurar Permisos en Strapi

1. Ve a **Settings → Users & Permissions Plugin → Roles**
2. Para cada content-type, configura:

**RFQ:**
- Authenticated: `find`, `findOne`, `create`, `update`, `delete`
- Public: `findOne` (solo para consulta por token)

**Cotización Recibida:**
- Authenticated: `find`, `findOne`, `create`, `update`, `delete`
- Public: `create` (solo para crear desde formulario público)

**Orden de Compra:**
- Authenticated: `find`, `findOne`, `create`, `update`, `delete`
- Public: Sin acceso

### 3. Variables de Entorno

Asegúrate de tener configurado SendGrid:

```env
SENDGRID_API_KEY=tu_api_key_aqui
SENDGRID_FROM_EMAIL=noreply@tudominio.cl
NEXT_PUBLIC_APP_URL=https://intranet.tudominio.cl
```

### 4. Probar el Flujo Completo

#### 4.1 Crear RFQ (desde código o Strapi Admin)

```bash
POST /api/compras/rfqs
{
  "nombre": "RFQ - Libros Educativos Q1 2026",
  "descripcion": "Solicitud de cotización para libros",
  "fecha_solicitud": "2026-01-15",
  "fecha_vencimiento": "2026-02-15",
  "empresas": [1, 2],
  "productos": [10, 11, 12],
  "creado_por": 5
}
```

#### 4.2 Enviar RFQ a Proveedores

```bash
POST /api/compras/rfqs/[id]/enviar
{
  "empresaIds": [1, 2] // Opcional: si no se envía, envía a todas
}
```

#### 4.3 Proveedor Responde (Página Pública)

1. Proveedor recibe email con enlace: `https://intranet.com/quote-reply/[TOKEN]`
2. Accede al formulario público
3. Completa datos o sube PDF
4. Envía cotización

#### 4.4 Aprobar Cotización

```bash
PUT /api/compras/cotizaciones-recibidas/[id]/aprobar
```

#### 4.5 Generar Orden de Compra

```bash
POST /api/compras/ordenes-compra
{
  "cotizacion_recibida_id": 1,
  "creado_por_id": 5
}
```

#### 4.6 Subir Factura y Orden de Despacho

```bash
PUT /api/compras/ordenes-compra/[id]
{
  "factura_id": 123,  // ID del archivo subido a Strapi Media
  "orden_despacho_id": 124,
  "estado": "facturada"
}
```

---

## 📁 Estructura de Archivos Creados

```
AlmonteIntranet/
├── docs/crm/
│   ├── STRAPI-SCHEMA-COMPRAS-PROVEEDORES.md  ✅
│   └── GUIA-IMPLEMENTACION-COMPRAS.md         ✅
├── src/
│   ├── lib/services/
│   │   ├── rfqService.ts                      ✅
│   │   └── ordenCompraService.ts              ✅
│   └── app/
│       ├── api/
│       │   ├── compras/
│       │   │   ├── rfqs/
│       │   │   │   ├── route.ts               ✅
│       │   │   │   └── [id]/
│       │   │   │       ├── route.ts           ✅
│       │   │   │       └── enviar/route.ts    ✅
│       │   │   ├── cotizaciones-recibidas/
│       │   │   │   ├── route.ts               ✅
│       │   │   │   └── [id]/
│       │   │   │       ├── route.ts           ✅
│       │   │   │       ├── aprobar/route.ts   ✅
│       │   │   │       └── rechazar/route.ts  ✅
│       │   │   └── ordenes-compra/
│       │   │       ├── route.ts               ✅
│       │   │       └── [id]/route.ts          ✅
│       │   └── public/
│       │       └── quote-reply/
│       │           └── [token]/route.ts      ✅
│       └── quote-reply/
│           └── [token]/page.tsx               ✅
└── src/middleware.ts                          ✅ (actualizado)
```

---

## 🔄 Flujo Completo del Sistema

```
1. Usuario crea RFQ
   ↓
2. Usuario envía RFQ a proveedores (genera token, envía emails)
   ↓
3. Proveedor recibe email con enlace único
   ↓
4. Proveedor accede a /quote-reply/[token]
   ↓
5. Proveedor completa formulario o sube PDF
   ↓
6. Se crea registro en "cotizaciones-recibidas"
   ↓
7. Usuario revisa y aprueba cotización
   ↓
8. Usuario genera Orden de Compra desde cotización aprobada
   ↓
9. Se envía email al proveedor con detalles de PO
   ↓
10. Proveedor envía factura y orden de despacho
   ↓
11. Usuario sube archivos a la PO
```

---

## 🎨 Próximos Pasos: Interfaces de Administración

Para completar el sistema, necesitas crear las interfaces de administración:

### 1. Listado de RFQs
- **Ruta:** `/compras/rfqs`
- **Componentes:** Tabla con filtros, búsqueda, paginación
- **Acciones:** Crear, Editar, Enviar, Ver Detalle

### 2. Crear/Editar RFQ
- **Ruta:** `/compras/rfqs/nuevo` y `/compras/rfqs/[id]/editar`
- **Componentes:** Formulario con selección múltiple de empresas y productos

### 3. Detalle de RFQ
- **Ruta:** `/compras/rfqs/[id]`
- **Componentes:** Tabs: Información, Cotizaciones Recibidas, Acciones

### 4. Listado de Cotizaciones Recibidas
- **Ruta:** `/compras/cotizaciones`
- **Componentes:** Tabla con filtros por RFQ, empresa, estado
- **Acciones:** Aprobar, Rechazar, Ver Detalle, Generar PO

### 5. Listado de Órdenes de Compra
- **Ruta:** `/compras/ordenes-compra`
- **Componentes:** Tabla con filtros por estado, empresa
- **Acciones:** Ver Detalle, Subir Factura/Despacho

### 6. Detalle de Orden de Compra
- **Ruta:** `/compras/ordenes-compra/[id]`
- **Componentes:** Información completa, subida de factura y orden de despacho

---

## 💡 Sugerencias de Mejora

1. **Notificaciones:** Sistema de notificaciones cuando se recibe cotización
2. **Comparación:** Vista para comparar múltiples cotizaciones de una RFQ
3. **Dashboard:** Métricas de compras (total gastado, POs pendientes, etc.)
4. **Historial:** Trackear cambios de estado con timestamps
5. **Plantillas:** Guardar RFQs como plantillas reutilizables
6. **Integración Facturación:** Conectar con sistema de facturación electrónica

---

## 🐛 Troubleshooting

### Error: "RFQ no encontrada o token inválido"
- Verificar que el token esté guardado correctamente en la RFQ
- Verificar que el content-type `rfq` exista en Strapi

### Error: "No se puede enviar email"
- Verificar variables de entorno: `SENDGRID_API_KEY` y `SENDGRID_FROM_EMAIL`
- Verificar que las empresas tengan emails configurados

### Error: "Solo se pueden generar POs de cotizaciones aprobadas"
- Asegurarse de aprobar la cotización antes de generar PO
- Verificar que el estado de la cotización sea `aprobada`

---

## 📞 Soporte

Para dudas o problemas, revisar:
- `docs/crm/STRAPI-SCHEMA-COMPRAS-PROVEEDORES.md` - Schemas detallados
- Logs de consola del servidor
- Logs de Strapi

