# Solución: Error "Content-type Oportunidad no existe"

## 🔴 Problema Actual

El frontend muestra el error porque el content-type "Oportunidad" **no existe en Strapi producción** (https://strapi.moraleja.cl).

El content-type está creado en código (rama `etiquetas-gonza`) pero **no está desplegado**.

## ✅ Solución: Desplegar el Content-Type

Tienes **2 opciones**:

---

## Opción 1: Merge a Producción (Recomendado) 🚀

**Si tienes acceso al repositorio de Strapi:**

### Paso 1: Hacer Merge de la Rama

```bash
cd ../strapi-backend
git checkout clean-main  # o la rama principal de producción
git pull origin clean-main
git merge etiquetas-gonza
git push origin clean-main
```

### Paso 2: Railway Desplegará Automáticamente

- Railway detectará el push a `clean-main`
- Hará build automático
- Desplegará el nuevo content-type
- ⏱️ Tiempo: 5-10 minutos

### Paso 3: Verificar

1. Esperar a que Railway termine el deploy
2. Ir a https://strapi.moraleja.cl/admin
3. Deberías ver "Oportunidad" en Content Manager

---

## Opción 2: Crear Manualmente en Strapi Admin 🛠️

**Si NO puedes hacer merge o necesitas hacerlo rápido:**

### Paso 1: Ir a Strapi Admin

1. Ve a https://strapi.moraleja.cl/admin
2. Inicia sesión

### Paso 2: Crear Content-Type

1. **Content-Type Builder** (menú lateral izquierdo)
2. Click en **"+ Create new collection type"**
3. Nombre: **"Oportunidad"** (singular, mayúscula inicial)
4. Click en **"Continue"**

### Paso 3: Agregar Campos

Agregar en este orden:

#### Campo 1: nombre
- Tipo: **Text**
- Nombre: `nombre`
- ✅ Required
- Click **"Finish"**

#### Campo 2: descripcion
- Tipo: **Long text**
- Nombre: `descripcion`
- Click **"Finish"**

#### Campo 3: monto
- Tipo: **Number** → **Decimal**
- Nombre: `monto`
- Min: `0`
- Click **"Finish"**

#### Campo 4: moneda
- Tipo: **Enumeration**
- Nombre: `moneda`
- Values (uno por línea):
  ```
  USD
  CLP
  EUR
  ```
- Default value: `USD`
- Click **"Finish"**

#### Campo 5: etapa
- Tipo: **Enumeration**
- Nombre: `etapa`
- ✅ Required
- Values (uno por línea):
  ```
  Qualification
  Proposal Sent
  Negotiation
  Won
  Lost
  ```
- Default value: `Qualification`
- Click **"Finish"**

#### Campo 6: estado
- Tipo: **Enumeration**
- Nombre: `estado`
- ✅ Required
- Values (uno por línea):
  ```
  open
  in-progress
  closed
  ```
- Default value: `open`
- Click **"Finish"**

#### Campo 7: prioridad
- Tipo: **Enumeration**
- Nombre: `prioridad`
- ✅ Required
- Values (uno por línea):
  ```
  low
  medium
  high
  ```
- Default value: `medium`
- Click **"Finish"**

#### Campo 8: fecha_cierre
- Tipo: **Date**
- Nombre: `fecha_cierre`
- Date type: **Date** (solo fecha, no hora)
- Click **"Finish"**

#### Campo 9: fuente
- Tipo: **Text**
- Nombre: `fuente`
- Default value: `Manual`
- Click **"Finish"**

#### Campo 10: activo
- Tipo: **Boolean**
- Nombre: `activo`
- ✅ Required
- Default value: `true`
- Click **"Finish"**

### Paso 4: Agregar Relaciones

#### Relación 1: contacto
1. Click **"+ Add another field"**
2. Tipo: **Relation**
3. Nombre: `contacto`
4. Relation type: **Many to one**
5. Select target: **Persona** (buscar en la lista)
6. Click **"Finish"**

#### Relación 2: propietario
1. Click **"+ Add another field"**
2. Tipo: **Relation**
3. Nombre: `propietario`
4. Relation type: **Many to one**
5. Select target: **Intranet · Colaboradores** (o buscar "colaborador")
   - ⚠️ Si no aparece, escribir: `api::colaborador.colaborador`
6. Click **"Finish"**

#### Relación 3: producto
1. Click **"+ Add another field"**
2. Tipo: **Relation**
3. Nombre: `producto`
4. Relation type: **Many to one**
5. Select target: **Product · Libro · Edición** (o buscar "libro")
   - ⚠️ Si no aparece, escribir: `api::libro.libro`
6. Click **"Finish"**

### Paso 5: Guardar

1. Click en **"Save"** (botón arriba a la derecha)
2. Strapi reiniciará automáticamente
3. ⏱️ Esperar 1-2 minutos

### Paso 6: Configurar Permisos

1. **Settings** → **Users & Permissions plugin** → **Roles**
2. Seleccionar rol (Authenticated, Public, o el que uses)
3. Buscar **"Oportunidad"**
4. Habilitar:
   - ✅ **find**
   - ✅ **findOne**
   - ✅ **create**
   - ✅ **update**
   - ✅ **delete**
5. Click **"Save"**

---

## ✅ Verificar que Funciona

Después de desplegar (Opción 1 o 2):

1. **Refrescar** la página `/crm/opportunities`
2. El error debería desaparecer
3. Deberías ver una lista vacía (o con datos si ya hay oportunidades)

### Crear Oportunidad de Prueba

1. Ir a Strapi Admin → Content Manager → Oportunidad
2. Click **"Create new entry"**
3. Llenar:
   - Nombre: "Oportunidad de Prueba"
   - Etapa: Qualification
   - Estado: open
   - Prioridad: medium
4. Click **"Save"** y **"Publish"**
5. Verificar en `/crm/opportunities` que aparece

---

## 🆘 Si Sigue Sin Funcionar

### Verificar que el Content-Type Existe

1. Ir a https://strapi.moraleja.cl/admin
2. Content Manager → Deberías ver "Oportunidad" en la lista

### Verificar Permisos

1. Settings → Users & Permissions → Roles
2. Verificar que los permisos están habilitados

### Verificar Relaciones

1. Content-Type Builder → Oportunidad
2. Verificar que las 3 relaciones están configuradas:
   - contacto → Persona
   - propietario → Colaborador
   - producto → Libro

### Revisar Logs

- Revisar consola del navegador (F12)
- Revisar Network tab para ver errores de API

---

## 📋 Resumen

**Problema**: Content-type no existe en producción  
**Solución**: Desplegar (merge o crear manualmente)  
**Tiempo**: 5-20 minutos  
**Resultado**: Oportunidades funcionando en frontend
