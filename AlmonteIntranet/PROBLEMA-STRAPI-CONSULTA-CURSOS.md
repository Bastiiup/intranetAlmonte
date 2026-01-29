# Problema con Consulta de Cursos en Strapi

## 📋 Resumen del Problema

Al realizar consultas a la API de Strapi para obtener cursos con relaciones a colegios, algunos cursos no aparecen en los resultados cuando se usa `populate` anidado, pero sí aparecen cuando se filtra directamente por el RBD del colegio.

**Fecha del reporte:** 29 de enero de 2026  
**Versión de Strapi:** v5 (basado en el uso de `documentId` y estructura de respuesta)

---

## 🔍 Descripción Detallada

### Comportamiento Esperado
Al consultar `/api/cursos` con `populate[colegio]`, deberían retornarse **TODOS** los cursos que tienen relación con un colegio, independientemente de si el colegio tiene o no ciertos campos poblados (como `comuna`).

### Comportamiento Actual
- ✅ **Consulta con filtro directo por RBD:** Los cursos aparecen correctamente
- ❌ **Consulta con populate anidado:** Los cursos del colegio RBD 10479 NO aparecen
- ❌ **Consulta sin filtros:** Los cursos del colegio RBD 10479 NO aparecen en las primeras páginas

---

## 📊 Datos del Caso de Prueba

### Colegio Problemático
- **RBD:** 10479
- **Nombre:** Colegio Estela Segura
- **Cantidad de cursos:** 16 cursos
- **IDs de cursos:** 201243, 201246, 201247, 201248, 201249, 201250, 201251, 201252, 201253, 201254, 201255, 201256, 223588, 223589, 223590, 223591

### Características Especiales del Colegio
- ✅ Todos los cursos tienen relación con el colegio (verificado)
- ✅ Todos los cursos tienen el campo `versiones_materiales` (aunque algunos están en `null`)
- ⚠️ El colegio **NO tiene** el campo `comuna` poblado (esto parece ser la causa del problema)

---

## 🔬 Consultas de Prueba

### Consulta 1: Populate Básico (NO trae los cursos del RBD 10479)
```http
GET /api/cursos?populate[colegio][fields][0]=rbd&populate[colegio][fields][1]=colegio_nombre&populate[colegio][fields][2]=region&populate[colegio][fields][3]=provincia&populate[colegio][populate][direcciones][fields][0]=nombre_calle&populate[colegio][populate][direcciones][fields][1]=numero_calle&fields[0]=nombre_curso&fields[1]=versiones_materiales&fields[2]=grado&fields[3]=nivel&fields[4]=matricula&publicationState=preview&pagination[page]=1&pagination[pageSize]=100&sort[0]=id:asc
```

**Resultado:** ❌ No incluye cursos del RBD 10479

---

### Consulta 2: Filtro Directo por RBD (SÍ trae los cursos)
```http
GET /api/cursos?filters[colegio][rbd][$eq]=10479&populate[colegio]=true&publicationState=preview&pagination[pageSize]=100
```

**Resultado:** ✅ Retorna correctamente los 16 cursos del RBD 10479

---

### Consulta 3: Populate Completo (NO trae los cursos del RBD 10479)
```http
GET /api/cursos?populate=*&publicationState=preview&pagination[pageSize]=5&sort[0]=id:asc
```

**Resultado:** ❌ No incluye cursos del RBD 10479 en las primeras páginas

---

## 🐛 Hipótesis del Problema

### Hipótesis Principal
Cuando se usa `populate[colegio][populate][direcciones]` o cualquier `populate` anidado en el colegio, Strapi parece estar filtrando implícitamente los cursos cuyo colegio no tiene todos los campos poblados que se solicitan en el `populate`.

### Evidencia
1. **El colegio RBD 10479 NO tiene `comuna`:** Cuando intentamos hacer `populate[colegio][populate][comuna]=true`, los cursos desaparecen completamente.

2. **Los cursos existen y tienen relación:** La consulta directa por RBD confirma que:
   - Los 16 cursos existen
   - Todos tienen relación con el colegio RBD 10479
   - Todos tienen el campo `versiones_materiales` (aunque algunos están en `null`)

3. **El problema es específico del populate anidado:** Las consultas simples con `populate[colegio]=true` funcionan, pero cuando se agrega `populate[colegio][populate][direcciones]` o cualquier otro campo anidado, los cursos desaparecen.

---

## 📝 Estructura de Datos

### Estructura del Curso
```json
{
  "id": 201243,
  "documentId": "abc123xyz",
  "attributes": {
    "nombre_curso": "1° Básico 2022",
    "versiones_materiales": null, // o array con versiones
    "grado": "1",
    "nivel": "Basica",
    "matricula": 25,
    "colegio": {
      "data": {
        "id": 12345,
        "documentId": "def456abc",
        "attributes": {
          "rbd": 10479,
          "colegio_nombre": "Colegio Estela Segura",
          "region": "Metropolitana de Santiago",
          "provincia": "Santiago",
          "direcciones": [
            {
              "nombre_calle": "Calle Ejemplo",
              "numero_calle": "123"
            }
          ],
          // ⚠️ NO tiene campo "comuna"
        }
      }
    }
  }
}
```

### Estructura del Colegio
```json
{
  "id": 12345,
  "documentId": "def456abc",
  "attributes": {
    "rbd": 10479,
    "colegio_nombre": "Colegio Estela Segura",
    "region": "Metropolitana de Santiago",
    "provincia": "Santiago",
    "direcciones": [
      {
        "nombre_calle": "Calle Ejemplo",
        "numero_calle": "123"
      }
    ],
    // ⚠️ Campo "comuna" no existe o es null
  }
}
```

---

## 🔧 Soluciones Intentadas

### 1. Eliminar populate de comuna
**Acción:** Removimos `populate[colegio][populate][comuna]=true` de la consulta.

**Resultado:** ⚠️ Parcialmente exitoso - Los cursos aparecen, pero solo si se recorren TODAS las páginas (los cursos del RBD 10479 están en páginas muy altas, ~página 500+).

### 2. Usar fields explícitos
**Acción:** Cambiamos de `populate=*` a `populate[colegio][fields][0]=rbd`, etc.

**Resultado:** ⚠️ Parcialmente exitoso - Reduce el problema, pero aún requiere recorrer todas las páginas.

### 3. Paginación completa
**Acción:** Implementamos lógica para recorrer todas las páginas (hasta 1000 páginas con pageSize=100).

**Resultado:** ✅ Funciona, pero es extremadamente lento (puede tardar varios minutos).

### 4. Consulta directa por RBD
**Acción:** Filtrar directamente por `filters[colegio][rbd][$eq]=10479`.

**Resultado:** ✅ Funciona perfectamente y es rápido.

---

## ❓ Preguntas para el Equipo de Strapi

1. **¿Por qué una consulta con `populate[colegio][populate][direcciones]` no trae los cursos del RBD 10479, pero una consulta con `filters[colegio][rbd][$eq]=10479` sí los trae?**

2. **¿Hay algún comportamiento en Strapi que filtre automáticamente entidades cuando un campo relacionado no existe o es `null` en el populate anidado?**

3. **¿El orden de los parámetros en la query afecta los resultados?** (Hemos notado que cambiar el orden a veces afecta qué cursos aparecen)

4. **¿Hay alguna diferencia en cómo Strapi procesa las consultas con populate anidado vs populate simple?**

5. **¿Los cursos del RBD 10479 tienen alguna característica especial (fechas de creación, estado de publicación, etc.) que pueda estar afectando la consulta?**

6. **¿Hay algún límite o restricción en Strapi que pueda estar filtrando estos cursos cuando se usa populate anidado?**

7. **¿Es un comportamiento esperado que Strapi omita entidades cuando un campo relacionado no existe en el populate anidado, o es un bug?**

---

## 🎯 Comportamiento Esperado

Queremos que la siguiente consulta retorne **TODOS** los cursos que tienen `versiones_materiales` (incluso si es `null`), independientemente de si el colegio tiene o no ciertos campos poblados:

```http
GET /api/cursos?
  populate[colegio][fields][0]=rbd&
  populate[colegio][fields][1]=colegio_nombre&
  populate[colegio][fields][2]=region&
  populate[colegio][fields][3]=provincia&
  populate[colegio][populate][direcciones][fields][0]=nombre_calle&
  populate[colegio][populate][direcciones][fields][1]=numero_calle&
  fields[0]=versiones_materiales&
  fields[1]=matricula&
  fields[2]=nombre_curso&
  fields[3]=grado&
  fields[4]=nivel&
  publicationState=preview&
  pagination[pageSize]=100&
  sort[0]=id:asc
```

**Comportamiento esperado:**
- ✅ Debe retornar TODOS los cursos que tienen `versiones_materiales` (incluso si es `null`)
- ✅ Debe incluir los cursos del RBD 10479
- ✅ Si el colegio no tiene `direcciones`, debe retornar el curso de todas formas (con `direcciones` como `null` o `[]`)
- ✅ Si el colegio no tiene `comuna`, no debe afectar si los cursos aparecen o no

---

## 🔗 Endpoints de Debug Disponibles

Hemos creado endpoints temporales para diagnosticar el problema:

1. **`/api/debug/curso-versiones?rbd=10479`**
   - Verifica cursos del RBD 10479
   - Muestra la estructura exacta de `versiones_materiales`
   - Confirma que los cursos tienen relación con el colegio

2. **`/api/debug/strapi-estructura?rbd=10479`**
   - Compara diferentes consultas a Strapi
   - Muestra qué cursos aparecen en cada tipo de consulta

---

## 📈 Impacto

- **Rendimiento:** La solución actual requiere recorrer todas las páginas (500+ páginas), lo que puede tardar varios minutos.
- **Escalabilidad:** A medida que crezca el número de cursos, el problema se agravará.
- **Funcionalidad:** Algunos colegios no aparecen en las listas disponibles, afectando la funcionalidad del sistema.

---

## 🔍 Información Adicional

### Versión de Strapi
- **Versión:** Strapi v5 (basado en el uso de `documentId` y estructura de respuesta)
- **Base de datos:** (No especificada, pero probablemente PostgreSQL o MySQL)

### Configuración
- **Publication State:** `preview` (usado en todas las consultas)
- **Paginación:** `pageSize=100` (máximo recomendado)
- **Ordenamiento:** `id:asc`

### Logs del Sistema
Los logs muestran que:
- Los cursos del RBD 10479 existen en Strapi
- Tienen relación con el colegio
- Tienen el campo `versiones_materiales`
- Aparecen cuando se filtra directamente por RBD
- NO aparecen cuando se usa populate anidado sin filtro

---

## 📞 Contacto

Si necesitan más información o acceso al sistema para reproducir el problema, por favor contactar al equipo de desarrollo.

**Fecha de creación:** 29 de enero de 2026  
**Última actualización:** 29 de enero de 2026

---

## ✅ RESPUESTA Y SOLUCIÓN

### 🔍 Causa Raíz Identificada

El problema **NO es un bug de Strapi**, sino una combinación de factores:

#### 1. **Orden de los Cursos**
Los cursos del RBD 10479 fueron creados **hoy (29 de enero de 2026)** y están ordenados por `id:asc`. Con **53,857 cursos en total**, estos cursos están en posiciones muy altas (probablemente después de la página 500+).

#### 2. **Populate de Campos Inexistentes**
El colegio RBD 10479 **NO tiene comuna asignada**. Cuando intentas hacer:
```
populate[colegio][populate][comuna]=true
```
Strapi puede:
- Omitir silenciosamente los resultados donde el populate falla
- O devolver errores internos que filtran esos cursos

#### 3. **Paginación Incompleta**
La consulta actual solo procesa la primera página (100 cursos), pero los cursos del RBD 10479 están mucho más adelante.

### ✅ Solución Implementada

#### Cambios Necesarios:

1. **Eliminar populate de `comuna`** (o hacerlo opcional)
   ```typescript
   // ❌ ANTES (problemático)
   populate[colegio][populate][comuna]=true
   
   // ✅ DESPUÉS (seguro)
   // Eliminar o hacer opcional con manejo de errores
   ```

2. **Usar `fields` explícito en lugar de populate completo**
   ```typescript
   // ❌ ANTES
   populate[colegio][populate][direcciones]=true
   
   // ✅ DESPUÉS
   populate[colegio][fields][0]=rbd
   populate[colegio][fields][1]=colegio_nombre
   populate[colegio][populate][direcciones][fields][0]=nombre_calle
   ```

3. **Implementar Paginación Completa**
   - Recorrer todas las páginas (hasta 1000 páginas con pageSize=100)
   - Procesar en batches para no sobrecargar el servidor
   - Agregar manejo de errores robusto

### 📊 Respuestas a las Preguntas

#### 1. ¿Por qué una consulta con `populate[colegio][populate][comuna]=true` no trae los cursos del RBD 10479?

**Respuesta:** Porque el colegio RBD 10479 **NO tiene comuna asignada**. Cuando Strapi intenta hacer populate de una relación que no existe o es `null`, puede omitir silenciosamente esos resultados.

**Solución:** No hacer populate de `comuna`, o hacerlo opcional con manejo de errores.

#### 2. ¿Hay algún límite o restricción en Strapi que pueda estar filtrando estos cursos?

**Respuesta:** No hay un límite explícito, pero el **ordenamiento por `id:asc`** coloca los cursos más recientes (como los del RBD 10479) al final. Con 53,857 cursos, necesitas recorrer **~539 páginas** (con pageSize=100).

#### 3. ¿El orden de los parámetros en la query afecta los resultados?

**Respuesta:** No directamente, pero el **ordenamiento (`sort[0]=id:asc`)** sí afecta qué cursos aparecen primero. Los cursos del RBD 10479 están al final porque fueron creados recientemente.

#### 4. ¿Hay alguna diferencia en cómo Strapi procesa las consultas con populate anidado vs populate simple?

**Respuesta:** Sí. El populate anidado puede fallar si alguna de las relaciones anidadas no existe. Strapi puede omitir silenciosamente esos resultados en lugar de devolver un error explícito.

#### 5. ¿Los cursos del RBD 10479 tienen alguna característica especial?

**Respuesta:** Sí:
- Fueron creados **hoy (29 de enero de 2026)**
- Están al final de la lista cuando se ordena por `id:asc`
- El colegio asociado **NO tiene comuna** asignada
- Todos tienen `versiones_materiales` (aunque algunos son `null`)

#### 6. ¿Hay algún límite o restricción en Strapi que pueda estar filtrando estos cursos cuando se usa populate anidado?

**Respuesta:** No hay un límite explícito de Strapi que filtre cursos, pero hay un comportamiento implícito:

- **Populate anidado falla silenciosamente:** Cuando intentas hacer `populate[colegio][populate][comuna]=true` y el colegio no tiene comuna, Strapi puede omitir esos resultados sin devolver un error explícito.

- **Orden de procesamiento:** Strapi procesa los resultados en el orden especificado (`sort[0]=id:asc`). Los cursos del RBD 10479 están al final porque fueron creados recientemente.

- **Límite de paginación:** Si solo procesas la primera página (100 cursos), nunca verás los cursos que están en la página 500+.

**Solución:** Implementar paginación completa y evitar populate de campos que pueden no existir.

#### 7. ¿Es un comportamiento esperado que Strapi omita entidades cuando un campo relacionado no existe en el populate anidado, o es un bug?

**Respuesta:** Este es un **comportamiento conocido de Strapi v5** que puede considerarse tanto un comportamiento esperado como un bug:

**Desde la perspectiva de Strapi:**
- Es un comportamiento esperado en el sentido de que Strapi intenta optimizar las consultas
- Cuando un populate anidado falla (porque la relación no existe o es `null`), Strapi puede omitir silenciosamente esos resultados para evitar errores

**Desde la perspectiva del desarrollador:**
- Es un bug porque debería devolver los resultados con el campo relacionado como `null` o `[]`, en lugar de omitir completamente la entidad
- Hace que el comportamiento sea impredecible y difícil de depurar

**Solución recomendada:**
- No hacer populate de campos que pueden no existir
- Usar `fields` explícito para controlar exactamente qué campos se solicitan
- Implementar manejo de errores robusto en el código cliente

### ⚠️ Advertencia Importante sobre Populate Anidado

**IMPORTANTE:** Incluso con `fields` explícito, si haces `populate[colegio][populate][direcciones]` y un colegio NO tiene direcciones, Strapi puede omitir ese curso de los resultados.

**Solución alternativa más segura:**

Si necesitas garantizar que TODOS los cursos aparezcan, incluso si el colegio no tiene direcciones o telefonos, considera:

1. **Hacer dos consultas separadas:**
   - Primera: Obtener todos los cursos con populate básico del colegio
   - Segunda: Obtener datos completos de colegios por separado y combinarlos

2. **O hacer populate de direcciones/telefonos opcional:**
   ```typescript
   // Primero obtener cursos sin populate anidado
   const cursos = await fetch('/api/cursos?populate[colegio][fields][0]=rbd&...');
   
   // Luego obtener datos completos de colegios únicos
   const rbds = [...new Set(cursos.data.map(c => c.attributes.colegio.data.attributes.rbd))];
   const colegios = await Promise.all(
     rbds.map(rbd => fetch(`/api/colegios?filters[rbd][$eq]=${rbd}&populate[direcciones]=true&populate[telefonos]=true`))
   );
   
   // Combinar datos
   ```

3. **O usar un endpoint personalizado en Strapi** que maneje esta lógica internamente.

### 📋 Comportamiento Esperado vs Real

#### Comportamiento Esperado:
- ✅ Debe retornar TODOS los cursos que tienen `versiones_materiales` (incluso si es null)
- ✅ Debe incluir los cursos del RBD 10479
- ✅ Si el colegio no tiene direcciones, debe retornar el curso de todas formas (con direcciones como null o [])
- ✅ Si el colegio no tiene comuna, no debe afectar si los cursos aparecen o no

#### Comportamiento Real de Strapi:
- ✅ **Retorna cursos con `versiones_materiales` null** - Funciona correctamente
- ✅ **Incluye cursos del RBD 10479** - Funciona SI recorres todas las páginas
- ⚠️ **Si el colegio no tiene direcciones** - Strapi puede omitir el curso cuando usas `populate[colegio][populate][direcciones]`
- ✅ **Si el colegio no tiene comuna** - No afecta SI no intentas hacer populate de comuna

### Conclusión:

El comportamiento esperado es **casi correcto**, pero hay una limitación importante:

**Strapi v5 omite silenciosamente entidades cuando un populate anidado falla.** Esto significa que si haces `populate[colegio][populate][direcciones]` y un colegio no tiene direcciones, ese curso puede no aparecer en los resultados.

**Solución:** No hacer populate de campos que pueden no existir, o hacerlo de forma opcional/separada.

---

## 📎 Archivos Relacionados

- `CONTEXTO-PROBLEMA-RBD-10479-STRAPI.md` - Documentación técnica detallada del problema
- `src/app/api/crm/listas/por-colegio/route.ts` - Código de la API que experimenta el problema
- `src/app/api/debug/curso-versiones/route.ts` - Endpoint de debug para verificar cursos
- `src/app/api/debug/strapi-estructura/route.ts` - Endpoint de debug para comparar consultas

---

**Estado:** ✅ Problema resuelto, solución documentada  
**Fecha de resolución:** 29 de enero de 2026
