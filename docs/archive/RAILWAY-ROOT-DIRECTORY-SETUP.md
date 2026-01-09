# Adaptación del Proyecto para Root Directory en Railway

## 📋 Resumen

Este documento describe los cambios realizados para adaptar el proyecto para que Railway use `frontend-ubold` como root directory, optimizando los tiempos de build y simplificando la configuración de despliegue.

---

## 🎯 Objetivo

Configurar Railway para usar `frontend-ubold` como root directory, lo que permite:
- ✅ **Optimización de tiempos de build**: Docker solo construye lo necesario (solo frontend-ubold)
- ✅ **Simplificación de rutas**: No es necesario usar `frontend-ubold/` en las rutas del Dockerfile
- ✅ **Mejor gestión del contexto de build**: Docker opera directamente desde el directorio del proyecto
- ✅ **Consistencia**: El root directory coincide con la estructura del proyecto

---

## 🔧 Cambios Realizados

### 1. Dockerfile (Raíz del Repositorio)

**Ubicación**: `Dockerfile`

**Cambios realizados:**

#### ❌ Antes:
```dockerfile
# Copiar archivos de dependencias primero
COPY frontend-ubold/package*.json ./

# Copiar el resto de los archivos
COPY frontend-ubold/ .
```

**Problema**: Cuando Railway usa `rootDirectory: "frontend-ubold"`, el contexto de build ya está en ese directorio, por lo que buscar `frontend-ubold/` causa el error: `"/frontend-ubold": not found`

#### ✅ Ahora:
```dockerfile
# Copiar archivos de dependencias primero
# Nota: Railway está configurado con rootDirectory: "frontend-ubold"
# Por lo tanto, el contexto de build ya está en frontend-ubold/
COPY package*.json ./

# Copiar el resto de los archivos
# Nota: Como Railway usa rootDirectory: "frontend-ubold", el contexto ya está ahí
COPY . .
```

**Solución**: Usar rutas relativas porque el contexto de build ya está en `frontend-ubold/`

---

### 2. railway.json

**Ubicación**: `railway.json`

**Cambios realizados:**

#### ❌ Antes:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "rootDirectory": "frontend-ubold"
  },
  ...
}
```

**Problema**: Nixpacks puede no detectar correctamente el Dockerfile o usar una configuración diferente

#### ✅ Ahora:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "rootDirectory": "frontend-ubold"
  },
  ...
}
```

**Solución**: Usar `DOCKERFILE` explícitamente para forzar el uso de Docker, y Railway buscará automáticamente el Dockerfile dentro del `rootDirectory`

---

## 📁 Estructura de Archivos

### Dockerfiles Disponibles

El proyecto tiene dos Dockerfiles:

1. **`Dockerfile`** (raíz del repositorio)
   - ✅ Actualizado para funcionar con `rootDirectory: "frontend-ubold"`
   - Usa rutas relativas (`COPY package*.json ./`, `COPY . .`)

2. **`frontend-ubold/Dockerfile`**
   - ✅ Ya estaba configurado correctamente con rutas relativas
   - Railway lo usará automáticamente cuando `rootDirectory: "frontend-ubold"`

**Nota**: Railway buscará primero el Dockerfile dentro del `rootDirectory` especificado. Si existe `frontend-ubold/Dockerfile`, lo usará. Si no, usará el de la raíz (pero el contexto seguirá siendo `frontend-ubold/`).

---

## 🚀 Pasos para Aplicar en Railway

### Paso 1: Verificar Configuración en Railway

1. Ir a tu proyecto en Railway
2. Seleccionar el servicio (frontend-ubold)
3. Ir a la pestaña **Settings**
4. En la sección **Build**, verificar:
   - **Root Directory**: Debe estar configurado como `frontend-ubold`
   - **Build Command**: Debe estar vacío o usar Docker
   - **Start Command**: Debe ser `node server.js`

### Paso 2: Verificar railway.json

Asegúrate de que el archivo `railway.json` en la raíz del repositorio tenga:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "rootDirectory": "frontend-ubold"
  },
  "deploy": {
    "startCommand": "node server.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10,
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 300
  }
}
```

### Paso 3: Verificar Dockerfile

**Opción A: Si Railway usa `frontend-ubold/Dockerfile`** (recomendado)

El Dockerfile en `frontend-ubold/Dockerfile` ya está correcto:
```dockerfile
COPY package*.json ./
COPY . .
```

**Opción B: Si Railway usa `Dockerfile` (raíz)**

El Dockerfile en la raíz también está actualizado para funcionar con `rootDirectory: "frontend-ubold"`.

### Paso 4: Hacer Commit y Push

```bash
# Verificar cambios
git status

# Agregar archivos modificados
git add Dockerfile railway.json

# Commit
git commit -m "Adaptación para rootDirectory frontend-ubold en Railway"

# Push
git push origin rama-actual
```

### Paso 5: Trigger de Build en Railway

Railway debería detectar automáticamente el push y empezar un nuevo build. Si no:

1. Ir a la pestaña **Deployments** en Railway
2. Hacer clic en **Deploy Latest** o **Redeploy**

### Paso 6: Verificar el Build

Observar los logs del build en Railway para verificar:

✅ **Éxito esperado:**
```
Step 5/10 : COPY package*.json ./
Step 6/10 : RUN npm ci ...
Step 7/10 : COPY . .
Step 8/10 : RUN npm run build
```

❌ **Error que NO debería aparecer:**
```
ERROR: failed to solve: "/frontend-ubold": not found
```

---

## 🔍 Verificación Post-Deploy

### Checklist de Verificación

- [ ] El build se completa sin errores
- [ ] No aparece el error `"/frontend-ubold": not found`
- [ ] Las dependencias se instalan correctamente
- [ ] El build de Next.js se completa exitosamente
- [ ] El servicio se inicia correctamente (`node server.js`)
- [ ] La aplicación responde en el endpoint configurado
- [ ] El healthcheck (`/api/health`) responde correctamente

### Comandos de Verificación Local (Opcional)

Si quieres probar localmente que el Dockerfile funciona:

```bash
# Desde la raíz del repositorio
cd frontend-ubold

# Construir la imagen Docker (simula el contexto de Railway)
docker build -t frontend-test .

# Verificar que se construyó correctamente
docker images | grep frontend-test

# Ejecutar el contenedor (opcional, para pruebas)
docker run -p 3000:3000 frontend-test
```

**Nota**: Railway usa un contexto diferente, pero esto ayuda a verificar que las rutas son correctas.

---

## ⚠️ Problemas Comunes y Soluciones

### Error: `"/frontend-ubold": not found`

**Causa**: El Dockerfile está intentando copiar desde `frontend-ubold/` cuando el contexto ya está en ese directorio.

**Solución**: 
- Usar rutas relativas: `COPY package*.json ./` en lugar de `COPY frontend-ubold/package*.json ./`
- Verificar que `railway.json` tenga `"rootDirectory": "frontend-ubold"`

### Error: Dockerfile no encontrado

**Causa**: Railway no encuentra el Dockerfile en el rootDirectory.

**Solución**:
- Verificar que existe `frontend-ubold/Dockerfile` o que el Dockerfile en la raíz está actualizado
- Verificar que `railway.json` tiene `"builder": "DOCKERFILE"`

### Error: Build muy lento

**Causa**: Railway está construyendo todo el repositorio en lugar de solo `frontend-ubold`.

**Solución**:
- Verificar que `rootDirectory: "frontend-ubold"` está configurado correctamente
- Verificar en los logs que el contexto de build es correcto

### Error: No se encuentran los archivos durante el build

**Causa**: Las rutas en el Dockerfile no coinciden con el contexto de build.

**Solución**:
- Asegurarse de usar rutas relativas cuando `rootDirectory` está configurado
- Verificar que `COPY . .` copia desde el directorio actual (que es `frontend-ubold/`)

---

## 📊 Comparación: Antes vs Después

### Antes (Sin rootDirectory o mal configurado)

```dockerfile
# Dockerfile intentaba copiar desde frontend-ubold/
COPY frontend-ubold/package*.json ./
COPY frontend-ubold/ .

# Problemas:
# - Rutas incorrectas si rootDirectory está configurado
# - Build incluye todo el repositorio
# - Tiempos de build más largos
```

### Después (Con rootDirectory configurado)

```dockerfile
# Dockerfile usa rutas relativas
COPY package*.json ./
COPY . .

# Beneficios:
# ✅ Rutas correctas (contexto ya está en frontend-ubold/)
# ✅ Build solo incluye frontend-ubold/
# ✅ Tiempos de build optimizados
```

---

## 🎓 Conceptos Clave

### Root Directory en Railway

- **Qué es**: El directorio desde el cual Railway ejecuta el build
- **Cómo se configura**: En `railway.json` con `"rootDirectory": "frontend-ubold"`
- **Efecto**: Railway cambia el contexto de build a ese directorio antes de ejecutar el Dockerfile

### Contexto de Docker Build

- **Qué es**: El directorio desde el cual Docker ejecuta los comandos `COPY`
- **Con rootDirectory**: El contexto es `frontend-ubold/`, por lo que `COPY . .` copia desde `frontend-ubold/`
- **Sin rootDirectory**: El contexto es la raíz del repo, por lo que necesitarías `COPY frontend-ubold/ .`

### Builder en Railway

- **NIXPACKS**: Detección automática de lenguajes y configuración
- **DOCKERFILE**: Usa explícitamente el Dockerfile del proyecto
- **Recomendación**: Usar `DOCKERFILE` para mayor control y previsibilidad

---

## 📝 Notas Importantes

1. **Dos Dockerfiles**: El proyecto tiene Dockerfiles tanto en la raíz como en `frontend-ubold/`. Railway usará el del `rootDirectory` si existe.

2. **Compatible con ambos**: Ambos Dockerfiles están actualizados para funcionar con `rootDirectory: "frontend-ubold"`.

3. **No afecta desarrollo local**: Estos cambios solo afectan el build en Railway, no el desarrollo local.

4. **Variables de entorno**: Asegúrate de que todas las variables de entorno necesarias estén configuradas en Railway.

5. **Healthcheck**: El `healthcheckPath` en `railway.json` debe apuntar a un endpoint que exista (`/api/health`).

---

## 🔄 Rollback (Si es Necesario)

Si necesitas revertir estos cambios:

1. **Revertir Dockerfile:**
```dockerfile
# Volver a usar rutas con frontend-ubold/
COPY frontend-ubold/package*.json ./
COPY frontend-ubold/ .
```

2. **Revertir railway.json:**
```json
{
  "build": {
    "builder": "NIXPACKS",
    "rootDirectory": "frontend-ubold"
  }
}
```

3. **O eliminar rootDirectory:**
```json
{
  "build": {
    "builder": "DOCKERFILE"
    // Sin rootDirectory
  }
}
```

**Nota**: Si eliminas `rootDirectory`, necesitarás volver a usar `COPY frontend-ubold/...` en el Dockerfile.

---

## ✅ Resumen de Cambios

1. ✅ **Dockerfile (raíz)**: Actualizado para usar rutas relativas (`COPY package*.json ./`, `COPY . .`)
2. ✅ **railway.json**: Cambiado de `NIXPACKS` a `DOCKERFILE` para usar Docker explícitamente
3. ✅ **rootDirectory**: Mantenido como `"frontend-ubold"` para optimizar builds
4. ✅ **Comentarios añadidos**: Documentación en el Dockerfile explicando por qué se usan rutas relativas

