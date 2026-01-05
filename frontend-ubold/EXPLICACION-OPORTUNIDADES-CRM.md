# Explicación: Cómo Funciona el Módulo de Oportunidades CRM

## 📋 ¿Qué es una Oportunidad?

Una **Oportunidad** es una venta potencial o un negocio en proceso. Representa una posibilidad de cerrar una venta con un cliente.

### Ejemplo Real:
- **Cliente**: Colegio San José quiere comprar 500 libros de matemáticas
- **Oportunidad**: "Venta de libros de matemáticas - Colegio San José"
- **Monto**: $5,000,000 CLP
- **Etapa**: Negociación (están revisando precios)
- **Propietario**: Juan Pérez (el vendedor asignado)

---

## 🎯 Flujo de una Oportunidad

### 1. **Creación de la Oportunidad**

Una oportunidad se crea cuando:
- Un cliente muestra interés en comprar
- Un vendedor identifica una necesidad
- Se recibe un lead o contacto

**Datos mínimos requeridos:**
- **Nombre**: Descripción de la oportunidad
- **Contacto**: La persona/cliente con quien se está negociando
- **Etapa**: En qué fase está (Calificación, Propuesta, etc.)
- **Propietario**: El vendedor responsable

**Datos opcionales:**
- **Producto/Libro**: Qué producto se está vendiendo
- **Monto**: Valor estimado de la venta
- **Fecha de cierre**: Cuándo se espera cerrar
- **Prioridad**: Alta, Media, Baja
- **Estado**: Abierto, En Progreso, Cerrado

---

### 2. **Etapas del Proceso de Venta (Pipeline)**

Una oportunidad pasa por diferentes etapas:

```
┌─────────────┐
│ Calificación │ ← Cliente muestra interés inicial
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ Propuesta Enviada │ ← Se envió cotización/propuesta
└────────┬─────────┘
         │
         ▼
┌──────────────┐
│ Negociación  │ ← Están negociando términos/precio
└──────┬───────┘
       │
       ▼
   ┌──────┐   ┌──────┐
   │ Ganada│   │Perdida│
   └──────┘   └──────┘
```

#### **Calificación**
- Cliente muestra interés
- Se recopila información básica
- Se valida que sea un cliente potencial real

#### **Propuesta Enviada**
- Se preparó y envió una cotización
- Cliente está revisando la propuesta
- Esperando respuesta

#### **Negociación**
- Cliente está interesado pero hay ajustes
- Negociando precio, términos, condiciones
- Puede haber varias rondas de negociación

#### **Ganada**
- ✅ Cliente aceptó la propuesta
- Se cerró la venta
- Se convierte en pedido/orden

#### **Perdida**
- ❌ Cliente rechazó o no respondió
- Oportunidad cerrada sin éxito
- Se puede analizar por qué se perdió

---

### 3. **Estados de la Oportunidad**

Indican el estado general de la oportunidad:

- **Abierto**: Oportunidad activa, en proceso
- **En Progreso**: Hay actividad reciente, se está trabajando activamente
- **Cerrado**: Oportunidad finalizada (ganada o perdida)

---

### 4. **Prioridades**

Indican qué tan importante/urgente es:

- **Alta**: Cliente importante, monto alto, fecha cercana
- **Media**: Prioridad normal
- **Baja**: No urgente, puede esperar

---

## 🖥️ Cómo Funciona en la Interfaz

### **Página de Listado** (`/crm/opportunities`)

Muestra todas las oportunidades en una tabla con:

1. **Columnas principales:**
   - **ID**: Identificador único
   - **Oportunidad**: Nombre + logo del producto/libro
   - **Contacto**: Persona con quien se está negociando
   - **Etapa**: En qué fase está (Calificación, Negociación, etc.)
   - **Valor**: Monto estimado de la venta
   - **Fecha de Cierre**: Cuándo se espera cerrar
   - **Origen**: De dónde vino el lead
   - **Propietario**: Vendedor responsable
   - **Estado**: Abierto, En Progreso, Cerrado
   - **Prioridad**: Alta, Media, Baja

2. **Filtros:**
   - **Búsqueda**: Por nombre, contacto, etc.
   - **Etapa**: Filtrar por etapa del proceso
   - **Estado**: Filtrar por estado
   - **Prioridad**: Filtrar por prioridad

3. **Acciones:**
   - Ver detalles
   - Editar oportunidad
   - Cambiar etapa (desde Pipeline)

---

### **Pipeline Kanban** (`/crm/pipeline`)

Vista visual tipo tablero Kanban donde puedes:

1. **Ver oportunidades organizadas por etapa:**
   ```
   ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────┐  ┌──────┐
   │ Calificación │  │Propuesta Env.│  │ Negociación  │  │Ganada│  │Perdida│
   ├─────────────┤  ├──────────────┤  ├──────────────┤  ├──────┤  ├──────┤
   │ Oportunidad 1│  │ Oportunidad 2│  │ Oportunidad 3│  │  ✅  │  │  ❌  │
   │ Oportunidad 4│  │              │  │              │  │      │  │      │
   └─────────────┘  └──────────────┘  └──────────────┘  └──────┘  └──────┘
   ```

2. **Drag & Drop:**
   - Arrastra una oportunidad de una etapa a otra
   - Se actualiza automáticamente en Strapi
   - Ejemplo: Mover de "Calificación" a "Negociación"

3. **Información en cada card:**
   - Nombre de la oportunidad
   - Contacto
   - Monto
   - Prioridad (color)
   - Propietario

---

## 🔄 Flujo Completo de Uso

### **Escenario: Venta de Libros a un Colegio**

1. **Contacto inicial** (Calificación)
   - Un profesor del Colegio San José pregunta por libros de matemáticas
   - Se crea oportunidad: "Libros Matemáticas - Colegio San José"
   - Etapa: **Calificación**
   - Estado: **Abierto**
   - Prioridad: **Media**

2. **Preparación de propuesta** (Propuesta Enviada)
   - Vendedor prepara cotización con 500 libros
   - Se envía la propuesta al colegio
   - Se actualiza la etapa a: **Propuesta Enviada**
   - Se agrega monto: $5,000,000 CLP
   - Fecha de cierre estimada: 30 días

3. **Negociación** (Negociación)
   - Colegio responde: "¿Pueden hacer descuento por volumen?"
   - Se actualiza etapa a: **Negociación**
   - Estado: **En Progreso**
   - Se ajusta monto o se agregan notas

4. **Cierre** (Ganada o Perdida)
   - **Si aceptan**: Etapa → **Ganada**, Estado → **Cerrado**
   - **Si rechazan**: Etapa → **Perdida**, Estado → **Cerrado**

---

## 📊 Datos que se Guardan en Strapi

### **Campos de la Oportunidad:**

```json
{
  "nombre": "Libros Matemáticas - Colegio San José",
  "descripcion": "Venta de 500 libros de matemáticas para 3ro básico",
  "monto": 5000000,
  "moneda": "CLP",
  "etapa": "Negotiation",
  "estado": "in-progress",
  "prioridad": "high",
  "fecha_cierre": "2026-02-15",
  "fuente": "Manual",
  "activo": true,
  "contacto": { "id": 123 },  // Relación con Persona
  "propietario": { "id": 456 },  // Relación con Colaborador
  "producto": { "id": 789 }  // Relación con Libro
}
```

---

## 🎨 Visualización

### **Colores y Badges:**

- **Estado:**
  - 🟢 Abierto (verde)
  - 🟡 En Progreso (amarillo)
  - 🔴 Cerrado (rojo)

- **Prioridad:**
  - 🔴 Alta (rojo)
  - 🟡 Media (amarillo)
  - 🟢 Baja (verde)

- **Etapas:**
  - Cada etapa tiene su propia columna en el Pipeline
  - Se pueden mover arrastrando

---

## 🔍 Casos de Uso Comunes

### **1. Seguimiento de Ventas**
- Ver todas las oportunidades activas
- Identificar cuáles están cerca de cerrar
- Priorizar las más importantes

### **2. Análisis de Pipeline**
- Ver cuántas oportunidades hay en cada etapa
- Identificar cuellos de botella
- Predecir ventas futuras

### **3. Gestión de Equipo**
- Ver qué vendedor tiene qué oportunidades
- Distribuir carga de trabajo
- Seguimiento de desempeño

### **4. Reportes**
- Tasa de conversión (Ganadas vs Perdidas)
- Tiempo promedio en cada etapa
- Monto total en pipeline

---

## 🚀 Próximas Funcionalidades (Futuro)

- **Actividades**: Agregar notas, llamadas, reuniones a cada oportunidad
- **Historial**: Ver todos los cambios de etapa y estado
- **Notificaciones**: Alertas cuando una oportunidad está cerca de vencer
- **Métricas**: Dashboard con gráficos y estadísticas
- **Exportar**: Descargar oportunidades a Excel/CSV
- **Plantillas**: Crear oportunidades desde plantillas

---

## 💡 Resumen

**Oportunidad** = Posible venta en proceso

**Etapas** = Fases del proceso de venta (Calificación → Propuesta → Negociación → Ganada/Perdida)

**Estado** = Si está activa o cerrada

**Prioridad** = Qué tan importante/urgente es

**Pipeline** = Vista visual donde puedes mover oportunidades entre etapas

**Objetivo** = Gestionar y seguir todas las ventas potenciales hasta cerrarlas
