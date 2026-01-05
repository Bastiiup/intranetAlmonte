# Prompt para Cursor/IA: Crear Content-Type "Oportunidad" en Strapi

## Prompt Completo

```
Necesito crear un content-type en Strapi v4 llamado "Oportunidad" (singular) para un sistema CRM.

Por favor, crea el content-type con los siguientes campos:

**Campos Básicos:**

1. **nombre** (Text - Short text)
   - Required: Sí
   - Unique: No
   - Nombre del campo: "nombre"
   - Tipo: Text (Short text)

2. **descripcion** (Text - Long text)
   - Required: No
   - Unique: No
   - Nombre del campo: "descripcion"
   - Tipo: Text (Long text)

3. **monto** (Number - Decimal)
   - Required: No
   - Unique: No
   - Nombre del campo: "monto"
   - Tipo: Number (Decimal)
   - Min: 0
   - Max: (vacío)

4. **moneda** (Enumeration)
   - Required: No
   - Nombre del campo: "moneda"
   - Tipo: Enumeration
   - Values (uno por línea):
     USD
     CLP
     EUR
   - Default value: USD

5. **etapa** (Enumeration)
   - Required: Sí
   - Nombre del campo: "etapa"
   - Tipo: Enumeration
   - Values (uno por línea):
     Qualification
     Proposal Sent
     Negotiation
     Won
     Lost
   - Default value: Qualification

6. **estado** (Enumeration)
   - Required: Sí
   - Nombre del campo: "estado"
   - Tipo: Enumeration
   - Values (uno por línea):
     open
     in-progress
     closed
   - Default value: open

7. **prioridad** (Enumeration)
   - Required: Sí
   - Nombre del campo: "prioridad"
   - Tipo: Enumeration
   - Values (uno por línea):
     low
     medium
     high
   - Default value: medium

8. **fecha_cierre** (Date)
   - Required: No
   - Nombre del campo: "fecha_cierre"
   - Tipo: Date
   - Date type: Date only (no time)

9. **fuente** (Text - Short text)
   - Required: No
   - Unique: No
   - Nombre del campo: "fuente"
   - Tipo: Text (Short text)
   - Default value: "Manual"

10. **activo** (Boolean)
    - Required: Sí
    - Nombre del campo: "activo"
    - Tipo: Boolean
    - Default value: true

**Relaciones:**

11. **producto** (Relation - Many-to-one)
    - Nombre del campo: "producto"
    - Tipo: Relation
    - Relation type: Many-to-one (opcional, puede no existir el content-type Producto aún)
    - Target: Si existe "Producto", conectarlo. Si no, dejarlo sin target por ahora.

12. **contacto** (Relation - Many-to-one)
    - Nombre del campo: "contacto"
    - Tipo: Relation
    - Relation type: Many-to-one
    - Target: "Persona" (este content-type ya existe)
    - Required: No

13. **propietario** (Relation - Many-to-one)
    - Nombre del campo: "propietario"
    - Tipo: Relation
    - Relation type: Many-to-one
    - Target: "Intranet-colaboradores" (este content-type ya existe)
    - Required: No

**Instrucciones adicionales:**

- El nombre del content-type debe ser exactamente "Oportunidad" (singular, con mayúscula inicial)
- Después de crear todos los campos, guardar el content-type
- Configurar permisos para el rol "Authenticated" o "Public" (según tu configuración):
  - find: ✅
  - findOne: ✅
  - create: ✅
  - update: ✅
  - delete: ✅

Por favor, proporciona:
1. Los pasos exactos a seguir en la interfaz de Strapi
2. O si tienes acceso a la API/configuración, el JSON del schema del content-type
3. Cualquier código o configuración necesaria
```

## Prompt Simplificado (Versión Corta)

```
Crea un content-type en Strapi v4 llamado "Oportunidad" con estos campos:

Campos:
- nombre (Text, required)
- descripcion (Long text)
- monto (Number/Decimal, min: 0)
- moneda (Enum: USD, CLP, EUR, default: USD)
- etapa (Enum: Qualification, Proposal Sent, Negotiation, Won, Lost, required, default: Qualification)
- estado (Enum: open, in-progress, closed, required, default: open)
- prioridad (Enum: low, medium, high, required, default: medium)
- fecha_cierre (Date, date only)
- fuente (Text, default: "Manual")
- activo (Boolean, required, default: true)

Relaciones:
- producto (Many-to-one, opcional, target: Producto si existe)
- contacto (Many-to-one, target: Persona)
- propietario (Many-to-one, target: Intranet-colaboradores)

Configura permisos: find, findOne, create, update, delete para Authenticated/Public.
```

## Prompt para Schema JSON (Si tienes acceso directo)

```
Genera el schema JSON para Strapi v4 del content-type "Oportunidad" con estos campos:

Campos requeridos:
- nombre: Text (required)
- descripcion: Long text
- monto: Decimal (min: 0)
- moneda: Enumeration (USD, CLP, EUR, default: USD)
- etapa: Enumeration (Qualification, Proposal Sent, Negotiation, Won, Lost, required, default: Qualification)
- estado: Enumeration (open, in-progress, closed, required, default: open)
- prioridad: Enumeration (low, medium, high, required, default: medium)
- fecha_cierre: Date (date only)
- fuente: Text (default: "Manual")
- activo: Boolean (required, default: true)

Relaciones:
- producto: Many-to-one → Producto (opcional)
- contacto: Many-to-one → Persona
- propietario: Many-to-one → Intranet-colaboradores

Proporciona el schema.json completo que puedo usar en Strapi.
```

## Cómo Usar Estos Prompts

1. **En Cursor/Claude/ChatGPT:**
   - Copia el prompt completo o simplificado
   - Pégalo en el chat
   - El asistente te guiará paso a paso

2. **Si tienes acceso a la API de Strapi:**
   - Usa el prompt del schema JSON
   - El asistente generará el JSON que puedes usar directamente

3. **Para configuración manual:**
   - Sigue la guía `CREAR-CONTENT-TYPE-OPORTUNIDAD.md`
   - O usa el prompt completo como referencia

## Notas Importantes

- El nombre debe ser **exactamente** "Oportunidad" (singular, mayúscula inicial)
- Los nombres de campos deben coincidir **exactamente** con los del código
- Las relaciones requieren que los content-types target existan primero
- Después de crear, configura los permisos en Settings → Roles
