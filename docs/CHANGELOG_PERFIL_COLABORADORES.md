# Changelog: Funcionalidad de Perfil de Colaboradores y Portada

## 📋 Resumen General

Este documento describe todos los cambios realizados para:
1. **Permitir que colaboradores vean perfiles de otros usuarios desde el chat**
2. **Agregar funcionalidad de portada (banner) al perfil**
3. **Corregir visualización de datos del perfil (imagen, "Sobre Mí", timeline)**
4. **Traducir textos a español**
5. **Limpiar logs de debug**

---

## 🆕 Archivos Creados

### 1. `AlmonteIntranet/src/app/(admin)/(apps)/users/profile/[id]/page.tsx`
**Descripción**: Página dinámica para ver perfiles de otros colaboradores por ID.

**Contenido**:
```tsx
'use client'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import React from 'react'
import { Container } from 'react-bootstrap'
import Profile from '../components/Profile'
import Account from '../components/Account'
import ProfileBanner from '../components/ProfileBanner'
import { use } from 'react'

interface PageProps {
  params: Promise<{ id: string }>
}

const page = ({ params }: PageProps) => {
    const { id } = use(params)
    
    return (
        <Container fluid>
            <PageBreadcrumb title="Perfil" subtitle="Usuarios" />
            <div className="row">
                <div className="col-12">
                    <article className="card overflow-hidden mb-0">
                        <ProfileBanner colaboradorId={id} />
                    </article>
                </div>
            </div>
            <div className="px-3 mt-n4">
                <div className="row">
                    <div className="col-xl-4">
                        <Profile colaboradorId={id} />
                    </div>
                    <div className="col-xl-8">
                        <Account colaboradorId={id} />
                    </div>
                </div>
            </div>
        </Container>
    )
}

export default page
```

### 2. `AlmonteIntranet/src/app/(admin)/(apps)/users/profile/components/ProfileBanner.tsx`
**Descripción**: Componente nuevo para mostrar y gestionar la portada (banner) del perfil.

**Funcionalidades**:
- Carga la portada del perfil propio o de otro colaborador
- Permite cambiar la portada (solo en perfil propio)
- Soporta preview de imagen antes de subir
- Maneja múltiples estructuras de datos de Strapi
- Sin overlay de texto (solo imagen)

**Nota**: Ver archivo completo en el código fuente. Maneja:
- Normalización de estructura `portada.imagen` (componente contacto.imagen)
- Preview antes de subir
- Upload usando `/api/tienda/upload`
- Actualización mediante `PUT /api/colaboradores/me/profile` con `portada_id`

---

## ✏️ Archivos Modificados

### 1. `AlmonteIntranet/src/app/(admin)/(apps)/users/profile/page.tsx`

**Cambios**:
- Importa y usa `ProfileBanner` en lugar del banner anterior
- Traduce breadcrumb: `title="Perfil" subtitle="Usuarios"`

**Antes**:
```tsx
<PageBreadcrumb title="Profile" subtitle="Users" />
```

**Después**:
```tsx
<PageBreadcrumb title="Perfil" subtitle="Usuarios" />
<ProfileBanner />
```

---

### 2. `AlmonteIntranet/src/app/(admin)/(apps)/users/profile/components/Profile.tsx`

**Cambios principales**:
1. **Nueva prop `colaboradorId?: string`** - Permite cargar perfil de otro colaborador
2. **Lógica condicional para cargar datos**:
   - Si hay `colaboradorId`: usa `/api/colaboradores/${colaboradorId}`
   - Si no: usa `/api/colaboradores/me/profile` (perfil propio)
3. **Normalización de estructura de datos** de Strapi
4. **Renderizado condicional** para mostrar datos del perfil correcto

**Interfaz agregada**:
```tsx
interface ProfileProps {
    colaboradorId?: string
}
```

**Uso**:
```tsx
const Profile = ({ colaboradorId }: ProfileProps) => {
    // ... carga datos condicionalmente
    const endpoint = colaboradorId 
        ? `/api/colaboradores/${colaboradorId}`
        : '/api/colaboradores/me/profile'
}
```

---

### 3. `AlmonteIntranet/src/app/(admin)/(apps)/users/profile/components/Account.tsx`

**Cambios principales**:
1. **Nueva prop `colaboradorId?: string`**
2. **Estado `viewingProfileData`** - Almacena datos del perfil que se está viendo (no del autenticado)
3. **Corrección de "Sobre Mí"** - Ahora muestra datos del perfil visto, no del usuario autenticado
4. **Corrección de Timeline** - Muestra nombre y actividades del perfil visto
5. **Formulario de creación de posts** - Oculto cuando se ve perfil de otro colaborador
6. **Tab "Settings"** - Oculto cuando se ve perfil de otro colaborador

**Cambios clave en el código**:

```tsx
interface AccountProps {
    colaboradorId?: string
}

// Nuevo estado para datos del perfil visto
const [viewingProfileData, setViewingProfileData] = useState<any>(null)

// Cargar datos condicionalmente
const endpoint = colaboradorId 
    ? `/api/colaboradores/${colaboradorId}`
    : '/api/colaboradores/me/profile'

// Usar viewingProfileData para mostrar información
const nombreCompleto = colaboradorId 
    ? (viewingProfileData?.persona ? getPersonaNombre(viewingProfileData.persona) : '')
    : nombreCompleto

// Timeline usa targetColaboradorId
const targetColaboradorId = colaboradorId || (colaborador as any)?.documentId || colaborador?.id
```

**Renderizado condicional**:
- Formulario de posts: `{!colaboradorId && (<form>...</form>)}`
- Tab Settings: `{colaboradorId ? <Alert>...</Alert> : <form>...</form>}`

---

### 4. `AlmonteIntranet/src/app/(admin)/(apps)/chat/page.tsx`

**Cambios**:
1. **Botón "Ver Perfil"** agregado en cada contacto de la lista
2. **Mejora en `getColaboradorAvatar`** - Mejor manejo de estructuras de imagen de Strapi

**Agregado en la lista de contactos**:
```tsx
<Link href={`/users/profile/${col.documentId || col.id}`}>
  <Button
    variant={isSelected ? 'light' : 'outline-primary'}
    size="sm"
    title="Ver Perfil"
  >
    <TbUser style={{ fontSize: '1rem' }} />
  </Button>
</Link>
```

**Mejora en función de avatar**:
```tsx
// Prioriza estructura normalizada
if (col.persona?.imagen?.url) {
    return col.persona.imagen.url.startsWith('http') 
        ? col.persona.imagen.url 
        : `${process.env.NEXT_PUBLIC_STRAPI_URL}${col.persona.imagen.url}`
}
// Fallback a estructura raw de Strapi
else if ((col.attributes?.persona as any)?.imagen?.imagen) {
    // ... manejo de estructura componente contacto.imagen
}
```

---

### 5. `AlmonteIntranet/src/app/api/colaboradores/[id]/route.ts`

**Cambios en GET**:
1. **Populate de `portada`** agregado en el query string:
```typescript
populate[persona][populate][imagen][populate]=*&populate[persona][populate][portada][populate]=*
```

2. **Normalización de `portada`** - Similar a como se normaliza `imagen`:
```typescript
// Normalizar portada (similar a imagen)
let portadaNormalizada: any = null
const portadaRaw = persona?.portada

if (portadaRaw?.imagen) {
    const portadaData = portadaRaw.imagen
    if (Array.isArray(portadaData) && portadaData.length > 0) {
        const primeraPortada = portadaData[0]
        portadaNormalizada = {
            url: primeraPortada.url || null,
            alternativeText: primeraPortada.alternativeText || null,
            width: primeraPortada.width || null,
            height: primeraPortada.height || null,
        }
    }
    // ... más casos de normalización
}
```

**Líneas modificadas**: ~40-192 (agregado populate y normalización)

---

### 6. `AlmonteIntranet/src/app/api/colaboradores/me/profile/route.ts`

**Cambios en GET**:
1. **Populate de `portada`** agregado en queries:
```typescript
&populate[persona][populate][imagen][populate]=*&populate[persona][populate][portada][populate]=*
```

2. **Normalización de `portada`** completa (similar a `imagen`):
   - Maneja estructura `portada.imagen` (componente)
   - Maneja array directo
   - Maneja estructura con `data`
   - Maneja URL directa

3. **Fallback para `portada`** si no se normaliza:
```typescript
const portadaParaCliente = portadaNormalizada || portadaRaw || personaAttrs.portada || persona?.portada || null
```

**Cambios en PUT**:
1. **Soporte para `portada_id`** - Similar a `imagen_id`:
```typescript
let portadaIdParaActualizar: number | null = null
if (body.portada_id) {
    portadaIdParaActualizar = body.portada_id
}
```

2. **Actualización de portada independiente** - Se actualiza aunque no haya otros campos:
```typescript
// IMPORTANTE: Permitir actualizar portada aunque no haya otros campos
if (Object.keys(personaUpdateData.data).length > 0 || imagenIdParaActualizar || portadaIdParaActualizar) {
    // ... actualización
}
```

3. **Lógica de actualización de componente `portada`** - Intenta múltiples estructuras:
```typescript
const estructurasPortada = [
    { imagen: [portadaIdParaActualizar], tipo, formato, estado, vigente_hasta, status },
    { imagen: [portadaIdParaActualizar] },
    [portadaIdParaActualizar],
    { imagen: { id: portadaIdParaActualizar } },
]
```

**Líneas modificadas**: ~1000-1160 (GET), ~260-506 (PUT)

---

### 7. `AlmonteIntranet/src/layouts/components/topbar/components/UserProfile.tsx`

**Cambios**:
1. **Limpieza de logs de debug** - Eliminados `console.log` y `console.warn` innecesarios
2. **Mantenida funcionalidad** de obtención de avatar (sin cambios en lógica)

**Eliminado**:
```typescript
console.log('[Topbar UserProfile] persona:', persona)
console.log('[Topbar UserProfile] persona?.imagen:', persona?.imagen)
console.warn('[Topbar UserProfile] ⚠️ No hay imagen en persona')
// ... más logs
```

---

### 8. `AlmonteIntranet/src/app/(admin)/(apps)/users/profile/components/ProfileBanner.tsx`

**Nota**: Este archivo fue creado, pero también se modificó para limpiar logs.

**Eliminado**: Todos los `console.log` y `console.warn` de debug

**Mantenido**: Lógica completa de carga y manejo de portada

---

## 🔧 Cambios en Strapi (REQUERIDO)

### Campo `portada` en Content Type `Persona`

Se debe agregar el campo `portada` al Content Type `Persona` en Strapi con la misma estructura que el campo `imagen`.

**Estructura**:
- **Tipo**: Componente
- **Componente**: `contacto.imagen` (mismo que `imagen`)
- **Configuración**:
  - `imagen`: Multiple Media (array de archivos)
  - `tipo`: Text (opcional)
  - `formato`: Enum (opcional)
  - `estado`: Enum (opcional)
  - `vigente_hasta`: Date (opcional)
  - `status`: Boolean (default: true)

**Archivo de prompt para Strapi Cursor**: `PROMPT_STRAPI_PORTADA.md` (ya existe en el repositorio)

---

## 📝 Instrucciones de Integración

### Paso 1: Actualizar Strapi
1. Agregar el campo `portada` al Content Type `Persona` usando el componente `contacto.imagen`
2. Verificar que la estructura sea idéntica a `imagen`

### Paso 2: Copiar Archivos

**Archivos nuevos** (copiar completamente):
1. `AlmonteIntranet/src/app/(admin)/(apps)/users/profile/[id]/page.tsx`
2. `AlmonteIntranet/src/app/(admin)/(apps)/users/profile/components/ProfileBanner.tsx`

### Paso 3: Modificar Archivos Existentes

Para cada archivo modificado:

#### A. `users/profile/page.tsx`
- Agregar import de `ProfileBanner`
- Reemplazar breadcrumb con traducción
- Usar componente `ProfileBanner`

#### B. `users/profile/components/Profile.tsx`
- Agregar prop `colaboradorId?: string`
- Modificar `loadProfile` para usar endpoint condicional
- Normalizar estructura de datos

#### C. `users/profile/components/Account.tsx`
- Agregar prop `colaboradorId?: string`
- Agregar estado `viewingProfileData`
- Modificar lógica de carga de datos
- Corregir "Sobre Mí" y Timeline para usar datos correctos
- Ocultar formularios cuando `colaboradorId` está presente

#### D. `chat/page.tsx`
- Agregar botón "Ver Perfil" en la lista de contactos
- Mejorar función `getColaboradorAvatar`

#### E. `api/colaboradores/[id]/route.ts`
- Agregar populate de `portada` en GET
- Agregar normalización de `portada`

#### F. `api/colaboradores/me/profile/route.ts`
- Agregar populate de `portada` en GET
- Agregar normalización de `portada`
- Agregar soporte para `portada_id` en PUT
- Agregar lógica de actualización de componente `portada`

#### G. `layouts/components/topbar/components/UserProfile.tsx`
- Eliminar logs de debug

### Paso 4: Verificar Dependencias

Asegurarse de que estos endpoints existan:
- `/api/tienda/upload` (para subir imágenes)
- `/api/logs/usuario/[id]` (para timeline)

### Paso 5: Testing

**Casos de prueba**:
1. ✅ Ver perfil propio - debe mostrar datos correctos
2. ✅ Ver perfil de otro desde chat - debe mostrar datos del otro colaborador
3. ✅ Cambiar portada propia - debe subir y actualizar
4. ✅ Ver portada de otro - debe mostrarse correctamente
5. ✅ Timeline debe mostrar actividades del perfil correcto
6. ✅ "Sobre Mí" debe mostrar datos del perfil correcto
7. ✅ Imágenes de perfil deben mostrarse en chat
8. ✅ Botón "Ver Perfil" funciona en chat

---

## 🐛 Problemas Resueltos

### Problema 1: Otros colaboradores no veían imagen de perfil
**Causa**: La estructura de datos no se normalizaba correctamente desde la API
**Solución**: Mejora en `getColaboradorAvatar` y normalización en APIs

### Problema 2: "Sobre Mí" mostraba datos del usuario autenticado
**Causa**: No se distinguía entre perfil propio y perfil de otro
**Solución**: Estado `viewingProfileData` y lógica condicional

### Problema 3: Timeline mostraba nombre incorrecto
**Causa**: Usaba datos del usuario autenticado en lugar del perfil visto
**Solución**: Uso de `targetColaboradorId` y `viewingProfileData`

### Problema 4: Portada no se actualizaba en Strapi
**Causa**: La actualización solo se intentaba si había otros campos
**Solución**: Lógica independiente para `portada_id` e `imagen_id`

### Problema 5: TypeScript errors en build
**Causa**: Acceso a propiedades que no existían en tipos normalizados
**Solución**: Type assertions y mejor manejo de estructuras

---

## 📚 Estructura de Datos

### Estructura de `portada` (componente contacto.imagen):
```typescript
{
  id?: number,
  tipo?: string,
  formato?: string,
  estado?: string,
  vigente_hasta?: string,
  status?: boolean,
  imagen: [
    {
      url: string,
      alternativeText?: string,
      width?: number,
      height?: number,
      name?: string,
      formats?: any
    }
  ]
}
```

### Estructura normalizada (frontend):
```typescript
{
  url: string,
  alternativeText?: string,
  width?: number,
  height?: number
}
```

---

## 🔗 Endpoints Utilizados

### GET
- `/api/colaboradores/[id]` - Obtener colaborador por ID
- `/api/colaboradores/me/profile` - Obtener perfil del autenticado
- `/api/logs/usuario/[id]` - Obtener timeline del usuario

### PUT
- `/api/colaboradores/me/profile` - Actualizar perfil (incluye `portada_id`)

### POST
- `/api/tienda/upload` - Subir imagen (retorna `id` del archivo)

---

## 📦 Commits Sugeridos

```bash
git add "AlmonteIntranet/src/app/(admin)/(apps)/users/profile/[id]"
git commit -m "feat: Agregar ruta dinámica para ver perfiles de otros colaboradores"

git add "AlmonteIntranet/src/app/(admin)/(apps)/users/profile/components/ProfileBanner.tsx"
git commit -m "feat: Componente para gestionar portada de perfil"

git add "AlmonteIntranet/src/app/(admin)/(apps)/users/profile/components/Profile.tsx"
git add "AlmonteIntranet/src/app/(admin)/(apps)/users/profile/components/Account.tsx"
git commit -m "feat: Permitir ver perfil de otros colaboradores con datos correctos"

git add "AlmonteIntranet/src/app/(admin)/(apps)/chat/page.tsx"
git commit -m "feat: Botón 'Ver Perfil' en chat y mejora de avatares"

git add "AlmonteIntranet/src/app/api/colaboradores/[id]/route.ts"
git add "AlmonteIntranet/src/app/api/colaboradores/me/profile/route.ts"
git commit -m "feat: Soporte para portada en APIs de perfil"

git add "AlmonteIntranet/src/app/(admin)/(apps)/users/profile/page.tsx"
git add "AlmonteIntranet/src/layouts/components/topbar/components/UserProfile.tsx"
git commit -m "chore: Traducir a español y limpiar logs de debug"
```

---

## ⚠️ Notas Importantes

1. **Strapi es requerido**: El campo `portada` debe existir en Strapi antes de desplegar
2. **Estructura de componente**: La portada usa el mismo componente `contacto.imagen` que la imagen de perfil
3. **Populate anidado**: Se requiere populate anidado `populate[portada][populate][imagen][populate]=*`
4. **Normalización**: Siempre normalizar datos de Strapi porque pueden venir en múltiples estructuras
5. **IDs**: Usar `documentId` preferentemente sobre `id` numérico (más confiable en Strapi v4/v5)

---

## ✅ Checklist de Integración

- [ ] Campo `portada` agregado en Strapi
- [ ] Archivo `[id]/page.tsx` creado
- [ ] Componente `ProfileBanner.tsx` creado
- [ ] `Profile.tsx` modificado con prop `colaboradorId`
- [ ] `Account.tsx` modificado con `viewingProfileData`
- [ ] Botón "Ver Perfil" agregado en chat
- [ ] API `[id]` modificada con populate y normalización de portada
- [ ] API `me/profile` modificada con soporte de portada
- [ ] Logs de debug eliminados
- [ ] Textos traducidos a español
- [ ] Testing completo realizado

---

**Última actualización**: Diciembre 2024  
**Branch**: `infanteDev`  
**Autor**: AI Assistant + Usuario



