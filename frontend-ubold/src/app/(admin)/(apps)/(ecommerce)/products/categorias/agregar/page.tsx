'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Container } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'

export default function AgregarCategoriaPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirigir a solicitudes de categorías donde se pueden crear nuevas
    router.replace('/products/categorias/solicitudes')
  }, [router])

  return (
    <Container fluid>
      <PageBreadcrumb title="Agregar Categoría" subtitle="Ecommerce" />
      <div className="text-center py-5">
        <p>Redirigiendo...</p>
      </div>
    </Container>
  )
}

