# 🚀 Instrucciones para Desplegar Localmente

## ✅ Archivo `.env.local` Creado

El archivo `.env.local` ha sido creado con todas las credenciales necesarias.

## 📋 Pasos para Ejecutar

### 1. Verificar Node.js y npm

Abre una nueva terminal PowerShell y verifica:

```powershell
node --version
# Debe ser >= 20.9.0

npm --version
# Debe ser >= 10.0.0
```

**Si no tienes Node.js instalado:**
- Descarga desde: https://nodejs.org/
- Instala la versión LTS (Long Term Support)
- Reinicia tu terminal después de instalar

### 2. Navegar al Proyecto

```powershell
cd C:\Users\mati\Desktop\intranet\AlmonteIntranet
```

### 3. Instalar Dependencias

```powershell
npm install
```

⏱️ **Tiempo estimado:** 3-5 minutos (solo la primera vez)

### 4. Ejecutar el Servidor de Desarrollo

```powershell
npm run dev
```

⏱️ **Tiempo estimado:** 30-60 segundos

Deberías ver algo como:
```
▲ Next.js 16.0.10
- Local:        http://localhost:3000
✓ Ready in 2.3s
```

### 5. Acceder a la Aplicación

Abre tu navegador en:
- **Aplicación principal:** http://localhost:3000
- **CRM - Colegios:** http://localhost:3000/crm/colegios
- **CRM - Contactos:** http://localhost:3000/crm/contacts

## 🔍 Verificar que Funciona

1. **La página carga** sin errores
2. **El CRM funciona:** Puedes ver la lista de colegios y contactos
3. **No hay errores** en la consola del navegador (F12)

## ⚠️ Problemas Comunes

### Error: "node no se reconoce como comando"

**Solución:**
1. Instala Node.js desde https://nodejs.org/
2. Reinicia tu terminal PowerShell
3. Verifica con `node --version`

### Error: "Port 3000 is already in use"

**Solución:**
```powershell
# Ver qué proceso usa el puerto 3000
netstat -ano | findstr :3000

# Matar el proceso (reemplaza <PID> con el número que aparezca)
taskkill /PID <PID> /F

# O usar otro puerto
npm run dev -- -p 3001
```

### Error: "Cannot find module"

**Solución:**
```powershell
# Eliminar node_modules y reinstalar
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

### Error: "Error al cargar colegios/contactos"

**Solución:**
1. Verifica que `.env.local` existe en `AlmonteIntranet/`
2. Verifica que `STRAPI_API_TOKEN` tiene un valor
3. Reinicia el servidor (Ctrl+C y luego `npm run dev`)
4. Revisa la consola del navegador (F12) para más detalles

## 📝 Comandos Útiles

```powershell
# Desarrollo
npm run dev              # Inicia servidor de desarrollo

# Build (para producción)
npm run build           # Construye la aplicación
npm run start           # Inicia servidor de producción

# Calidad de código
npm run lint            # Ejecuta el linter
npm run type-check      # Verifica errores de TypeScript
```

## 🎯 Ventajas de Trabajar Local

- ✅ **Cambios instantáneos:** Hot reload automático
- ✅ **Sin esperar builds:** No hay que esperar Railway
- ✅ **Debugging fácil:** Herramientas de desarrollo
- ✅ **Sin límites:** Puedes trabajar sin conexión (excepto APIs externas)

## 📌 Notas Importantes

1. **Hot Reload:** Los cambios en el código se reflejan automáticamente (no necesitas reiniciar)
2. **Variables de Entorno:** Requieren reinicio del servidor para aplicar cambios
3. **Strapi:** Debe estar accesible desde tu red (usa el Strapi en producción)
4. **Base de Datos:** No necesitas base de datos local, todo está en Strapi

## ✅ Checklist Final

Antes de comenzar a desarrollar:

- [ ] Node.js >= 20.9.0 instalado
- [ ] npm >= 10.0.0 instalado
- [ ] Estás en el directorio `AlmonteIntranet/`
- [ ] Dependencias instaladas (`npm install` ejecutado)
- [ ] Archivo `.env.local` existe (✅ ya creado)
- [ ] Servidor ejecutando (`npm run dev`)
- [ ] Aplicación accesible en `http://localhost:3000`
- [ ] CRM funcionando correctamente

**¡Listo para desarrollar!** 🎉
