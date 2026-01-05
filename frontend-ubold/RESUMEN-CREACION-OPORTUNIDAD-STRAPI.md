# Resumen: Content-Type Oportunidad Creado en Strapi

## ✅ Completado

Se creó exitosamente el content-type **"Oportunidad"** en el repositorio de Strapi.

### 📍 Ubicación
- **Repositorio**: https://github.com/Zenn-Dev99/BdEstructura
- **Rama**: `etiquetas-gonza`
- **Commit**: `4c6818c`

### 📁 Archivos Creados/Modificados

1. **Schema**: `strapi/src/api/oportunidad/content-types/oportunidad/schema.json`
2. **Controller**: `strapi/src/api/oportunidad/controllers/oportunidad.ts`
3. **Service**: `strapi/src/api/oportunidad/services/oportunidad.ts`
4. **Routes**: `strapi/src/api/oportunidad/routes/oportunidad.ts`

### 📋 Campos del Schema

#### Campos Básicos
- `nombre` (string, required)
- `descripcion` (text)
- `monto` (decimal, min: 0)
- `moneda` (enum: USD, CLP, EUR, default: USD)
- `fecha_cierre` (date)
- `fuente` (string, default: "Manual")
- `activo` (boolean, required, default: true)

#### Enumeraciones
- **etapa** (required, default: "Qualification")
  - Qualification
  - Proposal Sent
  - Negotiation
  - Won
  - Lost

- **estado** (required, default: "open")
  - open
  - in-progress
  - closed

- **prioridad** (required, default: "medium")
  - low
  - medium
  - high

### 🔗 Relaciones

1. **contacto** (manyToOne → `api::persona.persona`)
   - Relación con Persona (contacto del CRM)

2. **propietario** (manyToOne → `api::colaborador.colaborador`)
   - Relación con Colaborador (usuario interno que es dueño de la oportunidad)

3. **producto** (manyToOne → `api::libro.libro`)
   - Relación opcional con Libro
   - Los productos en Strapi son libros (Product · Libro · Edición)

### 🚀 Próximos Pasos

1. **Desplegar cambios en Strapi**
   - Hacer merge de `etiquetas-gonza` a la rama principal
   - Desplegar en producción (https://strapi.moraleja.cl/admin)

2. **Configurar Permisos en Strapi Admin**
   - Settings → Users & Permissions → Roles
   - Seleccionar rol apropiado
   - Habilitar permisos para "Oportunidad":
     - ✅ find
     - ✅ findOne
     - ✅ create
     - ✅ update
     - ✅ delete

3. **Verificar que Funciona**
   - Crear una oportunidad de prueba en Strapi Admin
   - Verificar que aparece en `/crm/opportunities`
   - Verificar que aparece en `/crm/pipeline`
   - Probar drag & drop en Pipeline

4. **Relación con Libro**
   - La relación "producto" apunta correctamente a `api::libro.libro`
   - Los libros se pueden seleccionar desde el admin de Strapi

### 📝 Notas Técnicas

- El content-type usa `draftAndPublish: true` (sistema de borradores de Strapi)
- Todos los controllers, services y routes usan `factories.createCore*` (comportamiento estándar de Strapi)
- El target correcto para colaboradores es `api::colaborador.colaborador` (no `intranet-colaboradores`)

### ✅ Estado Actual

- ✅ Schema creado con todos los campos
- ✅ Relaciones configuradas correctamente
- ✅ Controllers, services y routes básicos creados
- ✅ Commit realizado
- ✅ Push a rama `etiquetas-gonza` completado
- ✅ Relación producto corregida a `api::libro.libro`
- ⏳ Pendiente: Merge a producción y configuración de permisos
