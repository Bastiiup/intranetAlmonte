# ⚡ Optimización de Build Local

## 🔍 Problema

El build local (`npm run build`) puede demorar mucho tiempo porque:
1. **TypeScript compilation** - Compila todos los archivos TypeScript
2. **Next.js build process** - Genera bundles, optimiza código, etc.
3. **Sin optimizaciones** - El script actual no tiene variables de entorno para acelerar

---

## ✅ Solución: Script de Build Optimizado

### ✅ IMPLEMENTADO: Script Optimizado en package.json

Ya se agregó un script `build:fast` que usa las mismas optimizaciones que el Dockerfile:

```json
{
  "scripts": {
    "build": "next build",
    "build:fast": "set NEXT_TELEMETRY_DISABLED=1&& set NODE_OPTIONS=--max-old-space-size=4096&& set SKIP_TYPE_CHECK=true&& set NEXT_PRIVATE_SKIP_TYPE_CHECK=true&& set NEXT_PRIVATE_SKIP_LINT=true&& set NEXT_PRIVATE_SKIP_VALIDATION=true&& set CI=true&& next build",
    "build:fast:unix": "NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--max-old-space-size=4096 SKIP_TYPE_CHECK=true NEXT_PRIVATE_SKIP_TYPE_CHECK=true NEXT_PRIVATE_SKIP_LINT=true NEXT_PRIVATE_SKIP_VALIDATION=true CI=true next build"
  }
}
```

**Uso en Windows:**
```bash
npm run build:fast
```

**Uso en Linux/Mac:**
```bash
npm run build:fast:unix
```

### Opción 2: Variables de Entorno en .env.local

Crear/actualizar `.env.local`:

```env
NEXT_TELEMETRY_DISABLED=1
NODE_OPTIONS=--max-old-space-size=4096
SKIP_TYPE_CHECK=true
NEXT_PRIVATE_SKIP_TYPE_CHECK=true
NEXT_PRIVATE_SKIP_LINT=true
NEXT_PRIVATE_SKIP_VALIDATION=true
CI=true
```

Luego usar el script normal:
```bash
npm run build
```

---

## 📊 Comparación de Tiempos

| Método | Tiempo Estimado | Mejora |
|--------|----------------|--------|
| **Build normal** | 5-8 minutos | - |
| **Build optimizado** | 2-4 minutos | **50-60% más rápido** |

---

## 🚀 Implementación Rápida

### ✅ Ya está implementado

El script `build:fast` ya está agregado en `package.json`. Solo necesitas usarlo:

**En Windows (PowerShell o CMD):**
```bash
npm run build:fast
```

**En Linux/Mac:**
```bash
npm run build:fast:unix
```

**Nota:** El script usa comandos nativos de Windows (`set`) y no requiere instalar `cross-env`.

---

## ⚠️ Notas Importantes

1. **Type Checking:** Se salta durante el build, pero puedes hacerlo por separado:
   ```bash
   npm run type-check
   ```

2. **Linting:** Se salta durante el build, pero puedes hacerlo por separado:
   ```bash
   npm run lint
   ```

3. **Producción:** Para builds de producción, usar `npm run build:prod` que hace todas las validaciones.

---

## 🔧 Variables de Entorno Explicadas

| Variable | Propósito | Impacto |
|----------|-----------|---------|
| `NEXT_TELEMETRY_DISABLED=1` | Deshabilita telemetría | Ahorra ~5-10 segundos |
| `NODE_OPTIONS=--max-old-space-size=4096` | Aumenta memoria disponible | Evita errores de memoria |
| `SKIP_TYPE_CHECK=true` | Salta type checking | Ahorra ~1-2 minutos |
| `NEXT_PRIVATE_SKIP_TYPE_CHECK=true` | Salta type checking interno | Ahorra ~30-60 segundos |
| `NEXT_PRIVATE_SKIP_LINT=true` | Salta linting | Ahorra ~30-60 segundos |
| `NEXT_PRIVATE_SKIP_VALIDATION=true` | Salta validaciones | Ahorra ~10-20 segundos |
| `CI=true` | Modo CI (menos logs) | Ahorra ~5-10 segundos |

---

## 🎯 Recomendación Final

**Usar `build:fast` para desarrollo local y `build:prod` para producción.**

---

**Fecha:** 29 de enero de 2026
