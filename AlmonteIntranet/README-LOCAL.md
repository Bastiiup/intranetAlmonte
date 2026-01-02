# Guía para Desplegar en Local

Esta guía te ayudará a ejecutar el proyecto Next.js en tu máquina local.

## Requisitos Previos

- **Node.js**: Versión >= 20.9.0
- **npm**: Versión >= 10.0.0
- **Git**: Para clonar el repositorio (si es necesario)

## Pasos para Desplegar en Local

### 1. Navegar al directorio del proyecto

```bash
cd frontend-ubold
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto `frontend-ubold/` con las siguientes variables:

```env
# Strapi Configuration
STRAPI_URL=https://strapi.moraleja.cl
STRAPI_API_TOKEN=tu_token_de_strapi_aqui

# WooCommerce Moraleja
WOO_MORALEJA_URL=https://moraleja.cl
WOO_MORALEJA_CONSUMER_KEY=tu_consumer_key
WOO_MORALEJA_CONSUMER_SECRET=tu_consumer_secret

# WooCommerce Escolar
WOO_ESCOLAR_URL=https://escolar.moraleja.cl
WOO_ESCOLAR_CONSUMER_KEY=tu_consumer_key
WOO_ESCOLAR_CONSUMER_SECRET=tu_consumer_secret

# Next.js Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

**Nota**: Reemplaza los valores con tus credenciales reales. Si no tienes acceso a las credenciales, puedes usar valores vacíos para desarrollo, pero algunas funcionalidades no funcionarán.

### 4. Ejecutar el servidor de desarrollo

```bash
npm run dev
```

El servidor se iniciará en `http://localhost:3000`

### 5. Acceder a la aplicación

Abre tu navegador y ve a:
```
http://localhost:3000
```

## Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo con hot-reload
- `npm run build` - Construye la aplicación para producción
- `npm run start` - Inicia el servidor de producción (requiere build previo)
- `npm run lint` - Ejecuta el linter para verificar errores de código
- `npm run type-check` - Verifica errores de TypeScript sin compilar

## Solución de Problemas

### Error: "Cannot find module"
```bash
# Elimina node_modules y reinstala
rm -rf node_modules package-lock.json
npm install
```

### Error: "Port 3000 is already in use"
```bash
# En Windows PowerShell
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# O cambia el puerto en package.json
# Agrega: "dev": "next dev -p 3001"
```

### Error de variables de entorno
- Asegúrate de que el archivo `.env.local` esté en la raíz de `frontend-ubold/`
- Reinicia el servidor después de cambiar variables de entorno
- Verifica que no haya espacios alrededor del `=` en las variables

### Error de conexión con Strapi
- Verifica que `STRAPI_URL` sea correcta
- Verifica que `STRAPI_API_TOKEN` sea válido
- Asegúrate de que Strapi esté accesible desde tu red

## Estructura del Proyecto

```
frontend-ubold/
├── src/
│   ├── app/              # Rutas y páginas de Next.js
│   ├── components/       # Componentes reutilizables
│   ├── lib/              # Librerías y utilidades
│   │   ├── strapi/      # Cliente de Strapi
│   │   └── woocommerce/ # Cliente de WooCommerce
│   └── assets/          # Recursos estáticos
├── public/              # Archivos públicos
├── .env.local           # Variables de entorno (crear)
└── package.json         # Dependencias y scripts
```

## Desarrollo

### Hot Reload
El servidor de desarrollo tiene hot-reload habilitado. Los cambios en el código se reflejarán automáticamente en el navegador.

### Debugging
- Usa `console.log()` para debugging
- Las herramientas de desarrollo del navegador (F12) te ayudarán a inspeccionar errores
- Revisa la consola del terminal para ver logs del servidor

## Próximos Pasos

1. Configura las variables de entorno necesarias
2. Ejecuta `npm run dev`
3. Accede a `http://localhost:3000`
4. ¡Comienza a desarrollar!

## Notas Adicionales

- El proyecto usa Next.js 16 con App Router
- TypeScript está configurado para type-checking estricto
- Bootstrap 5 y React Bootstrap se usan para el UI
- El proyecto se conecta a Strapi (CMS) y WooCommerce (E-commerce)

