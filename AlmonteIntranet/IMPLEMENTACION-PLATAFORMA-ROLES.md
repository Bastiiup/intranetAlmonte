# Implementación de Control de Plataforma por Rol

## 📋 Resumen

Se ha implementado un sistema de control de acceso basado en plataforma para los colaboradores de la intranet. Los colaboradores pueden tener asignada una plataforma específica (`moraleja`, `escolar`) o `general` (puede ver ambas plataformas).

## ✅ Cambios Implementados

### 1. Tipos y Interfaces

- **`src/lib/auth.ts`**: Agregado campo `plataforma?: 'moraleja' | 'escolar' | 'general'` a `AuthColaborador`
- **`src/hooks/useAuth.ts`**: Agregado campo `plataforma` a `ColaboradorData`
- **`src/hooks/usePlatform.ts`**: Nuevo hook para obtener y verificar plataforma del colaborador

### 2. Autenticación

- **`src/app/api/auth/login/route.ts`**: Modificado para incluir `plataforma` en la cookie del colaborador
- **`src/lib/auth.ts`**: Actualizado `setAuth` para incluir plataforma en cookies

### 3. Componentes UI

- **`src/components/AppLogo.tsx`**: Modificado para mostrar logo según plataforma (preparado para logos específicos)

### 4. Helpers de Plataforma

- **`src/lib/platform/filters.ts`**: Helpers para filtrar datos por plataforma
  - `getPlatformFilter()`: Genera filtros de Strapi
  - `filterByPlatform()`: Filtra arrays en el cliente
  - `getWooCommercePlatformParam()`: Obtiene parámetro para APIs de WooCommerce
  - `canViewItem()`: Verifica si un item es accesible

- **`src/lib/platform/server.ts`**: Helpers para servidor
  - `getServerPlatform()`: Obtiene plataforma desde cookies (servidor)
  - `getServerColaborador()`: Obtiene colaborador completo desde cookies

### 5. API Routes - Filtrado Automático

- **`src/app/api/tienda/productos/route.ts`**: Filtra productos por plataforma
- **`src/app/api/tienda/pedidos/route.ts`**: Filtra pedidos por plataforma
- **`src/app/api/woocommerce/customers/route.ts`**: Filtra clientes por plataforma usando el cliente de WooCommerce correspondiente

## 🔧 Configuración Requerida en Strapi

### Paso 1: Agregar Campo `plataforma` al Content Type `intranet-colaboradores`

1. Ir a **Content-Type Builder** en Strapi
2. Seleccionar **`intranet-colaboradores`** (Intranet · Colaboradores)
3. Agregar nuevo campo:
   - **Tipo**: `Enumeration`
   - **Nombre**: `plataforma`
   - **Valores**:
     - `moraleja`
     - `escolar`
     - `general`
   - **Default**: `general`
   - **Requerido**: No (opcional, por defecto será `general`)

### Paso 2: Actualizar Colaboradores Existentes

Para cada colaborador en Strapi, asignar la plataforma correspondiente:
- **Moraleja**: Colaboradores que solo trabajan con Editorial Moraleja
- **Escolar**: Colaboradores que solo trabajan con Librería Escolar
- **General**: Colaboradores que pueden ver ambas plataformas (supervisores, admins, etc.)

## 🎯 Comportamiento

### Colaborador con Plataforma Específica (`moraleja` o `escolar`)

- Solo puede ver productos/pedidos/clientes de su plataforma
- El logo mostrado corresponde a su plataforma (cuando se agreguen logos específicos)
- Las API routes filtran automáticamente los datos

### Colaborador con Plataforma `general`

- Puede ver productos/pedidos/clientes de ambas plataformas
- Comportamiento igual al actual (sin restricciones)
- El logo mostrado es el general (actual)

## 📝 Notas Importantes

1. **Campo en Strapi**: El campo `plataforma` debe agregarse manualmente en Strapi antes de que el sistema funcione completamente.

2. **Logos Específicos**: El componente `AppLogo` está preparado para mostrar logos específicos por plataforma. Para activarlo:
   - Agregar logos en `src/assets/images/`:
     - `logo-moraleja.png` / `logo-moraleja-black.png`
     - `logo-escolar.png` / `logo-escolar-black.png`
   - Descomentar la lógica en `AppLogo.tsx`

3. **Filtrado en Strapi**: Los filtros se aplican tanto en la query de Strapi como en el cliente (doble verificación) para mayor seguridad.

4. **Compatibilidad**: Si un colaborador no tiene `plataforma` definida, se asume `general` (puede ver todo).

## 🚀 Próximos Pasos

1. ✅ Agregar campo `plataforma` en Strapi
2. ✅ Asignar plataformas a colaboradores existentes
3. ⏳ Agregar logos específicos por plataforma (opcional)
4. ⏳ Probar el filtrado en cada módulo (productos, pedidos, clientes)

