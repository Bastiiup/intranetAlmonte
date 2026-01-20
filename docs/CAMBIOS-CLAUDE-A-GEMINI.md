# 🔄 Cambios: Claude → Google Gemini

## ✅ Cambios Realizados

Se ha cambiado la implementación de **Claude API** a **Google Gemini** porque:
- ✅ **GRATIS** para uso general
- ✅ Sin tarjeta de crédito requerida
- ✅ Límites generosos (1,500 solicitudes/día)
- ✅ Perfecto para pruebas y desarrollo

---

## 📦 Dependencias

### ❌ Removida
- `@anthropic-ai/sdk` (ya no se usa)

### ✅ Instalada
- `@google/generative-ai` (SDK de Gemini)

---

## 🔧 Archivos Modificados

### 1. API de Extracción
**Archivo:** `src/app/api/crm/listas/[id]/extract-pdf/route.ts`

**Cambios:**
- Cambiado de `@anthropic-ai/sdk` a `@google/generative-ai`
- Cambiado de `ANTHROPIC_API_KEY` a `GEMINI_API_KEY`
- Cambiado modelo de `claude-3-5-sonnet-20241022` a `gemini-1.5-flash`
- Actualizado método de llamada a la API

### 2. Documentación
- ✅ `COMO-OBTENER-API-KEY-GEMINI.md` - Nueva guía
- ✅ `docs/CONFIGURACION.md` - Actualizado
- ✅ `RESUMEN-CONFIGURACION-COMPLETA.md` - Actualizado
- ✅ `RESUMEN-IMPLEMENTACION-EXTRACCION-PDF.md` - Actualizado
- ✅ `INSTRUCCIONES-EXTRACCION-PDF.md` - Actualizado

---

## 🔐 Nueva Variable de Entorno

### Antes (Claude)
```env
ANTHROPIC_API_KEY=sk-ant-api03-...
```

### Ahora (Gemini)
```env
GEMINI_API_KEY=AIzaSy-...
```

---

## 🚀 Cómo Obtener la API Key

1. Ve a: **https://aistudio.google.com/**
2. Inicia sesión con tu cuenta de Google
3. Ve a **"Get API key"** o directamente: **https://aistudio.google.com/app/apikey**
4. Haz clic en **"Create API Key"**
5. Copia la key (empieza con `AIzaSy-...`)
6. Agrega a `.env.local`:
   ```env
   GEMINI_API_KEY=AIzaSy-tu-key-aqui
   ```

**📖 Guía completa:** Ver `COMO-OBTENER-API-KEY-GEMINI.md`

---

## 💰 Comparación de Costos

| Característica | Claude | Gemini |
|----------------|--------|--------|
| **Costo** | ~$0.01-0.05 por PDF | ✅ **GRATIS** |
| **Límite diario** | Basado en tokens | 1,500 solicitudes |
| **Tarjeta de crédito** | Requerida | ❌ No requerida |
| **Ideal para** | Producción | Desarrollo/Pruebas |

---

## ✅ Ventajas de Gemini

1. **Gratis** - Sin costos iniciales
2. **Fácil de configurar** - Solo necesitas cuenta de Google
3. **Límites generosos** - 1,500 solicitudes/día es suficiente para pruebas
4. **Rápido** - Gemini Flash es muy veloz
5. **Bueno con documentos** - Excelente para extraer datos estructurados

---

## 🔄 Migración

Si ya tenías configurada `ANTHROPIC_API_KEY`:

1. **Obtener nueva key de Gemini** (gratis)
2. **Reemplazar en `.env.local`:**
   ```env
   # Comentar o eliminar
   # ANTHROPIC_API_KEY=sk-ant-api03-...
   
   # Agregar nueva
   GEMINI_API_KEY=AIzaSy-...
   ```
3. **Reiniciar servidor**

---

## 📝 Notas

- El código está completamente actualizado
- No se necesita cambiar nada más
- La funcionalidad es idéntica, solo cambia el proveedor de IA
- Puedes volver a Claude en el futuro si lo necesitas (solo cambiar la variable)

---

**✅ Cambio completado!** Ahora usa Gemini (gratis) en lugar de Claude. 🎉



