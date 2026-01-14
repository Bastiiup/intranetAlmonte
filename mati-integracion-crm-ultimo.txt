# Prompt para Incorporar Cambios de CRM - Módulo Listas

## Contexto
Se ha implementado un nuevo módulo completo de "Listas" en el CRM, junto con mejoras en filtros, optimizaciones de build y correcciones varias. Este documento resume todos los cambios para facilitar su incorporación.

---

## 📋 Cambios Principales

### 1. Nuevo Módulo "Listas" en CRM

#### 1.1 Navegación
- **Archivo**: `src/layouts/components/data.ts`
- **Cambio**: Agregar "Listas" al menú de navegación bajo la sección "CRM"
- **Ubicación**: Menú lateral → CRM → Listas
- **Ruta**: `/crm/listas`

#### 1.2 Página Principal de Listas
- **Archivo**: `src/app/(admin)/(apps)/crm/listas/page.tsx`
- **Funcionalidad**: 
  - Lista todos los cursos que tienen PDFs asociados (versiones_materiales)
  - Muestra: Nombre, Nivel, Grado, Año, Colegio, Curso (con paralelo), PDF, Estado
  - Búsqueda por nombre
  - Filtros: Nivel, Año, Colegio, Estado (activo/inactivo)
  - Acciones: Visualizar PDF, Descargar PDF, Editar, Eliminar

#### 1.3 Componente ListasListing
- **Archivo**: `src/app/(admin)/(apps)/crm/listas/components/ListasListing.tsx`
- **Características**:
  - Tabla con @tanstack/react-table
  - Filtros dinámicos (año, colegio)
  - Búsqueda global
  - Paginación
  - Botones de acción para PDFs

#### 1.4 Modal para Agregar/Editar Listas
- **Archivo**: `src/app/(admin)/(apps)/crm/listas/components/ListaModal.tsx`
- **Funcionalidad**:
  - Selección de Colegio (búsqueda habilitada)
  - Selección de Curso (búsqueda habilitada, con botón para crear nuevo curso)
  - Subida de PDF
  - Integración con API `/api/crm/cursos/import-pdf`
  - Manejo de errores mejorado

#### 1.5 Modal para Crear Curso Rápido
- **Archivo**: `src/app/(admin)/(apps)/crm/listas/components/CrearCursoModal.tsx`
- **Funcionalidad**:
  - Crear curso desde el modal de listas
  - Campos: Nivel, Grado, Paralelo, Año, Activo
  - Generación automática de nombre_curso

---

## 🔌 APIs Implementadas

### 2.1 API de Listas
- **Archivo**: `src/app/api/crm/listas/route.ts`
- **Endpoint**: `GET /api/crm/listas`
- **Funcionalidad**:
  - Obtiene cursos con `versiones_materiales` (PDFs)
  - Filtra solo cursos que tienen PDFs
  - Incluye `paralelo` en el nombre del curso
  - Transforma datos de cursos a formato "Lista"

### 2.2 API de Importación de PDF
- **Archivo**: `src/app/api/crm/cursos/import-pdf/route.ts`
- **Endpoint**: `POST /api/crm/cursos/import-pdf`
- **Mejoras**:
  - Maneja tanto `documentId` (UUID) como `id` numérico
  - Búsqueda por documentId usando filtros
  - Búsqueda por id numérico usando ruta directa
  - Fallback: si falla con id, intenta con documentId
  - Logging detallado para debugging

### 2.3 API de Upload Genérico
- **Archivo**: `src/app/api/upload/route.ts`
- **Endpoint**: `POST /api/upload`
- **Funcionalidad**: Subida genérica de archivos a Strapi Media Library

### 2.4 API de PDF para Listas
- **Archivo**: `src/app/api/crm/listas/pdf/[pdfId]/route.ts`
- **Endpoint**: `GET /api/crm/listas/pdf/[pdfId]`
- **Funcionalidad**: Servir PDFs específicos de listas (proxy para evitar CORS)

---

## 🔧 Mejoras en APIs Existentes

### 3.1 API de Colegios
- **Archivo**: `src/app/api/crm/colegios/route.ts`
- **Mejoras**:
  - Búsqueda mejorada: si el término es numérico, busca por nombre O RBD
  - Filtros: tipo, región, fechaDesde, fechaHasta, soloConContactos
  - Paginación mejorada

### 3.2 API de Contactos de Colegio
- **Archivo**: `src/app/api/crm/colegios/[id]/contacts/route.ts`
- **Corrección**: Removido filtro inválido `filters[activo][$eq]` en persona-trayectorias
  - `activo` es campo de `persona`, no de `trayectoria`
  - Filtrado por persona.activo se hace después en el código

### 3.3 API de Cursos de Colegio
- **Archivo**: `src/app/api/crm/colegios/[id]/cursos/route.ts`
- **Mejoras**:
  - Incluye `paralelo` en campos
  - Incluye `versiones_materiales` como campo JSON (no relación)
  - Manejo de `publicationState=preview` para incluir drafts

---

## 🎨 Mejoras en UI/UX

### 4.1 Página de Colegios
- **Archivo**: `src/app/(admin)/(apps)/crm/colegios/components/ColegiosListing.tsx`
- **Mejoras**:
  - Exportación de `REGIONES` para uso en otras páginas
  - Filtros mejorados: tipo, región, fecha, solo con contactos
  - Búsqueda mejorada (nombre o RBD)
  - Ordenamiento por nombre

### 4.2 Página de Contactos
- **Archivo**: `src/app/(admin)/(apps)/crm/contacts/page.tsx`
- **Mejoras**:
  - Filtros completos: origen, confianza, región, comuna, cargo, fecha
  - Nombre del contacto es clickeable (navega a detalle)
  - Botón "Ver" en acciones
  - Ordenamiento por nombre

### 4.3 Página de Detalle de Colegio
- **Archivo**: `src/app/(admin)/(apps)/crm/colegios/[id]/page.tsx`
- **Cambios**:
  - Removido: Pedidos, Leads, Actividades
  - Agregado: Cantidad de Cursos, Cantidad de Listas de Útiles
  - Colaboradores mostrados en tabla (no cards)
  - Tabla simplificada: Name, Cargo/Curso, Email, Phone, Actions

---

## 🐛 Correcciones y Optimizaciones

### 5.1 Optimización de Build
- **Archivo**: `Dockerfile`
- **Cambios**:
  - Variables de entorno movidas antes de copiar archivos (mejor cache)
  - `NODE_ENV=production` establecido DESPUÉS de instalar dependencias
  - Esto permite que TypeScript (devDependency) se instale correctamente
  - Agregado `--silent` a npm para menos output
  - Agregado `CI=true` y `NEXT_PRIVATE_SKIP_LINT=true`

### 5.2 .dockerignore Mejorado
- **Archivo**: `.dockerignore`
- **Cambios**:
  - Excluye todos los archivos `.md` excepto `README.md`
  - Excluye archivos de desarrollo (PROMPT*, GUIA*, etc.)
  - Reduce tamaño del contexto de Docker

### 5.3 Limpieza de Archivos
- **Eliminados**: 28 archivos `.md` innecesarios del directorio `AlmonteIntranet/`
  - Guías temporales
  - Prompts
  - Soluciones específicas
  - Documentación obsoleta

### 5.4 Correcciones TypeScript
- **Archivos**: Varios componentes
- **Correcciones**:
  - Tipos explícitos en funciones `sort()`
  - Manejo correcto de tipos en modales
  - Corrección de tipos en `ListaType` interface

---

## 📝 Estructura de Datos

### 6.1 Tipo ListaType
```typescript
interface ListaType {
  id: number | string
  documentId?: string
  nombre: string
  nivel: 'Basica' | 'Media'
  grado: number
  año?: number
  activo: boolean
  pdf_id?: number | string
  pdf_url?: string
  pdf_nombre?: string
  colegio?: { id: number | string; nombre: string }
  curso?: { id: number | string; nombre: string }
}
```

### 6.2 Lógica de Listas
- Las "Listas" son cursos que tienen `versiones_materiales` (PDFs)
- No existe un content type separado "Listas" en Strapi
- Se transforman los cursos con PDFs al formato `ListaType` en la API

---

## 🔍 Puntos Importantes

### 7.1 Manejo de IDs en Strapi
- **documentId vs id**: Strapi puede usar ambos
- **Solución**: APIs manejan ambos casos
  - Si es UUID → usar filtro `filters[documentId][$eq]`
  - Si es numérico → usar ruta directa `/api/cursos/${id}`
  - Fallback: si falla uno, intentar el otro

### 7.2 Publication State
- Los cursos usan `draftAndPublish: true` en Strapi
- **Importante**: Usar `publicationState=preview` para incluir drafts
- Sin esto, los cursos en draft no aparecen

### 7.3 Campos JSON vs Relaciones
- `versiones_materiales` es un campo JSON, NO una relación
- **Correcto**: `fields[5]=versiones_materiales`
- **Incorrecto**: `populate[versiones_materiales]=true`

### 7.4 Paralelo en Nombre
- El `paralelo` (A, B, C, etc.) se concatena al nombre del curso
- Ejemplo: "2° Media C" (grado + nivel + paralelo)

---

## 🚀 Pasos para Incorporar Cambios

### Paso 1: Verificar Estructura de Strapi
1. Verificar que el content type "Curso" tiene:
   - Campo `paralelo` (Text, opcional)
   - Campo `versiones_materiales` (JSON, opcional)
   - Campo `año` (Number, requerido)
   - Relación con `colegio` (ManyToOne)

2. Verificar permisos de API Token:
   - `find` en Cursos
   - `update` en Cursos
   - `upload` en Upload
   - `find` en Colegios

### Paso 2: Copiar Archivos Nuevos
```
src/app/(admin)/(apps)/crm/listas/
  ├── page.tsx
  └── components/
      ├── ListasListing.tsx
      ├── ListaModal.tsx
      └── CrearCursoModal.tsx

src/app/api/crm/listas/
  ├── route.ts
  └── pdf/[pdfId]/route.ts

src/app/api/upload/route.ts
```

### Paso 3: Actualizar Archivos Existentes
- `src/layouts/components/data.ts` - Agregar "Listas" al menú
- `src/app/api/crm/colegios/route.ts` - Mejoras en búsqueda
- `src/app/api/crm/colegios/[id]/contacts/route.ts` - Remover filtro activo
- `src/app/api/crm/colegios/[id]/cursos/route.ts` - Incluir paralelo y versiones_materiales
- `src/app/api/crm/cursos/import-pdf/route.ts` - Manejo de documentId/id
- `src/app/(admin)/(apps)/crm/colegios/components/ColegiosListing.tsx` - Exportar REGIONES
- `src/app/(admin)/(apps)/crm/contacts/page.tsx` - Mejoras en filtros
- `src/app/(admin)/(apps)/crm/colegios/[id]/page.tsx` - Cambios en dashboard

### Paso 4: Actualizar Dockerfile y .dockerignore
- Copiar el Dockerfile actualizado
- Copiar el .dockerignore mejorado

### Paso 5: Probar Funcionalidad
1. Navegar a `/crm/listas`
2. Verificar que se muestran cursos con PDFs
3. Probar agregar nueva lista:
   - Seleccionar colegio
   - Seleccionar curso (o crear uno nuevo)
   - Subir PDF
4. Probar filtros: año, colegio, nivel, estado
5. Probar visualizar y descargar PDFs

---

## ⚠️ Notas Importantes

1. **No crear content type "Listas" en Strapi**: Las listas son cursos con PDFs, no un tipo separado.

2. **El campo `versiones_materiales` debe ser JSON**: No es una relación, es un campo JSON que contiene array de versiones con PDFs.

3. **Paralelo es opcional**: Si un curso no tiene paralelo, se muestra sin letra.

4. **Publication State**: Siempre usar `publicationState=preview` al consultar cursos para incluir drafts.

5. **IDs**: Preferir `documentId` sobre `id` cuando esté disponible, es más confiable con draftAndPublish.

---

## 📚 Archivos Clave a Revisar

### Nuevos Archivos
- `src/app/(admin)/(apps)/crm/listas/page.tsx`
- `src/app/(admin)/(apps)/crm/listas/components/ListasListing.tsx`
- `src/app/(admin)/(apps)/crm/listas/components/ListaModal.tsx`
- `src/app/(admin)/(apps)/crm/listas/components/CrearCursoModal.tsx`
- `src/app/api/crm/listas/route.ts`
- `src/app/api/crm/listas/pdf/[pdfId]/route.ts`
- `src/app/api/upload/route.ts`

### Archivos Modificados
- `src/layouts/components/data.ts`
- `src/app/api/crm/colegios/route.ts`
- `src/app/api/crm/colegios/[id]/contacts/route.ts`
- `src/app/api/crm/colegios/[id]/cursos/route.ts`
- `src/app/api/crm/cursos/import-pdf/route.ts`
- `src/app/(admin)/(apps)/crm/colegios/components/ColegiosListing.tsx`
- `src/app/(admin)/(apps)/crm/contacts/page.tsx`
- `src/app/(admin)/(apps)/crm/colegios/[id]/page.tsx`
- `Dockerfile`
- `.dockerignore`

---

## ✅ Checklist de Verificación

- [ ] Menú "Listas" aparece en navegación CRM
- [ ] Página `/crm/listas` carga correctamente
- [ ] Se muestran cursos con PDFs
- [ ] Filtros funcionan (año, colegio, nivel, estado)
- [ ] Búsqueda funciona
- [ ] Botón "Agregar Lista" abre modal
- [ ] Selección de colegio funciona (muestra todos)
- [ ] Selección de curso funciona
- [ ] Botón crear curso funciona
- [ ] Subida de PDF funciona
- [ ] Visualizar PDF funciona
- [ ] Descargar PDF funciona
- [ ] Editar lista funciona
- [ ] Eliminar lista funciona
- [ ] Build en Railway funciona correctamente
- [ ] TypeScript compila sin errores

---

## 🆘 Troubleshooting

### Error: "Curso no encontrado"
- Verificar que el cursoId es correcto (documentId o id)
- Verificar permisos de API Token
- Verificar que el curso existe en Strapi
- Revisar logs del servidor para más detalles

### Error: "Invalid key versiones_materiales"
- Verificar que `versiones_materiales` es campo JSON, no relación
- Usar `fields[5]=versiones_materiales` no `populate[versiones_materiales]=true`

### Error: "Cannot find module 'typescript'"
- Verificar que Dockerfile instala devDependencies
- `NODE_ENV=production` debe estar DESPUÉS de `npm ci`

### PDFs no se muestran
- Verificar que el curso tiene `versiones_materiales` con PDFs
- Verificar permisos de Upload en Strapi
- Verificar que la API `/api/crm/cursos/pdf/[pdfId]` funciona

---

## 📞 Soporte

Si encuentras problemas al incorporar estos cambios:
1. Revisa los logs del servidor
2. Verifica la consola del navegador (F12)
3. Revisa los permisos en Strapi
4. Verifica que los campos existen en Strapi con los nombres correctos

---

**Última actualización**: Enero 2026
**Versión**: 1.0
