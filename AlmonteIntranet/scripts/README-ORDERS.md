# Script de Prueba: Estructura de Pedidos WooCommerce

## 📋 Descripción

Este script obtiene un pedido de WooCommerce y muestra su estructura completa para entender qué campos están disponibles y cómo crear/actualizar pedidos.

## 🚀 Uso

### Obtener el pedido más reciente (por defecto - Escolar)
```bash
npm run test:woo:order
# o
node scripts/test-woocommerce-order.js
```

### Obtener un pedido específico por ID
```bash
node scripts/test-woocommerce-order.js --id 123
```

### Obtener un pedido específico por número
```bash
node scripts/test-woocommerce-order.js --number 1234
```

### Usar plataforma Moraleja
```bash
node scripts/test-woocommerce-order.js --platform moraleja
```

### Combinar opciones
```bash
node scripts/test-woocommerce-order.js --platform moraleja --id 456
```

## 📊 Información que Muestra

El script muestra:

1. **Información Básica del Pedido:**
   - ID, Número, Estado
   - Cliente ID, Total, Fecha
   - Método de Pago

2. **Estructura Completa:**
   - Todos los campos del pedido con sus tipos

3. **Items del Pedido (line_items):**
   - Productos incluidos
   - Cantidades, precios, subtotales
   - SKU, variaciones

4. **Datos de Facturación (billing):**
   - Nombre, email, teléfono
   - Dirección completa

5. **Datos de Envío (shipping):**
   - Dirección de envío completa

6. **Líneas de Envío (shipping_lines):**
   - Métodos de envío
   - Costos de envío

7. **Líneas de Impuestos (tax_lines):**
   - Impuestos aplicados

8. **Líneas de Tarifas (fee_lines):**
   - Tarifas adicionales

9. **Cupones (coupon_lines):**
   - Cupones aplicados

10. **Meta Data:**
    - Campos personalizados del pedido

11. **Resumen de Totales:**
    - Subtotal, Descuento, Envío, Impuestos, Total

12. **Estructura para Crear Pedido:**
    - Ejemplo de JSON para crear un nuevo pedido

## 📄 Archivos Generados

El script guarda automáticamente el JSON completo del pedido en:
```
scripts/woocommerce-order-sample.json
```

## ⚙️ Configuración

El script lee las credenciales desde `.env.local`:

```env
WOO_ESCOLAR_CONSUMER_KEY="ck_..."
WOO_ESCOLAR_CONSUMER_SECRET="cs_..."
WOO_ESCOLAR_URL="https://staging.escolar.cl"

WOO_MORALEJA_CONSUMER_KEY="ck_..."
WOO_MORALEJA_CONSUMER_SECRET="cs_..."
WOO_MORALEJA_URL="https://staging.moraleja.cl"
```

## 🎯 Propósito

Este script ayuda a:
- **Entender la estructura** de pedidos en WooCommerce
- **Identificar campos necesarios** para crear pedidos
- **Ver ejemplos reales** de datos de pedidos
- **Documentar la API** de pedidos para el desarrollo

## 📌 Notas

- El script usa las credenciales configuradas en `.env.local`
- Si no se especifica `--id` o `--number`, obtiene el pedido más reciente
- El script maneja tanto Escolar como Moraleja según el parámetro `--platform`
- Todos los datos se muestran en consola y se guardan en JSON para referencia

