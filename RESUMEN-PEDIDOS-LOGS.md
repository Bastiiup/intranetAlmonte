# Resumen: Cambios en Pedidos y Logs

## 📋 SISTEMA DE LOGS

### Archivos Creados/Modificados:

#### 1. Servicio de Logging (`/lib/logging/`)
- **`service.ts`**: Servicio centralizado para registrar actividades
  - Función `logActivity()`: Registra acciones de usuarios
  - Función `getUserFromRequest()`: Obtiene usuario desde cookies/token
  - Función `getClientIP()`: Captura IP del cliente
  - Función `createLogDescription()`: Genera descripciones legibles
  - Tipos de acciones: crear, actualizar, eliminar, ver, exportar, sincronizar, cambiar_estado, login, logout, descargar, imprimir, ocultar, mostrar

- **`index.ts`**: Exporta funciones del servicio

#### 2. API Routes (`/api/logs/`)
- **`route.ts`**: GET `/api/logs` - Lista paginada de logs con filtros
- **`usuarios/route.ts`**: GET `/api/logs/usuarios` - Lista usuarios con estadísticas
- **`usuario/[usuarioId]/route.ts`**: GET `/api/logs/usuario/[id]` - Logs de un usuario específico
- **`test/route.ts`**: GET `/api/logs/test` - Endpoint de prueba

#### 3. Frontend (`/logs/`)
- **`page.tsx`**: Página principal de logs
- **`components/LogsList.tsx`**: Componente de tabla con:
  - Filtros globales y por columna
  - Ordenamiento
  - Paginación
  - Panel de debug
  - Búsqueda en tiempo real
- **`usuario/[usuarioId]/page.tsx`**: Página de logs por usuario
- **`usuario/[usuarioId]/components/UserActivityLogs.tsx`**: Componente de logs de usuario

### Integración en APIs:
- Se agregó `logActivity()` en:
  - `/api/tienda/autores/route.ts` (GET, POST)
  - `/api/tienda/autores/[id]/route.ts` (PUT, DELETE)
  - `/api/tienda/productos/route.ts` (GET, POST)
  - `/api/tienda/productos/[id]/route.ts` (PUT, DELETE)
  - `/api/tienda/pedidos/route.ts` (GET, POST)
  - `/api/tienda/pedidos/[id]/route.ts` (GET, PUT, DELETE)
  - `/api/auth/login/route.ts` (POST)

### Configuración en Strapi:
- Content Type: "Log de Actividades" (API name: `activity-logs`)
- Campos: accion, entidad, entidad_id, descripcion, fecha, usuario (relación), datos_anteriores, datos_nuevos, ip_address, user_agent, metadata

---

## 🛒 SISTEMA DE PEDIDOS

### Archivos Creados/Modificados:

#### 1. API Routes (`/api/tienda/pedidos/`)
- **`route.ts`**: 
  - GET: Lista pedidos con filtro `includeHidden` (publicados/ocultos)
  - POST: Crear pedido en Strapi + WooCommerce (sincronización dual)
  - Funciones helper: `mapWooStatus()`, `normalizeOrigen()`, `normalizeMetodoPago()`
  - Mapeo automático Strapi → formato WooCommerce
  - Logging de todas las operaciones

- **`[id]/route.ts`**:
  - GET: Obtener pedido por `documentId`, `numero_pedido` o `wooId`
  - PUT: Actualizar pedido en Strapi + WooCommerce
  - DELETE: Eliminar pedido de Strapi + WooCommerce
  - Búsqueda inteligente en múltiples campos
  - Manejo de errores cuando WooCommerce no está configurado
  - Logging de cambios

- **`sync-specific/route.ts`**: 
  - POST: Sincronizar pedidos específicos desde WooCommerce
  - Busca por número de pedido en ambas plataformas (moraleja/escolar)
  - Crea en Strapi si no existe

- **`sync/route.ts`**: 
  - POST: Sincronización masiva de pedidos desde WooCommerce

#### 2. Frontend (`/atributos/pedidos/`)
- **`page.tsx`**: Página principal de pedidos
  - Usa `OrdersStats` y `OrdersList`
  - Mapea pedidos de Strapi al formato WooCommerce
  - Filtro `includeHidden=true` por defecto

- **`[pedidoId]/page.tsx`**: Página de detalles de pedido
  - Usa componentes de Orders (OrderSummary, CustomerDetails, etc.)
  - Incluye `OrderStatusEditor` para cambiar estado

- **`[pedidoId]/components/OrderStatusEditor.tsx`**: 
  - Editor inline de estado de pedido
  - Estados: pending, processing, on-hold, completed, cancelled, refunded, failed
  - Actualiza en Strapi y WooCommerce

- **`[pedidoId]/components/PedidoDetails.tsx`**: 
  - Vista detallada del pedido
  - Mapeo de datos Strapi → formato WooCommerce

- **`components/PedidosListing.tsx`**: 
  - Lista de pedidos (reemplazado por OrdersList)

- **`components/AddPedidoForm.tsx`**: 
  - Formulario para crear nuevos pedidos

- **`sync-missing/page.tsx`**: 
  - Página para sincronizar pedidos faltantes
  - Input para números de pedido específicos

#### 3. Mejoras en OrdersList (`/orders/components/OrdersList.tsx`)
- Agregado prop `basePath` para rutas personalizadas
- Mejora en búsqueda: incluye nombre de cliente
- Filtro para mostrar/ocultar pedidos ocultos
- Mejor visualización de ID (muestra `numero_pedido` o `wooId` en lugar de `documentId`)
- Botón de sincronización rápida

#### 4. Mejoras en ShipitInfo (`/orders/[orderId]/components/ShipitInfo.tsx`)
- Integración con información de Shipit
- Muestra datos de envío

### Funcionalidades Implementadas:

1. **Visualización Mejorada**:
   - Muestra `numero_pedido` o `wooId` como ID principal
   - Nombre completo del cliente en lista
   - Filtro toggle para pedidos ocultos

2. **Gestión de Estados**:
   - Editor inline de estado
   - Mapeo bidireccional español ↔ inglés
   - Validación de estados válidos
   - Actualización en Strapi y WooCommerce simultánea

3. **Búsqueda Mejorada**:
   - Por `documentId`, `numero_pedido`, `wooId`
   - Por nombre de cliente
   - Incluye pedidos en estado "trash" de WooCommerce

4. **Sincronización**:
   - Sincronización específica por número de pedido
   - Sincronización masiva desde WooCommerce
   - Soporte para múltiples plataformas (moraleja/escolar)

5. **Manejo de Errores**:
   - Continúa con Strapi aunque WooCommerce falle
   - Manejo específico cuando credenciales no están configuradas
   - No elimina de Strapi si WooCommerce falla

6. **Normalización de Datos**:
   - `origen`: mapea "woocommerce" → "web", normaliza variantes
   - `metodo_pago`: mapea "tarjeta" → "stripe", "transferencia bancaria" → "transferencia"
   - `estado`: mapea español → inglés (Strapi espera inglés)

### Dependencias:
- `@/lib/logging` - Servicio de logging
- `@/lib/strapi/client` - Cliente Strapi
- `@/lib/woocommerce/client` - Cliente WooCommerce (con soporte multi-plataforma)

---





