'use client'

import { useState, useEffect } from 'react'
import { Modal, Button, Form, Alert, Table, Badge } from 'react-bootstrap'
import { LuDollarSign, LuLock, LuKey } from 'react-icons/lu'

interface CashRegisterProps {
  show: boolean
  onClose: () => void
}

interface CashSession {
  id: string
  openedAt: string
  closedAt?: string
  initialAmount: number
  finalAmount?: number
  sales: number
  orders: number
}

export default function CashRegister({ show, onClose }: CashRegisterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [initialAmount, setInitialAmount] = useState('')
  const [currentSession, setCurrentSession] = useState<CashSession | null>(null)
  const [todaySales, setTodaySales] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // Cargar estado de caja y ventas del día
  useEffect(() => {
    if (show) {
      loadCashStatus()
      loadTodaySales()
    }
  }, [show])

  const loadCashStatus = async () => {
    // En una implementación real, esto vendría de una API o localStorage
    const saved = localStorage.getItem('cash_register_session')
    if (saved) {
      const session = JSON.parse(saved)
      setIsOpen(true)
      setCurrentSession(session)
    }
  }

  const loadTodaySales = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/woocommerce/reports?type=sales&period=day')
      const data = await response.json()
      
      if (data.success) {
        setTodaySales(data.data)
      }
    } catch (error) {
      console.error('Error al cargar ventas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenCash = () => {
    const amount = parseFloat(initialAmount)
    if (isNaN(amount) || amount < 0) {
      return
    }

    const session: CashSession = {
      id: `session_${Date.now()}`,
      openedAt: new Date().toISOString(),
      initialAmount: amount,
      sales: 0,
      orders: 0,
    }

    localStorage.setItem('cash_register_session', JSON.stringify(session))
    setIsOpen(true)
    setCurrentSession(session)
    setInitialAmount('')
  }

  const handleCloseCash = () => {
    if (!confirm('¿Estás seguro de cerrar la caja? Se generará un reporte de cierre.')) {
      return
    }

    if (currentSession) {
      const closedSession: CashSession = {
        ...currentSession,
        closedAt: new Date().toISOString(),
        finalAmount: todaySales?.total_sales || 0,
        sales: todaySales?.total_sales || 0,
        orders: todaySales?.total_orders || 0,
      }

      // Guardar historial (en producción, esto iría a una API)
      const history = JSON.parse(localStorage.getItem('cash_register_history') || '[]')
      history.push(closedSession)
      localStorage.setItem('cash_register_history', JSON.stringify(history))

      localStorage.removeItem('cash_register_session')
      setIsOpen(false)
      setCurrentSession(null)
    }
  }

  const calculateDifference = () => {
    if (!currentSession || !todaySales) return 0
    const expected = currentSession.initialAmount + (todaySales.total_sales || 0)
    const actual = parseFloat(prompt('Ingrese el monto en efectivo contado:') || '0')
    return actual - expected
  }

  return (
    <Modal show={show} onHide={onClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          <LuDollarSign className="me-2" />
          Gestión de Caja
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {!isOpen ? (
          <div>
            <Alert variant="warning">
              <strong>Caja Cerrada</strong>
              <p className="mb-0">Debes abrir la caja para comenzar a vender.</p>
            </Alert>

            <Form.Group className="mt-3">
              <Form.Label>Monto Inicial en Efectivo</Form.Label>
              <Form.Control
                type="number"
                placeholder="0"
                value={initialAmount}
                onChange={(e) => setInitialAmount(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleOpenCash()
                  }
                }}
                autoFocus
              />
            </Form.Group>

            <Button
              variant="success"
              className="w-100 mt-3"
              onClick={handleOpenCash}
              disabled={!initialAmount || parseFloat(initialAmount) < 0}
            >
              <LuKey className="me-2" />
              Abrir Caja
            </Button>
          </div>
        ) : (
          <div>
            <Alert variant="success">
              <strong>Caja Abierta</strong>
              <p className="mb-0">
                Abierta el {currentSession && new Date(currentSession.openedAt).toLocaleString('es-CL')}
              </p>
            </Alert>

            {todaySales && (
              <div className="mt-3">
                <h5>Resumen del Día</h5>
                <Table striped bordered hover>
                  <tbody>
                    <tr>
                      <td><strong>Monto Inicial:</strong></td>
                      <td>${currentSession?.initialAmount.toLocaleString('es-CL')}</td>
                    </tr>
                    <tr>
                      <td><strong>Total Ventas:</strong></td>
                      <td>${(todaySales.total_sales || 0).toLocaleString('es-CL')}</td>
                    </tr>
                    <tr>
                      <td><strong>Total Pedidos:</strong></td>
                      <td>{todaySales.total_orders || 0}</td>
                    </tr>
                    <tr>
                      <td><strong>Promedio por Pedido:</strong></td>
                      <td>${(todaySales.average_order || 0).toLocaleString('es-CL')}</td>
                    </tr>
                    <tr className="table-primary">
                      <td><strong>Efectivo Esperado:</strong></td>
                      <td>
                        ${((currentSession?.initialAmount || 0) + (todaySales.total_sales || 0)).toLocaleString('es-CL')}
                      </td>
                    </tr>
                  </tbody>
                </Table>

                {todaySales.top_products && todaySales.top_products.length > 0 && (
                  <div className="mt-3">
                    <h6>Productos Más Vendidos</h6>
                    <Table striped bordered size="sm">
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th>Cantidad</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {todaySales.top_products.slice(0, 5).map((product: any, index: number) => (
                          <tr key={index}>
                            <td>{product.product.name}</td>
                            <td>{product.quantity}</td>
                            <td>${product.revenue.toLocaleString('es-CL')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            <div className="mt-3 d-flex gap-2">
              <Button
                variant="outline-primary"
                onClick={calculateDifference}
                className="flex-fill"
              >
                Calcular Diferencia
              </Button>
              <Button
                variant="danger"
                onClick={handleCloseCash}
                className="flex-fill"
              >
                <LuLock className="me-2" />
                Cerrar Caja
              </Button>
            </div>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

