'use client'

import { useState } from 'react'
import { Form, InputGroup, Button, Dropdown, Alert, Badge } from 'react-bootstrap'
import { LuPercent, LuDollarSign, LuTag, LuX } from 'react-icons/lu'
import type { Discount } from '../utils/calculations'

interface DiscountInputProps {
  discount: Discount | null
  onDiscountChange: (discount: Discount | null) => void
  subtotal: number
}

export default function DiscountInput({ discount, onDiscountChange, subtotal }: DiscountInputProps) {
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed' | 'coupon'>('percentage')
  const [discountValue, setDiscountValue] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [validatingCoupon, setValidatingCoupon] = useState(false)
  const [couponError, setCouponError] = useState<string | null>(null)

  const handleApplyPercentage = () => {
    const value = parseFloat(discountValue)
    if (!isNaN(value) && value > 0 && value <= 100) {
      onDiscountChange({ type: 'percentage', value })
      setDiscountValue('')
    }
  }

  const handleApplyFixed = () => {
    const value = parseFloat(discountValue)
    if (!isNaN(value) && value > 0 && value <= subtotal) {
      onDiscountChange({ type: 'fixed', value })
      setDiscountValue('')
    }
  }

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) {
      return
    }

    setValidatingCoupon(true)
    setCouponError(null)

    try {
      const response = await fetch('/api/woocommerce/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: couponCode.trim(),
          amount: subtotal,
        }),
      })

      const data = await response.json()

      if (data.success && data.valid) {
        onDiscountChange({
          type: 'coupon',
          value: data.data.discount_amount,
          couponCode: data.data.code,
        })
        setCouponCode('')
      } else {
        setCouponError(data.error || 'Cupón no válido')
      }
    } catch (err: any) {
      setCouponError(err.message || 'Error al validar cupón')
    } finally {
      setValidatingCoupon(false)
    }
  }

  const handleRemoveDiscount = () => {
    onDiscountChange(null)
    setDiscountValue('')
    setCouponCode('')
    setCouponError(null)
  }

  return (
    <div className="discount-input">
      {discount ? (
        <div className="d-flex justify-content-between align-items-center p-2 bg-light rounded">
          <div>
            <Badge bg="success" className="me-2">
              {discount.type === 'percentage' ? <LuPercent /> :
               discount.type === 'fixed' ? <LuDollarSign /> :
               <LuTag />}
            </Badge>
            <span>
              {discount.type === 'percentage' && `${discount.value}%`}
              {discount.type === 'fixed' && `$${discount.value.toLocaleString('es-CL')}`}
              {discount.type === 'coupon' && discount.couponCode}
            </span>
          </div>
          <Button variant="outline-danger" size="sm" onClick={handleRemoveDiscount}>
            <LuX />
          </Button>
        </div>
      ) : (
        <Dropdown>
          <Dropdown.Toggle variant="outline-secondary" className="w-100">
            <LuTag className="me-1" />
            Agregar Descuento
          </Dropdown.Toggle>
          <Dropdown.Menu className="p-3" style={{ minWidth: '300px' }}>
            <div className="mb-3">
              <Form.Label>Descuento por Porcentaje</Form.Label>
              <InputGroup>
                <InputGroup.Text><LuPercent /></InputGroup.Text>
                <Form.Control
                  type="number"
                  placeholder="Ej: 10"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleApplyPercentage()
                    }
                  }}
                />
                <InputGroup.Text>%</InputGroup.Text>
                <Button variant="primary" onClick={handleApplyPercentage}>
                  Aplicar
                </Button>
              </InputGroup>
            </div>

            <div className="mb-3">
              <Form.Label>Descuento por Monto Fijo</Form.Label>
              <InputGroup>
                <InputGroup.Text><LuDollarSign /></InputGroup.Text>
                <Form.Control
                  type="number"
                  placeholder="Ej: 1000"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleApplyFixed()
                    }
                  }}
                />
                <Button variant="primary" onClick={handleApplyFixed}>
                  Aplicar
                </Button>
              </InputGroup>
            </div>

            <div>
              <Form.Label>Cupón de Descuento</Form.Label>
              {couponError && (
                <Alert variant="danger" className="py-2 mb-2" dismissible onClose={() => setCouponError(null)}>
                  <small>{couponError}</small>
                </Alert>
              )}
              <InputGroup>
                <Form.Control
                  type="text"
                  placeholder="Código del cupón"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value)
                    setCouponError(null)
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleValidateCoupon()
                    }
                  }}
                />
                <Button
                  variant="primary"
                  onClick={handleValidateCoupon}
                  disabled={validatingCoupon || !couponCode.trim()}
                >
                  {validatingCoupon ? 'Validando...' : 'Validar'}
                </Button>
              </InputGroup>
            </div>
          </Dropdown.Menu>
        </Dropdown>
      )}
    </div>
  )
}

