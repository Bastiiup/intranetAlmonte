# Configurar Permisos de Chat Manualmente en Strapi

Como la API de permisos requiere acceso de administrador, aquí están las instrucciones para configurarlo manualmente:

## Pasos para Configurar Permisos

### 1. Acceder al Admin de Strapi

1. Ve a: `https://strapi.moraleja.cl/admin`
2. Inicia sesión con una cuenta de administrador

### 2. Ir a Configuración de Permisos

1. En el menú lateral, ve a **Settings** (⚙️)
2. Click en **Users & Permissions plugin**
3. Click en **Roles**
4. Click en el rol **"Authenticated"** (el que usan los colaboradores al iniciar sesión)

### 3. Configurar Permisos para Intranet-Chats

1. En la página del rol "Authenticated", busca la sección **"INTRANET-CHAT"** (o **"Intranet-Chats"**)
2. Marca los siguientes checkboxes:
   - ✅ **find** - Para obtener lista de mensajes
   - ✅ **findOne** - Para obtener un mensaje específico
   - ✅ **create** - Para crear nuevos mensajes
   - ✅ **update** - Para actualizar mensajes (opcional, pero recomendado)
   - ✅ **delete** - Para eliminar mensajes (opcional)

### 4. Guardar

1. **IMPORTANTE**: Click en el botón **"Save"** (o "Guardar") en la parte superior derecha
2. Espera a que se confirme el guardado

### 5. Verificar

1. Puedes verificar que los permisos se guardaron correctamente revisando que los checkboxes estén marcados
2. Si es posible, reinicia Strapi para asegurar que los cambios surtan efecto

## Verificación Rápida

Después de configurar los permisos, prueba hacer una petición desde el frontend:

```javascript
// En la consola del navegador (con un usuario autenticado)
fetch('https://strapi.moraleja.cl/api/intranet-chats?filters[remitente_id][$eq]=1', {
  headers: {
    'Authorization': 'Bearer TU_JWT_TOKEN'
  }
})
.then(r => r.json())
.then(data => console.log('Mensajes:', data))
```

Si devuelve datos (aunque sea un array vacío `[]`), los permisos están funcionando.
Si devuelve error 403 o array vacío cuando SABES que hay datos, los permisos no están configurados correctamente.

## Notas Importantes

- ⚠️ **Los permisos se aplican por rol**, no por usuario individual
- ⚠️ **Es necesario guardar** después de marcar los checkboxes
- ⚠️ **Puede ser necesario reiniciar Strapi** para que los cambios surtan efecto
- ✅ Los permisos se aplican a TODOS los usuarios con el rol "Authenticated"

## Solución Alternativa: Script en Strapi

Si prefieres automatizarlo, puedes crear un script en el backend de Strapi:

```javascript
// En BdEstructura/strapi/src/index.js o en un script de bootstrap
async function configurarPermisosChat() {
  const authenticatedRole = await strapi.query('plugin::users-permissions.role').findOne({
    where: { type: 'authenticated' }
  })

  if (!authenticatedRole) {
    strapi.log.warn('Rol Authenticated no encontrado')
    return
  }

  const acciones = ['find', 'findOne', 'create', 'update', 'delete']
  
  for (const accion of acciones) {
    const accionCompleta = `api::intranet-chat.intranet-chat.${accion}`
    
    // Verificar si el permiso ya existe
    const permisoExistente = await strapi.query('plugin::users-permissions.permission').findOne({
      where: {
        action: accionCompleta,
        role: authenticatedRole.id
      }
    })

    if (!permisoExistente) {
      await strapi.query('plugin::users-permissions.permission').create({
        data: {
          action: accionCompleta,
          role: authenticatedRole.id
        }
      })
      strapi.log.info(`✅ Permiso creado: ${accionCompleta}`)
    } else {
      strapi.log.info(`ℹ️  Permiso ya existe: ${accionCompleta}`)
    }
  }
}

// Llamar en bootstrap
await configurarPermisosChat()
```

