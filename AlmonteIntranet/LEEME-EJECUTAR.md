# 🚀 Cómo Ejecutar el Proyecto Localmente

## ✅ Super Simple - Solo 2 Comandos:

```powershell
cd C:\Users\mati\Desktop\intranet\AlmonteIntranet
npm run dev
```

**¡Listo!** Abre: http://localhost:3000

---

## Si es la primera vez (instalar dependencias):

```powershell
cd C:\Users\mati\Desktop\intranet\AlmonteIntranet
npm install
npm run dev
```

---

## 🎯 Opción Alternativa: Script Automático

Si `npm` no funciona, usa el script:

```powershell
cd C:\Users\mati\Desktop\intranet\AlmonteIntranet
.\iniciar-local.ps1
```

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
