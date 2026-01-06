# Guía de Pruebas - Módulo de Actividades CRM

## ¿Qué son las Actividades?

Las **Actividades** son registros que documentan todas las interacciones y eventos relacionados con entidades del CRM (Leads, Oportunidades, Contactos, Colegios). Funcionan como un **historial de acciones** que permite:

1. **Rastrear el historial completo** de cada entidad del CRM
2. **Registrar interacciones** (llamadas, emails, reuniones, notas)
3. **Documentar cambios de estado** automáticamente
4. **Asignar tareas y recordatorios** para seguimiento
5. **Ver quién hizo qué y cuándo** (auditoría)

## Tipos de Actividades

- **Llamada** (`llamada`): Registro de llamadas telefónicas
- **Email** (`email`): Registro de correos electrónicos enviados/recibidos
- **Reunión** (`reunion`): Reuniones presenciales o virtuales
- **Nota** (`nota`): Notas generales (por defecto)
- **Cambio de Estado** (`cambio_estado`): Cambios automáticos de estado
- **Tarea** (`tarea`): Tareas pendientes
- **Recordatorio** (`recordatorio`): Recordatorios programados
- **Otro** (`otro`): Otros tipos de actividades

## Estados de Actividades

- **Completada** (`completada`): Actividad finalizada
- **Pendiente** (`pendiente`): Actividad por hacer (por defecto)
- **En Progreso** (`en_progreso`): Actividad en curso
- **Cancelada** (`cancelada`): Actividad cancelada

## ¿Cuándo se Crean Actividades Automáticamente?

Las actividades se crean automáticamente cuando:

1. **Se crea un Lead** → Se crea una actividad tipo "nota" con título "Lead creado: [nombre]"
2. **Se crea una Oportunidad** → Se crea una actividad tipo "nota" con título "Oportunidad creada: [nombre]"

### Ubicación del Código

- **Leads**: `src/app/api/crm/leads/route.ts` (línea ~247)
- **Oportunidades**: `src/app/api/crm/oportunidades/route.ts` (línea ~222)

## Cómo Probar las Actividades

### Prueba 1: Crear un Lead y Verificar Actividad Automática

1. **Ir a** `/crm/leads`
2. **Hacer clic en** "Nuevo Lead"
3. **Completar el formulario:**
   - Nombre: "Prueba Actividades"
   - Email: "prueba@test.com"
   - Empresa: "Test Company"
   - Monto estimado: 10000
4. **Guardar el lead**
5. **Ir a** `/crm/activities`
6. **Verificar que aparece una actividad:**
   - Título: "Lead creado: Prueba Actividades"
   - Tipo: "nota"
   - Estado: "completada"
   - Relacionado con: El lead recién creado

**Logs a revisar en consola:**
```
[Activity Helper] 📝 CREANDO ACTIVIDAD AUTOMÁTICA
[Activity Helper] ✅ ACTIVIDAD CREADA EXITOSAMENTE
```

### Prueba 2: Crear una Oportunidad y Verificar Actividad Automática

1. **Ir a** `/crm/opportunities`
2. **Hacer clic en** "Nueva Oportunidad"
3. **Completar el formulario:**
   - Nombre: "Prueba Oportunidad"
   - Monto: 50000
   - Etapa: "qualification"
4. **Guardar la oportunidad**
5. **Ir a** `/crm/activities`
6. **Verificar que aparece una actividad:**
   - Título: "Oportunidad creada: Prueba Oportunidad"
   - Tipo: "nota"
   - Estado: "completada"
   - Relacionado con: La oportunidad recién creada

### Prueba 3: Crear Actividad Manualmente

1. **Ir a** `/crm/activities`
2. **Hacer clic en** "Nueva Actividad"
3. **Completar el formulario:**
   - Tipo: "llamada"
   - Título: "Llamada de seguimiento"
   - Descripción: "Cliente interesado en producto X"
   - Fecha: (seleccionar fecha)
   - Estado: "completada"
   - Relacionado con: Seleccionar un lead/oportunidad/contacto
4. **Guardar**
5. **Verificar que aparece en la lista** con el tipo "llamada" y el icono de teléfono

### Prueba 4: Verificar Logs Detallados

1. **Abrir la consola del navegador** (F12)
2. **Crear un lead o oportunidad**
3. **Buscar en los logs:**
   ```
   [Activity Helper] 📝 CREANDO ACTIVIDAD AUTOMÁTICA
   [Activity Helper] 📋 Datos de entrada:
   [Activity Helper] 🔗 Relaciones:
   [Activity Helper] 📤 Payload que se enviará a Strapi:
   [Activity Helper] ✅ ACTIVIDAD CREADA EXITOSAMENTE
   ```

### Prueba 5: Verificar Agrupación por Fecha

1. **Crear varias actividades** en diferentes fechas
2. **Ir a** `/crm/activities`
3. **Verificar que las actividades están agrupadas por fecha:**
   - Cada fecha tiene su propio encabezado
   - Las actividades más recientes aparecen primero
   - Cada actividad muestra la hora

### Prueba 6: Verificar Relaciones

1. **Crear un lead** llamado "Lead de Prueba"
2. **Ir a** `/crm/activities`
3. **Buscar la actividad** "Lead creado: Lead de Prueba"
4. **Verificar que muestra:**
   - "Relacionado con Lead de Prueba (lead)"
   - El nombre del lead aparece en la descripción

## Logs Disponibles para Análisis

### Logs en el Helper (`activity-helper.ts`)

**Al crear actividad:**
```
[Activity Helper] 📝 CREANDO ACTIVIDAD AUTOMÁTICA
  - Datos de entrada (título, tipo, estado, fecha)
  - Relaciones (contacto, lead, oportunidad, colegio, creado_por)
  - Payload completo que se envía a Strapi
```

**Al crear exitosamente:**
```
[Activity Helper] ✅ ACTIVIDAD CREADA EXITOSAMENTE
  - ID de la actividad creada
  - Detalles completos
  - Relaciones establecidas
  - Respuesta de Strapi
```

**Al fallar:**
```
[Activity Helper] ❌ ERROR AL CREAR ACTIVIDAD
  - Mensaje de error
  - Status code
  - Payload que causó el error
  - Soluciones sugeridas según el tipo de error
```

### Logs en la Página (`activities/page.tsx`)

**Al cargar actividades:**
```
[Activities Page] ✅ ACTIVIDADES CARGADAS
  - Total de actividades
  - Actividades transformadas
  - Tipos de actividades (conteo)
  - Actividades agrupadas por fecha
```

## Errores Comunes y Soluciones

### Error: "Content-type Actividad no existe"
**Causa:** El content-type no está creado en Strapi
**Solución:** Crear el content-type usando el prompt en `PROMPT-CURSOR-CREAR-ACTIVIDADES-Y-CAMPAÑAS-STRAPI.md`

### Error: "Permisos insuficientes (403)"
**Causa:** Los permisos no están configurados en Strapi
**Solución:** 
1. Ir a Strapi Admin → Settings → Users & Permissions → Roles
2. Seleccionar el rol apropiado
3. Habilitar: find, findOne, create, update, delete para "Actividad"

### Error: "Colaborador no existe"
**Causa:** El ID del colaborador no existe en Strapi
**Solución:** 
1. Verificar que el colaborador existe en Strapi
2. O omitir `creado_por` (es opcional)
3. La actividad se puede crear sin colaborador

### Error: "fecha must be defined"
**Causa:** El código no está enviando la fecha
**Solución:** El código debería enviar fecha automáticamente. Si persiste, verificar logs.

## Verificación de Funcionamiento

### Checklist de Verificación

- [ ] Las actividades se crean automáticamente al crear un lead
- [ ] Las actividades se crean automáticamente al crear una oportunidad
- [ ] Se pueden crear actividades manualmente desde `/crm/activities`
- [ ] Las actividades se muestran agrupadas por fecha
- [ ] Las actividades muestran las relaciones correctamente
- [ ] Los logs aparecen en la consola al crear actividades
- [ ] Los iconos y colores corresponden al tipo de actividad
- [ ] Los estados se muestran con badges de colores

## Endpoints de la API

- **GET** `/api/crm/activities` - Listar actividades
- **POST** `/api/crm/activities` - Crear actividad
- **GET** `/api/crm/activities/[id]` - Obtener una actividad
- **PUT** `/api/crm/activities/[id]` - Actualizar actividad
- **DELETE** `/api/crm/activities/[id]` - Eliminar actividad

## Archivos Relacionados

- **Helper**: `src/lib/crm/activity-helper.ts`
- **API Routes**: `src/app/api/crm/activities/route.ts`
- **Página**: `src/app/(admin)/(apps)/crm/activities/page.tsx`
- **Modal**: `src/app/(admin)/(apps)/crm/activities/components/AddActivityModal.tsx`
- **Tipos**: `src/app/(admin)/(apps)/crm/activities/data.ts`
