import { Container } from 'react-bootstrap'
import type { Metadata } from 'next'

import BuscarProductoView from './components/BuscarProductoView'
import PageBreadcrumb from '@/components/PageBreadcrumb'

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Buscar Producto - Listas de Útiles',
}

export default async function Page() {
  return (
    <Container fluid>
      <PageBreadcrumb 
        title="Buscar Producto en Todos los Colegios" 
        subtitle="Listas de Útiles" 
      />
      <BuscarProductoView />
    </Container>
  )
}
