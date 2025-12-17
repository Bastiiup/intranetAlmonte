# Configuración de Railway para rama matiRama

## Pasos para crear un entorno de despliegue en Railway para la rama matiRama

### Opción 1: Crear un nuevo servicio en Railway (Recomendado)

1. **Accede al dashboard de Railway:**
   - Ve a https://railway.app
   - Inicia sesión con tu cuenta

2. **Crea un nuevo proyecto o selecciona el proyecto existente:**
   - Si ya tienes un proyecto, selecciónalo
   - Si no, crea uno nuevo

3. **Agrega un nuevo servicio:**
   - Haz clic en "New Service" o "+ New"
   - Selecciona "GitHub Repo"
   - Conecta el repositorio `intranetAlmonte` si no está conectado

4. **Configura el servicio para la rama matiRama:**
   - En la configuración del servicio, ve a "Settings"
   - Busca la sección "Source" o "Branch"
   - Cambia la rama de `main` a `matiRama`
   - Guarda los cambios

5. **Configura las variables de entorno:**
   - Ve a "Variables" en la configuración del servicio
   - Asegúrate de tener todas las variables necesarias:
     - `STRAPI_API_TOKEN`
     - `NEXT_PUBLIC_STRAPI_URL`
     - `WOOCOMMERCE_CONSUMER_KEY`
     - `WOOCOMMERCE_CONSUMER_SECRET`
     - `WOOCOMMERCE_URL`
     - Y cualquier otra variable que uses

6. **Railway desplegará automáticamente:**
   - Cada vez que hagas push a la rama `matiRama`, Railway desplegará automáticamente
   - Puedes ver el progreso en el dashboard

### Opción 2: Usar Preview Deployments (Automático)

Railway puede crear automáticamente preview deployments para cada rama:

1. **Habilita Preview Deployments:**
   - Ve a la configuración del proyecto en Railway
   - Busca "Preview Deployments" o "Branch Deployments"
   - Actívalo si está disponible

2. **Railway creará automáticamente:**
   - Un entorno de preview para cada push a cualquier rama
   - Incluyendo la rama `matiRama`

### Configuración del archivo railway.json

El archivo `railway.json` ya está configurado correctamente:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "node server.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Verificar el despliegue

Una vez configurado, puedes verificar:

1. **Logs del despliegue:**
   - Ve a "Deployments" en Railway
   - Revisa los logs para ver el progreso

2. **URL del servicio:**
   - Railway generará una URL única para tu servicio
   - Puedes encontrarla en "Settings" → "Domains"

### Notas importantes

- **Variables de entorno:** Asegúrate de configurar todas las variables de entorno necesarias en el nuevo servicio
- **Costo:** Cada servicio adicional puede tener costos asociados según tu plan de Railway
- **Dominio personalizado:** Puedes configurar un dominio personalizado para distinguir entre entornos (ej: `matiRama.intranet2.moraleja.cl`)

### Comandos útiles

```bash
# Ver el estado de la rama
git status

# Hacer push de cambios a matiRama
git push origin matiRama

# Ver los logs de Railway (si tienes CLI instalado)
railway logs
```

