# 🚀 Cómo Ejecutar el Proyecto Localmente

## ✅ Todo Está Listo

- ✅ Archivo `.env.local` creado con todas las credenciales
- ✅ Script de inicio automático creado

## 🎯 Opción 1: Script Automático (RECOMENDADO)

### Pasos:

1. **Abre PowerShell** (como Administrador si es necesario)

2. **Navega al proyecto:**
   ```powershell
   cd C:\Users\mati\Desktop\intranet\AlmonteIntranet
   ```

3. **Ejecuta el script:**
   ```powershell
   .\iniciar-local.ps1
   ```

El script automáticamente:
- ✅ Busca Node.js en tu sistema
- ✅ Verifica las versiones
- ✅ Instala dependencias si es necesario
- ✅ Inicia el servidor de desarrollo

## 🎯 Opción 2: Manual

Si prefieres hacerlo manualmente:

```powershell
# 1. Ir al proyecto
cd C:\Users\mati\Desktop\intranet\AlmonteIntranet

# 2. Verificar Node.js (debe estar en el PATH)
node --version
npm --version

# 3. Instalar dependencias (solo primera vez)
npm install

# 4. Ejecutar servidor
npm run dev
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
