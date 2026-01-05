# Prompt para Crear Content-Type "Lead" en Strapi

## Contexto del Proyecto

Estás trabajando en un proyecto Strapi v5 que es el backend de un CRM para una empresa de venta de libros educativos a colegios. El proyecto ya tiene los siguientes content-types:

- **Persona**: Contactos/personas con emails, teléfonos, trayectorias
- **Colegio**: Colegios con información completa
- **Oportunidad**: Oportunidades de venta con etapas, montos, relaciones
- **Intranet-colaboradores**: Colaboradores/vendedores del sistema
- **Libro**: Productos/libros que se venden

## Tarea

Crear un nuevo content-type llamado **"Lead"** (singular, API ID: `api::lead.lead`) que represente prospectos iniciales que pueden convertirse en Oportunidades.

## Schema del Content-Type "Lead"

### Campos Básicos

1. **nombre** (Text, required)
   - Nombre del contacto principal del lead
   - Ejemplo: "Juan Pérez"

2. **email** (Email)
   - Email del contacto
   - Ejemplo: "juan.perez@colegiosanjose.cl"

3. **telefono** (Text)
   - Teléfono del contacto
   - Ejemplo: "+56 9 1234 5678"

4. **empresa** (Text)
   - Nombre de la empresa/colegio
   - Ejemplo: "Colegio San José"

5. **monto_estimado** (Number, min: 0)
   - Monto estimado de la posible venta
   - Ejemplo: 500000

6. **etiqueta** (Enum, required, default: "baja")
   - Clasificación del lead por calidad
   - Valores: "baja" (Cold Lead), "media" (Prospect), "alta" (Hot Lead)

7. **estado** (Enum, required, default: "in-progress")
   - Estado actual del lead en el proceso
   - Valores: "in-progress", "proposal-sent", "follow-up", "pending", "negotiation", "rejected"

8. **fuente** (Text, default: "Manual")
   - Origen del lead
   - Ejemplos: "Manual", "Web", "Feria", "Referencia", "Llamada fría", "Redes sociales"

9. **fecha_creacion** (Date, required)
   - Fecha en que se creó el lead
   - Se puede usar `createdAt` automático de Strapi

10. **activo** (Boolean, required, default: true)
    - Para soft delete
    - Si es false, el lead está inactivo/eliminado

### Relaciones

1. **asignado_a** (manyToOne → Intranet-colaboradores)
   - Vendedor/colaborador asignado al lead
   - Campo: `asignado_a`
   - Target: `api::intranet-colaborador.intranet-colaborador`

2. **relacionado_con_persona** (manyToOne → Persona, optional)
   - Si el lead ya existe como Persona en el sistema
   - Campo: `relacionado_con_persona`
   - Target: `api::persona.persona`

3. **relacionado_con_colegio** (manyToOne → Colegio, optional)
   - Si el lead es de un colegio que ya existe en el sistema
   - Campo: `relacionado_con_colegio`
   - Target: `api::colegio.colegio`

### Campos Adicionales (Opcionales)

11. **notas** (Rich Text)
    - Notas adicionales sobre el lead
    - Información de seguimiento, observaciones, etc.

12. **fecha_proximo_seguimiento** (DateTime, optional)
    - Fecha programada para el próximo seguimiento
    - Útil para recordatorios

## Estructura de Archivos Esperada

```
strapi/src/api/lead/
├── content-types/
│   └── lead/
│       └── schema.json
├── controllers/
│   └── lead.ts
├── services/
│   └── lead.ts
└── routes/
    └── lead.ts
```

## Instrucciones Específicas

1. **Nombre del content-type:**
   - Display name: "Lead"
   - API ID: `api::lead.lead`
   - Collection name: "leads"

2. **Permisos:**
   - Asegurar que los permisos estén configurados para:
     - find (listar)
     - findOne (ver detalle)
     - create (crear)
     - update (actualizar)
     - delete (eliminar)

3. **TypeScript (si aplica):**
   - Si hay errores de TypeScript en los factories, usar `as any`:
     ```typescript
     factories.createCoreController('api::lead.lead' as any)
     factories.createCoreService('api::lead.lead' as any)
     factories.createCoreRouter('api::lead.lead' as any)
     ```

4. **Validaciones:**
   - `nombre` es requerido
   - `etiqueta` debe ser uno de los valores del enum
   - `estado` debe ser uno de los valores del enum
   - `monto_estimado` debe ser >= 0

5. **Relaciones:**
   - `asignado_a` debe apuntar a `api::intranet-colaborador.intranet-colaborador`
   - `relacionado_con_persona` debe apuntar a `api::persona.persona`
   - `relacionado_con_colegio` debe apuntar a `api::colegio.colegio`

## Ejemplo de Uso

Un lead típico sería:
- nombre: "Juan Pérez"
- email: "juan.perez@colegiosanjose.cl"
- telefono: "+56 9 1234 5678"
- empresa: "Colegio San José"
- monto_estimado: 500000
- etiqueta: "media" (Prospect)
- estado: "in-progress"
- fuente: "Feria del Libro 2025"
- asignado_a: [ID de colaborador]
- activo: true

## Notas Importantes

- El content-type debe seguir el mismo patrón que "Oportunidad"
- Usar `documentId` como identificador principal (Strapi v5)
- Los campos `createdAt` y `updatedAt` son automáticos
- El campo `activo` permite soft delete sin eliminar datos

## Verificación

Después de crear el content-type, verificar:
- [ ] El content-type aparece en Strapi Admin
- [ ] Los campos están correctamente configurados
- [ ] Las relaciones funcionan correctamente
- [ ] Los permisos están configurados
- [ ] Se puede crear un lead de prueba desde Strapi Admin
