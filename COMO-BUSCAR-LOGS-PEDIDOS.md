# 🔍 CÓMO BUSCAR LOS LOGS DE PEDIDOS

## ⚠️ IMPORTANTE
Los logs que estás viendo son solo warnings del sistema de logging. **NO son errores críticos** y no afectan la funcronalidad de pedidos.

## 📋 PASOS PARA ENCONTRAR LOS LOGS REALES

### PASO 1: Crear o Actualizar un Pedido

1. Ve a la Intranet
2. Crea un pedido nuevo O actualiza el estado de un pedido existente
3. **Inmediatamente después**, ve a Railway

### PASO 2: Buscar Logs en Railway - PROYECTO INTRANET

1. Ve a Railway → Tu proyecto de **Intranet** (Next.js)
2. Ve a la pestaña **"Logs"** o **"Deploy Logs"**
3. Busca estos mensajes (usa Ctrl+F para buscar):

#### Al CREAR un pedido, busca:
```
[API Pedidos POST] 📦 Payload que se envía a Strapi:
[API Pedidos POST] ✅ Pedido creado en Strapi:
Origin Platform enviado:
Origin Platform en Strapi:
```

#### Al ACTUALIZAR un pedido, busca:
```
[API Pedidos PUT] 📦 Payload que se envía a Strapi:
[API Pedidos PUT] ✅ Pedido actualizado en Strapi:
Origin Platform enviado:
Origin Platform en Strapi:
```

### PASO 3: Buscar Logs en Railway - PROYECTO STRAPI

**⚠️ CRÍTICO:** Los lifecycles de Strapi se ejecutan en el proyecto de **Strapi**, NO en la Intranet.

1. Ve a Railway → Tu proyecto de **Strapi** (backend)
2. Ve a la pestaña **"Logs"** o **"Deploy Logs"**
3. Busca estos mensajes (usa Ctrl+F para buscar):

#### Al CREAR un pedido, busca:
```
[pedido] 🔍 afterCreate ejecutado
[pedido] Pedido ID:
[pedido] Número de pedido:
[pedido] Origin Platform:
[pedido] ✅ Iniciando sincronización a
```

#### Al ACTUALIZAR un pedido, busca:
```
[pedido] 🔍 afterUpdate ejecutado
[pedido] ✅ Iniciando actualización en
```

### PASO 4: Verificar Errores

En los logs de **Strapi**, busca errores:
```
❌ [pedido.service] Error
❌ [pedido] Error al sincronizar
Error al crear pedido en WooCommerce
401 Unauthorized
403 Forbidden
Configuración de WooCommerce no encontrada
```

## 🎯 QUÉ BUSCAR ESPECÍFICAMENTE

### 1. ¿Se envía correctamente el `originPlatform`?

**En logs de Intranet:**
```
Origin Platform enviado: woo_moraleja
Origin Platform en Strapi: woo_moraleja
```

**Si son diferentes o uno es `null`:**
- ❌ Ese es el problema
- Los lifecycles NO se ejecutarán si `originPlatform` es `null` o `otros`

### 2. ¿Se ejecutan los lifecycles de Strapi?

**En logs de Strapi:**
```
[pedido] 🔍 afterCreate ejecutado
```

**Si NO ves este mensaje:**
- ❌ Los lifecycles NO se están ejecutando
- Posibles causas:
  - `originPlatform` no se guardó correctamente
  - El lifecycle tiene una condición que impide su ejecución
  - Hay un error en el código del lifecycle

### 3. ¿Hay errores en la sincronización?

**En logs de Strapi:**
```
❌ Error al crear pedido en WooCommerce
❌ Configuración de WooCommerce no encontrada
```

**Si ves estos errores:**
- ❌ La sincronización está fallando
- Revisa las variables de entorno en Railway (Strapi)

## 📸 QUÉ COMPARTIR

Después de seguir estos pasos, comparte:

1. **Logs de Intranet (Railway - Proyecto Intranet):**
   - Copia los mensajes que empiezan con `[API Pedidos POST]` o `[API Pedidos PUT]`
   - Especialmente los que muestran `Origin Platform enviado` vs `Origin Platform en Strapi`

2. **Logs de Strapi (Railway - Proyecto Strapi):**
   - Copia los mensajes que empiezan con `[pedido]`
   - Cualquier error relacionado con WooCommerce

3. **Resultado:**
   - ¿El pedido se crea/actualiza en Strapi? (deberías verlo en Strapi Admin)
   - ¿Aparece en WooCommerce?
   - ¿Qué error específico ves?

## ⚠️ NOTA IMPORTANTE

Los warnings de logging que estás viendo:
```
[LOGGING] ⚠️ No se encontró cookie colaboradorData
[Logging] ⚠️ No se pudo capturar usuario para log
```

**NO son el problema.** Estos son solo warnings del sistema de logging intentando capturar información del usuario para los logs de actividad. El sistema está diseñado para continuar funcionando aunque no pueda capturar esta información.

**El problema real está en:**
- Si los lifecycles de Strapi se ejecutan o no
- Si hay errores al sincronizar con WooCommerce
- Si `originPlatform` se guarda correctamente

## 🚀 SIGUIENTE PASO

1. Crea o actualiza un pedido desde la Intranet
2. Ve a Railway → Proyecto **Intranet** → Busca `[API Pedidos POST/PUT]`
3. Ve a Railway → Proyecto **Strapi** → Busca `[pedido] 🔍 afterCreate/afterUpdate`
4. Comparte lo que encuentres


