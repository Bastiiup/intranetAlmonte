'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Container } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'

export default function EtiquetasPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirigir a solicitudes de etiquetas
    router.replace('/products/etiquetas/solicitudes')
  }, [router])

  return (
    <Container fluid>
      <PageBreadcrumb title="Etiquetas" subtitle="Ecommerce" />
      <div className="text-center py-5">
        <p>Redirigiendo...</p>
      </div>
    </Container>
  )
}

