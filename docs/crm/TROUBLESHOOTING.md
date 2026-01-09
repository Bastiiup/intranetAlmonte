# 🔧 Troubleshooting - CRM

**Última actualización:** Enero 2026

---

## Problema: Contactos no aparecen en colegio

### Síntomas
- Al ir a `/crm/colegios/[id]` → Tab "Colaboradores", no se muestran contactos
- Se crearon contactos con trayectorias pero no aparecen

### Causas posibles
1. Filtro de trayectorias incorrecto
2. IDs inválidos (0, null, undefined)
3. Populate no incluye todas las relaciones necesarias
4. El endpoint de trayectorias no funciona correctamente

### Soluciones

#### 1. Verificar que las trayectorias se crearon
```bash
# En Strapi Admin o API
GET /api/profesores?filters[colegio][id][$eq]=COLEGIO_ID
```

#### 2. Verificar logs en consola del navegador
Buscar: `[API /crm/colegios/[id]/contacts GET]`
- Ver cuántas trayectorias se encontraron
- Ver cuántas personas únicas se encontraron

#### 3. Verificar populate completo
```typescript
// Asegurar populate completo
'populate[trayectorias][populate][colegio]': 'true',
'populate[trayectorias][populate][persona]': 'true',
'populate[trayectorias][populate][curso]': 'true',
'populate[trayectorias][populate][asignatura]': 'true',
```

#### 4. Usar estrategia alternativa
El endpoint `/api/crm/colegios/[id]/contacts` usa una estrategia alternativa:
- Obtiene trayectorias directamente desde `/api/profesores`
- Agrupa por persona
- Más confiable que filtrar personas por trayectorias

---

## Problema: Datos no se guardan en Strapi

### Síntomas
- Al crear/editar contacto, no se guardan los cambios
- Errores silenciosos sin mensaje al usuario
- Trayectorias no se crean

### Causas posibles
1. IDs inválidos (0, null, undefined) al crear trayectorias
2. Formato de `connect` incorrecto
3. Validaciones de Strapi rechazando los datos
4. Campos requeridos faltantes

### Soluciones

#### 1. Validar IDs antes de crear
```typescript
// Validar personaId
let personaIdNum: number | null = null
if (body.data.persona?.connect?.[0]) {
  personaIdNum = parseInt(String(body.data.persona.connect[0]))
}

if (!personaIdNum || personaIdNum === 0 || isNaN(personaIdNum)) {
  return NextResponse.json(
    { error: 'ID de persona inválido' },
    { status: 400 }
  )
}

// Similar para colegioId
```

#### 2. Usar ID numérico para connect
```typescript
// Convertir documentId a id numérico si es necesario
const personaResponse = await strapiClient.get(`/api/personas/${documentId}?fields=id`)
const personaIdNum = personaResponse.data.id

// Usar en connect
{
  data: {
    persona: { connect: [personaIdNum] },  // ID numérico
    colegio: { connect: [colegioIdNum] },
  }
}
```

#### 3. Verificar logs en servidor
Buscar: `[API /persona-trayectorias POST]`
- Ver si la trayectoria se creó correctamente
- Verificar IDs de persona y colegio
- Ver mensajes de error de Strapi

#### 4. Verificar en Strapi Admin
- Ir a Content Type "Profesores"
- Verificar que existen trayectorias con el colegio correcto
- Verificar que las relaciones están correctas

---

## Problema: Endpoint de trayectorias no funciona

### Síntomas
- Error 404 al llamar `/api/persona-trayectorias`
- Error al crear/actualizar trayectorias

### Causas posibles
1. El nombre del content type en Strapi es diferente
2. Permisos incorrectos en Strapi
3. El endpoint real es `/api/profesores`

### Soluciones

#### 1. Verificar nombre del content type
En Strapi Admin:
1. Ir a Content-Type Builder
2. Buscar el content type que conecta `persona` y `colegio`
3. Ver el nombre técnico del content type
4. El endpoint será `/api/{nombre-tecnico}`

#### 2. Probar diferentes endpoints
```bash
# Probar diferentes nombres
GET /api/profesores
GET /api/colegio-profesores
GET /api/persona-trayectorias
```

#### 3. Verificar permisos en Strapi
- Ir a Settings → Users & Permissions Plugin → Roles
- Verificar que el rol tiene permisos para el content type
- Verificar permisos de find, create, update, delete

---

## Problema: IDs inválidos al crear trayectoria

### Síntomas
- Error: "ID de persona inválido" o "ID de colegio inválido"
- Trayectoria no se crea

### Soluciones

#### 1. Validar IDs antes de usar
```typescript
// Validar que el ID no sea 0, null, undefined
if (!personaId || personaId === 0 || isNaN(parseInt(String(personaId)))) {
  throw new Error('ID de persona inválido')
}
```

#### 2. Convertir documentId a id numérico
```typescript
// Si tenemos documentId, obtener id numérico
if (typeof personaId === 'string' && !/^\d+$/.test(personaId)) {
  const personaResponse = await strapiClient.get(`/api/personas/${personaId}?fields=id`)
  personaId = personaResponse.data.id
}
```

#### 3. Usar ID numérico para connect
```typescript
// Siempre usar ID numérico para connect
{
  data: {
    persona: { connect: [parseInt(String(personaId))] },
    colegio: { connect: [parseInt(String(colegioId))] },
  }
}
```

---

## Problema: Populate no funciona correctamente

### Síntomas
- Datos relacionados no se cargan
- Campos anidados aparecen como null

### Soluciones

#### 1. Usar sintaxis correcta de populate
```typescript
// ✅ Correcto
'populate[trayectorias][populate][colegio]': 'true',
'populate[trayectorias][populate][curso]': 'true',

// ❌ Incorrecto
'populate[trayectorias.colegio]': 'true',
```

#### 2. Usar populate completo
```typescript
const params = new URLSearchParams({
  'populate[trayectorias]': 'true',
  'populate[trayectorias][populate][colegio]': 'true',
  'populate[trayectorias][populate][persona]': 'true',
  'populate[trayectorias][populate][curso]': 'true',
  'populate[trayectorias][populate][asignatura]': 'true',
  'populate[emails]': 'true',
  'populate[telefonos]': 'true',
})
```

---

## Debugging

### Logs útiles

**En consola del navegador:**
- `[API /crm/colegios/[id]/contacts GET]` - Ver contactos obtenidos
- `[API /persona-trayectorias POST]` - Ver creación de trayectorias

**En servidor:**
- `[API /crm/colegios/[id]/contacts GET]` - Ver query ejecutada
- `[API /persona-trayectorias POST]` - Ver datos enviados a Strapi

### Verificar en Strapi Admin

1. **Content Type "Profesores":**
   - Verificar que existen trayectorias
   - Verificar relaciones con persona y colegio
   - Verificar campos requeridos

2. **Content Type "Personas":**
   - Verificar que existen personas
   - Verificar relación con trayectorias

3. **Content Type "Colegios":**
   - Verificar que existen colegios
   - Verificar relación con trayectorias

---

**Última actualización:** Enero 2026

