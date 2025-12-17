# Cómo Forzar Railway a Usar NIXPACKS

## Problema Actual
Railway está usando Docker en lugar de NIXPACKS a pesar de tener `railway.json` configurado.

## Solución: Configurar en el Dashboard de Railway

### Paso 1: Ve a Settings del Servicio
1. Abre tu proyecto en Railway
2. Haz clic en el servicio "Intranet prueba mati"
3. Ve a **Settings** → **Build & Deploy**

### Paso 2: Configurar Builder
1. Busca la sección **"Build Command"** o **"Builder"**
2. Si hay un campo **"Dockerfile Path"**, **BÓRRALO** o déjalo vacío
3. Si hay un campo **"Build Command"**, déjalo vacío
4. Busca **"Builder"** o **"Build System"** y selecciona **"NIXPACKS"** explícitamente
5. Si hay una opción **"Auto-detect"**, cámbiala a **"NIXPACKS"**

### Paso 3: Configurar Root Directory
1. Busca **"Root Directory"** o **"Working Directory"**
2. Asegúrate de que esté configurado como: `frontend-ubold`
3. Si no existe, créalo

### Paso 4: Configurar Start Command
1. Busca **"Start Command"** o **"Run Command"**
2. Configúralo como: `node server.js`
3. **NO** uses `cd frontend-ubold && node server.js`

### Paso 5: Guardar y Redeploy
1. Haz clic en **"Save"** o **"Update"**
2. Ve a **Deployments**
3. Haz clic en **"Redeploy"** o **"Deploy"**

## Si No Funciona: Desconectar y Reconectar

1. Ve a **Settings** → **Source**
2. Haz clic en **"Disconnect"** o **"Unlink"** en el repositorio
3. Espera unos segundos
4. Haz clic en **"Connect Repository"** o **"Link Repository"**
5. Selecciona tu repositorio de GitHub
6. **IMPORTANTE**: Selecciona la rama `matiRama` (no `main`)
7. Railway debería detectar automáticamente `railway.json` y usar NIXPACKS

## Verificación

Después de hacer los cambios, verifica en los logs de build que diga:
- ✅ "Using NIXPACKS builder"
- ✅ "Detected Node.js project"
- ❌ NO debe decir "Using Dockerfile" o "Building with Docker"

## Archivos de Configuración Actuales

### railway.json (en la raíz)
```json
{
  "build": {
    "builder": "NIXPACKS",
    "rootDirectory": "frontend-ubold"
  },
  "deploy": {
    "startCommand": "node server.js"
  }
}
```

### nixpacks.toml (en la raíz)
```toml
[start]
cmd = "node server.js"
```

Ambos archivos están correctamente configurados. El problema es que Railway necesita que lo configures explícitamente en el dashboard.

