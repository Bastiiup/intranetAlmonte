# Contexto Completo del Proyecto - Sistema de Chat e Intranet

## Resumen General

Este proyecto es una intranet desarrollada con Next.js (frontend) y Strapi (backend/CMS). El sistema permite a colaboradores de la empresa iniciar sesión y comunicarse mediante un chat interno.

## 1. Sistema de Autenticación

### 1.1 Content Types en Strapi

#### Intranet-Colaboradores (`api::colaborador.colaborador`)
- **Propósito**: Representa a los colaboradores internos de la empresa que pueden acceder a la intranet
- **Campos principales**:
  - `persona` (relación oneToOne con `api::persona.persona`): Datos personales del colaborador
  - `email_login` (email, required, unique): Email usado para iniciar sesión
  - `password` (password, private): Contraseña (referencia, el hash real está en `users-permissions`)
  - `usuario` (relación oneToOne con `plugin::users-permissions.user`): Usuario de Strapi vinculado
  - `activo` (boolean, default: true): Si el colaborador está activo
  - `rol` (enumeration): Rol del colaborador (super_admin, encargado_adquisiciones, supervisor, soporte)

#### Persona (`api::persona.persona`)
- **Propósito**: Datos personales generales (contactos académicos y generales)
- **Campos relevantes para el chat**:
  - `rut` (string, unique): RUT de la persona (usado como identificador principal)
  - `nombres`, `primer_apellido`, `segundo_apellido`: Componentes del nombre
  - `nombre_completo` (string): Nombre completo calculado
  - `emails` (componente repeatable): Lista de emails
  - `telefonos` (componente repeatable): Lista de teléfonos
  - `imagen` (componente): Avatar/foto de perfil

### 1.2 Flujo de Login

1. **Frontend** (`/api/auth/login`):
   - Recibe `email_login` y `password` del formulario
   - Hace POST a Strapi: `/api/colaboradores/login` (endpoint personalizado)

2. **Backend Strapi** (`/api/colaboradores/login`):
   - Busca colaborador por `email_login`
   - Verifica que esté `activo`
   - Compara `password` usando `bcryptjs`
   - Si es correcto, genera JWT usando el usuario vinculado en `users-permissions`
   - Retorna: `jwt`, `usuario`, `colaborador` (con datos de `persona` poblados)

3. **Frontend después del login**:
   - Guarda en `localStorage`:
     - `auth_token`: JWT
     - `auth_user`: Datos del usuario
     - `auth_colaborador`: Datos del colaborador con persona

4. **Hook `useAuth`**:
   - Lee datos de `localStorage`
   - Proporciona: `colaborador`, `persona`, `loading`, `isAuthenticated`
   - Helper functions: `getPersonaNombre()`, `getPersonaEmail()`, `getRolLabel()`, etc.

### 1.3 Endpoint Personalizado de Login

**Ubicación**: `BdEstructura/strapi/src/api/colaborador/controllers/colaborador.ts`

```typescript
async login(ctx: any) {
  // 1. Obtener email_login y password del body
  // 2. Buscar colaborador por email_login
  // 3. Verificar password con bcrypt.compare()
  // 4. Generar JWT con el usuario vinculado
  // 5. Retornar jwt, usuario, colaborador (con persona poblada)
}
```

**Ruta**: `BdEstructura/strapi/src/api/colaborador/routes/colaborador.ts`
- Agrega ruta personalizada: `POST /api/colaboradores/login`
- Configurada como `auth: false` (pública)

## 2. Sistema de Chat

### 2.1 Content Type: Intranet-Chats

**Ubicación**: `BdEstructura/strapi/src/api/intranet-chat/content-types/intranet-chat/schema.json`

```json
{
  "kind": "collectionType",
  "collectionName": "intranet_chats",
  "attributes": {
    "texto": { "type": "text", "required": true },
    "remitente_id": { "type": "integer", "required": true },
    "cliente_id": { "type": "integer", "required": true },
    "fecha": { "type": "datetime", "required": true },
    "leido": { "type": "boolean", "default": false }
  }
}
```

**Nota importante**: Aunque el campo se llama `cliente_id`, en realidad representa el ID del colaborador destinatario (no de un cliente de WooCommerce). Esto es un legado del diseño original.

### 2.2 Estructura de Mensajes

- `remitente_id`: ID del colaborador que envía el mensaje
- `cliente_id`: ID del colaborador que recibe el mensaje (destinatario)
- `texto`: Contenido del mensaje
- `fecha`: Fecha/hora del mensaje
- `leido`: Si el mensaje fue leído

### 2.3 API Routes del Frontend

#### GET `/api/chat/colaboradores`
- **Propósito**: Obtener lista de colaboradores para mostrar en el chat
- **Lógica**:
  - Consulta Strapi: `/api/colaboradores?filters[activo][$eq]=true`
  - Popula `persona` con `emails`, `telefonos`, `imagen`
  - Mapea a `ContactType[]` con: `id`, `name`, `avatar`, `isOnline`

#### GET `/api/chat/mensajes`
- **Parámetros**:
  - `colaborador_id`: ID del colaborador con quien se chatea
  - `remitente_id`: ID del colaborador autenticado (quien solicita)
  - `ultima_fecha` (opcional): Para polling de nuevos mensajes

- **Lógica bidireccional**:
  - **Query 1**: Mensajes que YO envié al otro
    - `filters[remitente_id][$eq]=remitenteIdNum&filters[cliente_id][$eq]=colaboradorIdNum`
    - Con filtro de fecha si `ultima_fecha` existe
  
  - **Query 2**: Mensajes que el OTRO me envió a mí
    - `filters[remitente_id][$eq]=colaboradorIdNum&filters[cliente_id][$eq]=remitenteIdNum`
    - **SIN filtro de fecha** (para obtener todos los mensajes recibidos)
  
  - Combina resultados de ambas queries
  - Ordena por fecha ascendente

#### POST `/api/chat/mensajes`
- **Body**: `{ texto, colaborador_id, remitente_id }`
- **Lógica**:
  - Crea mensaje en Strapi: `/api/intranet-chats`
  - Guarda con: `remitente_id`, `cliente_id` (usando `colaborador_id`), `fecha` (ISO string), `leido: false`

### 2.4 Componente de Chat

**Ubicación**: `frontend-ubold/src/app/(admin)/(apps)/chat/page.tsx`

**Funcionalidades principales**:

1. **Carga de contactos**:
   - Usa `useAuth()` para obtener `currentUserId`
   - Llama a `/api/chat/colaboradores`
   - Filtra colaboradores activos con persona
   - Mapea a `ContactType[]`

2. **Carga de mensajes**:
   - Cuando se selecciona un contacto, carga mensajes iniciales
   - Configura polling cada 1 segundo para nuevos mensajes
   - Usa `ultima_fecha` para obtener solo mensajes nuevos en polling

3. **Envío de mensajes**:
   - Llama a `POST /api/chat/mensajes`
   - Después de enviar, recarga todos los mensajes (sin filtro de fecha)

4. **Visualización**:
   - Mensajes del usuario actual: Derecha, burbuja azul (`bg-info-subtle`)
   - Mensajes del otro usuario: Izquierda, burbuja amarilla (`bg-warning-subtle`)
   - Compara `message.senderId` con `currentUserId` para determinar posición

### 2.5 Tipos TypeScript

**Ubicación**: `frontend-ubold/src/app/(admin)/(apps)/chat/types.ts`

```typescript
export type ContactType = {
  id: string
  name: string
  avatar?: StaticImageData | string
  lastMessage?: string
  timestamp?: string
  unreadMessages?: number
  isOnline: boolean
}

export type MessageType = {
  id: string
  senderId: string
  text: string
  time: string
}
```

## 3. Problemas Identificados y Estado Actual

### 3.1 Problema Principal: Mensajes Bidireccionales No Funcionan

**Síntoma**: 
- Los mensajes que un usuario envía aparecen correctamente
- Los mensajes que el otro usuario envía NO aparecen en el chat del primero

**Logs observados**:
```
Query 1 (mensajes que yo envié): ✅ Encuentra mensajes
Query 2 (mensajes que recibí): ❌ Siempre devuelve 0 resultados
```

**Posibles causas**:
1. Los mensajes no se están guardando correctamente cuando el otro usuario envía
2. La Query 2 no está encontrando los mensajes (problema con filtros de Strapi)
3. El filtro de fecha estaba excluyendo mensajes (ya corregido - Query 2 ahora no usa filtro de fecha)

### 3.2 Cambios Recientes

1. **Eliminado filtro de fecha de Query 2**: Para asegurar que se obtengan todos los mensajes recibidos
2. **Logs detallados agregados**: Para debug de ambas queries
3. **Dos queries separadas**: En lugar de usar `$or` (que no funcionaba correctamente)

### 3.3 Estado Actual del Código

- **Autenticación**: ✅ Funcionando correctamente
- **Carga de contactos**: ✅ Funcionando correctamente
- **Envío de mensajes**: ✅ Los mensajes se guardan en Strapi
- **Visualización de mensajes propios**: ✅ Funcionando
- **Visualización de mensajes recibidos**: ❌ NO funciona (Query 2 devuelve 0)

## 4. Estructura de Archivos Relevantes

### Frontend (Next.js)

```
frontend-ubold/
├── src/
│   ├── app/
│   │   ├── (admin)/(apps)/chat/
│   │   │   ├── page.tsx                    # Componente principal del chat
│   │   │   ├── components/
│   │   │   │   └── ContactList.tsx         # Lista de contactos
│   │   │   └── types.ts                    # Tipos TypeScript
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── login/
│   │   │   │       └── route.ts            # Endpoint de login
│   │   │   └── chat/
│   │   │       ├── colaboradores/
│   │   │       │   └── route.ts            # GET colaboradores
│   │   │       └── mensajes/
│   │   │           └── route.ts            # GET/POST mensajes
│   │   └── (auth)/auth-1/sign-in/
│   │       └── page.tsx                    # Página de login
│   ├── hooks/
│   │   └── useAuth.ts                      # Hook de autenticación
│   └── lib/
│       ├── auth.ts                          # Utilidades de auth
│       └── strapi/
│           ├── client.ts                    # Cliente HTTP de Strapi
│           ├── config.ts                    # Configuración
│           └── types.ts                     # Tipos de Strapi
```

### Backend (Strapi)

```
BdEstructura/strapi/
├── src/
│   ├── api/
│   │   ├── colaborador/
│   │   │   ├── content-types/colaborador/
│   │   │   │   └── schema.json             # Schema de Intranet-Colaboradores
│   │   │   ├── controllers/
│   │   │   │   └── colaborador.ts          # Controller con método login()
│   │   │   └── routes/
│   │   │       └── colaborador.ts         # Rutas (incluye /login)
│   │   ├── intranet-chat/
│   │   │   └── content-types/intranet-chat/
│   │   │       └── schema.json            # Schema de Intranet-Chats
│   │   └── persona/
│   │       └── content-types/persona/
│   │           └── schema.json             # Schema de Persona
│   └── index.js                             # Bootstrap de Strapi
```

## 5. Variables de Entorno Necesarias

### Frontend (.env.local)
```
NEXT_PUBLIC_STRAPI_URL=https://strapi.moraleja.cl
STRAPI_API_TOKEN=... (token de API de Strapi)
```

### Strapi
- Configuración estándar de Strapi
- Base de datos PostgreSQL (producción) o SQLite (desarrollo)

## 6. Flujo Completo de un Mensaje

1. **Usuario A envía mensaje a Usuario B**:
   - Frontend: `POST /api/chat/mensajes` con `{ texto, colaborador_id: B, remitente_id: A }`
   - API Route: Crea en Strapi con `remitente_id: A, cliente_id: B`
   - Strapi guarda el mensaje

2. **Usuario B carga mensajes con Usuario A**:
   - Frontend: `GET /api/chat/mensajes?colaborador_id=A&remitente_id=B`
   - API Route ejecuta dos queries:
     - Query 1: `remitente_id=B AND cliente_id=A` (mensajes que B envió a A)
     - Query 2: `remitente_id=A AND cliente_id=B` (mensajes que A envió a B) ← **ESTA NO FUNCIONA**
   - Frontend recibe solo resultados de Query 1
   - Frontend muestra mensajes (solo los que B envió, no los que recibió)

3. **Polling**:
   - Cada 1 segundo, se hace GET con `ultima_fecha`
   - Query 1 usa filtro de fecha (solo nuevos mensajes enviados)
   - Query 2 NO usa filtro de fecha (todos los mensajes recibidos)

## 7. Próximos Pasos para Resolver el Problema

1. **Verificar que los mensajes se guarden correctamente**:
   - Revisar logs de `[API /chat/mensajes POST] Mensaje guardado:`
   - Confirmar que `remitente_id` y `cliente_id` sean correctos

2. **Debug de Query 2**:
   - Verificar que la URL de Query 2 sea correcta
   - Probar la query directamente en Strapi Admin o con Postman
   - Verificar permisos del content type `intranet-chats`

3. **Alternativas si Query 2 no funciona**:
   - Usar `entityService` directamente en lugar de API REST
   - Crear un endpoint personalizado en Strapi para obtener mensajes bidireccionales
   - Revisar si hay algún lifecycle hook que esté interfiriendo

## 8. Notas Técnicas Importantes

- **IDs de colaboradores**: Se usan los IDs numéricos de `Intranet-Colaboradores`
- **Comparación de IDs**: Siempre convertir a string para comparar (`String(id)`)
- **Polling interval**: 1 segundo (1000ms)
- **Manejo de datos de Strapi**: Los datos pueden venir en `attributes` o directamente, el código maneja ambos casos
- **Timezone**: Las fechas se manejan en ISO string, el frontend las formatea a hora local

## 9. Comandos Útiles

```bash
# Frontend
cd C:\Trabajo\Intranet\frontend-ubold
npm run dev          # Desarrollo local
npm run build        # Build de producción

# Strapi
cd C:\Trabajo\Strapi\BdEstructura\strapi
npm run develop      # Desarrollo local
npm run build        # Build de producción

# Git
git branch           # Ver ramas
git status           # Ver cambios
git log --oneline    # Ver commits recientes
```

## 10. Repositorios

- **Frontend**: `https://github.com/subimeDev/intranetAlmonte.git` (rama: `RamaBastian-Intranet`)
- **Strapi**: `BdEstructura` (rama: `feature/mappers-woocommerce` para content types)

---

**Última actualización**: 17 de diciembre de 2025
**Estado**: En desarrollo - Problema con mensajes bidireccionales pendiente de resolver

