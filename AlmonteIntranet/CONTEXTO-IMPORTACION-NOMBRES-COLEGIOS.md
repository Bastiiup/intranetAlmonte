# Contexto: Importación de Nombres de Colegios en Strapi

## Objetivo

Necesitamos importar y actualizar los nombres de los colegios en Strapi desde archivos Excel/CSV que contienen RBD y nombre de colegio.

## Situación Actual

1. **Ya tenemos colegios en Strapi** identificados por RBD (Rol Base de Datos)
2. **Muchos colegios tienen nombres genéricos** como "Colegio RBD 12345" porque se crearon sin nombre
3. **Tenemos archivos Excel/CSV** de otra base de datos con:
   - RBD (identificador único)
   - Nombre del colegio (nombre oficial)

## Lo que Necesitamos

### 1. Endpoint de Importación de Nombres
Ya existe: `/api/crm/colegios/match-nombres`

**Funcionalidad:**
- Recibe un archivo Excel/CSV con columnas: `RBD` y `nombre` (o `colegio_nombre`, `nombre_colegio`)
- Busca cada colegio en Strapi por RBD
- Actualiza el campo `colegio_nombre` con el nombre del archivo
- Retorna un resumen de:
  - Colegios actualizados
  - Colegios no encontrados (RBD no existe en Strapi)
  - Colegios sin cambios (ya tenían ese nombre)
  - Errores

**Formato del archivo esperado:**
```
RBD    | nombre
-------|------------------
12605  | Academia Hospicio
12345  | Colegio San Juan
```

### 2. Mejora en Importación de Niveles/Asignaturas
Endpoint: `/api/crm/colegios/import-niveles-asignaturas`

**Ya soporta:**
- Campo `nombre_colegio` en el archivo de importación
- Si viene el nombre, se usa al crear nuevos colegios

**Necesita:**
- Asegurar que cuando se crea un colegio nuevo, se use el `nombre_colegio` del archivo
- Si el colegio ya existe pero no tiene nombre (o tiene nombre genérico), actualizarlo con el nombre del archivo

## Estructura de Datos en Strapi

### Content Type: `colegios`

**Campos principales:**
- `rbd` (Number, required, unique): Identificador único del colegio
- `colegio_nombre` (String): Nombre oficial del colegio
- Otros campos: `estado`, `dependencia`, `region`, `zona`, `website`, etc.

**Relaciones:**
- `comuna` (Relation): Comuna donde está ubicado
- `telefonos` (Component, repeatable): Teléfonos del colegio
- `emails` (Component, repeatable): Emails del colegio
- `direcciones` (Component, repeatable): Direcciones del colegio

## Flujo de Trabajo Actual

### Escenario 1: Importar solo nombres (archivo con RBD y nombre)
1. Usuario sube archivo Excel/CSV con columnas: `RBD`, `nombre`
2. Sistema lee el archivo
3. Para cada fila:
   - Busca colegio en Strapi por RBD
   - Si existe: actualiza `colegio_nombre`
   - Si no existe: reporta como "no encontrado"
4. Retorna resumen de actualizaciones

### Escenario 2: Importar niveles/asignaturas (archivo con RBD, niveles, y opcionalmente nombre)
1. Usuario sube archivo Excel/CSV con columnas: `RBD`, `Nivel`, `ID_NIVEL`, `Asignatura`, etc.
2. Sistema lee el archivo
3. Para cada fila:
   - Busca colegio en Strapi por RBD
   - Si existe: usa el colegio existente
   - Si no existe: crea nuevo colegio
     - Si viene `nombre_colegio` en el archivo: usa ese nombre
     - Si no viene: usa nombre temporal "Colegio RBD {rbd}"
4. Crea/actualiza cursos asociados al colegio

## Problemas Actuales

1. **Nombres genéricos**: Muchos colegios tienen nombres como "Colegio RBD 12345"
2. **Falta de sincronización**: Los nombres en Strapi no coinciden con la base de datos fuente
3. **Actualización manual**: No hay forma fácil de actualizar nombres en masa

## Soluciones Implementadas

### ✅ Endpoint `/api/crm/colegios/match-nombres`
- Ya implementado y funcional
- Procesa archivos Excel/CSV
- Actualiza nombres por RBD
- Procesa en batches de 10 para no sobrecargar Strapi
- Retorna resultados detallados

### ✅ Soporte de `nombre_colegio` en importación de niveles
- Ya implementado en `/api/crm/colegios/import-niveles-asignaturas`
- Si viene `nombre_colegio` en el archivo, se usa al crear colegios nuevos

## Mejoras Implementadas ✅

### ✅ Actualizar nombres existentes durante importación de niveles
**IMPLEMENTADO** - Cuando se importa un archivo de niveles/asignaturas:
- Si el colegio ya existe pero tiene nombre genérico ("Colegio RBD {rbd}")
- Y el archivo trae `nombre_colegio`
- Se actualiza automáticamente el nombre del colegio existente

**Implementación:**
- Se extrae el `nombre_colegio` de las filas del archivo y se guarda en un mapa `rbdToNombreColegio`
- Al crear un colegio nuevo: se usa el nombre del archivo si está disponible, sino se usa "Colegio RBD {rbd}"
- Al encontrar un colegio existente: se verifica si tiene nombre genérico y se actualiza con el nombre del archivo

### ✅ Usar nombres del archivo al crear colegios nuevos
**IMPLEMENTADO** - Los colegios nuevos se crean con el nombre del archivo si está disponible.

## Archivos Relevantes

1. **`src/app/api/crm/colegios/match-nombres/route.ts`**
   - Endpoint para importar solo nombres
   - ✅ Ya implementado y funcional

2. **`src/app/api/crm/colegios/import-niveles-asignaturas/route.ts`**
   - Endpoint para importar niveles/asignaturas
   - ✅ Ya soporta `nombre_colegio` en creación
   - 🔄 Necesita actualizar nombres existentes si vienen en el archivo

3. **`src/app/(admin)/(apps)/crm/colegios/components/ImportarNivelesAsignaturasModal.tsx`**
   - Componente React para subir archivos
   - ✅ Ya funcional

## Próximos Pasos

1. **Mejorar importación de niveles/asignaturas:**
   - Actualizar nombres de colegios existentes si vienen en el archivo
   - Priorizar nombres del archivo sobre nombres genéricos

2. **Validación:**
   - Verificar que los nombres no estén vacíos
   - Normalizar nombres (trim, capitalización)

3. **Logging:**
   - Registrar cuántos nombres se actualizaron
   - Registrar cuántos colegios se crearon con nombres del archivo

## Ejemplo de Uso

### Archivo Excel para match-nombres:
```
RBD    | nombre
-------|------------------
12605  | Academia Hospicio
12345  | Colegio San Juan
67890  | Instituto Nacional
```

### Archivo Excel para import-niveles-asignaturas (con nombre):
```
RBD    | nombre_colegio        | Nivel    | ID_NIVEL | Asignatura
-------|-------------------|-----------|----------|------------
12605  | Academia Hospicio  | I Medio   | 12       | Matemáticas
12605  | Academia Hospicio  | I Medio   | 12       | Lenguaje
```

## Notas Técnicas

- **Strapi v5**: Usar `documentId` en lugar de `id` para algunas operaciones
- **Batches**: Procesar en batches de 10 para no sobrecargar Strapi
- **Timeout**: Endpoints tienen `maxDuration = 300` (5 minutos) para archivos grandes
- **Validación**: RBD debe ser numérico y único
- **Normalización**: Nombres se normalizan con `.trim()` antes de guardar
