# Instrucciones para Crear Content-Type "Lead" en Strapi

## Opción 1: Usar Strapi Admin (Recomendado)

1. **Accede a Strapi Admin:**
   - Ve a `https://strapi.moraleja.cl/admin` (o tu URL de Strapi)

2. **Crear Content-Type:**
   - Ve a **Content-Type Builder** (en el menú lateral)
   - Haz clic en **"+ Create new collection type"**
   - Nombre: **"Lead"** (singular)
   - API ID se generará automáticamente: `api::lead.lead`
   - Haz clic en **"Continue"**

3. **Agregar Campos:**
   
   **Campos Básicos:**
   - `nombre` - Text (Required: ✅)
   - `email` - Email
   - `telefono` - Text
   - `empresa` - Text
   - `monto_estimado` - Number (Decimal, Min: 0)
   - `etiqueta` - Enumeration (Required: ✅, Default: "baja")
     - Valores: `baja`, `media`, `alta`
   - `estado` - Enumeration (Required: ✅, Default: "in-progress")
     - Valores: `in-progress`, `proposal-sent`, `follow-up`, `pending`, `negotiation`, `rejected`
   - `fuente` - Text (Default: "Manual")
   - `fecha_creacion` - Date
   - `activo` - Boolean (Required: ✅, Default: true)
   - `notas` - Rich Text
   - `fecha_proximo_seguimiento` - DateTime

   **Relaciones:**
   - `asignado_a` - Relation (manyToOne) → **Intranet-colaboradores**
   - `relacionado_con_persona` - Relation (manyToOne) → **Persona**
   - `relacionado_con_colegio` - Relation (manyToOne) → **Colegio**

4. **Guardar:**
   - Haz clic en **"Save"**
   - Espera a que Strapi compile los cambios

5. **Configurar Permisos:**
   - Ve a **Settings** → **Roles** → **Public** (o el rol que uses)
   - En la sección **"Lead"**, habilita:
     - ✅ find
     - ✅ findOne
     - ✅ create
     - ✅ update
     - ✅ delete
   - Haz clic en **"Save"**

---

## Opción 2: Copiar Archivos Manualmente (Avanzado)

Si prefieres crear los archivos directamente en el código:

1. **Clonar o acceder al repositorio de Strapi:**
   ```bash
   git clone https://github.com/Zenn-Dev99/BdEstructura.git
   cd BdEstructura
   git checkout etiquetas-gonza
   ```

2. **Crear estructura de directorios:**
   ```bash
   mkdir -p strapi/src/api/lead/content-types/lead
   mkdir -p strapi/src/api/lead/controllers
   mkdir -p strapi/src/api/lead/services
   mkdir -p strapi/src/api/lead/routes
   ```

3. **Copiar archivos:**
   - `strapi-files/lead-schema.json` → `strapi/src/api/lead/content-types/lead/schema.json`
   - `strapi-files/lead-controller.ts` → `strapi/src/api/lead/controllers/lead.ts`
   - `strapi-files/lead-service.ts` → `strapi/src/api/lead/services/lead.ts`
   - `strapi-files/lead-routes.ts` → `strapi/src/api/lead/routes/lead.ts`

4. **Compilar y reiniciar:**
   ```bash
   cd strapi
   npm run build
   npm run develop
   ```

---

## Opción 3: Usar Prompt con IA

1. Abre el archivo `PROMPT-CREAR-LEAD-STRAPI.md`
2. Copia todo el contenido
3. Úsalo con Cursor/Claude/ChatGPT en el proyecto de Strapi
4. La IA creará el content-type automáticamente

---

## Verificación

Después de crear el content-type:

1. **Verificar en Strapi Admin:**
   - Ve a **Content Manager**
   - Deberías ver **"Lead"** en la lista de content-types
   - Haz clic en **"Lead"** → Deberías poder crear un lead de prueba

2. **Verificar en el Frontend:**
   - Ve a `/crm/leads` en el frontend
   - No debería aparecer el mensaje de error "El content-type 'Lead' no existe"
   - Deberías poder crear leads desde el frontend

3. **Probar API directamente:**
   ```bash
   curl -X GET "https://strapi.moraleja.cl/api/leads" \
     -H "Authorization: Bearer TU_TOKEN"
   ```
   Debería retornar un array vacío `{"data":[]}` si no hay leads, o un error 404 si el content-type no existe.

---

## Troubleshooting

### Error: "Content-type not found"
- Verifica que el content-type se creó correctamente
- Verifica que los permisos están configurados
- Reinicia Strapi si es necesario

### Error: "Permission denied"
- Ve a Settings → Roles → Public
- Habilita todos los permisos para "Lead"

### Error de TypeScript en factories
- Los archivos ya incluyen `as any` para evitar errores de TypeScript
- Esto es normal en Strapi v5 cuando se crean content-types nuevos

---

## Archivos Creados

He creado los siguientes archivos en la carpeta `strapi-files/`:

- `strapi-files/lead-schema.json` - Schema completo del content-type
- `strapi-files/lead-controller.ts` - Controller
- `strapi-files/lead-service.ts` - Service
- `strapi-files/lead-routes.ts` - Routes

**Nota:** Estos archivos están en `strapi-files/` para evitar que Next.js intente compilarlos. Puedes copiar estos archivos al proyecto de Strapi o usar Strapi Admin para crear el content-type manualmente.
