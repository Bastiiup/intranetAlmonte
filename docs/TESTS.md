# Tests del Proyecto

Este documento describe la estructura y estado de las pruebas en el proyecto.

## 📊 Resumen de Tests

El proyecto tiene **25 archivos de tests** organizados en:

- **16 archivos `.test.ts`** - Tests unitarios e integración (TypeScript)
- **7 archivos `.test.tsx`** - Tests de componentes React
- **2 archivos `.spec.ts`** - Tests end-to-end (E2E) con Playwright

## 🏗️ Estructura de Tests

### Tests Unitarios

Los tests unitarios están organizados por módulo:

#### Shipit (`src/lib/shipit/__tests__/`)
- `communes.unit.test.ts` - Tests para mapeo de comunas chilenas
- `config.unit.test.ts` - Tests para configuración de Shipit
- `utils.unit.test.ts` - Tests para utilidades de Shipit

#### WooCommerce (`src/lib/woocommerce/__tests__/`)
- `address-utils.unit.test.ts` - Tests para utilidades de direcciones

#### OpenFactura (`src/lib/openfactura/__tests__/`)
- `client.unit.test.ts` - Tests para cliente de OpenFactura

#### Chat API (`src/lib/api/chat/__tests__/`)
- `validators.unit.test.ts` - Tests para validadores
- `services.unit.test.ts` - Tests para servicios

#### API Utils (`src/lib/api/__tests__/`)
- `utils.unit.test.ts` - Tests para utilidades de API

### Tests de Componentes React

Tests de componentes en `src/app/(admin)/(apps)/(ecommerce)/`:

#### Orders Components
- `OrdersList.unit.test.tsx` - Tests para lista de pedidos
- `OrderSummary.unit.test.tsx` - Tests para resumen de pedido
- `CustomerDetails.unit.test.tsx` - Tests para detalles de cliente
- `BillingDetails.unit.test.tsx` - Tests para detalles de facturación
- `ShippingAddress.unit.test.tsx` - Tests para dirección de envío
- `ShippingActivity.unit.test.tsx` - Tests para actividad de envío

#### Product Components
- `RelationSelector.unit.test.tsx` - Tests para selector de relaciones

### Tests de Integración

Tests de integración para API routes:

#### Tienda API
- `src/app/api/tienda/pedidos/__tests__/route.integration.test.ts`
- `src/app/api/tienda/etiquetas/__tests__/route.integration.test.ts`
- `src/app/api/tienda/etiquetas/[id]/__tests__/route.integration.test.ts`
- `src/app/api/tienda/categorias/__tests__/route.integration.test.ts`
- `src/app/api/tienda/categorias/[id]/__tests__/route.integration.test.ts`

#### WooCommerce API
- `src/app/api/woocommerce/orders/[id]/__tests__/route.integration.test.ts`
- `src/app/api/woocommerce/customers/[id]/__tests__/route.integration.test.ts`

#### Chat API
- `src/app/api/chat/mensajes/__tests__/route.integration.test.ts`

### Tests E2E (End-to-End)

Tests E2E con Playwright:
- `e2e/health.spec.ts` - Tests de healthcheck
- `e2e/chat.spec.ts` - Tests del sistema de chat

## 🔧 Configuración

### Jest

**Archivo:** `jest.config.js`

- Configurado con Next.js Jest
- Test environment: Node.js (por defecto)
- Module mapper para `@/` alias
- Coverage configurado

### Jest Setup

**Archivo:** `jest.setup.js`

- Mock de Next.js router
- Mock de `window.matchMedia`
- Mock de `localStorage`
- Mock de `fetch`
- Polyfills para Node.js

### Scripts Disponibles

```bash
npm test                 # Ejecutar todos los tests
npm run test:watch      # Tests en modo watch
npm run test:coverage   # Tests con cobertura
npm run test:unit       # Solo tests unitarios
npm run test:integration # Solo tests de integración
npm run test:e2e        # Tests E2E (Playwright)
```

## 📝 Ejecutar Tests

### Prerrequisitos

1. Instalar dependencias:
```bash
cd AlmonteIntranet
npm install
```

2. Configurar variables de entorno (opcional, algunos tests pueden requerirlas):
```bash
# Crear .env.test.local si es necesario
```

### Ejecutar Todos los Tests

```bash
npm test
```

### Ejecutar Tests Unitarios Solo

```bash
npm run test:unit
```

### Ejecutar Tests de Integración Solo

```bash
npm run test:integration
```

### Ejecutar Tests E2E

```bash
npm run test:e2e
```

### Ejecutar Tests con Cobertura

```bash
npm run test:coverage
```

Esto generará un reporte de cobertura en `coverage/`.

## 📋 Ejemplos de Tests

### Test Unitario (Shipit - Communes)

```typescript
describe('communes', () => {
  describe('getCommuneId', () => {
    it('debe retornar el ID correcto para comunas conocidas', () => {
      expect(getCommuneId('LAS CONDES')).toBe(308)
      expect(getCommuneId('SANTIAGO')).toBe(131)
    })
  })
})
```

### Test de Componente React

```typescript
describe('OrdersList', () => {
  it('debe renderizar correctamente', () => {
    render(<OrdersList />)
    expect(screen.getByText('Pedidos')).toBeInTheDocument()
  })
})
```

## 🔍 Troubleshooting

### Error: "Cannot find module"

- Asegúrate de que `node_modules` esté instalado: `npm install`
- Verifica que las dependencias de desarrollo estén instaladas

### Error: "Jest encountered an unexpected token"

- Verifica la configuración de `jest.config.js`
- Asegúrate de que `tsconfig.json` esté correctamente configurado

### Tests fallan por variables de entorno

- Algunos tests pueden requerir variables de entorno mockeadas
- Revisa `jest.setup.js` para ver qué mocks están configurados

### Tests E2E no funcionan

- Asegúrate de que Playwright esté instalado: `npx playwright install`
- Verifica que la aplicación esté corriendo en desarrollo

## 📚 Referencias

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/)
- [Playwright Documentation](https://playwright.dev/)
- [Next.js Testing](https://nextjs.org/docs/testing)

