# 🚀 Cómo Ejecutar el Proyecto Localmente

## ✅ Super Simple - SOLUCIÓN RECOMENDADA

### Opción 1: Script .bat (MÁS FÁCIL - Sin problemas de permisos)

**Doble clic en:** `iniciar.bat`

**O desde PowerShell/CMD:**
```powershell
.\iniciar.bat
```

El script busca Node.js automáticamente y ejecuta `npm run dev`.

**¡Listo!** Abre: http://localhost:3000

---

### Opción 2: Si `npm` funciona directamente

```powershell
cd C:\Users\mati\Desktop\intranet\AlmonteIntranet
npm run dev
```

---

### Opción 3: Script PowerShell (si prefieres)

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

**Con script .bat (recomendado si npm no funciona):**
```cmd
iniciar.bat
```
El script instala dependencias automáticamente.

## 🌐 Acceder a la Aplicación

Una vez que el servidor esté ejecutándose:

- **Aplicación principal:** http://localhost:3000
- **CRM - Colegios:** http://localhost:3000/crm/colegios
- **CRM - Contactos:** http://localhost:3000/crm/contacts

## ⚠️ Si Node.js No Está en el PATH

Si `node --version` no funciona:

1. **Reinicia PowerShell completamente**
2. O verifica la instalación:
   - Abre "Configuración de Windows"
   - Busca "Variables de entorno"
   - Verifica que Node.js esté en el PATH del sistema

## 🔄 Para Detener el Servidor

Presiona `Ctrl + C` en la terminal donde está ejecutándose.

## 📝 Notas

- **Hot Reload:** Los cambios se reflejan automáticamente
- **Variables de entorno:** Ya configuradas en `.env.local`
- **Strapi:** Se conecta a https://strapi.moraleja.cl (remoto)

¡Listo para desarrollar! 🎉
