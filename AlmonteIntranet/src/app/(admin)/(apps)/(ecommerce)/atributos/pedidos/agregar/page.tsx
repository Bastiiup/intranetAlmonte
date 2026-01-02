import { Container } from 'react-bootstrap'
import type { Metadata } from 'next'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import AddPedidoForm from '../components/AddPedidoForm'

export const metadata: Metadata = {
  title: 'Agregar Pedido',
}

export default function Page() {
  return (
    <Container fluid>
      <PageBreadcrumb title="Agregar Pedido" subtitle="Ecommerce" />
      <AddPedidoForm />
    </Container>
  )
}

