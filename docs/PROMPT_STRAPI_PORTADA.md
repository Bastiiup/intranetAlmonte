# Prompt para agregar campo Portada en Strapi

## Contexto
Necesito agregar un campo `portada` en el Content Type "Persona" de Strapi para permitir que los colaboradores puedan personalizar la imagen de portada de su perfil en la intranet.

## Estructura actual
El Content Type "Persona" ya tiene un campo `imagen` que es un Component (probablemente `contacto.imagen`). Este componente tiene una estructura similar a:
- `imagen`: Campo Multiple Media (array de archivos)
- Otros campos opcionales como `tipo`, `formato`, `estado`, `vigente_hasta`, `status`

## Requerimiento
Agregar un nuevo campo `portada` en el Content Type "Persona" con la misma estructura que el campo `imagen` existente.

## Pasos a seguir

1. **Ir a Content-Type Builder → Persona**

2. **Agregar nuevo campo:**
   - **Tipo:** Component
   - **Nombre:** `portada`
   - **Componente:** Usar el mismo componente que `imagen` (probablemente `contacto.imagen`)
     - Si no existe un componente reutilizable, crear uno nuevo llamado `contacto.portada` con la misma estructura que `contacto.imagen`
     - El componente debe tener:
       - Campo `imagen`: Tipo Media, Multiple: Sí (para permitir múltiples imágenes, aunque usaremos solo la primera)
       - Campos opcionales: `tipo`, `formato`, `estado`, `vigente_hasta`, `status` (si existen en el componente de imagen)

3. **Guardar y publicar los cambios**

## Estructura esperada del componente portada
```json
{
  "imagen": [
    {
      "id": 123,
      "url": "/uploads/image.jpg",
      "alternativeText": "...",
      "width": 1920,
      "height": 300
    }
  ],
  "tipo": "...",
  "formato": "...",
  "estado": "...",
  "vigente_hasta": "...",
  "status": true
}
```

## Notas importantes
- El campo `portada` debe seguir exactamente la misma estructura que `imagen` para mantener consistencia
- Si `imagen` usa un componente específico (ej: `contacto.imagen`), `portada` debe usar el mismo componente o uno idéntico
- El campo debe ser opcional (no requerido) para permitir que los perfiles existentes sigan funcionando
- Una vez agregado, el frontend ya está preparado para usar este campo automáticamente

## Verificación
Después de agregar el campo:
1. Verificar que aparece en el Content-Type Builder
2. Verificar que se puede guardar y publicar
3. Probar crear/editar una Persona y verificar que el campo `portada` aparece en el formulario
4. El frontend de la intranet ya está configurado para poblar y usar este campo automáticamente

