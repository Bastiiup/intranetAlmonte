# 🎯 Prompts para Cursor - Strapi (Error Region)

**Fecha:** 9 de Enero 2026  
**Proyecto:** Strapi Backend  
**Herramienta:** Cursor AI

---

## 📋 Prompts Rápidos

### 1. Verificar la Solución Implementada

```
Revisa el archivo src/api/persona-trayectoria/content-types/persona-trayectoria/lifecycles.js y verifica que:

1. En el método syncColegioLocation, NO se esté haciendo populate de region como relación
2. region esté en fields (no en populate) porque es un string
3. La región se obtenga desde colegio.region o comuna.region_nombre
4. No haya referencias a region: { fields: ['id'] } en populate

Muestra el código actual y confirma que está correcto.
```

### 2. Verificar el Controller

```
Revisa el archivo src/api/persona-trayectoria/controllers/persona-trayectoria.js y verifica que:

1. Los métodos create() y update() tengan protección para eliminar region si está presente
2. Se registre un warning cuando se detecte y elimine region
3. El código elimine region ANTES de llamar a super.create() o super.update()

Muestra el código actual de ambos métodos.
```

### 3. Buscar Todas las Referencias a Region

```
Busca todas las referencias a "region" en el proyecto de Strapi, específicamente en:

1. src/api/persona-trayectoria/
2. Busca en populate que incluya region
3. Busca en fields que incluya region
4. Busca en el schema de persona-trayectoria

Muestra todas las ocurrencias encontradas y explica si alguna es problemática.
```

### 4. Verificar el Schema

```
Revisa el schema de persona-trayectoria en:
src/api/persona-trayectoria/content-types/persona-trayectoria/schema.json

Verifica que:
1. region NO esté definido como campo en el schema
2. Si está, remuévelo porque region es del colegio, no de la trayectoria

Muestra el schema actual y confirma que está correcto.
```

### 5. Agregar Logs de Debugging

```
Agrega logs de debugging en el lifecycle hook syncColegioLocation para:

1. Mostrar qué campos se están consultando del colegio
2. Mostrar si region está presente en el populate o fields
3. Mostrar de dónde se obtiene la región (colegio.region o comuna.region_nombre)
4. Mostrar si hay algún error al consultar el colegio

Agrega los logs en puntos clave del flujo.
```

---

## 🔍 Prompts de Investigación

### 6. Investigar el Flujo Completo

```
Explica el flujo completo cuando se crea una persona-trayectoria:

1. ¿Qué método del controller se ejecuta primero?
2. ¿Cuándo se ejecuta el lifecycle hook beforeCreate?
3. ¿Cuándo se ejecuta syncColegioLocation?
4. ¿En qué orden se ejecutan estos métodos?
5. ¿Dónde podría estar ocurriendo el error "Invalid key region"?

Muestra el flujo paso a paso con referencias a los archivos y líneas de código.
```

### 7. Verificar el Método syncColegioLocation

```
Revisa el método syncColegioLocation en el lifecycle hook y verifica:

1. Cómo se consulta el colegio (usando entityService.findOne)
2. Qué campos se solicitan en fields
3. Qué relaciones se solicitan en populate
4. Si region está siendo tratado como relación o como campo string
5. Cómo se obtiene la región (desde colegio.region o comuna.region_nombre)

Muestra el código completo del método y explica cada parte.
```

### 8. Verificar Consultas al Colegio

```
Busca todas las consultas a la entidad colegio en el proyecto, específicamente:

1. En el lifecycle hook de persona-trayectoria
2. En cualquier otro lugar donde se consulte colegio relacionado con trayectorias
3. Verifica que NO se esté haciendo populate de region como relación
4. Verifica que region esté en fields (si se necesita) o se obtenga desde comuna

Muestra todas las consultas encontradas y explica si están correctas.
```

---

## 🛠️ Prompts de Corrección

### 9. Corregir el Lifecycle Hook

```
Corrige el método syncColegioLocation en el lifecycle hook para:

1. Remover region del populate (si está)
2. Agregar region a fields (porque es string, no relación)
3. Obtener la región desde colegio.region o comuna.region_nombre
4. Agregar logs de debugging para rastrear el flujo
5. Manejar errores si el colegio no se encuentra

Muestra el código corregido completo.
```

### 10. Agregar Protección en el Controller

```
Agrega protección en los métodos create() y update() del controller para:

1. Verificar si region está presente en data
2. Eliminar region si está presente (con warning en logs)
3. Hacer esto ANTES de llamar a super.create() o super.update()
4. Agregar logs de debugging

Muestra el código completo de ambos métodos con la protección agregada.
```

### 11. Limpiar Referencias a Region

```
Busca y elimina todas las referencias problemáticas a region:

1. En populate que trate region como relación
2. En validaciones que incluyan region
3. En cualquier lugar donde se intente hacer populate de region

Muestra qué cambios se hicieron y explica por qué.
```

---

## 🧪 Prompts de Testing

### 12. Crear Test para Verificar la Solución

```
Crea un test o script de verificación que:

1. Intente crear una persona-trayectoria con un colegio válido
2. Verifique que NO se produzca el error "Invalid key region"
3. Verifique que la trayectoria se cree correctamente
4. Verifique que los logs muestren el flujo correcto
5. Verifique que region se obtenga correctamente desde el colegio

Muestra el código del test o script.
```

### 13. Verificar Logs de Strapi

```
Después de hacer rebuild de Strapi, revisa los logs cuando se crea una trayectoria:

1. ¿Aparece el warning de region en el controller? (si region llegó)
2. ¿Se ejecuta el lifecycle hook beforeCreate?
3. ¿Se ejecuta syncColegioLocation?
4. ¿Hay algún error relacionado con region?
5. ¿La trayectoria se crea exitosamente?

Explica qué logs deberían aparecer y cuáles no.
```

---

## 📚 Prompts de Documentación

### 14. Documentar la Solución

```
Crea documentación que explique:

1. Cuál era el problema (region tratado como relación)
2. Por qué ocurría el error
3. Cómo se solucionó
4. Qué cambios se hicieron en el código
5. Cómo verificar que la solución funciona

Formatea la documentación en Markdown con ejemplos de código.
```

### 15. Crear Guía de Troubleshooting

```
Crea una guía de troubleshooting para el error "Invalid key region" que incluya:

1. Cómo identificar si el error está ocurriendo
2. Dónde buscar en los logs
3. Qué verificar en el código
4. Pasos para corregir el problema
5. Cómo prevenir que vuelva a ocurrir

Incluye ejemplos de código correcto e incorrecto.
```

---

## 🚀 Prompts de Optimización

### 16. Optimizar la Consulta al Colegio

```
Optimiza la consulta al colegio en syncColegioLocation para:

1. Solo solicitar los campos necesarios
2. Usar populate solo para relaciones reales
3. Obtener region de la forma más eficiente
4. Manejar casos donde el colegio no existe
5. Agregar validaciones para evitar errores

Muestra el código optimizado.
```

### 17. Mejorar el Manejo de Errores

```
Mejora el manejo de errores en el lifecycle hook para:

1. Capturar errores al consultar el colegio
2. Loggear errores de forma clara
3. Continuar el flujo si es posible
4. Lanzar errores descriptivos si es necesario
5. Evitar que errores de region bloqueen la creación de trayectorias

Muestra el código mejorado con manejo de errores robusto.
```

---

## 💡 Tips para Usar estos Prompts

1. **Copia y pega** el prompt completo en Cursor
2. **Especifica el archivo** si el prompt no lo menciona explícitamente
3. **Revisa el código** generado antes de aplicarlo
4. **Prueba los cambios** después de aplicarlos
5. **Revisa los logs** para verificar que todo funciona

---

## 🔗 Referencias

- **Documento de investigación:** `INVESTIGACION-ERROR-REGION-URGENTE.md`
- **Documento de solución:** `PROMPT-ERROR-REGION-PERSISTENTE.md`
- **Guía de revisión:** `GUIA-REVISAR-STRAPI-REGION.md`

---

**Última actualización:** 9 de Enero 2026  
**Estado:** ✅ Listo para usar en Cursor
