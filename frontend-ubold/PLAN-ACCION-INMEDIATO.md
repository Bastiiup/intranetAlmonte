# Plan de Acción Inmediato: Oportunidades CRM

## ✅ Estado Actual

### Completado:
1. ✅ **Content-type creado en Strapi** (rama `etiquetas-gonza`)
   - Schema completo con todos los campos
   - Relaciones: contacto (Persona), propietario (Colaborador), producto (Libro)
   - Controllers, services y routes básicos

2. ✅ **Frontend implementado**
   - API routes (`/api/crm/oportunidades`)
   - Página de listado (`/crm/opportunities`)
   - Pipeline Kanban (`/crm/pipeline`)
   - Drag & drop funcional

3. ✅ **Código pusheado**
   - Strapi: rama `etiquetas-gonza` → commit `7deea51`
   - Frontend: rama `mati-integracion` → todo listo

## 🎯 Próximos Pasos (En Orden)

### Paso 1: Merge a Producción en Strapi ⚠️ CRÍTICO

**Objetivo**: Llevar el content-type a producción

**Opciones**:

**Opción A: Merge directo (si tienes acceso)**
```bash
cd ../strapi-backend
git checkout clean-main  # o la rama principal de producción
git pull origin clean-main
git merge etiquetas-gonza
git push origin clean-main
```

**Opción B: Crear Pull Request**
1. Ir a https://github.com/Zenn-Dev99/BdEstructura
2. Crear PR desde `etiquetas-gonza` → `clean-main` (o rama principal)
3. Revisar y mergear
4. Railway desplegará automáticamente

**Opción C: Desplegar manualmente en Strapi Admin** (si no puedes hacer merge)
1. Ir a https://strapi.moraleja.cl/admin
2. Content-Type Builder → "+ Create new collection type"
3. Seguir la guía en `CREAR-CONTENT-TYPE-OPORTUNIDAD.md`
4. ⚠️ **IMPORTANTE**: Usar exactamente los mismos nombres y tipos

**Tiempo estimado**: 5-15 minutos

---

### Paso 2: Configurar Permisos en Strapi Admin 🔐

**Objetivo**: Permitir que el frontend acceda a las oportunidades

**Pasos**:
1. Ir a https://strapi.moraleja.cl/admin
2. **Settings** → **Users & Permissions plugin** → **Roles**
3. Seleccionar el rol apropiado:
   - Si el frontend usa autenticación: **Authenticated**
   - Si es público: **Public**
   - Para admins: **Administrator**
4. Buscar la sección **"Oportunidad"** (o "Oportunidades")
5. Habilitar estos permisos:
   - ✅ **find** (listar)
   - ✅ **findOne** (ver detalle)
   - ✅ **create** (crear)
   - ✅ **update** (editar)
   - ✅ **delete** (eliminar)
6. **Guardar**

**Tiempo estimado**: 2 minutos

---

### Paso 3: Probar que Funciona 🧪

**Objetivo**: Verificar que todo funciona end-to-end

**Checklist de Pruebas**:

1. **Crear oportunidad de prueba en Strapi**
   - Ir a Content Manager → Oportunidad → Create new entry
   - Llenar campos básicos:
     - Nombre: "Oportunidad de Prueba"
     - Etapa: Qualification
     - Estado: open
     - Prioridad: medium
   - Guardar y publicar

2. **Verificar en Frontend - Listado**
   - Ir a `/crm/opportunities`
   - ✅ Debe aparecer la oportunidad creada
   - ✅ No debe haber errores en consola

3. **Verificar en Frontend - Pipeline**
   - Ir a `/crm/pipeline`
   - ✅ Debe aparecer en la sección "Qualification"
   - ✅ Debe mostrar el nombre correcto

4. **Probar Drag & Drop**
   - Arrastrar la oportunidad a otra etapa (ej: "Proposal Sent")
   - ✅ Debe moverse visualmente
   - ✅ Debe actualizarse en Strapi (verificar en Content Manager)

5. **Probar Filtros**
   - Filtrar por etapa, estado, prioridad
   - ✅ Debe filtrar correctamente

**Tiempo estimado**: 10-15 minutos

---

### Paso 4: Si Algo No Funciona 🔧

#### Error 404 al acceder a `/api/crm/oportunidades`
- ✅ Verificar que el content-type existe en Strapi
- ✅ Verificar permisos (Paso 2)
- ✅ Verificar que Strapi se reinició después de crear el content-type

#### Error en relaciones
- ✅ Verificar que Persona existe
- ✅ Verificar que Colaborador existe
- ✅ Verificar que Libro existe
- ✅ Verificar los targets en las relaciones

#### No aparece en frontend
- ✅ Revisar consola del navegador (F12)
- ✅ Revisar Network tab (ver si la petición a `/api/crm/oportunidades` funciona)
- ✅ Revisar logs del servidor Next.js

---

## 📋 Checklist Completo

```
[ ] Paso 1: Merge/Desplegar content-type a producción
[ ] Paso 2: Configurar permisos en Strapi Admin
[ ] Paso 3.1: Crear oportunidad de prueba en Strapi
[ ] Paso 3.2: Verificar que aparece en /crm/opportunities
[ ] Paso 3.3: Verificar que aparece en /crm/pipeline
[ ] Paso 3.4: Probar drag & drop
[ ] Paso 3.5: Probar filtros
[ ] ✅ Todo funciona correctamente
```

---

## 🚀 Después de Completar

Una vez que Oportunidades funcione completamente:

1. **Mejorar UI/UX**
   - Agregar modales de crear/editar (si no existen)
   - Mejorar visualización de datos
   - Agregar validaciones

2. **Agregar Funcionalidades**
   - Exportar oportunidades a CSV/Excel
   - Métricas y reportes
   - Notificaciones
   - Historial de cambios

3. **Continuar con Otros Módulos**
   - Leads
   - Deals
   - Actividades
   - Tareas

---

## ⏱️ Tiempo Total Estimado

- **Paso 1** (Merge/Desplegar): 5-15 minutos
- **Paso 2** (Permisos): 2 minutos
- **Paso 3** (Pruebas): 10-15 minutos
- **Total**: ~20-30 minutos

---

## 💡 Resumen Ejecutivo

**Ahora mismo necesitas hacer**:

1. **Merge/Desplegar** el content-type a producción (Paso 1)
2. **Configurar permisos** (Paso 2)
3. **Probar** que todo funciona (Paso 3)

**Resultado esperado**: Módulo de Oportunidades completamente funcional con datos reales de Strapi.
