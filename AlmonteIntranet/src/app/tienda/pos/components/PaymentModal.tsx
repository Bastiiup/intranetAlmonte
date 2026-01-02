'use client'

import { useState, useEffect, useRef } from 'react'
import { Modal, Button, Form, InputGroup, Row, Col, Alert, Badge } from 'react-bootstrap'
import { LuDollarSign, LuCreditCard, LuArrowRightLeft, LuX, LuCheck, LuTruck, LuStore } from 'react-icons/lu'
import type { PaymentMethod } from '../hooks/usePosOrders'
import { calculateChange, formatCurrencyNumber } from '../utils/calculations'

export type DeliveryType = 'shipping' | 'pickup' // 'shipping' = envío a domicilio, 'pickup' = retiro en tienda

interface PaymentModalProps {
  show: boolean
  total: number
  onComplete: (payments: PaymentMethod[], deliveryType: DeliveryType) => void
  onCancel: () => void
}

export default function PaymentModal({ show, total, onComplete, onCancel }: PaymentModalProps) {
  const [payments, setPayments] = useState<PaymentMethod[]>([])
  const [currentPaymentType, setCurrentPaymentType] = useState<PaymentMethod['type']>('cash')
  const [currentAmount, setCurrentAmount] = useState('')
  const [reference, setReference] = useState('')
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('pickup') // Por defecto retiro en tienda
  const amountInputRef = useRef<HTMLInputElement>(null)

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
  const remaining = total - totalPaid
  const currentAmountNum = parseFloat(currentAmount) || 0
  const change = currentPaymentType === 'cash' && currentAmountNum > remaining && remaining > 0
    ? calculateChange(remaining, currentAmountNum)
    : 0

  // Atajos de teclado
  useEffect(() => {
    if (!show) return

    const handleKeyPress = (e: KeyboardEvent) => {
      // Esc: Cancelar
      if (e.key === 'Escape') {
        onCancel()
        return
      }

      // Enter: Confirmar si el pago está completo, o agregar pago si hay monto
      if (e.key === 'Enter' && document.activeElement === amountInputRef.current) {
        e.preventDefault()
        if (remaining <= 0 && payments.length > 0) {
          handleComplete()
        } else if (currentAmountNum > 0) {
          handleAddPayment()
        }
        return
      }

      // Números 1-9: Montos rápidos (multiplicar por 1000)
      if (e.key >= '1' && e.key <= '9' && currentPaymentType === 'cash' && document.activeElement === amountInputRef.current) {
        const quickAmount = parseInt(e.key) * 1000
        if (quickAmount <= remaining * 10) { // Solo si es razonable
          setCurrentAmount(quickAmount.toString())
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [show, remaining, payments.length, currentAmountNum, currentPaymentType])

  useEffect(() => {
    if (show) {
      setPayments([])
      setCurrentAmount('')
      setReference('')
      setCurrentPaymentType('cash')
      setDeliveryType('pickup') // Resetear a retiro en tienda por defecto
      // Focus en el input después de un pequeño delay
      setTimeout(() => {
        amountInputRef.current?.focus()
      }, 100)
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
      onComplete(payments, deliveryType)
    }
  }

  const handleQuickCash = (amount: number) => {
    if (remaining > 0) {
      setPayments([...payments, { type: 'cash', amount: Math.min(amount, remaining) }])
      setCurrentAmount('')
    }
  }

  // Pago exacto (sin cambio)
  const handleExactPayment = () => {
    if (remaining > 0) {
      setPayments([...payments, { type: 'cash', amount: remaining }])
      setCurrentAmount('')
    }
  }

  // Auto-completar con total al seleccionar efectivo
  const handleSelectCash = () => {
    setCurrentPaymentType('cash')
    if (remaining > 0) {
      setCurrentAmount(remaining.toString())
      setTimeout(() => amountInputRef.current?.select(), 50)
    }
  }

  return (
    <Modal show={show} onHide={onCancel} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Métodos de Pago</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* Tipo de Entrega */}
        <div className="mb-4 p-3 bg-light rounded">
          <h6 className="mb-3">Tipo de Entrega:</h6>
          <Row className="g-2">
            <Col>
              <Button
                variant={deliveryType === 'pickup' ? 'primary' : 'outline-primary'}
                className="w-100"
                onClick={() => setDeliveryType('pickup')}
                size="lg"
              >
                <LuStore className="me-2" size={20} />
                Retiro en Tienda
              </Button>
            </Col>
            <Col>
              <Button
                variant={deliveryType === 'shipping' ? 'success' : 'outline-success'}
                className="w-100"
                onClick={() => setDeliveryType('shipping')}
                size="lg"
              >
                <LuTruck className="me-2" size={20} />
                Envío a Domicilio
              </Button>
            </Col>
          </Row>
          {deliveryType === 'shipping' && (
            <Alert variant="info" className="mt-3 mb-0">
              <small>
                <strong>⚠️ Importante:</strong> Se creará un envío automático en Shipit. 
                Asegúrate de que el cliente tenga dirección de envío completa y válida.
              </small>
            </Alert>
          )}
        </div>

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
                  onClick={handleSelectCash}
                >
                  <LuDollarSign className="me-1" />
                  Efectivo
                </Button>
              </Col>
              <Col>
                <Button
                  variant={currentPaymentType === 'card' ? 'primary' : 'outline-primary'}
                  className="w-100"
                  onClick={() => {
                    setCurrentPaymentType('card')
                    setCurrentAmount('')
                  }}
                >
                  <LuCreditCard className="me-1" />
                  Tarjeta
                </Button>
              </Col>
              <Col>
                <Button
                  variant={currentPaymentType === 'transfer' ? 'info' : 'outline-info'}
                  className="w-100"
                  onClick={() => {
                    setCurrentPaymentType('transfer')
                    setCurrentAmount('')
                  }}
                >
                  <LuArrowRightLeft className="me-1" />
                  Transferencia
                </Button>
              </Col>
            </Row>

            <InputGroup className="mb-2">
              <InputGroup.Text>$</InputGroup.Text>
              <Form.Control
                ref={amountInputRef}
                type="number"
                placeholder="Monto"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (remaining <= 0 && payments.length > 0) {
                      handleComplete()
                    } else {
                      handleAddPayment()
                    }
                  }
                }}
                step="100"
                min="0"
              />
              <Button 
                variant="primary" 
                onClick={handleAddPayment}
                disabled={!currentAmountNum || currentAmountNum <= 0}
              >
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
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <small className="text-muted">Efectivo rápido:</small>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={handleExactPayment}
                    disabled={remaining <= 0}
                  >
                    <LuCheck className="me-1" />
                    Pago Exacto (${formatCurrencyNumber(remaining)})
                  </Button>
                </div>
                <div className="d-flex gap-2 flex-wrap">
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
                <div className="mt-2">
                  <small className="text-muted">
                    <strong>Atajos:</strong> Presiona 1-9 para montos rápidos (ej: 1 = $1.000)
                  </small>
                </div>
              </div>
            )}

            {change > 0 && (
              <Alert variant="info" className="mt-2 mb-0">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>Cambio a entregar:</strong>
                    <div className="h4 mb-0 mt-1">${formatCurrencyNumber(change)}</div>
                  </div>
                  <LuDollarSign size={32} className="text-success" />
                </div>
              </Alert>
            )}

            {currentAmountNum > 0 && currentPaymentType === 'cash' && currentAmountNum < remaining && (
              <Alert variant="warning" className="mt-2 mb-0">
                <small>El monto ingresado es menor al pendiente. Se usará el monto pendiente (${formatCurrencyNumber(remaining)})</small>
              </Alert>
            )}
          </div>
        )}

        {remaining <= 0 && (
          <Alert variant="success" className="mb-0">
            <div className="d-flex align-items-center">
              <LuCheck className="me-2" size={20} />
              <div>
                <strong>✓ Pago completo</strong>
                <div className="small">Presiona Enter o haz clic en "Confirmar Pago"</div>
              </div>
            </div>
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCancel}>
          Cancelar (Esc)
        </Button>
        <Button
          variant="primary"
          onClick={handleComplete}
          disabled={remaining > 0 || payments.length === 0}
          size="lg"
        >
          <LuCheck className="me-2" />
          Confirmar Pago (Enter)
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

