'use client'

import { useState, useEffect } from 'react'
import { Card, CardBody, Button, Alert, Spinner } from 'react-bootstrap'
import { TbPlus, TbCheck, TbX } from 'react-icons/tb'

interface ProductPricingProps {
  producto: any
  onUpdate?: () => Promise<void> | void
}

export function ProductPricing({ producto, onUpdate }: ProductPricingProps) {
  const [precios, setPrecios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddingPrice, setIsAddingPrice] = useState(false)
  const [precioVenta, setPrecioVenta] = useState('')
  const [precioCosto, setPrecioCosto] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [activo, setActivo] = useState(true)
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
    const precioVentaNumero = parseFloat(precioVenta)
    
    if (!precioVenta || isNaN(precioVentaNumero) || precioVentaNumero <= 0) {
      setError('El precio de venta es requerido y debe ser mayor a 0')
      return
    }

    if (!fechaInicio) {
      setError('La fecha de inicio es requerida')
      return
    }

    try {
      setError(null)
      setSaving(true)
      
      // Preparar fecha_inicio en formato ISO
      const fechaInicioISO = fechaInicio ? new Date(fechaInicio).toISOString() : new Date().toISOString()
      const fechaFinISO = fechaFin ? new Date(fechaFin).toISOString() : null
      
      const payload: any = {
        precio_venta: precioVentaNumero,
        libroId: productId,
        fecha_inicio: fechaInicioISO,
        activo: activo
      }
      
      // Agregar campos opcionales solo si tienen valor
      if (precioCosto && !isNaN(parseFloat(precioCosto)) && parseFloat(precioCosto) > 0) {
        payload.precio_costo = parseFloat(precioCosto)
      }
      if (fechaFinISO) {
        payload.fecha_fin = fechaFinISO
      }
      
      console.log('[ProductPricing] Enviando:', payload)
      console.log('[ProductPricing] Keys:', Object.keys(payload))
      
      const response = await fetch('/api/tienda/precios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (data.success) {
        // Resetear formulario
        setPrecioVenta('')
        setPrecioCosto('')
        setFechaInicio('')
        setFechaFin('')
        setActivo(true)
        setIsAddingPrice(false)
        
        // Actualizar lista de precios inmediatamente (optimistic update)
        if (data.data) {
          setPrecios((prev) => [...prev, data.data])
        }
        
        // Refrescar desde servidor en segundo plano
        fetchPrecios().catch((err) => {
          console.error('[ProductPricing] Error al refrescar precios:', err)
        })
        
        if (onUpdate) {
          const updateResult = onUpdate()
          if (updateResult && typeof updateResult.catch === 'function') {
            updateResult.catch((err: any) => {
              console.error('[ProductPricing] Error al refrescar producto:', err)
            })
          }
        }
      } else {
        // Mostrar ayuda si es problema de permisos
        if (data.ayuda) {
          setError(`${data.error}\n\n${data.ayuda}`)
        } else {
          setError(data.error || 'Error al agregar precio')
        }
      }
    } catch (err: any) {
      console.error('Error adding price:', err)
      setError('Error de conexión al agregar precio')
    } finally {
      setSaving(false)
    }
  }

  // Helper para obtener valores de precio desde diferentes estructuras posibles
  const getPrecioVenta = (precio: any): number => {
    const attrs = precio.attributes || {}
    return attrs.precio_venta || attrs.PRECIO_VENTA || precio.precio_venta || precio.PRECIO_VENTA || 0
  }
  
  const getPrecioCosto = (precio: any): number | null => {
    const attrs = precio.attributes || {}
    const costo = attrs.precio_costo || attrs.PRECIO_COSTO || precio.precio_costo || precio.PRECIO_COSTO
    return costo !== undefined && costo !== null ? costo : null
  }
  
  const getFechaInicio = (precio: any): string => {
    const attrs = precio.attributes || {}
    const fecha = attrs.fecha_inicio || attrs.FECHA_INICIO || precio.fecha_inicio || precio.FECHA_INICIO
    if (!fecha) return 'N/A'
    try {
      return new Date(fecha).toLocaleDateString('es-CL')
    } catch {
      return fecha
    }
  }
  
  const getFechaFin = (precio: any): string | null => {
    const attrs = precio.attributes || {}
    const fecha = attrs.fecha_fin || attrs.FECHA_FIN || precio.fecha_fin || precio.FECHA_FIN
    if (!fecha) return null
    try {
      return new Date(fecha).toLocaleDateString('es-CL')
    } catch {
      return fecha
    }
  }
  
  const getActivo = (precio: any): boolean => {
    const attrs = precio.attributes || {}
    const activoValue = attrs.activo !== undefined ? attrs.activo : (precio.activo !== undefined ? precio.activo : true)
    return Boolean(activoValue)
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
            <h6 className="mb-3">Nuevo Precio</h6>
            
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">
                  Precio de Venta <span className="text-danger">*</span>
                </label>
                <div className="input-group">
                  <span className="input-group-text">$</span>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="0.00"
                    value={precioVenta}
                    onChange={(e) => setPrecioVenta(e.target.value)}
                    step="0.01"
                    min="0"
                    disabled={saving}
                    required
                  />
                </div>
              </div>
              
              <div className="col-md-6 mb-3">
                <label className="form-label">Precio de Costo</label>
                <div className="input-group">
                  <span className="input-group-text">$</span>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="0.00 (opcional)"
                    value={precioCosto}
                    onChange={(e) => setPrecioCosto(e.target.value)}
                    step="0.01"
                    min="0"
                    disabled={saving}
                  />
                </div>
              </div>
              
              <div className="col-md-6 mb-3">
                <label className="form-label">
                  Fecha de Inicio <span className="text-danger">*</span>
                </label>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  disabled={saving}
                  required
                />
              </div>
              
              <div className="col-md-6 mb-3">
                <label className="form-label">Fecha de Fin</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  disabled={saving}
                />
                <small className="text-muted">Opcional - Dejar vacío si no tiene fecha de fin</small>
              </div>
              
              <div className="col-md-12 mb-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={activo}
                    onChange={(e) => setActivo(e.target.checked)}
                    disabled={saving}
                    id="precioActivo"
                  />
                  <label className="form-check-label" htmlFor="precioActivo">
                    Precio activo
                  </label>
                </div>
              </div>
            </div>
            
            <div className="d-flex gap-2">
              <Button
                variant="success"
                size="sm"
                onClick={handleAddPrice}
                disabled={saving || !precioVenta || !fechaInicio}
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
                  setPrecioVenta('')
                  setPrecioCosto('')
                  setFechaInicio('')
                  setFechaFin('')
                  setActivo(true)
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
              const precioVentaValue = getPrecioVenta(precio)
              const precioCostoValue = getPrecioCosto(precio)
              const fechaInicioValue = getFechaInicio(precio)
              const fechaFinValue = getFechaFin(precio)
              const activoValue = getActivo(precio)
              const precioId = precio.id || precio.documentId || index
              
              return (
                <div key={precioId} className="list-group-item">
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center gap-3 mb-2">
                        <div>
                          <h6 className="mb-0">
                            Venta: <span className="text-success">${precioVentaValue.toFixed(2)}</span>
                          </h6>
                          {precioCostoValue !== null && (
                            <small className="text-muted">
                              Costo: ${precioCostoValue.toFixed(2)}
                            </small>
                          )}
                        </div>
                        <div>
                          {activoValue ? (
                            <span className="badge bg-success">Activo</span>
                          ) : (
                            <span className="badge bg-secondary">Inactivo</span>
                          )}
                        </div>
                      </div>
                      <div className="small text-muted">
                        <div>Inicio: {fechaInicioValue}</div>
                        {fechaFinValue && <div>Fin: {fechaFinValue}</div>}
                      </div>
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

