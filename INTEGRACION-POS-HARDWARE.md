# 🔌 Integración del POS con Hardware Real de Caja

## 📊 Estado Actual vs. Requerimientos para Caja Real

### ✅ Lo que ya tenemos
- Sistema POS funcional con interfaz web
- Búsqueda por código de barras (input manual)
- Impresión de tickets (HTML/ventana de impresión)
- Gestión de métodos de pago
- Gestión de caja
- Integración con WooCommerce

### ❌ Lo que falta para hardware real

---

## 🖨️ 1. IMPRESORA TÉRMICA DE TICKETS

### Estado Actual
- ✅ Generación de HTML para tickets
- ✅ Impresión mediante `window.print()`
- ❌ No hay integración directa con impresoras térmicas

### Requerimientos

#### A. Librería ESC/POS
```bash
npm install node-thermal-printer escpos-usb escpos-network
```

#### B. Implementación

**Opción 1: Servidor Node.js (Recomendado)**
```typescript
// frontend-ubold/src/app/api/pos/print/route.ts
import { Printer, types } from 'node-thermal-printer'
import { NetworkPrinter } from 'escpos-network'

export async function POST(request: NextRequest) {
  const receiptData = await request.json()
  
  // Conectar a impresora por red
  const printer = new NetworkPrinter('192.168.1.100', 9100)
  
  // Comandos ESC/POS
  printer
    .font('A')
    .align('CT')
    .text('INTRANET ALMONTE')
    .text('Punto de Venta')
    .newLine()
    .text(`Ticket #${receiptData.orderId}`)
    .text(`Fecha: ${new Date().toLocaleString('es-CL')}`)
    .newLine()
    .drawLine()
    
  // Items
  receiptData.items.forEach(item => {
    printer
      .text(`${item.name} x${item.quantity}`)
      .text(`$${item.total.toLocaleString('es-CL')}`)
  })
  
  printer
    .drawLine()
    .text(`TOTAL: $${receiptData.total.toLocaleString('es-CL')}`)
    .newLine()
    .cut()
    .close()
    
  return NextResponse.json({ success: true })
}
```

**Opción 2: Cliente Web (USB/Serial)**
```typescript
// Requiere permisos del navegador
// Usar Web Serial API o WebUSB API
const port = await navigator.serial.requestPort()
await port.open({ baudRate: 9600 })
const writer = port.writable.getWriter()
// Enviar comandos ESC/POS
```

#### C. Configuración
- **Variables de entorno:**
  ```env
  PRINTER_IP=192.168.1.100
  PRINTER_PORT=9100
  PRINTER_TYPE=network  # network, usb, serial
  ```

#### D. Marcas Recomendadas
- **Epson TM-T20/T82** (muy comunes)
- **Star TSP100/TSP650**
- **Bixolon SRP-350
- **Citizen CT-S310II**

---

## 📷 2. LECTOR DE CÓDIGO DE BARRAS

### Estado Actual
- ✅ Input manual para código de barras
- ✅ Validación de formato
- ❌ No hay detección automática de escáneres USB/HID

### Requerimientos

#### A. Detección de Escáneres HID
```typescript
// frontend-ubold/src/app/tienda/pos/utils/barcode-scanner.ts

export function setupBarcodeScanner(
  onScan: (barcode: string) => void
) {
  // Los escáneres USB suelen enviar como teclado HID
  // Detectamos secuencias rápidas de caracteres
  
  let barcodeBuffer = ''
  let lastKeyTime = 0
  
  const handleKeyPress = (e: KeyboardEvent) => {
    const now = Date.now()
    
    // Si pasó más de 100ms, es una nueva lectura
    if (now - lastKeyTime > 100) {
      barcodeBuffer = ''
    }
    
    // Ignorar teclas especiales
    if (e.key.length === 1) {
      barcodeBuffer += e.key
    }
    
    // Enter indica fin del código
    if (e.key === 'Enter' && barcodeBuffer.length > 0) {
      e.preventDefault()
      onScan(barcodeBuffer.trim())
      barcodeBuffer = ''
    }
    
    lastKeyTime = now
  }
  
  window.addEventListener('keydown', handleKeyPress)
  
  return () => {
    window.removeEventListener('keydown', handleKeyPress)
  }
}
```

#### B. Integración en PosInterface
```typescript
useEffect(() => {
  const cleanup = setupBarcodeScanner((barcode) => {
    handleBarcodeSearch(barcode)
  })
  return cleanup
}, [])
```

#### C. Configuración de Escáner
- **Modo HID** (Keyboard Wedge): Funciona automáticamente
- **Modo Serial/USB**: Requiere driver y configuración adicional
- **Velocidad de lectura**: Ajustar según modelo

#### D. Marcas Recomendadas
- **Honeywell Voyager**
- **Zebra DS2208**
- **Symbol LS2208**
- **Datalogic QuickScan**

---

## 💰 3. CAJÓN DE DINERO (CASH DRAWER)

### Estado Actual
- ✅ Cálculo de cambio
- ❌ No hay apertura automática del cajón

### Requerimientos

#### A. Comandos ESC/POS para Cajón
```typescript
// frontend-ubold/src/app/api/pos/cash-drawer/route.ts
import { NetworkPrinter } from 'escpos-network'

export async function POST(request: NextRequest) {
  const { action } = await request.json() // 'open' o 'close'
  
  const printer = new NetworkPrinter(process.env.PRINTER_IP, 9100)
  
  if (action === 'open') {
    // Comando ESC p (abrir cajón pin 2)
    printer.raw(Buffer.from([0x10, 0x14, 0x01, 0x00, 0x01]))
    // O pin 5: [0x10, 0x14, 0x01, 0x00, 0x02]
  }
  
  printer.close()
  return NextResponse.json({ success: true })
}
```

#### B. Integración en PaymentModal
```typescript
// Al confirmar pago en efectivo
if (paymentMethod === 'cash') {
  await fetch('/api/pos/cash-drawer', {
    method: 'POST',
    body: JSON.stringify({ action: 'open' })
  })
}
```

#### C. Hardware
- **Cajones compatibles con ESC/POS**
- **Conexión**: USB, Serial, o compartido con impresora
- **Pines**: Pin 2 o Pin 5 (configurable)

---

## 💳 4. TERMINAL DE PAGO (TPV/TEF)

### Estado Actual
- ✅ Selección de método de pago "tarjeta"
- ❌ No hay integración con terminales físicos

### Requerimientos

#### A. Integración con Proveedores

**Opción 1: Transbank Webpay Plus (Chile)**
```typescript
// frontend-ubold/src/app/api/pos/payment/transbank/route.ts
import { WebpayPlus } from 'transbank-sdk'

export async function POST(request: NextRequest) {
  const { amount, orderId } = await request.json()
  
  const transaction = new WebpayPlus.Transaction({
    commerceCode: process.env.TRANSBANK_COMMERCE_CODE,
    apiKey: process.env.TRANSBANK_API_KEY,
    environment: process.env.TRANSBANK_ENV // 'PRODUCCION' o 'INTEGRACION'
  })
  
  const response = await transaction.create(
    orderId.toString(),
    'session-id',
    amount,
    'http://localhost:3000/pos/payment/return'
  )
  
  return NextResponse.json({
    token: response.token,
    url: response.url
  })
}
```

**Opción 2: Terminal Físico (Ingenico, Verifone)**
- Requiere SDK del fabricante
- Comunicación por Serial/USB/Red
- Más complejo, requiere driver específico

#### B. Flujo de Pago con Tarjeta
1. Usuario selecciona "Tarjeta"
2. Sistema crea transacción en Transbank
3. Redirige a página de pago de Transbank
4. Usuario ingresa datos de tarjeta
5. Transbank redirige de vuelta con resultado
6. Sistema confirma pedido en WooCommerce

#### C. Proveedores Recomendados (Chile)
- **Transbank** (Webpay Plus, Oneclick)
- **Flow** (pagos online)
- **Khipu** (transferencias)

---

## 📺 5. PANTALLA DE CLIENTE (CUSTOMER DISPLAY)

### Estado Actual
- ❌ No implementado

### Requerimientos

#### A. Pantallas LCD Compatibles
- **Epson TM-D30** (pantalla de 2 líneas)
- **Bixolon BCD-1000** (pantalla de 1 línea)
- **Pantallas genéricas con protocolo ESC/POS**

#### B. Implementación
```typescript
// frontend-ubold/src/app/api/pos/display/route.ts
export async function POST(request: NextRequest) {
  const { line1, line2 } = await request.json()
  
  const printer = new NetworkPrinter(process.env.DISPLAY_IP, 9100)
  
  printer
    .clear()
    .text(line1 || '')
    .text(line2 || '')
    .close()
    
  return NextResponse.json({ success: true })
}
```

#### C. Integración
- Mostrar total en pantalla al agregar productos
- Mostrar "Gracias" después del pago
- Mostrar mensajes de estado

---

## ⚖️ 6. BALANZA (SCALE)

### Estado Actual
- ❌ No implementado

### Requerimientos

#### A. Balanzas con Salida Serial/USB
```typescript
// frontend-ubold/src/app/api/pos/scale/route.ts
import SerialPort from 'serialport'

export async function GET(request: NextRequest) {
  const port = new SerialPort({
    path: process.env.SCALE_PORT, // '/dev/ttyUSB0' o 'COM3'
    baudRate: 9600
  })
  
  return new Promise((resolve) => {
    port.on('data', (data) => {
      // Parsear peso según protocolo de la balanza
      const weight = parseWeight(data.toString())
      port.close()
      resolve(NextResponse.json({ weight }))
    })
  })
}
```

#### B. Integración
- Botón "Pesar" en productos que requieren peso
- Agregar peso al carrito automáticamente
- Validar peso mínimo/máximo

---

## 🔄 7. MODO OFFLINE Y SINCRONIZACIÓN

### Estado Actual
- ❌ No hay modo offline
- ❌ No hay sincronización

### Requerimientos

#### A. Service Worker para Offline
```typescript
// public/sw.js
self.addEventListener('fetch', (event) => {
  // Cachear recursos estáticos
  // Almacenar pedidos en IndexedDB cuando offline
})
```

#### B. IndexedDB para Almacenamiento Local
```typescript
// frontend-ubold/src/app/tienda/pos/utils/offline-storage.ts
import { openDB } from 'idb'

const db = await openDB('pos-db', 1, {
  upgrade(db) {
    db.createObjectStore('pending-orders')
    db.createObjectStore('products-cache')
  }
})

export async function savePendingOrder(order: any) {
  await db.put('pending-orders', order, Date.now())
}

export async function syncPendingOrders() {
  const orders = await db.getAll('pending-orders')
  for (const order of orders) {
    try {
      await fetch('/api/woocommerce/orders', {
        method: 'POST',
        body: JSON.stringify(order)
      })
      await db.delete('pending-orders', order.id)
    } catch (error) {
      console.error('Error syncing order:', error)
    }
  }
}
```

#### C. Detección de Conexión
```typescript
useEffect(() => {
  const handleOnline = () => {
    syncPendingOrders()
  }
  
  window.addEventListener('online', handleOnline)
  return () => window.removeEventListener('online', handleOnline)
}, [])
```

---

## 🧾 8. FACTURACIÓN ELECTRÓNICA (Chile)

### Estado Actual
- ❌ No implementado

### Requerimientos

#### A. Integración con SII (Chile)
- **Librería**: `facturacion-electronica-chile`
- **Proveedores**: FacturacionFacil, FacturadorPro, etc.

#### B. Flujo
1. Al procesar pedido, generar factura electrónica
2. Enviar a SII mediante API del proveedor
3. Obtener PDF y XML de factura
4. Enviar por email al cliente
5. Almacenar en WooCommerce

---

## 🔐 9. SEGURIDAD Y PERMISOS

### Requerimientos

#### A. Permisos del Navegador
- **Web Serial API**: Para impresoras serial
- **WebUSB API**: Para dispositivos USB
- **Notificaciones**: Para alertas

#### B. Configuración HTTPS
- Requerido para Web Serial/USB APIs
- Certificado SSL válido

#### C. Autenticación de Hardware
- Validar que el hardware esté autorizado
- Registrar dispositivos por ubicación/caja

---

## 📦 10. IMPLEMENTACIÓN RECOMENDADA - FASE POR FASE

### Fase 1: Impresora Térmica (Prioridad Alta)
**Tiempo estimado:** 1-2 semanas

1. Instalar librería `node-thermal-printer`
2. Crear API route para impresión
3. Configurar IP/puerto de impresora
4. Probar con impresora real
5. Integrar en flujo de venta

**Archivos a crear:**
- `src/app/api/pos/print/route.ts`
- `src/app/tienda/pos/utils/printer.ts`
- Variables de entorno para configuración

### Fase 2: Lector de Código de Barras (Prioridad Alta)
**Tiempo estimado:** 1 semana

1. Implementar detección HID
2. Mejorar manejo de entrada rápida
3. Agregar feedback visual/sonoro
4. Probar con escáner real

**Archivos a modificar:**
- `src/app/tienda/pos/utils/barcode-scanner.ts` (nuevo)
- `src/app/tienda/pos/components/PosInterface.tsx`

### Fase 3: Cajón de Dinero (Prioridad Media)
**Tiempo estimado:** 3-5 días

1. Crear API para abrir cajón
2. Integrar en PaymentModal
3. Configurar pin del cajón
4. Probar apertura automática

**Archivos a crear:**
- `src/app/api/pos/cash-drawer/route.ts`

### Fase 4: Terminal de Pago (Prioridad Media)
**Tiempo estimado:** 2-3 semanas

1. Elegir proveedor (Transbank recomendado)
2. Crear integración con API
3. Implementar flujo de pago
4. Manejar callbacks y webhooks
5. Probar en ambiente de pruebas

**Archivos a crear:**
- `src/app/api/pos/payment/transbank/route.ts`
- `src/app/tienda/pos/payment/return/page.tsx`

### Fase 5: Modo Offline (Prioridad Baja)
**Tiempo estimado:** 2-3 semanas

1. Implementar Service Worker
2. Configurar IndexedDB
3. Crear sistema de sincronización
4. Manejar conflictos de datos
5. Probar escenarios offline

### Fase 6: Pantalla de Cliente (Prioridad Baja)
**Tiempo estimado:** 1 semana

1. Crear API para pantalla
2. Integrar en flujo de venta
3. Configurar IP de pantalla
4. Probar con hardware real

---

## 🛠️ 11. DEPENDENCIAS NECESARIAS

```json
{
  "dependencies": {
    "node-thermal-printer": "^4.4.0",
    "escpos-usb": "^3.0.0-alpha",
    "escpos-network": "^3.0.0-alpha",
    "serialport": "^12.0.0",
    "idb": "^8.0.0",
    "transbank-sdk": "^1.0.0"
  },
  "devDependencies": {
    "@types/serialport": "^8.0.0"
  }
}
```

---

## 🔧 12. CONFIGURACIÓN DE VARIABLES DE ENTORNO

```env
# Impresora
PRINTER_IP=192.168.1.100
PRINTER_PORT=9100
PRINTER_TYPE=network

# Cajón de dinero (mismo que impresora o separado)
CASH_DRAWER_IP=192.168.1.100
CASH_DRAWER_PORT=9100

# Pantalla de cliente
CUSTOMER_DISPLAY_IP=192.168.1.101
CUSTOMER_DISPLAY_PORT=9100

# Balanza
SCALE_PORT=COM3
SCALE_BAUDRATE=9600

# Terminal de pago
TRANSBANK_COMMERCE_CODE=tu_codigo
TRANSBANK_API_KEY=tu_api_key
TRANSBANK_ENV=INTEGRACION  # o PRODUCCION
```

---

## 📋 13. CHECKLIST DE IMPLEMENTACIÓN

### Hardware Básico (Mínimo Viable)
- [ ] Impresora térmica conectada a red
- [ ] Lector de código de barras USB (modo HID)
- [ ] Cajón de dinero (opcional, puede ser manual)

### Software
- [ ] API de impresión implementada
- [ ] Detección de escáner HID
- [ ] Apertura automática de cajón
- [ ] Configuración de variables de entorno
- [ ] Pruebas con hardware real

### Hardware Avanzado (Opcional)
- [ ] Terminal de pago integrado
- [ ] Pantalla de cliente
- [ ] Balanza conectada
- [ ] Modo offline funcional

---

## 💡 14. RECOMENDACIONES FINALES

### Para empezar rápido:
1. **Priorizar impresora térmica** - Es lo más visible para el cliente
2. **Lector de código de barras HID** - Fácil de implementar, gran mejora de UX
3. **Cajón de dinero** - Mejora la experiencia pero no es crítico

### Consideraciones:
- **Red local**: Todos los dispositivos deben estar en la misma red
- **Firewall**: Asegurar que los puertos estén abiertos
- **Backup**: Tener plan B si falla el hardware
- **Capacitación**: Entrenar al personal en el uso del sistema

### Costos estimados (Chile):
- Impresora térmica: $80.000 - $150.000 CLP
- Lector código de barras: $30.000 - $80.000 CLP
- Cajón de dinero: $50.000 - $120.000 CLP
- Terminal de pago: Incluido con proveedor de pagos
- Pantalla de cliente: $40.000 - $100.000 CLP

---

## 📞 15. SOPORTE Y DOCUMENTACIÓN

### Documentación de Hardware:
- Consultar manuales de cada dispositivo
- Protocolos ESC/POS estándar
- Configuración de red de dispositivos

### Pruebas:
- Probar cada componente individualmente
- Probar flujo completo de venta
- Probar escenarios de error (desconexión, etc.)

---

**Última actualización:** Diciembre 2024  
**Estado:** Documentación inicial - Pendiente implementación

