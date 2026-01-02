import { Container } from 'react-bootstrap'
import type { Metadata } from 'next'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import AddCuponForm from '../components/AddCuponForm'

export const metadata: Metadata = {
  title: 'Agregar Cupón',
}

export default function Page() {
  return (
    <Container fluid>
      <PageBreadcrumb title="Agregar Cupón" subtitle="Ecommerce" />
      <AddCuponForm />
    </Container>
  )
}
