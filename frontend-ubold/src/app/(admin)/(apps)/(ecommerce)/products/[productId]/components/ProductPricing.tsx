'use client'

import { useState, useEffect } from 'react'
import { Card, CardBody, Button, Alert, Spinner } from 'react-bootstrap'
import { TbPlus, TbCheck, TbX } from 'react-icons/tb'

interface ProductPricingProps {
  producto: any
  onUpdate?: () => void
}

export function ProductPricing({ producto, onUpdate }: ProductPricingProps) {
  const [precios, setPrecios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddingPrice, setIsAddingPrice] = useState(false)
  const [newPrice, setNewPrice] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const productId = producto.id?.toString() || producto.documentId

  useEffect(() => {
    if (productId) {
      fetchPrecios()
    }
  }, [productId])

  const fetchPrecios = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/tienda/precios?libro=${productId}`)
      const data = await response.json()
      
      if (data.success) {
        setPrecios(data.data || [])
      } else {
        setError(data.error || 'Error al cargar precios')
      }
    } catch (err: any) {
      console.error('Error fetching precios:', err)
      setError('Error de conexión al cargar precios')
    } finally {
      setLoading(false)
    }
  }

  const handleAddPrice = async () => {
    const precioNumero = parseFloat(newPrice)
    
    if (!newPrice || isNaN(precioNumero) || precioNumero <= 0) {
      setError('Ingresa un precio válido mayor a 0')
      return
    }

    try {
      setError(null)
      setSaving(true)
      
      const response = await fetch('/api/tienda/precios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monto: precioNumero,
          precio: precioNumero,
          libroId: productId
        })
      })

      const data = await response.json()

      if (data.success) {
        setNewPrice('')
        setIsAddingPrice(false)
        await fetchPrecios()
        if (onUpdate) {
          onUpdate()
        }
      } else {
        setError(data.error || 'Error al agregar precio')
      }
    } catch (err: any) {
      console.error('Error adding price:', err)
      setError('Error de conexión al agregar precio')
    } finally {
      setSaving(false)
    }
  }

  // Helper para obtener el valor del precio desde diferentes estructuras posibles
  const getPrecioValue = (precio: any): number => {
    const attrs = precio.attributes || {}
    return attrs.precio || attrs.PRECIO || precio.precio || precio.PRECIO || precio.monto || 0
  }

  return (
    <Card className="mt-4">
      <CardBody>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="card-title mb-0">Precios</h5>
          {!isAddingPrice && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddingPrice(true)}
            >
              <TbPlus className="me-1" />
              Agregar Precio
            </Button>
          )}
        </div>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Form para agregar precio */}
        {isAddingPrice && (
          <div className="border rounded p-3 mb-3">
            <div className="mb-3">
              <label className="form-label">Precio</label>
              <div className="input-group">
                <span className="input-group-text">$</span>
                <input
                  type="number"
                  className="form-control"
                  placeholder="0.00"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  step="0.01"
                  min="0"
                  disabled={saving}
                />
              </div>
            </div>
            
            <div className="d-flex gap-2">
              <Button
                variant="success"
                size="sm"
                onClick={handleAddPrice}
                disabled={saving || !newPrice}
              >
                {saving ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <TbCheck className="me-1" />
                    Guardar
                  </>
                )}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsAddingPrice(false)
                  setNewPrice('')
                  setError(null)
                }}
                disabled={saving}
              >
                <TbX className="me-1" />
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Lista de precios */}
        {loading ? (
          <div className="text-center py-3">
            <Spinner animation="border" size="sm" className="me-2" />
            Cargando precios...
          </div>
        ) : precios.length === 0 ? (
          <div className="text-muted text-center py-3">
            No hay precios registrados. Haz clic en "Agregar Precio" para crear uno.
          </div>
        ) : (
          <div className="list-group">
            {precios.map((precio: any, index: number) => {
              const precioValue = getPrecioValue(precio)
              const precioId = precio.id || precio.documentId || index
              
              return (
                <div key={precioId} className="list-group-item">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="mb-0">${precioValue.toFixed(2)}</h6>
                      {precio.attributes?.canal && (
                        <small className="text-muted">
                          Canal: {precio.attributes.canal.nombre || precio.attributes.canal}
                        </small>
                      )}
                      {precio.attributes?.moneda && (
                        <small className="text-muted ms-2">
                          Moneda: {precio.attributes.moneda}
                        </small>
                      )}
                    </div>
                    {/* TODO: Agregar botones de editar/eliminar cuando tengamos los endpoints */}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardBody>
    </Card>
  )
}

