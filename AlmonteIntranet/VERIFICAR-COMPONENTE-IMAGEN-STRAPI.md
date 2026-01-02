# Verificar Estructura del Componente contacto.imagen en Strapi

## ✅ Estructura del Componente Verificada

El componente `contacto.imagen` tiene la siguiente estructura:

### Campos del Componente:

- **`imagen`** (Multiple Media) - Array de archivos de imagen
- **`tipo`** (Enumeration) - Tipo de imagen
- **`formato`** (Enumeration) - Formato de la imagen
- **`estado`** (Enumeration) - Estado de la imagen
- **`vigente_hasta`** (Date) - Fecha de vigencia
- **`status`** (Boolean) - Estado activo/inactivo

### Estructura para Actualizar:

El componente se actualiza con esta estructura:

```json
{
  "imagen": [2697],  // Array de IDs (Multiple Media)
  "tipo": "...",
  "formato": "...",
  "estado": "...",
  "vigente_hasta": "2024-12-31",
  "status": true
}
```

O simplemente:

```json
{
  "imagen": [2697]  // Solo el array de IDs
}
```

### Cómo probar:

1. **En Strapi Admin:**
   - Ve a **Content Manager** → **Persona**
   - Edita una persona
   - Agrega una imagen al campo `imagen`
   - Guarda
   - Abre las herramientas de desarrollador (F12) → Network
   - Busca la petición PUT a `/api/personas/[id]`
   - Revisa el body de la petición para ver la estructura exacta

2. **O usa este comando en la consola del navegador (en Strapi Admin):**
   ```javascript
   // Obtener una persona con imagen
   fetch('/api/personas?populate[imagen][populate]=*&pagination[pageSize]=1')
     .then(r => r.json())
     .then(data => console.log('Estructura imagen:', JSON.stringify(data.data[0].attributes.imagen, null, 2)))
   ```

### Una vez que conozcas la estructura:

Comparte la estructura encontrada y actualizaré el código para usar la estructura correcta.

---

## 🔧 Alternativa: Cambiar componente a relación Media directa

Si prefieres, puedes cambiar el campo `imagen` en Persona de componente a una relación Media directa:

1. Ve a **Content-Type Builder** → **Persona**
2. Elimina el campo `imagen` (componente)
3. Agrega un nuevo campo `imagen` de tipo **Media** (single)
4. Guarda

Esto haría que la actualización funcione directamente con el ID del archivo, sin necesidad de estructura de componente.

---

**Nota:** El código actual intenta automáticamente diferentes estructuras, pero si ninguna funciona, necesitamos conocer la estructura exacta del componente.

