'use client'

import { useState, useEffect } from 'react'
import { Modal, Button, Form, InputGroup, Row, Col, Alert, Badge } from 'react-bootstrap'
import { LuDollarSign, LuCreditCard, LuArrowRightLeft, LuX } from 'react-icons/lu'
import type { PaymentMethod } from '../hooks/usePosOrders'
import { calculateChange, formatCurrencyNumber } from '../utils/calculations'

interface PaymentModalProps {
  show: boolean
  total: number
  onComplete: (payments: PaymentMethod[]) => void
  onCancel: () => void
}

export default function PaymentModal({ show, total, onComplete, onCancel }: PaymentModalProps) {
  const [payments, setPayments] = useState<PaymentMethod[]>([])
  const [currentPaymentType, setCurrentPaymentType] = useState<PaymentMethod['type']>('cash')
  const [currentAmount, setCurrentAmount] = useState('')
  const [reference, setReference] = useState('')

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
  const remaining = total - totalPaid
  const change = currentPaymentType === 'cash' && parseFloat(currentAmount) > remaining
    ? calculateChange(remaining, parseFloat(currentAmount))
    : 0

  useEffect(() => {
    if (show) {
      setPayments([])
      setCurrentAmount('')
      setReference('')
      setCurrentPaymentType('cash')
    }
  }, [show])

  const handleAddPayment = () => {
    const amount = parseFloat(currentAmount)
    if (isNaN(amount) || amount <= 0) {
      return
    }

    if (currentPaymentType === 'cash' && amount < remaining) {
      // Si es efectivo y el monto es menor al pendiente, usar el monto pendiente
      setPayments([...payments, { type: 'cash', amount: remaining }])
      setCurrentAmount('')
    } else {
      setPayments([...payments, { 
        type: currentPaymentType, 
        amount: Math.min(amount, remaining),
        ...(reference && { reference }) 
      }])
      setCurrentAmount('')
      setReference('')
    }
  }

  const handleRemovePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index))
  }

  const handleComplete = () => {
    if (remaining <= 0) {
      onComplete(payments)
    }
  }

  const handleQuickCash = (amount: number) => {
    if (remaining > 0) {
      setPayments([...payments, { type: 'cash', amount: Math.min(amount, remaining) }])
    }
  }

  return (
    <Modal show={show} onHide={onCancel} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Métodos de Pago</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h5 className="mb-0">Total a Pagar:</h5>
            <h4 className="mb-0 text-primary">${formatCurrencyNumber(total)}</h4>
          </div>
          <div className="d-flex justify-content-between align-items-center">
            <span className="text-muted">Pagado:</span>
            <span className="fw-bold">${formatCurrencyNumber(totalPaid)}</span>
          </div>
          <div className="d-flex justify-content-between align-items-center">
            <span className={remaining > 0 ? 'text-danger fw-bold' : 'text-success fw-bold'}>
              {remaining > 0 ? 'Pendiente:' : 'Completo:'}
            </span>
            <span className={remaining > 0 ? 'text-danger fw-bold' : 'text-success fw-bold'}>
              ${formatCurrencyNumber(Math.abs(remaining))}
            </span>
          </div>
        </div>

        {/* Pagos realizados */}
        {payments.length > 0 && (
          <div className="mb-3">
            <h6>Pagos Realizados:</h6>
            {payments.map((payment, index) => (
              <div key={index} className="d-flex justify-content-between align-items-center mb-2 p-2 bg-light rounded">
                <div>
                  <Badge bg={
                    payment.type === 'cash' ? 'success' :
                    payment.type === 'card' ? 'primary' :
                    'info'
                  } className="me-2">
                    {payment.type === 'cash' ? 'Efectivo' :
                     payment.type === 'card' ? 'Tarjeta' :
                     'Transferencia'}
                  </Badge>
                  ${formatCurrencyNumber(payment.amount)}
                  {payment.reference && (
                    <small className="text-muted ms-2">({payment.reference})</small>
                  )}
                </div>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => handleRemovePayment(index)}
                >
                  <LuX />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Agregar nuevo pago */}
        {remaining > 0 && (
          <div className="mb-3">
            <h6>Agregar Pago:</h6>
            <Row className="g-2 mb-2">
              <Col>
                <Button
                  variant={currentPaymentType === 'cash' ? 'success' : 'outline-success'}
                  className="w-100"
                  onClick={() => setCurrentPaymentType('cash')}
                >
                  <LuDollarSign className="me-1" />
                  Efectivo
                </Button>
              </Col>
              <Col>
                <Button
                  variant={currentPaymentType === 'card' ? 'primary' : 'outline-primary'}
                  className="w-100"
                  onClick={() => setCurrentPaymentType('card')}
                >
                  <LuCreditCard className="me-1" />
                  Tarjeta
                </Button>
              </Col>
              <Col>
                <Button
                  variant={currentPaymentType === 'transfer' ? 'info' : 'outline-info'}
                  className="w-100"
                  onClick={() => setCurrentPaymentType('transfer')}
                >
                  <LuArrowRightLeft className="me-1" />
                  Transferencia
                </Button>
              </Col>
            </Row>

            <InputGroup className="mb-2">
              <InputGroup.Text>$</InputGroup.Text>
              <Form.Control
                type="number"
                placeholder="Monto"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddPayment()
                  }
                }}
                autoFocus
              />
              <Button variant="primary" onClick={handleAddPayment}>
                Agregar
              </Button>
            </InputGroup>

            {currentPaymentType === 'transfer' && (
              <Form.Control
                type="text"
                placeholder="Número de referencia (opcional)"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="mb-2"
              />
            )}

            {currentPaymentType === 'cash' && (
              <div className="mt-2">
                <small className="text-muted">Efectivo rápido:</small>
                <div className="d-flex gap-2 mt-1">
                  {[remaining, remaining * 1.1, remaining * 1.2, remaining * 1.5].map((amount) => (
                    <Button
                      key={amount}
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => handleQuickCash(Math.ceil(amount))}
                    >
                      ${formatCurrencyNumber(Math.ceil(amount))}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {change > 0 && (
              <Alert variant="info" className="mt-2 mb-0">
                <strong>Cambio:</strong> ${formatCurrencyNumber(change)}
              </Alert>
            )}
          </div>
        )}

        {remaining <= 0 && (
          <Alert variant="success" className="mb-0">
            <strong>✓ Pago completo</strong>
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          onClick={handleComplete}
          disabled={remaining > 0 || payments.length === 0}
        >
          Confirmar Pago
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

