# 🚀 Comandos para Ejecutar el Proyecto Localmente

## ✅ Estado Actual

- ✅ Archivo `.env.local` creado con todas las credenciales
- ⚠️ Node.js instalado pero no disponible en esta sesión de PowerShell

## 📝 Pasos a Seguir

### 1. Abrir una NUEVA Terminal PowerShell

**IMPORTANTE:** Cierra esta terminal y abre una nueva, o reinicia PowerShell para que Node.js esté disponible.

### 2. Navegar al Proyecto

```powershell
cd C:\Users\mati\Desktop\intranet\AlmonteIntranet
```

### 3. Verificar Node.js y npm

```powershell
node --version
# Debe mostrar: v20.x.x o superior

npm --version
# Debe mostrar: 10.x.x o superior
```

Si no funcionan, reinicia PowerShell o verifica la instalación de Node.js.

### 4. Instalar Dependencias (Solo la primera vez)

```powershell
npm install
```

⏱️ **Tiempo estimado:** 3-5 minutos

### 5. Ejecutar el Servidor de Desarrollo

```powershell
npm run dev
```

Deberías ver:
```
▲ Next.js 16.0.10
- Local:        http://localhost:3000
✓ Ready in 2.3s
```

### 6. Abrir en el Navegador

- **Aplicación:** http://localhost:3000
- **CRM Colegios:** http://localhost:3000/crm/colegios
- **CRM Contactos:** http://localhost:3000/crm/contacts

## 🎯 Comandos Rápidos (Copia y Pega)

```powershell
# 1. Ir al proyecto
cd C:\Users\mati\Desktop\intranet\AlmonteIntranet

# 2. Instalar dependencias (solo primera vez)
npm install

# 3. Ejecutar servidor
npm run dev
```

## ⚠️ Si Node.js No Está Disponible

1. **Reinicia PowerShell completamente**
2. O verifica la instalación:
   - Abre "Configuración de Windows"
   - Busca "Variables de entorno"
   - Verifica que Node.js esté en el PATH

## ✅ Verificación

Una vez que `npm run dev` esté ejecutándose:

1. ✅ Deberías ver "Ready" en la terminal
2. ✅ Abre http://localhost:3000 en tu navegador
3. ✅ Deberías ver la aplicación funcionando
4. ✅ El CRM debería cargar colegios y contactos

## 🔄 Para Detener el Servidor

Presiona `Ctrl + C` en la terminal donde está ejecutándose `npm run dev`

## 📌 Notas

- **Hot Reload:** Los cambios se reflejan automáticamente
- **Variables de entorno:** Ya están configuradas en `.env.local`
- **Strapi:** Se conecta a https://strapi.moraleja.cl (no necesitas Strapi local)

¡Listo para desarrollar! 🎉
