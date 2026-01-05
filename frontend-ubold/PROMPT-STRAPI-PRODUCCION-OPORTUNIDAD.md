# Prompt para IA: Crear Content-Type "Oportunidad" en Strapi Producción

## Prompt Completo para Cursor/Claude/ChatGPT

```
Necesito crear un content-type en Strapi v4 que está desplegado en producción en https://strapi.moraleja.cl/admin

El content-type se llama "Oportunidad" (singular, con mayúscula inicial) y es para un sistema CRM.

**Contexto:**
- Strapi está en producción: https://strapi.moraleja.cl/admin
- Ya existen estos content-types: Persona, Intranet-colaboradores, Colegio
- Necesito crear el content-type completo con todos sus campos y relaciones

**Campos a crear (en este orden):**

1. **nombre** 
   - Tipo: Text (Short text)
   - Required: ✅ Sí
   - Unique: ❌ No

2. **descripcion**
   - Tipo: Text (Long text)
   - Required: ❌ No

3. **monto**
   - Tipo: Number (Decimal)
   - Required: ❌ No
   - Min: 0
   - Max: (dejar vacío)

4. **moneda**
   - Tipo: Enumeration
   - Required: ❌ No
   - Values (uno por línea):
     USD
     CLP
     EUR
   - Default value: USD

5. **etapa**
   - Tipo: Enumeration
   - Required: ✅ Sí
   - Values (uno por línea):
     Qualification
     Proposal Sent
     Negotiation
     Won
     Lost
   - Default value: Qualification

6. **estado**
   - Tipo: Enumeration
   - Required: ✅ Sí
   - Values (uno por línea):
     open
     in-progress
     closed
   - Default value: open

7. **prioridad**
   - Tipo: Enumeration
   - Required: ✅ Sí
   - Values (uno por línea):
     low
     medium
     high
   - Default value: medium

8. **fecha_cierre**
   - Tipo: Date
   - Required: ❌ No
   - Date type: Date only (sin hora)

9. **fuente**
   - Tipo: Text (Short text)
   - Required: ❌ No
   - Default value: Manual

10. **activo**
    - Tipo: Boolean
    - Required: ✅ Sí
    - Default value: true

**Relaciones a crear:**

11. **producto**
    - Tipo: Relation
    - Relation type: Many-to-one
    - Target: (dejar sin target por ahora, es opcional)
    - Required: ❌ No

12. **contacto**
    - Tipo: Relation
    - Relation type: Many-to-one
    - Target: Persona (este content-type ya existe)
    - Required: ❌ No

13. **propietario**
    - Tipo: Relation
    - Relation type: Many-to-one
    - Target: Intranet-colaboradores (este content-type ya existe)
    - Required: ❌ No

**Pasos a seguir:**

1. Ir a Content-Type Builder en https://strapi.moraleja.cl/admin
2. Click en "+ Create new collection type"
3. Nombre: "Oportunidad" (exactamente así, singular, mayúscula inicial)
4. Click en "Continue"
5. Agregar cada campo en el orden especificado arriba
6. Para cada campo, seguir las especificaciones exactas
7. Para las enumeraciones, asegurarse de escribir los valores exactamente como se muestran (respetar mayúsculas y espacios)
8. Para las relaciones, seleccionar el target correcto de la lista desplegable
9. Al finalizar, hacer click en "Save" en la esquina superior derecha
10. Esperar a que Strapi reinicie

**Después de crear el content-type:**

11. Ir a Settings → Users & Permissions plugin → Roles
12. Seleccionar el rol apropiado (Authenticated, Public, o el que uses)
13. Buscar la sección "Oportunidad" en los permisos
14. Habilitar estos permisos:
    - ✅ find
    - ✅ findOne
    - ✅ create
    - ✅ update
    - ✅ delete
15. Click en "Save"

**Verificación:**

16. Ir a Content Manager → Oportunidad
17. Verificar que el content-type aparece correctamente
18. Opcionalmente, crear una oportunidad de prueba

**IMPORTANTE:**
- El nombre del content-type debe ser EXACTAMENTE "Oportunidad" (singular, mayúscula inicial)
- Los nombres de los campos deben coincidir EXACTAMENTE con los especificados (nombre, descripcion, monto, etc.)
- Los valores de las enumeraciones deben escribirse EXACTAMENTE como se muestran (respetar mayúsculas, espacios, guiones)
- Las relaciones requieren que los content-types target existan (Persona e Intranet-colaboradores ya existen)

Por favor, proporciona:
1. Una guía paso a paso detallada para crear esto en la interfaz de Strapi
2. O si es posible, el schema JSON completo que puedo usar
3. Cualquier advertencia o consideración especial para producción
```

## Prompt Simplificado (Versión Rápida)

```
Crea un content-type en Strapi v4 en producción (https://strapi.moraleja.cl/admin) llamado "Oportunidad" con:

Campos:
- nombre (Text, required)
- descripcion (Long text)
- monto (Decimal, min: 0)
- moneda (Enum: USD, CLP, EUR, default: USD)
- etapa (Enum: Qualification, Proposal Sent, Negotiation, Won, Lost, required, default: Qualification)
- estado (Enum: open, in-progress, closed, required, default: open)
- prioridad (Enum: low, medium, high, required, default: medium)
- fecha_cierre (Date, date only)
- fuente (Text, default: "Manual")
- activo (Boolean, required, default: true)

Relaciones:
- producto (Many-to-one, opcional)
- contacto (Many-to-one → Persona)
- propietario (Many-to-one → Intranet-colaboradores)

Configurar permisos: find, findOne, create, update, delete.

Proporciona pasos exactos para la interfaz de Strapi o el schema JSON.
```

## Prompt para Schema JSON (Si tienes acceso directo al código)

```
Genera el schema.json completo para Strapi v4 del content-type "Oportunidad" con estos campos:

{
  "kind": "collectionType",
  "collectionName": "oportunidades",
  "info": {
    "singularName": "oportunidad",
    "pluralName": "oportunidades",
    "displayName": "Oportunidad"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    // Agregar aquí todos los campos especificados
  }
}

Campos:
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

Proporciona el schema.json completo y válido para Strapi v4.
```

## Instrucciones de Uso

1. **Para Cursor/Claude/ChatGPT:**
   - Copia el "Prompt Completo" o "Prompt Simplificado"
   - Pégalo en el chat
   - La IA te guiará paso a paso

2. **Si tienes acceso SSH al servidor:**
   - Usa el "Prompt para Schema JSON"
   - La IA generará el JSON que puedes copiar directamente
   - Guárdalo en `src/api/oportunidad/content-types/oportunidad/schema.json`

3. **Para creación manual:**
   - Sigue la guía `CREAR-CONTENT-TYPE-OPORTUNIDAD.md`
   - O usa el prompt como referencia mientras trabajas en la interfaz

## Consideraciones para Producción

⚠️ **Importante:**
- Hacer backup antes de crear el content-type
- Verificar que los content-types relacionados (Persona, Intranet-colaboradores) existan
- Configurar permisos correctamente para evitar problemas de seguridad
- Probar crear una oportunidad de prueba antes de usar en producción
