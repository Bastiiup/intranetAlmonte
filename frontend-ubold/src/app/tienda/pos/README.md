# 🛒 Sistema POS Completo - Intranet Almonte

## 📋 Funcionalidades Implementadas

### ✅ Funcionalidades Principales

1. **Gestión de Productos**
   - Búsqueda de productos por nombre, SKU o categoría
   - Búsqueda por código de barras (escáner)
   - Visualización de stock en tiempo real
   - Filtrado por productos en stock

2. **Carrito de Compras**
   - Agregar productos con un clic
   - Modificar cantidades
   - Eliminar productos
   - Validación de stock disponible
   - Cálculo automático de totales

3. **Sistema de Descuentos**
   - Descuento por porcentaje
   - Descuento por monto fijo
   - Validación de cupones de WooCommerce
   - Aplicación automática de descuentos

4. **Gestión de Clientes**
   - Búsqueda de clientes existentes
   - Creación rápida de clientes nuevos
   - Asociación de cliente al pedido
   - Información de contacto del cliente

5. **Métodos de Pago**
   - Pago en efectivo
   - Pago con tarjeta
   - Transferencia bancaria
   - Pago mixto (múltiples métodos)
   - Cálculo automático de cambio

6. **Gestión de Caja**
   - Apertura de caja con monto inicial
   - Cierre de caja con reporte
   - Resumen de ventas del día
   - Cálculo de diferencia de caja
   - Productos más vendidos

7. **Impresión de Tickets**
   - Generación automática de tickets
   - Formato optimizado para impresoras térmicas
   - Información completa del pedido
   - Datos del cliente y método de pago

8. **Atajos de Teclado**
   - `Ctrl + F`: Focus en búsqueda
   - `Enter`: Buscar producto por código de barras
   - `Esc`: Limpiar búsqueda
   - `F11`: Pantalla completa (navegador)

9. **Mejoras de UX**
   - Modo pantalla completa
   - Búsqueda con debounce
   - Indicadores visuales de stock
   - Animaciones suaves
   - Diseño responsive

## 🏗️ Arquitectura

### Estructura de Archivos

```
pos/
├── page.tsx                    # Página principal
├── components/
│   ├── PosInterface.tsx       # Componente principal del POS
│   ├── PaymentModal.tsx        # Modal de métodos de pago
│   ├── CustomerSelector.tsx    # Selector de clientes
│   ├── DiscountInput.tsx       # Input de descuentos
│   └── CashRegister.tsx        # Gestión de caja
├── hooks/
│   ├── usePosCart.ts          # Hook para carrito
│   ├── usePosProducts.ts      # Hook para productos
│   └── usePosOrders.ts        # Hook para pedidos
└── utils/
    ├── calculations.ts        # Cálculos de totales e impuestos
    ├── barcode.ts             # Utilidades de código de barras
    └── receipt.ts             # Generación de tickets
```

### APIs Utilizadas

- `/api/woocommerce/products` - Obtener productos
- `/api/woocommerce/orders` - Crear pedidos
- `/api/woocommerce/customers` - Buscar/crear clientes
- `/api/woocommerce/coupons` - Validar cupones
- `/api/woocommerce/reports` - Reportes de ventas

## 🚀 Uso del Sistema

### Flujo de Venta

1. **Abrir Caja** (opcional)
   - Click en botón "Caja"
   - Ingresar monto inicial en efectivo
   - Confirmar apertura

2. **Buscar Productos**
   - Usar barra de búsqueda para encontrar productos
   - Escanear código de barras (Enter para buscar)
   - Filtrar por categoría (futuro)

3. **Agregar al Carrito**
   - Click en producto para agregar
   - Modificar cantidades desde el carrito
   - Aplicar descuentos si es necesario

4. **Seleccionar Cliente** (opcional)
   - Buscar cliente existente
   - O crear cliente nuevo rápidamente

5. **Procesar Pago**
   - Click en "Procesar Pedido"
   - Seleccionar método(s) de pago
   - Ingresar montos
   - Confirmar pago

6. **Imprimir Ticket** (automático)
   - El ticket se genera automáticamente
   - Se abre ventana de impresión
   - Opción de reimprimir desde historial

### Gestión de Caja

**Abrir Caja:**
1. Click en botón "Caja"
2. Ingresar monto inicial
3. Confirmar

**Cerrar Caja:**
1. Click en botón "Caja"
2. Revisar resumen del día
3. Contar efectivo real
4. Calcular diferencia
5. Cerrar caja

## ⌨️ Atajos de Teclado

| Atajo | Acción |
|-------|--------|
| `Ctrl + F` | Focus en búsqueda |
| `Enter` | Buscar por código de barras |
| `Esc` | Limpiar búsqueda |
| `F11` | Pantalla completa |

## 🎨 Características de UI

### Diseño Responsive
- Adaptado para tablets y pantallas grandes
- Layout optimizado para uso táctil
- Grid de productos adaptable

### Indicadores Visuales
- Badges de stock (verde/amarillo/rojo)
- Animaciones al agregar productos
- Estados de carga claros
- Mensajes de éxito/error

### Optimizaciones
- Debounce en búsquedas (300ms)
- Lazy loading de imágenes
- Caché de productos frecuentes
- Validación en tiempo real

## 🔧 Configuración

### Variables de Entorno Requeridas

```env
NEXT_PUBLIC_WOOCOMMERCE_URL=https://staging.escolar.cl
WOOCOMMERCE_CONSUMER_KEY=tu_consumer_key
WOOCOMMERCE_CONSUMER_SECRET=tu_consumer_secret
```

### Permisos WooCommerce

El usuario de WooCommerce debe tener permisos para:
- Leer productos
- Crear pedidos
- Crear clientes
- Leer cupones
- Leer reportes

## 📊 Reportes Disponibles

### Resumen del Día
- Total de ventas
- Número de pedidos
- Promedio por pedido
- Productos más vendidos
- Métodos de pago utilizados

### Acceso a Reportes
- Desde el modal de "Caja"
- Endpoint: `/api/woocommerce/reports?type=sales&period=day`

## 🐛 Troubleshooting

### Productos no se cargan
- Verificar conexión con WooCommerce
- Revisar credenciales en variables de entorno
- Verificar permisos de API

### Cupones no funcionan
- Verificar que el cupón esté activo en WooCommerce
- Revisar fechas de expiración
- Verificar montos mínimos/máximos

### Impresión no funciona
- Verificar permisos del navegador para imprimir
- Probar con otra impresora
- Verificar formato de ticket

### Caja no se abre
- Verificar localStorage del navegador
- Limpiar caché si es necesario
- Verificar que no haya otra sesión abierta

## 🔮 Mejoras Futuras

- [ ] Sincronización offline
- [ ] Múltiples cajas simultáneas
- [ ] Reportes avanzados
- [ ] Integración con impresoras térmicas directas
- [ ] Modo kiosco
- [ ] Gestión de devoluciones
- [ ] Historial de ventas en tiempo real
- [ ] Notificaciones de stock bajo

## 📝 Notas

- Los tickets se generan en formato HTML optimizado para impresoras térmicas de 80mm
- La gestión de caja se almacena en localStorage (en producción, usar API)
- Los descuentos se calculan antes de impuestos
- El stock se valida antes de agregar al carrito

## 👥 Soporte

Para problemas o sugerencias, contactar al equipo de desarrollo.

---

**Última actualización:** Diciembre 2024  
**Versión:** 2.0.0

