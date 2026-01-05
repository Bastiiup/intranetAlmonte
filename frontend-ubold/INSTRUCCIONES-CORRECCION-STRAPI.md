# Instrucciones: Corregir Schema de Oportunidad en Strapi

## ⚠️ Corrección Crítica: Relación con Propietario

Cursor generó el schema, pero **necesitas verificar y corregir** la relación con el propietario.

## 🔍 Paso 1: Verificar el Nombre Exacto del Content-Type de Colaboradores

1. Ve a https://strapi.moraleja.cl/admin
2. Inicia sesión
3. Ve a **Content-Type Builder**
4. Busca el content-type de colaboradores
5. Haz click en él para ver sus detalles
6. **Anota el nombre exacto** que aparece en:
   - **API ID** o **UID**: Debería ser algo como:
     - `api::colaborador.colaborador`
     - `api::intranet-colaboradores.intranet-colaboradores`
     - `api::colaboradores.colaboradores`
     - O cualquier otra variante

## 📝 Paso 2: Corregir el Schema

Una vez que sepas el nombre exacto, edita el archivo:

**`strapi/src/api/oportunidad/content-types/oportunidad/schema.json`**

Busca la sección `"propietario"` y corrige el `target`:

### Si el nombre es `api::colaborador.colaborador`:
```json
"propietario": {
  "type": "relation",
  "relation": "manyToOne",
  "target": "api::colaborador.colaborador"
}
```

### Si el nombre es `api::intranet-colaboradores.intranet-colaboradores`:
```json
"propietario": {
  "type": "relation",
  "relation": "manyToOne",
  "target": "api::intranet-colaboradores.intranet-colaboradores"
}
```

### Si el nombre es otro:
Usa el nombre exacto que encontraste en el paso 1.

## ✅ Paso 3: Verificar Otros Campos

Asegúrate de que estos campos estén correctos:

1. **contacto**: Debe apuntar a `api::persona.persona` ✅
2. **producto**: Puede apuntar a `api::producto.producto` o dejarse sin target si no existe
3. **Valores de enumeraciones**: Deben escribirse EXACTAMENTE como se muestra:
   - `"Qualification"` (no `"qualification"`)
   - `"Proposal Sent"` (con espacio, mayúscula inicial)
   - `"in-progress"` (con guión, minúsculas)

## 🚀 Paso 4: Guardar y Reiniciar

1. Guarda el archivo `schema.json`
2. Strapi debería reiniciarse automáticamente
3. Si no se reinicia, reinicia manualmente el servidor de Strapi

## 🔍 Paso 5: Verificar en Strapi Admin

1. Ve a **Content Manager** → **Oportunidad**
2. Verifica que el content-type aparece
3. Intenta crear una oportunidad de prueba
4. Verifica que las relaciones funcionan:
   - Puedes seleccionar un Contacto (Persona)
   - Puedes seleccionar un Propietario (Colaborador)
   - Producto es opcional

## ⚙️ Paso 6: Configurar Permisos

1. Ve a **Settings** → **Users & Permissions plugin** → **Roles**
2. Selecciona el rol apropiado (Authenticated, Public, etc.)
3. Busca la sección **"Oportunidad"**
4. Habilita estos permisos:
   - ✅ **find**
   - ✅ **findOne**
   - ✅ **create**
   - ✅ **update**
   - ✅ **delete**
5. Haz click en **Save**

## 🧪 Paso 7: Probar desde el Frontend

1. Ve a `/crm/opportunities` en tu aplicación
2. Deberías ver la lista (vacía si no hay datos)
3. Intenta crear una oportunidad desde la UI (si hay modal)
4. Verifica que no aparezcan errores 404

## 📋 Checklist Final

- [ ] Schema JSON tiene el nombre correcto del content-type
- [ ] Relación `contacto` apunta a `api::persona.persona`
- [ ] Relación `propietario` apunta al content-type correcto de colaboradores
- [ ] Relación `producto` es opcional (puede no existir)
- [ ] Todos los campos tienen los tipos y defaults correctos
- [ ] Los valores de las enumeraciones están escritos exactamente como se especificó
- [ ] Strapi se reinició correctamente
- [ ] El content-type aparece en Content Manager
- [ ] Los permisos están configurados
- [ ] Se puede crear una oportunidad de prueba
- [ ] Las relaciones funcionan correctamente

## 🆘 Si Algo No Funciona

### Error: "Target not found"
- Verifica que el nombre del target sea exactamente el mismo que aparece en Content-Type Builder
- Asegúrate de que el content-type target exista y esté guardado

### Error: "Invalid enum value"
- Verifica que los valores de las enumeraciones estén escritos EXACTAMENTE como se especificó
- Respeta mayúsculas, minúsculas, espacios y guiones

### Error 404 al acceder desde el frontend
- Verifica que los permisos estén configurados
- Verifica que el nombre del content-type sea exactamente "Oportunidad" (singular, mayúscula inicial)
