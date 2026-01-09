/**
 * Endpoint temporal de debug para ver la estructura exacta de la imagen en Strapi
 * DELETE después de usar
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const rut = searchParams.get('rut')
    const personaId = searchParams.get('personaId')

    if (!rut && !personaId) {
      return NextResponse.json(
        { error: 'Se requiere rut o personaId' },
        { status: 400 }
      )
    }

    let query = ''
    if (personaId) {
      // Probar diferentes estructuras de populate
      query = `/api/personas/${personaId}?populate[imagen][populate][imagen][populate]=*`
    } else if (rut) {
      query = `/api/personas?filters[rut][$eq]=${encodeURIComponent(rut)}&populate[imagen][populate][imagen][populate]=*&pagination[pageSize]=1`
    }

    console.log('[DEBUG] Consultando Strapi con query:', query)

    const response = await strapiClient.get<any>(query)
    
    let personaData = response.data
    if (Array.isArray(personaData)) {
      personaData = personaData[0]
    }

    const personaAttrs = personaData?.attributes || personaData || {}
    const imagen = personaAttrs.imagen

    // Probar también con populate simple
    let querySimple = ''
    if (personaId) {
      querySimple = `/api/personas/${personaId}?populate=*`
    } else if (rut) {
      querySimple = `/api/personas?filters[rut][$eq]=${encodeURIComponent(rut)}&populate=*&pagination[pageSize]=1`
    }

    let responseSimple: any = null
    let imagenSimple: any = null
    try {
      responseSimple = await strapiClient.get<any>(querySimple)
      let personaDataSimple = responseSimple.data
      if (Array.isArray(personaDataSimple)) {
        personaDataSimple = personaDataSimple[0]
      }
      const personaAttrsSimple = personaDataSimple?.attributes || personaDataSimple || {}
      imagenSimple = personaAttrsSimple.imagen
    } catch (error: any) {
      console.warn('[DEBUG] Error con populate=*:', error.message)
    }

    return NextResponse.json({
      success: true,
      rut: rut || null,
      personaId: personaId || null,
      estructura: {
        conPopulateAnidado: {
          query,
          imagen: imagen,
          imagenString: JSON.stringify(imagen, null, 2),
          tipo: typeof imagen,
          esNull: imagen === null,
          esUndefined: imagen === undefined,
          keys: imagen ? Object.keys(imagen) : [],
        },
        conPopulateSimple: {
          query: querySimple,
          imagen: imagenSimple,
          imagenString: JSON.stringify(imagenSimple, null, 2),
          tipo: typeof imagenSimple,
          esNull: imagenSimple === null,
          esUndefined: imagenSimple === undefined,
          keys: imagenSimple ? Object.keys(imagenSimple) : [],
        },
        personaCompleta: {
          id: personaData?.id,
          documentId: personaData?.documentId,
          attributes: personaAttrs,
        },
      },
    }, { status: 200 })
  } catch (error: any) {
    console.error('[DEBUG] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    )
  }
}

