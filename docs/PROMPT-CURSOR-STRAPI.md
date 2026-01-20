# 🎯 Prompt para Cursor - Corregir Error "Invalid key region"

**Copia y pega esto en Cursor en el proyecto de Strapi:**

---

## Prompt Principal

```
Necesito encontrar y corregir un error en Strapi. Cuando se crea una "persona-trayectorias" vía POST, Strapi rechaza la petición con el error:

"Invalid key region" - ValidationError

El problema es que hay un lifecycle hook (probablemente beforeCreate) en el content type "persona-trayectorias" que está consultando el colegio con fields: ['id', 'region'], y esto está causando que Strapi valide "region" como campo directo aunque no lo estemos enviando.

Por favor:
1. Busca el archivo de lifecycles de "persona-trayectorias" o "persona-trayectoria"
2. Encuentra el hook beforeCreate que consulta el colegio con fields que incluyen 'region'
3. Muestra el código completo del hook
4. Corrígelo para que NO incluya 'region' en fields cuando consulta el colegio
5. Asegúrate de que el hook siga funcionando correctamente para asignar colegio_region
```

---

## Prompt Alternativo (Más Específico)

```
Busca en el proyecto Strapi el lifecycle hook del content type "persona-trayectorias" que tiene un beforeCreate o beforeUpdate que:

1. Consulta el colegio usando strapi.entityService.findOne con fields: ['id', 'region']
2. Asigna colegio_region basado en colegio.region o colegio.comuna.region_nombre

El problema es que incluir 'region' en fields está causando que Strapi valide 'region' como campo directo de persona-trayectorias, lo cual causa el error "Invalid key region".

Necesito:
- Ver el código completo del hook
- Corregirlo para quitar 'region' de fields
- Mantener la funcionalidad de asignar colegio_region correctamente
```

---

## Prompt de Búsqueda Rápida

```
Busca todos los archivos de lifecycles en el proyecto que mencionen:
- "persona-trayectoria" o "persona-trayectorias"
- "region" en fields
- "colegio" y "entityService.findOne"

Muéstrame los archivos encontrados y el código relevante.
```

---

## Instrucciones de Uso

1. **Abre Cursor en el proyecto de Strapi**
2. **Copia uno de los prompts de arriba**
3. **Pégalo en el chat de Cursor**
4. **Cursor te ayudará a encontrar y corregir el código**

---

## Qué Esperar

Cursor debería:
- ✅ Encontrar el archivo `lifecycles.js` de persona-trayectorias
- ✅ Mostrarte el hook problemático
- ✅ Sugerir la corrección (quitar 'region' de fields)
- ✅ Aplicar el cambio si lo apruebas

---

## Verificación Después del Cambio

Después de corregir:
1. Reinicia Strapi
2. Prueba crear una trayectoria desde el frontend
3. Verifica que el error "Invalid key region" desaparece
4. Verifica que `colegio_region` se asigna correctamente

---

**Última actualización:** Enero 2026
