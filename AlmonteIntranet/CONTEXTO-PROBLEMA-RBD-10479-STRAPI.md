# Contexto del Problema: Colegio RBD 10479 no aparece en listas

## 📋 Resumen del Problema

El colegio con **RBD 10479** (Colegio Estela Segura) no aparece en la lista de colegios con listas disponibles en `/crm/listas`, a pesar de que:

1. ✅ **Los cursos existen en Strapi** (16 cursos verificados)
2. ✅ **Todos tienen relación con el colegio** (RBD: 10479)
3. ✅ **Todos tienen el campo `versiones_materiales`** (aunque algunos están en `null`)

## 🔍 Verificaciones Realizadas

### 1. Verificación Directa en Strapi

**Endpoint usado:** `/api/debug/curso-versiones?rbd=10479`

**Resultado:**
- ✅ 16 cursos encontrados del RBD 10479
- ✅ Todos tienen `relacionColegio.tieneColegio: true`
- ✅ Todos tienen `relacionColegio.colegioRBD: 10479`
- ✅ Todos tienen `relacionColegio.colegioNombre: "Colegio Estela Segura"`
- ✅ Todos tienen `estructura.tieneVersionesEnAttrs: true`
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++lo de curso encontrado:**
```json
{
  "cursoId": 201243,
  "nombre": "1° Básico 2022",
  "relacionColegio": {
    "tieneColegio": true,
    "colegioId": [ID del colegio],
    "colegioRBD": 10479,
    "colegioNombre": "Colegio Estela Segura"
  },
  "estructura": {
    "tieneVersionesEnAttrs": true,
    "versionesRawType": "object",
    "versionesRawIsNull": true
  }
}
```

### 2. Verificación de Estructura de Strapi

**Endpoint usado:** `/api/debug/strapi-estructura?rbd=10479`

**Resultados de las consultas:**

#### Consulta 1: Populate básico (como en `/api/crm/listas/por-colegio`)
```
Query: ?populate[colegio][populate][comuna]=true&populate[colegio][populate][direcciones]=true&populate[colegio][populate][telefonos]=true&publicationState=preview&pagination[pageSize]=5
Resultado: 5 cursos, pero NO incluye cursos del RBD 10479
Primer curso: RBD 14516 (diferente)
```

#### Consulta 2: Filtro por RBD
```
Query: ?filters[colegio][rbd][$eq]=10479&populate[colegio]=true&publicationState=preview&pagination[pageSize]=5
Resultado: 5 cursos del RBD 10479 ✅
Primer curso: RBD 10479 (correcto)
```

#### Consulta 3: Populate completo
```
Query: ?populate=*&publicationState=preview&pagination[pageSize]=5
Resultado: 5 cursos, pero NO incluye cursos del RBD 10479
Primer curso: RBD 14516 (diferente)
```

## 🐛 El Problema

### Consulta Actual en `/api/crm/listas/por-colegio`

```typescript
const filters: string[] = []
filters.push('populate[colegio][populate][comuna]=true')
filters.push('populate[colegio][populate][direcciones]=true')
filters.push('populate[colegio][populate][telefonos]=true')
filters.push('publicationState=preview')
filters.push('pagination[pageSize]=100')
filters.push('pagination[page]=1')
filters.push('sort[0]=id:asc')

const queryString = `?${filters.join('&')}`
const response = await strapiClient.get(`/api/cursos${queryString}`)
```

**Problema:** Esta consulta NO está trayendo los cursos del RBD 10479, aunque existen en Strapi.

### Comportamiento Observado

1. **Sin filtro por RBD:** Los cursos del RBD 10479 NO aparecen en los resultados
2. **Con filtro por RBD:** Los cursos del RBD 10479 SÍ aparecen correctamente
3. **Paginación:** Hemos implementado paginación para recorrer todas las páginas, pero aún así no aparecen

## 📊 Datos del Colegio RBD 10479

- **RBD:** 10479
- **Nombre:** Colegio Estela Segura
- **Cantidad de cursos:** 16
- **IDs de cursos:** 201243, 201246, 201247, 201248, 201249, 201250, 201251, 201252, 201253, 201254, 201255, 201256, 223588, 223589, 223590, 223591

## 🔧 Cambios Realizados

1. ✅ Eliminado uso de `fields` específicos que podrían limitar resultados
2. ✅ Implementada paginación completa (recorriendo todas las páginas)
3. ✅ Agregado logging detallado para rastrear el problema
4. ✅ Verificado que los cursos tienen relación con el colegio
5. ✅ Verificado que los cursos tienen `versiones_materiales`

## ❓ Preguntas para Strapi

1. **¿Por qué una consulta con `populate[colegio][populate][comuna]=true` no trae los cursos del RBD 10479, pero una consulta con `filters[colegio][rbd][$eq]=10479` sí los trae?**

2. **¿Hay algún límite o restricción en Strapi que pueda estar filtrando estos cursos cuando se usa populate anidado?**

3. **¿El orden de los parámetros en la query afecta los resultados?**

4. **¿Hay alguna diferencia en cómo Strapi procesa las consultas con populate anidado vs populate simple?**

5. **¿Los cursos del RBD 10479 tienen alguna característica especial (fechas de creación, estado de publicación, etc.) que pueda estar afectando la consulta?**

## 🎯 Objetivo

Necesitamos que la consulta en `/api/crm/listas/por-colegio` traiga **TODOS** los cursos que tienen `versiones_materiales` (incluso si es `null`), incluyendo los del RBD 10479.

## 📝 Estructura Esperada de la Respuesta

```typescript
{
  data: [
    {
      id: 201243,
      attributes: {
        nombre_curso: "1° Básico 2022",
        versiones_materiales: null, // o array con versiones
        colegio: {
          data: {
            id: [ID],
            attributes: {
              rbd: 10479,
              colegio_nombre: "Colegio Estela Segura",
              // ... otros campos
            }
          }
        }
      }
    },
    // ... más cursos
  ],
  meta: {
    pagination: {
      page: 1,
      pageSize: 100,
      pageCount: X,
      total: Y
    }
  }
}
```

## 🔗 Endpoints de Debug Disponibles

1. `/api/debug/curso-versiones?rbd=10479` - Verifica cursos del RBD 10479
2. `/api/debug/strapi-estructura?rbd=10479` - Compara diferentes consultas a Strapi

## 📅 Fecha del Problema

29 de enero de 2026

---

**¿Puedes revisar en tu sistema por qué los cursos del RBD 10479 no aparecen cuando se hace una consulta sin filtro por RBD, pero sí aparecen cuando se filtra específicamente por RBD?**
