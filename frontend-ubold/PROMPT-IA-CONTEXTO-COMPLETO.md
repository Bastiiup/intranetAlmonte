# Prompt para IA con Contexto Completo del Proyecto

## Prompt Optimizado (Copia y Pega Directo)

```
Necesito crear un content-type en Strapi v4 para el CRM. Ya conozco la estructura del proyecto y los content-types existentes.

**Contexto del Proyecto:**
- Strapi desplegado en: https://strapi.moraleja.cl/admin
- Ya existen estos content-types que uso como referencia:
  - `api::persona.persona` (Persona)
  - `api::intranet-colaboradores.intranet-colaboradores` (Colaboradores - usuarios internos)
  - `api::colegio.colegio` (Colegio)
- El frontend ya está implementado y espera este content-type
- Las API routes ya están creadas en `/api/crm/oportunidades`

**Content-Type a Crear: "Oportunidad"**

**Campos requeridos:**

1. nombre (string, required)
2. descripcion (text)
3. monto (decimal, min: 0)
4. moneda (enum: USD, CLP, EUR, default: USD)
5. etapa (enum: Qualification, Proposal Sent, Negotiation, Won, Lost, required, default: Qualification)
6. estado (enum: open, in-progress, closed, required, default: open)
7. prioridad (enum: low, medium, high, required, default: medium)
8. fecha_cierre (date, date only)
9. fuente (string, default: "Manual")
10. activo (boolean, required, default: true)

**Relaciones:**

11. contacto (manyToOne → api::persona.persona)
12. propietario (manyToOne → api::intranet-colaboradores.intranet-colaboradores)
13. producto (manyToOne, opcional - puede no existir el content-type Producto)

**Instrucciones:**

1. Crear el content-type "Oportunidad" en Strapi Admin
2. Agregar todos los campos en el orden especificado
3. Para las enumeraciones, escribir los valores EXACTAMENTE como se muestra (respetar mayúsculas, espacios, guiones)
4. Configurar las relaciones con los targets exactos mencionados
5. Guardar el content-type
6. Configurar permisos: find, findOne, create, update, delete para el rol apropiado

**Schema JSON de Referencia (si prefieres crearlo directamente):**

El schema debe tener esta estructura. Solo necesito que lo crees en Strapi Admin o me proporciones el JSON completo listo para usar.

Por favor, proporciona:
- Los pasos exactos en Strapi Admin, O
- El schema.json completo listo para copiar/pegar
```

## Prompt Ultra Simplificado (Versión Corta)

```
Crear content-type "Oportunidad" en Strapi v4 (https://strapi.moraleja.cl/admin) con:

Campos: nombre(string,req), descripcion(text), monto(decimal,min:0), moneda(enum:USD,CLP,EUR,default:USD), etapa(enum:Qualification,Proposal Sent,Negotiation,Won,Lost,req,default:Qualification), estado(enum:open,in-progress,closed,req,default:open), prioridad(enum:low,medium,high,req,default:medium), fecha_cierre(date), fuente(string,default:Manual), activo(boolean,req,default:true)

Relaciones: contacto(manyToOne→api::persona.persona), propietario(manyToOne→api::intranet-colaboradores.intranet-colaboradores), producto(manyToOne,opcional)

Configurar permisos: find,findOne,create,update,delete

Proporciona pasos en Strapi Admin o schema.json completo.
```

## Prompt para Schema JSON Directo

```
Genera el schema.json completo para Strapi v4 del content-type "Oportunidad" con estos campos y relaciones. El schema debe ser válido y listo para usar en strapi/src/api/oportunidad/content-types/oportunidad/schema.json

Campos:
- nombre: string, required
- descripcion: text
- monto: decimal, min: 0
- moneda: enumeration (USD, CLP, EUR), default: USD
- etapa: enumeration (Qualification, Proposal Sent, Negotiation, Won, Lost), required, default: Qualification
- estado: enumeration (open, in-progress, closed), required, default: open
- prioridad: enumeration (low, medium, high), required, default: medium
- fecha_cierre: date (date only)
- fuente: string, default: "Manual"
- activo: boolean, required, default: true

Relaciones:
- contacto: manyToOne → api::persona.persona
- propietario: manyToOne → api::intranet-colaboradores.intranet-colaboradores
- producto: manyToOne → api::producto.producto (opcional, puede no existir)

Proporciona el JSON completo y válido para Strapi v4.
```

## Instrucciones de Uso

1. **Copia el prompt que prefieras** (completo, simplificado, o schema JSON)
2. **Pégalo en la otra IA** (Cursor/Claude/ChatGPT que tiene contexto)
3. **La IA te dará**:
   - Pasos exactos en Strapi Admin, O
   - El schema.json completo listo para usar

## Lo que la IA Debe Saber

Si la otra IA ya conoce el proyecto, debería saber:
- ✅ La estructura de Strapi v4
- ✅ Los content-types existentes (Persona, intranet-colaboradores, Colegio)
- ✅ Cómo se nombran los content-types en este proyecto
- ✅ La estructura de archivos de Strapi
- ✅ Cómo crear content-types en Strapi Admin

Solo necesita:
- Los campos específicos de Oportunidad
- Las relaciones exactas
- El nombre del content-type
