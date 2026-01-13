# 🚀 Cómo Ejecutar el Proyecto Localmente

## ✅ Super Simple

### Si `npm` funciona:

```powershell
cd C:\Users\mati\Desktop\intranet\AlmonteIntranet
npm run dev
```

### Si `npm` NO funciona (Node.js no está en PATH):

```powershell
cd C:\Users\mati\Desktop\intranet\AlmonteIntranet
powershell -ExecutionPolicy Bypass -File .\iniciar-local.ps1
```

**Nota:** Si aparece error de "ejecución de scripts deshabilitada", usa el comando de arriba.

**¡Listo!** Abre: http://localhost:3000

---

## Si es la primera vez (instalar dependencias):

**Con npm:**
```powershell
npm install
npm run dev
```

**Con script (recomendado si npm no funciona):**
```powershell
.\iniciar-local.ps1
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
