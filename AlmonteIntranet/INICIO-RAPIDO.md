# 🚀 Inicio Rápido - Despliegue Local

## ✅ Pasos Simples (2 minutos)

### 1. Abre PowerShell en la carpeta del proyecto

```powershell
cd C:\Users\mati\Desktop\intranet\AlmonteIntranet
```

### 2. Ejecuta el script automático

```powershell
.\iniciar-local.ps1
```

**¡Eso es todo!** El script hará:
- ✅ Buscar Node.js automáticamente
- ✅ Instalar dependencias si es necesario
- ✅ Iniciar el servidor

### 3. Abre tu navegador

- **Aplicación:** http://localhost:3000
- **CRM Contactos:** http://localhost:3000/crm/contacts

---

## 🔧 Si el Script No Funciona

### Opción Manual (3 comandos):

```powershell
# 1. Ir al proyecto
cd C:\Users\mati\Desktop\intranet\AlmonteIntranet

# 2. Instalar dependencias (solo primera vez)
npm install

# 3. Iniciar servidor
npm run dev
```

---

## ⚙️ Variables de Entorno

Si necesitas crear/actualizar `.env.local`, las credenciales están en:
- `VARIABLES-RAILWAY-FINAL.md`
- `INSTRUCCIONES-DESPLIEGUE-LOCAL.md`

**Strapi ya está conectado** (remoto: https://strapi.moraleja.cl), así que solo necesitas las variables en `.env.local`.

---

## 🛑 Para Detener

Presiona `Ctrl + C` en la terminal.

---

## ❓ Problemas Comunes

### "node no se reconoce"
- Reinicia PowerShell
- O ejecuta el script `iniciar-local.ps1` (busca Node.js automáticamente)

### "Puerto 3000 en uso"
- Cierra otras aplicaciones que usen el puerto 3000
- O cambia el puerto: `npm run dev -- -p 3001`

### "Error de conexión a Strapi"
- Verifica que `.env.local` tenga `NEXT_PUBLIC_STRAPI_URL` y `STRAPI_API_TOKEN`
- Verifica que Strapi esté online en https://strapi.moraleja.cl

---

¡Listo para desarrollar! 🎉
