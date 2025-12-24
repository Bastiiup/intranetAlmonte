import { Container } from 'react-bootstrap'
import { headers } from 'next/headers'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import EditColaboradorForm from '@/app/(admin)/(apps)/colaboradores/components/EditColaboradorForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Editar Colaborador',
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: PageProps) {
  const { id } = await params
  let colaborador: any = null
  let error: string | null = null

  try {
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    const response = await fetch(`${baseUrl}/api/colaboradores/${id}`, {
      cache: 'no-store',
    })
    
    const data = await response.json()
    
    if (data.success && data.data) {
      // La respuesta puede venir en diferentes formatos
      // Caso 1: data.data (anidado)
      // Caso 2: data.data directamente
      colaborador = data.data
      
      // Log para debugging
      console.log('[Colaborador Page] Datos recibidos:', {
        hasData: !!colaborador,
        hasAttributes: !!(colaborador as any)?.attributes,
        hasId: !!(colaborador as any)?.id,
        hasDocumentId: !!(colaborador as any)?.documentId,
        keys: colaborador ? Object.keys(colaborador) : [],
      })
    } else {
      error = data.error || 'Error al obtener colaborador'
      if (data.status === 404) {
        notFound()
      }
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
    console.error('[Colaborador Page] Error:', err)
  }

  if (!colaborador && !error) {
    notFound()
  }

  return (
    <Container fluid>
      <PageBreadcrumb 
        title="Editar Colaborador" 
        subtitle="Colaboradores"
      />
      <EditColaboradorForm colaborador={colaborador} error={error} />
    </Container>
  )
}

