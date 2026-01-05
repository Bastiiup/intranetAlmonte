# Próximos Pasos: Completar Integración de Oportunidades

## ✅ Lo que ya está hecho

1. ✅ **API Routes creadas** (`/api/crm/oportunidades`)
   - GET (listar con filtros)
   - POST (crear)
   - PUT (actualizar)
   - DELETE (eliminar)

2. ✅ **Frontend conectado**
   - Página de listado funcionando
   - Filtros y búsqueda implementados
   - Manejo de errores cuando el content-type no existe

3. ✅ **Pipeline integrado**
   - Vista Kanban funcionando
   - Drag & drop para cambiar etapas
   - Actualización automática en Strapi

4. ✅ **Documentación completa**
   - Guías de creación
   - Prompts para IA
   - Schemas de referencia

## ⏳ Lo que falta hacer

### Paso 1: Crear el Content-Type en Strapi (CRÍTICO)

**Opción A: Usar el prompt con IA**
1. Abre Cursor/Claude/ChatGPT
2. Copia el prompt de `PROMPT-STRAPI-PRODUCCION-OPORTUNIDAD.md`
3. La IA te guiará paso a paso en Strapi Admin

**Opción B: Crear manualmente**
1. Ve a https://strapi.moraleja.cl/admin
2. Content-Type Builder → "+ Create new collection type"
3. Nombre: **"Oportunidad"** (singular, mayúscula inicial)
4. Agrega todos los campos según `CREAR-CONTENT-TYPE-OPORTUNIDAD.md`
5. **IMPORTANTE**: Para la relación `propietario`, el target debe ser:
   - `intranet-colaboradores` (seleccionar de la lista)
   - O escribir: `api::intranet-colaboradores.intranet-colaboradores`
6. Guarda y espera a que Strapi reinicie

### Paso 2: Configurar Permisos

1. En Strapi Admin: **Settings** → **Users & Permissions plugin** → **Roles**
2. Selecciona el rol apropiado (Authenticated, Public, Admin, etc.)
3. Busca la sección **"Oportunidad"**
4. Habilita:
   - ✅ **find**
   - ✅ **findOne**
   - ✅ **create**
   - ✅ **update**
   - ✅ **delete**
5. Guarda

### Paso 3: Verificar que Funciona

1. Ve a `/crm/opportunities` en tu aplicación
2. Deberías ver la lista (vacía si no hay datos)
3. Prueba crear una oportunidad de prueba desde Strapi Admin:
   - Content Manager → Oportunidad → Create new entry
   - Llena los campos básicos
   - Guarda
4. Verifica que aparece en `/crm/opportunities`
5. Prueba el Pipeline en `/crm/pipeline`
6. Prueba mover una oportunidad entre etapas

### Paso 4: Probar Funcionalidad Completa

- [ ] Crear oportunidad desde Strapi → aparece en frontend
- [ ] Crear oportunidad desde frontend (si hay modal)
- [ ] Editar oportunidad
- [ ] Filtrar por etapa, estado, prioridad
- [ ] Buscar oportunidades
- [ ] Mover en Pipeline (drag & drop)
- [ ] Verificar que se actualiza en Strapi al mover

## 🎯 Plan de Acción Inmediato

### HOY (Prioridad Alta):

1. **Crear el content-type en Strapi** (15-20 minutos)
   - Usar el prompt de `PROMPT-STRAPI-PRODUCCION-OPORTUNIDAD.md`
   - O seguir `CREAR-CONTENT-TYPE-OPORTUNIDAD.md` manualmente

2. **Configurar permisos** (2 minutos)
   - Settings → Roles → habilitar permisos

3. **Probar básico** (5 minutos)
   - Crear oportunidad de prueba
   - Verificar que aparece en frontend

### MAÑANA (Si todo funciona):

4. **Agregar modales de crear/editar** (si no existen)
5. **Mejorar UI/UX** según feedback
6. **Continuar con siguiente módulo** (Leads, Deals, etc.)

## 📋 Checklist Rápido

```
[ ] Content-type "Oportunidad" creado en Strapi
[ ] Todos los campos agregados correctamente
[ ] Relación con Persona configurada
[ ] Relación con intranet-colaboradores configurada
[ ] Permisos configurados (find, findOne, create, update, delete)
[ ] Oportunidad de prueba creada
[ ] Verificado que aparece en /crm/opportunities
[ ] Verificado que aparece en /crm/pipeline
[ ] Probado drag & drop en Pipeline
[ ] Verificado que se actualiza en Strapi
```

## 🆘 Si Algo No Funciona

### Error 404 al acceder
- Verifica que el content-type se llamó exactamente "Oportunidad"
- Verifica permisos

### Error en relaciones
- Verifica que Persona existe
- Verifica que intranet-colaboradores existe
- Verifica el target exacto en la relación

### No aparece en frontend
- Verifica que los permisos están habilitados
- Revisa la consola del navegador
- Revisa los logs del servidor

## 🚀 Después de Completar

Una vez que Oportunidades funcione completamente:

1. **Continuar con Pipeline** (ya está integrado, solo verificar)
2. **Siguiente módulo**: Leads o Deals
3. **Mejoras**: Agregar modales, exportar datos, métricas, etc.

## 💡 Resumen Ejecutivo

**Ahora mismo necesitas:**
1. Crear el content-type en Strapi (usar prompt o guía manual)
2. Configurar permisos
3. Probar que funciona

**Tiempo estimado:** 20-30 minutos

**Resultado:** Módulo de Oportunidades completamente funcional con datos reales de Strapi
