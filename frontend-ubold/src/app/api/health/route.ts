import { NextResponse } from 'next/server'

<<<<<<< HEAD
=======
export const dynamic = 'force-dynamic'

>>>>>>> origin/mati-integracion
export async function GET() {
  return NextResponse.json(
    { status: 'ok', timestamp: new Date().toISOString() },
    { status: 200 }
  )
}




