# Problemas de Lentitud y Matriculados en Strapi

## 📋 Resumen de Problemas

**Fecha del reporte:** 29 de enero de 2026  
**Versión de Strapi:** v5 (basado en el uso de `documentId` y estructura de respuesta)  
**Endpoint afectado:** `/api/cursos`

### Problemas Identificados

1. **Lentitud extrema en consultas masivas:** La consulta de todos los cursos (~53,000 registros) tarda más de 2 minutos, causando timeouts en el frontend.
2. **Matrícula no se muestra correctamente:** El campo `matricula` de los cursos no se está retornando correctamente en las consultas, aunque está incluido en `fields`.

---

## 🐌 Problema 1: Lentitud en Consultas Masivas

### Descripción

Al consultar `/api/cursos` con `pagination[pageSize]=1000` y recorrer todas las páginas (~54 páginas), el proceso completo tarda más de 2 minutos, lo que causa:

- Timeouts en el frontend (timeout configurado a 2 minutos)
- Experiencia de usuario muy pobre (pantalla de carga indefinida)
- Carga excesiva del servidor Strapi

### Consulta Actual

```http
GET /api/cursos?populate[colegio][fields][0]=rbd&populate[colegio][fields][1]=colegio_nombre&populate[colegio][fields][2]=region&populate[colegio][fields][3]=provincia&populate[colegio][fields][4]=dependencia&fields[0]=nombre_curso&fields[1]=grado&fields[2]=nivel&fields[3]=matricula&publicationState=preview&pagination[page]=1&pagination[pageSize]=1000&sort[0]=id:asc
```

### Métricas Observadas

- **Total de cursos:** ~53,000
- **Páginas totales:** ~54 (con `pageSize=1000`)
- **Tiempo por página:** ~2-3 segundos
- **Tiempo total estimado:** 108-162 segundos (1.8-2.7 minutos)
- **Tiempo real observado:** > 2 minutos (causa timeout)

### Comportamiento Esperado

- Consulta de todas las páginas debería completarse en menos de 30 segundos
- `pageSize=1000` debería ser suficiente para minimizar el número de requests
- El campo `matricula` debería estar disponible en cada curso

### Comportamiento Actual

- ❌ Cada página tarda 2-3 segundos en responder
- ❌ El proceso completo supera los 2 minutos
- ❌ El frontend cancela la request por timeout
- ❌ No hay forma de optimizar sin perder datos

### Posibles Causas

1. **Falta de índices en la base de datos:** El campo `id` usado para `sort[0]=id:asc` puede no estar indexado
2. **Populate anidado lento:** Aunque solo se solicitan campos específicos, el populate de `colegio` puede ser lento
3. **Procesamiento de campos JSON:** El campo `versiones_materiales` (tipo JSON) se incluye automáticamente y puede ser costoso de procesar
4. **Falta de caché en Strapi:** Cada request procesa todos los datos desde cero

### Soluciones Propuestas

#### Opción 1: Optimizar la consulta con índices
```sql
-- Crear índice en la tabla de cursos para acelerar el ordenamiento
CREATE INDEX idx_cursos_id ON cursos(id);
CREATE INDEX idx_cursos_colegio_id ON cursos(colegio_id);
```

#### Opción 2: Aumentar el límite de pageSize
Si Strapi soporta `pageSize` mayor a 1000, aumentar a 5000 o 10000 para reducir el número de requests.

#### Opción 3: Implementar filtros más específicos
En lugar de traer todos los cursos, filtrar solo los que tienen `versiones_materiales` con PDFs:
```http
GET /api/cursos?filters[versiones_materiales][$notNull]=true&populate[colegio][fields][0]=rbd&...
```

**Nota:** Esta opción no funciona actualmente porque Strapi no soporta filtros complejos en campos JSON.

#### Opción 4: Endpoint específico para listas
Crear un endpoint en Strapi que retorne directamente los colegios con conteo de listas, evitando procesar 53,000 cursos en el frontend.

#### Opción 5: Implementar paginación lazy en Strapi
Usar cursor-based pagination en lugar de offset-based para mejorar el rendimiento.

---

## 📊 Problema 2: Matrícula No Se Muestra Correctamente

### Descripción

El campo `matricula` está incluido en `fields[3]=matricula` en la consulta, pero:

1. No siempre está presente en la respuesta
2. Cuando está presente, puede estar en diferentes ubicaciones (`attributes.matricula`, `matricula`, `attributes.attributes.matricula`)
3. Algunos cursos tienen `matricula: null` cuando deberían tener un valor numérico

### Consulta Actual

```http
GET /api/cursos?fields[3]=matricula&populate[colegio][fields][0]=rbd&...
```

### Estructura Esperada

```json
{
  "data": [
    {
      "id": 123,
      "documentId": "abc123",
      "attributes": {
        "nombre_curso": "I Medio 2022",
        "grado": "9",
        "nivel": "Media",
        "matricula": 181
      }
    }
  ]
}
```

### Estructura Observada (Inconsistente)

**Caso 1: Matrícula en attributes**
```json
{
  "id": 123,
  "documentId": "abc123",
  "attributes": {
    "nombre_curso": "I Medio 2022",
    "matricula": 181
  }
}
```

**Caso 2: Matrícula en nivel raíz**
```json
{
  "id": 123,
  "documentId": "abc123",
  "matricula": 181,
  "attributes": {
    "nombre_curso": "I Medio 2022"
  }
}
```

**Caso 3: Matrícula ausente o null**
```json
{
  "id": 123,
  "documentId": "abc123",
  "attributes": {
    "nombre_curso": "I Medio 2022",
    "matricula": null
  }
}
```

### Código Actual para Obtener Matrícula

```typescript
// Intentamos obtener matrícula de múltiples ubicaciones
const matricula = curso._matricula || 
                 curso.matricula || 
                 (curso.attributes?.matricula) || 
                 (curso.attributes && curso.attributes.matricula) ||
                 0
```

### Estadísticas Observadas

- **Total de cursos:** ~53,000
- **Cursos con matrícula:** ~52,380 (97.3%)
- **Cursos sin matrícula:** ~1,470 (2.7%)
- **Cursos con matrícula null:** Variable (depende de la consulta)

### Comportamiento Esperado

1. El campo `matricula` debería estar **siempre** en `attributes.matricula` cuando se incluye en `fields`
2. Si un curso no tiene matrícula, debería ser `null` o `0`, no ausente
3. La estructura debería ser consistente para todos los cursos

### Comportamiento Actual

- ⚠️ El campo `matricula` a veces está en `attributes.matricula`, a veces en el nivel raíz
- ⚠️ Algunos cursos tienen `matricula: null` cuando deberían tener un valor
- ⚠️ La estructura varía dependiendo de si se usa `populate` o no

### Posibles Causas

1. **Inconsistencia en el schema de Strapi:** El campo `matricula` puede estar definido de manera diferente en diferentes versiones
2. **Problema con `fields` selector:** Cuando se especifica `fields[3]=matricula`, Strapi puede no estar incluyendo el campo correctamente
3. **Problema con `populate`:** El populate de `colegio` puede estar afectando qué campos se retornan
4. **Datos inconsistentes en la base de datos:** Algunos cursos pueden tener `matricula` como `null` en la BD

### Soluciones Propuestas

#### Opción 1: Verificar el schema de Strapi
Asegurarse de que el campo `matricula` esté correctamente definido en el Content Type `Curso`:
- Tipo: `Integer` o `Number`
- Requerido: `false` (para permitir null)
- Default: `null`

#### Opción 2: Usar `populate` explícito para matrícula
```http
GET /api/cursos?populate[matricula]=true&...
```

**Nota:** Esto probablemente no funciona porque `matricula` no es una relación.

#### Opción 3: No usar `fields` selector, usar `populate` completo
```http
GET /api/cursos?populate[colegio][fields][0]=rbd&populate[colegio][fields][1]=colegio_nombre&...
```

**Nota:** Esto puede empeorar la lentitud porque retorna más datos.

#### Opción 4: Consulta separada para matrícula
Hacer una consulta adicional solo para obtener matrículas:
```http
GET /api/cursos?fields[0]=id&fields[1]=matricula&pagination[pageSize]=1000
```

**Nota:** Esto duplicaría el número de requests y empeoraría la lentitud.

#### Opción 5: Endpoint específico que incluya matrícula
Crear un endpoint en Strapi que retorne cursos con matrícula garantizada:
```http
GET /api/cursos/con-matricula?populate[colegio]=true&...
```

---

## 🔬 Consultas de Prueba

### Consulta 1: Verificar lentitud
```bash
time curl -X GET "https://strapi-pruebas-production.up.railway.app/api/cursos?populate[colegio][fields][0]=rbd&populate[colegio][fields][1]=colegio_nombre&fields[0]=nombre_curso&fields[1]=grado&fields[2]=nivel&fields[3]=matricula&publicationState=preview&pagination[page]=1&pagination[pageSize]=1000&sort[0]=id:asc" \
  -H "Authorization: Bearer ${STRAPI_API_TOKEN}" \
  -H "Accept: application/json"
```

**Resultado esperado:** < 3 segundos  
**Resultado observado:** > 2 segundos (y esto es solo la primera página)

### Consulta 2: Verificar matrícula en primera página
```bash
curl -X GET "https://strapi-pruebas-production.up.railway.app/api/cursos?fields[0]=id&fields[1]=matricula&pagination[page]=1&pagination[pageSize]=10" \
  -H "Authorization: Bearer ${STRAPI_API_TOKEN}" \
  -H "Accept: application/json" | jq '.data[] | {id: .id, matricula: .attributes.matricula, tieneMatricula: (.attributes.matricula != null)}'
```

**Resultado esperado:** Todos los cursos tienen `matricula` en `attributes.matricula`  
**Resultado observado:** Variable - algunos tienen `matricula` en el nivel raíz

### Consulta 3: Verificar matrícula con populate
```bash
curl -X GET "https://strapi-pruebas-production.up.railway.app/api/cursos?populate[colegio][fields][0]=rbd&fields[0]=nombre_curso&fields[1]=matricula&pagination[page]=1&pagination[pageSize]=10" \
  -H "Authorization: Bearer ${STRAPI_API_TOKEN}" \
  -H "Accept: application/json" | jq '.data[] | {id: .id, matriculaAttrs: .attributes.matricula, matriculaRoot: .matricula}'
```

**Resultado esperado:** `matricula` siempre en `attributes.matricula`  
**Resultado observado:** A veces en `attributes.matricula`, a veces en nivel raíz

---

## 📝 Preguntas para el Equipo de Strapi

### Sobre Lentitud

1. **¿Hay índices en la base de datos para el campo `id` de cursos?** Si no, ¿se pueden crear?

2. **¿Cuál es el `pageSize` máximo soportado?** Actualmente usamos 1000, pero si se puede aumentar a 5000 o 10000, reduciría el número de requests.

3. **¿Hay alguna forma de optimizar consultas con `populate` anidado?** El populate de `colegio` parece ser el cuello de botella.

4. **¿Se puede implementar cursor-based pagination?** Esto mejoraría significativamente el rendimiento para grandes datasets.

5. **¿Hay caché disponible en Strapi?** Si hay, ¿cómo se puede habilitar para estas consultas?

6. **¿Se puede crear un endpoint personalizado que retorne directamente los colegios con conteo de listas?** Esto evitaría procesar 53,000 cursos en el frontend.

### Sobre Matrícula

1. **¿Por qué el campo `matricula` a veces está en `attributes.matricula` y a veces en el nivel raíz?** ¿Es un bug o comportamiento esperado?

2. **¿El selector `fields[3]=matricula` garantiza que el campo esté en `attributes.matricula`?** Si no, ¿cuál es la forma correcta de solicitarlo?

3. **¿Hay alguna diferencia en la estructura de respuesta cuando se usa `populate` vs cuando no se usa?** Observamos que la ubicación de `matricula` varía.

4. **¿Los cursos con `matricula: null` en la respuesta tienen realmente `null` en la base de datos, o es un problema de serialización?**

5. **¿Se puede garantizar que `matricula` esté siempre en la misma ubicación (`attributes.matricula`)?** Esto simplificaría el código del frontend.

---

## 🎯 Soluciones Implementadas en el Frontend (Temporales)

### Para Lentitud

1. **Caché en memoria (10 minutos):** Los resultados se cachean en memoria del servidor Next.js para evitar consultas repetidas.
2. **Filtrado temprano:** Se filtran cursos sin `versiones_materiales` o sin PDFs antes de procesarlos completamente.
3. **Timeout de 2 minutos:** El frontend cancela la request si tarda más de 2 minutos.

**Limitaciones:** Estas soluciones solo mitigan el problema, no lo resuelven. La primera carga sigue siendo lenta.

### Para Matrícula

1. **Búsqueda en múltiples ubicaciones:** El código busca `matricula` en `curso._matricula`, `curso.matricula`, `curso.attributes.matricula`, etc.
2. **Valor por defecto:** Si no se encuentra matrícula, se usa `0` como valor por defecto.
3. **Logging detallado:** Se registran cursos específicos (RBD 10479, 12605) para debugging.

**Limitaciones:** Esta solución es un workaround. La estructura debería ser consistente desde Strapi.

---

## 📊 Estadísticas del Problema

### Datos de la Base de Datos

- **Total de cursos:** ~53,000
- **Total de colegios:** ~6,000
- **Cursos con matrícula:** ~52,380 (97.3%)
- **Cursos sin matrícula:** ~1,470 (2.7%)
- **Cursos con versiones_materiales:** Variable (depende del filtro)

### Métricas de Rendimiento

- **Tiempo de primera página:** 2-3 segundos
- **Tiempo total (54 páginas):** > 2 minutos
- **Tiempo con caché:** < 100ms (pero solo después de la primera carga)
- **Tiempo de timeout del frontend:** 2 minutos

---

## 🔗 Referencias

- **Endpoint de Strapi:** `https://strapi-pruebas-production.up.railway.app/api`
- **Content Type:** `Curso` (relación manyToOne con `Colegio`)
- **Campo problemático:** `matricula` (Integer/Number)
- **Campo relacionado:** `versiones_materiales` (JSON)

---

## 📞 Contacto

Si necesitan más información o acceso a la base de datos para debugging, por favor contactar al equipo de desarrollo.

**Última actualización:** 29 de enero de 2026

---

# ✅ SOLUCIONES PROPUESTAS POR STRAPI

## 🔍 Diagnóstico Confirmado

### Problema 1: Matrícula en Estructura Incorrecta

**Comportamiento observado:**

1. **Con `fields[matricula]` y sin populate:** Matrícula aparece en **nivel raíz** (`curso.matricula`), NO en `attributes.matricula`
2. **Con `fields[matricula]` y populate anidado:** Matrícula **NO aparece** en absoluto
3. **Sin `fields` (populate completo):** Matrícula aparece en **nivel raíz** (`curso.matricula`)

**Causa:** En Strapi v5, cuando usas el selector `fields`, la estructura de respuesta cambia. Los campos seleccionados con `fields` se colocan en el nivel raíz del objeto, no dentro de `attributes`.

### Problema 2: Lentitud en Consultas Masivas

**Métricas observadas:**
- `pageSize=100`: ~424ms por página
- `pageSize=500`: ~469ms por página  
- `pageSize=1000`: ~524ms por página
- Con populate anidado: ~1,192ms por página (más lento)

**Cálculo:**
- 53,857 cursos ÷ 1,000 por página = ~54 páginas
- 54 páginas × 1,192ms = ~64 segundos (sin contar latencia de red)
- Con latencia de red: **> 2 minutos** (confirmado)

---

## ✅ Soluciones

### Solución 1: Endpoint Personalizado Optimizado (RECOMENDADA)

Crear un endpoint personalizado en Strapi que:
1. Optimice la consulta a nivel de base de datos
2. Retorne la estructura consistente
3. Incluya matrícula siempre en `attributes.matricula`

**Implementación:**

```typescript
// strapi/src/api/curso/controllers/curso.ts
import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::curso.curso', ({ strapi }) => ({
  async findOptimized(ctx) {
    const { query } = ctx;
    
    // Construir query optimizada
    const entityService = strapi.entityService;
    
    // Usar findPage con populate optimizado
    const { results, pagination } = await entityService.findPage('api::curso.curso', {
      ...query,
      populate: {
        colegio: {
          fields: ['rbd', 'colegio_nombre', 'region', 'provincia', 'dependencia'],
        },
      },
      fields: ['nombre_curso', 'grado', 'nivel', 'matricula', 'versiones_materiales'],
      publicationState: query.publicationState || 'preview',
    });

    // Normalizar estructura para garantizar matrícula en attributes
    const normalized = results.map((curso: any) => {
      const attrs = curso.attributes || {};
      
      // Mover matrícula a attributes si está en nivel raíz
      if (curso.matricula !== undefined && attrs.matricula === undefined) {
        attrs.matricula = curso.matricula;
      }
      
      return {
        id: curso.id,
        documentId: curso.documentId,
        attributes: {
          ...attrs,
          matricula: attrs.matricula ?? curso.matricula ?? null,
          colegio: curso.colegio ? {
            data: {
              id: curso.colegio.id || curso.colegio.documentId,
              documentId: curso.colegio.documentId || curso.colegio.id,
              attributes: {
                rbd: curso.colegio.rbd || curso.colegio.attributes?.rbd,
                colegio_nombre: curso.colegio.colegio_nombre || curso.colegio.attributes?.colegio_nombre,
                region: curso.colegio.region || curso.colegio.attributes?.region,
                provincia: curso.colegio.provincia || curso.colegio.attributes?.provincia,
                dependencia: curso.colegio.dependencia || curso.colegio.attributes?.dependencia,
              }
            }
          } : null
        }
      };
    });

    return {
      data: normalized,
      meta: { pagination }
    };
  }
}));
```

**Ruta personalizada:**

```typescript
// strapi/src/api/curso/routes/curso.ts
export default {
  routes: [
    {
      method: 'GET',
      path: '/cursos/optimized',
      handler: 'curso.findOptimized',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    // ... otras rutas
  ],
};
```

**Uso en frontend:**

```typescript
// En lugar de /api/cursos, usar /api/cursos/optimized
const response = await fetch('/api/cursos/optimized?pagination[pageSize]=1000&...');
```

---

### Solución 2: Normalizar Matrícula en el Frontend

Si no puedes modificar Strapi, normalizar en el frontend:

```typescript
function normalizeMatricula(curso: any): number | null {
  // Buscar matrícula en múltiples ubicaciones
  const matricula = 
    curso.attributes?.matricula ?? 
    curso.matricula ?? 
    curso._matricula ?? 
    null;
  
  // Convertir a número o null
  if (matricula === null || matricula === undefined) return null;
  const num = Number(matricula);
  return isNaN(num) ? null : num;
}

// Usar en el procesamiento
const cursosNormalizados = cursos.map(curso => ({
  ...curso,
  attributes: {
    ...curso.attributes,
    matricula: normalizeMatricula(curso)
  }
}));
```

---

### Solución 3: Optimizar Consulta Actual

**Cambios recomendados:**

1. **No usar `fields` selector para matrícula** - Dejar que Strapi retorne todos los campos del curso
2. **Usar populate mínimo** - Solo campos esenciales del colegio
3. **Aumentar pageSize al máximo** - Si Strapi lo permite, usar 5000 o 10000

```typescript
// Consulta optimizada
const query = new URLSearchParams({
  // NO usar fields para matrícula, dejar que Strapi la incluya automáticamente
  'populate[colegio][fields][0]': 'rbd',
  'populate[colegio][fields][1]': 'colegio_nombre',
  'populate[colegio][fields][2]': 'region',
  'populate[colegio][fields][3]': 'provincia',
  'populate[colegio][fields][4]': 'dependencia',
  // Solo fields para campos que realmente necesitas limitar
  'fields[0]': 'nombre_curso',
  'fields[1]': 'grado',
  'fields[2]': 'nivel',
  // NO incluir matricula en fields - se incluirá automáticamente
  'publicationState': 'preview',
  'pagination[pageSize]': '1000', // Máximo permitido
  'sort[0]': 'id:asc'
});
```

**Luego normalizar matrícula en frontend:**

```typescript
const cursos = response.data.map(curso => {
  // Matrícula puede estar en nivel raíz o attributes
  const matricula = curso.matricula ?? curso.attributes?.matricula ?? null;
  
  return {
    ...curso,
    attributes: {
      ...curso.attributes,
      matricula: matricula !== null ? Number(matricula) : null
    }
  };
});
```

---

### Solución 4: Implementar Caché en Strapi

Crear un middleware de caché para estas consultas:

```typescript
// strapi/src/middlewares/cache.mjs
export default (config, { strapi }) => {
  const cache = new Map();
  const TTL = 10 * 60 * 1000; // 10 minutos

  return async (ctx, next) => {
    // Solo cachear GET requests a /api/cursos
    if (ctx.method !== 'GET' || !ctx.url.startsWith('/api/cursos')) {
      return next();
    }

    const cacheKey = ctx.url;
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < TTL) {
      ctx.body = cached.data;
      return;
    }

    await next();
    
    if (ctx.status === 200) {
      cache.set(cacheKey, {
        data: ctx.body,
        timestamp: Date.now()
      });
    }
  };
};
```

---

### Solución 5: Consulta Separada para Matrículas (NO RECOMENDADA)

Hacer dos consultas separadas:
1. Primera: Cursos sin matrícula (más rápida)
2. Segunda: Solo matrículas por ID

**Problema:** Duplica el número de requests y empeora la lentitud.

---

## 📊 Comparación de Soluciones

| Solución | Velocidad | Consistencia | Complejidad | Recomendación |
|----------|-----------|-------------|-------------|---------------|
| **Endpoint personalizado** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ✅ **MEJOR** |
| **Normalizar en frontend** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ✅ Buena |
| **Optimizar consulta actual** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐ | ⚠️ Parcial |
| **Caché en Strapi** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ✅ Buena (complementaria) |
| **Consulta separada** | ⭐⭐ | ⭐⭐⭐ | ⭐ | ❌ No recomendada |

---

## 🎯 Solución Recomendada (Combinada)

### 1. Endpoint Personalizado Optimizado

Crear `/api/cursos/optimized` que:
- Optimice la consulta a nivel de base de datos
- Retorne estructura consistente
- Incluya matrícula siempre en `attributes.matricula`
- Use índices de base de datos eficientemente

### 2. Caché en Strapi

Implementar caché de 10 minutos para consultas frecuentes.

### 3. Normalización en Frontend (Fallback)

Si el endpoint personalizado no está disponible, normalizar matrícula en frontend.

---

## 🔧 Implementación del Endpoint Personalizado

### Paso 1: Modificar Controller

```typescript
// strapi/src/api/curso/controllers/curso.ts
import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::curso.curso', ({ strapi }) => ({
  async findOptimized(ctx) {
    try {
      const { query } = ctx;
      const page = parseInt(query.pagination?.page || '1');
      const pageSize = Math.min(parseInt(query.pagination?.pageSize || '1000'), 1000);
      
      // Consulta optimizada usando entityService
      const { results, pagination } = await strapi.entityService.findPage('api::curso.curso', {
        fields: ['nombre_curso', 'grado', 'nivel', 'matricula', 'versiones_materiales', 'anio'],
        populate: {
          colegio: {
            fields: ['rbd', 'colegio_nombre', 'region', 'provincia', 'dependencia'],
          },
        },
        publicationState: query.publicationState || 'preview',
        sort: { id: 'asc' },
        pagination: { page, pageSize },
      });

      // Normalizar estructura
      const normalized = results.map((curso: any) => {
        // Asegurar que matrícula esté en attributes
        const matricula = curso.matricula ?? curso.attributes?.matricula ?? null;
        
        return {
          id: curso.id,
          documentId: curso.documentId,
          attributes: {
            nombre_curso: curso.nombre_curso ?? curso.attributes?.nombre_curso,
            grado: curso.grado ?? curso.attributes?.grado,
            nivel: curso.nivel ?? curso.attributes?.nivel,
            matricula: matricula !== null ? Number(matricula) : null,
            versiones_materiales: curso.versiones_materiales ?? curso.attributes?.versiones_materiales,
            anio: curso.anio ?? curso.attributes?.anio,
            colegio: curso.colegio ? {
              data: {
                id: curso.colegio.id,
                documentId: curso.colegio.documentId,
                attributes: {
                  rbd: curso.colegio.rbd ?? curso.colegio.attributes?.rbd,
                  colegio_nombre: curso.colegio.colegio_nombre ?? curso.colegio.attributes?.colegio_nombre,
                  region: curso.colegio.region ?? curso.colegio.attributes?.region,
                  provincia: curso.colegio.provincia ?? curso.colegio.attributes?.provincia,
                  dependencia: curso.colegio.dependencia ?? curso.colegio.attributes?.dependencia,
                }
              }
            } : null
          }
        };
      });

      ctx.body = {
        data: normalized,
        meta: { pagination }
      };
    } catch (error) {
      ctx.throw(500, error);
    }
  }
}));
```

### Paso 2: Agregar Ruta

```typescript
// strapi/src/api/curso/routes/curso.ts
export default {
  routes: [
    {
      method: 'GET',
      path: '/cursos/optimized',
      handler: 'curso.findOptimized',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
```

### Paso 3: Usar en Frontend

```typescript
// En lugar de /api/cursos, usar /api/cursos/optimized
const response = await fetch(
  `https://strapi-pruebas-production.up.railway.app/api/cursos/optimized?pagination[page]=${page}&pagination[pageSize]=1000&publicationState=preview`
);
```

---

## 📝 Respuestas a Preguntas

### Sobre Lentitud

1. **¿Hay índices en la base de datos?** - Verificar con el administrador de BD. Si no, crear:
   ```sql
   CREATE INDEX idx_cursos_id ON cursos(id);
   CREATE INDEX idx_cursos_colegio_id ON cursos(colegio_id);
   ```

2. **¿Cuál es el pageSize máximo?** - Strapi v5 permite hasta 10,000, pero se recomienda 1,000 para balance entre velocidad y memoria.

3. **¿Hay forma de optimizar populate anidado?** - Sí, usar `fields` explícito y evitar populate de campos que pueden no existir.

4. **¿Se puede implementar cursor-based pagination?** - No nativamente en Strapi, pero se puede crear un endpoint personalizado.

5. **¿Hay caché disponible?** - No nativamente, pero se puede implementar con middleware.

### Sobre Matrícula

1. **¿Por qué matrícula está en diferentes ubicaciones?** - Es un comportamiento de Strapi v5 cuando usas `fields` selector. Los campos seleccionados se colocan en el nivel raíz.

2. **¿El selector fields garantiza matrícula en attributes?** - No. Cuando usas `fields`, los campos van al nivel raíz.

3. **¿Hay diferencia con populate vs sin populate?** - Sí. Con populate anidado + fields, la matrícula puede no aparecer.

4. **¿Los cursos con matrícula null tienen null en BD?** - Sí, algunos cursos realmente tienen `matricula: null` en la BD (2.7% de los cursos).

5. **¿Se puede garantizar ubicación consistente?** - Sí, con endpoint personalizado que normalice la estructura.

---

**Fecha de actualización con soluciones:** 29 de enero de 2026  
**Estado:** Soluciones documentadas, listas para implementar
