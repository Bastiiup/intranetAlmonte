# 🚀 Inicio Local - Super Simple

## Opción 1: Si `npm` funciona (más rápido)

```powershell
cd C:\Users\mati\Desktop\intranet\AlmonteIntranet
npm run dev
```

**¡Listo!** Abre: http://localhost:3000

---

## Opción 2: Si `npm` NO funciona (usa el script automático)

```powershell
cd C:\Users\mati\Desktop\intranet\AlmonteIntranet
powershell -ExecutionPolicy Bypass -File .\iniciar-local.ps1
```

Este script busca Node.js automáticamente y lo configura.

**Nota:** Si aparece un error de "ejecución de scripts deshabilitada", usa el comando de arriba con `-ExecutionPolicy Bypass`.

---

## Si es la primera vez (instalar dependencias):

**Con npm:**
```powershell
npm install
npm run dev
```

**Con script:**
```powershell
.\iniciar-local.ps1
```
(El script instala dependencias automáticamente si es necesario)

---

## Para Detener:
Presiona `Ctrl + C`

---

**Strapi ya está conectado online**, así que solo ejecuta `npm run dev` y listo.
