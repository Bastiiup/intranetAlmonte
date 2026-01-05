# Guía de Merge: ramaBastian-V2 → main

## 📋 Información General

- **Rama origen**: `ramaBastian-V2`
- **Rama destino**: `main`
- **Fecha**: Enero 2025
- **Estado actual**: ✅ Rama lista para merge

## 🎯 Cambios Principales Incluidos

### 1. Sistema de Solicitudes de Colaboradores
- Los colaboradores se crean siempre como inactivos (`activo=false`)
- Nueva sección "Solicitudes de Colaboradores" solo accesible para `super_admin`
- Endpoint `/api/colaboradores/[id]/activate` para activar colaboradores
- Componente `SolicitudesColaboradoresListing.tsx`

### 2. Integración de Persona en Colaboradores
- Búsqueda de persona por RUT al crear/editar colaborador
- Campos de persona integrados en formularios
- Manejo automático de creación/actualización de personas
- Prevención de RUTs duplicados

### 3. Correcciones de Campos
- Cambio de `rol_principal` a `rol` (campo correcto en Strapi)
- Eliminación del campo `auth_provider` de formularios
- Corrección de roles: `soporte`, `encargado_adquisiciones`, `super_admin`, `supervisor`

### 4. Nuevos Endpoints y APIs
- `/api/personas` - CRUD de personas
- `/api/colaboradores/[id]/activate` - Activación de colaboradores
- Mejoras en `/api/colaboradores` y `/api/colaboradores/[id]`

---

## ✅ Pre-requisitos ANTES del Merge

### 1. Verificar Estado Actual

```bash
# Asegurarse de estar en el directorio correcto
cd C:\Trabajo\Intranet

# Verificar rama actual
git status

# Asegurarse de estar en ramaBastian-V2
git checkout ramaBastian-V2

# Verificar que esté actualizada con remoto
git fetch origin
git pull origin ramaBastian-V2
```

### 2. Verificar que TODO está Commiteado

```bash
# Verificar que no hay cambios sin commit
git status

# Si hay cambios, commitearlos primero
git add .
git commit -m "Descripción de cambios pendientes"
git push origin ramaBastian-V2
```

### 3. Actualizar la Rama main

```bash
# Cambiar a main
git checkout main

# Actualizar main con los últimos cambios del remoto
git fetch origin
git pull origin main

# Verificar que main está actualizada
git log --oneline -5
```

---

## 🔄 Proceso de Merge (Paso a Paso)

### Paso 1: Verificar Diferencias

```bash
# Volver a ramaBastian-V2
git checkout ramaBastian-V2

# Ver qué archivos cambiarán
git diff main --name-status

# Ver un resumen de commits que se van a mergear
git log main..ramaBastian-V2 --oneline
```

### Paso 2: Intentar Merge Local (DRY RUN)

```bash
# Cambiar a main
git checkout main

# Hacer merge en modo "dry run" (no aplicará cambios)
git merge --no-commit --no-ff ramaBastian-V2

# Si hay conflictos, verlos
git status

# Abortar el merge de prueba
git merge --abort
```

### Paso 3: Merge Real

```bash
# Asegurarse de estar en main
git checkout main

# Hacer el merge
git merge --no-ff ramaBastian-V2 -m "Merge ramaBastian-V2: Sistema de solicitudes de colaboradores y mejoras"

# Si aparece "Already up to date", significa que main ya tiene los cambios
# Si hay conflictos, ver sección "Resolución de Conflictos" abajo
```

### Paso 4: Verificar que el Merge Funcionó

```bash
# Verificar estado
git status

# Ver log de commits
git log --oneline --graph -10

# Verificar que los archivos esperados existen
ls frontend-ubold/src/app/(admin)/(apps)/colaboradores/solicitudes/
ls frontend-ubold/src/app/api/colaboradores/[id]/activate/
```

### Paso 5: Probar Localmente (RECOMENDADO)

```bash
# Instalar dependencias si es necesario
cd frontend-ubold
npm install

# Verificar que compila sin errores
npm run build

# Si hay errores, corregirlos ANTES de pushear
```

### Paso 6: Push a Remoto

```bash
# Solo después de verificar que todo funciona localmente
git push origin main
```

---

## ⚠️ Resolución de Conflictos

Si durante el merge aparecen conflictos, seguir estos pasos:

### 1. Identificar Archivos con Conflictos

```bash
git status
# Verás algo como:
# both modified: frontend-ubold/src/app/api/colaboradores/route.ts
```

### 2. Abrir Archivos Conflictivos

Los archivos tendrán marcadores de conflicto:
```
<<<<<<< HEAD
// Código de main
=======
// Código de ramaBastian-V2
>>>>>>> ramaBastian-V2
```

### 3. Resolver Conflictos

**Para cada archivo conflictivo:**

1. Revisar ambas versiones
2. Decidir qué código mantener (o combinar ambos)
3. Eliminar los marcadores `<<<<<<<`, `=======`, `>>>>>>>`
4. Guardar el archivo

### 4. Archivos que PODRÍAN Tener Conflictos

Basado en los cambios, estos archivos podrían tener conflictos:

#### Probable conflicto:
- `frontend-ubold/src/app/api/colaboradores/route.ts`
  - **Razón**: Modificaciones en manejo de persona y roles
  - **Solución**: Mantener cambios de `ramaBastian-V2`, incluyen mejoras

- `frontend-ubold/src/app/api/colaboradores/[id]/route.ts`
  - **Razón**: Cambios en actualización de colaboradores
  - **Solución**: Mantener cambios de `ramaBastian-V2`

- `frontend-ubold/src/layouts/components/data.ts`
  - **Razón**: Agregado enlace a solicitudes
  - **Solución**: Agregar el enlace sin eliminar otros items

#### Poco probable conflicto:
- `frontend-ubold/src/app/(admin)/(apps)/colaboradores/components/AddColaboradorForm.tsx`
- `frontend-ubold/src/app/(admin)/(apps)/colaboradores/components/EditColaboradorForm.tsx`

### 5. Después de Resolver Conflictos

```bash
# Agregar archivos resueltos
git add .

# Completar el merge
git commit -m "Merge ramaBastian-V2: Resueltos conflictos en [lista de archivos]"

# Verificar que todo está bien
git status
```

---

## 📁 Archivos Nuevos que se Agregarán

Estos archivos son NUEVOS y NO deberían causar conflictos:

```
frontend-ubold/src/app/(admin)/(apps)/colaboradores/solicitudes/
├── page.tsx
└── components/
    └── SolicitudesColaboradoresListing.tsx

frontend-ubold/src/app/api/personas/
└── route.ts

frontend-ubold/src/app/api/colaboradores/[id]/activate/
└── route.ts
```

---

## 📝 Archivos Modificados

### Frontend (React/Next.js):
- `frontend-ubold/src/app/(admin)/(apps)/colaboradores/components/AddColaboradorForm.tsx`
- `frontend-ubold/src/app/(admin)/(apps)/colaboradores/components/EditColaboradorForm.tsx`
- `frontend-ubold/src/layouts/components/data.ts`

### Backend (API Routes):
- `frontend-ubold/src/app/api/colaboradores/route.ts`
- `frontend-ubold/src/app/api/colaboradores/[id]/route.ts`

### Strapi (Schema):
- `BdEstructura/strapi/src/api/colaborador/content-types/colaborador/schema.json`

---

## 🔍 Verificación Post-Merge

### 1. Verificar que los Archivos Están Correctos

```bash
# Verificar estructura de archivos nuevos
ls -la frontend-ubold/src/app/(admin)/(apps)/colaboradores/solicitudes/

# Verificar que los endpoints existen
ls -la frontend-ubold/src/app/api/colaboradores/[id]/activate/
ls -la frontend-ubold/src/app/api/personas/
```

### 2. Verificar Build

```bash
cd frontend-ubold
npm run build

# Debe compilar sin errores
```

### 3. Verificar que el Menú Tiene la Nueva Opción

Verificar en `frontend-ubold/src/layouts/components/data.ts` que existe:
```typescript
{ key: 'colaboradores-solicitudes', label: 'Solicitudes de Colaboradores', url: '/colaboradores/solicitudes', roles: ['super_admin'] },
```

### 4. Probar Funcionalidad (Si es posible)

1. Iniciar el servidor de desarrollo: `npm run dev`
2. Navegar a: `/colaboradores/solicitudes`
3. Verificar que solo `super_admin` puede acceder
4. Intentar activar un colaborador

---

## 🚨 Si Algo Sale Mal

### Opción 1: Abortar Merge

```bash
# Si aún no has hecho commit del merge
git merge --abort

# Volver a ramaBastian-V2
git checkout ramaBastian-V2
```

### Opción 2: Revert Merge (Después de Commit)

```bash
# Si ya hiciste commit pero quieres deshacerlo
git revert -m 1 HEAD

# O volver al commit anterior
git reset --hard HEAD~1
```

### Opción 3: Resolver Conflictos Gradualmente

```bash
# Si hay muchos conflictos, resolver uno por uno
git status  # Ver qué archivos tienen conflictos
# Abrir cada archivo, resolver, luego:
git add <archivo-resuelto>
git commit -m "Resuelto conflicto en <archivo>"
```

---

## 📊 Checklist Final

Antes de considerar el merge completo:

- [ ] Merge realizado sin conflictos (o conflictos resueltos)
- [ ] `git status` muestra "nothing to commit, working tree clean"
- [ ] Build de Next.js funciona sin errores (`npm run build`)
- [ ] Archivos nuevos existen en sus ubicaciones correctas
- [ ] Menú actualizado con enlace a solicitudes
- [ ] Cambios pusheados a `main` remoto
- [ ] Verificado que Railway/despliegue funciona correctamente

---

## 🎯 Comandos Resumen (Quick Reference)

```bash
# 1. Preparación
git checkout ramaBastian-V2
git pull origin ramaBastian-V2
git checkout main
git pull origin main

# 2. Merge
git merge --no-ff ramaBastian-V2 -m "Merge ramaBastian-V2: Sistema de solicitudes de colaboradores"

# 3. Si hay conflictos, resolver y luego:
git add .
git commit -m "Merge completado con conflictos resueltos"

# 4. Verificación
cd frontend-ubold
npm run build

# 5. Push
git push origin main
```

---

## 📞 Soporte

Si encuentras problemas durante el merge:

1. **Revisar logs**: `git log --oneline --graph -20`
2. **Ver diferencias**: `git diff main ramaBastian-V2`
3. **Verificar estado**: `git status`
4. **Revisar este documento**: Buscar la sección relevante arriba

---

**Última actualización**: Enero 2025  
**Rama**: ramaBastian-V2  
**Estado**: ✅ Lista para merge


