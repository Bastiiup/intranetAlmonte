# Prompt para Cursor - Proyecto Strapi

## Problema
Los productos (libros) que se crean desde la Intranet no se están sincronizando con WordPress, aunque aparecen en Strapi.

## Contexto
- Los productos se crean correctamente en Strapi con `estado_publicacion = "Pendiente"`
- Cuando se cambia el estado a "Publicado", deberían sincronizarse automáticamente con WordPress
- Los productos NO aparecen en ninguna de las dos plataformas WordPress después de cambiar el estado

## Preguntas para Cursor sobre Strapi

### 1. Verificar Lifecycles de Sincronización
```
Revisa el archivo de lifecycles para la colección "Libros" (libro):
- Ubicación: strapi/src/api/libro/content-types/libro/lifecycles.js
- Verifica que haya un lifecycle que se ejecute cuando:
  * estado_publicacion cambia a "Publicado"
  * El producto tiene canales asignados
- Verifica que el lifecycle llame a la API de WordPress/WooCommerce para crear/actualizar el producto
- Revisa si hay errores en el código o si falta alguna validación
```

### 2. Verificar Configuración de Canales
```
Revisa cómo se manejan los canales en la sincronización:
- ¿Los lifecycles verifican que el producto tenga canales antes de sincronizar?
- ¿Hay alguna lógica que determine a qué WordPress sincronizar según los canales?
- Verifica que los canales estén correctamente relacionados con las URLs de WordPress
```

### 3. Verificar Errores en Lifecycles
```
Revisa los lifecycles para identificar posibles problemas:
- ¿Hay manejo de errores adecuado?
- ¿Los errores se están logueando correctamente?
- ¿Hay algún problema con la autenticación a WordPress?
- ¿Las URLs de WordPress están correctamente configuradas?
```

### 4. Verificar Estructura del Producto
```
Verifica que el producto tenga todos los campos necesarios para WordPress:
- ¿Se están mapeando correctamente los campos de Strapi a WooCommerce?
- ¿Faltan campos obligatorios para WooCommerce?
- ¿El formato de los datos es correcto para la API de WooCommerce?
```

### 5. Verificar Logs y Debugging
```
Agrega logging detallado en los lifecycles para diagnosticar:
- Log cuando se ejecuta el lifecycle
- Log de los datos que se envían a WordPress
- Log de la respuesta de WordPress
- Log de errores si la sincronización falla
```

## Prompt Completo para Cursor

Copia y pega esto en Cursor cuando estés en el proyecto de Strapi:

```
# Problema: Productos no se sincronizan con WordPress

## Situación Actual
- Los productos se crean correctamente en Strapi desde la Intranet
- Estado inicial: "Pendiente"
- Cuando se cambia a "Publicado", deberían sincronizarse con WordPress automáticamente
- Los productos NO aparecen en WordPress después del cambio de estado

## Tareas

### 1. Revisar Lifecycles de Libros
Archivo: `strapi/src/api/libro/content-types/libro/lifecycles.js`

Verifica:
- ¿Existe un lifecycle `afterUpdate` que se ejecute cuando `estado_publicacion` cambia a "Publicado"?
- ¿El lifecycle verifica que el producto tenga canales asignados?
- ¿El lifecycle llama correctamente a la API de WordPress/WooCommerce?
- ¿Hay manejo de errores adecuado?

### 2. Verificar Configuración de WordPress
- ¿Las URLs de WordPress están correctamente configuradas en las variables de entorno?
- ¿Las credenciales de WooCommerce (Consumer Key/Secret) están configuradas?
- ¿Hay alguna lógica que determine a qué WordPress sincronizar según los canales?

### 3. Agregar Logging Detallado
Agrega console.log en los lifecycles para diagnosticar:
- Cuando se ejecuta el lifecycle
- Los datos que se envían a WordPress
- La respuesta de WordPress
- Cualquier error que ocurra

### 4. Verificar Mapeo de Campos
Asegúrate de que todos los campos necesarios se mapeen correctamente:
- nombre_libro → name
- descripcion → description
- precio → price
- stock_quantity → stock_quantity
- etc.

### 5. Probar Sincronización Manual
Crea un endpoint de prueba o comando para forzar la sincronización de un producto específico y verificar que funcione.

## Resultado Esperado
Después de los cambios, cuando un producto cambia a "Publicado" y tiene canales asignados, debería:
1. Ejecutarse el lifecycle
2. Crear/actualizar el producto en WordPress
3. Aparecer en la tienda de WordPress
4. Mostrar logs detallados del proceso
```

## Información Adicional

Si Cursor necesita más contexto, comparte:
- La estructura actual del lifecycle
- Las variables de entorno relacionadas con WordPress
- Cualquier error que aparezca en los logs de Strapi
- La configuración de canales y cómo se relacionan con WordPress

