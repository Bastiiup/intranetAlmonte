# Integración de Shipit - Cálculo de Envíos y Seguimiento

## ✅ Funcionalidades Implementadas

### 1. **Cálculo de Costos de Envío (Cotización)**
- **Endpoint:** `POST /api/shipit/rates`
- **Funcionalidad:** Calcula los costos de envío disponibles para un destino y dimensiones específicas
- **Parámetros:**
  - `commune_id` o `commune_name`: Comuna de destino
  - `sizes`: Dimensiones del paquete (width, height, length, weight)
  - `kind`: Tipo de envío (0: normal, 1: express, 2: same_day)
  - `courier`: Courier específico (opcional)
  - `insurance_amount`: Monto del seguro (opcional)
- **Respuesta:** Lista de tarifas disponibles ordenadas por precio

### 2. **Creación de Envíos**
- **Endpoint:** `POST /api/shipit/shipments`
- **Funcionalidad:** Crea un nuevo envío en Shipit desde un pedido (WooCommerce o Strapi)
- **Características:**
  - Busca el pedido primero en WooCommerce
  - Si no se encuentra, busca en Strapi
  - Valida que el pedido tenga la información necesaria
  - Guarda el ID de Shipit y tracking en el pedido (WooCommerce o Strapi)

### 3. **Seguimiento de Envíos**
- **Endpoint:** `GET /api/shipit/shipments/[id]/status`
- **Funcionalidad:** Obtiene el estado actual de un envío
- **Componente:** `ShipitInfo` muestra:
  - ID de envío
  - Número de tracking
  - Estado del envío
  - Courier asignado
  - Historial de eventos
  - Link para ver tracking en Shipit

### 4. **Webhooks**
- **Endpoint:** `POST /api/shipit/webhooks`
- **Funcionalidad:** Recibe notificaciones automáticas de cambios de estado
- **Acciones:**
  - Actualiza el estado del pedido en WooCommerce
  - Guarda información de tracking en meta_data

### 5. **Verificación de Cobertura**
- **Endpoint:** `GET /api/shipit/coverage`
- **Funcionalidad:** Verifica si Shipit puede entregar en una comuna específica

## 📁 Archivos Clave

### Librerías
- `src/lib/shipit/client.ts` - Cliente HTTP para Shipit API
- `src/lib/shipit/config.ts` - Configuración (URL, token, email)
- `src/lib/shipit/types.ts` - Tipos TypeScript
- `src/lib/shipit/utils.ts` - Utilidades (mapeo, validación)
- `src/lib/shipit/communes.ts` - Mapeo de comunas chilenas

### API Routes
- `src/app/api/shipit/rates/route.ts` - Cálculo de costos
- `src/app/api/shipit/shipments/route.ts` - Crear/listar envíos
- `src/app/api/shipit/shipments/[id]/route.ts` - Obtener/actualizar envío
- `src/app/api/shipit/shipments/[id]/status/route.ts` - Estado del envío
- `src/app/api/shipit/coverage/route.ts` - Verificar cobertura
- `src/app/api/shipit/webhooks/route.ts` - Recibir webhooks

### Componentes
- `src/app/(admin)/(apps)/(ecommerce)/orders/[orderId]/components/ShipitInfo.tsx`
  - Muestra información de envío
  - Permite crear envíos
  - Actualiza estado del envío
  - Funciona con pedidos de WooCommerce y Strapi

## 🔧 Configuración Requerida

### Variables de Entorno
```env
SHIPIT_API_URL=https://api.shipit.cl/v4
SHIPIT_API_TOKEN=tu_token_de_acceso
SHIPIT_API_EMAIL=tu_email@ejemplo.com
```

### Configuración en Shipit
1. Configurar webhook URL en el panel de Shipit:
   - URL: `https://tu-dominio.com/api/shipit/webhooks`
   - Eventos: `shipment.status_changed`, `shipment.delivered`, etc.

## 📝 Uso

### Calcular Costos de Envío
```typescript
const response = await fetch('/api/shipit/rates', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    commune_name: 'Santiago',
    sizes: {
      width: 20,
      height: 10,
      length: 20,
      weight: 0.5
    },
    kind: 0 // normal
  })
})

const { data } = await response.json()
// data.rates contiene las tarifas disponibles
```

### Crear Envío
```typescript
const response = await fetch('/api/shipit/shipments', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    orderId: 12345,
    courier: 'shippify',
    kind: 0,
    testMode: false
  })
})
```

### Obtener Estado de Envío
```typescript
const response = await fetch('/api/shipit/shipments/12345/status')
const { data } = await response.json()
// data contiene el estado actual del envío
```

## 🔄 Flujo de Trabajo

1. **Cliente realiza pedido** → Pedido se guarda en WooCommerce/Strapi
2. **Calcular costo de envío** (opcional) → Usar `/api/shipit/rates`
3. **Crear envío** → Usar `/api/shipit/shipments` desde el detalle del pedido
4. **Seguimiento automático** → Webhooks actualizan el estado del pedido
5. **Consulta manual** → Componente `ShipitInfo` permite actualizar estado

## 🎯 Compatibilidad

- ✅ Pedidos de WooCommerce (Moraleja y Escolar)
- ✅ Pedidos de Strapi
- ✅ Extracción de IDs de Shipit desde meta_data (WooCommerce) o campos directos (Strapi)
- ✅ Actualización de pedidos en WooCommerce y Strapi

## 📌 Notas Importantes

1. **Comunas:** El sistema usa un mapeo de comunas chilenas a IDs numéricos. Si una comuna no está en el mapeo, se debe proporcionar el `commune_id` manualmente.

2. **Dimensiones:** Si no se proporcionan dimensiones reales de los productos, se usan valores por defecto razonables (20x20x10 cm, 0.5 kg).

3. **Tracking:** El número de tracking se guarda automáticamente cuando Shipit lo genera, y se puede consultar desde el componente `ShipitInfo`.

4. **Webhooks:** Es importante configurar los webhooks en Shipit para recibir actualizaciones automáticas de estado.

## 🚀 Próximas Mejoras Sugeridas

- [ ] Interfaz para calcular costos de envío antes de crear el pedido
- [ ] Selección de courier desde la interfaz
- [ ] Notificaciones al cliente cuando cambia el estado del envío
- [ ] Integración con etiquetas de envío (imprimir desde Shipit)
- [ ] Dashboard de envíos pendientes/entregados


