# Prompt para Cursor de Strapi - Copiar y Pegar

## 📋 Copia este prompt completo y pásaselo a Cursor de Strapi:

```
Necesito agregar los siguientes campos a la entidad Persona (api::persona.persona) para habilitar la personalización de perfil de colaboradores en la intranet.

Agrega estos campos (todos opcionales):

1. **bio** (Text)
   - Tipo: text
   - Opcional: Sí
   - Descripción: Biografía o descripción personal

2. **job_title** (String)
   - Tipo: string
   - Opcional: Sí
   - Descripción: Cargo o título profesional

3. **telefono_principal** (String)
   - Tipo: string
   - Opcional: Sí
   - Descripción: Teléfono principal del colaborador

4. **direccion** (JSON)
   - Tipo: json
   - Opcional: Sí
   - Descripción: Información de dirección completa
   - Estructura: { line1, line2, city, state, zipcode, country }

5. **redes_sociales** (JSON)
   - Tipo: json
   - Opcional: Sí
   - Descripción: Enlaces a redes sociales
   - Estructura: { facebook, twitter, instagram, linkedin, github, skype }

6. **skills** (JSON)
   - Tipo: json
   - Opcional: Sí
   - Descripción: Habilidades del colaborador
   - Estructura: Array de strings ["React.js", "Next.js", etc.]

IMPORTANTE:
- Todos los campos deben ser OPCIONALES
- Si JSON no está disponible en tu versión de Strapi, usa campos text separados o componentes
- Estos campos son solo para uso interno de la intranet
- No afectan otros sistemas existentes

Después de agregar, verifica que los campos aparecen en Content-Type Builder y son editables en Content Manager.
```

---

## 🔄 Alternativa si JSON no está disponible:

Si tu versión de Strapi no soporta campos JSON, usa esta versión alternativa:

```
Necesito agregar los siguientes campos a la entidad Persona (api::persona.persona) para habilitar la personalización de perfil de colaboradores.

Agrega estos campos (todos opcionales, tipo string o text):

1. **bio** (Text) - Biografía personal
2. **job_title** (String) - Cargo o título profesional
3. **telefono_principal** (String) - Teléfono principal
4. **direccion_line1** (String) - Dirección línea 1
5. **direccion_line2** (String) - Dirección línea 2
6. **direccion_city** (String) - Ciudad
7. **direccion_state** (String) - Región/Provincia
8. **direccion_zipcode** (String) - Código Postal
9. **direccion_country** (String) - País
10. **redes_facebook** (String) - URL Facebook
11. **redes_twitter** (String) - Twitter/X
12. **redes_instagram** (String) - URL Instagram
13. **redes_linkedin** (String) - URL LinkedIn
14. **redes_github** (String) - GitHub
15. **redes_skype** (String) - Skype
16. **skills** (Text) - Habilidades separadas por comas

Todos los campos deben ser OPCIONALES.
```

---

## ✅ Verificación después de agregar:

1. Ve a Strapi Admin → Content-Type Builder → Persona
2. Verifica que los campos aparecen en la lista
3. Ve a Content Manager → Persona → Edita una persona
4. Verifica que los campos son editables
5. Prueba actualizar un perfil desde la intranet

---

**Nota:** El código ya está preparado para manejar ambos casos (JSON o campos separados), así que funcionará independientemente de qué opción elijas.

