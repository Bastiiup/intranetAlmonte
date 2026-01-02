# Documentación: Cambios en Sistema de Clientes con originPlatform

## 📋 Resumen

Se implementó una lógica similar a la de productos para la creación de clientes, donde:
1. Se crea el cliente primero en WordPress (Moraleja y/o Escolar)
2. Luego se crean **dos entradas separadas** en WO-Clientes en Strapi (una por plataforma)
3. Cada entrada WO-Clientes tiene el campo `originPlatform` (`'woo_moraleja'` o `'woo_escolar'`)
4. Ambas entradas están vinculadas a la misma Persona

---

## 🔄 Cambios Realizados

### 1. **Nuevo Componente: PlatformSelector**

**Archivo:** `frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/clientes/components/PlatformSelector.tsx`

**Nuevo archivo completo** que permite seleccionar plataformas (Moraleja/Escolar) mediante checkboxes.

**Características:**
- Componente reutilizable similar al usado en productos
- Maneja estado de plataformas seleccionadas (`'woo_moraleja'` y `'woo_escolar'`)
- Muestra mensaje informativo sobre comportamiento por defecto

**Dependencias:**
- `react-bootstrap` (FormGroup, FormLabel, FormCheck)

---

### 2. **API Route: Creación de Clientes (POST)**

**Archivo:** `frontend-ubold/src/app/api/tienda/clientes/route.ts`

#### Cambios Principales:

##### a) **Nuevo Import**
```typescript
import { parseNombreCompleto, enviarClienteABothWordPress } from '@/lib/clientes/utils'
```
- Se agregó `enviarClienteABothWordPress` para enviar clientes a WordPress

##### b) **Corrección en Tipo de Email**
```typescript
// ANTES:
tipo: e.tipo || 'principal'

// DESPUÉS:
tipo: e.tipo || 'Personal' // Valores válidos: "Personal", "Laboral", "Institucional"
```
- **Razón:** Strapi requiere valores específicos del enum: "Personal", "Laboral", "Institucional"
- **Ubicación:** Línea ~156

##### c) **Nueva Lógica de Creación (Flujo Completo)**

**ANTES:** Se creaba una sola entrada WO-Clientes sin `originPlatform`.

**DESPUÉS:** Flujo de 3 pasos:

1. **Crear Persona en Strapi** (sin cambios, pero se omiten `telefonos` porque Strapi rechaza el campo)

2. **Enviar cliente a WordPress** (NUEVO)
   ```typescript
   // Líneas ~207-241
   // Determinar plataformas basado en body.data.canales
   const plataformasSeleccionadas = body.data.canales || []
   const enviarAMoraleja = plataformasSeleccionadas.length === 0 || ...
   const enviarAEscolar = plataformasSeleccionadas.length === 0 || ...
   
   // Enviar a WordPress (ambos siempre, pero el resultado determina si crear entrada WO-Clientes)
   wordPressResults = await enviarClienteABothWordPress({...})
   ```

3. **Crear DOS entradas WO-Clientes** (NUEVO)
   ```typescript
   // Líneas ~243-317
   // Una entrada para Moraleja
   if (enviarAMoraleja) {
     const woClienteMoralejaData = {
       data: {
         nombre: nombreCliente,
         correo_electronico: emailPrincipal.email.trim(),
         // ... otros campos ...
         persona: personaId,
         originPlatform: 'woo_moraleja', // ← CAMPO NUEVO
       },
     }
     await strapiClient.post('/api/wo-clientes', woClienteMoralejaData)
   }
   
   // Una entrada para Escolar
   if (enviarAEscolar) {
     const woClienteEscolarData = {
       data: {
         // ... mismo formato ...
         originPlatform: 'woo_escolar', // ← CAMPO NUEVO
       },
     }
     await strapiClient.post('/api/wo-clientes', woClienteEscolarData)
   }
   ```

##### d) **Formato de Respuesta Actualizado**
```typescript
// ANTES:
return NextResponse.json({
  success: true,
  data: woClienteResponse, // Una sola entrada
  persona: personaResponse,
  message: 'Cliente creado exitosamente en Strapi.'
})

// DESPUÉS:
return NextResponse.json({
  success: true,
  data: woClientesCreados.map(c => c.response), // Array de entradas creadas
  persona: personaResponse,
  wordpress: wordPressResults, // Resultados de WordPress
  message: `Cliente creado exitosamente. Entradas WO-Clientes creadas: ${woClientesCreados.length} (...)`
})
```

---

### 3. **API Route: Actualización de Clientes (PUT)**

**Archivo:** `frontend-ubold/src/app/api/tienda/clientes/[id]/route.ts`

#### Cambios Principales:

##### a) **Corrección en Tipo de Email** (igual que en POST)
```typescript
// Líneas donde se crean/actualizan emails
tipo: 'Personal' // En lugar de 'principal'
```

##### b) **Eliminación de Lógica de Canales**
```typescript
// ANTES:
if (body.data.canales !== undefined) {
  if (Array.isArray(body.data.canales) && body.data.canales.length > 0) {
    updateData.data.canales = body.data.canales
  }
}

// DESPUÉS:
// NOTA: Los canales NO existen en el schema de WO-Clientes (solo en productos/libros)
// Se omiten completamente
if (body.data.canales !== undefined) {
  console.log('[API Clientes PUT] ℹ️ Canales detectados pero se omitirán (WO-Clientes no tiene campo canales en Strapi)')
}
```

**Razón:** El schema de WO-Clientes no tiene campo `canales`, solo productos/libros lo tienen.

##### c) **Logs Simplificados**
- Se eliminaron mensajes sobre sincronización con WordPress vía canales
- Ahora solo indica que el cliente fue actualizado en Strapi

---

### 4. **Formulario de Creación de Clientes**

**Archivo:** `frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/clientes/components/AddClienteForm.tsx`

#### Cambios Principales:

##### a) **Nuevo Import**
```typescript
import PlatformSelector from './PlatformSelector'
```

##### b) **Nuevo Estado**
```typescript
const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
```

##### c) **Integración del PlatformSelector**
```typescript
// Líneas ~144-147
<PlatformSelector
  selectedPlatforms={selectedPlatforms}
  onChange={setSelectedPlatforms}
/>
```

##### d) **Corrección en Tipo de Email**
```typescript
// Líneas ~62-66
emails: [
  {
    email: formData.email.trim(),
    tipo: 'Personal', // ANTES: 'principal' (causaba error en Strapi)
  },
],
```

##### e) **Simplificación de Envío de Plataformas**
```typescript
// ANTES (líneas ~86-130): Búsqueda compleja de IDs de canales desde Strapi
// - Fetch a /api/tienda/canales
// - Mapeo de plataformas a IDs de canales
// - Manejo de errores y timeouts

// DESPUÉS (líneas ~86-92): Envío directo de nombres de plataformas
if (selectedPlatforms.length > 0) {
  dataToSend.data.canales = selectedPlatforms // Array directo: ['woo_moraleja', 'woo_escolar']
  console.log('[AddCliente] 📡 Plataformas seleccionadas:', selectedPlatforms)
}
```

##### f) **Mensaje de Éxito Actualizado**
```typescript
// Mensaje ahora menciona "plataformas seleccionadas" en lugar de "canales asignados"
```

---

## 🔍 Archivos Afectados

### Archivos Modificados:
1. `frontend-ubold/src/app/api/tienda/clientes/route.ts` (POST handler)
2. `frontend-ubold/src/app/api/tienda/clientes/[id]/route.ts` (PUT handler)
3. `frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/clientes/components/AddClienteForm.tsx`

### Archivos Nuevos:
1. `frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/clientes/components/PlatformSelector.tsx`

### Archivos NO Modificados (pero relevantes):
- `frontend-ubold/src/lib/clientes/utils.ts` (ya existía la función `enviarClienteABothWordPress`)

---

## 🔧 Pasos para Integración en Otras Ramas

### Pre-requisitos

1. **Verificar existencia de funciones en `utils.ts`:**
   ```bash
   # Verificar que existe la función enviarClienteABothWordPress
   grep -n "enviarClienteABothWordPress" frontend-ubold/src/lib/clientes/utils.ts
   ```
   Si no existe, debe copiarse desde la rama actual.

2. **Verificar schema de Strapi:**
   - El Content-Type `WO-Clientes` debe tener el campo `originPlatform` (Enumeration con valores: `woo_moraleja`, `woo_escolar`, `otros`)
   - El Content-Type `Persona` debe tener el campo `emails` con `tipo` como Enumeration (`Personal`, `Laboral`, `Institucional`)

---

### Paso 1: Copiar el Nuevo Componente

```bash
# Desde la rama con los cambios
cp frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/clientes/components/PlatformSelector.tsx \
   [RAMA_DESTINO]/frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/clientes/components/
```

**Verificación:**
- El archivo debe existir en la ruta correcta
- No debe haber errores de sintaxis

---

### Paso 2: Integrar Cambios en AddClienteForm.tsx

#### 2.1 Agregar Import
```typescript
// Al inicio del archivo, junto con otros imports
import PlatformSelector from './PlatformSelector'
```

#### 2.2 Agregar Estado
```typescript
// Después de los otros useState, agregar:
const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
```

#### 2.3 Cambiar Tipo de Email
Buscar todas las instancias donde se crea el array `emails` y cambiar:
```typescript
// ANTES:
tipo: 'principal'

// DESPUÉS:
tipo: 'Personal'
```

**Ubicaciones aproximadas:**
- Dentro de `personaData.emails` (alrededor de línea 62-66)

#### 2.4 Integrar PlatformSelector en el JSX
Buscar el inicio del `<Form>` y agregar antes de los campos:
```typescript
<PlatformSelector
  selectedPlatforms={selectedPlatforms}
  onChange={setSelectedPlatforms}
/>
```

#### 2.5 Simplificar Envío de Plataformas
Buscar la sección donde se prepara `dataToSend.data.canales` (probablemente hay lógica compleja buscando IDs de canales).

**Reemplazar toda esa lógica con:**
```typescript
// Agregar plataformas seleccionadas (se usarán para determinar a qué WordPress enviar)
// Si no se selecciona ninguna, se enviará a ambas por defecto
if (selectedPlatforms.length > 0) {
  // Convertir nombres de plataformas a formato que entienda el servidor
  dataToSend.data.canales = selectedPlatforms // Se usa el nombre de la plataforma directamente
  console.log('[AddCliente] 📡 Plataformas seleccionadas:', selectedPlatforms)
}
```

**Eliminar:**
- Cualquier fetch a `/api/tienda/canales`
- Cualquier mapeo de plataformas a IDs
- Lógica de timeout y manejo de errores relacionada con canales

---

### Paso 3: Integrar Cambios en route.ts (POST)

#### 3.1 Agregar Import
```typescript
// Modificar el import existente de '@/lib/clientes/utils'
// ANTES:
import { parseNombreCompleto } from '@/lib/clientes/utils'

// DESPUÉS:
import { parseNombreCompleto, enviarClienteABothWordPress } from '@/lib/clientes/utils'
```

#### 3.2 Cambiar Tipo de Email en Creación de Persona
Buscar donde se crea `personaCreateData.data.emails` y cambiar:
```typescript
// ANTES:
tipo: e.tipo || 'principal'

// DESPUÉS:
tipo: e.tipo || 'Personal' // Valores válidos: "Personal", "Laboral", "Institucional"
```

#### 3.3 Reemplazar Lógica de Creación de WO-Clientes

**Identificar la sección donde se crea WO-Clientes** (probablemente después de crear Persona, alrededor de línea ~207-243).

**Reemplazar TODA esa sección** con la nueva lógica de 3 pasos:

1. **Paso 2: Enviar a WordPress** (nuevo)
   ```typescript
   // 2. Enviar cliente a ambos WordPress primero
   console.log('[API Clientes POST] 🌐 Enviando cliente a WordPress...')
   const nombresWordPress = personaData.nombres?.trim() || personaData.nombre_completo.trim()
   const apellidoWordPress = personaData.primer_apellido?.trim() || ''
   
   // Determinar a qué plataformas enviar basado en las plataformas seleccionadas
   // Si no se especifican, enviar a ambas por defecto
   const plataformasSeleccionadas = body.data.canales || []
   const enviarAMoraleja = plataformasSeleccionadas.length === 0 || plataformasSeleccionadas.includes('woo_moraleja') || plataformasSeleccionadas.some((c: any) => 
     typeof c === 'string' && (c.toLowerCase().includes('moraleja') || c.toLowerCase().includes('woo_moraleja'))
   )
   const enviarAEscolar = plataformasSeleccionadas.length === 0 || plataformasSeleccionadas.includes('woo_escolar') || plataformasSeleccionadas.some((c: any) => 
     typeof c === 'string' && (c.toLowerCase().includes('escolar') || c.toLowerCase().includes('woo_escolar'))
   )
   
   let wordPressResults: any = null
   try {
     // Enviar a ambos WordPress siempre (la función maneja ambos)
     wordPressResults = await enviarClienteABothWordPress({
       email: emailPrincipal.email.trim(),
       first_name: nombresWordPress,
       last_name: apellidoWordPress,
     })
     console.log('[API Clientes POST] ✅ Cliente enviado a WordPress:', {
       escolar: wordPressResults.escolar.success,
       moraleja: wordPressResults.moraleja.success,
     })
   } catch (wpError: any) {
     console.error('[API Clientes POST] ⚠️ Error al enviar a WordPress:', wpError.message)
     // Si falla completamente, aún podemos crear las entradas WO-Clientes sin los IDs de WordPress
     wordPressResults = {
       escolar: { success: false, error: wpError.message },
       moraleja: { success: false, error: wpError.message },
     }
   }
   ```

2. **Paso 3: Crear DOS entradas WO-Clientes** (nuevo)
   ```typescript
   // 3. Crear WO-Clientes en Strapi - DOS entradas (una por plataforma seleccionada)
   console.log('[API Clientes POST] 📦 Creando WO-Clientes en Strapi...')
   const nombreCliente = personaData.nombre_completo.trim()
   const woClientesCreados: any[] = []
   
   // Crear entrada para Moraleja si se seleccionó
   if (enviarAMoraleja) {
     try {
       const woClienteMoralejaData: any = {
         data: {
           nombre: nombreCliente,
           correo_electronico: emailPrincipal.email.trim(),
           pedidos: body.data.pedidos ? parseInt(body.data.pedidos) || 0 : 0,
           gasto_total: body.data.gasto_total ? parseFloat(body.data.gasto_total) || 0 : 0,
           fecha_registro: body.data.fecha_registro || new Date().toISOString(),
           persona: personaId,
           originPlatform: 'woo_moraleja', // Campo para identificar la plataforma
         },
       }
       
       if (body.data.ultima_actividad) {
         woClienteMoralejaData.data.ultima_actividad = body.data.ultima_actividad
       }
       
       // Si tenemos el ID de WooCommerce, guardarlo si hay campo para eso
       if (wordPressResults?.moraleja?.data?.id) {
         // Nota: Si hay un campo woocommerce_id o externalIds, se puede guardar aquí
         console.log('[API Clientes POST] 📌 ID de WooCommerce Moraleja:', wordPressResults.moraleja.data.id)
       }
       
       const woClienteMoralejaResponse = await strapiClient.post('/api/wo-clientes', woClienteMoralejaData) as any
       woClientesCreados.push({
         platform: 'woo_moraleja',
         response: woClienteMoralejaResponse,
       })
       console.log('[API Clientes POST] ✅ Cliente creado en WO-Clientes (Moraleja):', woClienteMoralejaResponse.data?.id || woClienteMoralejaResponse.id || woClienteMoralejaResponse.data?.documentId)
     } catch (error: any) {
       console.error('[API Clientes POST] ❌ Error al crear WO-Clientes (Moraleja):', error.message)
     }
   }
   
   // Crear entrada para Escolar si se seleccionó
   if (enviarAEscolar) {
     try {
       const woClienteEscolarData: any = {
         data: {
           nombre: nombreCliente,
           correo_electronico: emailPrincipal.email.trim(),
           pedidos: body.data.pedidos ? parseInt(body.data.pedidos) || 0 : 0,
           gasto_total: body.data.gasto_total ? parseFloat(body.data.gasto_total) || 0 : 0,
           fecha_registro: body.data.fecha_registro || new Date().toISOString(),
           persona: personaId,
           originPlatform: 'woo_escolar', // Campo para identificar la plataforma
         },
       }
       
       if (body.data.ultima_actividad) {
         woClienteEscolarData.data.ultima_actividad = body.data.ultima_actividad
       }
       
       // Si tenemos el ID de WooCommerce, guardarlo si hay campo para eso
       if (wordPressResults?.escolar?.data?.id) {
         console.log('[API Clientes POST] 📌 ID de WooCommerce Escolar:', wordPressResults.escolar.data.id)
       }
       
       const woClienteEscolarResponse = await strapiClient.post('/api/wo-clientes', woClienteEscolarData) as any
       woClientesCreados.push({
         platform: 'woo_escolar',
         response: woClienteEscolarResponse,
       })
       console.log('[API Clientes POST] ✅ Cliente creado en WO-Clientes (Escolar):', woClienteEscolarResponse.data?.id || woClienteEscolarResponse.id || woClienteEscolarResponse.data?.documentId)
     } catch (error: any) {
       console.error('[API Clientes POST] ❌ Error al crear WO-Clientes (Escolar):', error.message)
     }
   }
   
   if (woClientesCreados.length === 0) {
     console.warn('[API Clientes POST] ⚠️ No se crearon entradas WO-Clientes (ninguna plataforma seleccionada o error)')
   }
   ```

3. **Actualizar Respuesta**
   ```typescript
   // Reemplazar el return NextResponse.json existente con:
   return NextResponse.json({
     success: true,
     data: woClientesCreados.length > 0 ? woClientesCreados.map(c => c.response) : null,
     persona: personaResponse,
     wordpress: wordPressResults,
     message: `Cliente creado exitosamente. Entradas WO-Clientes creadas: ${woClientesCreados.length} (${woClientesCreados.map(c => c.platform).join(', ') || 'ninguna'})`
   })
   ```

**Eliminar:**
- Cualquier lógica que cree una sola entrada WO-Clientes
- Cualquier referencia a `canales` en el payload de WO-Clientes
- Cualquier lógica de sincronización directa con WordPress (ahora se hace antes)

---

### Paso 4: Integrar Cambios en [id]/route.ts (PUT)

#### 4.1 Cambiar Tipo de Email
Buscar todas las instancias donde se actualizan emails y cambiar `'principal'` a `'Personal'`.

**Ubicaciones aproximadas:**
- Donde se construye `personaUpdateData.data.emails`
- Donde se construye `personaData.emails`

#### 4.2 Eliminar Lógica de Canales
Buscar la sección donde se manejan `body.data.canales` y reemplazar con:
```typescript
// NOTA: Los canales NO existen en el schema de WO-Clientes (solo en productos/libros)
// Se omiten completamente
if (body.data.canales !== undefined) {
  console.log('[API Clientes PUT] ℹ️ Canales detectados pero se omitirán (WO-Clientes no tiene campo canales en Strapi)')
}
```

**Eliminar:**
- Cualquier asignación de `updateData.data.canales`
- Logs relacionados con actualización de canales

#### 4.3 Simplificar Logs
Eliminar mensajes sobre "Strapi sincronizará con WordPress según los canales asignados" y similares.

---

### Paso 5: Resolución de Conflictos Comunes

#### Conflicto 1: Import de `enviarClienteABothWordPress`
**Si la rama destino no tiene esta función:**
1. Copiar la función desde `frontend-ubold/src/lib/clientes/utils.ts`
2. Asegurarse de que también exista `createOrUpdateClienteEnWooCommerce` y `buscarClientePorEmail`

#### Conflicto 2: Campo `originPlatform` en Strapi
**Si el schema no tiene `originPlatform`:**
- Debe agregarse en Strapi como Enumeration con valores: `woo_moraleja`, `woo_escolar`, `otros`
- Si no se puede agregar, los POSTs fallarán con "Invalid key originPlatform"

#### Conflicto 3: Tipo de Email
**Si hay otras partes del código que usan `'principal'`:**
- Buscar y reemplazar todas las instancias donde se crea/actualiza email con `tipo: 'principal'`
- Cambiar a `tipo: 'Personal'` o usar el valor correcto del enum

#### Conflicto 4: Formato de Respuesta del POST
**Si hay código que espera un solo objeto en `data`:**
- Actualizar ese código para manejar un array: `data` ahora puede ser `null` o un array de entradas WO-Clientes
- Considerar usar `data[0]` si solo se necesita la primera entrada, o iterar sobre todas

---

### Paso 6: Testing Post-Integración

1. **Test de Creación:**
   - Crear cliente sin seleccionar plataformas → Debe crear 2 entradas (ambas plataformas)
   - Crear cliente seleccionando solo Moraleja → Debe crear 1 entrada (Moraleja)
   - Crear cliente seleccionando solo Escolar → Debe crear 1 entrada (Escolar)
   - Crear cliente seleccionando ambas → Debe crear 2 entradas

2. **Verificar en Strapi:**
   - Cada entrada WO-Clientes debe tener `originPlatform` correcto
   - Ambas entradas deben estar vinculadas a la misma Persona
   - Los emails deben tener `tipo: 'Personal'`

3. **Verificar en WordPress:**
   - El cliente debe existir en el/los WordPress correspondientes
   - Los IDs de WooCommerce deberían estar disponibles en los logs

4. **Test de Actualización:**
   - Actualizar un cliente existente
   - Verificar que no se intenten actualizar canales (que no existen)

---

## ⚠️ Consideraciones Importantes

1. **Cambio de Comportamiento:**
   - **ANTES:** 1 cliente = 1 entrada WO-Clientes
   - **DESPUÉS:** 1 cliente = N entradas WO-Clientes (1 por plataforma)
   - Esto puede afectar:
     - Consultas que esperan un solo resultado
     - Listados que deben agrupar por Persona
     - Contadores de clientes

2. **Dependencias de Strapi:**
   - El campo `originPlatform` debe existir en el schema
   - El enum de `tipo` en emails debe tener los valores correctos
   - Si falta alguno, la creación fallará

3. **Variables de Entorno:**
   - Deben estar configuradas las credenciales de WordPress:
     - `NEXT_PUBLIC_WOOCOMMERCE_URL_MORALEJA`
     - `WOO_MORALEJA_CONSUMER_KEY`
     - `WOO_MORALEJA_CONSUMER_SECRET`
     - `NEXT_PUBLIC_WOOCOMMERCE_URL_ESCOLAR` (o `NEXT_PUBLIC_WOOCOMMERCE_URL`)
     - `WOO_ESCOLAR_CONSUMER_KEY` (o `WOOCOMMERCE_CONSUMER_KEY`)
     - `WOO_ESCOLAR_CONSUMER_SECRET` (o `WOOCOMMERCE_CONSUMER_SECRET`)

4. **Manejo de Errores:**
   - Si WordPress falla, aún se crean las entradas WO-Clientes (sin ID de WooCommerce)
   - Si Strapi falla al crear WO-Clientes, la Persona ya fue creada (puede quedar huérfana)
   - Considerar implementar rollback si es necesario

---

## 📝 Checklist de Integración

- [ ] Componente `PlatformSelector.tsx` copiado
- [ ] Import de `PlatformSelector` agregado en `AddClienteForm.tsx`
- [ ] Estado `selectedPlatforms` agregado
- [ ] `PlatformSelector` integrado en el JSX
- [ ] Tipo de email cambiado a `'Personal'` en `AddClienteForm.tsx`
- [ ] Lógica de canales simplificada en `AddClienteForm.tsx`
- [ ] Import de `enviarClienteABothWordPress` agregado en `route.ts` (POST)
- [ ] Tipo de email cambiado a `'Personal'` en `route.ts` (POST)
- [ ] Lógica de creación reemplazada (WordPress + 2 entradas WO-Clientes)
- [ ] Respuesta del POST actualizada
- [ ] Tipo de email cambiado a `'Personal'` en `[id]/route.ts` (PUT)
- [ ] Lógica de canales eliminada en `[id]/route.ts` (PUT)
- [ ] Función `enviarClienteABothWordPress` existe en `utils.ts`
- [ ] Campo `originPlatform` existe en schema de Strapi
- [ ] Variables de entorno configuradas
- [ ] Tests realizados (creación con diferentes plataformas)
- [ ] Verificación en Strapi (entradas creadas correctamente)
- [ ] Verificación en WordPress (clientes creados)

---

## 🔗 Referencias

- **Lógica Similar:** Ver cómo funciona en productos (`/add-product`) para referencia
- **Función de WordPress:** `frontend-ubold/src/lib/clientes/utils.ts` - `enviarClienteABothWordPress`
- **Schema Strapi:** Verificar en Strapi Admin los Content-Types `WO-Clientes` y `Persona`

---

**Última actualización:** [Fecha de los cambios]
**Rama origen:** [Nombre de la rama donde se realizaron los cambios]
