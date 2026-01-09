/**
 * Script temporal para obtener el schema de intranet-colaboradores
 * Ejecutar: npx tsx scripts/get-colaboradores-schema.ts
 */

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://strapi.moraleja.cl'
const STRAPI_TOKEN = '6a6daf581b7f4248d2f27f70a7294ba8d44cca2672e0474a4259df9b5aedffedfe59cd4cffa434912bb0bfa93b6ef0c27b154c3eeda7e132dc22e60d1500e637ced45edff6dff2bd2ff640ab7cd7adfb9f32b5672087add136439729c9cd7c6ba3548816530f150d1e85dd98fd733cade203189e0ff621c3f4f14c08bb057550'
const CONTENT_TYPE = 'intranet-colaboradores'

async function getSchema() {
  console.log(`🔍 Obteniendo schema para: ${CONTENT_TYPE}`)
  console.log(`📍 URL: ${STRAPI_URL}`)

  // Método 1: Intentar Content Type Builder
  const endpoints = [
    `/api/content-type-builder/content-types/api::${CONTENT_TYPE}.${CONTENT_TYPE}`,
    `/api/content-type-builder/content-types/application::${CONTENT_TYPE}.${CONTENT_TYPE}`,
  ]

  for (const endpoint of endpoints) {
    try {
      console.log(`\n📡 Intentando: ${endpoint}`)
      const response = await fetch(`${STRAPI_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${STRAPI_TOKEN}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const schema = await response.json()
        console.log('✅ Schema obtenido desde Content Type Builder')
        console.log(JSON.stringify(schema, null, 2))
        return schema
      } else {
        console.log(`❌ Error ${response.status}: ${response.statusText}`)
      }
    } catch (err: any) {
      console.log(`❌ Error: ${err.message}`)
    }
  }

  // Método 2: Obtener ejemplo y deducir
  console.log(`\n📡 Obteniendo ejemplo de registro...`)
  try {
    const response = await fetch(
      `${STRAPI_URL}/api/${CONTENT_TYPE}?pagination[pageSize]=1&populate=*`,
      {
        headers: {
          'Authorization': `Bearer ${STRAPI_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (response.ok) {
      const data = await response.json()
      const example = Array.isArray(data.data) ? data.data[0] : data.data
      
      if (example) {
        console.log('✅ Ejemplo obtenido, analizando estructura...')
        const attrs = example.attributes || example
        
        const schema = {
          contentType: CONTENT_TYPE,
          attributes: Object.keys(attrs).reduce((acc: any, key: string) => {
            const value = attrs[key]
            let type = 'string'
            let relation = null
            
            if (typeof value === 'boolean') type = 'boolean'
            else if (typeof value === 'number') type = 'number'
            else if (typeof value === 'object' && value !== null) {
              if (Array.isArray(value)) {
                type = 'relation'
                relation = 'manyToMany'
              } else if (value.data) {
                type = 'relation'
                relation = value.data.id ? 'oneToOne' : 'oneToMany'
              } else if (value.id) {
                type = 'relation'
                relation = 'manyToOne'
              } else {
                type = 'json'
              }
            } else if (key.includes('email')) {
              type = 'email'
            }
            
            acc[key] = { 
              type, 
              name: key,
              ...(relation && { relation }),
              example: typeof value === 'object' ? (value.data?.id || value.id || 'object') : value
            }
            return acc
          }, {}),
        }
        
        console.log('\n📋 Schema deducido:')
        console.log(JSON.stringify(schema, null, 2))
        return schema
      }
    } else {
      console.log(`❌ Error ${response.status}: ${response.statusText}`)
      const errorText = await response.text()
      console.log('Error details:', errorText)
    }
  } catch (err: any) {
    console.log(`❌ Error: ${err.message}`)
  }

  return null
}

getSchema().then(schema => {
  if (schema) {
    console.log('\n✅ Schema obtenido exitosamente')
    process.exit(0)
  } else {
    console.log('\n❌ No se pudo obtener el schema')
    process.exit(1)
  }
})

