# 🚀 Inicio Local - Super Simple

## ✅ SOLUCIÓN MÁS FÁCIL

**Opción 1: Doble clic**
- Haz doble clic en `iniciar.bat` en el explorador de archivos

**Opción 2: Desde PowerShell**
```powershell
cd C:\Users\mati\Desktop\intranet\AlmonteIntranet
.\iniciar.bat
```

**Opción 3: Desde CMD**
```cmd
cd C:\Users\mati\Desktop\intranet\AlmonteIntranet
iniciar.bat
```

**¡Listo!** Abre: http://localhost:3000

---

## Opción 2: Si `npm` funciona directamente

```powershell
cd C:\Users\mati\Desktop\intranet\AlmonteIntranet
npm run dev
```

---

## Opción 3: Script PowerShell (si prefieres)

```powershell
cd C:\Users\mati\Desktop\intranet\AlmonteIntranet
powershell -ExecutionPolicy Bypass -File .\iniciar-local.ps1
```

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
