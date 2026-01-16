'use client'

import { Card, CardBody, CardHeader, Table, Badge, Button } from 'react-bootstrap'
import { format } from 'date-fns'
import { currency } from '@/helpers'
import Link from 'next/link'
import { TbEye } from 'react-icons/tb'

interface ClientePedidosProps {
  cliente: any
  pedidos: any[]
}

const ClientePedidos = ({ cliente, pedidos }: ClientePedidosProps) => {
  const getStatusBadge = (status: string) => {
    const statusLower = (status || '').toLowerCase()
    const statusMap: Record<string, { variant: string; label: string }> = {
      'completed': { variant: 'success', label: 'Completado' },
      'processing': { variant: 'info', label: 'Procesando' },
      'pending': { variant: 'warning', label: 'Pendiente' },
      'on-hold': { variant: 'secondary', label: 'En Espera' },
      'cancelled': { variant: 'danger', label: 'Cancelado' },
      'refunded': { variant: 'dark', label: 'Reembolsado' },
      'failed': { variant: 'danger', label: 'Fallido' },
    }

    const mapped = statusMap[statusLower] || { variant: 'secondary', label: status || 'Desconocido' }
    return <Badge bg={mapped.variant}>{mapped.label}</Badge>
  }

  if (pedidos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h5 className="mb-0">Pedidos del Cliente</h5>
        </CardHeader>
        <CardBody>
          <p className="text-muted mb-0">Este cliente no tiene pedidos registrados.</p>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <h5 className="mb-0">Pedidos del Cliente ({pedidos.length})</h5>
      </CardHeader>
      <CardBody>
        <div className="table-responsive">
          <Table hover className="mb-0">
            <thead>
              <tr>
                <th>ID Pedido</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Total</th>
                <th>Método de Pago</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((pedido: any) => {
                const fecha = new Date(pedido.date_created)
                const total = parseFloat(pedido.total || '0') || 0
                
                return (
                  <tr key={pedido.id}>
                    <td>#{pedido.id}</td>
                    <td>
                      {format(fecha, 'dd MMM, yyyy')}
                      <br />
                      <small className="text-muted">{format(fecha, 'h:mm a')}</small>
                    </td>
                    <td>{getStatusBadge(pedido.status)}</td>
                    <td>
                      <strong>
                        {currency}
                        {total.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </strong>
                    </td>
                    <td>{pedido.payment_method_title || pedido.payment_method || 'N/A'}</td>
                    <td>
                      <Link href={`/pedidos/${pedido.id}`}>
                        <Button variant="default" size="sm" className="btn-icon rounded-circle">
                          <TbEye className="fs-lg" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        </div>
      </CardBody>
    </Card>
  )
}

export default ClientePedidos

