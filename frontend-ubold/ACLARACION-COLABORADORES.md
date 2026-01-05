# Aclaración: ¿Colaborador o Colaboradores?

## 🔍 Diferencia entre Endpoint API y Content-Type

En Strapi hay una diferencia importante:

### 1. **Endpoint de la API** (lo que usas en las URLs)
- **Endpoint**: `/api/colaboradores` (siempre en **plural**)
- Esto es lo que usas en las llamadas fetch/strapiClient
- Ejemplo: `strapiClient.get('/api/colaboradores')`

### 2. **Nombre del Content-Type** (lo que usas en las relaciones)
- **Content-Type Name**: Puede ser `colaborador`, `colaboradores`, o `intranet-colaboradores`
- Esto es lo que usas en el `target` de las relaciones
- Ejemplo: `"target": "api::colaborador.colaborador"`

## 📋 Cómo Funciona en Strapi

Strapi automáticamente genera el endpoint en plural basado en el nombre del content-type:

| Nombre del Content-Type | Endpoint API | Target en Relaciones |
|------------------------|--------------|---------------------|
| `colaborador` (singular) | `/api/colaboradores` | `api::colaborador.colaborador` |
| `colaboradores` (plural) | `/api/colaboradores` | `api::colaboradores.colaboradores` |
| `intranet-colaboradores` | `/api/intranet-colaboradores` | `api::intranet-colaboradores.intranet-colaboradores` |

## 🔍 Cómo Verificar el Nombre Exacto

### Opción 1: Desde Strapi Admin
1. Ve a https://strapi.moraleja.cl/admin
2. **Content-Type Builder**
3. Busca el content-type de colaboradores
4. Haz click en él
5. Mira el **API ID** o **UID** que aparece
   - Si dice: `api::colaborador.colaborador` → usa `api::colaborador.colaborador`
   - Si dice: `api::colaboradores.colaboradores` → usa `api::colaboradores.colaboradores`
   - Si dice: `api::intranet-colaboradores.intranet-colaboradores` → usa ese

### Opción 2: Desde el Endpoint
El endpoint que usas es `/api/colaboradores`, pero esto no te dice el nombre exacto del content-type.

## ✅ Lo Más Probable

Basado en el código que veo:
- **Endpoint usado**: `/api/colaboradores` (plural)
- **Nombre más probable del content-type**: 
  - `colaborador` (singular) → Target: `api::colaborador.colaborador`
  - O `intranet-colaboradores` → Target: `api::intranet-colaboradores.intranet-colaboradores`

## 🎯 Para la Relación en Oportunidad

En el schema de Oportunidad, la relación `propietario` debe usar el **nombre del content-type**, no el endpoint:

```json
"propietario": {
  "type": "relation",
  "relation": "manyToOne",
  "target": "api::colaborador.colaborador"  // ← Nombre del content-type, no el endpoint
}
```

O si el nombre es diferente:
```json
"propietario": {
  "type": "relation",
  "relation": "manyToOne",
  "target": "api::intranet-colaboradores.intranet-colaboradores"
}
```

## 💡 Resumen

- **Endpoint API** = `/api/colaboradores` (plural) → Para hacer fetch/requests
- **Content-Type Name** = `colaborador` o `intranet-colaboradores` → Para relaciones en schema
- **Target en relaciones** = `api::[nombre-content-type].[nombre-content-type]`

**La confusión viene de que:**
- El endpoint siempre es plural (`/api/colaboradores`)
- Pero el nombre del content-type puede ser singular (`colaborador`) o plural (`colaboradores`) o con prefijo (`intranet-colaboradores`)

**Solución:** Verifica en Strapi Admin el nombre exacto del content-type y úsalo en el `target` de la relación.
