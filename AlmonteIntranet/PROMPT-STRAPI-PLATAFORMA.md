# Prompt para Cursor - Strapi: Agregar Campo Plataforma

## Prompt Completo

```
Necesito agregar un nuevo campo al Content Type "intranet-colaboradores" (Intranet · Colaboradores) en Strapi.

REQUERIMIENTO:
Agregar un campo de tipo Enumeration llamado "plataforma" que permita controlar en qué plataforma trabaja cada colaborador.

CONFIGURACIÓN ESPECÍFICA:
- Content Type: intranet-colaboradores (singularName: colaborador, pluralName: colaboradores)
- Nombre del campo: plataforma
- Tipo: Enumeration
- Valores del enum (en este orden exacto):
  1. moraleja
  2. escolar
  3. general
- Default value: general
- Required: false (opcional)
- Description: "Plataforma en la que trabaja el colaborador. 'general' permite acceso a ambas plataformas."

CONTEXTO:
Este campo se usa para filtrar automáticamente productos, pedidos y clientes según la plataforma asignada al colaborador:
- moraleja: Solo puede ver datos de Editorial Moraleja
- escolar: Solo puede ver datos de Librería Escolar  
- general: Puede ver datos de ambas plataformas (comportamiento por defecto)

IMPORTANTE:
- El campo debe ser opcional (required: false) para mantener compatibilidad con colaboradores existentes
- El valor por defecto debe ser "general" para que los colaboradores existentes puedan ver ambas plataformas
- No modificar otros campos existentes del Content Type
```

## Prompt Corto (Alternativa)

```
Agregar campo "plataforma" (tipo Enumeration) al Content Type "intranet-colaboradores" con valores: moraleja, escolar, general. Default: general. Required: false.
```

## Instrucciones de Uso

1. Copiar el prompt completo
2. Enviarlo al Cursor del proyecto de Strapi
3. Verificar que el campo se agregue correctamente
4. Probar que los valores del enum sean exactamente: `moraleja`, `escolar`, `general`

