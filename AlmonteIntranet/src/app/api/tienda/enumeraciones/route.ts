import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Valores hardcodeados basados en el error de Strapi
  return NextResponse.json({
    success: true,
    data: {
      tipo_libro: [
        'Plan Lector',
        'Texto Curricular',
        'Texto PAES',
        'Texto Complementario',
        'Otro'
      ],
      idioma: [
        'Español',
        'Inglés',
        'Francés',
        'Alemán',
        'Portugués',
        'Otro'
      ],
      estado_edicion: [
        'Vigente',
        'Agotado',
        'Descatalogado',
        'Próximamente'
      ]
    }
  })
}

