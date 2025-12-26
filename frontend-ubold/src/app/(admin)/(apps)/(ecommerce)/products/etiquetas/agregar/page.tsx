'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Container } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'

export default function AgregarEtiquetaPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirigir a solicitudes de etiquetas donde se pueden crear nuevas
    router.replace('/products/etiquetas/solicitudes')
  }, [router])

  return (
    <Container fluid>
      <PageBreadcrumb title="Agregar Etiqueta" subtitle="Ecommerce" />
      <div className="text-center py-5">
        <p>Redirigiendo...</p>
      </div>
    </Container>
  )
}

