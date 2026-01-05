# Archivos para Strapi - Content-Type "Lead"

Esta carpeta contiene los archivos necesarios para crear el content-type "Lead" en Strapi.

**⚠️ IMPORTANTE:** Estos archivos NO deben ser compilados por Next.js. Están aquí solo como referencia para copiar al proyecto de Strapi.

## Archivos

- `lead-schema.json` - Schema completo del content-type
- `lead-controller.ts` - Controller
- `lead-service.ts` - Service
- `lead-routes.ts` - Routes

## Instrucciones

Ver `INSTRUCCIONES-COPIAR-LEAD-STRAPI.md` en la raíz del proyecto para las instrucciones completas.

## Ubicación en Strapi

Después de copiar, los archivos deben estar en:

```
strapi/src/api/lead/
├── content-types/
│   └── lead/
│       └── schema.json
├── controllers/
│   └── lead.ts
├── services/
│   └── lead.ts
└── routes/
    └── lead.ts
```
