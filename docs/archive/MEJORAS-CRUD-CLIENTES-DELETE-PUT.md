# Mejoras al CRUD de Clientes: DELETE y PUT (Sincronización Moraleja)

Este documento describe las mejoras realizadas al DELETE y PUT del CRUD de clientes, incluyendo la sincronización con Editorial Moraleja y la corrección de variables de entorno.

## 📋 Resumen de Cambios

### 1. Mejoras al DELETE de Clientes
- ✅ Eliminación de TODAS las entradas WO-Clientes en Strapi (no solo la primera)
- ✅ Eliminación en Editorial Moraleja (WooCommerce secundario)
- ✅ Eliminación de Persona si no hay más referencias WO-Clientes
- ✅ Mejor manejo de errores y logging detallado

### 2. Mejoras al PUT (Edición) de Clientes
- ✅ Sincronización correcta con Editorial Moraleja
- ✅ Uso directo de `createOrUpdateClienteEnWooCommerce` para Moraleja
- ✅ Logging mejorado para diagnóstico

### 3. Corrección de Variables de Entorno
- ✅ Cambio de `NEXT_PUBLIC_WOOCOMMERCE_URL_MORALEJA` a `WOO_MORALEJA_URL`
- ✅ Consistencia con la variable configurada en Railway

## 📁 Archivos Modificados

### 1. `frontend-ubold/src/app/api/woocommerce/customers/[id]/route.ts`

**Cambios en DELETE:**
- Eliminación de Editorial Moraleja usando `eliminarClientePorEmail`
- Búsqueda y eliminación de TODAS las entradas WO-Clientes (no solo la primera)
- Verificación y eliminación de Persona si no hay más referencias
- Manejo robusto de errores con logging detallado
- Respuesta mejorada con detalles de cada operación

**Cambios en PUT:**
- Sincronización directa con Moraleja usando `createOrUpdateClienteEnWooCommerce`
- Eliminado `enviarClienteABothWordPress` (que actualizaba en ambos)
- Logging mejorado para diagnóstico

**Variables de entorno cambiadas:**
- `process.env.NEXT_PUBLIC_WOOCOMMERCE_URL_MORALEJA` → `process.env.WOO_MORALEJA_URL`

### 2. `frontend-ubold/src/lib/clientes/utils.ts`

**Nueva función agregada:**
- `eliminarClientePorEmail()`: Función helper para eliminar cliente de WooCommerce por email

**Cambios en variables:**
- `process.env.NEXT_PUBLIC_WOOCOMMERCE_URL_MORALEJA` → `process.env.WOO_MORALEJA_URL`
- Mensaje de error actualizado para mostrar la variable correcta

### 3. `frontend-ubold/src/app/api/tienda/clientes/route.ts`

**Cambios en variables:**
- `process.env.NEXT_PUBLIC_WOOCOMMERCE_URL_MORALEJA` → `process.env.WOO_MORALEJA_URL`

## 🔧 Variables de Entorno Requeridas

Asegúrate de tener configuradas las siguientes variables en Railway (o tu plataforma de despliegue):

```env
# WooCommerce Escolar (ya deberían estar configuradas)
NEXT_PUBLIC_WOOCOMMERCE_URL=https://staging.escolar.cl
WOOCOMMERCE_CONSUMER_KEY=ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WOOCOMMERCE_CONSUMER_SECRET=cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# WooCommerce Moraleja (NUEVO/NECESARIO)
WOO_MORALEJA_URL=https://staging.moraleja.cl
WOO_MORALEJA_CONSUMER_KEY=ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WOO_MORALEJA_CONSUMER_SECRET=cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

⚠️ **IMPORTANTE**: La variable debe llamarse `WOO_MORALEJA_URL` (NO `NEXT_PUBLIC_WOOCOMMERCE_URL_MORALEJA`)

## 📝 Detalles Técnicos

### Función `eliminarClientePorEmail`

Nueva función helper que:
1. Busca un cliente en WooCommerce por email
2. Si lo encuentra, lo elimina usando su ID
3. Retorna el resultado de la operación

**Ubicación:** `frontend-ubold/src/lib/clientes/utils.ts`

**Uso:**
```typescript
const deleteResult = await eliminarClientePorEmail(
  moralejaUrl,
  moralejaKey,
  moralejaSecret,
  customerEmail
)
```

### Flujo del DELETE Mejorado

1. **Obtener email del cliente** desde WooCommerce principal
2. **Eliminar de Editorial Moraleja** (si está configurado)
3. **Eliminar de WooCommerce principal** (Escolar) - operación crítica
4. **Buscar TODAS las entradas WO-Clientes** en Strapi por email
5. **Eliminar todas las entradas WO-Clientes** encontradas
6. **Verificar referencias de Persona** - si no hay más WO-Clientes relacionados, eliminar Persona
7. **Retornar resumen** con el resultado de cada operación

### Flujo del PUT Mejorado

1. **Actualizar en WooCommerce principal** (Escolar) usando `wooCommerceClient.put()`
2. **Actualizar en Strapi** (WO-Clientes y Persona)
3. **Sincronizar con Moraleja** usando `createOrUpdateClienteEnWooCommerce` directamente
   - Busca por email
   - Si existe, actualiza
   - Si no existe, crea

## 🔀 Pasos para Integración sin Conflictos

### Paso 1: Verificar Estado Actual

```bash
# Asegúrate de estar en la rama que quieres integrar (destino)
git checkout <rama-destino>

# Obtén los últimos cambios
git pull origin <rama-destino>

# Verifica que no tengas cambios sin commitear
git status
```

### Paso 2: Merge o Rebase

**Opción A: Merge (recomendado para preservar historial)**

```bash
# Vuelve a la rama de origen (la que tiene los cambios)
git checkout <rama-origen>

# Asegúrate de tener los últimos cambios de destino
git fetch origin
git merge origin/<rama-destino>

# Si hay conflictos, resuélvelos (ver Paso 3)
# Luego haz el merge hacia destino
git checkout <rama-destino>
git merge <rama-origen>
```

**Opción B: Rebase (para historial lineal)**

```bash
git checkout <rama-origen>
git rebase <rama-destino>
# Resuelve conflictos si aparecen
git checkout <rama-destino>
git merge <rama-origen>
```

### Paso 3: Resolver Conflictos (si aparecen)

Los conflictos más probables estarían en:

#### 3.1. `frontend-ubold/src/app/api/woocommerce/customers/[id]/route.ts`

**Conflicto en DELETE:**
- **Acepta nuestros cambios** si el otro código solo elimina del WooCommerce principal
- Nuestro código tiene lógica completa para eliminar de todas las plataformas

**Conflicto en PUT:**
- **Acepta nuestros cambios** que sincronizan con Moraleja
- Si el otro código usa `enviarClienteABothWordPress`, reemplázalo con nuestra implementación

**Conflicto en imports:**
```typescript
// Asegúrate de que tenga:
import { parseNombreCompleto, enviarClienteABothWordPress, eliminarClientePorEmail, createOrUpdateClienteEnWooCommerce } from '@/lib/clientes/utils'
```

#### 3.2. `frontend-ubold/src/lib/clientes/utils.ts`

**Conflicto en función nueva:**
- Si la función `eliminarClientePorEmail` no existe, **agrega nuestra versión completa**
- Si existe pero es diferente, compara y mantén la versión más completa

**Conflicto en `enviarClienteABothWordPress`:**
- Asegúrate de que use `process.env.WOO_MORALEJA_URL` (no `NEXT_PUBLIC_WOOCOMMERCE_URL_MORALEJA`)

#### 3.3. `frontend-ubold/src/app/api/tienda/clientes/route.ts`

**Conflicto en variables:**
- Busca todas las referencias a `NEXT_PUBLIC_WOOCOMMERCE_URL_MORALEJA`
- Cámbialas a `WOO_MORALEJA_URL`

### Paso 4: Verificar Variables de Entorno

Después del merge, verifica que las variables de entorno estén configuradas:

```bash
# En Railway, verifica que exista:
WOO_MORALEJA_URL
WOO_MORALEJA_CONSUMER_KEY
WOO_MORALEJA_CONSUMER_SECRET
```

Si no existen, agrégalas según las instrucciones en la sección "Variables de Entorno Requeridas".

### Paso 5: Verificar Compilación

```bash
cd frontend-ubold
npm install  # Solo si hay cambios en package.json
npm run build
```

Si hay errores de TypeScript, verifica:
- Que `eliminarClientePorEmail` esté exportada en `utils.ts`
- Que todos los imports estén correctos
- Que las variables de entorno se usen correctamente

### Paso 6: Pruebas

Prueba las siguientes funcionalidades:

1. **DELETE de cliente:**
   - Eliminar un cliente desde la interfaz
   - Verificar logs para confirmar eliminación en Moraleja
   - Verificar que se eliminen todas las entradas WO-Clientes en Strapi
   - Verificar que Persona se elimine si no hay más referencias

2. **PUT (edición) de cliente:**
   - Editar un cliente existente
   - Verificar logs para confirmar actualización en Moraleja
   - Verificar que los cambios se reflejen en ambas plataformas

## 🐛 Solución de Problemas Comunes

### Error: "Credenciales de Editorial Moraleja no configuradas"

**Causa:** Las variables de entorno no están configuradas en Railway.

**Solución:**
1. Ve a Railway → Tu proyecto → Variables
2. Agrega `WOO_MORALEJA_URL`, `WOO_MORALEJA_CONSUMER_KEY`, `WOO_MORALEJA_CONSUMER_SECRET`
3. Redeploya el servicio

### Error: "Invalid key documentId at persona" en DELETE

**Causa:** Ya está corregido en nuestro código. Si aparece, verifica que uses `populate=persona` (no `populate[persona]=documentId`).

### El cliente no se elimina/actualiza en Moraleja

**Verificar:**
1. Que las credenciales de Moraleja estén correctas
2. Que el cliente exista en Moraleja con el mismo email
3. Revisar los logs del servidor para ver el error específico

### Conflictos en merge

**Si hay conflictos en las funciones DELETE o PUT:**
- Nuestro código es más completo, acepta nuestros cambios
- Si el otro código tiene funcionalidad adicional, intégrala cuidadosamente

## ✅ Checklist de Integración

- [ ] Verificar que todas las variables de entorno estén configuradas en Railway
- [ ] Hacer merge/rebase de las ramas
- [ ] Resolver conflictos (si aparecen)
- [ ] Verificar que `eliminarClientePorEmail` esté en `utils.ts`
- [ ] Verificar que todos los imports estén correctos
- [ ] Verificar que se use `WOO_MORALEJA_URL` (no `NEXT_PUBLIC_WOOCOMMERCE_URL_MORALEJA`)
- [ ] Compilar sin errores (`npm run build`)
- [ ] Probar DELETE de cliente
- [ ] Probar PUT (edición) de cliente
- [ ] Verificar logs para confirmar sincronización con Moraleja

## 📚 Referencias

- Documentación de WooCommerce API: https://woocommerce.github.io/woocommerce-rest-api-docs/
- Variables de entorno en Railway: https://docs.railway.app/develop/variables
- Configuración previa: `WOOCOMMERCE-CONFIGURACION.md`

## 📞 Notas Adicionales

- Estas mejoras son compatibles con el código existente
- No se requieren cambios en la base de datos o en Strapi
- Las variables de entorno son la única configuración adicional necesaria
- El código maneja errores de forma robusta (no crítico si falla Moraleja, pero crítico si falla Escolar)

---

**Fecha de creación:** 2025-01-01
**Rama origen:** (especificar la rama de donde vienen estos cambios)
**Autor:** (especificar si es necesario)

