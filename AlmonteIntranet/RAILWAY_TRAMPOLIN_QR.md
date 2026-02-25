# Variable para integración con Trampolín QR (mor.cl)

En el despliegue de la **intranet** en Railway, añade esta variable para que el botón "Publicar en mor.cl" funcione en Redirección QR → Generar QR.

---

## Copiar y pegar en Railway (proyecto Intranet)

```
TRAMPOLIN_QR_API_URL=https://tu-app-trampolin.up.railway.app
```

Sustituye `https://tu-app-trampolin.up.railway.app` por la **URL pública** de tu despliegue de [Trampolín QR](https://github.com/Zenn-Dev99/Trampolin_qr) en Railway (sin barra final).

---

## Ejemplo

Si Trampolín QR está desplegado en:

`https://trampolin-qr-production.up.railway.app`

entonces en la intranet configura:

```
TRAMPOLIN_QR_API_URL=https://trampolin-qr-production.up.railway.app
```
