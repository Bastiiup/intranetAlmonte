import { Container } from 'react-bootstrap'
import { headers } from 'next/headers'
import type { Metadata } from 'next'
import ValidacionLista from '@/app/(admin)/(apps)/crm/listas/[id]/validacion/components/ValidacionLista'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Validación de Lista de Útiles',
}

export default async function ValidacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let lista: any = null
  let error: string | null = null

  try {
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    // Obtener la lista completa con todos los datos del curso
    const response = await fetch(`${baseUrl}/api/crm/listas/${id}`, {
      cache: 'no-store',
    })
    
    const data = await response.json()
    
    if (data.success && data.data) {
      lista = data.data
    } else {
      error = data.error || 'Error al obtener la lista'
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
  }

  return (
    <Container fluid className="p-0">
      <ValidacionLista lista={lista} error={error} />
    </Container>
  )
}
