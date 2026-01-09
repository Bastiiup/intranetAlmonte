# Guía de Desarrollo

Esta guía contiene información sobre cómo desarrollar localmente, estructura del proyecto, scripts disponibles y mejores prácticas.

## 📋 Tabla de Contenidos

- [Inicio Rápido](#inicio-rápido)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Scripts Disponibles](#scripts-disponibles)
- [Arquitectura del Código](#arquitectura-del-código)
- [Flujos de Trabajo](#flujos-de-trabajo)
- [Testing](#testing)
- [Solución de Problemas](#solución-de-problemas)

---

## Inicio Rápido

### Requisitos Previos

- **Node.js**: >= 20.9.0
- **npm**: >= 10.0.0
- **Git**

### Configuración Inicial

```bash
# 1. Navegar al directorio del proyecto
cd AlmonteIntranet

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno (ver docs/CONFIGURACION.md)
# Crea .env.local con las variables necesarias

# 4. Ejecutar servidor de desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

---

## Estructura del Proyecto

```
AlmonteIntranet/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (admin)/           # Rutas protegidas (requieren auth)
│   │   │   ├── (apps)/       # Aplicaciones principales
│   │   │   │   ├── chat/     # Sistema de chat
│   │   │   │   ├── (ecommerce)/ # Tienda/e-commerce
│   │   │   │   │   ├── productos/
│   │   │   │   │   ├── pedidos/
│   │   │   │   │   ├── clientes/
│   │   │   │   │   └── orders/
│   │   │   │   └── users/    # Gestión de usuarios
│   │   │   ├── charts/        # Gráficos y visualizaciones
│   │   │   ├── forms/         # Formularios
│   │   │   └── tables/        # Tablas de datos
│   │   ├── (auth)/           # Páginas de autenticación
│   │   │   └── auth-1/      # Login, sign-in
│   │   ├── api/              # API Routes (Next.js)
│   │   │   ├── auth/        # Autenticación
│   │   │   ├── chat/        # Chat API
│   │   │   ├── colaboradores/ # API de colaboradores
│   │   │   ├── shipit/      # API de Shipit
│   │   │   └── tienda/      # API de tienda
│   │   ├── tienda/          # Rutas públicas de tienda
│   │   │   └── pos/         # Sistema POS
│   │   └── landing/         # Página de inicio pública
│   ├── components/           # Componentes reutilizables
│   │   ├── AlmonteLogo.tsx
│   │   ├── AppWrapper.tsx
│   │   └── ...
│   ├── lib/                 # Utilidades y clientes
│   │   ├── auth.ts          # Utilidades de autenticación
│   │   ├── strapi/          # Cliente Strapi
│   │   │   ├── client.ts
│   │   │   ├── config.ts
│   │   │   └── types.ts
│   │   ├── woocommerce/     # Cliente WooCommerce
│   │   ├── shipit/          # Cliente Shipit
│   │   └── utils/           # Utilidades generales
│   ├── hooks/               # Custom hooks de React
│   │   ├── useAuth.ts
│   │   └── ...
│   ├── layouts/             # Layouts de la aplicación
│   ├── assets/              # Recursos estáticos
│   │   ├── scss/           # Estilos SCSS
│   │   └── images/         # Imágenes
│   └── types/               # Tipos TypeScript
│       ├── index.ts
│       └── ...
├── public/                  # Archivos públicos
├── .env.local              # Variables de entorno (crear)
├── package.json
└── tsconfig.json
```

---

## Scripts Disponibles

### Desarrollo

```bash
npm run dev          # Servidor de desarrollo con hot-reload
npm run build        # Construir para producción
npm run start        # Servidor de producción (requiere build)
```

### Calidad de Código

```bash
npm run lint         # Ejecutar ESLint
npm run type-check   # Verificar tipos TypeScript sin compilar
npm run format       # Formatear código con Prettier
```

### Testing

```bash
npm test             # Ejecutar todos los tests
npm run test:watch   # Tests en modo watch
npm run test:coverage # Tests con cobertura
npm run test:unit    # Solo tests unitarios
npm run test:integration # Solo tests de integración
npm run test:e2e     # Tests end-to-end con Playwright
```

---

## Arquitectura del Código

### Cliente Strapi

**Ubicación:** `src/lib/strapi/client.ts`

**Características:**
- Timeout de 30 segundos para peticiones
- Logs detallados en desarrollo
- Manejo de errores robusto
- Headers de autenticación automáticos
- Métodos: `get`, `post`, `put`, `delete`
- Retry logic con backoff exponencial

**Ejemplo de uso:**
```typescript
import strapiClient from '@/lib/strapi/client'

// Obtener productos
const productos = await strapiClient.get('/api/libros?populate=*')

// Actualizar producto
await strapiClient.put(`/api/libros/${id}`, {
  data: { nombre_libro: 'Nuevo nombre' }
})
```

### Autenticación

**Archivos clave:**
- `src/lib/auth.ts` - Utilidades de autenticación
- `src/hooks/useAuth.ts` - Hook para datos del usuario
- `src/app/api/auth/login/route.ts` - Endpoint de login

**Roles de usuario:**
- `super_admin`
- `encargado_adquisiciones`
- `supervisor`
- `soporte`

### API Routes

Las API routes de Next.js están en `src/app/api/`:

- `/api/auth/*` - Autenticación
- `/api/tienda/*` - Gestión de tienda (productos, pedidos, clientes)
- `/api/woocommerce/*` - Integración WooCommerce
- `/api/shipit/*` - Integración Shipit
- `/api/chat/*` - Chat API

---

## Flujos de Trabajo

### Crear un Nuevo Componente

1. Crea el componente en `src/components/` o en la carpeta apropiada
2. Exporta el componente
3. Importa y usa donde sea necesario

**Ejemplo:**
```typescript
// src/components/MiComponente.tsx
export default function MiComponente() {
  return <div>Mi componente</div>
}
```

### Crear una Nueva API Route

1. Crea el archivo en `src/app/api/[ruta]/route.ts`
2. Exporta los métodos HTTP necesarios (`GET`, `POST`, `PUT`, `DELETE`)

**Ejemplo:**
```typescript
// src/app/api/mi-ruta/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ message: 'Hello' })
}

export async function POST(request: Request) {
  const data = await request.json()
  // Procesar data
  return NextResponse.json({ success: true })
}
```

### Trabajar con Strapi

Ver documentación en `docs/INTEGRACIONES.md` para detalles sobre integración con Strapi.

---

## Testing

### Estructura de Tests

Los tests están organizados en carpetas:
- `__tests__/unit/` - Tests unitarios
- `__tests__/integration/` - Tests de integración
- `e2e/` - Tests end-to-end

### Escribir Tests

**Test Unitario:**
```typescript
// __tests__/unit/mi-funcion.test.ts
import { miFuncion } from '@/lib/utils/mi-funcion'

describe('miFuncion', () => {
  it('debe retornar el valor esperado', () => {
    expect(miFuncion('input')).toBe('output')
  })
})
```

**Test de Componente:**
```typescript
import { render, screen } from '@testing-library/react'
import MiComponente from '@/components/MiComponente'

describe('MiComponente', () => {
  it('debe renderizar correctamente', () => {
    render(<MiComponente />)
    expect(screen.getByText('Mi componente')).toBeInTheDocument()
  })
})
```

---

## Solución de Problemas

### Error: "Cannot find module"

```bash
# Elimina node_modules y reinstala
rm -rf node_modules package-lock.json
npm install
```

### Error: "Port 3000 is already in use"

**Windows PowerShell:**
```powershell
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**O cambia el puerto:**
```bash
npm run dev -- -p 3001
```

### Error de variables de entorno

- Asegúrate de que `.env.local` esté en `AlmonteIntranet/`
- Reinicia el servidor después de cambiar variables
- Verifica que no haya espacios alrededor del `=` en las variables
- Verifica que las variables estén en el formato correcto

### Error de conexión con Strapi

- Verifica que `STRAPI_URL` sea correcta
- Verifica que `STRAPI_API_TOKEN` sea válido
- Asegúrate de que Strapi esté accesible desde tu red
- Revisa los logs del servidor para más detalles

### Error de TypeScript

```bash
# Verifica tipos sin compilar
npm run type-check

# Si hay errores, revisa los mensajes y corrige
```

### Hot Reload no funciona

- Guarda el archivo nuevamente
- Reinicia el servidor de desarrollo
- Verifica que no haya errores de sintaxis

### Build falla

```bash
# Limpia el caché y reconstruye
rm -rf .next
npm run build
```

---

## Mejores Prácticas

### Código

1. **TypeScript**: Usa tipos explícitos cuando sea posible
2. **Componentes**: Componentes pequeños y reutilizables
3. **Hooks**: Custom hooks para lógica compartida
4. **Nombres**: Nombres descriptivos y consistentes
5. **Comentarios**: Documenta código complejo

### Git

1. **Commits**: Mensajes descriptivos
2. **Branches**: Nombres claros (ej: `feat/nueva-funcionalidad`)
3. **Pull Requests**: Descripciones claras de cambios

### Performance

1. **Imágenes**: Usa Next.js Image component
2. **Código**: Code splitting automático con Next.js
3. **APIs**: Cachea respuestas cuando sea posible
4. **Bundle**: Revisa el tamaño del bundle

---

## Debugging

### Navegador

- Usa las herramientas de desarrollo (F12)
- Revisa la consola para errores
- Usa React DevTools para inspeccionar componentes

### Servidor

- Revisa los logs en la terminal
- Usa `console.log()` para debugging (quítalos antes de commit)
- Revisa logs en Railway para producción

### API

- Usa herramientas como Postman o Insomnia
- Revisa Network tab en DevTools
- Verifica respuestas de API

---

## Recursos Adicionales

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- Documentación de integraciones en `docs/INTEGRACIONES.md`

