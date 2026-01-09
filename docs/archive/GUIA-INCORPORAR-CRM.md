# 📋 Guía: Incorporar CRM desde rama `mati-integracion`

**Fecha:** Enero 2026  
**Rama origen:** `mati-integracion`  
**Rama destino:** Tu rama de trabajo

---

## 🎯 Objetivo

Incorporar todas las funcionalidades del CRM (gestión de colegios, contactos, trayectorias) desde la rama `mati-integracion` a tu rama de trabajo.

---

## 📦 Paso 1: Obtener Cambios de la Rama

```bash
# Asegúrate de estar en tu rama
git checkout tu-rama

# Obtener los cambios de mati-integracion
git fetch origin mati-integracion

# Opción A: Merge completo (recomendado)
git merge origin/mati-integracion

# Opción B: Cherry-pick commits específicos (si solo quieres algunos cambios)
git cherry-pick <commit-hash>
```

---

## 📁 Paso 2: Archivos Principales del CRM

### Frontend - Páginas y Componentes

```
frontend-ubold/src/app/(admin)/(apps)/crm/
├── colegios/
│   ├── page.tsx                    # Listado de colegios
│   ├── [id]/
│   │   ├── page.tsx                # Detalle de colegio
│   │   └── editar/
│   │       └── page.tsx            # Editar colegio
│   └── components/
│       ├── ColegiosListing.tsx
│       └── ColegioForm.tsx
├── personas/
│   ├── page.tsx                    # Listado de personas/contactos
│   ├── [id]/
│   │   ├── page.tsx                # Detalle de persona
│   │   └── editar/
│   │       └── page.tsx            # Editar persona
│   ├── nuevo/
│   │   └── page.tsx                # Crear nueva persona
│   └── components/
│       ├── PersonaForm.tsx
│       └── TrayectoriaManager.tsx  # ⚠️ IMPORTANTE: Gestión de trayectorias
└── contacts/
    ├── page.tsx                    # Listado de contactos
    └── components/
        ├── AddContactModal.tsx
        └── EditContactModal.tsx
```

### Backend - API Routes

```
frontend-ubold/src/app/api/
├── crm/
│   ├── colegios/
│   │   ├── route.ts                # GET, POST /api/crm/colegios
│   │   ├── [id]/
│   │   │   ├── route.ts            # GET, PUT, DELETE /api/crm/colegios/[id]
│   │   │   ├── contacts/
│   │   │   │   └── route.ts        # GET /api/crm/colegios/[id]/contacts
│   │   │   ├── pedidos/
│   │   │   │   └── route.ts        # GET /api/crm/colegios/[id]/pedidos
│   │   │   ├── leads/
│   │   │   │   └── route.ts        # GET /api/crm/colegios/[id]/leads
│   │   │   └── activities/
│   │   │       └── route.ts        # GET /api/crm/colegios/[id]/activities
│   │   └── list/
│   │       └── route.ts            # GET /api/crm/colegios/list (para selectores)
│   ├── contacts/
│   │   ├── route.ts                # GET, POST /api/crm/contacts
│   │   └── [id]/
│   │       └── route.ts            # GET, PUT /api/crm/contacts/[id]
│   └── personas/
│       └── [id]/
│           └── route.ts            # GET, PUT /api/crm/personas/[id]
└── persona-trayectorias/
    ├── route.ts                    # POST /api/persona-trayectorias
    └── [id]/
        └── route.ts                # PUT, DELETE /api/persona-trayectorias/[id]
```

---

## ⚙️ Paso 3: Verificar Dependencias

No se requieren nuevas dependencias. El CRM usa:
- `react-bootstrap` (ya incluido)
- `react-icons/lu` y `react-icons/tb` (ya incluidos)
- `next/navigation` (Next.js 16)

---

## 🗄️ Paso 4: Verificar Content Types en Strapi

Asegúrate de que estos content types existan en Strapi:

### 1. `colegios` (Colegios)
- Campos principales: `colegio_nombre`, `rbd`, `dependencia`, `estado`, `region`, `zona`
- Relaciones: `comuna`, `cartera_asignaciones`, `persona_trayectorias`
- Componentes: `telefonos`, `emails`, `direcciones`

### 2. `personas` (Personas/Contactos)
- Campos principales: `nombre_completo`, `nombres`, `apellidos`, `rut`, `activo`
- Relaciones: `trayectorias`, `tags`
- Componentes: `emails`, `telefonos`
- Media: `imagen`

### 3. `profesores` (Trayectorias) ⚠️ IMPORTANTE
- **Nombre técnico en Strapi:** `profesores` (no `persona-trayectorias`)
- Relaciones: `persona` (manyToOne), `colegio` (manyToOne), `curso`, `asignatura`
- Campos: `cargo`, `anio`, `is_current`, `activo`

### 4. `comunas` (Ubicación)
- Campo: `nombre`, `region_nombre`

---

## 🔧 Paso 5: Resolver Conflictos (si los hay)

Si hay conflictos durante el merge:

1. **Conflictos en rutas de navegación:**
   - Verifica que las rutas `/crm/*` no estén duplicadas
   - Asegúrate de que el layout principal incluya las rutas del CRM

2. **Conflictos en tipos TypeScript:**
   - Verifica que los tipos `ColegioData`, `ContactoData`, etc. estén definidos
   - Revisa que las interfaces coincidan con la estructura de Strapi

3. **Conflictos en componentes compartidos:**
   - Si hay componentes compartidos modificados, revisa manualmente
   - Prioriza mantener la funcionalidad del CRM

---

## ✅ Paso 6: Verificar que Todo Funciona

### 1. Verificar Build
```bash
npm run build
```

### 2. Probar Endpoints
- ✅ `/api/crm/colegios` - Listar colegios
- ✅ `/api/crm/colegios/[id]` - Detalle de colegio
- ✅ `/api/crm/colegios/[id]/contacts` - Contactos del colegio
- ✅ `/api/crm/contacts` - Listar contactos
- ✅ `/api/persona-trayectorias` - Crear trayectoria

### 3. Probar Páginas
- ✅ `/crm/colegios` - Listado de colegios
- ✅ `/crm/colegios/[id]` - Detalle de colegio (con tabs)
- ✅ `/crm/personas` - Listado de personas
- ✅ `/crm/personas/nuevo` - Crear persona
- ✅ `/crm/personas/[id]/editar` - Editar persona

### 4. Probar Funcionalidades
- ✅ Crear contacto con colegio
- ✅ Ver contactos en detalle de colegio
- ✅ Editar contacto y verificar que se guarda
- ✅ Crear trayectoria (relación persona-colegio)

---

## 🐛 Problemas Comunes y Soluciones

### Error: "Cannot find module '@/lib/strapi'"
**Solución:** Verifica que `frontend-ubold/src/lib/strapi/` existe con:
- `client.ts`
- `types.ts`

### Error: "Content type 'profesores' not found"
**Solución:** En Strapi, el content type se llama `profesores`, no `persona-trayectorias`. Verifica en Strapi Admin.

### Error: "Contactos no aparecen en colegio"
**Solución:** 
1. Verifica que las trayectorias se crean correctamente
2. Revisa los logs en consola del navegador
3. Verifica que el endpoint `/api/crm/colegios/[id]/contacts` funciona

### Error: "IDs inválidos al crear trayectoria"
**Solución:** 
- Asegúrate de usar IDs numéricos, no `documentId` para `connect` en Strapi
- Verifica que `personaId` y `colegioId` sean números válidos antes de crear

---

## 📝 Notas Importantes

1. **Content Type `profesores`:**
   - El endpoint es `/api/profesores`, no `/api/persona-trayectorias`
   - El código usa `/api/persona-trayectorias` como proxy que redirige a `/api/profesores`

2. **IDs en Strapi:**
   - Para `connect` en relaciones, siempre usa el ID numérico (`id`), no `documentId`
   - Para búsquedas, puedes usar ambos

3. **Populate en Strapi v4:**
   - Sintaxis correcta: `populate[relacion][populate][subrelacion]`
   - Sintaxis incorrecta: `populate[relacion.subrelacion]`

4. **Trayectorias:**
   - Una persona puede tener múltiples trayectorias
   - Solo una trayectoria puede tener `is_current: true`
   - Las trayectorias conectan `persona` + `colegio` + datos contextuales (cargo, curso, asignatura)

---

## 🔗 Commits Importantes

Si necesitas hacer cherry-pick de commits específicos:

```bash
# Commits principales del CRM
git log --oneline origin/mati-integracion | grep -i crm

# O busca por mensaje
git log --oneline --grep="crm" origin/mati-integracion
```

---

## 📚 Documentación Adicional

En la rama `mati-integracion` encontrarás estos documentos:
- `EXPLICACION-CONTACTOS-Y-COLEGIOS.md` - Explicación del modelo de datos
- `EXPLICACION-QUERIES-STRAPI.md` - Queries y filtros de Strapi
- `MANEJO-ACTUAL-COLEGIOS-Y-CONTACTOS.md` - Guía de uso actual
- `SOLUCION-CONTACTOS-NO-APARECEN-EN-COLEGIO.md` - Solución de problemas
- `ANALISIS-ARQUITECTURA-CONTACTOS-VS-PERSONAS.md` - Análisis arquitectónico

---

## ✅ Checklist Final

- [ ] Merge/cherry-pick completado sin errores
- [ ] Build compila correctamente (`npm run build`)
- [ ] Content types verificados en Strapi
- [ ] Endpoints API funcionando
- [ ] Páginas del CRM accesibles
- [ ] Crear contacto funciona
- [ ] Contactos aparecen en detalle de colegio
- [ ] Editar contacto funciona
- [ ] Trayectorias se crean correctamente

---

**Última actualización:** Enero 2026  
**Rama origen:** `mati-integracion`  
**Autor:** Mati
