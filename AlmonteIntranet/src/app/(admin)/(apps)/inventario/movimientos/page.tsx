'use client'

import { Container } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import MovimientosListing from './components/MovimientosListing'

export default function MovimientosInventarioPage() {
  return (
    <Container fluid>
      <PageBreadcrumb 
        title="Movimientos de Inventario" 
        subtitle="Inventario"
        infoText="Historial completo de entradas y salidas de stock. Los movimientos se registran automáticamente al confirmar recepciones de órdenes de compra, ventas, devoluciones y ajustes manuales."
      />
      <MovimientosListing showProductColumn={true} />
    </Container>
  )
}

