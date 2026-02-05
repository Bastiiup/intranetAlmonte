# Gestor Multimedia MIRA – Variables de entorno

Para que el módulo **Gestión Multimedia** (subida a Bunny y vinculación a Strapi) funcione, configura estas variables en `.env.local` (desarrollo) o en tu plataforma de deploy (ej. Railway).

## Bunny.net Stream

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `BUNNY_LIBRARY_ID` | ID de la biblioteca de video en Bunny.net | `592474` |
| `BUNNY_API_KEY` | API Key (Stream) de la biblioteca. **Solo servidor**; no exponer en cliente. | `xxxxxx-xxxx-xxxx` |

Opcional (si ya usas la variable pública para el reproductor):

- `NEXT_PUBLIC_BUNNY_LIBRARY_ID` — se usa como fallback de `BUNNY_LIBRARY_ID` en la config de servidor.

## Strapi

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `NEXT_PUBLIC_STRAPI_URL` o `NEXT_PUBLIC_STRAPI_URL_LOCAL` | URL base de la API de Strapi | `https://strapi.tudominio.cl` |
| `STRAPI_API_TOKEN` o `STRAPI_API_TOKEN_LOCAL` | Token de API de Strapi (crear recurso-mira, listar libros-mira). **Solo servidor**. | `xxxxxx` |

## Resumen mínimo

```env
# Bunny (Gestor Multimedia)
BUNNY_LIBRARY_ID=592474
BUNNY_API_KEY=tu_stream_api_key

# Strapi (ya usado en el resto de la intranet)
NEXT_PUBLIC_STRAPI_URL=https://strapi.tudominio.cl
STRAPI_API_TOKEN=tu_token
```

Sin `BUNNY_API_KEY` y `BUNNY_LIBRARY_ID`, la pestaña de subida y el listado de videos en “Asignar a libro” devolverán 503. Sin `STRAPI_API_TOKEN`, la vinculación a libros fallará.

## Logs al vincular videos

Si "Vincular videos" falla (ej. "Vinculados 0. Errores: 1"):

1. **En la UI:** El mensaje de error muestra el detalle que devuelve Strapi.
2. **En Railway:** Proyecto → servicio Intranet → Deployments → último deploy → View Logs. Busca líneas `[MIRA vincular]` (Inicio, Strapi error, Resumen errores).

Así puedes ver si es 404 (no existe recursos-mira en Strapi), 400 (campos incorrectos) o 403 (permisos).
