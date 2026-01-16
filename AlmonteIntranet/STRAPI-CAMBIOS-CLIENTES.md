# Cambios Necesarios en Strapi para Soporte de Billing/Shipping

## 📋 Resumen

**No se requieren cambios en el Content Type de Strapi** para soportar billing/shipping. Los datos de facturación y envío se envían directamente a WooCommerce y no se almacenan en Strapi.

---

## ✅ Estado Actual

El Content Type `WO-Clientes` en Strapi **NO necesita modificaciones**. Los datos de billing/shipping se manejan exclusivamente en WooCommerce:

1. **Los formularios** (`AddClienteForm` y `EditClienteModal`) recopilan los datos de billing/shipping
2. **La API de Next.js** (`/api/tienda/clientes`) extrae estos datos y los envía directamente a WooCommerce
3. **Strapi** solo almacena:
   - Datos básicos del cliente (nombre, correo_electronico, etc.)
   - Relación con `Persona`
   - `originPlatform` (woo_moraleja o woo_escolar)
   - Estadísticas (pedidos, gasto_total, etc.)

---

## 🔄 Flujo de Datos

```
Frontend (Formulario)
    ↓
POST /api/tienda/clientes
    ↓
1. Crear/Actualizar Persona en Strapi (solo datos básicos)
2. Enviar a WooCommerce con billing/shipping incluidos
3. Crear WO-Clientes en Strapi (solo referencia, sin billing/shipping)
```

---

## 📝 Verificación

### Content Type WO-Clientes

El Content Type `WO-Clientes` en Strapi debe tener los siguientes campos:

**Campos Básicos:**
- `nombre` (Text)
- `correo_electronico` (Email)
- `pedidos` (Number)
- `gasto_total` (Number)
- `fecha_registro` (Date)
- `ultima_actividad` (Date, opcional)

**Relaciones:**
- `persona` (Relation → `Persona`)

**Campos Adicionales:**
- `originPlatform` (Text, Enum: `'woo_moraleja'` | `'woo_escolar'`)
- `woocommerce_id` (Number, opcional - puede no existir)

**⚠️ NO se requiere:**
- Campos para billing
- Campos para shipping
- Campos para direcciones
- Meta data de direcciones

---

## ✅ Confirmación

**No se requieren cambios en Strapi** porque:

1. ✅ Los datos de billing/shipping se envían directamente a WooCommerce
2. ✅ Strapi solo almacena referencias básicas del cliente
3. ✅ La sincronización con WooCommerce maneja billing/shipping automáticamente
4. ✅ Los formularios ya están enviando `woocommerce_data` con billing/shipping
5. ✅ La API de Next.js ya está procesando y enviando estos datos a WooCommerce

---

## 📌 Nota Importante

Si en el futuro se desea almacenar billing/shipping en Strapi para tener una copia local, sería necesario:

1. Agregar campos JSON en `WO-Clientes` para `billing` y `shipping`
2. Modificar la API de Next.js para guardar estos datos en Strapi
3. Actualizar la lógica de carga en `EditClienteModal` para leer desde Strapi

**Por ahora, esto NO es necesario** porque WooCommerce es la fuente de verdad para direcciones de facturación y envío.

---

**Fecha de creación:** $(Get-Date -Format "yyyy-MM-dd")  
**Estado:** ✅ No se requieren cambios en Strapi

