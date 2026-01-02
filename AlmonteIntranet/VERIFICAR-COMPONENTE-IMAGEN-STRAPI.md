# Verificar Estructura del Componente contacto.imagen en Strapi

## 🔍 Cómo verificar la estructura del componente

Para que la actualización de foto de perfil funcione correctamente, necesitamos conocer la estructura exacta del componente `contacto.imagen`.

### Pasos para verificar:

1. **Ve a Strapi Admin** → **Content-Type Builder** → **Components**
2. **Busca el componente** `contacto.imagen` (o `contacto` → `imagen`)
3. **Revisa los campos del componente:**
   - ¿Tiene un campo `file` de tipo Media?
   - ¿Tiene otros campos además de `file`?
   - ¿Cuál es el nombre exacto del campo que almacena el archivo?

### Estructuras posibles:

El componente `contacto.imagen` puede tener estas estructuras:

**Opción 1: Campo `file` directo**
```json
{
  "imagen": {
    "file": 2697  // ID del archivo
  }
}
```

**Opción 2: Campo `file` con objeto**
```json
{
  "imagen": {
    "file": {
      "id": 2697
    }
  }
}
```

**Opción 3: Campo con otro nombre**
```json
{
  "imagen": {
    "archivo": 2697
  }
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

