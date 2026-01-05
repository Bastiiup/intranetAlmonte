# Cómo Funciona Oportunidades en la Práctica

## 🏢 Contexto: Ventas B2B (No Tienda Física)

Este CRM es para **ventas a colegios** (B2B), NO para tienda física.

### ¿Qué significa?
- **Ventas a instituciones educativas** (colegios)
- **Vendedores** que visitan o llaman a colegios
- **Productos**: Libros, materiales educativos
- **Proceso largo**: Puede tomar semanas/meses cerrar una venta

---

## 🔍 ¿Cómo se Detecta que un Cliente Muestra Interés?

### Formas de Detectar Interés:

1. **Llamada telefónica**
   - Director/profesor llama preguntando por libros
   - Ejemplo: "Necesitamos libros de matemáticas para 3ro básico"

2. **Email**
   - Cliente envía consulta por email
   - Solicita cotización

3. **Visita a terreno**
   - Vendedor visita el colegio
   - Director muestra interés en productos

4. **Feria/Evento**
   - Cliente se acerca en una feria educativa
   - Intercambia tarjeta o datos

5. **Referido**
   - Otro cliente recomienda tus productos
   - Cliente nuevo contacta por referencia

6. **Web/Formulario**
   - Cliente llena formulario en el sitio web
   - Solicita información

---

## ➕ ¿Cómo Crear una Oportunidad?

### **Actualmente (Lo que falta):**

❌ **NO hay botón "Crear Oportunidad" en el frontend**  
✅ **Solo se puede crear desde Strapi Admin**

### **Opción Actual: Crear desde Strapi**

1. Ir a https://strapi.moraleja.cl/admin
2. Content Manager → Oportunidad
3. Click "Create new entry"
4. Llenar:
   - Nombre: "Venta libros - Colegio X"
   - Contacto: Seleccionar Persona
   - Producto: Seleccionar Libro (opcional)
   - Propietario: Seleccionar Colaborador
   - Etapa: Calificación
   - Monto: Valor estimado
   - Fecha de cierre: Cuándo esperas cerrar
5. Guardar y Publicar

### **Lo que FALTA Implementar:**

✅ **Modal de Creación** (como en Contactos)

Debería tener:
- Botón "Agregar Oportunidad" en la página
- Modal con formulario:
  - Nombre (requerido)
  - Contacto (selector de Personas)
  - Producto/Libro (selector, opcional)
  - Propietario (selector de Colaboradores)
  - Monto y Moneda
  - Etapa (default: Calificación)
  - Prioridad
  - Fecha de cierre
  - Descripción

---

## 📋 Flujo Real de Uso

### **Escenario: Vendedor recibe llamada**

1. **Llamada entrante**
   - Director del Colegio San José llama
   - Dice: "Necesitamos 500 libros de matemáticas"

2. **Crear Oportunidad** (actualmente desde Strapi)
   - Nombre: "Libros Matemáticas - Colegio San José"
   - Contacto: Director (ya existe en Personas)
   - Producto: Libro de Matemáticas 3ro Básico
   - Propietario: Juan Pérez (el vendedor)
   - Etapa: Calificación
   - Monto: $5,000,000 CLP

3. **Seguimiento**
   - Vendedor prepara cotización
   - Envía propuesta
   - En Pipeline: Mover a "Propuesta Enviada"

4. **Negociación**
   - Colegio pide descuento
   - Vendedor ajusta precio
   - En Pipeline: Mover a "Negociación"

5. **Cierre**
   - Si aceptan → Mover a "Ganada"
   - Si rechazan → Mover a "Perdida"

---

## 🎯 Diferencia con Tienda Física

### **Tienda Física:**
- Cliente llega, compra, se va
- Proceso: 5-10 minutos
- No necesita seguimiento

### **Ventas B2B (Este CRM):**
- Proceso largo: días/semanas/meses
- Múltiples interacciones: llamadas, emails, visitas
- Necesita seguimiento: ¿dónde está? ¿qué falta?
- Pipeline: ver todas las ventas en proceso

---

## 🚀 Próximos Pasos (Para Implementar)

### **1. Agregar Botón "Crear Oportunidad"**

En `/crm/opportunities`:
```tsx
<Button onClick={() => setAddModal(true)}>
  <LuPlus /> Agregar Oportunidad
</Button>
```

### **2. Crear Modal de Creación**

Similar a `AddContactModal.tsx`:
- Formulario con todos los campos
- Selector de Contactos (Personas)
- Selector de Productos (Libros)
- Selector de Propietario (Colaboradores)
- Validaciones
- POST a `/api/crm/oportunidades`

### **3. Integrar con Otras Fuentes**

Futuro:
- Crear oportunidad desde un Contacto
- Crear oportunidad desde un Colegio
- Crear oportunidad desde un Pedido
- Importar desde Excel/CSV

---

## 💡 Resumen

**¿Cómo se detecta interés?**
- Manualmente: llamadas, emails, visitas, eventos
- El vendedor identifica y crea la oportunidad

**¿Cómo crear oportunidad?**
- Actualmente: Solo desde Strapi Admin
- Falta: Botón y modal en el frontend

**¿Es tienda física?**
- No, es ventas B2B a colegios
- Proceso largo que necesita seguimiento

**¿Qué falta?**
- Modal de creación en el frontend
- Botón "Agregar Oportunidad"
- Integración con otras secciones del CRM
