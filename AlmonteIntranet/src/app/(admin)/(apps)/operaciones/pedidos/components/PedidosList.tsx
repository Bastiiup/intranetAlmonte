'use client'

import { useState } from 'react'
import { Table, Badge, Button, OverlayTrigger, Tooltip } from 'react-bootstrap'
import { LuEye, LuPencil, LuRefreshCw, LuExternalLink, LuCircleAlert } from 'react-icons/lu'
import Link from 'next/link'
import type { SincronizedOrder } from '@/lib/operaciones/types'
import ActualizarPedidoModal from './ActualizarPedidoModal'
import SincronizarPedidoModal from './SincronizarPedidoModal'

interface PedidosListProps {
  pedidos: SincronizedOrder[]
  onUpdate: () => void
}

export default function PedidosList({ pedidos, onUpdate }: PedidosListProps) {
  const [selectedPedido, setSelectedPedido] = useState<SincronizedOrder | null>(null)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [showSyncModal, setShowSyncModal] = useState(false)

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      synced: 'success',
      pending: 'warning',
      conflict: 'danger',
      error: 'danger',
    }
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>
  }

  const getConfidenceBadge = (confidence: string) => {
    const variants: Record<string, string> = {
      high: 'success',
      medium: 'warning',
      low: 'danger',
    }
    return <Badge bg={variants[confidence] || 'secondary'}>{confidence}</Badge>
  }

  const handleUpdate = (pedido: SincronizedOrder) => {
    setSelectedPedido(pedido)
    setShowUpdateModal(true)
  }

  const handleSync = (pedido: SincronizedOrder) => {
    setSelectedPedido(pedido)
    setShowSyncModal(true)
  }

  return (
    <>
      <div className="table-responsive">
        <Table hover>
          <thead>
            <tr>
              <th style={{ width: '15%' }}>Pedido WeareCloud</th>
              <th style={{ width: '15%' }}>Pedido JumpSeller</th>
              <th style={{ width: '20%' }}>Cliente</th>
              <th style={{ width: '10%' }}>Estado Sync</th>
              <th style={{ width: '10%' }}>Confianza</th>
              <th style={{ width: '15%' }}>Última Sincronización</th>
              <th className="text-center" style={{ width: '15%' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.map((pedido) => {
              const wcOrder = pedido.wearecloud_order
              const jsOrder = pedido.jumpseller_order
              const orderId = jsOrder?.id || pedido.id

              // Construir URLs directas a ambos sistemas (funcionan con sesión del navegador)
              const wearecloudUrl = wcOrder?.url || 
                (wcOrder?.warecloud_id ? `https://ecommerce.wareclouds.app/orders/${wcOrder.warecloud_id}` : null) ||
                (wcOrder?.id ? `https://ecommerce.wareclouds.app/orders/${wcOrder.id}` : null) ||
                (wcOrder?.pedido_ecommerce ? `https://ecommerce.wareclouds.app/orders?search=${wcOrder.pedido_ecommerce}` : null)
              
              // URL de JumpSeller admin (funciona con sesión del navegador)
              const jumpsellerUrl = jsOrder?.id 
                ? `https://jumpseller.cl/admin/orders/${jsOrder.id}` 
                : (jsOrder?.order_number ? `https://jumpseller.cl/admin/orders?search=${jsOrder.order_number}` : null)

              return (
                <tr key={pedido.id}>
                  <td>
                    {wcOrder ? (
                      <div>
                        <div className="d-flex align-items-center gap-2">
                          <strong>#{wcOrder.order_number || wcOrder.pedido_ecommerce || wcOrder.warecloud_id || 'N/A'}</strong>
                          {wearecloudUrl && (
                            <a
                              href={wearecloudUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary"
                              title="Abrir en WeareCloud (nueva pestaña)"
                            >
                              <LuExternalLink size={16} />
                            </a>
                          )}
                        </div>
                        {wcOrder.status && wcOrder.status !== 'unknown' && (
                          <Badge bg="info" className="mt-1">
                            {wcOrder.status}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <div>
                        <span className="text-muted">-</span>
                        <div className="text-muted small">No encontrado en WeareCloud</div>
                      </div>
                    )}
                  </td>
                  <td>
                    {jsOrder ? (
                      <div>
                        <div className="d-flex align-items-center gap-2">
                          <strong>#{jsOrder.order_number || jsOrder.id}</strong>
                          {jumpsellerUrl && (
                            <a
                              href={jumpsellerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary"
                              title="Abrir en JumpSeller para editar (nueva pestaña)"
                            >
                              <LuExternalLink size={16} />
                            </a>
                          )}
                        </div>
                        <div className="text-muted small mt-1">
                          {jsOrder.status && (
                            <Badge bg="secondary">
                              {jsOrder.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <span className="text-muted">-</span>
                        <div className="text-muted small">No encontrado en JumpSeller</div>
                      </div>
                    )}
                  </td>
                  <td>
                    {jsOrder?.customer ? (
                      <div>
                        <div>
                          {jsOrder.customer.first_name} {jsOrder.customer.last_name}
                        </div>
                        <div className="text-muted small">{jsOrder.customer.email}</div>
                      </div>
                    ) : wcOrder?.customer ? (
                      <div>
                        <div>{wcOrder.customer.name}</div>
                        <div className="text-muted small">{wcOrder.customer.email}</div>
                      </div>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td>{getStatusBadge(pedido.sync_status)}</td>
                  <td>
                    {pedido.match_confidence && getConfidenceBadge(pedido.match_confidence)}
                    {pedido.match_reason && (
                      <OverlayTrigger
                        placement="top"
                        overlay={
                          <Tooltip id={`tooltip-${pedido.id}`}>
                            {pedido.match_reason}
                          </Tooltip>
                        }
                      >
                        <span className="ms-1">
                          <LuCircleAlert size={14} className="text-muted" />
                        </span>
                      </OverlayTrigger>
                    )}
                  </td>
                  <td>
                    {pedido.last_synced_at ? (
                      <span className="text-muted small">
                        {new Date(pedido.last_synced_at).toLocaleString('es-CL')}
                      </span>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td>
                    <div className="d-flex flex-column gap-1">
                      {/* Enlaces directos a los sistemas - PRIMERO para fácil acceso */}
                      <div className="d-flex gap-1 justify-content-center">
                        {wearecloudUrl && (
                          <OverlayTrigger
                            placement="top"
                            overlay={<Tooltip>Abrir en WeareCloud (nueva pestaña)</Tooltip>}
                          >
                            <Button
                              variant="info"
                              size="sm"
                              href={wearecloudUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              as="a"
                              className="text-white"
                            >
                              <LuExternalLink size={14} className="me-1" />
                              WeareCloud
                            </Button>
                          </OverlayTrigger>
                        )}
                        {jumpsellerUrl && (
                          <OverlayTrigger
                            placement="top"
                            overlay={<Tooltip>Abrir en JumpSeller para editar (nueva pestaña)</Tooltip>}
                          >
                            <Button
                              variant="primary"
                              size="sm"
                              href={jumpsellerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              as="a"
                              className="text-white"
                            >
                              <LuExternalLink size={14} className="me-1" />
                              JumpSeller
                            </Button>
                          </OverlayTrigger>
                        )}
                      </div>
                      
                      {/* Acciones secundarias */}
                      <div className="d-flex gap-1 justify-content-center">
                        <OverlayTrigger
                          placement="top"
                          overlay={<Tooltip>Ver detalle en intranet</Tooltip>}
                        >
                          <Link href={`/operaciones/pedidos/${orderId}`}>
                            <Button variant="outline-secondary" size="sm">
                              <LuEye />
                            </Button>
                          </Link>
                        </OverlayTrigger>
                        {jsOrder && (
                          <OverlayTrigger
                            placement="top"
                            overlay={<Tooltip>Actualizar pedido en JumpSeller</Tooltip>}
                          >
                            <Button
                              variant="outline-success"
                              size="sm"
                              onClick={() => handleUpdate(pedido)}
                            >
                              <LuPencil />
                            </Button>
                          </OverlayTrigger>
                        )}
                        <OverlayTrigger
                          placement="top"
                          overlay={<Tooltip>Sincronizar desde WeareCloud</Tooltip>}
                        >
                          <Button
                            variant="outline-warning"
                            size="sm"
                            onClick={() => handleSync(pedido)}
                          >
                            <LuRefreshCw />
                          </Button>
                        </OverlayTrigger>
                      </div>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </Table>
      </div>

      {selectedPedido && (
        <>
          <ActualizarPedidoModal
            show={showUpdateModal}
            onHide={() => {
              setShowUpdateModal(false)
              setSelectedPedido(null)
            }}
            pedido={selectedPedido}
            onSuccess={onUpdate}
          />
          <SincronizarPedidoModal
            show={showSyncModal}
            onHide={() => {
              setShowSyncModal(false)
              setSelectedPedido(null)
            }}
            pedido={selectedPedido}
            onSuccess={onUpdate}
          />
        </>
      )}
    </>
  )
}

