# Guía: Crear Content-Type "Oportunidad" en Strapi

## 📋 Pasos para crear el Content-Type

### 1. Acceder a Strapi Admin
1. Ve a tu panel de administración de Strapi (ej: `http://localhost:1337/admin`)
2. Inicia sesión con tus credenciales

### 2. Crear el Content-Type
1. En el menú lateral, ve a **Content-Type Builder**
2. Haz clic en **"+ Create new collection type"**
3. Nombre del Content-Type: **`Oportunidad`** (singular)
4. Haz clic en **Continue**

### 3. Agregar Campos

Agrega los siguientes campos en este orden:

#### Campos Básicos

1. **nombre** (Text - Short text)
   - Required: ✅ Sí
   - Unique: ❌ No

2. **descripcion** (Text - Long text)
   - Required: ❌ No
   - Unique: ❌ No

3. **monto** (Number - Decimal)
   - Required: ❌ No
   - Unique: ❌ No
   - Min: 0
   - Max: (dejar vacío)

4. **moneda** (Enumeration)
   - Required: ❌ No
   - Values (uno por línea):
     ```
     USD
     CLP
     EUR
     ```
   - Default value: `USD`

5. **etapa** (Enumeration)
   - Required: ✅ Sí
   - Values (uno por línea):
     ```
     Qualification
     Proposal Sent
     Negotiation
     Won
     Lost
     ```
   - Default value: `Qualification`

6. **estado** (Enumeration)
   - Required: ✅ Sí
   - Values (uno por línea):
     ```
     open
     in-progress
     closed
     ```
   - Default value: `open`

7. **prioridad** (Enumeration)
   - Required: ✅ Sí
   - Values (uno por línea):
     ```
     low
     medium
     high
     ```
   - Default value: `medium`

8. **fecha_cierre** (Date - Date)
   - Required: ❌ No
   - Type: Date only

9. **fuente** (Text - Short text)
   - Required: ❌ No
   - Unique: ❌ No
   - Default value: `Manual`

10. **activo** (Boolean)
    - Required: ✅ Sí
    - Default value: `true`

#### Relaciones

11. **producto** (Relation)
    - Type: **Many-to-one** o **Many-to-many** (según necesites)
    - Target: Si tienes un content-type "Producto", selecciónalo. Si no, puedes dejarlo opcional o crear uno después.

12. **contacto** (Relation)
    - Type: **Many-to-one**
    - Target: **Persona**
    - Required: ❌ No (puede ser opcional)

13. **propietario** (Relation)
    - Type: **Many-to-one**
    - Target: **intranet-colaboradores** (usuarios internos de la empresa que pueden loguearse en la intranet)
    - Target exacto: `api::intranet-colaboradores.intranet-colaboradores`
    - Required: ❌ No (puede ser opcional)

### 4. Guardar el Content-Type
1. Haz clic en **Save** en la esquina superior derecha
2. Espera a que Strapi reinicie el servidor

### 5. Configurar Permisos

1. Ve a **Settings** → **Users & Permissions plugin** → **Roles** → **Public** o **Authenticated**
2. En la sección **Oportunidad**, habilita:
   - ✅ **find**
   - ✅ **findOne**
   - ✅ **create**
   - ✅ **update**
   - ✅ **delete**
3. Haz clic en **Save**

**Nota:** Si usas autenticación, configura los permisos en el rol correspondiente (Authenticated, Admin, etc.)

### 6. Verificar

1. Ve a **Content Manager** → **Oportunidad**
2. Deberías ver una lista vacía (o con datos si ya creaste algunos)
3. Prueba crear una oportunidad de prueba

## 🔧 Configuración Adicional (Opcional)

### Campos de Auditoría
Strapi automáticamente agrega:
- `createdAt` (Date)
- `updatedAt` (Date)
- `createdBy` (User)
- `updatedBy` (User)

### Configuración de Búsqueda
Si quieres mejorar la búsqueda, puedes agregar campos de texto indexados o usar el plugin de búsqueda de Strapi.

## 📝 Ejemplo de Datos de Prueba

Una vez creado, puedes crear una oportunidad de prueba con estos datos:

```json
{
  "nombre": "Plataforma Escolar - Colegio San José",
  "descripcion": "Implementación de sistema de gestión escolar completo",
  "monto": 50000,
  "moneda": "CLP",
  "etapa": "Negotiation",
  "estado": "in-progress",
  "prioridad": "high",
  "fecha_cierre": "2026-03-15",
  "fuente": "Referral",
  "activo": true,
  "contacto": [ID de una Persona],
  "propietario": [ID de un Colaborador]
}
```

## ⚠️ Solución de Problemas

### Error 404 después de crear
- Verifica que el nombre del content-type sea exactamente `Oportunidad` (singular)
- Verifica que los permisos estén configurados correctamente
- Reinicia Strapi si es necesario

### Error al crear relaciones
- Asegúrate de que los content-types relacionados (`Persona`, `Intranet-colaboradores`) existan
- Verifica que los IDs sean correctos

### Campos no aparecen
- Verifica que hayas guardado el content-type
- Revisa que Strapi haya reiniciado correctamente

## 🚀 Siguiente Paso

Una vez creado el content-type, la aplicación debería funcionar correctamente y podrás:
- Ver oportunidades en `/crm/opportunities`
- Crear nuevas oportunidades
- Editar oportunidades existentes
- Usar el Pipeline para gestionar etapas
