# ¿Qué son los Leads en el CRM?

## 🎯 **Concepto de Lead**

Un **Lead** (prospecto) es una **persona o empresa que ha mostrado interés inicial** en tus productos o servicios, pero **aún no está lista para una venta formal**.

### Diferencia clave:

| **Lead** | **Oportunidad** |
|----------|-----------------|
| Interés inicial | Interés confirmado |
| Información básica | Información detallada |
| Sin producto específico | Producto/servicio definido |
| Monto estimado | Monto real o más preciso |
| Etapa temprana | En pipeline de ventas |
| Necesita calificación | Ya calificado |

---

## 🔄 **Flujo del CRM: Lead → Oportunidad → Venta**

```
┌─────────┐      ┌──────────────┐      ┌─────────────┐      ┌──────────┐
│  LEAD   │ ───▶ │ OPORTUNIDAD  │ ───▶ │  PIPELINE  │ ───▶ │  VENTA   │
│         │      │              │      │            │      │          │
│ • Info  │      │ • Producto   │      │ • Etapas   │      │ • Ganada │
│   básica│      │   específico │      │   de venta │      │   o       │
│ • Monto │      │ • Monto real │      │ • Negociación│    │   Perdida │
│   estimado│    │ • Contacto   │      │            │      │          │
└─────────┘      └──────────────┘      └─────────────┘      └──────────┘
```

---

## 📋 **Ejemplo Práctico**

### **Escenario: Venta de Libros a Colegios**

#### 1. **LEAD** (Prospecto inicial)
- **Situación:** Un colegio pregunta por correo sobre libros de matemáticas
- **Información:**
  - Nombre: "Colegio San José"
  - Contacto: "Juan Pérez" (director)
  - Email: juan.perez@colegiosanjose.cl
  - Teléfono: +56 9 1234 5678
  - Monto estimado: $500,000 CLP
  - Etiqueta: "Cold Lead" (interés inicial)
  - Estado: "In Progress" (en seguimiento)
  - Asignado a: María González (vendedora)

#### 2. **OPORTUNIDAD** (Cuando el lead está listo)
- **Situación:** Después de calificar, el colegio confirma que necesita libros específicos
- **Información:**
  - Producto: "Matemática M1 PAES - 10ª Edición 2026"
  - Monto: $450,000 CLP (más preciso)
  - Contacto: Juan Pérez (de Persona)
  - Etapa: "Qualification" (en Pipeline)
  - Propietario: María González
  - Fuente: "Lead convertido"

#### 3. **PIPELINE** (Seguimiento de venta)
- La oportunidad se mueve por las etapas:
  - Qualification → Proposal Sent → Negotiation → Won/Lost

---

## 🎯 **¿Para qué sirven los Leads?**

### 1. **Captura de Interés Inicial**
- Registras personas/empresas que muestran interés
- Pueden venir de:
  - Formularios web
  - Ferias/eventos
  - Referencias
  - Llamadas frías
  - Redes sociales

### 2. **Calificación y Nurturing**
- Clasificas leads por calidad:
  - **Cold Lead:** Interés muy inicial, necesita más información
  - **Prospect:** Interés moderado, en seguimiento
  - **Hot Lead:** Interés alto, listo para convertir

### 3. **Asignación de Vendedores**
- Cada lead se asigna a un vendedor
- Permite distribuir la carga de trabajo
- Facilita el seguimiento personalizado

### 4. **Seguimiento de Estado**
- Estados del lead:
  - **In Progress:** En seguimiento activo
  - **Proposal Sent:** Se envió propuesta
  - **Follow Up:** Necesita seguimiento
  - **Pending:** Esperando respuesta
  - **Negotiation:** En negociación
  - **Rejected:** Rechazado

### 5. **Conversión a Oportunidad**
- Cuando un lead está listo, se convierte en Oportunidad
- La conversión:
  - Crea una nueva Oportunidad
  - Copia información relevante
  - Asigna al mismo vendedor
  - Marca el lead como "convertido"

---

## 💡 **Ventajas de tener Leads separados de Oportunidades**

### ✅ **Organización**
- No saturas el Pipeline con leads que aún no están listos
- Mantienes el Pipeline enfocado en ventas activas

### ✅ **Métricas**
- Puedes medir:
  - Tasa de conversión: Leads → Oportunidades
  - Tiempo promedio de conversión
  - Fuentes más efectivas de leads

### ✅ **Seguimiento**
- Leads requieren más nurturing (educación, información)
- Oportunidades requieren más negociación (precio, términos)

### ✅ **Priorización**
- Puedes priorizar leads "Hot" para seguimiento inmediato
- Leads "Cold" pueden esperar o ir a campañas de marketing

---

## 🔧 **Funcionalidades que debería tener el módulo Leads**

### 1. **CRUD Básico**
- Crear, editar, eliminar leads
- Listado con filtros y búsqueda

### 2. **Campos Importantes**
- Nombre del contacto
- Empresa/colegio
- Email y teléfono
- Monto estimado
- Etiqueta (Cold Lead, Prospect, Hot Lead)
- Estado (In Progress, Proposal Sent, etc.)
- Asignado a (vendedor)
- Fuente (web, feria, referencia, etc.)

### 3. **Funcionalidad Clave: "Convertir a Oportunidad"**
- Botón que:
  - Crea una nueva Oportunidad
  - Copia información del lead
  - Asigna el mismo vendedor
  - Opcionalmente marca el lead como "convertido"

### 4. **Relaciones**
- Lead puede estar relacionado con:
  - **Persona** (si ya existe en el sistema)
  - **Colaborador** (vendedor asignado)
  - **Colegio** (si es un colegio)

---

## 📊 **Ejemplo de Uso Real**

### **Caso: Feria del Libro**

1. **Día 1 - Feria:**
   - María recibe 20 tarjetas de contacto
   - Crea 20 Leads en el sistema
   - Etiqueta: "Cold Lead" (recién conocidos)
   - Fuente: "Feria del Libro 2025"

2. **Día 2-7 - Seguimiento:**
   - María llama a los 20 leads
   - 5 muestran interés real → Cambia a "Hot Lead"
   - 10 no responden → Mantiene "Cold Lead"
   - 5 rechazan → Cambia a "Rejected"

3. **Día 8-15 - Conversión:**
   - De los 5 "Hot Leads", 3 confirman necesidad
   - María convierte esos 3 a Oportunidades
   - Las oportunidades entran al Pipeline
   - Los leads se marcan como "convertidos"

4. **Resultado:**
   - 20 Leads capturados
   - 3 Oportunidades creadas
   - Tasa de conversión: 15% (3/20)
   - Pipeline tiene 3 nuevas oportunidades activas

---

## 🎯 **Conclusión**

**Leads** son la **entrada al sistema de ventas**. Te permiten:
- Capturar interés inicial sin saturar el Pipeline
- Calificar y nutrir prospectos antes de convertirlos
- Medir la efectividad de tus fuentes de leads
- Organizar mejor el trabajo de los vendedores

**Sin Leads**, tendrías que crear Oportunidades para cada persona que muestra interés, lo que saturaría el Pipeline con casos que aún no están listos para venta.

---

## 🚀 **Próximo Paso**

Si implementamos Leads, el flujo completo sería:

1. **Lead** → Captura interés inicial
2. **Calificación** → Determina si es viable
3. **Conversión** → Crea Oportunidad cuando está listo
4. **Pipeline** → Seguimiento de venta
5. **Venta** → Ganada o Perdida

¿Te parece útil implementar Leads ahora, o prefieres enfocarte en otro módulo primero?
