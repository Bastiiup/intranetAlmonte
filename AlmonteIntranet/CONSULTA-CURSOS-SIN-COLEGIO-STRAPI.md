# 🏫 Consulta: Cursos sin Relación con Colegio en Strapi

## 📋 Resumen del Problema

Hemos detectado que de **53,857 cursos totales** en Strapi, solo **26 cursos tienen PDFs** (campo `versiones_materiales` con `pdf_id` o `pdf_url`).

Sin embargo, **TODOS estos 26 cursos NO tienen relación con ningún colegio**, lo que impide que se muestren correctamente en la aplicación.

---

## 🔍 Cursos Afectados

Los siguientes cursos tienen PDFs pero NO tienen relación con colegio:

| ID Curso | Nombre del Curso | Tiene PDF | Tiene Colegio |
|----------|------------------|-----------|---------------|
| 65 | 1° Basica A | ✅ Sí | ❌ No |
| 71 | 1° Basica A | ✅ Sí | ❌ No |
| 74 | 2° Basica B | ✅ Sí | ❌ No |
| 77 | 3° Basica C | ✅ Sí | ❌ No |
| 121542 | 1º Básico | ✅ Sí | ❌ No |
| 121729 | 2º Básico | ✅ Sí | ❌ No |
| 121959 | 3º Básico | ✅ Sí | ❌ No |
| 122094 | 4º Básico | ✅ Sí | ❌ No |
| 223560 | 1º Básico | ✅ Sí | ❌ No |
| 223563 | 2º Básico | ✅ Sí | ❌ No |
| 223566 | 3º Básico | ✅ Sí | ❌ No |
| 223569 | 4º Básico | ✅ Sí | ❌ No |
| ...y 14 más | ... | ✅ Sí | ❌ No |

**Total:** 26 cursos sin colegio asignado

---

## ❓ Preguntas para Strapi

### 1. **¿Por qué estos cursos no tienen relación con colegio?**
   - ¿Se subieron sin asignar colegio?
   - ¿Se eliminó la relación?
   - ¿Hay algún problema con el campo `colegio` en el content-type `curso`?

### 2. **¿Cómo identificar a qué colegio pertenecen estos cursos?**
   - ¿Hay algún campo adicional que podamos usar (nombre del colegio, RBD, etc.)?
   - ¿Se puede inferir el colegio por otros campos del curso?
   - ¿Hay registros de auditoría o logs que muestren el colegio original?

### 3. **¿Cómo asignar masivamente estos cursos a sus colegios?**
   - ¿Pueden asignar la relación desde Strapi?
   - ¿Necesitamos hacerlo uno por uno?
   - ¿Hay alguna forma de hacer una actualización masiva via API?

### 4. **¿Por qué solo 26 cursos de 53,857 tienen PDFs?**
   - ¿Los demás cursos están pendientes de subir PDFs?
   - ¿Es normal esta proporción?
   - ¿Hay algún proceso de importación masiva pendiente?

---

## 🛠️ Consultas SQL o API Útiles

### Consulta 1: Cursos con PDFs pero sin colegio

```sql
-- Identificar cursos con versiones_materiales pero sin relación con colegio
SELECT 
  id, 
  nombre_curso, 
  grado, 
  nivel,
  versiones_materiales
FROM cursos
WHERE 
  versiones_materiales IS NOT NULL 
  AND versiones_materiales != '[]'
  AND colegio IS NULL
```

### Consulta 2: Verificar relaciones de colegio

```sql
-- Ver la estructura de la relación colegio en los cursos
SELECT 
  id,
  nombre_curso,
  colegio
FROM cursos
WHERE id IN (65, 71, 74, 77, 121542, 121729, 121959, 122094, 223560, 223563, 223566, 223569)
```

### API Endpoint para verificar

```bash
# Verificar un curso específico con populate de colegio
GET https://strapi-pruebas-production.up.railway.app/api/cursos/65?populate=colegio
```

---

## 🎯 Solución Temporal Implementada

Mientras se resuelve el problema en Strapi, hemos implementado una solución temporal en el frontend:

- Los cursos sin colegio se agrupan en un colegio especial llamado **"Sin Colegio Asignado"**
- Se muestran con RBD "N/A" y región "N/A"
- Los usuarios pueden ver los cursos pero saben que necesitan asignación de colegio

**Esta es una solución temporal y NO debe usarse en producción.**

---

## ✅ Solución Definitiva Esperada

1. **Identificar el colegio correcto** para cada uno de los 26 cursos
2. **Asignar la relación** `colegio` en Strapi para cada curso
3. **Verificar** que todos los cursos con PDFs tengan colegio asignado
4. **Documentar el proceso** para evitar que vuelva a suceder

---

## 📊 Impacto Actual

### Impacto en la Aplicación:
- ❌ Los colegios no pueden ver sus listas de útiles correctamente
- ❌ Los 26 cursos con PDFs aparecen en un grupo "Sin Colegio Asignado"
- ❌ La funcionalidad de listas de útiles no es útil para los usuarios finales

### Impacto en los Datos:
- ✅ Los PDFs están correctamente subidos
- ✅ Los cursos existen en la base de datos
- ❌ Falta la relación con colegio

---

## 🚨 Urgencia

**Prioridad:** Alta

**Razón:** La funcionalidad de listas de útiles es una característica principal de la aplicación y necesita mostrarse al equipo pronto.

**Tiempo estimado de resolución esperado:** 
- Manual (uno por uno): ~1-2 horas
- Automático (script o query): ~15-30 minutos

---

## 📝 Notas Adicionales

### Información Técnica del Problema:

1. **Content-Type afectado:** `curso` (api::curso.curso)
2. **Campo problemático:** `colegio` (relación a `colegio`)
3. **Versión de Strapi:** v5
4. **Total de cursos:** 53,857
5. **Cursos con versiones_materiales:** 26
6. **Cursos con colegio asignado de esos 26:** 0

### Logs de Ejemplo:

```
[API] 🔍 Procesando curso: {
  cursoId: 65,
  nombre: '1° Basica A',
  tieneColegioData: false,
  colegioId: 'NO TIENE',
  colegioRBD: 'NO TIENE',
  colegioNombre: 'NO TIENE'
}

[API] ⚠️ Curso SIN colegio detectado: { cursoId: 65, nombre: '1° Basica A' }
```

---

## 🤝 Siguiente Paso

Por favor, revisen estos cursos en Strapi y:

1. **Confirmen** que efectivamente no tienen relación con colegio
2. **Identifiquen** a qué colegio pertenece cada curso
3. **Asignen** la relación correcta
4. **Notifiquen** cuando esté completado para verificar en la aplicación

---

**Fecha de reporte:** 29 de enero de 2026  
**Reportado por:** Equipo de Desarrollo Frontend  
**Prioridad:** Alta  
**Estado:** ✅ RESPONDIDO por equipo Strapi

---

## 📬 Respuesta de Strapi

**Fecha de respuesta:** 29 de enero de 2026

### Resultados del Análisis:
- **Total de cursos revisados:** 38,000+ (de 53,857 totales)
- **Cursos con PDFs encontrados:** 18 (no 26 como se reportó inicialmente)
- **Cursos con PDFs pero SIN colegio:** 18 (100% de los cursos con PDFs)

### Cursos Identificados:

| ID | Nombre del Curso | Grado | Nivel |
|----|------------------|-------|-------|
| 11 | 2° Media D | 2 | Media |
| 14 | 2° Basica B | 2 | Basica |
| 18 | 1° Basica A | 1 | Basica |
| 21 | 1° Basica A | 1 | Basica |
| 24 | 1° Basica A | 1 | Basica |
| 27 | 1° Basica B | 1 | Basica |
| 30 | 8° Basica A | 8 | Basica |
| 33 | 1° Media A | 1 | Media |
| 36 | 2° Media A | 2 | Media |
| 39 | 3° Media B | 3 | Media |
| 42 | 4° Media A | 4 | Media |
| 53 | 1° Basica A | 1 | Basica |
| 56 | 2° Basica B | 2 | Basica |
| 59 | 3° Basica C | 3 | Basica |
| 65 | 1° Basica A | 1 | Basica |
| 71 | 1° Basica A | 1 | Basica |
| 74 | 2° Basica B | 2 | Basica |
| 77 | 3° Basica C | 3 | Basica |

### Análisis de Strapi:
**Patrones detectados:**
- Cursos con nombres genéricos ("1° Basica A", "2° Basica B")
- Sin información de año
- IDs bajos (11-77), sugieren cursos antiguos o de prueba
- Posiblemente cursos de **prueba/demo** creados antes de tener la estructura completa

### Opciones Propuestas por Strapi:

#### Opción 1: Asignación Manual
**Tiempo:** 30-60 minutos
- Revisar cada curso en Strapi Admin
- Identificar a qué colegio pertenece
- Asignar manualmente la relación

#### Opción 2: Eliminar Cursos de Prueba (Si son solo de prueba)
**Tiempo:** 5 minutos
- Ejecutar script de eliminación
- Limpiar base de datos

#### Opción 3: Asignación Masiva por Script
**Tiempo:** 15 minutos
- Identificar patrón o colegio común
- Ejecutar script automatizado

---

## 💡 Recomendación del Equipo Frontend

Basándonos en el análisis de Strapi, **recomendamos:**

### ✅ Opción Recomendada: Verificar y Decidir

**Paso 1:** Revisar en Strapi Admin los primeros 3-5 cursos para determinar:
- ¿Son cursos de prueba/demo? → **Eliminar**
- ¿Son cursos reales de un colegio específico? → **Asignar colegio**

**Paso 2:** Según la verificación:
- **Si son cursos de prueba:** Ejecutar script de eliminación proporcionado por Strapi
- **Si son cursos reales:** Asignar colegio (manual o por script)

**Paso 3:** Después de la acción, verificar en la aplicación que:
- Los cursos eliminados ya no aparezcan en "Sin Colegio Asignado"
- Los cursos asignados aparezcan en su colegio correspondiente

### 🎯 Siguientes Pasos Inmediatos:

1. **Equipo Strapi:** Verificar los primeros 3-5 cursos en Strapi Admin
2. **Decidir:** ¿Eliminar o asignar?
3. **Ejecutar:** Script correspondiente
4. **Verificar:** Probar en `http://localhost:3000/crm/listas`
5. **Reportar:** Confirmar que el problema está resuelto

---

**Última actualización:** 29 de enero de 2026  
**Estado actual:** Esperando verificación en Strapi Admin para decidir acción
