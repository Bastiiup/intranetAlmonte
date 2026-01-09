# Guía para Traer y Mezclar Cambios de Pedidos

## 📋 Resumen

Esta guía te ayudará a traer todos los cambios relacionados con pedidos desde la rama `mati-integracion` y mezclarlos con tu rama actual.

---

## 🎯 Objetivo

Traer los siguientes cambios de pedidos:
- ✅ Sistema de pestañas en detalle de pedido (Detalle / Editar Estado)
- ✅ Editor de estado editable directamente en el badge
- ✅ Botones de navegación en listado de pedidos
- ✅ Mejoras visuales y UX
- ✅ Corrección de errores de Client Components
- ✅ Actualización automática del timeline de envío

---

## 📦 Commits Relacionados con Pedidos

Los siguientes commits contienen cambios de pedidos (en orden cronológico):

1. **`a8f5a4e`** - `feat: Agregar editor de estado editable en detalle de pedido`
2. **`f6c0073`** - `style: Mejorar diseño visual del editor de estado en detalle de pedido`
3. **`a64ce71`** - `feat: Agregar sistema de pestañas en detalle de pedido`
4. **`58fad83`** - `feat: Agregar botones de ver/editar en listado de pedidos`
5. **`905f73f`** - `fix: Corregir error de funciones en Client Components`
6. **`5de664b`** - `perf: Mejorar actualización inmediata de timeline al cambiar estado`

---

## 🚀 Pasos para Traer los Cambios

### Paso 1: Verificar tu Rama Actual

```bash
# Ver en qué rama estás
git branch --show-current

# Ver el estado de tu repositorio
git status
```

**Importante**: Asegúrate de que no tengas cambios sin commitear. Si los tienes, haz commit o usa `git stash`.

---

### Paso 2: Traer los Cambios del Repositorio Remoto

```bash
# Traer todas las ramas y commits del remoto
git fetch origin

# Verificar que la rama mati-integracion existe
git branch -r | grep mati-integracion
```

---

### Paso 3: Opción A - Cherry-pick (Recomendado si quieres commits específicos)

Si solo quieres traer los commits de pedidos sin todo el historial:

```bash
# Cherry-pick de los commits de pedidos (en orden)
git cherry-pick a8f5a4e
git cherry-pick f6c0073
git cherry-pick a64ce71
git cherry-pick 58fad83
git cherry-pick 905f73f
git cherry-pick 5de664b
```

**Si hay conflictos durante el cherry-pick:**
```bash
# Ver qué archivos tienen conflictos
git status

# Resolver los conflictos manualmente en los archivos
# Luego:
git add <archivos-resueltos>
git cherry-pick --continue

# O si quieres cancelar:
git cherry-pick --abort
```

---

### Paso 3: Opción B - Merge Completo (Si quieres todos los cambios)

Si quieres traer todos los cambios de `mati-integracion`:

```bash
# Cambiar a tu rama (si no estás en ella)
git checkout tu-rama

# Hacer merge de mati-integracion
git merge origin/mati-integracion
```

**Si hay conflictos:**
```bash
# Ver archivos con conflictos
git status

# Resolver conflictos manualmente
# Luego:
git add <archivos-resueltos>
git commit -m "Merge: Resolver conflictos con mati-integracion"
```

---

## 📁 Archivos Modificados (Para Referencia)

Los siguientes archivos fueron modificados/creados en los cambios de pedidos:

### Nuevos Archivos:
- `frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/atributos/pedidos/[pedidoId]/components/OrderSummaryEditable.tsx`
- `frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/atributos/pedidos/[pedidoId]/components/PedidoTabs.tsx`

### Archivos Modificados:
- `frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/atributos/pedidos/[pedidoId]/page.tsx`
- `frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/atributos/pedidos/components/PedidosListing.tsx`
- `frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/atributos/pedidos/[pedidoId]/components/OrderStatusEditor.tsx` (puede que ya no se use)

---

## 🔍 Verificación Post-Merge

Después de hacer el merge, verifica que todo funciona:

### 1. Verificar que los Archivos Están Presentes

```bash
# Verificar que los nuevos componentes existen
ls frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/atributos/pedidos/[pedidoId]/components/

# Deberías ver:
# - OrderSummaryEditable.tsx
# - PedidoTabs.tsx
```

### 2. Verificar que No Hay Errores de TypeScript

```bash
cd frontend-ubold
npm run type-check
```

### 3. Verificar que el Build Funciona

```bash
cd frontend-ubold
npm run build
```

---

## ⚠️ Resolución de Conflictos Comunes

### Conflicto en `PedidosListing.tsx`

Si hay conflicto en este archivo, probablemente es porque ambos modificaron la columna de acciones.

**Solución**: Acepta los cambios de `mati-integracion` que incluyen:
- Botón "Ver" con ícono de ojo
- Número de pedido como enlace clickeable

### Conflicto en `page.tsx` (detalle de pedido)

Si hay conflicto, probablemente es por el sistema de pestañas.

**Solución**: Acepta los cambios de `mati-integracion` que incluyen:
- Importación de `PedidoTabs`
- Uso de `detalleContent` y `editarContent` como props

### Conflicto en Componentes de Orders

Si hay conflictos en componentes compartidos (`OrderSummary`, `ShippingActivity`, etc.):

**Solución**: Generalmente acepta los cambios de `mati-integracion` ya que solo se están usando, no modificando.

---

## 🎨 Funcionalidades Incluidas

### 1. Sistema de Pestañas en Detalle de Pedido

- **Pestaña "Detalle de Pedido"**: Vista de solo lectura, estilo exacto de `/orders/[orderId]`
- **Pestaña "Editar Estado"**: Vista con editor de estado funcional

**Ubicación**: `/atributos/pedidos/[pedidoId]`

### 2. Editor de Estado Editable

- Badge de estado con botón de edición (ícono de lápiz)
- Al hacer clic, se convierte en selector desplegable
- Botones de Guardar y Cancelar
- Actualización automática del timeline de envío

**Componente**: `OrderSummaryEditable.tsx`

### 3. Navegación Mejorada en Listado

- Botón "Ver" (ícono de ojo) en columna de acciones
- Número de pedido como enlace clickeable
- Ambos navegan a la página de detalle con pestañas

**Archivo**: `PedidosListing.tsx`

### 4. Actualización Automática del Timeline

- El timeline de "Actividad de Envío" se actualiza automáticamente cuando cambias el estado
- Muestra diferentes eventos según el estado del pedido

---

## 📝 Comandos Rápidos (Copy-Paste)

### Opción A: Cherry-pick (Solo commits de pedidos)

```bash
# 1. Verificar estado
git status

# 2. Fetch
git fetch origin

# 3. Cherry-pick commits
git cherry-pick a8f5a4e f6c0073 a64ce71 58fad83 905f73f 5de664b

# 4. Si hay conflictos, resolver y continuar
# git add <archivos>
# git cherry-pick --continue
```

### Opción B: Merge Completo

```bash
# 1. Verificar estado
git status

# 2. Fetch
git fetch origin

# 3. Merge
git merge origin/mati-integracion

# 4. Si hay conflictos, resolver y commit
# git add <archivos>
# git commit -m "Merge: Resolver conflictos"
```

---

## ✅ Checklist Post-Merge

Después de hacer el merge, verifica:

- [ ] Los commits se aplicaron correctamente (`git log --oneline -10`)
- [ ] Los nuevos componentes existen (`OrderSummaryEditable.tsx`, `PedidoTabs.tsx`)
- [ ] No hay errores de TypeScript (`npm run type-check`)
- [ ] El build funciona (`npm run build`)
- [ ] La página de listado de pedidos muestra el botón "Ver"
- [ ] La página de detalle de pedido muestra las pestañas
- [ ] El editor de estado funciona correctamente
- [ ] El timeline se actualiza al cambiar el estado

---

## 🆘 Si Algo Sale Mal

### Deshacer el Merge/Cherry-pick

```bash
# Si hiciste cherry-pick y quieres deshacerlo
git cherry-pick --abort

# Si hiciste merge y quieres deshacerlo
git merge --abort

# O revertir el último commit
git reset --hard HEAD~1
```

### Ver Diferencias

```bash
# Ver qué cambió en un commit específico
git show a8f5a4e

# Ver diferencias entre tu rama y mati-integracion
git diff tu-rama origin/mati-integracion
```

### Obtener Ayuda

Si tienes problemas, puedes:
1. Ver los logs: `git log --oneline --graph -20`
2. Ver el estado: `git status`
3. Ver diferencias: `git diff`

---

## 📚 Referencias

- **Rama origen**: `origin/mati-integracion`
- **Commits principales**: `a8f5a4e` hasta `5de664b`
- **Ruta de pedidos**: `/atributos/pedidos`
- **Ruta de detalle**: `/atributos/pedidos/[pedidoId]`

---

## 🎯 Resumen de Funcionalidades

1. ✅ **Sistema de pestañas** en detalle de pedido
2. ✅ **Editor de estado** integrado en el badge
3. ✅ **Botones de navegación** en listado
4. ✅ **Actualización automática** del timeline
5. ✅ **Mejoras visuales** y UX
6. ✅ **Corrección de errores** de Client Components

---

**¡Listo!** Con estos pasos deberías poder traer todos los cambios de pedidos sin problemas. Si encuentras algún conflicto, sigue las instrucciones de resolución o pregunta por ayuda.

