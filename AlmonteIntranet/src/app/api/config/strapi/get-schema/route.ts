/**
 * API Route para obtener el schema de un content type desde Strapi
 * Usa el STRAPI_API_TOKEN para autenticarse
 */

import { NextRequest, NextResponse } from 'next/server'
import { STRAPI_API_URL, STRAPI_API_TOKEN } from '@/lib/strapi/config'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const contentType = searchParams.get('contentType') || 'intranet-colaboradores'
    
    if (!STRAPI_API_TOKEN) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'STRAPI_API_TOKEN no está configurado' 
        },
        { status: 500 }
      )
    }

    console.log(`[Get Schema] Obteniendo schema para: ${contentType}`)

    // Método 1: Intentar obtener desde Content Type Builder API
    // El formato del endpoint puede variar según la versión de Strapi
    const possibleEndpoints = [
      `/api/content-type-builder/content-types/api::intranet-colaboradores.intranet-colaboradores`,
      `/api/content-type-builder/content-types/application::intranet-colaboradores.intranet-colaboradores`,
      `/api/content-type-builder/content-types/plugin::users-permissions.user`,
    ]

    let schema = null
    let method = 'none'

    for (const endpoint of possibleEndpoints) {
      try {
        const response = await fetch(`${STRAPI_API_URL}${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          schema = await response.json()
          method = 'content-type-builder'
          console.log(`[Get Schema] ✅ Schema obtenido desde: ${endpoint}`)
          break
        }
      } catch (err) {
        // Continuar con el siguiente endpoint
      }
    }

    // Método 2: Si no funciona, obtener un registro de ejemplo y deducir estructura
    if (!schema) {
      try {
        console.log('[Get Schema] Intentando método alternativo: obtener ejemplo...')
        const exampleResponse = await fetch(
          `${STRAPI_API_URL}/api/${contentType}?pagination[pageSize]=1&populate=*`,
          {
            headers: {
              'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
              'Content-Type': 'application/json',
            },
          }
        )

        if (exampleResponse.ok) {
          const exampleData = await exampleResponse.json()
          method = 'example-deduction'
          
          // Analizar estructura del ejemplo
          const example = Array.isArray(exampleData.data) 
            ? exampleData.data[0] 
            : exampleData.data

          if (example) {
            const attrs = example.attributes || example
            schema = {
              attributes: Object.keys(attrs).reduce((acc: any, key: string) => {
                const value = attrs[key]
                let type = 'string'
                
                if (typeof value === 'boolean') type = 'boolean'
                else if (typeof value === 'number') type = 'number'
                else if (typeof value === 'object' && value !== null) {
                  if (Array.isArray(value)) type = 'relation'
                  else if (value.id) type = 'relation'
                  else type = 'json'
                }
                
                acc[key] = { type, name: key }
                return acc
              }, {}),
            }
            console.log('[Get Schema] ✅ Schema deducido desde ejemplo')
          }
        }
      } catch (err: any) {
        console.error('[Get Schema] Error en método alternativo:', err.message)
      }
    }

    // Método 3: Intentar obtener información desde el endpoint de información
    if (!schema) {
      try {
        const infoResponse = await fetch(
          `${STRAPI_API_URL}/api/${contentType}?pagination[pageSize]=0`,
          {
            headers: {
              'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
              'Content-Type': 'application/json',
            },
          }
        )

        if (infoResponse.ok) {
          const info = await infoResponse.json()
          method = 'info-endpoint'
          schema = {
            meta: info.meta || {},
            structure: 'deduced',
          }
        }
      } catch (err) {
        // Ignorar
      }
    }

    if (!schema) {
      return NextResponse.json(
        {
          success: false,
          error: `No se pudo obtener el schema para ${contentType}. Verifica que el content type exista y que el token tenga permisos.`,
          contentType,
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      contentType,
      method,
      schema,
      strapiUrl: STRAPI_API_URL,
    })
  } catch (error: any) {
    console.error('[Get Schema] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener schema',
      },
      { status: 500 }
    )
  }
}

