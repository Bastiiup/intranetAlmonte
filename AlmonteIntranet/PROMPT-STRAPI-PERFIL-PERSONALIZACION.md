# Prompt para Strapi: Personalización de Perfil de Colaboradores

## 📋 Instrucciones para Cursor de Strapi

Necesito agregar los siguientes campos a la entidad **Persona** (`api::persona.persona`) para habilitar la personalización de perfil de colaboradores:

### Campos a Agregar:

1. **`bio`** (Text)
   - Tipo: `text`
   - Opcional: Sí
   - Descripción: Biografía o descripción personal del colaborador

2. **`job_title`** (String)
   - Tipo: `string`
   - Opcional: Sí
   - Descripción: Cargo o título profesional (ej: "Desarrollador UI", "Diseñador")

3. **`telefono_principal`** (String)
   - Tipo: `string`
   - Opcional: Sí
   - Descripción: Teléfono principal del colaborador (campo temporal para facilitar la edición)

4. **`direccion`** (JSON)
   - Tipo: `json`
   - Opcional: Sí
   - Descripción: Información de dirección completa del colaborador
   - Estructura esperada:
     ```json
     {
       "line1": "Calle, Número",
       "line2": "Apartamento, Unidad (opcional)",
       "city": "Ciudad",
       "state": "Región/Provincia",
       "zipcode": "Código Postal",
       "country": "País"
     }
     ```

5. **`redes_sociales`** (JSON)
   - Tipo: `json`
   - Opcional: Sí
   - Descripción: Enlaces a redes sociales del colaborador
   - Estructura esperada:
     ```json
     {
       "facebook": "https://facebook.com/usuario",
       "twitter": "@usuario o URL completa",
       "instagram": "https://instagram.com/usuario",
       "linkedin": "https://linkedin.com/in/usuario",
       "github": "usuario o URL completa",
       "skype": "@usuario"
     }
     ```

6. **`skills`** (JSON)
   - Tipo: `json`
   - Opcional: Sí
   - Descripción: Habilidades o competencias del colaborador
   - Estructura esperada: Array de strings
     ```json
     ["React.js", "Next.js", "TypeScript", "UI/UX Design"]
     ```
   - Alternativa: Puede ser un campo `text` separado por comas si prefieres

### Notas Importantes:

- Todos los campos deben ser **opcionales** (no requeridos)
- El campo `direccion` y `redes_sociales` deben ser de tipo **JSON** para almacenar objetos estructurados
- El campo `skills` puede ser JSON (array) o text (separado por comas) según prefieras
- Estos campos son para uso interno de la intranet y no afectan otros sistemas

### Ubicación en Strapi:

- Content-Type: `api::persona.persona`
- Ruta en Strapi Admin: Content-Type Builder → Persona → Add another field

### Verificación:

Después de agregar los campos, verifica que:
1. Los campos aparecen en el Content-Type Builder
2. Los campos son editables en el Content Manager
3. Los campos se pueden poblar mediante la API
4. Los permisos están configurados para que los usuarios autenticados puedan actualizar su propio perfil

---

## 🔧 Alternativa: Si JSON no está disponible

Si Strapi no permite campos JSON directamente, puedes usar campos `text` y almacenar JSON como string, o crear componentes personalizados:

### Opción 1: Campos Text separados
- `direccion_line1` (string)
- `direccion_line2` (string)
- `direccion_city` (string)
- `direccion_state` (string)
- `direccion_zipcode` (string)
- `direccion_country` (string)
- `redes_facebook` (string)
- `redes_twitter` (string)
- `redes_instagram` (string)
- `redes_linkedin` (string)
- `redes_github` (string)
- `redes_skype` (string)
- `skills` (text) - separado por comas

### Opción 2: Componentes Strapi
Crear componentes reutilizables:
- `perfil.direccion` (componente)
- `perfil.red-social` (componente repeatable)
- `perfil.skill` (componente repeatable)

---

**Fecha de creación:** Diciembre 2024  
**Versión:** 1.0

