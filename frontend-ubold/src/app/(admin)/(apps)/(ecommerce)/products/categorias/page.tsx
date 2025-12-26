'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Container } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'

export default function CategoriasPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirigir a solicitudes de categorías
    router.replace('/products/categorias/solicitudes')
  }, [router])

  return (
    <Container fluid>
      <PageBreadcrumb title="Categorías" subtitle="Ecommerce" />
      <div className="text-center py-5">
        <p>Redirigiendo...</p>
      </div>
    </Container>
  )
}

