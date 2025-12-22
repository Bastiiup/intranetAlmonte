# Integración con Shipit - Guía de Requisitos

## 📋 Resumen

Este documento detalla todo lo necesario para integrar **Shipit** (servicio de logística y envíos) en el proyecto, aprovechando la integración existente con WooCommerce.

## 🎯 Opciones de Integración

Shipit ofrece dos formas de integración:

### 1. **Integración por Plugin** (Recomendada para WooCommerce)
- Plugin oficial de Shipit para WooCommerce
- Instalación directa en WordPress/WooCommerce
- Configuración más simple
- **Requisito**: Acceso al servidor WordPress donde está WooCommerce

### 2. **Integración por API** (Recomendada para este proyecto)
- Integración directa desde Next.js
- Mayor control y personalización
- Sincronización automática con pedidos de WooCommerce
- **Requisito**: Token de API de Shipit

---

## 🔧 Requisitos para Integración por API

### 1. **Credenciales de API de Shipit**

Necesitarás obtener:
- **Token de Acceso (API Token)**: Para autenticar las solicitudes
- **URL Base de la API**: `https://api.shipit.cl/v4` (o la versión correspondiente)

**Cómo obtenerlas:**
1. Crear cuenta en [Shipit](https://shipit.cl/)
2. Acceder a la sección de configuración de API
3. Generar o copiar el Token de Acceso

### 2. **Variables de Entorno**

Agregar al archivo `.env` (o variables de entorno del servidor):

```env
# Shipit API Configuration
SHIPIT_API_TOKEN=tu_token_aqui
SHIPIT_API_URL=https://api.shipit.cl/v4
SHIPIT_API_EMAIL=tu_email@ejemplo.com  # REQUERIDO - Email con el que te registraste en Shipit
NEXT_PUBLIC_SHIPIT_ENABLED=true
```

**Importante sobre la autenticación:**
- Shipit API v4 requiere **ambos**: `SHIPIT_API_TOKEN` y `SHIPIT_API_EMAIL`
- La autenticación se hace mediante headers personalizados:
  - `X-Shipit-Email`: Tu email de cuenta
  - `X-Shipit-Access-Token`: Tu token de acceso
- El email es **obligatorio**, no opcional

### 3. **Estructura de Archivos Necesaria**

Siguiendo el patrón existente del proyecto (similar a WooCommerce):

```
frontend-ubold/src/
├── lib/
│   └── shipit/
│       ├── config.ts          # Configuración y variables de entorno
│       ├── client.ts           # Cliente HTTP para API de Shipit
│       ├── types.ts            # Tipos TypeScript para Shipit
│       └── utils.ts            # Utilidades (mapeo de datos, etc.)
├── app/
│   └── api/
│       └── shipit/
│           ├── shipments/
│           │   ├── route.ts              # GET/POST /api/shipit/shipments
│           │   └── [id]/
│           │       ├── route.ts         # GET/PUT /api/shipit/shipments/[id]
│           │       └── status/route.ts  # GET /api/shipit/shipments/[id]/status
│           ├── webhooks/
│           │   └── route.ts              # POST /api/shipit/webhooks (recibir actualizaciones)
│           └── coverage/
│               └── route.ts              # GET /api/shipit/coverage (verificar cobertura)
```

---

## 📦 Funcionalidades Principales a Implementar

### 1. **Crear Envíos desde Pedidos de WooCommerce**

**Endpoint**: `POST /api/shipit/shipments`

**Flujo:**
- Cuando un pedido de WooCommerce cambia a estado "processing" o "completed"
- Extraer datos del pedido (destinatario, dirección, productos, dimensiones)
- Crear envío en Shipit
- Guardar ID de envío de Shipit en `meta_data` del pedido de WooCommerce

**Datos necesarios del pedido WooCommerce:**
```typescript
{
  reference: order.id,              // ID del pedido
  items: order.line_items.length,   // Cantidad de items
  sizes: {
    width: 10,   // cm
    height: 10,  // cm
    length: 10,  // cm
    weight: 1    // kg
  },
  destiny: {
    street: order.shipping.address_1,
    number: "",  // Extraer de address_1 si es posible
    complement: order.shipping.address_2,
    commune_id: 308,  // Mapear desde comuna de Chile
    commune_name: order.shipping.city,
    full_name: `${order.shipping.first_name} ${order.shipping.last_name}`,
    email: order.billing.email,
    phone: order.billing.phone,
    kind: "home_delivery"
  }
}
```

### 2. **Consultar Estado de Envíos**

**Endpoint**: `GET /api/shipit/shipments/[id]/status`

**Uso:**
- Mostrar estado actual del envío en la interfaz
- Actualizar estado en pedido de WooCommerce
- Notificar al cliente

### 3. **Recibir Actualizaciones (Webhooks)**

**Endpoint**: `POST /api/shipit/webhooks`

**Eventos a manejar:**
- Cambio de estado del envío
- Entrega completada
- Problemas con el envío

**Acciones:**
- Actualizar estado en WooCommerce
- Enviar notificaciones
- Registrar en logs

### 4. **Verificar Cobertura**

**Endpoint**: `GET /api/shipit/coverage`

**Uso:**
- Validar si Shipit puede entregar en una dirección antes de crear el envío
- Mostrar información al usuario durante el checkout

---

## 🔄 Flujo de Integración Completo

```
1. Cliente realiza pedido en WooCommerce
   ↓
2. Pedido se crea con estado "pending" o "processing"
   ↓
3. Sistema detecta pedido listo para envío
   ↓
4. Crear envío en Shipit (POST /api/shipit/shipments)
   ↓
5. Shipit retorna ID de envío y tracking
   ↓
6. Guardar ID de Shipit en meta_data del pedido WooCommerce
   ↓
7. Actualizar estado del pedido a "processing" o "shipped"
   ↓
8. Webhook de Shipit notifica cambios de estado
   ↓
9. Actualizar estado en WooCommerce y notificar cliente
```

---

## 🛠️ Implementación Técnica

### Archivo: `src/lib/shipit/config.ts`

```typescript
/**
 * Configuración de Shipit API
 */
export const SHIPIT_API_URL = process.env.SHIPIT_API_URL || 'https://api.shipit.cl/v4'
export const SHIPIT_API_TOKEN = process.env.SHIPIT_API_TOKEN || ''

if (process.env.NODE_ENV === 'production' && !SHIPIT_API_TOKEN) {
  console.warn('⚠️  Shipit API token no está configurado')
}
```

### Archivo: `src/lib/shipit/client.ts`

Similar a `woocommerce/client.ts`, pero usando:
- Autenticación: Headers personalizados `X-Shipit-Email` y `X-Shipit-Access-Token`
- Accept header: `application/vnd.shipit.v4`
- Ambos headers son **requeridos** para la autenticación

### Tipos TypeScript

Necesitarás definir tipos para:
- `ShipitShipment` (crear envío)
- `ShipitShipmentStatus` (estados)
- `ShipitWebhook` (eventos de webhook)
- `ShipitCoverage` (cobertura)

---

## 📝 Checklist de Implementación

### Fase 1: Configuración Base
- [ ] Obtener credenciales de API de Shipit (token + email)
- [ ] Agregar variables de entorno (SHIPIT_API_TOKEN y SHIPIT_API_EMAIL)
- [ ] Crear estructura de archivos (`lib/shipit/`)
- [ ] Implementar `config.ts`
- [ ] Implementar `client.ts` con métodos GET/POST/PUT
- [ ] Definir tipos TypeScript en `types.ts`
- [ ] Probar conexión con `/api/shipit/test`

### Fase 2: Endpoints API
- [ ] `POST /api/shipit/shipments` - Crear envío
- [ ] `GET /api/shipit/shipments/[id]` - Obtener envío
- [ ] `GET /api/shipit/shipments/[id]/status` - Estado del envío
- [ ] `POST /api/shipit/webhooks` - Recibir actualizaciones
- [ ] `GET /api/shipit/coverage` - Verificar cobertura

### Fase 3: Integración con WooCommerce
- [ ] Hook/evento para detectar pedidos listos para envío
- [ ] Función para mapear pedido WooCommerce → Envío Shipit
- [ ] Guardar ID de Shipit en `meta_data` del pedido
- [ ] Actualizar estado del pedido cuando cambia el envío

### Fase 4: Interfaz de Usuario
- [ ] Mostrar información de envío en detalles del pedido
- [ ] Botón para crear envío manualmente
- [ ] Mostrar tracking/estado del envío
- [ ] Notificaciones de cambios de estado

### Fase 5: Testing
- [ ] Pruebas unitarias del cliente Shipit
- [ ] Pruebas de integración con pedidos de prueba (usar prefijo "TEST-")
- [ ] Probar webhooks localmente (usar ngrok o similar)
- [ ] Validar flujo completo end-to-end

---

## 🔗 Recursos y Documentación

- **Documentación API Shipit**: https://developers.shipit.cl/
- **Guía de Integración**: https://developers.shipit.cl/docs/paso-a-paso
- **Referencia de Endpoints**: https://developers.shipit.cl/v4/reference
- **Soporte**: [email protected]

---

## ⚠️ Consideraciones Importantes

1. **Mapeo de Comunas de Chile**: Shipit requiere `commune_id` (ID numérico de comuna). Necesitarás un mapeo de nombres de comunas a IDs.

2. **Dimensiones y Peso**: Si no están en el producto de WooCommerce, necesitarás valores por defecto o solicitar al usuario.

3. **Modo de Prueba**: Usar prefijo "TEST-" en el campo `reference` para pruebas sin afectar envíos reales.

4. **Webhooks**: Configurar la URL del webhook en el panel de Shipit apuntando a tu endpoint `/api/shipit/webhooks`.

5. **Seguridad**: Validar que los webhooks vengan realmente de Shipit (verificar firma/token si lo proporcionan).

6. **Manejo de Errores**: Implementar retry logic y logging para fallos en la creación de envíos.

---

## 🚀 Próximos Pasos

1. ✅ **Estructura base creada** - Todo el código está implementado
2. **Obtener credenciales** de API desde el panel de Shipit:
   - Token de acceso: `HhVs2mk9K9UHXVwyrVAv` (ya proporcionado)
   - Email de cuenta: Necesitas el email con el que te registraste en Shipit
3. **Configurar variables de entorno**:
   ```env
   SHIPIT_API_TOKEN=HhVs2mk9K9UHXVwyrVAv
   SHIPIT_API_EMAIL=tu_email@ejemplo.com
   SHIPIT_API_URL=https://api.shipit.cl/v4
   ```
4. **Probar conexión** visitando `/api/shipit/test` para verificar que todo funcione
5. **Probar crear envío** usando `/api/shipit/shipments` con un pedido de prueba
6. **Configurar webhooks** en el panel de Shipit apuntando a `/api/shipit/webhooks`
7. **Integrar en producción** y monitorear los primeros envíos

---

## 📞 Soporte

Si tienes dudas durante la implementación:
- Consultar documentación: https://developers.shipit.cl/
- Contactar soporte: [email protected]
- Revisar ejemplos en la documentación oficial
