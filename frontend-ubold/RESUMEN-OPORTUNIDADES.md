# Resumen: Módulo de Oportunidades CRM

## 🎯 ¿Para qué sirve el módulo de Oportunidades?

El módulo de **Oportunidades** es el núcleo del proceso de ventas en el CRM. Permite gestionar y hacer seguimiento a todas las potenciales ventas desde que se identifican hasta que se cierran (ganadas o perdidas).

## 📊 Funcionalidad Principal

### 1. **Gestión de Ventas Potenciales**
- Registrar oportunidades de negocio con colegios/clientes
- Hacer seguimiento del proceso de venta completo
- Gestionar múltiples oportunidades simultáneamente

### 2. **Seguimiento por Etapas**
Las oportunidades pasan por diferentes etapas:
- **Qualification**: Calificar si el prospecto es viable
- **Proposal Sent**: Propuesta comercial enviada
- **Negotiation**: En negociación activa
- **Won**: Venta ganada ✅
- **Lost**: Oportunidad perdida ❌

### 3. **Información Comercial**
Cada oportunidad contiene:
- **Producto/Servicio**: Qué se está vendiendo
- **Contacto**: Persona responsable en el cliente (relacionado con Persona)
- **Monto**: Valor estimado de la venta
- **Moneda**: USD, CLP, EUR, etc.
- **Prioridad**: Alta, Media, Baja
- **Estado**: Abierta, En progreso, Cerrada
- **Fecha de cierre**: Cuándo se espera cerrar
- **Fuente**: De dónde vino el lead (Referral, Web, LinkedIn, etc.)
- **Propietario**: Ejecutivo comercial responsable (relacionado con Colaborador)

## 🔄 Flujo de Trabajo

```
1. Identificar Oportunidad
   ↓
2. Crear Oportunidad en CRM
   ↓
3. Asignar a Ejecutivo Comercial
   ↓
4. Seguimiento por Etapas (Qualification → Proposal → Negotiation)
   ↓
5. Resultado Final (Won o Lost)
```

## 🎨 Integración con Otros Módulos

### **Pipeline/Embudo** (Vista Kanban)
- Visualizar todas las oportunidades en un tablero Kanban
- Arrastrar y soltar entre etapas
- Ver el estado de todas las oportunidades de un vistazo
- Actualización automática al mover cards

### **Contactos**
- Relacionar oportunidades con contactos (Personas)
- Ver qué oportunidades tiene cada contacto
- Historial de interacciones

### **Colegios**
- Relacionar oportunidades con colegios
- Ver qué colegios tienen oportunidades activas
- Seguimiento por institución

## 💼 Casos de Uso Prácticos

### Ejemplo 1: Nueva Oportunidad
```
Situación: Un colegio muestra interés en comprar la plataforma

Acción:
1. Crear oportunidad "Plataforma Escolar - Colegio San José"
2. Asignar a ejecutivo comercial
3. Establecer monto: $50,000 CLP
4. Etapa inicial: Qualification
5. Prioridad: Alta
6. Fecha cierre estimada: 15 de marzo
```

### Ejemplo 2: Seguimiento
```
Situación: Se envía propuesta comercial

Acción:
1. Actualizar etapa a "Proposal Sent"
2. Actualizar estado a "in-progress"
3. Agregar notas en descripción
4. Actualizar fecha de cierre si cambia
```

### Ejemplo 3: Cierre
```
Situación: El colegio acepta la propuesta

Acción:
1. Mover a etapa "Won" en el Pipeline
2. Actualizar estado a "closed"
3. Registrar fecha de cierre real
4. Opcionalmente, convertir a cliente
```

## 📈 Beneficios

1. **Visibilidad**: Ver todas las oportunidades en un solo lugar
2. **Seguimiento**: No perder ninguna oportunidad de venta
3. **Priorización**: Enfocarse en oportunidades de alta prioridad
4. **Métricas**: Analizar tasa de conversión, tiempo promedio de cierre, etc.
5. **Colaboración**: Asignar oportunidades a ejecutivos específicos
6. **Historial**: Mantener registro de todas las oportunidades (ganadas y perdidas)

## 🔗 Relaciones con Otros Módulos

```
Oportunidad
├── contacto → Persona (quién es el contacto en el cliente)
├── propietario → Intranet-colaboradores (quién gestiona la venta)
└── producto → Producto (opcional, qué se está vendiendo)
```

## 📋 Estado Actual

✅ **Implementado:**
- API routes completas (GET, POST, PUT, DELETE)
- Página de listado con filtros y búsqueda
- Integración con Pipeline (vista Kanban)
- Transformación de datos desde Strapi
- Manejo de errores cuando el content-type no existe

⏳ **Pendiente:**
- Crear el content-type "Oportunidad" en Strapi
- Configurar permisos
- Probar creación/edición desde la UI
- Agregar modales de crear/editar (si no existen)

## 🚀 Próximos Pasos

1. **Crear content-type en Strapi** (usar `PROMPT-STRAPI-PRODUCCION-OPORTUNIDAD.md`)
2. **Configurar permisos** en Strapi
3. **Probar funcionalidad** completa
4. **Agregar modales** de crear/editar si faltan
5. **Integrar con otros módulos** (Leads, Deals, etc.)

## 💡 Resumen en una Frase

**Las Oportunidades permiten gestionar todo el proceso de ventas desde la identificación de un prospecto hasta el cierre (ganado o perdido), con seguimiento por etapas, asignación de responsables y métricas de rendimiento.**
