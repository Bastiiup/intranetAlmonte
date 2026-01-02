/**
 * Script para configurar permisos del content type intranet-chats
 * en el rol "Authenticated" de Strapi
 * 
 * Uso: node scripts/configurar-permisos-chat.js
 */

// Cargar variables de entorno desde .env.local si existe
try {
  require('dotenv').config({ path: '.env.local' })
} catch (e) {
  // Ignorar si no existe
}

// También intentar cargar desde .env
try {
  require('dotenv').config({ path: '.env' })
} catch (e) {
  // Ignorar si no existe
}

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || process.env.STRAPI_URL || 'https://strapi.moraleja.cl'
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN || process.argv[2]

if (!STRAPI_API_TOKEN) {
  console.error('❌ Error: STRAPI_API_TOKEN no está configurado')
  console.error('   Opciones:')
  console.error('   1. Configurar en .env.local: STRAPI_API_TOKEN=tu_token')
  console.error('   2. Pasar como argumento: node scripts/configurar-permisos-chat.js tu_token')
  console.error('   3. Variable de entorno: $env:STRAPI_API_TOKEN="tu_token" (PowerShell)')
  process.exit(1)
}

async function configurarPermisos() {
  try {
    console.log('🔧 Configurando permisos para intranet-chats...')
    console.log(`📍 Strapi URL: ${STRAPI_URL}`)

    // 1. Obtener el rol "Authenticated"
    console.log('\n1️⃣ Obteniendo rol "Authenticated"...')
    console.log(`   Intentando: ${STRAPI_URL}/api/users-permissions/roles`)
    
    const rolesResponse = await fetch(`${STRAPI_URL}/api/users-permissions/roles`, {
      headers: {
        'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    })

    if (!rolesResponse.ok) {
      const errorText = await rolesResponse.text()
      console.error(`   ❌ Error ${rolesResponse.status}: ${errorText}`)
      
      // Intentar con el endpoint de admin
      console.log('\n   🔄 Intentando con endpoint de admin...')
      const adminRolesResponse = await fetch(`${STRAPI_URL}/admin/users-permissions/roles`, {
        headers: {
          'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (!adminRolesResponse.ok) {
        const adminErrorText = await adminRolesResponse.text()
        throw new Error(`Error al obtener roles (admin): ${adminRolesResponse.status} ${adminRolesResponse.statusText}\n${adminErrorText}`)
      }
      
      const adminRolesData = await adminRolesResponse.json()
      const authenticatedRole = adminRolesData.find((role) => role.type === 'authenticated')
      
      if (!authenticatedRole) {
        throw new Error('No se encontró el rol "Authenticated"')
      }
      
      console.log(`✅ Rol encontrado: ID ${authenticatedRole.id}`)
      // Continuar con el resto del código usando authenticatedRole
      // (necesitaríamos ajustar el resto del código también)
      throw new Error('Endpoint de admin encontrado, pero necesitamos ajustar el código. Por favor, configura los permisos manualmente en el admin de Strapi.')
    }

    const rolesData = await rolesResponse.json()
    const authenticatedRole = rolesData.roles?.find((role) => role.type === 'authenticated')

    if (!authenticatedRole) {
      throw new Error('No se encontró el rol "Authenticated"')
    }

    console.log(`✅ Rol encontrado: ID ${authenticatedRole.id}`)

    // 2. Obtener permisos actuales
    console.log('\n2️⃣ Obteniendo permisos actuales...')
    const permissionsResponse = await fetch(
      `${STRAPI_URL}/api/users-permissions/roles/${authenticatedRole.id}`,
      {
        headers: {
          'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!permissionsResponse.ok) {
      throw new Error(`Error al obtener permisos: ${permissionsResponse.status} ${permissionsResponse.statusText}`)
    }

    const roleData = await permissionsResponse.json()
    console.log(`✅ Permisos actuales obtenidos`)

    // 3. Preparar permisos para intranet-chat
    const accionesNecesarias = ['find', 'findOne', 'create', 'update', 'delete']
    const permisosActuales = roleData.role?.permissions || []
    
    console.log('\n3️⃣ Analizando permisos actuales...')
    console.log(`   Permisos a configurar para intranet-chat:`)
    
    const permisosParaAgregar = []
    accionesNecesarias.forEach((accion) => {
      const accionCompleta = `api::intranet-chat.intranet-chat.${accion}`
      const existe = permisosActuales.some((p) => p.action === accionCompleta)
      console.log(`   - ${accion}: ${existe ? '✅ Ya existe' : '➕ Se agregará'}`)
      if (!existe) {
        permisosParaAgregar.push(accionCompleta)
      }
    })

    if (permisosParaAgregar.length === 0) {
      console.log('\n✅ Todos los permisos ya están configurados!')
      return
    }

    // 4. Crear los permisos faltantes
    console.log(`\n4️⃣ Creando ${permisosParaAgregar.length} permisos...`)
    for (const accion of permisosParaAgregar) {
      const createResponse = await fetch(`${STRAPI_URL}/api/users-permissions/permissions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            action,
            role: authenticatedRole.id,
          },
        }),
      })

      if (!createResponse.ok) {
        const errorText = await createResponse.text()
        console.warn(`   ⚠️  No se pudo crear permiso ${accion}: ${createResponse.status}`)
        console.warn(`   ${errorText}`)
      } else {
        console.log(`   ✅ Permiso creado: ${accion}`)
      }
    }

    // 5. Verificar que se crearon correctamente
    console.log('\n5️⃣ Verificando permisos finales...')
    const verifyResponse = await fetch(
      `${STRAPI_URL}/api/users-permissions/roles/${authenticatedRole.id}`,
      {
        headers: {
          'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (verifyResponse.ok) {
      const verifyData = await verifyResponse.json()
      const permisosFinales = verifyData.role?.permissions || []
      const permisosChat = permisosFinales.filter((p) =>
        p.action?.includes('api::intranet-chat.intranet-chat')
      )

      console.log(`   ✅ Permisos de intranet-chat configurados: ${permisosChat.length}`)
      permisosChat.forEach((p) => {
        const accion = p.action.split('.').pop()
        console.log(`      - ${accion}`)
      })
    }

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text()
      throw new Error(`Error al actualizar permisos: ${updateResponse.status} ${updateResponse.statusText}\n${errorText}`)
    }

    const updateData = await updateResponse.json()
    console.log('\n✅ Permisos actualizados correctamente!')
    console.log('\n📋 Resumen:')
    console.log(`   - Rol: ${authenticatedRole.name} (${authenticatedRole.type})`)
    console.log(`   - Content Type: intranet-chat`)
    console.log(`   - Permisos configurados: ${accionesNecesarias.join(', ')}`)
    console.log('\n💡 Nota: Puede ser necesario reiniciar Strapi para que los cambios surtan efecto.')

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    if (error.stack) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

// Ejecutar
configurarPermisos()

