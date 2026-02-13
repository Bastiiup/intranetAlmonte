# Configuración de Gemini AI para Procesamiento de PDFs

## 📋 Descripción

Esta funcionalidad utiliza Google Gemini AI para procesar PDFs de listas de útiles escolares y extraer automáticamente los productos/materiales mencionados en el documento.

## 🔑 Configuración de API Key

### Opción 1: Variable de Entorno (Recomendado)

Agregar la siguiente variable en tu archivo `.env.local`:

```env
GEMINI_API_KEY=tu_api_key_aqui
```

### Opción 2: Fallback en Código

Si no se encuentra la variable de entorno, el código usa un fallback con la API key proporcionada. **Nota:** Esto no es recomendado para producción.

## 📍 Ubicación en el Código

- **API Route:** `src/app/api/crm/listas/[id]/procesar-pdf/route.ts`
- **Componente:** `src/app/(admin)/(apps)/crm/listas/[id]/validacion/components/ValidacionLista.tsx`

## 🚀 Uso

1. Navegar a la página de validación de una lista: `/crm/listas/[id]/validacion`
2. Hacer clic en el botón **"Procesar con IA"** en la sección del PDF
3. El sistema enviará el PDF a Gemini AI para extracción de productos
4. Los productos extraídos se mostrarán automáticamente en la tabla de la izquierda
5. Los productos se guardan en Strapi en el campo `materiales` de la versión más reciente

## 🔧 Modelo de Gemini Utilizado

- **Modelo:** `gemini-1.5-pro`
- **Capacidad:** Procesamiento de PDFs y extracción de datos estructurados

## 📊 Formato de Datos Extraídos

Los productos extraídos incluyen:

```json
{
  "productos": [
    {
      "nombre": "Nombre del producto",
      "isbn": "ISBN o código",
      "marca": "Marca o editorial",
      "cantidad": 1,
      "comprar": true,
      "precio": 0,
      "asignatura": "Asignatura",
      "descripcion": "Descripción opcional"
    }
  ]
}
```

## ⚠️ Notas Importantes

1. **API Key Sensible:** La API key no debe estar en el código fuente. Usar variables de entorno.
2. **Límites de API:** Verificar los límites de uso de la API de Gemini en tu cuenta de Google Cloud.
3. **Costo:** El procesamiento de PDFs con Gemini puede tener costos asociados según el plan de Google Cloud.
4. **Tiempo de Procesamiento:** El procesamiento puede tardar varios segundos dependiendo del tamaño del PDF.

## 🐛 Troubleshooting

### Error: "API key not found"
- Verificar que `GEMINI_API_KEY` esté en `.env.local`
- Reiniciar el servidor de desarrollo después de agregar la variable

### Error: "Failed to process PDF"
- Verificar que el PDF sea válido y accesible
- Revisar los logs del servidor para más detalles
- Verificar que la API key tenga permisos para usar Gemini API

### Productos no se extraen correctamente
- El PDF debe tener texto legible (no solo imágenes)
- Verificar que el formato del PDF sea compatible
- Revisar la respuesta de Gemini en los logs del servidor

## 📝 Actualización de API Key

Si necesitas cambiar la API key:

1. Actualizar `.env.local` con la nueva key
2. Reiniciar el servidor de desarrollo
3. En producción, actualizar la variable de entorno en la plataforma de hosting

---

**Configurado por:** Sistema automatizado  
**Estado:** ✅ Configurado  
**API Key:** Configurada (fallback disponible)
